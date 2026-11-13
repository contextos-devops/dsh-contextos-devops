    function gitClass(x) { return (x === 'A' || x === '?' || x === '??' ? 'add' : x === 'D' ? 'del' : x === 'U' || x === 'UU' ? 'unt' : 'mod'); }
    // Shared editor chrome. Keep the explorer's Git groups and file tabs out of
    // the page component so new editor features compose these primitives.
    function GitSections({ git, gitOpen, setGitOpen, gitHistOpen, setGitHistOpen, activePath, openFile, setStatus, zh }) {
      if (!git) return null;
      return h('div', { className: 'cx-git-sections' },
        git.changed ? h('div', { className: 'cx-tree-recent' },
          h('div', { className: 'cx-tree-sect cx-tree-sect-top', onClick: () => setGitOpen((v) => !v) }, h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(gitOpen) }), zh ? 'GIT 变更' : 'GIT CHANGES',
            h('span', { className: 'cx-git-count' }, String(git.changed))),
          gitOpen ? Object.keys(git.files).slice(0, 60).map((fp) => h('div', { key: 'g:' + fp, className: `cx-tree-item${activePath === fp ? ' on' : ''}`, style: { paddingLeft: 6 }, onClick: () => openFile(fp) },
            h('span', { className: 'chev' }),
            h('span', { className: 'fic', dangerouslySetInnerHTML: fileIconHtml(fp) }),
            h('span', { className: 'nm' }, fp.split('/').pop()),
            h('span', { className: `cx-git-badge ${gitClass(git.files[fp])}` }, git.files[fp] === '??' ? 'U' : git.files[fp]))) : null) : null,
        git.history && git.history.length ? h('div', { className: 'cx-tree-recent' },
          h('div', { className: 'cx-tree-sect cx-tree-sect-top cx-git-history-head', onClick: () => setGitHistOpen((v) => !v) }, h('span', { className: 'chev', dangerouslySetInnerHTML: chevHtml(gitHistOpen) }), zh ? 'GIT 历史' : 'GIT HISTORY',
            h('span', { className: 'cx-git-count' }, String(git.history.length))),
          gitHistOpen ? git.history.slice(0, 30).map((c) => h('div', { key: 'h:' + c.hash, className: 'cx-tree-item cx-git-log', style: { paddingLeft: 6 }, title: `${c.hash} ${c.subject} · ${c.author} · ${c.when}`, onClick: () => { try { navigator.clipboard.writeText(c.hash); } catch {} setStatus(`${c.hash} ${c.subject}`); } },
            h('span', { className: 'h' }, c.hash),
            h('span', { className: 'nm' }, c.subject),
            h('span', { className: 'when' }, c.when))) : null) : null);
    }
    function EditorTabs({ tabs, activePath, setActivePath, closeTab }) {
      return h('div', { className: 'cx-tabs' }, (tabs || []).map((t) => h('div', { key: t.path, className: `cx-tab${t.path === activePath ? ' on' : ''}`, onClick: () => setActivePath(t.path), title: t.path },
        h('span', { className: 'ico', dangerouslySetInnerHTML: fileIconHtml(t.name, 12) }),
        h('span', { className: 'nm' }, t.name + (t.dirty ? ' ●' : '')),
        h(IconButton, { name: 'close', className: 'x', onClick: (e) => { e.stopPropagation(); closeTab(t.path); } }))));
    }
