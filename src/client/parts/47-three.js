    const ThreeAvatar = React.memo(function ThreeAvatar({ image }) {
      const src = image || CYBER_AVATAR;
      const [tilt, setTilt] = useState({ x: 0, y: 0 });
      const [zoom, setZoom] = useState(1);
      const [pulse, setPulse] = useState(0);
      const [glitch, setGlitch] = useState(0);
      const [hover, setHover] = useState(false);
      const drag = useRef(null);
      const down = (e) => {
        drag.current = { x: e.clientX, y: e.clientY, ox: tilt.x, oy: tilt.y };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
      };
      const move = (e) => {
        if (!drag.current) return;
        setTilt({
          x: Math.max(-10, Math.min(10, drag.current.ox - (e.clientY - drag.current.y) * 0.08)),
          y: Math.max(-18, Math.min(18, drag.current.oy + (e.clientX - drag.current.x) * 0.1)),
        });
      };
      const up = () => { drag.current = null; };
      return h('div', { className: `cx-avatar3d${hover ? ' hover' : ''}`, onPointerEnter: () => setHover(true), onPointerLeave: () => { setHover(false); if (!drag.current) setTilt({ x: 0, y: 0 }); }, onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onClick: () => { setPulse((x) => x + 1); setGlitch((x) => x + 1); }, onDoubleClick: () => { setTilt({ x: 0, y: 0 }); setZoom(1); }, onWheel: (e) => { e.preventDefault(); setZoom((z) => Math.max(0.92, Math.min(1.16, z - e.deltaY * 0.0008))); } },
        h('div', { className: 'cx-avatar-halo' }),
        h('div', { className: 'cx-avatar-ring r1' }),
        h('div', { className: 'cx-avatar-ring r2' }),
        h('div', { className: 'cx-avatar-ring r3' }),
        h('div', { className: 'cx-avatar-ghost' }, h('img', { src, alt: '', draggable: false })),
        h('div', { className: 'cx-avatar3d-inner', style: { transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${zoom})` } },
          h('img', { src, alt: 'ContextOS female robot', draggable: false }),
          h('div', { className: 'cx-avatar-scan' }),
          h('div', { className: 'cx-avatar-hud' },
            h('span', null, '● NEURAL LINK'), h('span', null, 'SYNC 99.8%')),
          h('div', { className: 'cx-avatar-coords' }, '22.5431°N · 114.0579°E'),
          h('div', { className: 'cx-avatar-wave' }, Array.from({ length: 9 }, (_, i) => h('i', { key: i, style: { animationDelay: `${i * 0.12}s` } })))),
        h('div', { className: 'cx-avatar-base' }),
        h('div', { className: 'cx-avatar-particles' }, Array.from({ length: 12 }, (_, i) => h('i', { key: i, style: { left: `${8 + (i * 37) % 84}%`, top: `${12 + (i * 53) % 72}%`, animationDelay: `${i * 0.3}s` } }))),
        pulse ? h('div', { key: `p${pulse}`, className: 'cx-avatar-pulse' }) : null,
        glitch ? h('div', { key: `g${glitch}`, className: 'cx-avatar-glitch' }) : null);
    });

    function ThreeCity() {
      const ref = useRef(null);
      const [ready, setReady] = useState(false);
      useEffect(() => {
        let disposed = false;
        let cleanup = () => {};
        let observer = null;
        import('/dsh-contextos-devops/three/three.module.js').then((THREE) => {
          if (disposed || !ref.current) return;
          const host = ref.current;
          const scene = new THREE.Scene();
          scene.fog = new THREE.FogExp2(0x02070d, 0.026);
          const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
          camera.position.set(0, 9, 24);
          camera.lookAt(0, 2.5, 0);
          const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
          renderer.setPixelRatio(Math.min(1.4, window.devicePixelRatio || 1));
          renderer.setClearColor(0x02070d, 0.86);
          renderer.outputColorSpace = THREE.SRGBColorSpace;
          renderer.toneMapping = THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = 1.1;
          host.appendChild(renderer.domElement);
          renderer.domElement.className = 'cx-canvas-city';

          scene.add(new THREE.AmbientLight(0x3f88aa, 1.2));
          const key = new THREE.DirectionalLight(0x8feaff, 2.2); key.position.set(8, 18, 10); scene.add(key);
          const violet = new THREE.PointLight(0x8b7bff, 18, 60); violet.position.set(-14, 8, -10); scene.add(violet);
          const green = new THREE.PointLight(0x42f5a7, 12, 50); green.position.set(14, 5, 8); scene.add(green);

          const city = new THREE.Group();
          scene.add(city);
          const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x030b12, metalness: 0.65, roughness: 0.42 }));
          ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; city.add(ground);
          const grid = new THREE.GridHelper(64, 64, 0x1a6b86, 0x0b2a3a);
          grid.material.transparent = true; grid.material.opacity = 0.42; grid.position.y = 0.005; city.add(grid);

          // roads
          const roadMat = new THREE.MeshBasicMaterial({ color: 0x0b3a4e, transparent: true, opacity: 0.7 });
          for (const x of [-16, -8, 0, 8, 16]) {
            const road = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 64), roadMat);
            road.position.set(x, 0.015, 0); city.add(road);
          }
          for (const z of [-16, -8, 0, 8, 16]) {
            const road = new THREE.Mesh(new THREE.BoxGeometry(64, 0.02, 1.2), roadMat);
            road.position.set(0, 0.018, z); city.add(road);
          }

          const dark = new THREE.MeshStandardMaterial({ color: 0x071824, metalness: 0.72, roughness: 0.3 });
          const dark2 = new THREE.MeshStandardMaterial({ color: 0x0a2534, metalness: 0.6, roughness: 0.38 });
          const edge = new THREE.LineBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: 0.5 });
          const edgeGreen = new THREE.LineBasicMaterial({ color: 0x42f5a7, transparent: true, opacity: 0.35 });
          const windowMat = new THREE.MeshBasicMaterial({ color: 0x77f7ff, transparent: true, opacity: 0.8 });
          const windowViolet = new THREE.MeshBasicMaterial({ color: 0x9d8bff, transparent: true, opacity: 0.75 });
          let seed = 20261106;
          const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

          const blocks = [];
          for (let x = -20; x <= 20; x += 4) {
            for (let z = -20; z <= 20; z += 4) {
              if (Math.abs(x) < 2.5 && Math.abs(z) < 2.5) continue;
              const w = 1.5 + rnd() * 1.7, d = 1.5 + rnd() * 1.7;
              const h = 1.2 + rnd() * 6.4;
              const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), rnd() > 0.5 ? dark : dark2);
              mesh.position.set(x + (rnd() - 0.5) * 1.2, h / 2, z + (rnd() - 0.5) * 1.2);
              city.add(mesh);
              const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), rnd() > 0.8 ? edgeGreen : edge);
              edges.position.copy(mesh.position); city.add(edges);
              const rows = Math.max(1, Math.floor(h / 1.1));
              for (let r = 0; r < rows; r++) {
                if (rnd() < 0.28) continue;
                const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.035, 0.02), rnd() > 0.84 ? windowViolet : windowMat);
                strip.position.set(mesh.position.x, 0.45 + r * 1.02, mesh.position.z + d / 2 + 0.015);
                city.add(strip);
              }
              if (h > 5.5) {
                const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2 + rnd(), 6), windowMat);
                ant.position.set(mesh.position.x, h + 0.6, mesh.position.z); city.add(ant);
              }
              blocks.push(mesh);
            }
          }

          // Shenzhen landmark skyline
          const landmarkMat = new THREE.MeshStandardMaterial({ color: 0x0a2130, metalness: 0.8, roughness: 0.24 });
          const landmarkEdge = new THREE.LineBasicMaterial({ color: 0x6ff7ff, transparent: true, opacity: 0.75 });
          const landmark = (x, z, type) => {
            const g = new THREE.Group();
            g.position.set(x, 0, z);
            const box = (w, h, d, y, mat = landmarkMat) => {
              const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = y; g.add(m);
              const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), landmarkEdge); e.position.y = y; g.add(e); return m;
            };
            if (type === 'pingan') {
              box(2.4, 8, 2.4, 4); box(1.9, 7, 1.9, 11.5); box(1.3, 3.5, 1.3, 16.7);
              const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 3.2, 8), new THREE.MeshBasicMaterial({ color: 0x9ffcff })); spire.position.y = 20; g.add(spire);
            } else if (type === 'kk100') {
              const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 13, 10), landmarkMat); t.position.y = 6.5; g.add(t);
              const cap = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), landmarkEdge); cap.position.y = 13; g.add(cap);
              const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: 0x3ee7ff })); ring.rotation.x = Math.PI / 2; ring.position.y = 10; g.add(ring);
            } else if (type === 'spring') {
              const t = new THREE.Mesh(new THREE.ConeGeometry(2.2, 13, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x0a2130, metalness: 0.8, roughness: 0.25, wireframe: false })); t.position.y = 6.5; g.add(t);
              for (let i = 0; i < 5; i++) {
                const r = new THREE.Mesh(new THREE.TorusGeometry(1.9 - i * 0.3, 0.025, 8, 32), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x42f5a7 : 0x6ff7ff, transparent: true, opacity: 0.8 })); r.rotation.x = Math.PI / 2; r.position.y = 2 + i * 2.3; g.add(r);
              }
            } else if (type === 'tencent') {
              box(1.8, 9, 1.8, 4.5, landmarkMat); box(1.8, 10, 1.8, 5, landmarkMat);
              const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0x6ff7ff })); bridge.position.set(0, 7.5, 0); g.add(bridge);
              [0, 1].forEach((i) => { g.children[i].position.x = -1.15; });
              [2, 3].forEach((i) => { g.children[i].position.x = 1.15; });
            } else if (type === 'diwang') {
              box(2.2, 8, 2.2, 4); box(1.7, 4, 1.7, 9.5);
              const top = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 4), landmarkMat); top.position.y = 12.6; top.rotation.y = Math.PI / 4; g.add(top);
            }
            const ring = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: 0.55 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
            city.add(g);
          };
          landmark(-12, -8, 'pingan');
          landmark(11, -10, 'kk100');
          landmark(0, -16, 'spring');
          landmark(15, 3, 'tencent');
          landmark(-17, 5, 'diwang');

          // central data tower
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.8, 12, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x071a29, metalness: 0.8, roughness: 0.24, wireframe: true, transparent: true, opacity: 0.75 }));
          tower.position.y = 6; city.add(tower);
          const core = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 12, 12), new THREE.MeshBasicMaterial({ color: 0x3ee7ff, transparent: true, opacity: 0.85 }));
          core.position.y = 6; city.add(core);
          for (let i = 0; i < 5; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(3 + i * 0.55, 0.025, 8, 72), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x42f5a7 : 0x3ee7ff, transparent: true, opacity: 0.65 }));
            ring.rotation.x = Math.PI / 2; ring.position.y = 2 + i * 2.1; city.add(ring);
          }

          // data pulses along roads
          const movers = [];
          const pulseMat = new THREE.MeshBasicMaterial({ color: 0x7ff7ff });
          const pulseMat2 = new THREE.MeshBasicMaterial({ color: 0x8b7bff });
          for (let i = 0; i < 28; i++) {
            const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), i % 3 ? pulseMat : pulseMat2);
            const axis = i % 2 ? 'x' : 'z';
            const line = [-16, -8, 0, 8, 16][i % 5];
            m.position.set(axis === 'x' ? -30 : line, 0.18, axis === 'x' ? line : -30);
            m.userData = { axis, speed: 0.6 + rnd() * 1.6 };
            city.add(m); movers.push(m);
          }

          // stars / data particles
          const starsGeo = new THREE.BufferGeometry();
          const starPos = [];
          for (let i = 0; i < 260; i++) starPos.push((rnd() - 0.5) * 80, 4 + rnd() * 30, (rnd() - 0.5) * 80);
          starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
          city.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x68dff1, size: 0.05, transparent: true, opacity: 0.7 })));

          let mouseX = 0, mouseY = 0, camX = 0, camY = 9, dragging = false, lastX = 0, lastY = 0, spin = 0, targetSpin = 0, zoom = 24;
          const onPointer = (e) => { mouseX = (e.clientX / window.innerWidth - 0.5) * 2; mouseY = (e.clientY / window.innerHeight - 0.5) * 2; };
          const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
          const onMove = (e) => { if (!dragging) return; targetSpin += (e.clientX - lastX) * 0.002; lastX = e.clientX; lastY = e.clientY; };
          const onUp = () => { dragging = false; };
          const onWheel = (e) => { if (!e.shiftKey) return; e.preventDefault(); zoom = Math.max(16, Math.min(36, zoom + e.deltaY * 0.02)); };
          const onHostClick = () => {
            host.classList.remove('cx-city-burst');
            void host.offsetWidth;
            host.classList.add('cx-city-burst');
            clearTimeout(host.__cxBurst);
            host.__cxBurst = setTimeout(() => host.classList.remove('cx-city-burst'), 720);
          };
          host.addEventListener('click', onHostClick);
          window.addEventListener('pointermove', onPointer);
          window.addEventListener('pointerdown', onDown);
          window.addEventListener('pointermove', onMove);
          window.addEventListener('pointerup', onUp);
          window.addEventListener('wheel', onWheel, { passive: false });

          const resize = () => {
            const w = host.clientWidth || window.innerWidth, h = host.clientHeight || window.innerHeight;
            renderer.setSize(w, h, false);
            camera.aspect = w / h; camera.updateProjectionMatrix();
          };
          resize();
          observer = new ResizeObserver(resize); observer.observe(host);

          let raf = 0, paused = false, mapFull = false, animate = null;
          const setPaused = () => { paused = mapFull || document.hidden; if (!paused && !raf && animate) raf = requestAnimationFrame(animate); };
          const onMapFull = (e) => { mapFull = !!e.detail; setPaused(); };
          const onVisibility = () => setPaused();
          window.addEventListener('cx-map-full', onMapFull);
          document.addEventListener('visibilitychange', onVisibility);
          const clock = new THREE.Clock();
          let lastInput = Date.now();
          const bump = () => { lastInput = Date.now(); if (!raf && !paused) setPaused(); };
          window.addEventListener('pointermove', bump, { passive: true });
          window.addEventListener('keydown', bump);
          animate = () => {
            raf = 0;
            if (paused) return;
            /* 3s 无输入就停帧，交互时再唤醒 */
            if (Date.now() - lastInput > 3000 && !dragging) return;
            raf = requestAnimationFrame(animate);
            const shellEl = document.querySelector('.cx-shell');
            if (shellEl && shellEl.dataset.view === 'dev') return;  /* 开发模式暂停城市渲染 */
            const t = clock.getElapsedTime();
            if (!dragging) targetSpin += 0.00045;
            spin += (targetSpin - spin) * 0.04;
            city.rotation.y = spin;
            camX += (mouseX * 1.8 - camX) * 0.03;
            camY += (9 + mouseY * 1.2 - camY) * 0.03;
            camera.position.x = camX;
            camera.position.y = camY;
            camera.position.z += (zoom - camera.position.z) * 0.03;
            camera.lookAt(0, 3.2, 0);
            for (const m of movers) {
              if (m.userData.axis === 'x') {
                m.position.x += m.userData.speed;
                if (m.position.x > 32) m.position.x = -32;
              } else {
                m.position.z += m.userData.speed;
                if (m.position.z > 32) m.position.z = -32;
              }
            }
            // city breathing
            city.position.y = Math.sin(t * 0.25) * 0.02;
            renderer.render(scene, camera);
          };
          animate();
          setReady(true);
          cleanup = () => {
            cancelAnimationFrame(raf);
            if (observer) observer.disconnect();
            host.removeEventListener('click', onHostClick);
            clearTimeout(host.__cxBurst);
            window.removeEventListener('pointermove', onPointer);
            window.removeEventListener('pointerdown', onDown);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('wheel', onWheel);
            window.removeEventListener('cx-map-full', onMapFull);
            document.removeEventListener('visibilitychange', onVisibility);
            scene.traverse((obj) => {
              try { obj.geometry?.dispose?.(); } catch {}
              try {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const mat of mats) {
                  if (!mat) continue;
                  for (const v of Object.values(mat)) if (v && v.isTexture) v.dispose?.();
                  mat.dispose?.();
                }
              } catch {}
            });
            renderer.dispose();
            if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
          };
        }).catch(() => { /* fallback SVG */ });
        return () => { disposed = true; cleanup(); };
      }, []);
      return h('div', { className: 'cx-city3d', ref },
        !ready ? h(TechBackdrop) : null,
        h('div', { className: 'cx-city-hud' },
          h('span', null, h('i', { className: 'dot' }), 'SECTOR 07 · ONLINE'),
          h('span', null, 'GRID SYNC 99.2%'),
          h('span', null, '22.5431°N 114.0579°E')),
        h('div', { className: 'cx-city-labels' },
          h('span', null, '平安金融中心'), h('span', null, 'KK100'), h('span', null, '春笋'), h('span', null, '腾讯滨海大厦'), h('span', null, '地王大厦')));
    }

    function TechBackdrop() {
      return h('div', { className: 'cx-tech-bg', 'aria-hidden': 'true' },
        h('svg', { viewBox: '0 0 1440 900', preserveAspectRatio: 'xMidYMid slice' },
          h('defs', null,
            h('radialGradient', { id: 'tbGlobe', cx: '.4', cy: '.35', r: '.7' }, h('stop', { offset: '0', stopColor: '#0e4a5f' }), h('stop', { offset: '1', stopColor: '#02080f' })),
            h('linearGradient', { id: 'tbLine', x1: '0', y1: '0', x2: '1', y2: '1' }, h('stop', { offset: '0', stopColor: '#3ee7ff' }), h('stop', { offset: '1', stopColor: '#42f5a7' })),
            h('filter', { id: 'tbGlow' }, h('feGaussianBlur', { stdDeviation: '3', result: 'b' }), h('feMerge', null, h('feMergeNode', { in: 'b' }), h('feMergeNode', { in: 'SourceGraphic' })))),
          h('circle', { cx: 1110, cy: 430, r: 205, fill: 'url(#tbGlobe)', stroke: 'rgba(62,231,255,.5)', strokeWidth: 1.5 }),
          h('ellipse', { cx: 1110, cy: 430, rx: 205, ry: 62, fill: 'none', stroke: 'rgba(62,231,255,.25)' }),
          h('ellipse', { cx: 1110, cy: 430, rx: 205, ry: 120, fill: 'none', stroke: 'rgba(62,231,255,.18)' }),
          h('ellipse', { cx: 1110, cy: 430, rx: 66, ry: 205, fill: 'none', stroke: 'rgba(62,231,255,.22)' }),
          h('ellipse', { cx: 1110, cy: 430, rx: 130, ry: 205, fill: 'none', stroke: 'rgba(62,231,255,.16)' }),
          h('path', { d: 'M905 430 Q1110 280 1315 430', fill: 'none', stroke: 'url(#tbLine)', strokeWidth: 2, className: 'cx-dash', filter: 'url(#tbGlow)' }),
          h('path', { d: 'M905 430 Q1110 580 1315 430', fill: 'none', stroke: 'url(#tbLine)', strokeWidth: 1.2, className: 'cx-dash', opacity: '.7' }),
          h('path', { d: 'M960 300 Q1110 180 1260 300', fill: 'none', stroke: '#42f5a7', strokeWidth: 1.2, className: 'cx-dash', opacity: '.6' }),
          h('path', { d: 'M960 560 Q1110 680 1260 560', fill: 'none', stroke: '#3ee7ff', strokeWidth: 1.2, className: 'cx-dash', opacity: '.6' }),
          [[905,430],[1315,430],[1110,225],[1110,635],[1010,285],[1210,575],[985,565],[1235,295]].map(([x,y],i) => h('circle', { key: i, cx: x, cy: y, r: i % 2 ? 3 : 2, fill: '#42f5a7', className: 'cx-pulse' })),
          h('path', { d: 'M1110 225 L1010 285 L905 430 L985 565 L1110 635 L1210 575 L1315 430 L1235 295 Z', fill: 'none', stroke: 'rgba(62,231,255,.18)' }),
          h('path', { d: 'M300 430 Q500 280 760 380 T1110 430', fill: 'none', stroke: 'rgba(62,231,255,.22)', strokeWidth: 1, className: 'cx-dash' }),
          h('path', { d: 'M220 620 Q520 500 760 560 T1110 430', fill: 'none', stroke: 'rgba(66,245,167,.16)', strokeWidth: 1, className: 'cx-dash' }),
          h('circle', { cx: 300, cy: 430, r: 4, fill: '#3ee7ff', className: 'cx-pulse' })));
    }
