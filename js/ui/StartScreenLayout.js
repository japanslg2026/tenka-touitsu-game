// deploy47: 髑髏絵文字の代替 — 暗色の甲冑（兜）ピクトグラム。全画面共通ヘルパー
window.armorIconHTML = window.armorIconHTML || function (title) {
  return '<svg class="armor-icon" viewBox="0 0 24 24" role="img" aria-label="' + (title || '甲冑') + '"><path fill="#1a1a1a" stroke="#c9a54a" stroke-width="1" stroke-linejoin="round" d="M3 4.5 7.5 9 9 3h6l1.5 6L21 4.5 18.5 11H19c.6 0 1 .4 1 1v1.5c0 .6-.4 1-1 1h-1.2L16 20l-4 1.5L8 20l-1.8-5.5H5c-.6 0-1-.4-1-1V12c0-.6.4-1 1-1h.5Z"/><path fill="none" stroke="#c9a54a" stroke-width=".9" d="M8 13.5h8M9.5 16.5h5"/></svg>';
};
// 初期選択画面 フルウィンドウレイアウト
// 左: シナリオ一覧 / 中: 大名一覧 / 右上: シナリオ解説 / 右下: 勢力地図（大名選択と連動）
// 既存の DOM ノードを移動するだけなので、UIManager のイベント委譲・開始フローはそのまま動く。
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let built = false, svg = null, paths = {}, selected = null, passClick = false;

  const game = () => window.game || null;
  const scen = () => game()?.currentScenario || null;
  const owners = () => scen()?.owners || {};
  const playables = () => (game()?.currentScenario?.playables || []);
  function clanInfo(id) {
    const cm = window.CLAN_MASTER_DATA; const m = (cm && (cm.clans || cm)) || {};
    const p = [...document.querySelectorAll('#daimyoGrid .daimyo-card')].find(c => c.dataset.id === id);
    const pl = playables().find(x => x && x.id === id);
    return {
      color: pl?.color || m[id]?.color || hashColor(id),
      name: pl?.clan || m[id]?.family || m[id]?.name || id,
      leader: p ? p.querySelector('.daimyo-name-text')?.textContent : (pl?.name || ''),
      playable: !!p,
    };
  }
  function stripEraYears() {
    document.querySelectorAll('#scenarioEraTabs .era-tab-btn').forEach(b => {
      const t = b.textContent, n = t.replace(/\s*[（(][^）)]*[）)]\s*/g, '').trim();
      if (n !== t) { b.title = t; b.textContent = n; }
    });
  }
  const lcache = {};
  function lighten(c) { // 地図の国だけ明度を約+12%
    if (lcache[c]) return lcache[c];
    const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = '#000'; cv.fillStyle = c;
    const hx = cv.fillStyle; if (!/^#/.test(hx)) return (lcache[c] = c);
    let r = parseInt(hx.slice(1,3),16)/255, g = parseInt(hx.slice(3,5),16)/255, b = parseInt(hx.slice(5,7),16)/255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn; let h = 0, l = (mx+mn)/2; const sat = d ? d/(1-Math.abs(2*l-1)) : 0;
    if (d) { h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; h = (h*60+360)%360; }
    l = Math.min(l + 0.12, 0.72);
    return (lcache[c] = `hsl(${h.toFixed(0)},${(Math.min(sat,1)*100).toFixed(0)}%,${(l*100).toFixed(0)}%)`);
  }
  function addTroops(own) {
    const tot = {}; (game()?.provinces || []).forEach(p => { const o = own[p.id]; if (o) tot[o] = (tot[o] || 0) + (Number(p.troops) || 0); });
    document.querySelectorAll('#daimyoGrid .daimyo-card').forEach(c => {
      const st = c.querySelector('.daimyo-card-stats'); if (!st) return;
      let sp = st.querySelector('.sl-troops'); if (!sp) { sp = document.createElement('span'); sp.className = 'sl-troops'; } if (st.firstElementChild !== sp) st.prepend(sp);
      const t = (tot[c.dataset.id] || 0).toLocaleString('ja-JP'); if (sp.dataset.t !== t) { sp.dataset.t = t; sp.innerHTML = IS_PHONE ? `<i class="sl-ic" aria-hidden="true">⚔️</i><strong>${t}</strong>` : `兵<strong>${t}</strong>`; sp.title = `兵力 ${t}`; }
    });
  }
  const clanMaster = (id) => { const cm = window.CLAN_MASTER_DATA; return ((cm && (cm.clans || cm)) || {})[id] || null; };
  function addTactics() { // 大名カード右側に固有戦法
    document.querySelectorAll('#daimyoGrid .daimyo-card').forEach(c => {
      const m = clanMaster(c.dataset.id); let t = c.querySelector('.sl-tactic');
      if (!m?.tactic) { t?.remove(); return; }
      if (!t) { t = document.createElement('span'); t.className = 'sl-tactic'; c.appendChild(t); }
      if (t.dataset.t !== m.tactic) { t.dataset.t = m.tactic; t.innerHTML = `<small>固有戦法</small><b>${esc(m.tactic)}</b>`; t.title = `${m.tactic}：${m.tacticDesc || ''}`; }
    });
  }
  const vcache = {};
  function vivid(c) {
    if (vcache[c]) return vcache[c];
    const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = '#000'; cv.fillStyle = c;
    let hx = cv.fillStyle; if (!/^#/.test(hx)) return (vcache[c] = c);
    let r = parseInt(hx.slice(1,3),16)/255, g = parseInt(hx.slice(3,5),16)/255, b = parseInt(hx.slice(5,7),16)/255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx - mn; let h = 0, l = (mx+mn)/2, sat = d ? d/(1-Math.abs(2*l-1)) : 0;
    if (d) { h = mx===r ? ((g-b)/d)%6 : mx===g ? (b-r)/d+2 : (r-g)/d+4; h = (h*60+360)%360; }
    sat = d ? Math.max(sat, 0.68) : 0.1; l = Math.min(Math.max(l, 0.52), 0.66);
    return (vcache[c] = `hsl(${h.toFixed(0)},${(sat*100).toFixed(0)}%,${(l*100).toFixed(0)}%)`);
  }
  function hashColor(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return `hsl(${h % 360},38%,42%)`; }
  const provName = (id) => (window.PROVINCES_DATA || []).find(p => p.id === id)?.name || id;

  const IS_PHONE = !!window.SENGOKU_IS_PHONE;
  const ERA_ICON = { all: '🗾', ancient: '⛩️', medieval: '🏹', sengoku_early: '🔥', sengoku_climax: '⚔️', unification: '🏯', edo_bakumatsu: '⛵', virtual: '🎲' };
  const ERA_SHORT = { all: 'すべて', ancient: '古代', medieval: '中世', sengoku_early: '黎明', sengoku_climax: '乱世', unification: '統一', edo_bakumatsu: '幕末', virtual: '仮想' };
  const DIFF_ICON = { easy: '🌱', normal: '⚖️', hard: '🔥', hell: '' }; // deploy47: 髑髏→甲冑SVG（下の armorIconHTML）
  let setStep = () => {};
  function buildPhone(root) { // スマホ: ステップ切替 + 下部固定バー
    root.classList.add('sl-m'); root.dataset.step = '1';
    const ttl = document.querySelector('#startModal .start-game-title'); if (ttl) ttl.childNodes.forEach(nd => { if (nd.nodeType === 3) nd.textContent = nd.textContent.replace(/\s*❖\s*/g, ''); });
    const steps = document.createElement('nav'); steps.className = 'sl-steps'; steps.setAttribute('role', 'tablist');
    steps.innerHTML = [['1', '📜', 'シナリオ'], ['2', '🏯', '大名'], ['3', '🗾', '勢力図']].map(([n, ic, l]) =>
      `<button type="button" role="tab" class="sl-step" data-step="${n}" aria-label="${l}"><i>${ic}</i><span>${l}</span></button>`).join('');
    root.before(steps);
    const bar = document.createElement('div'); bar.className = 'sl-mbar';
    bar.innerHTML = `<div class="sl-mbar-sel"><i class="sl-dot"></i><span class="sl-mbar-txt">大名を選択</span></div><button type="button" class="sl-mbar-go" id="slMobileGo" aria-label="この大名で出陣">⚔ 出陣</button>`;
    root.after(bar);
    setStep = (n) => { root.dataset.step = String(n); steps.querySelectorAll('.sl-step').forEach(b => { const on = b.dataset.step === String(n); b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      if (String(n) === '3') requestAnimationFrame(() => $('.sl-map-body svg')?.dispatchEvent(new Event('sl-fit'))); };
    steps.addEventListener('click', (e) => { const b = e.target.closest('.sl-step'); if (b) setStep(b.dataset.step); });
    bar.querySelector('.sl-mbar-sel').addEventListener('click', () => setStep(2));
    bar.querySelector('.sl-mbar-go').addEventListener('click', () => $('#slStartBtn')?.click());
    // シナリオを選んだら大名ステップへ
    $('.sl-scen-body', root).addEventListener('click', (e) => { if (e.target.closest('.scenario-btn')) setTimeout(() => setStep(2), 120); });
    // 年代タブ・難易度をピクトグラム化
    document.querySelectorAll('#scenarioEraTabs .era-tab-btn').forEach(b => { const k = b.dataset.era; if (!ERA_ICON[k]) return; b.title = b.title || b.textContent.trim(); b.setAttribute('aria-label', b.title); b.innerHTML = `<i>${ERA_ICON[k]}</i><span>${ERA_SHORT[k]}</span>`; });
    document.querySelectorAll('.diff-option-btn').forEach(b => { const ic = DIFF_ICON[b.dataset.diff] || (b.dataset.diff === 'hell' ? 'ARMOR' : ''); const n = b.querySelector('.diff-btn-name'); if (ic && n && !b.querySelector('.sl-dicon')) { const s = document.createElement('i'); s.className = 'sl-dicon'; if (ic === 'ARMOR') s.innerHTML = window.armorIconHTML(); else s.textContent = ic; b.prepend(s); n.textContent = n.textContent.replace(/[【】]/g, '').replace(/級$/, ''); } });
    const lore = $('.sl-map-lore', root), dh = $('.sl-desc .sl-head', root); if (lore && dh) dh.after(lore); // スマホ: 戦法・家伝は解説カードへ
    setStep(1);
  }
  const troopsOf = (card) => card?.querySelector('.sl-troops')?.dataset.t ?? null; // 大名カードと同じ兵力表示
  function updatePhoneBar(id, n) {
    const t = $('.sl-mbar-txt'); if (!t) return; const d = $('.sl-mbar .sl-dot');
    if (!id) { t.textContent = '大名を選択'; if (d) d.style.background = 'transparent'; return; }
    const ci = clanInfo(id); const tr = troopsOf([...document.querySelectorAll('#daimyoGrid .daimyo-card')].find(c => c.dataset.id === id)); t.innerHTML = `<b>${esc(ci.leader || ci.name)}</b> <i class="sl-ic" aria-hidden="true">🏯</i>${n}${tr != null ? ` <i class="sl-ic" aria-hidden="true">⚔️</i>${tr}` : ''}`; t.title = `${ci.leader || ci.name}・支配${n}国${tr != null ? '・兵力' + tr : ''}`; if (d) d.style.background = ci.color;
  }

  function build() {
    const modal = $('#startModal'); const card = modal && $('.modal-card', modal);
    const grid = $('#daimyoGrid'); const scenWrap = $('.scenario-selector-container'); const desc = $('#scenarioDescBox');
    if (!card || !grid || !scenWrap || !desc || built || !(window.PROVINCES_DATA || []).length || !window.game) return false;
    built = true;
    modal.classList.add('sl-active'); document.body.classList.add('sl-start-open');
    card.removeAttribute('style');
    const tabs = $('#scenarioEraTabs'); const diff = $('.diff-selector-wrapper', card);
    const badge = $('#selectedDaimyoBadge'); const title = $('.start-game-title', card);
    const root = document.createElement('div'); root.className = 'sl-root';
    root.innerHTML = `
      <section class="sl-panel sl-scen"><div class="sl-head"><span>歴史シナリオ</span><small class="sl-count-scen"></small></div><div class="sl-body sl-scen-body"></div></section>
      <section class="sl-panel sl-daimyo"><div class="sl-diff"></div><div class="sl-head"><span>大名家</span><small class="sl-count-daimyo"></small></div><div class="sl-body sl-daimyo-body"></div>
        <div class="sl-foot"><button type="button" class="sl-start-btn" id="slStartBtn">この大名で出陣</button></div></section>
      <section class="sl-panel sl-desc"><div class="sl-head"><span>シナリオ解説</span></div><div class="sl-body sl-desc-body"></div></section>
      <section class="sl-panel sl-map"><div class="sl-head"><span>勢力図</span><small class="sl-map-info">地図の国をクリックすると、その国を治める大名を選択します</small></div><div class="sl-map-lore" hidden></div><div class="sl-body sl-map-body"></div></section>`;
    // 並べ替え: タイトル行は残し、その下にグリッド
    [...card.children].forEach(ch => { if (!ch.classList.contains('start-header-actions') && ch !== title) ch.classList.add('sl-hidden-legacy'); });
    card.appendChild(root);
    if (tabs) $('.sl-scen-body', root).before(tabs);
    $('.sl-scen-body', root).appendChild(scenWrap);
    $('.sl-daimyo-body', root).appendChild(grid);
    if (badge) $('.sl-daimyo .sl-head', root).after(badge);
    if (diff) $('.sl-diff', root).appendChild(diff);
    $('.sl-desc-body', root).appendChild(desc);
    buildMap($('.sl-map-body', root));
    document.querySelectorAll('.diff-option-btn .diff-btn-name').forEach(n => { n.textContent = n.textContent.replace(/[【】]/g, ''); });
    if (IS_PHONE) buildPhone(root);

    // 大名リスト: 1回目のクリックは選択＋地図ハイライト、選択済みを再クリック（または出陣ボタン）で従来の詳細ダイアログ
    grid.addEventListener('click', (e) => {
      const c = e.target.closest('.daimyo-card'); if (!c || passClick) return;
      if (!c.classList.contains('selected') || selected !== c.dataset.id) { e.stopImmediatePropagation(); selectClan(c.dataset.id, { scroll: false }); }
    }, true);
    $('#slStartBtn').addEventListener('click', () => {
      const c = $('#daimyoGrid .daimyo-card.selected') || $('#daimyoGrid .daimyo-card'); if (!c) return;
      passClick = true; try { c.click(); } finally { passClick = false; }
    });
    new MutationObserver(() => queueRefresh()).observe(grid, { childList: true });
    new MutationObserver(() => queueRefresh()).observe(desc, { childList: true });
    queueRefresh();
    return true;
  }

  function buildMap(el) {
    svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'sl-svgmap');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const provs = window.PROVINCES_DATA || [];
    svg.innerHTML = `<g class="sl-provs">${provs.map(p => `<path class="sl-prov" data-p="${esc(p.id)}" d="${esc(p.svgPath || p.d || '')}"><title>${esc(p.name)}</title></path>`).join('')}</g>`;
    el.appendChild(svg);
    paths = Object.fromEntries([...svg.querySelectorAll('path')].map(p => [p.dataset.p, p]));
    const fit = () => { try { const b = svg.querySelector('g').getBBox(); if (b.width) svg.setAttribute('viewBox', `${b.x - 6} ${b.y - 6} ${b.width + 12} ${b.height + 12}`); } catch (_) {} };
    fit(); if (!svg.getAttribute('viewBox')) { svg.setAttribute('viewBox', '0 0 1000 620'); requestAnimationFrame(fit); }
    const tip = document.createElement('div'); tip.className = 'sl-tip'; el.appendChild(tip);
    svg.addEventListener('mousemove', (e) => {
      const p = e.target.closest('.sl-prov'); if (!p) { tip.style.opacity = 0; return; }
      const o = owners()[p.dataset.p]; const ci = o ? clanInfo(o) : null;
      tip.innerHTML = `<b>${esc(provName(p.dataset.p))}</b>${ci ? `<span><i style="background:${ci.color}"></i>${esc(ci.name)}${ci.leader ? '・' + esc(ci.leader) : ''}${ci.playable ? '' : '（選択不可）'}</span>` : '<span>空白地</span>'}`;
      const r = el.getBoundingClientRect(); tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 10) + 'px'; tip.style.opacity = 1;
    });
    svg.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
    // ===== ホイール拡大縮小・ドラッグ移動（viewBox 操作） =====
    let base = null, vb = null, drag = null, dragged = false;
    const getVB = () => svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const setVB = (v) => { vb = v; svg.setAttribute('viewBox', v.map(n => n.toFixed(2)).join(' ')); };
    const ensure = () => { if (!base) { base = getVB(); vb = base.slice(); } };
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); const sc = Math.max(vb[2] / r.width, vb[3] / r.height);
      const ox = (r.width - vb[2] / sc) / 2, oy = (r.height - vb[3] / sc) / 2; return [vb[0] + (cx - r.left - ox) * sc, vb[1] + (cy - r.top - oy) * sc, sc]; };
    const clampVB = (v) => { const [bx, by, bw, bh] = base; const w = v[2], h = v[3];
      const mx = bw * 0.25, my = bh * 0.25; let x = Math.min(Math.max(v[0], bx - mx), bx + bw + mx - w); let y = Math.min(Math.max(v[1], by - my), by + bh + my - h);
      if (w >= bw) x = bx + (bw - w) / 2; if (h >= bh) y = by + (bh - h) / 2; return [x, y, w, h]; };
    svg.addEventListener('wheel', (e) => {
      e.preventDefault(); ensure();
      const k = Math.exp(Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0018);
      const z = Math.min(Math.max(base[2] / (vb[2] * k), 1), 8); const w = base[2] / z, h = base[3] / z; // 1x〜8x
      const [px, py] = toSvg(e.clientX, e.clientY); const fx = (px - vb[0]) / vb[2], fy = (py - vb[1]) / vb[3];
      setVB(clampVB([px - fx * w, py - fy * h, w, h])); resetBtn.hidden = z <= 1.001;
    }, { passive: false });
    const ptrs = new Map(); let pinch = null;
    const zoomTo = (z, cx, cy, from) => { const w = base[2] / z, h = base[3] / z; vb = from.slice(); const [px, py] = toSvg(cx, cy);
      const fx = (px - from[0]) / from[2], fy = (py - from[1]) / from[3]; setVB(clampVB([px - fx * w, py - fy * h, w, h])); resetBtn.hidden = z <= 1.001; };
    svg.addEventListener('sl-fit', () => { if (base) { setVB(base.slice()); resetBtn.hidden = true; } });
    svg.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; ensure(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: base[2] / vb[2], v: vb.slice() }; drag = null; dragged = true; return; }
      if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, v: vb.slice(), id: e.pointerId }; dragged = false; }
    });
    window.addEventListener('pointermove', (e) => {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        const z = Math.min(Math.max(pinch.z * d / pinch.d, 1), 8); zoomTo(z, (a.x + b.x) / 2, (a.y + b.y) / 2, pinch.v); pinch.v = vb.slice(); pinch.z = z; pinch.d = d; return; }
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!dragged && Math.hypot(dx, dy) < 5) return;
      if (!dragged) { dragged = true; svg.classList.add('sl-dragging'); try { svg.setPointerCapture(drag.id); } catch (_) {} }
      const r = svg.getBoundingClientRect(); const sc = Math.max(drag.v[2] / r.width, drag.v[3] / r.height);
      setVB(clampVB([drag.v[0] - dx * sc, drag.v[1] - dy * sc, drag.v[2], drag.v[3]])); tip.style.opacity = 0;
    });
    const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size === 0 && drag) { drag = null; svg.classList.remove('sl-dragging'); } };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    const resetBtn = document.createElement('button'); resetBtn.type = 'button'; resetBtn.className = 'sl-map-reset'; resetBtn.textContent = '全体表示'; resetBtn.title = '地図の拡大・移動をリセット'; resetBtn.hidden = true;
    resetBtn.addEventListener('click', (e) => { e.stopPropagation(); if (base) setVB(base.slice()); resetBtn.hidden = true; });
    el.appendChild(resetBtn);
    svg.addEventListener('click', (e) => {
      if (dragged) { dragged = false; e.stopPropagation(); return; } // ドラッグ後のクリックは選択しない
      const p = e.target.closest('.sl-prov'); if (!p) return;
      const o = owners()[p.dataset.p]; const info = $('.sl-map-info');
      if (!o) { info.classList.remove('sl-sel-badge'); info.textContent = `${provName(p.dataset.p)}: 支配勢力なし`; return; }
      const ci = clanInfo(o);
      if (!ci.playable) { info.classList.remove('sl-sel-badge'); info.textContent = `${provName(p.dataset.p)}: ${ci.name}（このシナリオでは選択できません）`; return; }
      selectClan(o, { scroll: true });
    });
  }

  let rq = 0;
  function queueRefresh() { cancelAnimationFrame(rq); rq = requestAnimationFrame(refresh); }
  function refresh() {
    if (!svg) return;
    const own = owners();
    for (const [pid, p] of Object.entries(paths)) {
      const o = own[pid];
      p.style.fill = o ? lighten(clanInfo(o).color) : '#3a3631';
      p.dataset.owner = o || '';
    }
    stripEraYears(); addTroops(own);
    const cards = document.querySelectorAll('#daimyoGrid .daimyo-card');
    const s = $('.sl-count-daimyo'); if (s) s.textContent = `${cards.length}家`;
    const ns = document.querySelectorAll('.scenario-btn').length; const sc = $('.sl-count-scen'); if (sc) sc.textContent = `${ns}`;
    $('.scenario-btn.selected')?.scrollIntoView({ block: 'nearest' });
    const sel = $('#daimyoGrid .daimyo-card.selected');
    selectClan(sel ? sel.dataset.id : null, { scroll: false, silent: true });
  }

  function selectClan(id, { scroll = false, silent = false } = {}) {
    selected = id;
    document.querySelectorAll('#daimyoGrid .daimyo-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
    const card = id && [...document.querySelectorAll('#daimyoGrid .daimyo-card')].find(c => c.dataset.id === id);
    if (card && scroll) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    svg?.classList.toggle('has-sel', !!id);
    let n = 0;
    for (const p of Object.values(paths)) { const on = !!id && p.dataset.owner === id; p.classList.toggle('sel', on); if (on) { n++; p.parentNode.appendChild(p); } }
    const info = $('.sl-map-info');
    if (info && id) { const ci = clanInfo(id); const kid = document.getElementById('kamon-' + id) ? 'kamon-' + id : '';
      info.classList.add('sl-sel-badge'); info.style.setProperty('--sl-clan', ci.color);
      info.innerHTML = `${kid ? `<svg class="sl-sel-kamon" viewBox="0 0 32 32" aria-hidden="true"><use href="#${kid}"></use></svg>` : `<i class="sl-dot sl-sel-dot" style="background:${ci.color}"></i>`}<span class="sl-sel-lbl">選択中</span><b class="sl-sel-name">${esc(ci.leader || ci.name)}</b>${ci.leader ? `<span class="sl-sel-clan">${esc(ci.name)}</span>` : ''}${IS_PHONE ? `<span class="sl-sel-n" title="支配 ${n} 国"><i class="sl-ic" aria-hidden="true">🏯</i>${n}</span>` : `<span class="sl-sel-n">支配 ${n} 国</span>`}${troopsOf(card) != null ? (IS_PHONE ? `<span class="sl-sel-t" title="兵力 ${troopsOf(card)}"><i class="sl-ic" aria-hidden="true">⚔️</i>${troopsOf(card)}</span>` : `<span class="sl-sel-t">兵 ${troopsOf(card)}</span>`) : ''}`; }
    else if (info) { info.classList.remove('sl-sel-badge'); }
    const lore = $('.sl-map-lore');
    if (lore) { const m = id && clanMaster(id); if (m?.desc || m?.tactic) { lore.hidden = false; lore.removeAttribute('title');
        const tac = m.tactic ? `<div class="sl-tac" title="${esc(m.tactic + (m.tacticDesc ? '：' + m.tacticDesc : ''))}"><b>⚔ ${esc(m.tactic)}</b>${m.tacticDesc ? ' — ' + esc(m.tacticDesc) : ''}</div>` : '';
        lore.innerHTML = tac + (m.desc ? `<div class="sl-lore-txt" title="${esc(m.desc)}"><b>家伝</b>${esc(m.desc)}</div>` : ''); } else { lore.hidden = true; lore.textContent = ''; } }
    if (IS_PHONE) updatePhoneBar(id, n);
    const badge = $('#selectedDaimyoBadge'); if (badge && card) badge.textContent = `選択中: ${clanInfo(id).leader}（${clanInfo(id).name}・${n}国）`;
    if (!silent) { try { game()?.audio?.playHyoshigi?.(); } catch (_) {} }
  }

  if (IS_PHONE) { // スマホ: 上部ボタンはアイコンのみ（文字は aria-label/title に残す）
    const ic = () => document.querySelectorAll('.start-header-actions button').forEach(b => { const t = b.querySelector('.opening-btn-text'); if (t && !b.getAttribute('aria-label')) b.setAttribute('aria-label', t.textContent.trim()); if (t && !b.title) b.title = t.textContent.trim(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ic); else ic();
  }
  const reveal = () => document.documentElement.classList.add('sl-ready');
  function tryBuild(n = 0) { if (build()) reveal(); else if (n < 200) setTimeout(() => tryBuild(n + 1), 25); else document.documentElement.classList.remove('sl-desktop'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => tryBuild()); else tryBuild();
  // 開始モーダルが閉じたらページスクロール制御を解除
  setInterval(() => { const m = $('#startModal'); if (m) document.body.classList.toggle('sl-start-open', !m.classList.contains('hidden') && getComputedStyle(m).display !== 'none'); }, 500);
  window.SengokuStartLayout = { selectClan, refresh: queueRefresh, get selected() { return selected; } };
})();
