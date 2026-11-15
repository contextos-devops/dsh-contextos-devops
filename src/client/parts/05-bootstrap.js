const emitEvent = (detail) => { try { window.dispatchEvent(new CustomEvent('cx-event', { detail })); } catch {} };
    async function api(op, params) {
      const body = { op, ...(params || {}) };
      const started = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const apiTrace = (d) => { try { window.__CX_API_TRACE__?.(d); } catch {} };
      const brief = (() => {
        try {
          const raw = JSON.stringify(body);
          return raw.length > 220 ? raw.slice(0, 220) + '…' : raw;
        } catch { return op; }
      })();
      const QUERY_OPS = new Set(['health', 'nodes', 'spaces', 'apps', 'storeApps', 'avatars', 'backgrounds', 'devices', 'sshHosts', 'pmList', 'pmTree', 'projectStatus', 'fieldOptions', 'listDir', 'tree', 'readFile', 'readData', 'git', 'origin', 'stateGet', 'llmInfo', 'files', 'file', 'checkUpdate']);
      const method = QUERY_OPS.has(op) ? 'GET' : (op === 'pmCreate' ? 'PUT' : 'POST');
      // GET 一律不走浏览器缓存：否则 /api?op=nodes 这类地址会被缓存在磁盘上，
      // 插件重启、页面刷新都还是旧数据（曾导致节点编译时间永远显示 —）
      const qs = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')]));
      if (method === 'GET') qs.set('_', String(Date.now()));
      const query = method === 'GET' ? '?' + qs.toString() : '';
      const endpoint = method === 'GET' ? `${API}${query}` : API;
      apiTrace({ phase: 'request', op, method, endpoint, body: body, at: new Date().toISOString() });

      const longOps = new Set(['deploy', 'dockerDeploy', 'remoteDeploy', 'remoteLogin', 'pipeline', 'buildSpace', 'initSpace', 'compile', 'chat']);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), longOps.has(op) ? 900000 : 120000);
      let res, text = '';
      try {
        res = await fetch(endpoint, method === 'GET'
          ? { method, signal: controller.signal, cache: 'no-store' }
          : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
        text = await res.text();
      } catch (e) {
        const error = e?.name === 'AbortError' ? `请求超时：${op}` : String(e?.message || e);
        apiTrace({ phase: 'error', op, method, endpoint, error, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started), at: new Date().toISOString() });
        emitEvent({ kind: 'api', ok: false, op, text: brief, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started), error });
        throw new Error(error);
      } finally { clearTimeout(timer); }
      const responseHeaders = (() => { try { return Object.fromEntries(res.headers.entries()); } catch { return {}; } })();
      const logId = responseHeaders['log-id'] || `local-${Date.now().toString(36)}`;
      const elapsed = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started);
      const bytes = (() => { try { return new TextEncoder().encode(text).length; } catch { return text.length; } })();
      apiTrace({ phase: 'response', op, method, endpoint, status: res.status, bytes, ms: elapsed, text, at: new Date().toISOString() });
      let payload;
      try { payload = JSON.parse(text); } catch {
        emitEvent({ kind: 'api', ok: false, op, text: brief, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started), error: `HTTP ${res.status}` });
        throw new Error(`HTTP ${res.status} from ${API} (${op}): ${text.slice(0, 160)}`);
      }

      if (Array.isArray(payload.debug)) {
        for (const call of payload.debug) {
          try { window.dispatchEvent(new CustomEvent('cx-debug', { detail: { text: `  ↳ ${call.method} ${call.url}`, method: call.method, url: call.url, requestHeaders: call.requestHeaders || {}, responseHeaders: call.responseHeaders || {}, status: call.status || 0, size: call.size || 0, ms: call.ms || 0, logId: call.logId || '', response: call.body || null } })); } catch {}
        }
      }
      if (!payload.ok) {
        emitEvent({ kind: 'api', ok: false, op, text: brief, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started), error: String(payload.error || 'request failed') });
        throw new Error(payload.error || 'request failed');
      }
      emitEvent({ kind: 'api', ok: true, op, text: brief, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started) });
      const dataKind = /^(create|save|write|mkdir|deploy|dockerDeploy|remoteDeploy|initSpace|deployOfficialSpaces|createApp|createInstance|autogen|pmCreate|seed|createAvatar|createBackground|saveUserMedia)/.test(op) ? 'create'
        : /^(update|modify|rename|set|saveAvatar|saveBackground|updateAvatar|updateBackground|pmModify|pmAct|stateSet)/.test(op) ? 'update'
        : /^(remove|delete|rm|pmRemove|trash|removePath|deleteNode|deleteSpace|deleteAvatar|deleteBackground)/.test(op) ? 'delete'
        : /^(pmList|pmTree|nodes|spaces|apps|storeApps|avatars|backgrounds|devices|sshHosts|listDir|tree|readFile|readData|git|health|files|file|stateGet|logs|refresh)/.test(op) ? 'refresh'
        : null;
      if (dataKind) { try { window.dispatchEvent(new CustomEvent('cx-data-op', { detail: { kind: dataKind, op } })); } catch {} }
      return payload.data;
    }
