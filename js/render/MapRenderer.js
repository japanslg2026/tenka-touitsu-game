/**
 * @file js/render/MapRenderer.js - SVGマップ描画・ズーム・天候Canvasエフェクト
 * 戦国天下統一伝 ES6モジュール
 * @typedef {import('../types.js').Province} Province
 * @typedef {import('../types.js').PlayableDaimyo} PlayableDaimyo
 * @typedef {import('../types.js').Scenario} Scenario
 */

// モジュール間安全参照ヘルパー
var SCENARIOS = (typeof window !== 'undefined' && (window.SCENARIOS || window.SCENARIOS_DATA)) || [];

export class MapRenderer {
  constructor(game) {
    this.game = game;
  }
}

export const MapRendererMethods = {
  /** 国境線を細く・滑らか・半透明にするモダン地図スタイル（CSS注入、1回のみ） */
  showHoverOutline(path) {
    const o = this._hoverOutline || document.getElementById('provHoverOutline');
    if (!o || !path) return;
    if (this.selectedProvId && path.id === `path-${this.selectedProvId}`) {
      o.style.display = 'none';
      return;
    }
    o.setAttribute('d', path.getAttribute('d'));
    o.setAttribute('transform', path.getAttribute('transform') || '');
    o.style.display = '';
    this._hoverPathId = path.id;
  },

  hideHoverOutline(path) {
    const o = this._hoverOutline || document.getElementById('provHoverOutline');
    if (!o) return;
    if (path && this._hoverPathId && this._hoverPathId !== path.id) return;
    o.style.display = 'none';
    this._hoverPathId = null;
  },

  injectModernMapStyle() {
    if (typeof document === 'undefined' || document.getElementById('modernMapStyle')) return;
    const st = document.createElement('style');
    st.id = 'modernMapStyle';
    st.textContent = `
      #sengokuMapSvg { shape-rendering: geometricPrecision; text-rendering: geometricPrecision; }
      #sengokuMapSvg .prov-path {
        stroke: none;
        stroke-width: 0.5px;
        stroke-linejoin: round;
        stroke-linecap: round;
        stroke-miterlimit: 2;
        vector-effect: non-scaling-stroke;
        fill-opacity: 0.88;
        paint-order: fill stroke;
        transition: fill-opacity .15s ease, filter .15s ease;
        cursor: pointer;
      }
      #mapBordersGroup { pointer-events: none; }
      #mapBordersGroup .map-border-line, #mapBordersGroup .map-coastline, #mapBordersGroup .map-coast-line {
        vector-effect: non-scaling-stroke;
        stroke-linejoin: round;
        stroke-linecap: round;
      }
      #provSelectedOutline {
        vector-effect: non-scaling-stroke;
        stroke-linejoin: round;
        stroke-linecap: round;
        pointer-events: none;
      }
      #provHoverOutline {
        vector-effect: non-scaling-stroke;
        stroke-linejoin: round;
        stroke-linecap: round;
        pointer-events: none;
      }
      #sengokuMapSvg .prov-path:hover {
        fill-opacity: 1;
        stroke: rgba(255, 240, 200, 0.9);
        filter: brightness(1.12);
      }
      #sengokuMapSvg .prov-path.selected {
        fill-opacity: 1;
        stroke: #ffffff;
        stroke-width: 1.6px;
        stroke-linejoin: round;
        stroke-linecap: round;
        paint-order: stroke fill;
        filter: brightness(1.15) !important;
      }
      #mapRoadsGroup path, #mapRoadsGroup line { vector-effect: non-scaling-stroke; stroke-linecap: round; stroke-width: 1px; }
    `;
    document.head.appendChild(st);
  },

  provinceCenterXY(prov) {
    if (!prov) return null;
    let cx = Number(prov.cx), cy = Number(prov.cy);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      const base = (window.PROVINCES_DATA || []).find(p => p.id === prov.id);
      cx = Number(base && base.cx); cy = Number(base && base.cy);
    }
    return (Number.isFinite(cx) && Number.isFinite(cy)) ? { x: cx, y: cy } : null;
  },

  /** 領国群の重心に最も近い国 */

  provinceLatitude(provId) {
    const lat = (window.PROVINCE_LATITUDE || {})[provId];
    if (Number.isFinite(Number(lat))) return Number(lat);
    const rank = this.provinceGeoRank(provId);
    return rank >= 10000 ? 0 : 42 - rank * 0.14;
  },

  // 天皇・親王・上皇は支城の城代にしない。本拠の当主に選ばれたときだけ居城に座る。,

  initSvgMap() {
    if (typeof window.loadKamonSymbols === 'function') {
      window.loadKamonSymbols();
    }
    // 【修正1】CSSによる立体的な傾き（3D変形）を強制的に無効化する
    const svgMap = document.getElementById('sengokuMapSvg');
    if (svgMap) {
      svgMap.style.setProperty('transform', 'none', 'important');
    }
    const mapWrapper = document.getElementById('mapWrapper');
    if (mapWrapper) {
      mapWrapper.style.setProperty('perspective', 'none', 'important');
      mapWrapper.style.setProperty('transform', 'none', 'important');
    }

    // 【地図スタイル】国境線を細く滑らかに（最新ゲーム風）
    if (typeof this.injectModernMapStyle === 'function') this.injectModernMapStyle();

    const roadsGroup = document.getElementById('mapRoadsGroup');
    const provGroup = document.getElementById('mapProvincesGroup');
    const markGroup = document.getElementById('mapMarkersGroup');
    if (!provGroup) return;

    // 日本列島と離島グループの右2度回転（背景は回転させず、列島と離島のみ回転）
    let bordersGroup = document.getElementById('mapBordersGroup');
    if (!bordersGroup) {
      bordersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      bordersGroup.setAttribute('id', 'mapBordersGroup');
      bordersGroup.style.pointerEvents = 'none';
    }

    let archGroup = document.getElementById('mapArchipelagoGroup');
    const panLayer = document.getElementById('mapPanZoomLayer');
    if (!archGroup && panLayer) {
      archGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      archGroup.setAttribute('id', 'mapArchipelagoGroup');
      archGroup.setAttribute('transform', 'rotate(1, 500, 340)');
      if (roadsGroup) archGroup.appendChild(roadsGroup);
      archGroup.appendChild(provGroup);
      archGroup.appendChild(bordersGroup);
      if (markGroup) archGroup.appendChild(markGroup);
      panLayer.appendChild(archGroup);
    } else if (archGroup) {
      archGroup.setAttribute('transform', 'rotate(1, 500, 340)');
      if (bordersGroup.parentNode !== archGroup) {
        if (markGroup && markGroup.parentNode === archGroup) {
          archGroup.insertBefore(bordersGroup, markGroup);
        } else {
          archGroup.appendChild(bordersGroup);
        }
      }
    }

    // 境界線要素の初期化（海岸線＋各令制国間の境界セグメント）
    bordersGroup.innerHTML = '';
    const borderData = (typeof window !== 'undefined' && window.MAP_BORDERS_DATA) || null;
    this._borderElements = [];
    this._coastElements = [];
    if (borderData) {
      if (Array.isArray(borderData.coastlines)) {
        borderData.coastlines.forEach(c => {
          const cp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          cp.setAttribute('id', `coast-${c.p}`);
          cp.setAttribute('class', 'map-coast-line');
          cp.setAttribute('data-p', c.p);
          cp.setAttribute('d', c.d);
          cp.setAttribute('fill', 'none');
          cp.setAttribute('stroke', 'rgba(20, 14, 8, 0.78)');
          cp.setAttribute('stroke-width', '0.85');
          cp.setAttribute('stroke-linecap', 'round');
          cp.setAttribute('stroke-linejoin', 'round');
          bordersGroup.appendChild(cp);
          this._coastElements.push({ el: cp, p: c.p });
        });
      } else if (borderData.coastline) {
        const coastPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        coastPath.setAttribute('id', 'mapCoastline');
        coastPath.setAttribute('class', 'map-coastline');
        coastPath.setAttribute('d', borderData.coastline);
        coastPath.setAttribute('fill', 'none');
        coastPath.setAttribute('stroke', 'rgba(20, 14, 8, 0.78)');
        coastPath.setAttribute('stroke-width', '0.85');
        coastPath.setAttribute('stroke-linecap', 'round');
        coastPath.setAttribute('stroke-linejoin', 'round');
        bordersGroup.appendChild(coastPath);
      }
      if (Array.isArray(borderData.borders)) {
        borderData.borders.forEach(b => {
          const bp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          bp.setAttribute('id', `border-${b.p1}-${b.p2}`);
          bp.setAttribute('class', 'map-border-line');
          bp.setAttribute('data-p1', b.p1);
          bp.setAttribute('data-p2', b.p2);
          bp.setAttribute('d', b.d);
          bp.setAttribute('fill', 'none');
          bp.setAttribute('stroke', 'rgba(20, 14, 8, 0.75)');
          bp.setAttribute('stroke-width', '0.8');
          bp.setAttribute('stroke-linecap', 'round');
          bp.setAttribute('stroke-linejoin', 'round');
          bordersGroup.appendChild(bp);
          this._borderElements.push({ el: bp, p1: b.p1, p2: b.p2 });
        });
      }
    }

    // ホバー輪郭用レイヤー（境界線・海岸線の上、家紋の下、マウス判定は透過）
    let hoverLayer = document.getElementById('provHoverOutline');
    if (!hoverLayer) {
      hoverLayer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hoverLayer.setAttribute('id', 'provHoverOutline');
      hoverLayer.setAttribute('fill', 'none');
      hoverLayer.setAttribute('stroke', '#f3d27a');
      hoverLayer.setAttribute('stroke-width', '1.6');
      hoverLayer.setAttribute('stroke-linejoin', 'round');
      hoverLayer.setAttribute('stroke-linecap', 'round');
      hoverLayer.setAttribute('vector-effect', 'non-scaling-stroke');
      hoverLayer.style.pointerEvents = 'none';
      hoverLayer.style.display = 'none';
      hoverLayer.style.filter = 'drop-shadow(0 0 2px rgba(0,0,0,0.85))';
    }
    if (archGroup) {
      if (markGroup && markGroup.parentNode === archGroup) {
        archGroup.insertBefore(hoverLayer, markGroup);
      } else {
        archGroup.appendChild(hoverLayer);
      }
    }
    this._hoverOutline = hoverLayer;

    // 選択領国輪郭用レイヤー（境界線・海岸線の上、領国全体の輪郭より最優先で前面表示、家紋の下）
    let selectedLayer = document.getElementById('provSelectedOutline');
    if (!selectedLayer) {
      selectedLayer = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      selectedLayer.setAttribute('id', 'provSelectedOutline');
      selectedLayer.setAttribute('fill', 'none');
      selectedLayer.setAttribute('stroke', '#ffffff');
      selectedLayer.setAttribute('stroke-width', '2.0');
      selectedLayer.setAttribute('stroke-linejoin', 'round');
      selectedLayer.setAttribute('stroke-linecap', 'round');
      selectedLayer.setAttribute('vector-effect', 'non-scaling-stroke');
      selectedLayer.style.pointerEvents = 'none';
      selectedLayer.style.display = 'none';
      selectedLayer.style.filter = 'drop-shadow(0 0 2.5px rgba(0,0,0,0.9))';
    }
    if (archGroup) {
      if (markGroup && markGroup.parentNode === archGroup) {
        archGroup.insertBefore(selectedLayer, markGroup);
      } else {
        archGroup.appendChild(selectedLayer);
      }
    }
    this._selectedOutline = selectedLayer;

    if (roadsGroup) roadsGroup.innerHTML = '';
    if (this._hoverOutline) this._hoverOutline.style.display = 'none';
    if (this._selectedOutline) this._selectedOutline.style.display = 'none';
    if (provGroup) provGroup.innerHTML = '';
    if (markGroup) markGroup.innerHTML = '';

    // 街道・航路ラインの描画（ユーザー指定の13航路ペアのみ点線を表示し、それ以外は非表示）
    const allowedRoutes = new Set([
      'ezo-ugo',              // 蝦夷と羽後
      'ezo-higashi_tsugaru',  // 蝦夷と東津軽
      'awa_shikoku-awaji',    // 阿波と淡路
      'awaji-harima',         // 淡路と播磨
      'awaji-settsu',         // 淡路と摂津
      'awaji-izumi',          // 淡路と和泉
      'bizen-sanuki',         // 讃岐と備前
      'iyo-suo',              // 伊予と周防
      'bungo-iyo',            // 伊予と豊後
      'chikuzen-tsushima',    // 対馬と筑前
      'ryukyu-satsuma',       // 薩摩と琉球
      'echigo-sado',          // 越後と佐渡
      'izumo-oki'             // 出雲と隠岐
    ]);

    const drawnPairs = new Set();
    this.provinces.forEach(p => {
      (p.neighbors || []).forEach(nId => {
        const key = [p.id, nId].sort().join('-');
        if (!drawnPairs.has(key)) {
          drawnPairs.add(key);
          // 指定された航路ペア以外は点線を表示しない
          if (!allowedRoutes.has(key)) return;

          const target = this.provinces.find(x => x.id === nId);
          if (target && p.cx !== undefined && target.cx !== undefined) {
            if ((p.id === 'ryukyu' && nId === 'satsuma') || (p.id === 'satsuma' && nId === 'ryukyu')) {
              // 琉球 - 薩摩間の航路は九州南西海域を優美に周回する曲線航路
              const satsumaP = p.id === 'satsuma' ? p : target;
              const ryukyuP = p.id === 'ryukyu' ? p : target;
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', `M ${satsumaP.cx} ${satsumaP.cy} C 25 540, 60 595, ${ryukyuP.cx} ${ryukyuP.cy}`);
              path.setAttribute('stroke', 'rgba(180, 140, 70, 0.45)');
              path.setAttribute('stroke-width', '1.5');
              path.setAttribute('stroke-dasharray', '3,3');
              path.setAttribute('fill', 'none');
              roadsGroup.appendChild(path);
            } else if ((p.id === 'ugo' && nId === 'ezo') || (p.id === 'ezo' && nId === 'ugo')) {
              // 羽後 - 蝦夷間の航路は日本海側を優美に周回する曲線航路（陸地と重ならないよう実際の日本海航路に沿って描画）
              const ugoP = p.id === 'ugo' ? p : target;
              const ezoP = p.id === 'ezo' ? p : target;
              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              path.setAttribute('d', `M ${ugoP.cx} ${ugoP.cy} C 805.3 216.6, 857.6 84.8, ${ezoP.cx} ${ezoP.cy}`);
              path.setAttribute('stroke', 'rgba(180, 140, 70, 0.45)');
              path.setAttribute('stroke-width', '1.5');
              path.setAttribute('stroke-dasharray', '3,3');
              path.setAttribute('fill', 'none');
              roadsGroup.appendChild(path);
            } else if ((p.id === 'izumo' && nId === 'oki') || (p.id === 'oki' && nId === 'izumo')) {
              // 出雲 - 隠岐間の航路（陸地上には表示せず、島根半島美保関沖から隠岐南端へと海上のみを直結）
              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', '327.1');
              line.setAttribute('y1', '332.8');
              line.setAttribute('x2', '359.5');
              line.setAttribute('y2', '304.0');
              line.setAttribute('stroke', 'rgba(180, 140, 70, 0.45)');
              line.setAttribute('stroke-width', '1.5');
              line.setAttribute('stroke-dasharray', '3,3');
              roadsGroup.appendChild(line);
            } else {
              const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
              line.setAttribute('x1', p.cx);
              line.setAttribute('y1', p.cy);
              line.setAttribute('x2', target.cx);
              line.setAttribute('y2', target.cy);
              line.setAttribute('stroke', 'rgba(180, 140, 70, 0.45)');
              line.setAttribute('stroke-width', '1.5');
              line.setAttribute('stroke-dasharray', '3,3');
              roadsGroup.appendChild(line);
            }
          }
        }
      });
    });

    // 領国ポリゴン & 家紋バッジの描画（家紋は大名の本拠地のみに表示）
    this.provinces.forEach(p => {
      const isMine = p.ownerId === this.playerClanId;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', `path-${p.id}`);
      path.setAttribute('class', `prov-path ${isMine ? 'player-prov' : 'enemy-prov'}`);
      path.setAttribute('d', p.svgPath || p.d);
      path.setAttribute('fill', this.getProvinceColor(p));

      path.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectProvince(p.id);
        this.audio.playHyoshigi();
      });

      path.addEventListener('mouseenter', () => this.showHoverOutline(path));
      path.addEventListener('mouseleave', () => this.hideHoverOutline(path));

      provGroup.appendChild(path);

      // 家紋バッジ（各大名の本拠地のみに家紋を表示）
      if (p.cx !== undefined && p.cy !== undefined) {
        const isCapital = p.ownerId ? (typeof this.isCapitalProvince === 'function' ? this.isCapitalProvince(p.id, p.ownerId) : true) : false;
        const showKamon = !!(p.ownerId && isCapital);

        const badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        badgeG.setAttribute('id', `badge-${p.id}`);
        badgeG.setAttribute('class', `prov-badge-group ${isMine ? 'player-badge' : ''}`);
        if (!showKamon) {
          badgeG.style.display = 'none';
        }

        // 家紋バッジ (16pxでさらに小型化・過密解消)
        const badgeSize = 16;
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('id', `kamon-use-${p.id}`);
        use.setAttribute('href', showKamon ? `#${this.getClanKamonId(p.ownerId)}` : '');
        const kamonX = p.kamonX !== undefined ? p.kamonX : p.cx;
        const kamonY = p.kamonY !== undefined ? p.kamonY : p.cy;
        use.setAttribute('x', kamonX - badgeSize / 2);
        use.setAttribute('y', kamonY - badgeSize / 2);
        use.setAttribute('width', badgeSize);
        use.setAttribute('height', badgeSize);
        if (!showKamon) {
          use.style.display = 'none';
        }

        badgeG.appendChild(use);
        markGroup.appendChild(badgeG);
      }
    });

    // パン・ズーム
    const wrapper = document.getElementById('mapWrapper');
    if (wrapper && panLayer && !this.mapGestureBound) {
      // シナリオを切り替えて地図を描き直しても、ドラッグ操作が二重にならないようにする
      this.mapGestureBound = true;
      wrapper.addEventListener('mousedown', (e) => {
        this.isMapDragging = true;
        this.dragStartX = e.clientX - this.mapPanX;
        this.dragStartY = e.clientY - this.mapPanY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isMapDragging) return;
        this.mapPanX = e.clientX - this.dragStartX;
        this.mapPanY = e.clientY - this.dragStartY;
        this.applyPanZoom();
      });

      window.addEventListener('mouseup', () => {
        this.isMapDragging = false;
      });

      // スマホ：地図上のドラッグは上下左右とも地図を動かす。2本指で拡大縮小
      const touchDistance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mapZoomLimit = () => (window.matchMedia('(max-width: 768px)').matches ? 5 : 3.5);

      wrapper.addEventListener('touchstart', (e) => {
        if (e.target.closest('.map-ctrl-btn')) return;
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this.touchStartX = t.clientX;
          this.touchStartY = t.clientY;
          this.dragStartX = t.clientX - this.mapPanX;
          this.dragStartY = t.clientY - this.mapPanY;
          this.isMapTouchPanning = false;
          this.mapPinching = false;
          return;
        }
        if (e.touches.length === 2) {
          this.mapPinching = true;
          this.pinchStartDist = touchDistance(e.touches[0], e.touches[1]);
          this.pinchStartScale = this.mapScale;
          this.isMapTouchPanning = true;
          this.mapSuppressClick = true;
        }
      }, { passive: true });

      wrapper.addEventListener('touchmove', (e) => {
        if (e.target.closest('.map-ctrl-btn') && !this.mapPinching && !this.isMapTouchPanning) return;
        if (e.touches.length === 2 && this.mapPinching) {
          e.preventDefault();
          const dist = touchDistance(e.touches[0], e.touches[1]);
          if (!this.pinchStartDist) return;
          const rect = wrapper.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          const oldScale = this.mapScale || 1;
          const nextScale = Math.min(mapZoomLimit(), Math.max(0.65, this.pinchStartScale * (dist / this.pinchStartDist)));
          this.mapPanX = cx - (cx - this.mapPanX) * (nextScale / oldScale);
          this.mapPanY = cy - (cy - this.mapPanY) * (nextScale / oldScale);
          this.mapScale = nextScale;
          this.applyPanZoom();
          this.mapSuppressClick = true;
          return;
        }
        if (e.touches.length !== 1 || this.mapPinching) return;
        const t = e.touches[0];
        const dx = t.clientX - this.touchStartX;
        const dy = t.clientY - this.touchStartY;
        if (!this.isMapTouchPanning) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          this.isMapTouchPanning = true;
        }
        e.preventDefault();
        this.mapPanX = t.clientX - this.dragStartX;
        this.mapPanY = t.clientY - this.dragStartY;
        this.applyPanZoom();
        this.mapSuppressClick = true;
      }, { passive: false });

      wrapper.addEventListener('touchend', (e) => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this.touchStartX = t.clientX;
          this.touchStartY = t.clientY;
          this.dragStartX = t.clientX - this.mapPanX;
          this.dragStartY = t.clientY - this.mapPanY;
          this.mapPinching = false;
          this.isMapTouchPanning = false;
          return;
        }
        if (e.touches.length === 0) {
          this.isMapTouchPanning = false;
          this.mapPinching = false;
        }
      });

      // 地図を動かした直後のタップで領国が選ばれないようにする
      wrapper.addEventListener('click', (e) => {
        if (!this.mapSuppressClick) return;
        this.mapSuppressClick = false;
        e.preventDefault();
        e.stopPropagation();
      }, true);

      wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        // ホイールズームを細かく滑らかに調整できるように設定 (約5%刻みの微細ズーム)
        const zoomFactor = e.deltaY < 0 ? 1.05 : 0.952;
        const oldScale = this.mapScale;
        const newScale = Math.min(mapZoomLimit(), Math.max(0.65, oldScale * zoomFactor));
        this.mapPanX = mouseX - (mouseX - this.mapPanX) * (newScale / oldScale);
        this.mapPanY = mouseY - (mouseY - this.mapPanY) * (newScale / oldScale);
        this.mapScale = newScale;
        this.applyPanZoom();
      }, { passive: false });

      document.getElementById('mapZoomInBtn')?.addEventListener('click', () => {
        this.mapScale = Math.min(mapZoomLimit(), this.mapScale * 1.2);
        this.applyPanZoom();
      });
      document.getElementById('mapZoomOutBtn')?.addEventListener('click', () => {
        this.mapScale = Math.max(0.65, this.mapScale * 0.83);
        this.applyPanZoom();
      });
      document.getElementById('mapResetBtn')?.addEventListener('click', () => {
        this.mapScale = 1.0;
        this.mapPanX = 0;
        this.mapPanY = 0;
        this.applyPanZoom();
      });
    }
  },

  applyPanZoom() {
    const panLayer = document.getElementById('mapPanZoomLayer');
    if (panLayer) {
      panLayer.setAttribute('transform', `translate(${this.mapPanX}, ${this.mapPanY}) scale(${this.mapScale})`);
    }
  },


  // ============================================================================
  // 陣形三すくみ・地形補正・軍師予測
  // ============================================================================,

  initEndingSakura() {
    const canvas = document.getElementById('endingSakuraCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const petals = [];
    const petalCount = 70;

    for (let i = 0; i < petalCount; i++) {
      petals.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 7 + 5,
        speedX: Math.random() * 1.5 - 0.5,
        speedY: Math.random() * 1.2 + 0.8,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: Math.random() * 0.03 - 0.015,
        color: Math.random() > 0.3 ? 'rgba(255, 192, 203, 0.75)' : 'rgba(255, 215, 0, 0.65)'
      });
    }

    const animate = () => {
      if (document.getElementById('endingRollModal')?.classList.contains('hidden')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      petals.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.angularSpeed;

        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.x < -20) p.x = canvas.width + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      this._sakuraAnimId = requestAnimationFrame(animate);
    };

    if (this._sakuraAnimId) cancelAnimationFrame(this._sakuraAnimId);
    this._sakuraAnimId = requestAnimationFrame(animate);
  },

  getClanHighlightColor(clanId) {
    if (!clanId) return '#ffd700';

    // 個別に指定する輪郭色（現在なし。徳川も 2026-10-11 bg から一般則）
    const HIGHLIGHT_OVERRIDES = {
    };
    if (HIGHLIGHT_OVERRIDES[clanId]) return HIGHLIGHT_OVERRIDES[clanId];

    // 塗りと同じ「今の領国色」から実行時に導出（色の変更に自動で追従。2026-10-11 bd）
    const base = this.getRegisteredProvinceColor
      ? this.getRegisteredProvinceColor({ ownerId: clanId })
      : null;
    if (!base || base === '#5a4638') {
      const master = (window.CLAN_MASTER_DATA || {})[clanId];
      if (master && master.color) return this.deriveClanHighlightColor(master.color);
      return '#ffd700';
    }
    return this.deriveClanHighlightColor(base);
  },

  // 自国領の輪郭色：大名家の現在の領国色を CIELAB の明度だけ少し上げて求める（2026-10-11 bd）
  // 色相はそのまま、彩度は保ちつつ表示範囲に収める。塗りとの最低コントラスト比を確保する
  deriveClanHighlightColor(baseHex, opts = {}) {
    const lift = opts.lift ?? 16;         // 明度の引き上げ幅（L*）
    const minContrast = opts.minContrast ?? 1.9; // 塗り色との最低コントラスト比（WCAG 方式）
    const m = /^#?([0-9a-f]{6})$/i.exec(String(baseHex || '').trim());
    if (!m) return '#ffd700';
    const n = parseInt(m[1], 16);
    const rgb0 = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255);
    const lin = u => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4));
    const gam = u => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);
    const lum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const [R, G, B] = rgb0.map(lin);
    const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
    const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const L0 = 116 * f(Y) - 16, A0 = 500 * (f(X) - f(Y)), B0 = 200 * (f(Y) - f(Z));
    const C0 = Math.hypot(A0, B0), H0 = Math.atan2(B0, A0);
    const finv = t => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);
    const toRgb = (L, C) => {
      const fy = (L + 16) / 116, fx = fy + C * Math.cos(H0) / 500, fz = fy - C * Math.sin(H0) / 200;
      const x = 0.95047 * finv(fx), y = finv(fy), z = 1.08883 * finv(fz);
      const r = 3.2406 * x - 1.5372 * y - 0.4986 * z;
      const g = -0.9689 * x + 1.8758 * y + 0.0415 * z;
      const b = 0.0557 * x - 0.2040 * y + 1.0570 * z;
      return [r, g, b].map(gam);
    };
    // 表示範囲（sRGB）に入るまで彩度を少しずつ下げる
    const fit = L => {
      for (let C = C0; C >= 0; C -= 1) {
        const c = toRgb(L, C);
        if (c.every(u => u >= -0.001 && u <= 1.001)) return c.map(u => Math.min(1, Math.max(0, u)));
      }
      return toRgb(L, 0).map(u => Math.min(1, Math.max(0, u)));
    };
    let best = null;
    for (let L = L0 + lift; L <= 97; L += 1) {
      best = fit(L);
      if (contrast(best, rgb0) >= minContrast) break;
    }
    // 元々かなり明るい色で、明るくしても差が付かない場合は少し暗くする
    if (!best || contrast(best, rgb0) < minContrast) {
      for (let L = Math.min(L0 - lift, 90); L >= 5; L -= 1) {
        best = fit(L);
        if (contrast(best, rgb0) >= minContrast) break;
      }
    }
    const hx = v => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${hx(best[0])}${hx(best[1])}${hx(best[2])}`;
  },

  // カラーの明度引き上げヘルパー,

  updateMapDisplay() {
    const highlightColor = this.getClanHighlightColor(this.playerClanId);
    const glowColor = this.getClanGlowColor(this.playerClanId, 0.75);

    // CSSカスタムプロパティを更新して全体のスタイルと同期
    document.documentElement.style.setProperty('--player-clan-color', highlightColor);
    document.documentElement.style.setProperty('--player-clan-glow', glowColor);

    const provGroup = document.getElementById('mapProvincesGroup');
    const markGroup = document.getElementById('mapMarkersGroup');
    this._heatRangeCache = null;

    this._mapTileCache = this._mapTileCache || {};
    let territoryChanged = false;

    // 1. 各タイルの色・クラス・インラインスタイルの差分更新（[93位] 高速化最適化）
    this.provinces.forEach(p => {
      const isMine = p.ownerId === this.playerClanId;
      const isSelected = p.id === this.selectedProvId;
      const fillCol = this.getProvinceColor(p);
      const kamonId = p.ownerId ? this.getClanKamonId(p.ownerId) : '';
      const cached = this._mapTileCache[p.id];

      // キャッシュと同一ならDOM書き換えをスキップしてCPU負荷を劇的に低減
      if (cached &&
          cached.ownerId === p.ownerId &&
          cached.isSelected === isSelected &&
          cached.fillCol === fillCol &&
          cached.highlightColor === highlightColor &&
          cached.troops === p.troops) {
        return;
      }

      if (!cached || cached.ownerId !== p.ownerId) {
        territoryChanged = true;
      }

      this._mapTileCache[p.id] = {
        ownerId: p.ownerId,
        isSelected,
        fillCol,
        highlightColor,
        troops: p.troops
      };

      const path = document.getElementById(`path-${p.id}`);
      if (path) {
        path.setAttribute('fill', fillCol);
        path.classList.toggle('player-prov', isMine);
        path.classList.toggle('enemy-prov', !isMine);
        path.classList.toggle('selected', isSelected);

        if (isSelected) {
          path.style.stroke = '#ffffff';
          path.style.strokeWidth = '1.6px';
          path.style.strokeLinejoin = 'round';
          path.style.strokeLinecap = 'round';
          path.style.paintOrder = 'stroke fill';
          path.style.filter = 'brightness(1.15)';
        } else {
          path.style.stroke = 'none';
          path.style.strokeWidth = '';
          path.style.paintOrder = '';
          path.style.filter = 'none';
        }
      }

      const isCapital = p.ownerId ? (typeof this.isCapitalProvince === 'function' ? this.isCapitalProvince(p.id, p.ownerId) : true) : false;
      const showKamon = !!(p.ownerId && isCapital);

      const badge = document.getElementById(`badge-${p.id}`);
      if (badge) {
        badge.classList.toggle('player-badge', isMine);
        badge.style.display = showKamon ? '' : 'none';
      }
      const use = document.getElementById(`kamon-use-${p.id}`);
      if (use) {
        if (!showKamon) {
          use.setAttribute('href', '');
          use.style.display = 'none';
        } else {
          use.setAttribute('href', `#${kamonId}`);
          use.style.display = '';
        }
      }
    });

    // 2. DOM並び替え（リフローが発生するため、所有権や選択状態が変化した時のみ実行）
    const selectionChanged = this._lastDomSelectedProvId !== this.selectedProvId;
    this._lastDomSelectedProvId = this.selectedProvId;

    if ((territoryChanged || selectionChanged) && provGroup) {
      this.provinces.forEach(p => {
        if (p.ownerId === this.playerClanId && p.id !== this.selectedProvId) {
          const path = document.getElementById(`path-${p.id}`);
          if (path && path.parentNode === provGroup) {
            provGroup.appendChild(path);
          }
        }
      });
      if (this.selectedProvId) {
        const selPath = document.getElementById(`path-${this.selectedProvId}`);
        if (selPath && selPath.parentNode === provGroup) {
          provGroup.appendChild(selPath);
        }
      }
    }

    if ((territoryChanged || selectionChanged) && markGroup) {
      this.provinces.forEach(p => {
        if (p.ownerId === this.playerClanId && p.id !== this.selectedProvId) {
          const badge = document.getElementById(`badge-${p.id}`);
          if (badge && badge.parentNode === markGroup) {
            markGroup.appendChild(badge);
          }
        }
      });
      if (this.selectedProvId) {
        const selBadge = document.getElementById(`badge-${this.selectedProvId}`);
        if (selBadge && selBadge.parentNode === markGroup) {
          markGroup.appendChild(selBadge);
        }
      }
    }

    // 選択領国の最前面アウトライン更新（境界線・海岸線・領国全体の輪郭よりも最優先で前面表示）
    const selOutline = this._selectedOutline || document.getElementById('provSelectedOutline');
    if (selOutline) {
      if (this.selectedProvId) {
        const selPath = document.getElementById(`path-${this.selectedProvId}`);
        const selProv = this.provinces.find(p => p.id === this.selectedProvId);
        const d = (selPath && selPath.getAttribute('d')) || (selProv && (selProv.svgPath || selProv.d)) || '';
        if (d) {
          selOutline.setAttribute('d', d);
          selOutline.style.display = '';
        } else {
          selOutline.style.display = 'none';
        }
      } else {
        selOutline.style.display = 'none';
      }
    }

    // 境界線の更新：各大名の領国内の境界線は両国の色と同じにして領土を一体化
    this.updateBorderLines();
  },

  updateBorderLines() {
    if (!this._borderElements || this._borderElements.length === 0) return;
    const provMap = new Map();
    this.provinces.forEach(p => provMap.set(p.id, p));

    // 選択中の領国の支配大名（選択がなければプレイヤー大名）
    const selProv = this.selectedProvId ? provMap.get(this.selectedProvId) : null;
    const hlClanId = selProv ? selProv.ownerId : (this.playerClanId || null);

    // 1. 各領国間の境界線の更新
    this._borderElements.forEach(({ el, p1, p2 }) => {
      const prov1 = provMap.get(p1);
      const prov2 = provMap.get(p2);
      const o1 = prov1 ? prov1.ownerId : null;
      const o2 = prov2 ? prov2.ownerId : null;
      const isSelBorder = this.selectedProvId && (p1 === this.selectedProvId || p2 === this.selectedProvId);

      if (o1 && o2 && o1 === o2) {
        // 同一大名領国内の境界線：非表示にして完全一体化
        // （選択領国の外周は provSelectedOutline で最前面に優先描画される）
        el.style.display = 'none';
      } else {
        el.style.display = '';
        const isHlBorder = !!hlClanId && (o1 === hlClanId || o2 === hlClanId);
        if (isSelBorder) {
          // 選んだ国と他家との境界線：領国全体の輪郭よりも優先表示（純白、1.6px）
          el.style.stroke = '#ffffff';
          el.style.strokeWidth = '1.6px';
          el.style.opacity = '1';
          el.style.filter = 'none';
        } else if (isHlBorder) {
          // 領国全体の他家境界線：くっきりと目立つゴールド枠線（#ffd700、1.5px、ぼやけ・影なし）
          el.style.stroke = '#ffd700';
          el.style.strokeWidth = '1.5px';
          el.style.opacity = '1';
          el.style.filter = 'none';
        } else if (hlClanId) {
          el.style.stroke = 'rgba(70, 62, 52, 0.55)';
          el.style.strokeWidth = '0.65px';
          el.style.opacity = '0.6';
          el.style.filter = 'none';
        } else {
          el.style.stroke = 'rgba(20, 14, 8, 0.75)';
          el.style.strokeWidth = '0.8px';
          el.style.opacity = '1';
          el.style.filter = 'none';
        }
      }
    });

    // 2. 海岸線の更新
    if (this._coastElements && this._coastElements.length > 0) {
      this._coastElements.forEach(({ el, p }) => {
        const prov = provMap.get(p);
        const o = prov ? prov.ownerId : null;
        const isSelectedProv = this.selectedProvId && p === this.selectedProvId;

        if (isSelectedProv) {
          // 選んだ国の海岸線：領国全体の輪郭よりも優先表示（純白、繊細な1.1pxで太すぎない）
          el.style.stroke = '#ffffff';
          el.style.strokeWidth = '1.1px';
          el.style.opacity = '1';
          el.style.filter = 'none';
        } else if (hlClanId && o === hlClanId) {
          // 選択大名全体の海岸線：細く繊細なゴールド枠線（太すぎず美観を維持、1.0px）
          el.style.stroke = '#ffd700';
          el.style.strokeWidth = '1.0px';
          el.style.opacity = '1';
          el.style.filter = 'none';
        } else if (hlClanId) {
          el.style.stroke = 'rgba(70, 62, 52, 0.55)';
          el.style.strokeWidth = '0.65px';
          el.style.opacity = '0.6';
          el.style.filter = 'none';
        } else {
          el.style.stroke = 'rgba(20, 14, 8, 0.78)';
          el.style.strokeWidth = '0.85px';
          el.style.opacity = '1';
          el.style.filter = 'none';
        }
      });
    }
  },

  initSeasonCanvas() {
    this.seasonCanvas = document.getElementById('seasonCanvas');
    if (!this.seasonCanvas) return;
    this.seasonCtx = this.seasonCanvas.getContext('2d');
    this.seasonParticles = [];

    const resize = () => {
      const parent = this.seasonCanvas.parentElement;
      if (parent) {
        this.seasonCanvas.width = parent.clientWidth;
        this.seasonCanvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    this.initSeasonParticles();
    this.startSeasonAnimationLoop();
  },

  startSeasonAnimationLoop() {
    const render = () => {
      if (!this.seasonCanvas || !this.seasonCtx) return;
      const ctx = this.seasonCtx;
      const w = this.seasonCanvas.width;
      const h = this.seasonCanvas.height;
      if (w === 0 || h === 0) {
        requestAnimationFrame(render);
        return;
      }
      ctx.clearRect(0, 0, w, h);

      const s = this.seasonIdx; // 0:春, 1:夏, 2:秋, 3:冬
      const isRain = this.currentWeather === '恵みの雨' || this.currentWeather === '豪雨';
      const isBlizzard = this.currentWeather === '吹雪' || this.currentWeather === '大雪';

      // 1. 雨天描画
      if (isRain) {
        ctx.strokeStyle = this.currentWeather === '豪雨' ? 'rgba(160, 200, 240, 0.4)' : 'rgba(180, 220, 255, 0.25)';
        ctx.lineWidth = this.currentWeather === '豪雨' ? 1.6 : 1.0;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) {
          const rx = (Math.sin(i * 77 + Date.now() * 0.002) * 0.5 + 0.5) * w;
          const ry = ((Date.now() * 0.7 + i * 33) % h);
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 6, ry + 16);
        }
        ctx.stroke();
      }

      // 2. 季節パーティクル描画
      this.seasonParticles.forEach(p => {
        p.angle += p.rotSpeed;
        p.flip += p.flipSpeed;

        if (s === 0) {
          // 春：桜の花びら
          p.y += p.speedY * 0.85;
          p.x += Math.sin(p.angle) * 1.2 + 0.5;
          if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
          if (p.x > w + 10) p.x = -10;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.scale(Math.cos(p.flip), 1);
          ctx.fillStyle = `rgba(255, 182, 193, ${p.opacity})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 1.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (s === 1) {
          // 夏：陽光・木漏れ日の輝き
          p.y -= p.speedY * 0.5;
          p.x += Math.cos(p.angle) * 0.4;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }

          ctx.save();
          ctx.beginPath();
          const radGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
          radGrad.addColorStop(0, `rgba(255, 235, 140, ${p.opacity * 0.7})`);
          radGrad.addColorStop(1, 'rgba(255, 235, 140, 0)');
          ctx.fillStyle = radGrad;
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (s === 2) {
          // 秋：紅葉（赤・橙・黄金）
          p.y += p.speedY * 1.05;
          p.x += Math.sin(p.angle) * 1.5;
          if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
          if (p.x > w + 10) p.x = -10;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.scale(Math.cos(p.flip), 1);
          const col = (p.size > 5.5) ? 'rgba(215, 60, 30,' : 'rgba(235, 160, 25,';
          ctx.fillStyle = `${col} ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 1.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (s === 3) {
          // 冬：雪
          const wind = isBlizzard ? 3.0 : 0.3;
          p.y += (isBlizzard ? p.speedY * 2.0 : p.speedY * 0.75);
          p.x += Math.sin(p.angle) * 0.7 + wind;
          if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
          if (p.x > w + 10) p.x = -10;

          ctx.save();
          ctx.beginPath();
          ctx.fillStyle = `rgba(240, 245, 255, ${p.opacity * 0.85})`;
          ctx.arc(p.x, p.y, isBlizzard ? p.size * 0.8 : p.size * 0.9, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      this._weatherAnimId = requestAnimationFrame(render);
    };

    this._weatherAnimId = requestAnimationFrame(render);

    if (!this._visibilityListenerBound) {
      this._visibilityListenerBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopSeasonAnimationLoop();
        } else {
          this.startSeasonAnimationLoop();
        }
      });
    }
  },

  stopSeasonAnimationLoop() {
    if (this._weatherAnimId) {
      cancelAnimationFrame(this._weatherAnimId);
      this._weatherAnimId = null;
    }
    if (this.seasonCanvas && this.seasonCtx) {
      this.seasonCtx.clearRect(0, 0, this.seasonCanvas.width, this.seasonCanvas.height);
    }
  },

  // ============================================================================
  // 歴史劇的動乱・重大決断イベント (IF展開システム)
  // ============================================================================,

};
