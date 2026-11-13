    function TaskMap({ tasks, activeTask, onSelect, full, onLocateReady, theme = 'dark' }) {
      const hostRef = useRef(null);
      const mapRef = useRef(null);
      const leafletRef = useRef(null);
      const markersRef = useRef([]);
      const timersRef = useRef([]);
      const [mapReady, setMapReady] = useState(false);
      const boxRef = useRef(null);
      const [loading, setLoading] = useState(true);
      const onSelectRef = useRef(onSelect);
      onSelectRef.current = onSelect;
      const tasksRef = useRef(tasks); tasksRef.current = tasks;
      const activeTaskRef = useRef(activeTask); activeTaskRef.current = activeTask;
      const taskSig = (tasks || []).map((t) => `${t.uid || ''}:${t.status_name || ''}:${t.title || ''}:${(t.reports || []).map((r) => `${r.latitude || ''},${r.longitude || ''}`).join(';')}`).join('|') + `#${activeTask?.uid || ''}`;
      const point = (t) => {
        const report = (t.reports || []).find((r) => Number(r.latitude) && Number(r.longitude));
        if (report) return [Number(report.latitude), Number(report.longitude)];
        let h = 0; for (const ch of String(t.uid || t.title || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        return [22.48 + (h % 100) / 100 * 0.16, 113.88 + ((h >>> 8) % 100) / 100 * 0.32];
      };
      useEffect(() => {
        let disposed = false;
        ensureLeaflet().then((L) => {
          if (disposed || !hostRef.current || mapRef.current) return;
          if (!document.querySelector('link[data-cx-tencent]')) {
            const pre = document.createElement('link'); pre.rel = 'preconnect'; pre.href = 'https://rt0.map.gtimg.com'; pre.dataset.cxTencent = '1'; document.head.appendChild(pre);
          }
          leafletRef.current = L;
          const bootMap = (() => { try { return JSON.parse(localStorage.getItem('contextos-devops-dsh:map') || 'null'); } catch { return null; } })();
          const startView = bootMap && Number.isFinite(bootMap.lat) && Number.isFinite(bootMap.lng) ? [bootMap.lat, bootMap.lng] : [22.5431, 114.0579];
          const startZoom = bootMap && Number.isFinite(bootMap.zoom) ? bootMap.zoom : 11;
          const map = L.map(hostRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true, wheelDebounceTime: 80, wheelPxPerZoomLevel: 120, preferCanvas: true, zoomAnimation: true }).setView(startView, startZoom);
          const saveMapState = () => { try { const c = map.getCenter(); localStorage.setItem('contextos-devops-dsh:map', JSON.stringify({ lat: c.lat, lng: c.lng, zoom: map.getZoom() })); } catch {} };
          map.on('moveend', saveMapState);
          map.on('zoomend', saveMapState);
          const tiles = L.tileLayer('https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=3&scene=0', {
            maxZoom: 18, minZoom: 8, maxNativeZoom: 16, subdomains: ['0', '1', '2', '3'], tms: true, attribution: '© Tencent Map',
            updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 2, detectRetina: false,
          });
          let settled = false;
          const done = () => { if (!settled) { settled = true; setLoading(false); } };
          tiles.on('tileload', done);          /* 首块瓦片到达就撤掉遮罩 */
          tiles.on('load', done);
          timersRef.current.push(setTimeout(done, 1500));   /* 兜底：1.5s 后不再挡着地图 */
          tiles.addTo(map);
          if (navigator.geolocation && !bootMap) {
            navigator.geolocation.getCurrentPosition((pos) => {
              if (!mapRef.current) return;
              map.setView([pos.coords.latitude, pos.coords.longitude], 13);
              L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 7, color: '#ffffff', weight: 2, fillColor: '#3ee7ff', fillOpacity: 1 }).addTo(map).bindPopup('当前位置');
              L.circle([pos.coords.latitude, pos.coords.longitude], { radius: pos.coords.accuracy || 120, color: '#3ee7ff', weight: 1, fillColor: '#3ee7ff', fillOpacity: 0.08 }).addTo(map);
            }, () => { /* default Shenzhen center */ }, { timeout: 5000, maximumAge: 60000 });
          }
          mapRef.current = map;
          setMapReady(true);
          timersRef.current.push(setTimeout(() => {
            if (disposed || !mapRef.current || !hostRef.current?.isConnected) return;
            mapRef.current.invalidateSize(); setLoading(false);
          }, 1200));
        }).catch(() => { /* SVG fallback below stays */ });
        return () => {
          disposed = true;
          for (const t of timersRef.current) clearTimeout(t);
          timersRef.current = [];
          if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
      }, []);
      useEffect(() => {
        const L = leafletRef.current, map = mapRef.current;
        if (!L || !map) return;
        for (const m of markersRef.current) map.removeLayer(m);
        markersRef.current = [];
        const color = (s) => s === 'process' ? '#ffd166' : s === 'finished' ? '#42f5a7' : s === 'canceled' ? '#ff5c7a' : '#7b98a8';
        const current = tasksRef.current || [];
        const active = activeTaskRef.current;
        for (const t of current) {
          const [lat, lng] = point(t);
          const marker = L.circleMarker([lat, lng], {
            radius: active?.uid === t.uid ? 7 : 4.5,
            color: active?.uid === t.uid ? '#ffffff' : color(t.status_name),
            weight: active?.uid === t.uid ? 2 : 1,
            fillColor: color(t.status_name), fillOpacity: 0.85,
          }).addTo(map);
          const el = document.createElement('div');
          el.textContent = `${t.title || ''} · ${t.status_name || ''}`;
          marker.bindPopup(el, { closeButton: false, className: 'cx-map-popup' });
          marker.on('click', () => onSelectRef.current?.(t));
          markersRef.current.push(marker);
        }
      }, [taskSig, mapReady]);
      useEffect(() => {
        window.dispatchEvent(new CustomEvent('cx-map-full', { detail: full }));
        if (!mapRef.current) return;
        const t = setTimeout(() => {
          if (mapRef.current && hostRef.current?.isConnected) mapRef.current.invalidateSize();
        }, 120);
        return () => { clearTimeout(t); window.dispatchEvent(new CustomEvent('cx-map-full', { detail: false })); };
      }, [full]);
      const L = leafletRef.current;
      const zoomIn = () => mapRef.current && hostRef.current?.isConnected && mapRef.current.zoomIn();
      const zoomOut = () => mapRef.current && hostRef.current?.isConnected && mapRef.current.zoomOut();
      const locate = () => mapRef.current && hostRef.current?.isConnected && mapRef.current.locate({ setView: true, maxZoom: 14 });
      useEffect(() => { onLocateReady && onLocateReady({ locate, zoomIn, zoomOut }); });
      return h('div', { className: `cx-taskmap cx-map-${theme}`, ref: boxRef },
        h('div', { className: 'cx-taskmap-leaflet', ref: hostRef },
          loading ? h('div', { className: 'cx-taskmap-loading' }, '腾讯地图加载中…') : null),
        h('div', { className: 'cx-taskmap-legend' }, h('span', { className: 'lc created' }, CURRENT_LANG === 'zh' ? '待开始' : 'To do'), h('span', { className: 'lc process' }, CURRENT_LANG === 'zh' ? '进行中' : 'Doing'), h('span', { className: 'lc finished' }, CURRENT_LANG === 'zh' ? '已完成' : 'Done')));
    }

