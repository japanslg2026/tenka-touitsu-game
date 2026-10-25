/**
 * 武将名鑑・大名名鑑 (Officer / Clan Encyclopedia)
 * 初期選択画面の「武将名鑑」「大名名鑑」ボタンから開く独立モジュール。
 * データは window グローバル（DataLoader が同期）を優先し、無ければ data/*.json を直接取得する。
 */
const ERAS = [
  { key: 'ancient',   label: '古代',     from: -9999, to: 793 },
  { key: 'heian',     label: '平安',     from: 794,  to: 1179 },
  { key: 'gempei',    label: '源平',     from: 1180, to: 1191 },
  { key: 'kamakura',  label: '鎌倉',     from: 1192, to: 1332 },
  { key: 'nanboku',   label: '南北朝',   from: 1333, to: 1391 },
  { key: 'muromachi', label: '室町',     from: 1392, to: 1466 },
  { key: 'sengoku',   label: '戦国・安土桃山', from: 1467, to: 1602 },
  { key: 'edo',       label: '江戸',     from: 1603, to: 1852 },
  { key: 'bakumatsu', label: '幕末・明治', from: 1853, to: 9999 },
  { key: 'gendai',    label: '現代',     from: 99999, to: 99999, officerOnly: true }, // 生年1890年以降の武将のみ
];
const GENDAI_BIRTH = 1890;
const ERA_ALIAS = { nanbokucho: 'nanboku', azuchi: 'sengoku', azuchimomoyama: 'sengoku', azuchi_momoyama: 'sengoku', edo_early: 'edo', edo_mid: 'edo', edo_late: 'edo', meiji: 'bakumatsu' };
const eraOfYear = (y) => (ERAS.find(e => y >= e.from && y <= e.to) || ERAS[ERAS.length - 1]).key;
const eraLabel = (k) => (ERAS.find(e => e.key === k) || {}).label || '不詳';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtYear = (y) => (y == null || y === '' || isNaN(y)) ? '?' : (y < 0 ? `前${-y}` : `${y}`);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const kata2hira = (s) => String(s || '').replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));

let DB = null;
async function loadDB() {
  if (DB) return DB;
  const w = window;
  const get = async (f) => (await fetch(`data/${f}?v=meikan`)).json();
  let officers = w.OFFICERS_MASTER, scenarios = w.SCENARIOS_DATA, provinces = w.PROVINCES_DATA, clansRaw = null;
  const clans = w.CLAN_MASTER_DATA || w.CLAN_MASTER;
  const [o, s, p, c] = await Promise.all([
    officers?.length ? officers : get('officers.json'),
    scenarios?.length ? scenarios : get('scenarios.json'),
    provinces?.length ? provinces : get('provinces.json'),
    clans && Object.keys(clans).length ? { clans } : get('clans.json'),
  ]);
  officers = o; scenarios = [...s].filter(x => !isAllstar(x)).sort((a, b) => (+a.year) - (+b.year)); provinces = p; clansRaw = c.clans || c;
  const provName = Object.fromEntries(provinces.map(x => [x.id, x.name]));
  // 城主判定（GameState.newGame の初期城主任命と同じ順序：①本拠に当主 ②governors.json の史実城代 ③ゆかりの国(defaultProv)の一般武将）
  let govAll = w.SCENARIO_HISTORICAL_GOVERNORS;
  if (!govAll) { try { govAll = (await (await fetch('data/governors.json?v=meikan')).json()).governors || {}; } catch (_) { govAll = {}; } }
  const capBase = w.CLAN_CAPITAL_PROVINCES_BASE || w.CLAN_CAPITAL_PROVINCES || {};
  const provCastle = Object.fromEntries(provinces.map(x => [x.id, x.castle]));
  const lordOf = new Map(); // `${scId}|${oid}` -> provId
  for (const sc of scenarios) {
    const aff = sc.officerAffiliations || {}, owners = sc.owners || {}, caps = sc.capitals || {};
    const ownedBy = {}; for (const [pid, cid] of Object.entries(owners)) if (cid) (ownedBy[cid] ||= []).push(pid);
    const capOf = {};
    for (const [cid, list] of Object.entries(ownedBy)) {
      const cand = [caps[cid], capBase[cid]].find(x => x && list.includes(x));
      const dm = Object.entries(aff).find(([, a]) => a.clanId === cid && a.isDaimyo);
      capOf[cid] = cand || (dm && list.includes(dm[1].defaultProv) ? dm[1].defaultProv : (list.length === 1 ? list[0] : null));
    }
    const gov = {}, used = new Set();
    const set = (pid, oid) => { gov[pid] = oid; used.add(oid); lordOf.set(`${sc.id}|${oid}`, pid); };
    for (const [cid, pid] of Object.entries(capOf)) {
      if (!pid) continue;
      const dm = Object.entries(aff).find(([oid, a]) => a.clanId === cid && a.isDaimyo && !used.has(oid));
      if (dm) set(pid, dm[0]);
    }
    const hist = govAll[String(sc.id)] || {};
    for (const [pid, cid] of Object.entries(owners)) {
      if (!cid || gov[pid] || capOf[cid] === pid || !hist[pid]) continue;
      const t = hist[pid];
      const oid = aff[t] ? t : (Object.keys(aff).find(k => k === t) || (officers.find(x => x.id === t || x.name === t) || {}).id);
      if (oid && !used.has(oid) && !(aff[oid]?.isDaimyo && aff[oid]?.clanId !== cid)) set(pid, oid);
    }
    const histIds = new Set(Object.values(hist));
    for (const [pid, cid] of Object.entries(owners)) {
      if (!cid || gov[pid] || capOf[cid] === pid) continue;
      const m = Object.entries(aff).find(([oid, a]) => a.defaultProv === pid && a.clanId === cid && !a.isDaimyo && !used.has(oid)
        && !(oid.startsWith('off_jd_') && !histIds.has(oid)) && !oid.startsWith('off_onin2_') && oid !== 'off_dm_amago_1560');
      if (m) set(pid, m[0]);
    }
  }
  const lordCastle = (sc, oid) => { const pid = lordOf.get(`${sc.id}|${oid}`); return pid ? ((sc.castles || {})[pid] || provCastle[pid] || '城') : null; };
  const provRegion = Object.fromEntries(provinces.map(x => [x.id, x.region]));
  // 武将ごとのシナリオ登場情報
  const appear = new Map();
  const clanScen = new Map(); // clanId -> [{sc, provs[]}]
  const masterById = new Map(officers.map(m => [m.id, m]));
  const provAtYear = w.officerProvAtYear || (() => '');
  for (const sc of scenarios) {
    const aff = sc.officerAffiliations || {};
    for (const [oid, a] of Object.entries(aff)) {
      if (!appear.has(oid)) appear.set(oid, []);
      // シナリオ配属に defaultProv が無い場合は、ゲーム本体と同じく武将データ（その年の所領→defaultProv）で補う
      const m = masterById.get(oid);
      const prov = a.defaultProv || (m && (provAtYear(m, +sc.year) || m.defaultProv)) || '';
      appear.get(oid).push({ sc, oid, clanId: a.clanId, prov, isDaimyo: a.isDaimyo });
    }
    const byClan = {};
    for (const [pid, cid] of Object.entries(sc.owners || {})) (byClan[cid] ||= []).push(pid);
    for (const [cid, provs] of Object.entries(byClan)) {
      if (!provs.length) continue;
      if (!clanScen.has(cid)) clanScen.set(cid, []);
      clanScen.get(cid).push({ sc, provs });
    }
  }
  const clanName = (id) => clansRaw[id]?.family || id || '浪人';
  const offs = officers.map(x => {
    const ap = appear.get(x.id) || [];
    const era = (x.birthYear != null && x.birthYear >= GENDAI_BIRTH) ? 'gendai' : ERA_ALIAS[x.era] || (ERAS.some(e => e.key === x.era) ? x.era : null)
      || (x.birthYear != null ? eraOfYear(x.deathYear != null ? Math.round((x.birthYear + x.deathYear) / 2) : x.birthYear + 30) : (ap[0] ? eraOfYear(+ap[0].sc.year) : null));
    const clanSet = new Set([x.clanId, ...ap.map(a => a.clanId)].filter(Boolean));
    const provSet = new Set([x.defaultProv, x.assignedProvId, ...ap.map(a => a.prov)].filter(Boolean));
    return { o: x, era, ap, clanSet, provSet, scSet: new Set(ap.map(a => a.sc.id)),
      key: String(x.name || '').toLowerCase(),
      total: (x.military || 0) + (x.intel || 0) + (x.politic || 0) };
  });
  const clanList = Object.entries(clansRaw).map(([id, c]) => {
    const sc = (clanScen.get(id) || []).sort((a, b) => (+a.sc.year) - (+b.sc.year));
    const eras = new Set(sc.map(s => eraOfYear(+s.sc.year)));
    const regions = new Set(sc.flatMap(s => s.provs.map(p => provRegion[p])));
    const provSet = new Set(sc.flatMap(s => s.provs));
    const maxProv = sc.reduce((m, s) => Math.max(m, s.provs.length), 0);
    return { id, c, sc, eras, regions, provSet, maxProv, key: (c.family + ' ' + id + ' ' + Object.values(c.leaders || {}).join(' ')).toLowerCase() };
  });
  // 武将0名の大名家は名鑑から除外（UIのみ）
  const offCnt = new Map();
  offs.forEach(r => r.clanSet.forEach(c => offCnt.set(c, (offCnt.get(c) || 0) + 1)));
  clanList.forEach(c => c.offCount = offCnt.get(c.id) || 0);
  const clanListShown = clanList.filter(c => c.offCount > 0);
  const hiddenClans = clanList.length - clanListShown.length;
  DB = { officers: offs, scenarios, provinces, clans: clansRaw, clanList: clanListShown, hiddenClans, provName, provRegion, clanName, lordCastle, regions: [...new Set(provinces.map(p => p.region))] };
  return DB;
}

function kamonHTML(clanId, size = 40) {
  const c = DB?.clans[clanId];
  const color = c?.color || '#555';
  const ids = [c?.kamon, `kamon-${clanId}`].filter(Boolean);
  const found = ids.find(id => document.getElementById(id));
  if (found) return `<svg class="mk-kamon" width="${size}" height="${size}" viewBox="0 0 32 32"><use href="#${found}"/></svg>`;
  const ch = (c?.family || '?').charAt(0);
  return `<span class="mk-kamon mk-kamon-fb" style="width:${size}px;height:${size}px;background:${color};font-size:${size * 0.5}px">${esc(ch)}</span>`;
}

/* 本拠ワンポイント地図（全国を薄く描き、本拠の国を光らせる） */
let MINI = null;
function miniMapHTML(pid) {
  if (!pid || !DB.provName[pid]) return '';
  if (!MINI) {
    const NS = 'http://www.w3.org/2000/svg', t = document.createElementNS(NS, 'svg');
    t.setAttribute('style', 'position:absolute;left:-9999px;top:0;width:400px;height:300px');
    t.innerHTML = DB.provinces.map(p => `<path d="${esc(p.d || p.svgPath || '')}"/>`).join('');
    document.body.appendChild(t);
    let vb = '0 0 1000 620'; try { const b = t.getBBox(); vb = `${b.x - 6} ${b.y - 6} ${b.width + 12} ${b.height + 12}`; } catch (_) {}
    t.remove();
    MINI = { vb, d: Object.fromEntries(DB.provinces.map(p => [p.id, p.d || p.svgPath || ''])) };
  }
  const base = Object.entries(MINI.d).filter(([id]) => id !== pid).map(([, d]) => `<path d="${esc(d)}"/>`).join('');
  return `<div class="mk-minimap" title="本拠：${esc(DB.provName[pid])}"><svg viewBox="${MINI.vb}" preserveAspectRatio="xMidYMid meet"><g class="mk-mm-base">${base}</g><path class="mk-mm-hi" d="${esc(MINI.d[pid])}"/></svg></div>`;
}

/* ===================== 共通モーダル枠 ===================== */
let overlay = null, current = null;
function openShell(kind) {
  closeShell();
  overlay = document.createElement('div');
  overlay.className = 'mk-overlay';
  overlay.innerHTML = `
  <div class="mk-card" role="dialog" aria-modal="true">
    <div class="mk-head">
      <div class="mk-title"><span class="mk-title-icon">${kind === 'officer' ? '📜' : '🏯'}</span>
        <span>${kind === 'officer' ? '武将名鑑' : '大名名鑑'}</span>
        <small>${kind === 'officer' ? '— 古今の英傑列伝 —' : '— 群雄割拠・支配域の変遷 —'}</small></div>
      <div class="mk-tabs">
        <button type="button" class="mk-tab ${kind === 'officer' ? 'on' : ''}" data-k="officer">武将名鑑</button>
        <button type="button" class="mk-tab ${kind === 'clan' ? 'on' : ''}" data-k="clan">大名名鑑</button>
      </div>
      <button type="button" class="mk-back" aria-label="一覧へ戻る">◀ 一覧</button>
      <button type="button" class="mk-close" title="閉じる (Esc)">✕</button>
    </div>
    <div class="mk-body"><div class="mk-loading">名鑑を紐解いております…</div></div>
  </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeShell(); });
  overlay.querySelector('.mk-close').onclick = closeShell;
  overlay.querySelector('.mk-back').onclick = () => { const b = overlay.querySelector('.mk-body'); if (current && current.stop) current.stop(); showDetail(b, false); };
  overlay.querySelectorAll('.mk-tab').forEach(b => b.onclick = () => { if (b.dataset.k !== kind) open(b.dataset.k); });
  return overlay.querySelector('.mk-body');
}
function closeShell() {
  if (current?.destroy) current.destroy();
  current = null;
  if (overlay) { const o = overlay; overlay = null; o.classList.remove('show'); setTimeout(() => o.remove(), 200); }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay) { e.stopPropagation(); closeShell(); } }, true);

async function open(kind) {
  const body = openShell(kind);
  try {
    await loadDB();
  } catch (err) { body.innerHTML = `<div class="mk-loading">読込に失敗しました: ${esc(err.message)}</div>`; return; }
  if (!overlay) return;
  current = kind === 'officer' ? new OfficerView(body) : new ClanView(body);
}

/* ===================== 仮想リスト ===================== */
class VList {
  constructor(el, rowH, renderRow, onPick) {
    this.el = el; this.rowH = rowH; this.renderRow = renderRow; this.onPick = onPick; this.items = []; this.sel = null;
    el.innerHTML = '<div class="mk-vspace"></div><div class="mk-vrows"></div>';
    this.space = el.firstChild; this.rows = el.lastChild;
    el.addEventListener('scroll', () => this.draw(), { passive: true });
    this.rows.addEventListener('click', e => { const r = e.target.closest('[data-i]'); if (r) this.onPick(this.items[+r.dataset.i], +r.dataset.i); });
    this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(el);
  }
  set(items) { this.items = items; this.space.style.height = items.length * this.rowH + 'px'; this.el.scrollTop = 0; this.draw(); }
  draw() {
    const st = this.el.scrollTop, h = this.el.clientHeight || 600;
    const a = Math.max(0, Math.floor(st / this.rowH) - 6), b = Math.min(this.items.length, Math.ceil((st + h) / this.rowH) + 6);
    let html = '';
    for (let i = a; i < b; i++) html += `<div class="mk-row ${this.items[i] === this.sel ? 'sel' : ''}" data-i="${i}" style="top:${i * this.rowH}px;height:${this.rowH - 6}px">${this.renderRow(this.items[i])}</div>`;
    this.rows.innerHTML = html;
  }
  destroy() { this.ro.disconnect(); }
}

// オールスター（仮想・全領国群雄割拠）シナリオは名鑑の集計・地図・登場一覧の対象外
const isAllstar = (sc) => /^allstar/i.test(String(sc && sc.id || '')) || /オールスター/.test(String(sc && sc.name || ''));
const SORT_IC = { year: '⏳', total: 'Σ', military: '⚔', politic: '🌾', intel: '📜', max: '🗾', offs: '👥', count: '🎬', name: 'あ' };
const sortBar = (keys) => `<div class="mk-f mk-f-sort"><span>並び順</span><div class="mk-sortbar">${keys.map(([k, l]) => `<button type="button" class="mk-sb" data-k="${k}" title="${l}" aria-label="${l}"><b class="mk-sb-ic" aria-hidden="true">${k === 'year' && keys[0][1] === '登場年' ? '📅' : SORT_IC[k] || '・'}</b><span class="mk-sb-l">${l}</span><i></i></button>`).join('')}</div></div>`;
/* ===== スマホ判定とモバイル用UI（デスクトップでは不可視） ===== */
const MOBILE_MQ = window.matchMedia('(max-width: 768px), (pointer: coarse) and (max-width: 500px), (pointer: coarse) and (max-height: 500px)');
const isMobile = () => MOBILE_MQ.matches;
function setupMobile(body) {
  const bar = document.createElement('div'); bar.className = 'mk-mtool';
  bar.innerHTML = `<button type="button" class="mk-fbtn" aria-label="絞り込み" title="絞り込み" aria-expanded="false">⚲<span class="mk-fdot"></span></button><div class="mk-msort"></div>`;
  body.insertBefore(bar, body.firstChild);
  const sort = body.querySelector('.mk-f-sort'), filters = body.querySelector('.mk-filters'), msort = bar.querySelector('.mk-msort');
  const fbtn = bar.querySelector('.mk-fbtn');
  const place = () => { if (isMobile()) { if (sort.parentNode !== msort) msort.appendChild(sort); } else if (sort.parentNode !== filters) filters.insertBefore(sort, filters.querySelector('.mk-reset') || null); };
  fbtn.onclick = () => { const on = body.classList.toggle('mk-filt-open'); fbtn.setAttribute('aria-expanded', on); };
  const done = document.createElement('button'); done.type = 'button'; done.className = 'mk-fdone'; done.textContent = '絞り込みを閉じる';
  done.onclick = () => { body.classList.remove('mk-filt-open'); fbtn.setAttribute('aria-expanded', false); };
  filters.appendChild(done);
  const mark = () => { const any = [...filters.querySelectorAll('input[type=search],select')].some(e => e.value); fbtn.classList.toggle('active', any); };
  filters.addEventListener('input', mark); filters.addEventListener('change', mark); filters.addEventListener('click', () => setTimeout(mark));
  place(); MOBILE_MQ.addEventListener('change', place);
  return () => MOBILE_MQ.removeEventListener('change', place);
}
function showDetail(body, on) { body.classList.toggle('mk-detail-open', on); if (overlay) overlay.classList.toggle('mk-in-detail', on); }
function bindSort(body, st, cb) {
  const btns = [...body.querySelectorAll('.mk-sb')];
  const sync = () => btns.forEach(b => { const on = b.dataset.k === st.k; b.classList.toggle('on', on); b.querySelector('i').textContent = on ? (st.asc ? '▲' : '▼') : ''; b.setAttribute('aria-pressed', on); });
  btns.forEach(b => b.onclick = () => {
    if (b.dataset.k === st.k) st.asc = !st.asc;
    else { st.k = b.dataset.k; st.asc = ['year', 'name'].includes(st.k); }
    sync(); cb();
  });
  sync();
}
/* 親フィルタ連動: 子プルダウンの選択肢を差し替え、無効になった選択は「すべて」に戻す */
function setOptions(sel, headHTML, bodyHTML) {
  const cur = sel.value;
  sel.innerHTML = headHTML + bodyHTML;
  sel.value = [...sel.options].some(o => o.value === cur) ? cur : '';
  return sel.value !== cur;
}
const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel ? 'selected' : ''}>${esc(l)}</option>`;
function scenarioOptions(era) {
  return DB.scenarios.filter(s => !era || eraOfYear(+s.year) === era).map(s => opt(s.id, `${fmtYear(+s.year)}年 ${s.title}`)).join('');
}
function provOptions(reg) {
  const by = {};
  DB.provinces.filter(p => !reg || p.region === reg).forEach(p => (by[p.region] ||= []).push(p));
  return Object.entries(by).map(([r, ps]) => `<optgroup label="${esc(r)}">${ps.map(p => opt(p.id, p.name)).join('')}</optgroup>`).join('');
}

/* ===================== 武将名鑑 ===================== */
class OfficerView {
  constructor(body) {
    this.body = body;
    const clanOpts = DB.clanList.slice().sort((a, b) => a.c.family.localeCompare(b.c.family, 'ja')).map(c => opt(c.id, c.c.family)).join('');
    body.innerHTML = `
    <div class="mk-filters">
      <label class="mk-f mk-f-search"><span>名前検索</span><input type="search" class="mk-q" placeholder="武将名（例：信長）"></label>
      <label class="mk-f"><span>大名家</span><select class="mk-clan"><option value="">すべての大名家</option>${clanOpts}</select></label>
      <label class="mk-f"><span>年代</span><select class="mk-era"><option value="">すべての時代</option>${ERAS.map(e => opt(e.key, e.label)).join('')}</select></label>
      <label class="mk-f"><span>シナリオ</span><select class="mk-scen"><option value="">指定なし</option>${scenarioOptions()}</select></label>
      <label class="mk-f"><span>国</span><select class="mk-prov"><option value="">すべての国</option>${provOptions()}</select></label>
      ${sortBar([['year', '年齢'], ['total', '能力合計'], ['military', '武勇'], ['politic', '内政'], ['intel', '知略']])}
      <button type="button" class="mk-reset">条件解除</button>
    </div>
    <div class="mk-eras">${['', ...ERAS.map(e => e.key)].map(k => `<button type="button" class="mk-chip ${k === '' ? 'on' : ''}" data-era="${k}">${k ? eraLabel(k) : '全時代'}</button>`).join('')}</div>
    <div class="mk-main">
      <div class="mk-listwrap"><div class="mk-count"></div><div class="mk-list"></div></div>
      <div class="mk-detail"><div class="mk-empty">左の一覧から武将を選ぶと、<br>能力・列伝・登場シナリオが表示されます。</div></div>
    </div>`;
    const $ = (s) => body.querySelector(s);
    this.$ = $;
    this.list = new VList($('.mk-list'), 70, (r) => this.row(r), (r) => this.pick(r));
    const upd = () => this.filter();
    const cascade = () => { setOptions($('.mk-scen'), '<option value="">指定なし</option>', scenarioOptions($('.mk-era').value)); };
    $('.mk-q').addEventListener('input', debounce(upd, 140));
    this.sort = { k: 'year', asc: true }; bindSort(body, this.sort, upd);
    ['.mk-clan', '.mk-scen', '.mk-prov'].forEach(s => $(s).addEventListener('change', upd));
    $('.mk-era').addEventListener('change', () => { this.syncChips(); cascade(); upd(); });
    body.querySelectorAll('.mk-chip').forEach(c => c.onclick = () => { $('.mk-era').value = c.dataset.era; this.syncChips(); cascade(); upd(); });
    $('.mk-reset').onclick = () => { $('.mk-q').value = ''; ['.mk-clan', '.mk-era', '.mk-scen', '.mk-prov'].forEach(s => $(s).value = ''); this.syncChips(); cascade(); upd(); };
    this.filter();
    this.unMobile = setupMobile(body);
    if (!isMobile()) setTimeout(() => $('.mk-q').focus(), 50);
  }
  syncChips() { const v = this.$('.mk-era').value; this.body.querySelectorAll('.mk-chip').forEach(c => c.classList.toggle('on', c.dataset.era === v)); }
  filter() {
    const $ = this.$;
    const q = $('.mk-q').value.trim().toLowerCase(), era = $('.mk-era').value,
      scen = $('.mk-scen').value, prov = $('.mk-prov').value;
    const sc = scen ? DB.scenarios.find(s => s.id === scen) : null, sy = sc ? +sc.year : null;
    const terms = q.split(/\s+/).filter(Boolean);
    const base = DB.officers.filter(r => {
      if (terms.length && !terms.every(t => r.key.includes(t))) return false;
      if (era && r.era !== era) return false;
      if (prov && !r.provSet.has(prov)) return false;
      if (sc) {
        const o = r.o;
        const alive = o.birthYear != null && o.birthYear + 12 <= sy && (o.deathYear == null || o.deathYear >= sy);
        if (!r.scSet.has(scen) && !alive) return false;
      }
      return true;
    });
    // 大名家プルダウン: 他の条件での該当武将に存在する大名家のみ
    const present = new Set(); base.forEach(r => r.clanSet.forEach(c => present.add(c)));
    const clanOpts = DB.clanList.filter(c => present.has(c.id)).sort((a, b) => a.c.family.localeCompare(b.c.family, 'ja')).map(c => opt(c.id, c.c.family)).join('');
    if (clanOpts !== this.lastClanOpts) { this.lastClanOpts = clanOpts; setOptions($('.mk-clan'), '<option value="">すべての大名家</option>', clanOpts); }
    const clan = $('.mk-clan').value;
    let res = clan ? base.filter(r => r.clanSet.has(clan)) : base.slice();
    const { k, asc } = this.sort, val = (r) => k === 'year' ? r.o.birthYear : k === 'total' ? r.total : r.o[k];
    res.sort((a, b) => { const x = val(a), y = val(b); if (x == null) return y == null ? 0 : 1; if (y == null) return -1; return asc ? x - y : y - x; });
    this.scenCtx = sc;
    $('.mk-count').innerHTML = `該当 <b>${res.length.toLocaleString()}</b> 名 <span>/ 全${DB.officers.length.toLocaleString()}名</span>`;
    this.list.set(res);
  }
  row(r) {
    const o = r.o;
    let cid = o.clanId;
    if (this.scenCtx) { const a = r.ap.find(a => a.sc.id === this.scenCtx.id); if (a) cid = a.clanId; }
    const col = DB.clans[cid]?.color || '#666';
    return `<div class="mk-row-bar" style="background:${col}"></div>
      <div class="mk-row-kamon">${kamonHTML(cid, 34)}</div>
      <div class="mk-row-main"><div class="mk-row-name">${esc(o.name)}${o.isDaimyo ? '<em class="mk-badge">当主</em>' : ''}</div>
        <div class="mk-row-sub">${esc(DB.clanName(cid))}・${esc(DB.provName[o.defaultProv] || '')}</div></div>
      <div class="mk-row-side"><span class="mk-era-tag era-${r.era}">${eraLabel(r.era)}</span>${this.sideVal(r)}</div>`;
  }
  sideVal(r) {
    const k = this.sort.k, o = r.o;
    if (k === 'year') return `<span class="mk-row-total"><small class="mk-vl">生年</small>${o.birthYear != null ? esc(fmtYear(o.birthYear)) + '<small class="mk-unit">年</small>' : '—'}</span>`;
    const L = { total: '合計', military: '武勇', politic: '内政', intel: '知略' }[k];
    return `<span class="mk-row-total"><small class="mk-vl">${L}</small>${k === 'total' ? r.total : (o[k] ?? 0)}</span>`;
  }
  pick(r) {
    this.list.sel = r; this.list.draw(); showDetail(this.body, true);
    const o = r.o, c = DB.clans[o.clanId], col = c?.color || '#8c734b';
    const stats = [['武勇', 'military', '⚔'], ['内政', 'politic', '🌾'], ['知略', 'intel', '📜']];
    const bars = stats.map(([l, k, ic]) => { const v = o[k] ?? 0; return `<div class="mk-stat"><span>${ic} ${l}</span><div class="mk-bar"><i style="width:${Math.min(100, v)}%;background:${v >= 90 ? 'linear-gradient(90deg,#d4af37,#ffd700)' : v >= 70 ? 'linear-gradient(90deg,#8e5b1f,#d4af37)' : 'linear-gradient(90deg,#4a3a28,#8c734b)'}"></i></div><b class="${v >= 90 ? 'hi' : ''}">${v}</b></div>`; }).join('');
    const ap = r.ap.slice().sort((a, b) => (+a.sc.year) - (+b.sc.year));
    const apHTML = ap.length ? ap.map(a => `<div class="mk-ap"><span class="mk-ap-y">${fmtYear(+a.sc.year)}</span><span class="mk-ap-t">${esc(a.sc.title)}</span>
        <span class="mk-ap-c" style="border-color:${DB.clans[a.clanId]?.color || '#666'}">${esc(DB.clanName(a.clanId))}${a.isDaimyo ? '（当主）' : ''}${(c => c ? `・城主（${esc(c)}）` : '')(DB.lordCastle(a.sc, a.oid))}</span><span class="mk-ap-p">${esc(DB.provName[a.prov] || a.prov || '')}</span></div>`).join('')
      : `<div class="mk-note">シナリオ固有の配属記録なし。本籍「${esc(DB.provName[o.defaultProv] || '不明')}」・${esc(DB.clanName(o.clanId))}所属として、生没年に応じ登場します（ゲーム規則により追加登場あり）。</div>`;
    const life = (o.birthYear != null || o.deathYear != null) ? `${fmtYear(o.birthYear)}年 〜 ${fmtYear(o.deathYear)}年${o.birthYear != null && o.deathYear != null ? `（享年${o.deathYear - o.birthYear + 1}）` : ''}` : '生没年不詳';
    const d = this.$('.mk-detail');
    d.innerHTML = `<div class="mk-dcard" style="--clan:${col}">
      <div class="mk-dhead">
        <div class="mk-dkamon">${kamonHTML(o.clanId, 72)}</div>
        <div class="mk-dname">${esc(o.name)}
          <div class="mk-dmeta"><span class="mk-pill" style="background:${col}">${esc(DB.clanName(o.clanId))}</span>
          <span class="mk-pill ghost">${eraLabel(r.era)}</span>${o.isDaimyo ? '<span class="mk-pill gold">大名家当主</span>' : ''}
          <span class="mk-pill ghost">本拠 ${esc(DB.provName[o.defaultProv] || '—')}</span></div>
          <div class="mk-life">⏳ ${life}</div></div>
        ${miniMapHTML(this.homeProv(r))}
      </div>
      <div class="mk-dgrid">
        <div class="mk-panel"><h4>能力</h4><div class="mk-statwrap"><div class="mk-bars">${bars}</div><div class="mk-total"><span>総合</span><b>${r.total}</b><small>／300</small></div></div></div>
        <div class="mk-panel"><h4>特技</h4><div class="mk-skill">✦ ${esc(o.skill || 'なし')}</div></div>
      </div>
      <div class="mk-panel"><h4>列伝</h4><p class="mk-lore">${esc(o.lore || '伝わる記録は少ない。')}</p></div>
      <div class="mk-panel"><h4>登場シナリオ <small>${ap.length}件</small></h4><div class="mk-aps">${apHTML}</div></div>
    </div>`;
    d.scrollTop = 0;
  }
  homeProv(r) { // 本拠: 武将データの defaultProv → assignedProvId → シナリオ配属
    const o = r.o, ok = (p) => p && DB.provName[p];
    return [o.defaultProv, o.assignedProvId, ...r.ap.map(a => a.prov)].find(ok) || null;
  }
  destroy() { this.list.destroy(); this.unMobile && this.unMobile(); }
}
/* ===================== 大名名鑑 ===================== */
class ClanView {
  constructor(body) {
    this.body = body;
    body.innerHTML = `
    <div class="mk-filters">
      <label class="mk-f mk-f-search"><span>家名検索</span><input type="search" class="mk-q" placeholder="家名・当主名（例：織田、信長）"></label>
      <label class="mk-f"><span>年代</span><select class="mk-era"><option value="">すべての時代</option>${ERAS.filter(e => !e.officerOnly).map(e => opt(e.key, e.label)).join('')}</select></label>
      <label class="mk-f"><span>シナリオ</span><select class="mk-scen"><option value="">指定なし</option>${scenarioOptions()}</select></label>
      <label class="mk-f"><span>地方</span><select class="mk-reg"><option value="">すべての地方</option>${DB.regions.map(r => opt(r, r)).join('')}</select></label>
      <label class="mk-f"><span>国</span><select class="mk-prov"><option value="">すべての国</option>${provOptions()}</select></label>
      ${sortBar([['max', '最大版図'], ['year', '登場年'], ['offs', '武将数'], ['count', '登場数'], ['name', '家名']])}
      <label class="mk-f mk-f-chk"><input type="checkbox" class="mk-only" checked><span>シナリオ登場家のみ</span></label>
    </div>
    <div class="mk-main">
      <div class="mk-listwrap"><div class="mk-count"></div><div class="mk-list"></div></div>
      <div class="mk-detail"><div class="mk-empty">左の一覧から大名家を選ぶと、<br>家紋・当主・シナリオごとの支配域の変遷が地図で表示されます。</div></div>
    </div>`;
    const $ = (s) => body.querySelector(s); this.$ = $;
    this.list = new VList($('.mk-list'), 70, (r) => this.row(r), (r) => this.pick(r));
    $('.mk-q').addEventListener('input', debounce(() => this.filter(), 140));
    this.sort = { k: 'max', asc: false }; bindSort(body, this.sort, () => this.filter());
    ['.mk-scen', '.mk-prov', '.mk-only'].forEach(s => $(s).addEventListener('change', () => this.filter()));
    $('.mk-era').addEventListener('change', () => { setOptions($('.mk-scen'), '<option value="">指定なし</option>', scenarioOptions($('.mk-era').value)); this.filter(); });
    $('.mk-reg').addEventListener('change', () => { setOptions($('.mk-prov'), '<option value="">すべての国</option>', provOptions($('.mk-reg').value)); this.filter(); });
    this.filter();
    this.unMobile = setupMobile(body);
  }
  filter() {
    const $ = this.$, q = $('.mk-q').value.trim().toLowerCase(), era = $('.mk-era').value, scen = $('.mk-scen').value,
      reg = $('.mk-reg').value, prov = $('.mk-prov').value, only = $('.mk-only').checked;
    let res = DB.clanList.filter(c => {
      if (only && !c.sc.length) return false;
      if (q && !q.split(/\s+/).every(t => c.key.includes(t))) return false;
      if (era && !c.eras.has(era)) return false;
      if (scen && !c.sc.some(s => s.sc.id === scen)) return false;
      if (reg && !c.regions.has(reg)) return false;
      if (prov && !c.provSet.has(prov)) return false;
      return true;
    });
    const fy = (c) => c.sc.length ? +c.sc[0].sc.year : 99999;
    const { k, asc } = this.sort, d = asc ? 1 : -1;
    const v = (c) => k === 'max' ? c.maxProv : k === 'offs' ? c.offCount : k === 'count' ? c.sc.length : fy(c);
    res.sort(k === 'name' ? (a, b) => d * a.c.family.localeCompare(b.c.family, 'ja') : (a, b) => d * (v(a) - v(b)) || b.maxProv - a.maxProv);
    $('.mk-count').innerHTML = `該当 <b>${res.length}</b> 家 <span>/ 全${DB.clanList.length}家</span>`;
    this.list.set(res);
  }
  row(c) {
    const first = c.sc[0], last = c.sc[c.sc.length - 1];
    return `<div class="mk-row-bar" style="background:${c.c.color || '#666'}"></div>
      <div class="mk-row-kamon">${kamonHTML(c.id, 34)}</div>
      <div class="mk-row-main"><div class="mk-row-name">${esc(c.c.family)}</div>
      <div class="mk-row-sub">${first ? `${fmtYear(+first.sc.year)}〜${fmtYear(+last.sc.year)}年` : 'シナリオ未登場'}</div></div>
      <div class="mk-row-side">${this.sideVal(c)}</div>`;
  }
  sideVal(c) {
    const k = this.sort.k, f = c.sc[0];
    const [l, v, u] = k === 'year' ? ['登場', f ? fmtYear(+f.sc.year) : '—', f ? '年' : ''] : k === 'offs' ? ['武将', c.offCount, '名']
      : k === 'count' ? ['登場', c.sc.length, '回'] : k === 'name' ? ['版図', c.maxProv, '国'] : ['最大版図', c.maxProv, '国'];
    return `<span class="mk-row-total"><small class="mk-vl">${l}</small>${esc(v)}<small class="mk-unit">${u}</small></span>`;
  }
  pick(c) {
    this.list.sel = c; this.list.draw(); this.stop(); showDetail(this.body, true);
    const col = c.c.color || '#8c734b', L = c.c.leaders || {};
    const leaders = Object.entries(L).filter(([k]) => k !== 'default').map(([sid, n]) => {
      const sc = c.sc.find(s => s.sc.id === sid)?.sc; if (!sc) return null; return { y: sc ? +sc.year : 99999, t: sc ? sc.title : sid, n };
    }).filter(Boolean).sort((a, b) => a.y - b.y);
    const d = this.$('.mk-detail');
    d.innerHTML = `<div class="mk-dcard" style="--clan:${col}">
      <div class="mk-dhead">
        <div class="mk-dkamon">${kamonHTML(c.id, 72)}</div>
        <div class="mk-dname">${esc(c.c.family)}
          <div class="mk-dmeta">
          ${L.default ? `<span class="mk-pill gold">当主 ${esc(L.default)}</span>` : ''}
          <span class="mk-pill ghost">${c.sc.length}シナリオ登場</span><span class="mk-pill ghost">最大 ${c.maxProv}国</span></div></div>
      </div>
      ${c.sc.length ? `<div class="mk-panel mk-mappanel"><h4>支配域の変遷</h4>
        <div class="mk-tl-head"><span class="mk-tl-year"></span><span class="mk-tl-title"></span><span class="mk-tl-count"></span></div>
        <div class="mk-map"></div>
        <div class="mk-tl-ctrl">
          <button type="button" class="mk-tl-prev" title="前のシナリオ">◀</button>
          <button type="button" class="mk-tl-play" title="再生">▶ 再生</button>
          <button type="button" class="mk-tl-next" title="次のシナリオ">▶</button>
          <input type="range" class="mk-tl-range" min="0" max="${c.sc.length - 1}" value="0" step="1">
        </div>
        <div class="mk-tl-ticks">${c.sc.map((s, i) => `<button type="button" data-i="${i}" title="${esc(s.sc.title)}">${fmtYear(+s.sc.year)}</button>`).join('')}</div>
        <div class="mk-tl-provs"></div></div>` : '<div class="mk-panel"><div class="mk-note">この家はシナリオの初期配置に登場しません。</div></div>'}
      <div class="mk-dgrid">
        <div class="mk-panel"><h4>家伝</h4><p class="mk-lore">${esc(c.c.desc || '—')}</p></div>
        <div class="mk-panel"><h4>固有戦法</h4><div class="mk-skill">⚔ ${esc(c.c.tactic || 'なし')}</div><p class="mk-note">${esc(c.c.tacticDesc || '')}</p></div>
      </div>
      ${leaders.length ? `<div class="mk-panel"><h4>歴代当主（登場シナリオ別）</h4><div class="mk-aps">${leaders.map(l => `<div class="mk-ap"><span class="mk-ap-y">${fmtYear(l.y)}</span><span class="mk-ap-t">${esc(l.t)}</span><span class="mk-ap-c" style="border-color:${col}">${esc(l.n)}</span></div>`).join('')}</div></div>` : ''}
    </div>`;
    d.scrollTop = 0;
    if (!c.sc.length) return;
    this.clan = c;
    this.buildMap(d.querySelector('.mk-map'));
    const $d = (s) => d.querySelector(s);
    $d('.mk-tl-range').oninput = (e) => this.step(+e.target.value);
    $d('.mk-tl-prev').onclick = () => { this.stop(); this.step(Math.max(0, this.idx - 1)); };
    $d('.mk-tl-next').onclick = () => { this.stop(); this.step(Math.min(c.sc.length - 1, this.idx + 1)); };
    $d('.mk-tl-play').onclick = () => this.timer ? this.stop() : this.play();
    d.querySelectorAll('.mk-tl-ticks button').forEach(b => b.onclick = () => { this.stop(); this.step(+b.dataset.i); });
    this.step(0);
  }
  buildMap(el) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'mk-svgmap');
    svg.innerHTML = DB.provinces.map(p => `<path data-p="${esc(p.id)}" d="${esc(p.d || p.svgPath || '')}"><title>${esc(p.name)}</title></path>`).join('');
    el.appendChild(svg);
    try { const b = svg.getBBox(); svg.setAttribute('viewBox', `${b.x - 8} ${b.y - 8} ${b.width + 16} ${b.height + 16}`); } catch (_) { svg.setAttribute('viewBox', '0 0 1000 620'); }
    this.paths = Object.fromEntries([...svg.querySelectorAll('path')].map(p => [p.dataset.p, p]));
  }
  step(i) {
    const c = this.clan, d = this.$('.mk-detail'); if (!c || !d.querySelector('.mk-map')) return;
    this.idx = i;
    const s = c.sc[i], own = new Set(s.provs), col = c.c.color || '#d4af37', owners = s.sc.owners || {};
    for (const [pid, p] of Object.entries(this.paths)) {
      if (own.has(pid)) { p.style.fill = col; p.classList.add('own'); }
      else { p.classList.remove('own'); const oc = DB.clans[owners[pid]]?.color; p.style.fill = oc ? oc : '#2a221a'; }
    }
    d.querySelector('.mk-tl-year').textContent = `${fmtYear(+s.sc.year)}年${s.sc.gengo ? `（${s.sc.gengo}）` : ''}`;
    d.querySelector('.mk-tl-title').textContent = s.sc.title + (s.sc.subtitle ? ` — ${s.sc.subtitle}` : '');
    d.querySelector('.mk-tl-count').innerHTML = `支配 <b>${s.provs.length}</b> 国`;
    d.querySelector('.mk-tl-range').value = i;
    d.querySelectorAll('.mk-tl-ticks button').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
    d.querySelector('.mk-tl-ticks button.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    d.querySelector('.mk-tl-provs').innerHTML = s.provs.map(p => `<span>${esc(DB.provName[p] || p)}</span>`).join('');
  }
  play() {
    const c = this.clan; if (!c) return;
    if (this.idx >= c.sc.length - 1) this.step(0);
    const btn = this.$('.mk-tl-play'); btn.textContent = '■ 停止'; btn.classList.add('on');
    this.timer = setInterval(() => { if (this.idx >= c.sc.length - 1) return this.stop(); this.step(this.idx + 1); }, 1400);
  }
  stop() { clearInterval(this.timer); this.timer = null; const b = this.$('.mk-tl-play'); if (b) { b.textContent = '▶ 再生'; b.classList.remove('on'); } }
  destroy() { this.stop(); this.list.destroy(); this.unMobile && this.unMobile(); }
}

function bind() {
  const a = document.getElementById('openOfficerMeikanBtn'), b = document.getElementById('openClanMeikanBtn');
  if (a) a.onclick = () => open('officer');
  if (b) b.onclick = () => open('clan');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
window.SengokuEncyclopedia = { open, close: closeShell };
export { open as openEncyclopedia, closeShell as closeEncyclopedia };
