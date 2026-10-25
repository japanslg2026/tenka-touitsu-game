/**
 * @file js/ui/OpeningMovie.js
 * 戦国天下統一伝 〜群雄割拠の覇道〜  60秒 映画的オープニング絵巻（全面改修版）
 *
 *  [00s〜11s] 第一景  夕映えの白鷺城 ……「思へばこの世は ／ 常の住み家にあらず」
 *  [11s〜22s] 第二景  月下の湖と白露 ……「草葉に置く白露 ／ 水に宿る月よりなほあやし」
 *  [22s〜35s] 第三景  炎上の天守と敦盛を舞う信長 …「人間五十年 ／ 下天のうちを比ぶれば ／ 夢幻の如くなり」
 *  [35s〜46s] 第四景  払暁の決戦・水墨の陣 …「一度生を受け ／ 滅せぬもののあるべきか」
 *  [46s〜60s] 第五景  炎上する大坂城を背に、炎の中から浮かぶ題字『戦国天下統一伝』・天下布武の落款
 *
 * 描画方針
 *  - 城・山・松・旗・家紋はすべてベクター描画。低解像度画像の拡大を廃止し、
 *    devicePixelRatio を考慮したキャンバス解像度でどの画面でも鮮明に描く。
 *  - 筆文字は Yuji Syuku（同梱サブセット woff2 → Google Fonts → 端末の明朝体）で、
 *    墨の滲み（blur→収束）を伴う一文字ずつの縦書き表示。
 *  - 公開API（constructor(options) / start / stop / togglePause / toggleMute /
 *    skipToFinalScreen、DOM id: openingMovieModal, openingMovieCanvas ほか）は従来互換。
 */

// フォント（オフライン優先：同梱サブセット → Google Fonts → 端末フォント）
const FONT_BRUSH = '"OM Yuji Syuku", "Yuji Syuku", "Yuji Boku", "Zen Antique", "Shippori Mincho", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", "Noto Serif JP", serif';
const FONT_MINCHO = '"OM Shippori Mincho", "Shippori Mincho", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", "Noto Serif JP", serif';

let _fontPromise = null;
function ensureOpeningFonts() {
  if (_fontPromise) return _fontPromise;
  _fontPromise = (async () => {
    if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return false;
    const defs = [
      ['OM Yuji Syuku', '../../assets/fonts/yuji-syuku-opening.woff2'],
      ['OM Shippori Mincho', '../../assets/fonts/shippori-mincho-opening.woff2']
    ];
    let okCount = 0;
    await Promise.all(defs.map(async ([family, rel]) => {
      try {
        const url = new URL(rel, import.meta.url).href;
        const face = new FontFace(family, `url(${url}) format("woff2")`, { display: 'swap' });
        await face.load();
        document.fonts.add(face);
        okCount++;
      } catch (e) { /* 同梱フォントが無い場合は Google Fonts へ */ }
    }));
    if (okCount < defs.length && !document.getElementById('om-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'om-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&family=Shippori+Mincho:wght@500&display=swap';
      document.head.appendChild(link);
    }
    return true;
  })();
  return _fontPromise;
}

// 数学ユーティリティ
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 1次元フラクタルノイズ（山の稜線）
function makeRidge(rand, count, octaves, amp) {
  const pts = new Float32Array(count);
  const layers = [];
  for (let o = 0; o < octaves; o++) {
    const n = 4 + Math.pow(2, o + 1);
    const arr = []; for (let i = 0; i <= n; i++) arr.push(rand());
    layers.push({ n, arr, a: Math.pow(0.5, o) });
  }
  for (let i = 0; i < count; i++) {
    const x = i / (count - 1);
    let v = 0, norm = 0;
    for (const L of layers) {
      const p = x * L.n, k = Math.floor(p), f = p - k;
      const s = f * f * (3 - 2 * f);
      v += lerp(L.arr[k], L.arr[Math.min(k + 1, L.n)], s) * L.a; norm += L.a;
    }
    pts[i] = (v / norm - 0.5) * 2 * amp;
  }
  return pts;
}

const POEMS = {
  s1: ['思へばこの世は', '常の住み家にあらず'],
  s2: ['草葉に置く白露', '水に宿る月よりなほあやし'],
  s3: ['人間五十年', '下天のうちを比ぶれば', '夢幻の如くなり'],
  s4: ['一度生を受け', '滅せぬもののあるべきか']
};

const GLYPH_STYLES = {
  sumi: { fill: '#140c0a', halo: 'rgba(255,236,205,0.55)', haloBlur: 12, bleed: 'rgba(20,12,10,0.45)' },
  moon: { fill: '#eef0f6', halo: 'rgba(0,0,8,0.75)', haloBlur: 12, bleed: 'rgba(200,215,255,0.35)' },
  fire: { fill: '#f6ead2', halo: 'rgba(20,4,2,0.9)', haloBlur: 12, bleed: 'rgba(255,170,90,0.35)' },
  hot: { fill: '#ffb456', halo: 'rgba(255,80,10,0.95)', haloBlur: 16 },
  title: { fill: 'gold', halo: 'rgba(10,4,3,0.95)', haloBlur: 5, haloDx: 5, haloDy: 8, bleed: 'rgba(255,200,120,0.25)' }
};

export class OpeningMovie {
  constructor(options = {}) {
    this.music = options.music || window.sengokuMusic;
    this.onClose = options.onClose || null;

    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.progressBar = null;
    this.skipBtn = null;
    this.pauseBtn = null;
    this.muteBtn = null;
    this.timeDisplay = null;

    this.isPlaying = false;
    this.isPaused = false;
    this.isMuted = false;
    this.animId = null;
    this.startTime = 0;
    this.pausedMoment = 0;
    this.elapsed = 0;
    this.lastFrameTime = 0;
    this.duration = 60.0;

    // 内部仮想解像度（FHD 16:9）。実キャンバスは CSS px × devicePixelRatio
    this.V_WIDTH = 1920;
    this.V_HEIGHT = 1080;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.dpr = 1;

    this.shakeIntensity = 0;
    this.flashOpacity = 0;
    this.audioTriggers = {};
    this.particles = [];

    this._buildStaticData();
    // フォント読込完了でグリフキャッシュを作り直す（フォールバック書体のまま固定されないように）
    const resetGlyphs = () => { if (this._glyphCache) this._glyphCache.clear(); };
    ensureOpeningFonts().then(resetGlyphs);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', resetGlyphs);

    this._boundKeyHandler = this.handleKeyDown.bind(this);
    this._boundResizeHandler = this.handleResize.bind(this);
  }

  // ------------------------------------------------------------------ DOM
  initDOM() {
    this.modal = document.getElementById('openingMovieModal');
    if (!this.modal) {
      console.warn('[OpeningMovie] #openingMovieModal が見つかりません（ページにオープニング用マークアップが必要です）');
      return;
    }
    this.canvas = document.getElementById('openingMovieCanvas');
    if (this.canvas) this.ctx = this.canvas.getContext('2d', { alpha: false });

    this._ensureFxOverlay();

    this.progressBar = document.getElementById('openingProgressBar');
    this.skipBtn = document.getElementById('openingSkipBtn');
    this.pauseBtn = document.getElementById('openingPauseBtn');
    this.muteBtn = document.getElementById('openingMuteBtn');
    this.timeDisplay = document.getElementById('openingTimeDisplay');

    if (this.skipBtn) this.skipBtn.onclick = (e) => { e.stopPropagation(); this.stop(); };
    if (this.pauseBtn) this.pauseBtn.onclick = (e) => { e.stopPropagation(); this.togglePause(); };
    if (this.muteBtn) this.muteBtn.onclick = (e) => { e.stopPropagation(); this.toggleMute(); };
    // 画面のどこをクリック／タップしても即座に終了してスキップと同じ経路（stop）へ。
    // click だけを扱う（タッチでも click が1回発火）ので touchend との二重発火はなく、stop() 自体も1回限り。
    // 再生開始直後 0.5 秒は無視し、自動再生の解除操作や開始ボタンのクリックで即終了しないようにする。
    if (this.modal) {
      this.modal.onclick = (e) => {
        if (!this.isPlaying) return;
        if (e.target && e.target.closest && e.target.closest('#openingPauseBtn, #openingMuteBtn')) return;
        if (performance.now() - (this._startedAt || 0) < this.TAP_GRACE_MS) return;
        e.stopPropagation();
        e.preventDefault();
        this.stop();
      };
    }
  }

  // 周辺減光とフィルムグレインは GPU 合成される CSS レイヤーで重ねる（キャンバス負荷を削減）
  _ensureFxOverlay() {
    if (!this.modal || document.getElementById('openingMovieFx')) return;
    const fx = document.createElement('div');
    fx.id = 'openingMovieFx';
    fx.setAttribute('aria-hidden', 'true');
    let grainUrl = '';
    try { grainUrl = this.grain.toDataURL('image/png'); } catch (e) {}
    fx.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;' +
      'background:radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.55) 100%);';
    if (grainUrl) {
      const grain = document.createElement('div');
      grain.style.cssText = `position:absolute;inset:-64px;background-image:url(${grainUrl});background-size:256px 256px;opacity:0.55;` +
        'animation:omGrain 0.5s steps(4) infinite;';
      fx.appendChild(grain);
      if (!document.getElementById('omGrainKeyframes')) {
        const st = document.createElement('style');
        st.id = 'omGrainKeyframes';
        st.textContent = '@keyframes omGrain{0%{transform:translate(0,0)}25%{transform:translate(-37px,21px)}50%{transform:translate(19px,-43px)}75%{transform:translate(-11px,29px)}100%{transform:translate(0,0)}}' +
          '@media (prefers-reduced-motion: reduce){#openingMovieFx div{animation:none!important}}';
        document.head.appendChild(st);
      }
    }
    const canvas = document.getElementById('openingMovieCanvas');
    if (canvas && canvas.nextSibling) this.modal.insertBefore(fx, canvas.nextSibling);
    else this.modal.appendChild(fx);
  }

  start() {
    if (!this.modal) this.initDOM();
    if (!this.modal || !this.canvas || !this.ctx) return;

    this.modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    this.handleResize();
    window.addEventListener('resize', this._boundResizeHandler);
    window.addEventListener('keydown', this._boundKeyHandler);

    this.isPlaying = true;
    this.isPaused = false;
    this.TAP_GRACE_MS = 500;
    this._startedAt = performance.now();
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.pausedMoment = 0;
    this.elapsed = 0;
    this.audioTriggers = {};
    this.shakeIntensity = 0;
    this.flashOpacity = 0;
    this.initParticles();

    if (this.pauseBtn) this.pauseBtn.innerHTML = '<span class="ctrl-icon">⏸</span><span class="ctrl-text">停止</span>';

    if (this.music) {
      try {
        if (typeof this.music.init === 'function') this.music.init();
        if (this.music.ctx && this.music.ctx.state === 'suspended') this.music.ctx.resume().catch(() => {});
        if (typeof this.music.playTrack === 'function') this.music.playTrack('op', true);
      } catch (err) {
        console.warn('[OpeningMovie] BGM start error:', err);
      }
    }
    // 自動再生制限：音声が止められていたら映像だけ先に流し、消音表示から音を出せるようにする
    this._audioBlocked = false;
    setTimeout(() => {
      const ctx = this.music && this.music.ctx;
      if (this.isPlaying && (!ctx || ctx.state !== 'running')) {
        this._audioBlocked = true;
        if (this.muteBtn) this.muteBtn.innerHTML = '<span class="ctrl-icon">🔇</span><span class="ctrl-text">音を出す</span>';
      }
    }, 300);

    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.isPaused = false;
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    window.removeEventListener('resize', this._boundResizeHandler);
    window.removeEventListener('keydown', this._boundKeyHandler);
    if (this.modal) this.modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (this.music) {
      try {
        // bgm.js の Proxy は未定義メソッドにスタブを返すため 'in' で実在を確認する
        if (this._hasSfx('stopBgm')) this.music.stopBgm();
        else if (this._hasSfx('stop')) this.music.stop();
      } catch (e) {}
    }
    if (typeof this.onClose === 'function') this.onClose();
  }

  togglePause() {
    if (!this.isPlaying) return;
    this.isPaused = !this.isPaused;
    if (this.pauseBtn) {
      this.pauseBtn.innerHTML = this.isPaused
        ? '<span class="ctrl-icon">▶</span><span class="ctrl-text">再開</span>'
        : '<span class="ctrl-icon">⏸</span><span class="ctrl-text">停止</span>';
    }
    if (this.isPaused) {
      this.pausedMoment = performance.now();
      if (this.animId) cancelAnimationFrame(this.animId);
      this.animId = null;
      if (this.music && this.music.ctx && this.music.ctx.state === 'running') this.music.ctx.suspend().catch(() => {});
    } else {
      this.startTime += performance.now() - this.pausedMoment;
      this.lastFrameTime = performance.now();
      if (this.music && this.music.ctx && this.music.ctx.state === 'suspended') this.music.ctx.resume().catch(() => {});
      this.loop();
    }
  }

  toggleMute() {
    if (this._audioBlocked) { // 自動再生で止められていた音声を、このタップで開始する
      this._audioBlocked = false;
      try {
        if (this.music && typeof this.music.unlockAudio === 'function') {
          this.music.unlockAudio();
        } else if (this.music && typeof this.music.init === 'function') {
          this.music.init();
        }
        const ctx = this.music && this.music.ctx;
        const go = () => { try { if (typeof this.music.playTrack === 'function') this.music.playTrack('op', true); } catch (e) {} };
        if (ctx && ctx.state === 'suspended') ctx.resume().then(go).catch(() => {}); else go();
      } catch (e) {}
      if (this.muteBtn) this.muteBtn.innerHTML = '<span class="ctrl-icon">🔊</span><span class="ctrl-text">音声</span>';
      return;
    }
    this.isMuted = !this.isMuted;
    if (this.music && typeof this.music.toggleBgm === 'function') {
      try { this.music.toggleBgm(); } catch (e) {}
    }
    if (this.muteBtn) {
      this.muteBtn.innerHTML = this.isMuted
        ? '<span class="ctrl-icon">🔇</span><span class="ctrl-text">消音中</span>'
        : '<span class="ctrl-icon">🔊</span><span class="ctrl-text">音声</span>';
    }
  }

  skipToFinalScreen() {
    this.elapsed = 50.0;
    this.startTime = performance.now() - 50.0 * 1000;
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') this.stop();
    else if (e.key === ' ' || e.key === 'p' || e.key === 'P') { e.preventDefault(); this.togglePause(); }
    else if (e.key === 'Enter') { if (this.elapsed >= 50.0) this.stop(); else this.skipToFinalScreen(); }
  }

  // devicePixelRatio を考慮した実解像度キャンバス（ぼやけ対策）
  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width || window.innerWidth);
    const h = Math.max(1, rect.height || window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap || 2.5);
    this.dpr = dpr;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (this.canvas.width !== pw) this.canvas.width = pw;
    if (this.canvas.height !== ph) this.canvas.height = ph;
    if (w / h > this.V_WIDTH / this.V_HEIGHT) {
      this.scale = ph / this.V_HEIGHT;
      this.offsetX = (pw - this.V_WIDTH * this.scale) / 2;
      this.offsetY = 0;
    } else {
      this.scale = pw / this.V_WIDTH;
      this.offsetX = 0;
      this.offsetY = (ph - this.V_HEIGHT * this.scale) / 2;
    }
    if (!this.buf) this.buf = document.createElement('canvas');
    this.buf.width = pw; this.buf.height = ph;
    this.bufCtx = this.buf.getContext('2d', { alpha: false });
    this._grainPattern = null;
  }

  // ------------------------------------------------------------------ 静的データ
  _buildStaticData() {
    const R = mulberry32(1582);
    const W = this.V_WIDTH;
    this.ridges = [];
    for (let i = 0; i < 5; i++) this.ridges.push(makeRidge(R, 160, 5, 90 - i * 10));

    this.clouds = [];
    for (let i = 0; i < 14; i++) this.clouds.push({ x: R() * 2400 - 200, y: 140 + R() * 420, w: 260 + R() * 520, h: 8 + R() * 18, sp: 4 + R() * 10, a: 0.3 + R() * 0.45 });
    this.stars = [];
    for (let i = 0; i < 170; i++) this.stars.push({ x: R() * W, y: R() * 600, r: R() * 1.8 + 0.4, ph: R() * 6.28, sp: 0.6 + R() * 2 });
    this.crows = [];
    for (let i = 0; i < 7; i++) this.crows.push({ x0: 1000 + i * 70 + R() * 60, y0: 300 + R() * 120, ph: R() * 6.28, s: 0.6 + R() * 0.5 });
    this.grass = [];
    for (let i = 0; i < 90; i++) {
      const side = i < 45 ? 0 : 1;
      const x = side === 0 ? R() * 520 - 40 : W - R() * 560 + 40;
      this.grass.push({ x, h: 160 + R() * 300, lean: (side === 0 ? 1 : -1) * (0.15 + R() * 0.5), w: 3 + R() * 5, ph: R() * 6.28, dark: R() });
    }
    this.fireflies = [];
    for (let i = 0; i < 26; i++) this.fireflies.push({ x: R() * W, y: 640 + R() * 360, ph: R() * 6.28, sp: 0.3 + R() * 0.6, r: 20 + R() * 60 });
    this.banners = [];
    for (let row = 0; row < 3; row++) {
      const n = 18 + row * 4;
      for (let i = 0; i < n; i++) this.banners.push({ row, x: (i / n) * 2300 - 200 + R() * 60, ph: R() * 6.28, hgt: (200 + R() * 40) * (0.55 + row * 0.3), col: R() < 0.5 ? 0 : R() < 0.6 ? 1 : 2, kamon: Math.floor(R() * 3) });
    }
    this.spears = [];
    for (let i = 0; i < 160; i++) this.spears.push({ x: R() * 2300 - 200, h: 120 + R() * 60, tilt: (R() - 0.5) * 0.12, row: Math.floor(R() * 3) });
    this.titleFlames = [];
    for (let i = 0; i < 90; i++) this.titleFlames.push({ x: 60 + (i / 90) * 1800 + (R() - 0.5) * 60, per: 1.3 + R() * 1.1, ph: R(), r: 90 + R() * 110, sway: R() * 6.28 });
    this.goldLeaf = [];
    for (let i = 0; i < 40; i++) this.goldLeaf.push({ x: R() * W, y: 140 + R() * 800, s: 20 + R() * 60, a: 0.03 + R() * 0.05, rot: R() * 0.4 - 0.2 });

    this.glowSprite = this._makeGlowSprite(64, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,0.85)'], [0.45, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
    this.emberSprite = this._makeGlowSprite(64, [[0, 'rgba(255,250,220,1)'], [0.15, 'rgba(255,190,90,0.95)'], [0.4, 'rgba(255,90,20,0.35)'], [1, 'rgba(160,20,0,0)']]);
    this.smokeSprite = this._makeGlowSprite(128, [[0, 'rgba(14,6,6,0.6)'], [0.5, 'rgba(14,6,6,0.28)'], [1, 'rgba(14,6,6,0)']]);
    this.washi = this._makeWashi();
    this.grain = this._makeGrain();
    this.vignette = this._makeVignette();
  }

  _makeGlowSprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }

  _makeWashi() {
    const c = document.createElement('canvas');
    c.width = 960; c.height = 540;
    const g = c.getContext('2d');
    const R = mulberry32(77);
    g.fillStyle = '#ece2cc'; g.fillRect(0, 0, 960, 540);
    const img = g.getImageData(0, 0, 960, 540);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (R() - 0.5) * 16;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n * 0.9;
    }
    g.putImageData(img, 0, 0);
    g.lineCap = 'round';
    for (let i = 0; i < 900; i++) { // 楮の繊維
      const x = R() * 960, y = R() * 540, a = R() * Math.PI * 2, l = 6 + R() * 26;
      g.strokeStyle = `rgba(${R() < 0.5 ? '255,252,240' : '150,130,100'},${0.1 + R() * 0.18})`;
      g.lineWidth = 0.4 + R() * 0.8;
      g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    return c;
  }

  _makeGrain() {
    // 透過グレイン（通常合成で軽量に）
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const img = g.createImageData(256, 256);
    const R = mulberry32(9);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = R() < 0.5 ? 0 : 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.floor(R() * 22);
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // 月面テクスチャ（淡くぼかした「月のうさぎ」の海と細かな斑）
  _makeMoon() {
    const N = 384, R0 = N * 0.48;
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const g = cv.getContext('2d');
    const cx = N / 2, cy = N / 2;
    const base = g.createRadialGradient(cx - R0 * 0.25, cy - R0 * 0.25, R0 * 0.1, cx, cy, R0);
    base.addColorStop(0, '#fffdf3'); base.addColorStop(0.75, '#f1ead4'); base.addColorStop(1, '#dcd3ba');
    g.fillStyle = base; g.beginPath(); g.arc(cx, cy, R0, 0, Math.PI * 2); g.fill();
    g.save();
    g.beginPath(); g.arc(cx, cy, R0, 0, Math.PI * 2); g.clip();
    g.globalCompositeOperation = 'multiply';
    const blob = (x, y, rx, ry, rot, a, blur) => {
      g.save();
      if ('filter' in g) g.filter = `blur(${blur}px)`;
      g.fillStyle = `rgba(150,140,120,${a})`;
      g.beginPath(); g.ellipse(cx + x * R0, cy + y * R0, rx * R0, ry * R0, rot, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    // うさぎ：耳（右上へ伸びる）・頭・背と胴・臼
    blob(0.22, -0.48, 0.09, 0.26, 0.55, 0.4, 10);
    blob(0.38, -0.36, 0.08, 0.22, 0.8, 0.36, 10);
    blob(0.05, -0.15, 0.22, 0.18, 0.3, 0.42, 13);
    blob(-0.28, 0.12, 0.34, 0.26, -0.3, 0.4, 16);
    blob(-0.42, -0.2, 0.18, 0.16, 0, 0.26, 14);
    blob(0.36, 0.28, 0.17, 0.2, 0, 0.36, 12);
    blob(0.12, 0.42, 0.14, 0.08, 0.2, 0.22, 12);
    // 細かな斑（自然な月面のむら）
    const Rr = mulberry32(88);
    for (let i = 0; i < 26; i++) {
      const a = Rr() * Math.PI * 2, d = Math.sqrt(Rr()) * 0.92;
      blob(Math.cos(a) * d, Math.sin(a) * d, 0.03 + Rr() * 0.07, 0.03 + Rr() * 0.06, Rr() * 3, 0.05 + Rr() * 0.07, 6 + Rr() * 5);
    }
    g.restore();
    // 周縁減光
    const limb = g.createRadialGradient(cx, cy, R0 * 0.6, cx, cy, R0);
    limb.addColorStop(0, 'rgba(0,0,0,0)'); limb.addColorStop(1, 'rgba(120,110,90,0.25)');
    g.fillStyle = limb; g.beginPath(); g.arc(cx, cy, R0, 0, Math.PI * 2); g.fill();
    return cv;
  }

  _makeVignette() {
    const c = document.createElement('canvas');
    c.width = 480; c.height = 270;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(240, 135, 270 * 0.45, 240, 135, 480 * 0.62);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = gr; g.fillRect(0, 0, 480, 270);
    return c;
  }

  // ------------------------------------------------------------------ パーティクル
  initParticles() { this.particles = []; }

  _spawn(kind, n) {
    const R = Math.random, W = this.V_WIDTH, H = this.V_HEIGHT;
    for (let i = 0; i < n; i++) {
      if (kind === 'ember') this.particles.push({ kind, x: R() * W, y: H * (0.55 + R() * 0.5), vx: (R() - 0.5) * 30, vy: -(50 + R() * 110), s: 3 + R() * 8, life: 0, max: 3 + R() * 5, ph: R() * 6.28 });
      else if (kind === 'gold') this.particles.push({ kind, x: R() * W, y: R() * H, vx: (R() - 0.5) * 12, vy: -(4 + R() * 14), s: 2 + R() * 5, life: 0, max: 5 + R() * 6, ph: R() * 6.28 });
      else if (kind === 'ash') this.particles.push({ kind, x: R() * W * 1.1 - 150, y: R() * H * 0.8, vx: 30 + R() * 50, vy: 20 + R() * 35, s: 1.5 + R() * 3, life: 0, max: 6 + R() * 6, ph: R() * 6.28 });
      else if (kind === 'petal') this.particles.push({ kind, x: R() * W * 1.2 - 200, y: -30 + R() * H * 0.6, vx: 20 + R() * 40, vy: 30 + R() * 40, s: 6 + R() * 6, life: 0, max: 10 + R() * 4, ph: R() * 6.28, rot: R() * 6.28 });
    }
  }

  updateAndDrawParticles(t, dt) {
    const want = { ember: 0, gold: 0, ash: 0, petal: 0 };
    if (t < 11.2) want.ember = 22;
    else if (t < 22.2) want.petal = 16;
    else if (t < 35.2) want.ember = 100;
    else if (t < 46.2) want.ash = 70;
    else { want.ember = 90; want.gold = 50; }
    const count = { ember: 0, gold: 0, ash: 0, petal: 0 };
    for (const p of this.particles) count[p.kind]++;
    for (const k in want) {
      const deficit = want[k] - count[k];
      if (deficit > 0) this._spawn(k, Math.min(deficit, Math.ceil(want[k] * dt * 0.5) + 1));
    }
    const c = this.ctx;
    c.save();
    const alive = [];
    for (const p of this.particles) {
      p.life += dt * (want[p.kind] === 0 ? 3 : 1);
      if (p.life > p.max || p.y < -60 || p.y > this.V_HEIGHT + 120 || p.x > this.V_WIDTH + 120) continue;
      alive.push(p);
      const lifeA = Math.sin(clamp(p.life / p.max) * Math.PI);
      if (p.kind === 'ember') {
        p.vx += Math.sin(t * 2 + p.ph) * 20 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = lifeA * (0.65 + 0.35 * Math.sin(t * 14 + p.ph * 5)) * 0.9;
        const s = p.s * (0.6 + lifeA * 0.6);
        c.drawImage(this.emberSprite, p.x - s, p.y - s, s * 2, s * 2);
      } else if (p.kind === 'gold') {
        p.x += (p.vx + Math.sin(t + p.ph) * 6) * dt; p.y += p.vy * dt;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = lifeA * (0.5 + 0.5 * Math.sin(t * 5 + p.ph)) * 0.8;
        c.drawImage(this.glowSprite, p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      } else if (p.kind === 'ash') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = lifeA * 0.45;
        c.fillStyle = '#2a2622';
        c.fillRect(p.x, p.y, p.s, p.s * 0.6);
      } else if (p.kind === 'petal') {
        p.rot += dt * 1.6;
        p.x += (p.vx + Math.sin(t * 0.9 + p.ph) * 25) * dt; p.y += p.vy * dt;
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = lifeA * 0.8;
        c.save();
        c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, 0.55 + 0.45 * Math.sin(p.rot * 1.7));
        c.fillStyle = '#f1d3da';
        c.beginPath();
        c.moveTo(0, -p.s); c.quadraticCurveTo(p.s * 0.9, -p.s * 0.2, 0, p.s);
        c.quadraticCurveTo(-p.s * 0.9, -p.s * 0.2, 0, -p.s);
        c.fill();
        c.restore();
      }
    }
    this.particles = alive;
    c.restore();
  }

  // ------------------------------------------------------------------ メインループ
  loop() {
    if (!this.isPlaying || this.isPaused) return;
    const now = performance.now();
    const dt = clamp((now - this.lastFrameTime) / 1000, 0, 0.1);
    this.lastFrameTime = now;
    this.elapsed = (now - this.startTime) / 1000;
    // 低速端末では解像度を段階的に下げて滑らかさを優先（最低 1.0x）
    this._dtAvg = this._dtAvg ? this._dtAvg * 0.95 + dt * 0.05 : dt;
    if (this._dtAvg > 0.04 && (window.devicePixelRatio || 1) > 1 && (this.dprCap || 2.5) > 1 && now - (this._lastDprDrop || 0) > 2000) {
      this.dprCap = Math.max(1, Math.min(this.dprCap || 2.5, window.devicePixelRatio) - 0.5);
      this._lastDprDrop = now;
      this._dtAvg = 0.02;
      this.handleResize();
    }
    const t = this.elapsed;
    // 最後まで流れたら（題字を少し見せてから）大名選択画面へ
    if (t >= this.duration + 30) { this.stop(); return; } // 終幕後およそ30秒で自動終了（クリック/タップで即終了）

    if (this.progressBar) this.progressBar.style.width = Math.min(100, (t / this.duration) * 100) + '%';
    if (this.timeDisplay) {
      const totalSec = Math.min(Math.floor(t), Math.floor(this.duration));
      this.timeDisplay.textContent = `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')} / 1:00`;
    }
    try {
      this.renderFrame(t, dt);
    } catch (renderErr) {
      console.error('[OpeningMovie] Render error in loop:', renderErr);
    }
    this.animId = requestAnimationFrame(() => this.loop());
  }

  _beginVirtual(c, shake) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.translate(this.offsetX, this.offsetY);
    c.scale(this.scale, this.scale);
    if (shake) c.translate(shake[0], shake[1]);
    c.beginPath(); c.rect(0, 0, this.V_WIDTH, this.V_HEIGHT); c.clip();
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
  }

  renderFrame(t, dt) {
    const main = this.ctx;
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.fillStyle = '#000';
    main.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const shake = this.shakeIntensity > 0 ? [(Math.random() - 0.5) * this.shakeIntensity, (Math.random() - 0.5) * this.shakeIntensity] : null;

    const scenes = [
      { t0: 0, t1: 11.6, fn: (st) => this.renderScene1(st) },
      { t0: 10.6, t1: 22.6, fn: (st) => this.renderScene2(st) },
      { t0: 21.6, t1: 35.6, fn: (st) => this.renderScene3(st) },
      { t0: 34.6, t1: 46.6, fn: (st) => this.renderScene4(st) },
      { t0: 45.6, t1: 1e9, fn: (st) => this.renderScene5(st) }
    ];
    const active = scenes.filter((s) => t >= s.t0 && t < s.t1);

    main.save();
    this._beginVirtual(main, shake);
    if (active.length > 0) active[0].fn(t - active[0].t0);
    main.restore();

    if (active.length > 1) { // ディゾルブ（次景をバッファに描いて重ねる）
      const s = active[1];
      const a = easeInOut(clamp((t - s.t0) / (active[0].t1 - s.t0)));
      const b = this.bufCtx;
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.fillStyle = '#000'; b.fillRect(0, 0, this.buf.width, this.buf.height);
      b.save();
      this.ctx = b;
      try { this._beginVirtual(b, shake); s.fn(t - s.t0); } finally { this.ctx = main; b.restore(); }
      main.save();
      main.setTransform(1, 0, 0, 1, 0, 0);
      main.globalAlpha = a;
      main.drawImage(this.buf, 0, 0);
      main.restore();
    }

    main.save();
    this._beginVirtual(main, null);
    this.updateAndDrawParticles(t, dt);
    if (this.flashOpacity > 0) {
      main.fillStyle = `rgba(255, 246, 230, ${this.flashOpacity})`;
      main.fillRect(0, 0, this.V_WIDTH, this.V_HEIGHT);
      this.flashOpacity *= Math.pow(0.02, dt);
      if (this.flashOpacity < 0.01) this.flashOpacity = 0;
    }
    this.drawCinemascopeBars(t);
    main.restore();

    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= Math.pow(0.004, dt);
      if (this.shakeIntensity < 0.3) this.shakeIntensity = 0;
    }
  }

  triggerAudio(key, callback) {
    if (!this.audioTriggers) this.audioTriggers = {};
    if (this.audioTriggers[key]) return;
    this.audioTriggers[key] = true;
    try { if (typeof callback === 'function') callback(); } catch (e) { console.warn('[OpeningMovie] Audio trigger error:', e); }
  }
  _hasSfx(name) {
    const m = this.music;
    return !!m && (name in m) && typeof m[name] === 'function';
  }
  _sfx(name, ...args) {
    const m = this.music;
    try { if (this._hasSfx(name)) m[name](...args); } catch (e) { console.warn('[OpeningMovie] SE error:', name, e); }
  }

  // ================================================================== 第一景：夕映えの白鷺城
  renderScene1(st) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    this.triggerAudio('s1_taiko', () => this._sfx('playTaiko', 0.8));
    if (st > 1.8) this.triggerAudio('s1_tsuzumi', () => this._sfx('playTsuzumiSound', 0.9));
    const cam = easeInOut(clamp(st / 12));

    c.save();
    const z = 1.0 + cam * 0.06;
    c.translate(W * 0.62, H * 0.66); c.scale(z, z); c.translate(-W * 0.62, -H * 0.66);

    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1c1230');
    sky.addColorStop(0.26, '#4c2140');
    sky.addColorStop(0.48, '#9c3a3c');
    sky.addColorStop(0.62, '#d9703c');
    sky.addColorStop(0.72, '#f2ac5c');
    sky.addColorStop(0.8, '#f4cb86');
    sky.addColorStop(1, '#8a4630');
    c.fillStyle = sky; c.fillRect(-60, -60, W + 120, H + 120);

    const sunX = 760, sunY = 610 + st * 6;
    const g = c.createRadialGradient(sunX, sunY, 0, sunX, sunY, 640);
    g.addColorStop(0, 'rgba(255,242,205,0.9)');
    g.addColorStop(0.09, 'rgba(255,214,140,0.55)');
    g.addColorStop(0.32, 'rgba(255,150,70,0.2)');
    g.addColorStop(1, 'rgba(255,120,60,0)');
    c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120);
    const sd = c.createRadialGradient(sunX, sunY - 8, 0, sunX, sunY, 52);
    sd.addColorStop(0, '#fffbe8'); sd.addColorStop(0.7, '#ffe6a6'); sd.addColorStop(1, '#ffc773');
    c.fillStyle = sd;
    c.beginPath(); c.arc(sunX, sunY, 52, 0, Math.PI * 2); c.fill();

    this.drawSunsetClouds(st);

    this.drawMountainLayer(0, 650, st * 3, ['rgba(140,64,78,0.6)', 'rgba(230,140,100,0)'], 1.0);
    this.drawMist(705, 120, 'rgba(250,190,140,0.35)', st * 10);
    this.drawMountainLayer(1, 735, st * 6, ['rgba(92,38,60,0.85)', 'rgba(200,110,90,0)'], 1.2);
    this.drawMist(790, 140, 'rgba(240,160,120,0.3)', -st * 14);

    // 姫山と白鷺城（ベクター・シルエット）
    const castleCol = '#2b1426';
    c.fillStyle = castleCol;
    c.beginPath();
    // 城を載せる台地（石垣の裾より少し上まで覆い、斜面へ自然につなぐ）
    c.moveTo(760, H + 40);
    c.bezierCurveTo(860, 900, 930, 830, 1010, 812);
    c.lineTo(1680, 812);
    c.bezierCurveTo(1760, 826, 1860, 860, 1990, 905);
    c.lineTo(1990, H + 40); c.closePath(); c.fill();
    this.drawHimejiCastle(c, 1340, 814, 1.12, { mode: 'silhouette', fill: castleCol, edge: 'rgba(140,78,66,0.32)', lights: smooth(4, 9, st) });
    // 裾の木立（石垣の根元を覆って接地感を出す）
    c.fillStyle = castleCol;
    c.beginPath();
    c.moveTo(930, 860);
    for (let i = 0; i <= 40; i++) {
      const x = 960 + i * 19;
      const y = 812 - 6 - 10 * Math.abs(Math.sin(i * 1.7)) - 6 * Math.abs(Math.sin(i * 0.63));
      c.quadraticCurveTo(x - 9, y - 6, x, y);
    }
    c.lineTo(1740, 830); c.lineTo(1740, 880); c.lineTo(930, 880); c.closePath(); c.fill();
    this.drawMist(880, 130, 'rgba(230,140,110,0.28)', st * 18);
    this.drawMountainLayer(2, 930, st * 10, ['rgba(36,16,28,0.96)', 'rgba(60,24,30,0.9)'], 0.9);

    this.drawCrows(st);
    c.restore();

    c.save();
    c.translate(-cam * 40, 0);
    this.drawPine(c, -60, H + 10, 0.9, '#110710');
    c.restore();

    this.drawVerticalPoemLines({ lines: POEMS.s1, startX: 480, topY: 200, fontSize: 64, columnSpacing: 104, curTime: st, startTime: 1.8, endTime: 11.2, style: 'sumi' });
  }

  drawSunsetClouds(st) {
    const c = this.ctx;
    for (const cl of this.clouds) {
      const x = ((cl.x + st * cl.sp) % 2600) - 300;
      const lit = clamp((cl.y - 120) / 450);
      const g = c.createLinearGradient(0, cl.y - cl.h, 0, cl.y + cl.h);
      g.addColorStop(0, `rgba(${Math.round(lerp(70, 120, lit))},${Math.round(lerp(30, 48, lit))},60,${cl.a * 0.7})`);
      g.addColorStop(1, `rgba(255,${Math.round(lerp(140, 200, lit))},${Math.round(lerp(90, 120, lit))},${cl.a})`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x, cl.y);
      c.bezierCurveTo(x + cl.w * 0.2, cl.y - cl.h, x + cl.w * 0.7, cl.y - cl.h * 1.2, x + cl.w, cl.y - cl.h * 0.1);
      c.bezierCurveTo(x + cl.w * 0.75, cl.y + cl.h * 0.6, x + cl.w * 0.3, cl.y + cl.h * 0.5, x, cl.y);
      c.fill();
    }
  }

  drawMountainLayer(idx, baseY, shift, cols, amp) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    const r = this.ridges[idx % this.ridges.length];
    const span = W + 400, n = r.length;
    const g = c.createLinearGradient(0, baseY - 120 * amp, 0, baseY + 220);
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-200, H + 60);
    const sh = shift % 200;
    for (let i = 0; i < n; i++) c.lineTo(-200 + (i / (n - 1)) * span - sh, baseY + r[i] * amp);
    c.lineTo(W + 260, H + 60);
    c.closePath(); c.fill();
  }

  drawMist(y, h, color, shift) {
    const c = this.ctx, W = this.V_WIDTH;
    for (let i = 0; i < 3; i++) {
      const cx = ((((shift * (1 + i * 0.3) + i * 760) % (W + 1200)) + (W + 1200)) % (W + 1200)) - 600;
      const g = c.createRadialGradient(cx, y, 0, cx, y, 700);
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.save();
      c.translate(0, y); c.scale(1, h / 700); c.translate(0, -y);
      c.fillStyle = g; c.fillRect(cx - 700, y - 700, 1400, 1400);
      c.restore();
    }
    const lg = c.createLinearGradient(0, y - h * 0.5, 0, y + h * 0.5);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, color); lg.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalAlpha = 0.6; c.fillStyle = lg; c.fillRect(-60, y - h * 0.5, W + 120, h); c.restore();
  }

  drawCrows(st) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = '#1a0c14'; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const b of this.crows) {
      const x = b.x0 - st * 46 * b.s, y = b.y0 + Math.sin(st * 0.8 + b.ph) * 14;
      const flap = Math.sin(st * 7 * b.s + b.ph);
      const s = 14 * b.s;
      c.lineWidth = 2.6 * b.s;
      c.beginPath();
      c.moveTo(x - s, y - flap * s * 0.6);
      c.quadraticCurveTo(x - s * 0.4, y - s * 0.15 - flap * s * 0.2, x, y);
      c.quadraticCurveTo(x + s * 0.4, y - s * 0.15 - flap * s * 0.2, x + s, y - flap * s * 0.6);
      c.stroke();
    }
    c.restore();
  }

  // 水墨の松（幹は筆の太細、葉は放射状の針葉ストローク）
  drawPine(c, x, baseY, s, color) {
    c.save();
    c.translate(x, baseY); c.scale(s, s);
    c.fillStyle = color; c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-44, 0);
    c.bezierCurveTo(-30, -160, 46, -250, 12, -420);
    c.bezierCurveTo(2, -480, 40, -540, 92, -584);
    c.lineTo(102, -570);
    c.bezierCurveTo(62, -522, 34, -470, 42, -420);
    c.bezierCurveTo(74, -260, 12, -150, 34, 0);
    c.closePath(); c.fill();
    const branches = [[22, -330, 250, -392, 13], [12, -430, -110, -500, 9], [62, -520, 290, -560, 9], [92, -578, 170, -656, 7]];
    for (const [x0, y0, x1, y1, w] of branches) {
      c.lineWidth = w;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 34, x1, y1); c.stroke();
    }
    const pads = [[250, -398, 150, 40], [-110, -506, 110, 32], [290, -566, 130, 36], [170, -660, 100, 30], [70, -604, 80, 26]];
    const R = mulberry32(404);
    for (const [px, py, pw, ph] of pads) {
      // 淡墨の下地
      c.globalAlpha = 0.55;
      c.beginPath(); c.ellipse(px, py - ph * 0.15, pw, ph * 0.62, 0, Math.PI, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
      // 針葉（扇状の細い筆致）
      c.lineWidth = 2.2;
      for (let i = 0; i < 70; i++) {
        const u = R() * 2 - 1;
        const bx = px + u * pw * 0.85, by = py + ph * 0.1;
        const ang = -Math.PI / 2 + u * 1.1 + (R() - 0.5) * 0.5;
        const len = ph * (0.7 + R() * 0.7) * (1 - Math.abs(u) * 0.35);
        c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(ang) * len, by + Math.sin(ang) * len); c.stroke();
      }
      c.lineWidth = 5;
      c.beginPath(); c.moveTo(px - pw * 0.9, py + ph * 0.1); c.quadraticCurveTo(px, py + ph * 0.3, px + pw * 0.9, py + ph * 0.1); c.stroke();
    }
    c.restore();
  }

  // ================================================================== 姫路城（連立式天守）ベクター描画
  drawHimejiCastle(c, x, baseY, s, opt = {}) {
    const mode = opt.mode || 'silhouette';
    const fill = opt.fill || '#1b1016';
    const lit = mode === 'lit';
    this._edgeColor = opt.edge || null;
    c.save();
    c.translate(x, baseY); c.scale(s, s);
    // 渡櫓
    // 渡櫓（大小天守をつなぐ）
    c.fillStyle = lit ? (opt.stone || fill) : fill;
    c.beginPath(); c.moveTo(-300, 0); c.quadraticCurveTo(-262, -24, -255, -52); c.lineTo(255, -52); c.quadraticCurveTo(262, -24, 300, 0); c.closePath(); c.fill();
    c.fillStyle = lit ? (opt.wall || fill) : fill;
    c.fillRect(-250, -84, 500, 34);
    this._roof(c, 0, -82, 540, 16, 8, lit ? (opt.roof || fill) : fill, lit);
    // 小天守
    c.save(); c.translate(-255, 0); c.scale(0.5, 0.5); this._keepBody(c, 3, mode, fill, opt); c.restore();
    c.save(); c.translate(235, 0); c.scale(0.44, 0.44); this._keepBody(c, 3, mode, fill, opt); c.restore();
    // 大天守
    this._keepBody(c, 5, mode, fill, opt);
    c.restore();
    this._edgeColor = null;
  }

  _keepBody(c, tiers, mode, fill, opt) {
    const lit = mode === 'lit';
    const wallCol = lit ? (opt.wall || '#d9cfc0') : fill;
    const roofCol = lit ? (opt.roof || '#1c1a20') : fill;
    c.fillStyle = lit ? (opt.stone || '#3a3030') : fill;
    c.beginPath();
    c.moveTo(-172, 0);
    c.quadraticCurveTo(-130, -30, -122, -78);
    c.lineTo(122, -78);
    c.quadraticCurveTo(130, -30, 172, 0);
    c.closePath(); c.fill();
    if (lit) {
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1;
      for (let i = 1; i < 6; i++) { const yy = -78 + i * 13; const k = (yy + 78) / 78; c.beginPath(); c.moveTo(-122 - 50 * k * k, yy); c.lineTo(122 + 50 * k * k, yy); c.stroke(); }
    }
    const widths = [210, 184, 156, 128, 100];
    const heights = [50, 44, 40, 36, 42];
    const off = 5 - tiers;
    let y = -78;
    const gables = []; // 破風は上層の壁より手前に描くため最後にまとめて描画
    for (let i = 0; i < tiers; i++) {
      const L = i + off;
      const ww = widths[L], wh = heights[L];
      c.fillStyle = wallCol;
      c.fillRect(-ww / 2, y - wh, ww, wh + 2);
      if (lit) {
        const nw = Math.max(2, Math.round(ww / 34));
        for (let k = 0; k < nw; k++) {
          const wx = -ww / 2 + (k + 0.5) * (ww / nw) - 6;
          c.fillStyle = (k + L) % 3 === 0 ? 'rgba(255,150,60,0.6)' : 'rgba(12,6,6,0.9)';
          c.fillRect(wx, y - wh * 0.62, 12, wh * 0.3);
        }
        // 下からの火の照り返し
        const lg = c.createLinearGradient(0, y, 0, y - wh);
        lg.addColorStop(0, 'rgba(255,110,40,0.28)'); lg.addColorStop(1, 'rgba(255,110,40,0)');
        c.fillStyle = lg; c.fillRect(-ww / 2, y - wh, ww, wh);
      }
      if (opt.lights && i < tiers - 1) {
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = opt.lights * 0.85;
        const nw = Math.max(2, Math.round(ww / 40));
        for (let k = 0; k < nw; k++) {
          if ((k * 7 + L * 3) % 3 === 0) continue;
          const wx = -ww / 2 + (k + 0.5) * (ww / nw);
          c.drawImage(this.emberSprite, wx - 6, y - wh * 0.55 - 6, 12, 12);
        }
        c.restore();
      }
      y -= wh;
      this._roof(c, 0, y + 6, ww + 54 - i * 2, 24, 16, roofCol, lit);
      if (i < tiers - 1) {
        if (L === 0 || L === 3) {
          { const yy = y; gables.push(() => { this._chidori(c, -ww * 0.26, yy - 8, ww * 0.34, 30, roofCol, wallCol, lit); this._chidori(c, ww * 0.26, yy - 8, ww * 0.34, 30, roofCol, wallCol, lit); }); }
        } else if (L === 1) {
          { const yy = y; gables.push(() => this._chidori(c, 0, yy - 10, ww * 0.62, 40, roofCol, wallCol, lit)); }
        } else {
          { const yy = y; gables.push(() => this._karahafu(c, 0, yy - 6, ww * 0.42, 24, roofCol, wallCol, lit)); }
        }
        y -= 14;
      } else {
        { const yy = y; gables.push(() => this._chidori(c, 0, yy - 10, ww * 0.8, 40, roofCol, wallCol, lit)); }
        c.fillStyle = roofCol;
        // 大棟（鯱なし・屋根の頂部に沿う細い棟）
        const rw = ww + 54 - i * 2;
        c.fillRect(-rw * 0.33, y - 21, rw * 0.66, 4);
      }
    }
    gables.forEach((g) => g());
  }

  _roof(c, cx, y, w, h, flare, col, lit) {
    const path = () => {
      c.beginPath();
      c.moveTo(cx - w / 2 - flare, y - h * 0.55);
      c.quadraticCurveTo(cx - w / 2 + w * 0.06, y + 2, cx - w / 2 + w * 0.16, y);
      c.lineTo(cx + w / 2 - w * 0.16, y);
      c.quadraticCurveTo(cx + w / 2 - w * 0.06, y + 2, cx + w / 2 + flare, y - h * 0.55);
    };
    c.fillStyle = col;
    path();
    c.quadraticCurveTo(cx + w * 0.36, y - h * 0.62, cx + w * 0.33, y - h);
    c.lineTo(cx - w * 0.33, y - h);
    c.quadraticCurveTo(cx - w * 0.36, y - h * 0.62, cx - w / 2 - flare, y - h * 0.55);
    c.closePath(); c.fill();
    if (lit || this._edgeColor) { c.strokeStyle = this._edgeColor || 'rgba(150,96,56,0.5)'; c.lineWidth = 1.3; path(); c.stroke(); }
  }
  // 最上層の入母屋屋根（正面＝平側から見る）：反りのある寄棟部＋上の切妻部、棟端に小さな妻（破風）、細い大棟、鯱なし
  _irimoyaTop(c, y, rw, ww, col) {
    const hw = rw / 2, fl = 16;
    c.fillStyle = col;
    // 寄棟部（下段）：軒反り→凹面の葺き上がり
    c.beginPath();
    c.moveTo(-hw - fl, y - 13);
    c.quadraticCurveTo(-hw + rw * 0.05, y + 2, -hw + rw * 0.16, y);
    c.lineTo(hw - rw * 0.16, y);
    c.quadraticCurveTo(hw - rw * 0.05, y + 2, hw + fl, y - 13);
    c.quadraticCurveTo(hw * 0.78, y - 16, hw * 0.6, y - 24);
    c.lineTo(-hw * 0.6, y - 24);
    c.quadraticCurveTo(-hw * 0.78, y - 16, -hw - fl, y - 13);
    c.closePath(); c.fill();
    // 切妻部（上段）：凹面で細い大棟へ
    c.beginPath();
    c.moveTo(-hw * 0.6, y - 23);
    c.quadraticCurveTo(-hw * 0.4, y - 30, -hw * 0.36, y - 44);
    c.lineTo(hw * 0.36, y - 44);
    c.quadraticCurveTo(hw * 0.4, y - 30, hw * 0.6, y - 23);
    c.closePath(); c.fill();
    // 棟端の妻（小さな三角の破風）：壁色の妻面に控えめな金の破風板
    [-1, 1].forEach((sd) => {
      c.fillStyle = '#1a0e0c';
      c.beginPath();
      c.moveTo(sd * hw * 0.37, y - 43);
      c.quadraticCurveTo(sd * hw * 0.41, y - 31, sd * hw * 0.52, y - 25);
      c.lineTo(sd * hw * 0.37, y - 25);
      c.closePath(); c.fill();
    });
    c.fillStyle = col;
    // 細い大棟（両端をわずかに反らせる）
    c.beginPath();
    c.moveTo(-hw * 0.41, y - 48); c.quadraticCurveTo(0, y - 46, hw * 0.41, y - 48);
    c.lineTo(hw * 0.37, y - 43.5); c.lineTo(-hw * 0.37, y - 43.5); c.closePath(); c.fill();
    // 控えめな金の縁（軒線・妻・棟）
    if (this._edgeColor) {
      c.strokeStyle = this._edgeColor; c.lineWidth = 1.1;
      c.beginPath();
      c.moveTo(-hw - fl, y - 13); c.quadraticCurveTo(-hw + rw * 0.05, y + 2, -hw + rw * 0.16, y);
      c.lineTo(hw - rw * 0.16, y); c.quadraticCurveTo(hw - rw * 0.05, y + 2, hw + fl, y - 13);
      [-1, 1].forEach((sd) => { c.moveTo(sd * hw * 0.37, y - 43); c.quadraticCurveTo(sd * hw * 0.41, y - 31, sd * hw * 0.52, y - 25); });
      c.stroke();
      c.globalAlpha = 0.5; c.beginPath(); c.moveTo(-hw * 0.41, y - 48); c.quadraticCurveTo(0, y - 46, hw * 0.41, y - 48); c.stroke(); c.globalAlpha = 1;
    }
  }
  _chidori(c, cx, y, w, h, roofCol, wallCol, lit) {
    c.fillStyle = roofCol;
    c.beginPath();
    c.moveTo(cx - w / 2 - 6, y + 6);
    c.quadraticCurveTo(cx - w * 0.2, y - h * 0.45, cx, y - h);
    c.quadraticCurveTo(cx + w * 0.2, y - h * 0.45, cx + w / 2 + 6, y + 6);
    c.closePath(); c.fill();
    if (!lit && this._edgeColor) {
      c.strokeStyle = this._edgeColor; c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(cx - w / 2 - 6, y + 6); c.quadraticCurveTo(cx - w * 0.2, y - h * 0.45, cx, y - h);
      c.quadraticCurveTo(cx + w * 0.2, y - h * 0.45, cx + w / 2 + 6, y + 6); c.stroke();
    }
    if (lit) {
      c.fillStyle = wallCol;
      c.beginPath();
      c.moveTo(cx - w * 0.34, y + 2);
      c.quadraticCurveTo(cx - w * 0.13, y - h * 0.4, cx, y - h * 0.72);
      c.quadraticCurveTo(cx + w * 0.13, y - h * 0.4, cx + w * 0.34, y + 2);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(150,96,56,0.5)'; c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(cx - w / 2 - 6, y + 6); c.quadraticCurveTo(cx - w * 0.2, y - h * 0.45, cx, y - h);
      c.quadraticCurveTo(cx + w * 0.2, y - h * 0.45, cx + w / 2 + 6, y + 6); c.stroke();
    }
  }
  // 唐破風：中央が盛り上がり両端が反る曲線、頂に小さな尖り（猪の目状の頂部）
  _karahafu(c, cx, y, w, h, col, wallCol, lit) {
    const outline = () => {
      c.beginPath();
      c.moveTo(cx - w / 2 - 8, y + 6);
      c.bezierCurveTo(cx - w * 0.32, y + 4, cx - w * 0.26, y - h, cx - 3, y - h);
      c.lineTo(cx, y - h - 4);
      c.lineTo(cx + 3, y - h);
      c.bezierCurveTo(cx + w * 0.26, y - h, cx + w * 0.32, y + 4, cx + w / 2 + 8, y + 6);
    };
    c.fillStyle = col; outline(); c.closePath(); c.fill();
    if (lit) {
      c.fillStyle = wallCol;
      c.beginPath();
      c.moveTo(cx - w * 0.34, y + 4);
      c.bezierCurveTo(cx - w * 0.22, y + 2, cx - w * 0.18, y - h * 0.72, cx, y - h * 0.72);
      c.bezierCurveTo(cx + w * 0.18, y - h * 0.72, cx + w * 0.22, y + 2, cx + w * 0.34, y + 4);
      c.closePath(); c.fill();
    }
    if (lit || this._edgeColor) {
      c.strokeStyle = this._edgeColor || 'rgba(150,96,56,0.5)'; c.lineWidth = 1.2;
      outline(); c.stroke();
    }
  }

  // ================================================================== 第二景：月下の湖と白露
  renderScene2(st) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    if (st > 0.8) this.triggerAudio('s2_hyoshigi', () => this._sfx('playHyoshigi'));
    const horizon = 650;
    const cam = easeInOut(clamp(st / 12));
    const mx = 1180, my = 270;
    const dropT = 6.2;

    c.save();
    c.translate(0, -cam * 30);
    const sky = c.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#03050c'); sky.addColorStop(0.6, '#0b1428'); sky.addColorStop(1, '#1d2a44');
    c.fillStyle = sky; c.fillRect(-20, -40, W + 40, horizon + 80);
    c.fillStyle = '#e8eefc';
    for (const s of this.stars) {
      if (s.y > horizon - 40) continue;
      c.globalAlpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(st * s.sp + s.ph));
      c.fillRect(s.x, s.y, s.r, s.r);
    }
    c.globalAlpha = 1;
    let g = c.createRadialGradient(mx, my, 40, mx, my, 560);
    g.addColorStop(0, 'rgba(220,230,255,0.4)'); g.addColorStop(0.25, 'rgba(160,180,230,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(mx - 560, my - 560, 1120, 1120);
    if (!this.moonTex) this.moonTex = this._makeMoon();
    c.drawImage(this.moonTex, mx - 96, my - 96, 192, 192);
    for (let i = 0; i < 3; i++) {
      const cx = ((st * (18 + i * 8) + i * 620 + 300) % (W + 800)) - 400;
      const cy = 230 + i * 80;
      c.save(); c.translate(cx, cy); c.scale(1, 0.05);
      const cg = c.createRadialGradient(0, 0, 0, 0, 0, 420);
      cg.addColorStop(0, 'rgba(70,84,116,0.6)'); cg.addColorStop(1, 'rgba(40,52,80,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(0, 0, 420, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    this.drawMountainLayer(3, horizon - 40, st * 2, ['rgba(30,42,68,0.95)', 'rgba(30,44,70,0.75)'], 0.8);
    this.drawMountainLayer(4, horizon + 2, st * 3, ['rgba(12,18,32,1)', 'rgba(12,18,32,1)'], 0.18);
    // 対岸の丘と城（丘の上に据え、水際へなだらかに下ろす）
    const shoreY = horizon + 6;
    const drawFarBank = () => {
      const col = '#0b111f';
      const top = horizon - 34;
      c.fillStyle = col;
      // 丘：城の全幅より広い台地と、水際へ下る斜面（城と同じ色で一体化）
      c.beginPath();
      c.moveTo(120, shoreY + 2);
      c.bezierCurveTo(240, shoreY - 4, 300, top + 10, 360, top + 2);
      c.quadraticCurveTo(375, top, 390, top);
      c.lineTo(665, top);
      c.quadraticCurveTo(680, top, 695, top + 3);
      c.bezierCurveTo(760, top + 12, 820, shoreY - 4, 960, shoreY + 2);
      c.closePath(); c.fill();
      // 城（石垣の裾は台地に 4 単位埋め込む）
      this.drawHimejiCastle(c, 525, top + 4, 0.4, { mode: 'silhouette', fill: col, lights: 0.9 });
      // 石垣の裾を覆う木立・藪（大小の丸い塊を重ねる）
      const bush = (x0, x1, y, h, seed) => {
        const Rb = mulberry32(seed);
        c.beginPath();
        c.moveTo(x0, y + 6);
        for (let x = x0; x <= x1; x += 5 + Rb() * 5) {
          const r = h * (0.5 + Rb() * 0.6);
          c.moveTo(x + r, y);
          c.arc(x, y - r * 0.3, r, 0, Math.PI * 2);
        }
        c.rect(x0, y - 2, x1 - x0, 10);
        c.fill();
      };
      bush(370, 445, top, 7, 11);    // 左小天守の裾
      bush(440, 610, top, 4.5, 12);  // 大天守・渡櫓の裾
      bush(600, 690, top, 7, 13);    // 右小天守の裾
      bush(330, 400, top + 8, 6, 14); // 斜面の肩
      bush(670, 740, top + 10, 6, 15);
    };
    drawFarBank();

    const water = c.createLinearGradient(0, horizon, 0, H);
    water.addColorStop(0, '#17243c'); water.addColorStop(0.4, '#0b1324'); water.addColorStop(1, '#03060d');
    c.fillStyle = water; c.fillRect(-20, shoreY, W + 40, H - shoreY + 80);
    // 水面への映り込み（上下反転・淡く揺らぐ）
    c.save();
    c.beginPath(); c.rect(0, shoreY, W, 260); c.clip();
    c.globalAlpha = 0.32;
    c.translate(0, shoreY * 2); c.scale(1, -1);
    c.translate(Math.sin(st * 1.3) * 2, 0);
    drawFarBank();
    c.restore();
    c.save();
    c.strokeStyle = 'rgba(23,36,60,0.9)'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const yy = shoreY + 6 + i * 9 + i * i * 0.6; const xo = Math.sin(st * 1.5 + i) * 12; c.beginPath(); c.moveTo(150 + xo, yy); c.lineTo(920 + xo, yy); c.stroke(); }
    // 水際の柔らかな靄
    const sg = c.createLinearGradient(0, shoreY - 14, 0, shoreY + 14);
    sg.addColorStop(0, 'rgba(60,76,110,0)'); sg.addColorStop(0.5, 'rgba(70,88,124,0.35)'); sg.addColorStop(1, 'rgba(60,76,110,0)');
    c.fillStyle = sg; c.fillRect(0, shoreY - 14, W, 28);
    c.restore();
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = '#dfe6ff';
    for (let i = 0; i < 48; i++) {
      const yy = horizon + 10 + i * i * 0.18 + i * 2.4;
      if (yy > H + 40) break;
      const k = i / 48;
      const wv = (50 + k * 170) * (0.55 + 0.45 * Math.sin(st * 1.7 + i * 1.3));
      const xo = Math.sin(st * 1.2 + i * 0.7) * (8 + k * 30);
      c.globalAlpha = (1 - k) * 0.45;
      c.fillRect(mx - wv / 2 + xo, yy, wv, 1.6 + k * 3);
    }
    c.restore();
    if (st > dropT) {
      const e = st - dropT;
      for (let r = 0; r < 4; r++) {
        const rr = (e - r * 0.45) * 150;
        if (rr <= 0) continue;
        c.strokeStyle = `rgba(210,222,255,${clamp(0.5 - rr / 900) * (1 - r * 0.18)})`;
        c.lineWidth = 2;
        c.beginPath(); c.ellipse(mx - 40, 900, rr, rr * 0.16, 0, 0, Math.PI * 2); c.stroke();
      }
    }
    c.restore();

    this.drawGrasses(st, dropT);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const f of this.fireflies) {
      const fx = f.x + Math.sin(st * f.sp + f.ph) * f.r, fy = f.y + Math.cos(st * f.sp * 1.3 + f.ph) * f.r * 0.4;
      const a = clamp(0.5 + 0.5 * Math.sin(st * 2.2 + f.ph * 3)) * smooth(0.5, 2.5, st);
      c.globalAlpha = a * 0.8;
      c.drawImage(this.glowSprite, fx - 9, fy - 9, 18, 18);
      c.globalAlpha = a * 0.22;
      c.drawImage(this.glowSprite, fx - 26, fy - 26, 52, 52);
    }
    c.restore();

    this.drawVerticalPoemLines({ lines: POEMS.s2, startX: 1700, topY: 170, fontSize: 60, columnSpacing: 98, curTime: st, startTime: 1.2, endTime: 11.6, style: 'moon' });
  }

  drawGrasses(st, dropT) {
    const c = this.ctx, H = this.V_HEIGHT;
    c.save();
    c.lineCap = 'round';
    let tip = null;
    // ススキ：根元からしなる細い稈＋弓なりの葉、先に垂れ下がる銀の穂（風の波が群れを渡り、穂先は遅れて揺れる）
    const gustAt = (x, tt) => { const g = 0.5 + 0.5 * Math.sin(tt * 0.85 - x * 0.0065) * Math.sin(tt * 0.31 - x * 0.002 + 1.3); return g * g; };
    this.grass.forEach((b, i) => {
      const hsh = (n) => { const v = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return v - Math.floor(v); };
      const h = b.h * (0.75 + hsh(1) * 0.45), bx = b.x, by = H + 20;
      const g = gustAt(bx, st), gL = gustAt(bx, st - 0.45);
      const flick = Math.sin(st * 2.3 + b.ph) * 0.025;
      const ang = b.lean * 0.45 + flick + g * 0.32 - 0.08;
      const angL = b.lean * 0.45 + Math.sin(st * 2.3 + b.ph - 0.7) * 0.03 + gL * 0.32 - 0.08;
      // 稈：上ほど曲がる二次曲線
      const x1 = bx + Math.sin(ang) * h * 0.92, y1 = by - Math.cos(ang) * h * 0.96;
      const cx = bx + Math.sin(ang) * h * 0.22, cy = by - h * 0.62;
      const shade = Math.round(5 + b.dark * 9);
      const dark = `rgb(${shade},${shade + 5},${shade + 11})`;
      c.strokeStyle = dark;
      // 根元の葉（長く弓なりに垂れる）
      c.lineWidth = 1.6 + hsh(2);
      c.beginPath();
      const nl = 2 + Math.floor(hsh(3) * 3);
      for (let k = 0; k < nl; k++) {
        const side = (k % 2 ? 1 : -1) * (0.6 + hsh(4 + k) * 0.8);
        const L = h * (0.35 + hsh(9 + k) * 0.3);
        const lw = Math.sin(st * 1.4 + b.ph + k) * 6 + g * 18;
        c.moveTo(bx, by);
        c.quadraticCurveTo(bx + side * L * 0.25 + lw * 0.4, by - L * 0.85, bx + side * L * 0.75 + lw, by - L * 0.35);
      }
      c.stroke();
      c.lineWidth = 1.1 + b.w * 0.18;
      c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke();
      // 穂：細い銀の糸を多数、先端から片側へ弓なりに垂らす
      if (hsh(5) < 0.7) {
        const tx = x1 - cx, ty = y1 - cy, tl = Math.hypot(tx, ty) || 1;
        const ux = tx / tl, uy = ty / tl;
        const dir = Math.sin(angL) >= 0 ? 1 : -1;
        const PL = 46 + hsh(6) * 50, n = 20 + Math.floor(hsh(7) * 14);
        const lagX = (gL - g) * 30;
        const lit = 0.13 + b.dark * 0.12;
        for (const [lw, al] of [[3.2, 0.045], [0.6, 1]]) {
          c.lineWidth = lw;
          c.strokeStyle = `rgba(196,206,232,${al === 1 ? lit : al})`;
          c.beginPath();
          for (let k = 0; k < n; k++) {
            const f = k / (n - 1);
            const L = PL * (0.55 + 0.45 * Math.sin(f * Math.PI)) * (0.6 + hsh(20 + k) * 0.6);
            const fl = Math.sin(st * 4.2 + k * 1.7 + b.ph) * 3.5 * (0.5 + gL);
            const ox = x1 - ux * f * 26, oy = y1 - uy * f * 26;   // 穂軸に沿って枝分かれ
            const ex = ox + dir * L * (0.2 + hsh(40 + k) * 0.45) + lagX + fl, ey = oy + L * (0.35 + 0.5 * hsh(60 + k)) - PL * 0.12;
            c.moveTo(ox, oy);
            c.quadraticCurveTo(ox + ux * L * 0.3 + dir * L * 0.12, oy + uy * L * 0.3, ex, ey);
          }
          c.stroke();
        }
      }
      if (i === 47) tip = { x: x1, y: y1 };
    });
    if (tip) {
      c.globalCompositeOperation = 'lighter';
      const dx = tip.x;
      let dy = tip.y + 6;
      if (st > dropT - 0.6) { const e = st - (dropT - 0.6); dy += 900 * e * e; }
      if (dy < 900) {
        const tw = 0.7 + 0.3 * Math.sin(st * 6);
        c.globalAlpha = tw;
        c.drawImage(this.glowSprite, dx - 18, dy - 18, 36, 36);
        c.globalAlpha = 1; c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(dx, dy, 3, 0, Math.PI * 2); c.fill();
        c.strokeStyle = `rgba(255,255,255,${0.45 * tw})`; c.lineWidth = 1;
        c.beginPath(); c.moveTo(dx - 26, dy); c.lineTo(dx + 26, dy); c.moveTo(dx, dy - 26); c.lineTo(dx, dy + 26); c.stroke();
      }
    }
    c.restore();
  }

  // ================================================================== 第三景：炎上の天守と群雄家紋
  renderScene3(st) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    this.triggerAudio('s3_taiko', () => this._sfx('playTaiko', 1.0));
    if (st > 5.5) this.triggerAudio('s3_taiko2', () => this._sfx('playTaiko', 0.8));
    const cam = easeInOut(clamp(st / 14));

    const sky = c.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#07030a'); sky.addColorStop(0.45, '#2c0a0c'); sky.addColorStop(0.75, '#7a1c0e'); sky.addColorStop(1, '#d0561c');
    c.fillStyle = sky; c.fillRect(0, 0, W, H);


    c.save();
    for (let i = 0; i < 6; i++) {
      const ph = (st * 0.06 + i / 6) % 1;
      const x = 1000 + Math.sin(i * 2.1) * 560 + ph * 140;
      const y = 800 - ph * 700;
      const s = 240 + ph * 380;
      c.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
      c.drawImage(this.smokeSprite, x - s, y - s, s * 2, s * 2);
    }
    c.restore();

    c.save();
    const z = 1 + cam * 0.1;
    c.translate(1060, 1000); c.scale(z, z); c.translate(-1060, -1000);
    this.drawAzuchi(c, 1080, 940, 1.0, st);
    c.restore();
    const fl = 0.8 + 0.2 * Math.sin(st * 9) * Math.sin(st * 5.3);
    const g = c.createLinearGradient(0, H, 0, H * 0.3);
    g.addColorStop(0, `rgba(255,120,30,${0.5 * fl})`); g.addColorStop(0.5, `rgba(200,50,10,${0.2 * fl})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
    this.drawFlames(st);
    // 平らな前景（炎に照らされた庭の地面）
    const gy0 = 940;
    const gg = c.createLinearGradient(0, gy0, 0, H);
    gg.addColorStop(0, '#2a120c'); gg.addColorStop(0.25, '#140806'); gg.addColorStop(1, '#070304');
    c.fillStyle = gg; c.fillRect(0, gy0, W, H - gy0);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(255,120,40,${0.28 * fl})`; c.fillRect(0, gy0, W, 1.5); c.restore();
    // 能舞台（本舞台・橋掛り・鏡板の老松・白洲）で敦盛を舞う信長
    c.save(); c.translate(0, -40);         // 舞台を地面（y=940）に据える
    this.drawNohStage(c, st, fl, false);
    this.drawNobunagaDancer(c, 1625, 928, 0.8, st);
    this.drawNohStage(c, st, fl, true);
    c.restore();
    this.drawVerticalPoemLines({ lines: POEMS.s3, startX: 470, topY: 160, fontSize: 62, columnSpacing: 104, curTime: st, startTime: 1.0, endTime: 13.6, style: 'fire', charInterval: 0.2 });
  }

  drawFlames(st) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const x = (i / 13) * W + Math.sin(i * 7.1) * 60;
      const f = 0.6 + 0.4 * Math.sin(st * (5 + (i % 3)) + i * 1.7) * Math.sin(st * 3.1 + i);
      const r = (170 + (i % 4) * 45) * (0.85 + 0.25 * f);
      c.globalAlpha = 0.35 + 0.25 * f;
      c.drawImage(this.emberSprite, x - r, H - 120 - r * 0.9, r * 2, r * 2);
    }
    c.restore();
  }

  // 織田木瓜：五つの丸い弁（瓜の切り口）を二重の輪郭で描き、中心に唐花
  drawOdaMokko(c, x, y, r, col, bg) {
    const lobes = (k) => {
      // 五弁の外形：弁ごとに円弧、弁と弁の間は内側へ切れ込む
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        const lx = Math.cos(a) * r * 0.5 * k, ly = Math.sin(a) * r * 0.5 * k;
        const lr = r * 0.5 * k;
        c.moveTo(lx + lr, ly);
        c.arc(lx, ly, lr, 0, Math.PI * 2);
      }
      c.fill('nonzero');
    };
    c.save();
    c.translate(x, y);
    c.fillStyle = col; lobes(1.0);
    c.fillStyle = bg; lobes(0.86);
    // 弁の境の切れ込み線
    c.strokeStyle = col; c.lineWidth = r * 0.05; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + ((i + 0.5) / 5) * Math.PI * 2;
      c.beginPath(); c.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5); c.lineTo(Math.cos(a) * r * 0.79, Math.sin(a) * r * 0.79); c.stroke();
    }
    c.fillStyle = col; lobes(0.62);
    c.fillStyle = bg; lobes(0.5);
    // 唐花（五弁、先端に切れ込み）
    c.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      c.save();
      c.rotate((i / 5) * Math.PI * 2);
      const pr = r * 0.2;
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(-pr * 0.75, -pr * 0.35, -pr * 0.7, -pr * 1.15, -pr * 0.2, -pr * 1.2);
      c.lineTo(0, -pr * 0.98);
      c.lineTo(pr * 0.2, -pr * 1.2);
      c.bezierCurveTo(pr * 0.7, -pr * 1.15, pr * 0.75, -pr * 0.35, 0, 0);
      c.fill();
      // 弁間の萼（細い剣先）
      c.rotate(Math.PI / 5);
      c.beginPath(); c.moveTo(-r * 0.025, -r * 0.08); c.lineTo(0, -r * 0.24); c.lineTo(r * 0.025, -r * 0.08); c.closePath(); c.fill();
      c.restore();
    }
    c.fillStyle = bg; c.beginPath(); c.arc(0, 0, r * 0.075, 0, Math.PI * 2); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.04, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // 家紋（線描・塗り）
  drawKamon(c, type, x, y, r, col) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = col; c.fillStyle = col; c.lineWidth = r * 0.07; c.lineJoin = 'round';
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    if (type === 'hishi') {
      const d = r * 0.34;
      [[0, -d], [d, 0], [0, d], [-d, 0]].forEach(([dx, dy]) => {
        c.beginPath(); c.moveTo(dx, dy - d * 0.9); c.lineTo(dx + d * 0.9, dy); c.lineTo(dx, dy + d * 0.9); c.lineTo(dx - d * 0.9, dy); c.closePath(); c.fill();
      });
    } else if (type === 'mokko') {
      c.lineWidth = r * 0.06;
      for (let i = 0; i < 5; i++) {
        c.save(); c.rotate((i / 5) * Math.PI * 2);
        c.beginPath(); c.ellipse(0, -r * 0.45, r * 0.26, r * 0.34, 0, 0, Math.PI * 2); c.stroke();
        c.restore();
      }
      c.beginPath(); c.arc(0, 0, r * 0.14, 0, Math.PI * 2); c.fill();
    } else if (type === 'mitsudomoe') {
      for (let i = 0; i < 3; i++) {
        c.save(); c.rotate((i / 3) * Math.PI * 2);
        c.beginPath(); c.arc(0, -r * 0.38, r * 0.27, 0, Math.PI * 2); c.fill();
        c.beginPath();
        c.moveTo(r * 0.27, -r * 0.38);
        c.quadraticCurveTo(r * 0.5, r * 0.25, -r * 0.15, r * 0.66);
        c.quadraticCurveTo(r * 0.18, r * 0.1, -r * 0.27, -r * 0.38);
        c.fill();
        c.restore();
      }
    } else if (type === 'jumonji') {
      c.lineWidth = r * 0.2; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(-r * 0.7, 0); c.lineTo(r * 0.7, 0); c.moveTo(0, -r * 0.7); c.lineTo(0, r * 0.7); c.stroke();
    } else if (type === 'ichimonji') {
      c.fillRect(-r * 0.62, -r * 0.52, r * 1.24, r * 0.18);
      [[0, -r * 0.02], [-r * 0.36, r * 0.38], [r * 0.36, r * 0.38]].forEach(([dx, dy]) => { c.beginPath(); c.arc(dx, dy, r * 0.2, 0, Math.PI * 2); c.fill(); });
    } else if (type === 'kuyo') {
      c.beginPath(); c.arc(0, 0, r * 0.27, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        c.beginPath(); c.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.19, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }

  // ================================================================== 敦盛を舞う信長（ベクター・シルエット）
  // 角度はラジアン。腕：0=真下、+で前方(右)へ振り上げ。キーフレームを smoothstep で補間する。
  _nobunagaPose(st) {
    const K = [
      // t, 向き(1=右向き,-1=左), 体傾, 右上腕, 右前腕, 左上腕, 左前腕, 扇角, 腰沈み, 歩幅, x移動
      [0.0, 1, 0.02, 0.9, 0.5, -0.35, -0.9, 0.2, 0, 34, 0],
      [2.4, 1, -0.06, 2.6, 0.35, -0.9, -0.6, 1.2, 6, 40, 0],
      [4.6, 1, 0.0, 2.9, 0.1, -1.3, -0.2, 1.6, 4, 38, -10],
      [6.6, -1, 0.04, 1.6, 0.4, -0.6, -1.2, 0.6, 12, 46, -24],
      [8.6, -1, 0.1, 1.45, 0.05, -0.3, -1.4, 0.0, 22, 64, -50],
      [10.6, 1, -0.04, 2.2, 0.9, -0.8, -0.8, 2.2, 10, 44, -30],
      [12.6, 1, 0.02, 0.9, 0.5, -0.35, -0.9, 0.2, 0, 34, -20]
    ];
    const t = clamp(st, 0, K[K.length - 1][0]);
    let i = 0; while (i < K.length - 2 && t > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1];
    const u = easeInOut(clamp((t - a[0]) / (b[0] - a[0])));
    const v = a.map((x, j) => lerp(x, b[j], u));
    // 向きの反転は横幅の縮み（3/4回転）で見せる
    const face = Math.sign(v[1] || 1) * Math.max(0.62, Math.abs(v[1]));
    return { face, lean: v[2], rU: v[3], rL: v[4], lU: v[5], lL: v[6], fan: v[7], sink: v[8], stance: v[9], dx: v[10] };
  }

  // 能舞台：炎に縁取られた暗いシルエット。front=false で奥（鏡板・後柱・床・橋掛り）、true で手前（前柱・屋根）
  // ================================================================== 安土城天主（炎上）：山上の高石垣、不整形の下層、朱の八角五層、金の六層（入母屋・鯱なし）
  _buildAzuchi() {
    const sc = this.scale, Wl = 1300, Hl = 820;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(Wl * sc); cv.height = Math.ceil(Hl * sc);
    const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(Wl / 2, Hl); c.lineJoin = 'round';
    const roof = '#0b0507', wall = '#140a0a', stone = '#1a0c0c', gold = 'rgba(160,118,60,0.55)';
    const win = (x, y, w, h, n, on) => { for (let k = 0; k < n; k++) { c.fillStyle = (k + on) % 3 === 0 ? 'rgba(40,14,8,0.95)' : 'rgba(255,130,44,0.75)'; c.fillRect(x + (k + 0.5) * (w / n) - 7, y, 14, h); } };
    // 安土山：不規則な稜線の山容。地面(0)から天主台の下まで一続き
    const R = mulberry32(1579);
    const nz = []; for (let i = 0; i < 64; i++) nz.push(R());
    const noise = (x) => { const u = (x + 700) / 1400 * 63, i = Math.floor(u), f = u - i, a = nz[Math.max(0, Math.min(63, i))], b = nz[Math.max(0, Math.min(63, i + 1))]; return a + (b - a) * f * f * (3 - 2 * f); };
    const ridge = (x) => { const ax = Math.abs(x); // 山頂の平場→不均一な斜面
      let y = ax < 240 ? -196 : -196 + 196 * Math.pow(Math.min(1, (ax - 240) / 470), 1.25);
      if (x < 0) y -= Math.sin((ax - 250) * 0.02) * 10 * (ax > 250); // 左右非対称
      return y + (ax > 250 ? (noise(x) - 0.5) * 34 : 0); };
    // 樹冠の輪郭：針葉樹の尖りと広葉樹の不規則な起伏
    const canopy = (x0, x1, off, amp, seed) => {
      const r = mulberry32(seed); const pts = [];
      const B = (x) => ridge(x) + off;
      for (let x = x0; x <= x1;) {
        if (r() < 0.45) { const w = 5 + r() * 7, h = (8 + r() * 12) * amp; pts.push([x, B(x)], [x + w * 0.5, B(x + w * 0.5) - h], [x + w, B(x + w)]); x += w; }
        else { const w = 7 + r() * 10; [[0, 2], [0.3, 4 + r() * 6], [0.55, 2 + r() * 4], [0.8, 5 + r() * 5], [1, 1]].forEach(([f, h]) => pts.push([x + w * f, B(x + w * f) - h * amp])); x += w; }
      }
      return pts;
    };
    const fillBand = (pts, yb, cTop, cBot, rim) => {
      const g = c.createLinearGradient(0, -230, 0, yb); g.addColorStop(0, cTop); g.addColorStop(1, cBot);
      c.fillStyle = g; c.beginPath(); c.moveTo(pts[0][0], yb); pts.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(pts[pts.length - 1][0], yb); c.closePath(); c.fill();
      if (rim) { c.strokeStyle = rim; c.lineWidth = 1; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y - 0.5) : c.moveTo(x, y - 0.5))); c.stroke(); }
    };
    // 山の地肌（遠景の塊）
    fillBand(canopy(-700, 700, 4, 0.7, 7), 6, '#1e0d0b', '#0f0607');
    // 中腹の石垣の段（木立に一部隠れる）
    c.fillStyle = stone;
    const terr = (x0, x1, h) => { const yb = ridge((x0 + x1) / 2) + 14; c.beginPath(); c.moveTo(x0 - 6, yb); c.lineTo(x0, yb - h); c.lineTo(x1, yb - h); c.lineTo(x1 + 6, yb); c.closePath(); c.fill(); };
    terr(-360, -290, 20); terr(300, 380, 20); terr(-470, -410, 16);
    // 中腹〜裾の樹林（下ほど暗い）
    fillBand(canopy(-700, 700, 30, 1, 11), 6, '#170a09', '#0a0405');
    fillBand(canopy(-700, 700, 78, 1.1, 13).map(([x, y]) => [x, Math.min(y, 2)]), 6, '#100607', '#070304');
    // 裾の煙・霞
    const hz = c.createLinearGradient(0, -60, 0, 0);
    hz.addColorStop(0, 'rgba(120,50,30,0)'); hz.addColorStop(1, 'rgba(120,50,30,0.28)');
    c.fillStyle = hz; c.fillRect(-650, -60, 1300, 60);
    this._azRidge = ridge; this._azCanopy = canopy; this._azBand = fillBand;
    // 天主台の高石垣（不整形）
    c.fillStyle = stone; c.beginPath(); c.moveTo(-256, -188); c.quadraticCurveTo(-218, -250, -205, -318); c.lineTo(190, -322); c.quadraticCurveTo(206, -258, 246, -188); c.closePath(); c.fill();
    // 台座の足元：山頂の樹冠を重ねて継ぎ目を消す
    fillBand(canopy(-290, 290, 2, 0.8, 17), -150, '#1a0b0a', '#140808');
    c.strokeStyle = 'rgba(60,24,16,0.5)'; c.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const yy = -322 + i * 20; c.beginPath(); c.moveTo(-205 - i * 7, yy); c.lineTo(190 + i * 8, yy); c.stroke(); }
    this._edgeColor = gold;
    const gables = [];
    // 一〜三層：黒漆の不整形な下層（張り出し付き）
    let y = -320;
    const tiers = [[-190, 360, 66], [-160, 300, 58], [-130, 250, 52]];
    tiers.forEach(([lx, w, h], i) => {
      c.fillStyle = wall; c.fillRect(lx, y - h, w, h + 2);
      if (i === 0) { c.fillRect(lx + w - 10, y - h + 18, 60, h - 16); this._roof(c, lx + w + 22, y - h + 22, 82, 16, 10, roof, true); } // 張り出し
      win(lx + 10, y - h * 0.62, w - 20, h * 0.3, Math.round(w / 40), i);
      y -= h;
      const cx = lx + w / 2;
      this._roof(c, cx, y + 6, w + 60, 24, 16, roof, true);
      const yy = y;
      if (i === 0) gables.push(() => { this._chidori(c, cx - w * 0.25, yy - 6, w * 0.3, 32, roof, wall, true); this._chidori(c, cx + w * 0.22, yy - 6, w * 0.26, 30, roof, wall, true); });
      if (i === 2) gables.push(() => this._karahafu(c, cx, yy - 4, w * 0.4, 24, roof, wall, true));
      y -= 12;
    });
    gables.forEach((g) => g());
    // 五層：朱漆の八角（正面と斜めの二面が見える）
    const ow = 170, oh = 56, ox = -5;
    c.fillStyle = '#6a2418'; c.fillRect(ox - ow * 0.3, y - oh, ow * 0.6, oh + 2);
    c.fillStyle = '#4a180f';
    c.beginPath(); c.moveTo(ox - ow * 0.3, y + 2); c.lineTo(ox - ow * 0.5, y - 6); c.lineTo(ox - ow * 0.5, y - oh + 6); c.lineTo(ox - ow * 0.3, y - oh); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(ox + ow * 0.3, y + 2); c.lineTo(ox + ow * 0.5, y - 6); c.lineTo(ox + ow * 0.5, y - oh + 6); c.lineTo(ox + ow * 0.3, y - oh); c.closePath(); c.fill();
    c.strokeStyle = gold; c.lineWidth = 1;
    c.strokeRect(ox - ow * 0.3, y - oh, ow * 0.6, oh); 
    c.fillStyle = 'rgba(255,130,44,0.7)'; c.fillRect(ox - 20, y - oh * 0.6, 14, oh * 0.32); c.fillRect(ox + 8, y - oh * 0.6, 14, oh * 0.32);
    y -= oh;
    // 八角の屋根（反りの強い八角錐台）
    c.fillStyle = roof;
    c.beginPath(); c.moveTo(ox - ow * 0.5 - 30, y - 6); c.quadraticCurveTo(ox - ow * 0.4, y + 8, ox - ow * 0.25, y + 6); c.lineTo(ox + ow * 0.25, y + 6); c.quadraticCurveTo(ox + ow * 0.4, y + 8, ox + ow * 0.5 + 30, y - 6);
    c.quadraticCurveTo(ox + ow * 0.4, y - 12, ox + ow * 0.3, y - 22); c.lineTo(ox - ow * 0.3, y - 22); c.quadraticCurveTo(ox - ow * 0.4, y - 12, ox - ow * 0.5 - 30, y - 6); c.closePath(); c.fill();
    c.strokeStyle = gold; c.beginPath(); c.moveTo(ox - ow * 0.5 - 30, y - 6); c.quadraticCurveTo(ox - ow * 0.4, y + 8, ox - ow * 0.25, y + 6); c.lineTo(ox + ow * 0.25, y + 6); c.quadraticCurveTo(ox + ow * 0.4, y + 8, ox + ow * 0.5 + 30, y - 6); c.stroke();
    y -= 20;
    // 六層：金箔の方形（入母屋屋根）
    const gw = 112, gh = 50;
    c.fillStyle = '#7a5a26'; c.fillRect(ox - gw / 2, y - gh, gw, gh + 2);
    c.fillStyle = 'rgba(30,14,6,0.6)'; for (let k = 0; k < 4; k++) c.fillRect(ox - gw / 2 + 8 + k * 26, y - gh + 10, 18, gh - 20); // 金の扉間の柱影
    c.fillStyle = 'rgba(255,170,70,0.55)'; c.fillRect(ox - 9, y - gh * 0.62, 18, gh * 0.3);
    y -= gh;
    c.save(); c.translate(ox, 0); this._irimoyaTop(c, y + 6, gw + 52, gw, roof); c.restore();
    this._edgeColor = null;
    this._azuchi = { cv, sc, Wl, Hl };
  }
  drawAzuchi(c, x, baseY, s, st) {
    if (!this._azuchi || this._azuchi.sc !== this.scale) this._buildAzuchi();
    const A = this._azuchi;
    c.drawImage(A.cv, x - A.Wl * s / 2, baseY - A.Hl * s, A.Wl * s, A.Hl * s);
    // 窓から噴く炎（加算スプライトのみ）
    c.save(); c.globalCompositeOperation = 'lighter';
    [[-120, -350], [60, -350], [-60, -420], [90, -420], [-20, -478], [10, -560], [0, -640]].forEach(([lx, ly], i) => {
      const f = 0.6 + 0.4 * Math.sin(st * (5 + i) + i * 2.3);
      const r = (40 + (i % 3) * 16) * f * s;
      c.globalAlpha = 0.6 * f;
      c.drawImage(this.emberSprite, x + lx * s - r * 0.7, baseY + ly * s - r * 1.6, r * 1.4, r * 2.4);
    });
    c.restore();
  }

  drawNohStage(c, st, fl, front) {
    const L = 1430, R = 1820, floor = 928, top = 590, dark = '#080304', mid = '#0e0605';
    const rim = `rgba(255,130,50,${0.5 * fl})`;
    c.save(); c.lineJoin = 'round';
    if (!front) {
      // 橋掛り（左奥へ）：床・欄干・小屋根
      const hb = floor - 14;
      c.fillStyle = dark;
      c.beginPath(); c.moveTo(1150, hb - 4); c.lineTo(L + 10, hb - 2); c.lineTo(L + 10, hb + 22); c.lineTo(1150, hb + 20); c.closePath(); c.fill();
      for (let x = 1154; x < L; x += 44) c.fillRect(x, hb + 18, 6, floor + 52 - hb - 18);      // 橋掛りの束柱
      c.fillRect(1146, floor + 46, L - 1146, 6);                                                 // 地覆
      c.strokeStyle = dark; c.lineWidth = 3;
      c.beginPath(); c.moveTo(1150, hb - 30); c.lineTo(L, hb - 26);
      for (let x = 1160; x < L; x += 46) { c.moveTo(x, hb - 30 + (x - 1150) * 0.014); c.lineTo(x, hb); }
      c.stroke();
      c.fillRect(1150, hb - 150, 5, 150); c.fillRect(1290, hb - 152, 5, 152);
      c.beginPath(); c.moveTo(1136, hb - 146); c.lineTo(L + 10, hb - 158); c.lineTo(L + 10, hb - 172); c.lineTo(1150, hb - 164); c.closePath(); c.fill();
      c.strokeStyle = rim; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(1150, hb - 31); c.lineTo(L, hb - 27); c.moveTo(1150, hb - 165); c.lineTo(L + 10, hb - 173); c.stroke();
      // 鏡板（老松がうっすら）
      c.fillStyle = '#1c0e0a'; c.fillRect(L + 18, top + 70, R - L - 36, floor - top - 70);
      c.save(); c.globalAlpha = 0.35;
      c.strokeStyle = '#3a2a14'; c.lineWidth = 10; c.lineCap = 'round';
      const px = (L + R) / 2 + 20;
      c.beginPath(); c.moveTo(px, floor); c.quadraticCurveTo(px - 30, floor - 120, px + 10, floor - 200); c.quadraticCurveTo(px + 40, floor - 250, px - 20, floor - 290); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(px + 6, floor - 200); c.lineTo(px + 120, floor - 230); c.moveTo(px - 10, floor - 150); c.lineTo(px - 130, floor - 170); c.moveTo(px - 16, floor - 280); c.lineTo(px - 90, floor - 300); c.stroke();
      c.fillStyle = '#2e3a1a';
      [[px + 120, floor - 236, 60], [px - 130, floor - 176, 55], [px - 90, floor - 306, 48], [px + 20, floor - 300, 40]].forEach(([x, y, r]) => { c.beginPath(); c.ellipse(x, y, r, r * 0.32, 0, 0, Math.PI * 2); c.fill(); });
      c.restore();
      // 後柱
      c.fillStyle = mid; c.fillRect(L + 14, top + 60, 10, floor - top - 60); c.fillRect(R - 24, top + 60, 10, floor - top - 60);
      // 檜の床（高床）と白洲
      c.fillStyle = dark;
      c.beginPath(); c.moveTo(L - 20, floor); c.lineTo(R + 20, floor); c.lineTo(R + 26, floor + 34); c.lineTo(L - 26, floor + 34); c.closePath(); c.fill();
      c.fillStyle = `rgba(150,110,80,${0.18 + 0.08 * fl})`; c.fillRect(L - 20, floor - 1, R - L + 40, 2); // 床面の照り
      // 床下の束柱と地覆（地面 floor+52 に接地）
      c.fillStyle = dark; c.fillRect(L - 30, floor + 46, R - L + 60, 6);
      for (let x = L - 18; x <= R + 12; x += 39) c.fillRect(x, floor + 34, 7, 14);
      c.fillStyle = 'rgba(40,16,10,0.9)'; c.fillRect(L - 10, floor + 34, R - L + 20, 12); // 床下の闇
      c.fillStyle = dark; for (let x = L - 18; x <= R + 12; x += 39) c.fillRect(x, floor + 34, 7, 14);
      c.fillStyle = 'rgba(200,190,175,0.16)'; c.fillRect(1090, floor + 54, 830, 12);  // 白洲（舞台の前の地面）
      c.fillStyle = 'rgba(225,215,200,0.08)';
      for (let i = 0; i < 60; i++) c.fillRect(1100 + ((i * 137) % 810), floor + 55 + (i * 7) % 10, 2, 1.5);
      c.strokeStyle = rim; c.lineWidth = 1.2; c.beginPath(); c.moveTo(L - 20, floor); c.lineTo(R + 20, floor); c.stroke();
    } else {
      // 前柱（目付柱・脇柱）
      c.fillStyle = dark; c.fillRect(L - 14, top + 40, 14, floor - top - 40); c.fillRect(R, top + 40, 14, floor - top - 40);
      c.fillStyle = rim; c.fillRect(L - 14, top + 40, 1.5, floor - top - 40); c.fillRect(R + 12.5, top + 40, 1.5, floor - top - 40);
      // 入母屋の屋根
      const cx = (L + R) / 2, hw = (R - L) / 2 + 50, y = top + 44;
      c.fillStyle = dark;
      c.beginPath();
      c.moveTo(cx - hw - 14, y - 14); c.quadraticCurveTo(cx - hw + 30, y + 4, cx - hw + 70, y); c.lineTo(cx + hw - 70, y); c.quadraticCurveTo(cx + hw - 30, y + 4, cx + hw + 14, y - 14);
      c.quadraticCurveTo(cx + hw * 0.75, y - 22, cx + hw * 0.55, y - 38); c.lineTo(cx - hw * 0.55, y - 38); c.quadraticCurveTo(cx - hw * 0.75, y - 22, cx - hw - 14, y - 14);
      c.closePath(); c.fill();
      // 正面の破風（妻）
      c.beginPath(); c.moveTo(cx - hw * 0.5, y - 34); c.quadraticCurveTo(cx - hw * 0.2, y - 60, cx, y - 92); c.quadraticCurveTo(cx + hw * 0.2, y - 60, cx + hw * 0.5, y - 34); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(150,100,60,0.5)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(cx - hw - 14, y - 14); c.quadraticCurveTo(cx - hw + 30, y + 4, cx - hw + 70, y); c.lineTo(cx + hw - 70, y); c.quadraticCurveTo(cx + hw - 30, y + 4, cx + hw + 14, y - 14);
      c.moveTo(cx - hw * 0.5, y - 34); c.quadraticCurveTo(cx - hw * 0.2, y - 60, cx, y - 92); c.quadraticCurveTo(cx + hw * 0.2, y - 60, cx + hw * 0.5, y - 34); c.stroke();
      c.fillStyle = dark; c.fillRect(L - 20, y, R - L + 40, 8); // 梁
    }
    c.restore();
  }

  drawNobunagaDancer(c, x, baseY, s, st) {
    const P = this._nobunagaPose(st);
    const dark = '#070304';
    const flick = 0.75 + 0.25 * Math.sin(st * 9) * Math.sin(st * 4.3);
    c.save();
    c.translate(x + P.dx, baseY);
    c.scale(s * P.face, s);
    c.fillStyle = dark; c.strokeStyle = dark;
    c.lineJoin = 'round'; c.lineCap = 'round';
    // 炎の縁取り光（背後の炎に照らされた輪郭）
    c.shadowColor = `rgba(255,120,30,${0.85 * flick})`;
    c.shadowBlur = 16 * this.scale;

    const sink = P.sink;
    const hipY = -158 + sink, shY = -262 + sink;
    const lean = P.lean;
    const shX = Math.sin(lean) * 100;               // 上体の傾きによる肩の前後
    // 袴（裾広がり・ひだ）
    const st2 = P.stance;
    c.beginPath();
    c.moveTo(-26, hipY - 6);
    c.lineTo(26, hipY - 6);
    c.quadraticCurveTo(st2 + 30, -60, st2 + 40, 0);
    c.lineTo(8, 0); c.lineTo(4, -40 + sink * 0.5); c.lineTo(-4, -40 + sink * 0.5); c.lineTo(-8, 0);
    c.lineTo(-st2 - 34, 0);
    c.quadraticCurveTo(-st2 - 26, -60, -26, hipY - 6);
    c.closePath(); c.fill();
    // 足袋
    c.beginPath(); c.ellipse(st2 + 30, -2, 16, 6, 0, 0, Math.PI * 2); c.ellipse(-st2 - 22, -2, 15, 6, 0, 0, Math.PI * 2); c.fill();
    // 胴
    c.beginPath();
    c.moveTo(-22, hipY); c.lineTo(22, hipY);
    c.lineTo(shX + 24, shY + 6); c.lineTo(shX - 24, shY + 6);
    c.closePath(); c.fill();
    // 肩衣（張りのある翼状の肩）
    c.beginPath();
    c.moveTo(shX - 20, shY + 34);
    c.lineTo(shX - 68, shY - 2); c.lineTo(shX - 60, shY - 10); c.lineTo(shX - 8, shY - 6);
    c.lineTo(shX + 8, shY - 6); c.lineTo(shX + 60, shY - 10); c.lineTo(shX + 68, shY - 2);
    c.lineTo(shX + 20, shY + 34);
    c.closePath(); c.fill();
    // 頭・髷
    const hx = shX + 4, hy = shY - 32;
    c.beginPath(); c.moveTo(shX - 6, shY - 4); c.lineTo(shX + 8, shY - 4); c.lineTo(hx + 6, hy + 10); c.lineTo(hx - 6, hy + 10); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(hx, hy, 15, 18, 0.1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(hx - 6, hy - 16); c.quadraticCurveTo(hx + 4, hy - 30, hx + 20, hy - 22); c.lineTo(hx + 18, hy - 17); c.quadraticCurveTo(hx + 6, hy - 22, hx + 2, hy - 14); c.closePath(); c.fill(); // 茶筅髷
    c.beginPath(); c.moveTo(hx + 14, hy + 2); c.lineTo(hx + 19, hy + 6); c.lineTo(hx + 13, hy + 8); c.fill(); // 鼻先

    // 腕＋袖（袖は前腕から垂れる）
    const arm = (sx, sy, up, low, sleeveSide, isFan) => {
      const ex = sx + Math.sin(up) * 58, ey = sy + Math.cos(up) * 58;
      const ang2 = up + low;
      const wx = ex + Math.sin(ang2) * 54, wy = ey + Math.cos(ang2) * 54;
      c.lineWidth = 15; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(wx, wy); c.stroke();
      // 袖：肘〜手首の下側へ垂れる布
      c.beginPath();
      c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(wx, wy);
      c.quadraticCurveTo((ex + wx) / 2, Math.max(ey, wy) + 46, ex - 6, Math.max(ey, wy) + 40);
      c.quadraticCurveTo(sx, sy + 40, sx, sy);
      c.closePath(); c.fill();
      c.beginPath(); c.arc(wx, wy, 7, 0, Math.PI * 2); c.fill();
      if (isFan) {
        // 開いた扇（要を手元に、骨と地紙）
        const fa = ang2 + P.fan * 0.4 - 0.2;
        const R1 = 70, R0 = 22, spread = 1.05;
        c.beginPath();
        c.moveTo(wx, wy);
        for (let k = 0; k <= 12; k++) {
          const aa = fa - spread / 2 + (k / 12) * spread;
          c.lineTo(wx + Math.sin(aa) * R1, wy + Math.cos(aa) * R1);
        }
        c.closePath(); c.fill();
        // 地紙に透ける炎の光
        c.save();
        c.shadowBlur = 0;
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = `rgba(255,140,50,${0.28 * flick})`;
        c.beginPath();
        for (let k = 0; k <= 12; k++) { const aa = fa - spread / 2 + (k / 12) * spread; const px = wx + Math.sin(aa) * R1, py = wy + Math.cos(aa) * R1; k ? c.lineTo(px, py) : c.moveTo(px, py); }
        for (let k = 12; k >= 0; k--) { const aa = fa - spread / 2 + (k / 12) * spread; c.lineTo(wx + Math.sin(aa) * R0 * 1.8, wy + Math.cos(aa) * R0 * 1.8); }
        c.closePath(); c.fill();
        c.strokeStyle = 'rgba(30,10,6,0.9)'; c.lineWidth = 1.2; c.globalCompositeOperation = 'source-over';
        for (let k = 0; k <= 8; k++) { const aa = fa - spread / 2 + (k / 8) * spread; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + Math.sin(aa) * R1, wy + Math.cos(aa) * R1); c.stroke(); }
        c.restore();
      }
    };
    // 奥の腕（左）→ 手前の腕（扇を持つ右）
    arm(shX - 30, shY + 2, P.lU, P.lL, -1, false);
    arm(shX + 30, shY + 2, P.rU, P.rL, 1, true);
    c.restore();
  }

  // ================================================================== 第四景：払暁の決戦（水墨＋朱）
  renderScene4(st) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    this.triggerAudio('s4_horagai', () => this._sfx('playHoragai'));
    if (st > 3.0) this.triggerAudio('s4_cavalry', () => this._sfx('playCavalry'));
    if (st > 6.4) this.triggerAudio('s4_impact', () => { this._sfx('playTaiko', 1.0); this.shakeIntensity = 9; this.flashOpacity = 0.3; });
    const cam = easeInOut(clamp(st / 12));

    c.drawImage(this.washi, 0, 0, W, H);
    const tint = c.createLinearGradient(0, 0, 0, H);
    tint.addColorStop(0, 'rgba(110,100,92,0.35)'); tint.addColorStop(0.55, 'rgba(240,220,190,0)'); tint.addColorStop(1, 'rgba(60,50,40,0.25)');
    c.fillStyle = tint; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(176,34,30,0.9)';
    c.beginPath(); c.arc(1180, 330 - cam * 24, 116, 0, Math.PI * 2); c.fill();

    c.save();
    c.translate(-cam * 80, 0);
    this.drawMountainLayer(0, 560, 0, ['rgba(60,56,54,0.55)', 'rgba(60,56,54,0)'], 1.4);
    this.drawMist(620, 160, 'rgba(240,232,214,0.75)', st * 16);
    this.drawMountainLayer(1, 660, 0, ['rgba(30,28,28,0.7)', 'rgba(40,38,36,0)'], 1.1);
    this.drawMist(720, 160, 'rgba(240,232,214,0.7)', -st * 22);
    c.restore();

    for (let row = 0; row < 3; row++) {
      const baseY = 770 + row * 105;
      const par = 0.4 + row * 0.5;
      const march = st * (14 + row * 10) - cam * 80 * par;
      const ink = row === 0 ? 'rgba(40,36,34,0.5)' : row === 1 ? 'rgba(25,22,22,0.8)' : 'rgba(10,8,8,0.95)';
      c.strokeStyle = ink; c.lineWidth = 1.2 + row;
      for (const sp of this.spears) {
        if (sp.row !== row) continue;
        const x = (((sp.x + march) % 2300) + 2300) % 2300 - 200;
        c.beginPath(); c.moveTo(x, baseY + 20); c.lineTo(x + sp.tilt * sp.h, baseY - sp.h * (0.6 + row * 0.35)); c.stroke();
      }
      const gg = c.createLinearGradient(0, baseY - 6, 0, baseY + 110);
      gg.addColorStop(0, ink); gg.addColorStop(1, row === 2 ? 'rgba(10,8,8,1)' : 'rgba(30,28,26,0)');
      c.fillStyle = gg;
      c.fillRect(0, baseY, W, row === 2 ? H - baseY : 110);
      for (const b of this.banners) {
        if (b.row !== row) continue;
        const x = (((b.x + march) % 2300) + 2300) % 2300 - 200;
        this.drawNobori(c, x, baseY + 10, b.hgt, st, b.ph, b.col, row, false, b.kamon);
      }
      if (row === 1) this.drawMist(baseY + 30, 120, 'rgba(225,212,190,0.5)', st * 60);
    }
    this.drawNobori(c, 150 - cam * 30, H + 40, 860, st, 0.3, 0, 3, true, 0);

    this.drawVerticalPoemLines({ lines: POEMS.s4, startX: 1740, topY: 190, fontSize: 66, columnSpacing: 106, curTime: st, startTime: 1.0, endTime: 11.6, style: 'sumi' });
  }

  // 幟旗：竿＋なびく布＋家紋
  drawNobori(c, x, baseY, h, st, ph, col, row, hero = false, kamonIdx = 0) {
    const w = h * 0.2;
    const pole = row >= 2 ? '#100c0b' : row === 1 ? 'rgba(30,26,26,0.85)' : 'rgba(50,46,44,0.55)';
    const cloth = [
      row >= 2 ? '#8c1c17' : row === 1 ? 'rgba(140,40,32,0.85)' : 'rgba(150,70,60,0.5)',
      row >= 2 ? '#15110f' : row === 1 ? 'rgba(30,26,26,0.85)' : 'rgba(60,56,54,0.5)',
      row >= 2 ? '#d8cdb6' : row === 1 ? 'rgba(205,195,175,0.85)' : 'rgba(200,190,170,0.5)'
    ][col];
    const bob = hero ? 0 : Math.sin(st * 3 + ph) * 3;
    const top = baseY - h + bob;
    const wave = (k) => Math.sin(st * (hero ? 2.0 : 3.4) + ph * 6 + k * 3.2) * w * 0.12 * k;
    const bl = h * 0.64, segs = 14;
    c.save();
    c.strokeStyle = pole; c.lineWidth = Math.max(2, h * 0.012);
    c.beginPath(); c.moveTo(x, baseY); c.lineTo(x, top - h * 0.03); c.moveTo(x, top); c.lineTo(x + w, top); c.stroke();
    c.fillStyle = cloth;
    c.beginPath();
    c.moveTo(x, top); c.lineTo(x + w, top);
    for (let i = 1; i <= segs; i++) { const k = i / segs; c.lineTo(x + w + wave(k), top + k * bl); }
    for (let i = segs; i >= 0; i--) { const k = i / segs; c.lineTo(x + wave(k) * 0.7, top + k * bl); }
    c.closePath(); c.fill();
    if (row >= 1) {
      const kcol = col === 2 ? '#15110f' : '#ece2ca';
      c.globalAlpha = row === 1 ? 0.75 : 1;
      if (hero) this.drawOdaMokko(c, x + w / 2 + wave(0.2) * 0.85, top + bl * 0.17, w * 0.34, kcol, cloth);
      else this.drawKamon(c, ['hishi', 'mokko', 'kuyo'][kamonIdx], x + w / 2 + wave(0.2) * 0.85, top + bl * 0.17, w * 0.3, kcol);
      if (hero) {
        c.font = `${Math.round(w * 0.52)}px ${FONT_BRUSH}`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#efe6d2';
        '天下布武'.split('').forEach((ch, i) => { const k = 0.4 + i * 0.14; c.fillText(ch, x + w / 2 + wave(k) * 0.85, top + bl * k); });
      }
    }
    c.restore();
  }

  // ================================================================== 第五景：題字
  renderScene5(st) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    const t = st;
    if (t > 0.6) this.triggerAudio('s5_fire', () => this._sfx('playTaiko', 0.9));
    if (t > 4.6) this.triggerAudio('s5_seal', () => { this._sfx('playTaiko', 1.0); this.shakeIntensity = 7; });
    if (t > 5.4) this.triggerAudio('s5_fanfare', () => this._sfx('playGrandFanfare'));

    const bg = c.createRadialGradient(W / 2, H * 0.48, 80, W / 2, H / 2, W * 0.7);
    bg.addColorStop(0, '#2a140c'); bg.addColorStop(0.55, '#100806'); bg.addColorStop(1, '#030202');
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    const leaf = 0;
    if (leaf > 0) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#d4a840';
      this.goldLeaf.forEach((L, i) => {
        c.globalAlpha = leaf * L.a * 0.5 * (0.7 + 0.3 * Math.sin(t * 0.8 + i));
        c.save(); c.translate(L.x, L.y); c.rotate(L.rot); c.fillRect(-L.s / 2, -L.s / 2, L.s, L.s); c.restore();
      });
      c.restore();
    }

    this.drawBurningOsaka(c, t);
    this.drawTitleFire(c, t, false);

    const title = '戦国天下統一伝';
    const fs = 136;
    const spacing = fs * 1.06;
    const tx0 = W / 2 - (title.length - 1) * spacing / 2;
    for (let i = 0; i < title.length; i++) {
      const p = clamp((t - 1.6 - i * 0.18) / 1.6);
      if (p <= 0) continue;
      this._drawFireGlyph(c, title[i], tx0 + i * spacing, 515, fs, p, t, i);
    }
    this.drawTitleFire(c, t, true);
    if (t > 4.2 && t < 6.2) {
      const k = (t - 4.2) / 2.0;
      const sx = lerp(260, 1660, easeInOut(k));
      c.save(); c.globalCompositeOperation = 'lighter';
      const sg = c.createLinearGradient(sx - 120, 0, sx + 120, 0);
      sg.addColorStop(0, 'rgba(255,230,160,0)'); sg.addColorStop(0.5, `rgba(255,236,180,${0.22 * Math.sin(k * Math.PI)})`); sg.addColorStop(1, 'rgba(255,230,160,0)');
      c.fillStyle = sg; c.fillRect(sx - 120, 430, 240, 170);
      c.restore();
    }

    const sub = smooth(3.6, 5.0, t);
    if (sub > 0) {
      c.save();
      c.globalAlpha = sub;
      c.font = `500 40px ${FONT_MINCHO}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#e8dcc0';
      if ('letterSpacing' in c) c.letterSpacing = '14px';
      c.fillText('群雄割拠の覇道', W / 2 + 7, 700 + (1 - sub) * 10);
      c.strokeStyle = `rgba(212,175,90,${0.6 * sub})`; c.lineWidth = 1.2;
      const lw = 240 * easeOut(sub);
      c.beginPath(); c.moveTo(W / 2 - 250 - lw, 700); c.lineTo(W / 2 - 250, 700); c.moveTo(W / 2 + 250, 700); c.lineTo(W / 2 + 250 + lw, 700); c.stroke();
      c.restore();
    }

    if (t > 4.4) this.drawSeal(c, 1660, 680, 96, clamp((t - 4.4) / 0.35));

    if (t > 6.5) {
      c.save();
      c.globalAlpha = smooth(6.5, 7.5, t) * (0.55 + 0.45 * Math.sin((t - 6.5) * 2.4));
      c.font = `500 28px ${FONT_MINCHO}`;
      c.textAlign = 'center'; c.fillStyle = '#efdcae';
      if ('letterSpacing' in c) c.letterSpacing = '6px';
      c.fillText('画面をクリックして天下へ挑む', W / 2, 860);
      c.restore();
    }
  }

  // ================================================================== 炎上する大坂城天守（豊臣期・黒漆の天守、慶長二十年 夏の陣）
  // 静的なシルエットを一度だけ実解像度のオフスクリーンに描き、毎フレームは帯状に揺らして陽炎を表現する。
  _buildOsakaKeep() {
    const sc = this.scale;
    const Wl = 760, Hl = 720;                 // ローカル描画範囲（原点は下端中央）
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(Wl * sc); cv.height = Math.ceil(Hl * sc);
    const c = cv.getContext('2d');
    c.scale(sc, sc);
    c.translate(Wl / 2, Hl);
    const wall = '#0d0708', roof = '#070405', stone = '#0f0909';
    const gold = 'rgba(138,104,56,0.55)';
    c.lineJoin = 'round';
    // 高石垣（反りのある勾配）
    c.fillStyle = stone;
    c.beginPath();
    c.moveTo(-210, 0);
    c.quadraticCurveTo(-160, -60, -150, -175);
    c.lineTo(150, -175);
    c.quadraticCurveTo(160, -60, 210, 0);
    c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,140,60,0.12)'; c.lineWidth = 1;
    for (let i = 1; i < 9; i++) { const yy = -175 + i * 19.4; const k = (yy + 175) / 175; c.beginPath(); c.moveTo(-150 - 60 * k * k, yy); c.lineTo(150 + 60 * k * k, yy); c.stroke(); }
    const widths = [270, 236, 202, 168, 132];
    const heights = [58, 52, 48, 44, 50];
    let y = -175;
    const gables = [];
    this._edgeColor = gold;
    for (let i = 0; i < 5; i++) {
      const ww = widths[i], wh = heights[i];
      c.fillStyle = wall;
      c.fillRect(-ww / 2, y - wh, ww, wh + 2);
      // 金の飾り帯（長押・腰の金具）
      c.fillStyle = 'rgba(150,114,60,0.35)';
      c.fillRect(-ww / 2, y - wh + 6, ww, 2);
      if (i === 4) { // 最上層：金の彫刻パネル（虎・鶴の意匠を抽象化）
        c.fillStyle = 'rgba(150,114,60,0.24)';
        for (let k = 0; k < 4; k++) c.fillRect(-ww / 2 + 10 + k * ((ww - 20) / 4), y - wh * 0.72, (ww - 20) / 4 - 8, wh * 0.4);
      }
      // 窓（ほの暗い灯）
      const nw = Math.max(3, Math.round(ww / 32));
      for (let k = 0; k < nw; k++) {
        c.fillStyle = (k + i) % 3 === 0 ? 'rgba(255,120,40,0.55)' : 'rgba(40,16,10,0.9)';
        c.fillRect(-ww / 2 + (k + 0.5) * (ww / nw) - 5, y - wh * 0.6, 10, wh * 0.28);
      }
      y -= wh;
      if (i === 4) this._irimoyaTop(c, y + 6, ww + 54, ww, roof);
      else this._roof(c, 0, y + 6, ww + 62 - i * 2, 26, 18, roof, false);
      const yy = y;
      if (i === 0) gables.push(() => { this._chidori(c, -ww * 0.27, yy - 8, ww * 0.32, 32, roof, wall, false); this._chidori(c, ww * 0.27, yy - 8, ww * 0.32, 32, roof, wall, false); });
      else if (i === 1) gables.push(() => this._chidori(c, 0, yy - 10, ww * 0.6, 42, roof, wall, false));
      else if (i === 2) gables.push(() => this._karahafu(c, 0, yy - 6, ww * 0.46, 26, roof, wall, false));
      else if (i === 3) gables.push(() => { this._chidori(c, -ww * 0.24, yy - 8, ww * 0.3, 28, roof, wall, false); this._chidori(c, ww * 0.24, yy - 8, ww * 0.3, 28, roof, wall, false); });
      else {
      }
      if (i < 4) y -= 14;
    }
    gables.forEach((g) => g());
    this._edgeColor = null;
    this._osaka = { cv, Wl, Hl, sc, topY: y - 60, windows: widths.map((w, i) => i) };
  }

  // ================================================================== 天守を囲む櫓群（隅櫓・多聞櫓・塀）。奥／中の2層を一度だけ描く
  _yagura(c, x, base, tiers, w, roof, wall, stone, gold) {
    // 石垣（反りのある勾配、地面まで）
    const sh = 46 + tiers * 6, bw = w * 0.62 + 26;
    c.fillStyle = stone;
    c.beginPath(); c.moveTo(x - bw - 18, base + 40); c.quadraticCurveTo(x - bw - 6, base - sh * 0.3, x - bw + 4, base - sh);
    c.lineTo(x + bw - 4, base - sh); c.quadraticCurveTo(x + bw + 6, base - sh * 0.3, x + bw + 18, base + 40); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,140,60,0.08)'; c.lineWidth = 1;
    for (let i = 1; i < 5; i++) { const yy = base - sh + i * sh / 5; c.beginPath(); c.moveTo(x - bw + 2 - i * 2, yy); c.lineTo(x + bw - 2 + i * 2, yy); c.stroke(); }
    let y = base - sh;
    const gables = [];
    this._edgeColor = gold;
    for (let i = 0; i < tiers; i++) {
      const ww = w * (1 - i * 0.2), wh = 30 - i * 3;
      c.fillStyle = wall; c.fillRect(x - ww / 2, y - wh, ww, wh + 2);
      const nw = Math.max(2, Math.round(ww / 28));
      for (let k = 0; k < nw; k++) {
        c.fillStyle = (k + i) % 2 === 0 ? 'rgba(255,110,36,0.5)' : 'rgba(40,16,10,0.9)';
        c.fillRect(x - ww / 2 + (k + 0.5) * (ww / nw) - 4, y - wh * 0.62, 8, wh * 0.3);
      }
      y -= wh;
      const rw = ww + 34;
      if (i === tiers - 1) this._irimoyaTop(c, y + 5, rw, ww, roof);
      else { this._roof(c, x, y + 5, rw, 16, 11, roof, false); const yy = y; gables.push(() => this._chidori(c, x, yy - 4, ww * 0.5, 22, roof, wall, false)); y -= 8; }
    }
    gables.forEach((g) => g());
    this._edgeColor = null;
  }
  _tamon(c, x0, x1, base, roof, wall, stone, gold) {
    const sh = 78;
    c.fillStyle = stone;
    c.beginPath(); c.moveTo(x0 - 14, base + 40); c.lineTo(x0, base - sh); c.lineTo(x1, base - sh); c.lineTo(x1 + 14, base + 40); c.closePath(); c.fill();
    const y = base - sh, wh = 24;
    c.fillStyle = wall; c.fillRect(x0 + 6, y - wh, x1 - x0 - 12, wh + 2);
    for (let px = x0 + 22; px < x1 - 20; px += 30) { c.fillStyle = ((px / 30) | 0) % 3 === 0 ? 'rgba(255,110,36,0.45)' : 'rgba(40,16,10,0.9)'; c.fillRect(px, y - wh * 0.62, 8, wh * 0.3); }
    this._edgeColor = gold;
    // 長い入母屋屋根（両端に小さな妻）
    const L = x1 - x0, cx = (x0 + x1) / 2;
    c.save(); c.translate(cx, 0);
    c.fillStyle = roof; c.beginPath();
    c.moveTo(-L / 2 - 4, y - wh + 4); c.lineTo(L / 2 + 4, y - wh + 4); c.lineTo(L / 2 - 10, y - wh - 14); c.lineTo(-L / 2 + 10, y - wh - 14); c.closePath(); c.fill();
    c.fillRect(-L / 2 + 8, y - wh - 17, L - 16, 3);
    c.strokeStyle = gold; c.lineWidth = 1; c.beginPath(); c.moveTo(-L / 2 - 4, y - wh + 4); c.lineTo(L / 2 + 4, y - wh + 4); c.stroke();
    c.restore();
    this._edgeColor = null;
  }
  _wallSeg(c, x0, x1, base, roof, wall, stone) { // 土塀＋石垣
    c.fillStyle = stone; c.fillRect(x0, base - 66, x1 - x0, 106);
    c.fillStyle = wall; c.fillRect(x0, base - 80, x1 - x0, 14);
    c.fillStyle = roof; c.beginPath(); c.moveTo(x0 - 3, base - 78); c.lineTo(x1 + 3, base - 78); c.lineTo(x1, base - 86); c.lineTo(x0, base - 86); c.closePath(); c.fill();
  }
  _buildCompound() {
    const sc = this.scale, W = this.V_WIDTH, top = 640, Hh = 400;
    const mk = () => { const cv = document.createElement('canvas'); cv.width = Math.ceil(W * sc); cv.height = Math.ceil(Hh * sc); const c = cv.getContext('2d'); c.scale(sc, sc); c.translate(0, -top); c.lineJoin = 'round'; return { cv, c }; };
    const back = mk(), mid = mk();
    const gold = 'rgba(138,104,56,0.5)';
    // 奥：霞んだ遠い櫓（中心の両側）
    { const c = back.c, roof = '#2a1410', wall = '#311812', stone = '#2c1612', g = 'rgba(150,100,60,0.3)';
      this._wallSeg(c, 560, 1360, 948, roof, wall, stone);
      c.save(); c.translate(690, 948); c.scale(0.85, 0.85); this._yagura(c, 0, 0, 2, 110, roof, wall, stone, g); c.restore();
      c.save(); c.translate(1240, 948); c.scale(0.85, 0.85); this._yagura(c, 0, 0, 3, 110, roof, wall, stone, g); c.restore();
      c.save(); c.translate(0, 0); this._tamon(c, 1290, 1470, 950, roof, wall, stone, g); c.restore(); }
    // 中：大きめの隅櫓と多聞櫓、塀で天守へつなぐ
    { const c = mid.c, roof = '#070405', wall = '#0d0708', stone = '#0f0909';
      this._wallSeg(c, 330, 1600, 975, roof, wall, stone);
      this._tamon(c, 470, 720, 978, roof, wall, stone, gold);
      c.save(); c.translate(400, 978); c.scale(1.2, 1.2); this._yagura(c, 0, 0, 3, 120, roof, wall, stone, gold); c.restore();
      c.save(); c.translate(1450, 978); c.scale(1.15, 1.15); this._yagura(c, 0, 0, 2, 130, roof, wall, stone, gold); c.restore(); }
    // 奥と中を1枚に合成（描画1回で済ませる）
    const all = document.createElement('canvas'); all.width = mid.cv.width; all.height = mid.cv.height;
    const ac = all.getContext('2d'); ac.globalAlpha = 0.83; ac.drawImage(back.cv, 0, 0); ac.globalAlpha = 1; ac.drawImage(mid.cv, 0, 0);
    this._compound = { sc, top, Hh, all,
      fires: [[690, 895, 0.7], [1240, 875, 0.7], [1380, 900, 0.6], [400, 845, 1], [600, 930, 0.9], [1450, 875, 1]] };
  }
  drawCompound(c, t, fade, layer) {
    const W = this.V_WIDTH;
    if (!this._compound || this._compound.sc !== this.scale) this._buildCompound();
    const P = this._compound;
    if (layer === 'back') { // 櫓が描かれている横範囲だけ転送
      const sx = 260, sw = 1460;
      c.save(); c.globalAlpha = fade * 0.9;
      c.drawImage(P.all, sx * P.sc, 0, sw * P.sc, P.all.height, sx, P.top, sw, P.Hh);
      c.restore();
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    P.fires.forEach(([x, y, s], i) => {
      if ((layer === 'back') !== (i < 3)) return;
      const f = 0.6 + 0.4 * Math.sin(t * (4 + i) + i * 1.7);
      const r = 30 * s * f;
      c.globalAlpha = 0.5 * fade * f * (i < 3 ? 0.6 : 1);
      c.drawImage(this.emberSprite, x - r * 0.7, y - r * 1.8, r * 1.4, r * 2.4);
    });
    c.restore();
    c.save(); // 櫓から立つ煙（月を避けて左上へ流す）
    P.fires.forEach(([x, y, s], i) => {
      if ((layer === 'back') !== (i < 3)) return;
      const ph = (t * 0.06 + i * 0.29) % 1, sz = (60 + ph * 160) * s;
      c.globalAlpha = Math.sin(ph * Math.PI) * 0.45 * fade;
      c.drawImage(this.smokeSprite, x - ph * 90 - sz, y - 40 - ph * 260 - sz, sz * 2, sz * 2);
    });
    c.restore();
  }

  drawBurningOsaka(c, t) {
    const W = this.V_WIDTH;
    if (!this._osaka || this._osaka.sc !== this.scale) this._buildOsakaKeep();
    const O = this._osaka;
    const fade = smooth(0, 1.6, t);
    const baseX = W / 2, baseY = 990;     // 下端のレターボックス裏まで石垣を下ろす（接地）
    const ks = 0.95;
    const flick = 0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 3.7);
    // 炎の空（天守の背後の光）
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(baseX, 640, 40, baseX, 640, 720);
    g.addColorStop(0, `rgba(255,120,40,${0.42 * fade * flick})`);
    g.addColorStop(0.45, `rgba(170,40,12,${0.22 * fade})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, this.V_HEIGHT);
    c.restore();
    // 三日月（右上の空。炎に染まった淡い金、柔らかな暈、流れる煙が薄くかかる）
    if (!this._crescent || this._crescent.sc !== this.scale) {
      const sc = this.scale, S = 220, cv = document.createElement('canvas');
      cv.width = cv.height = Math.ceil(S * sc);
      const m = cv.getContext('2d'); m.scale(sc, sc);
      const cx = S / 2, cy = S / 2, r = 34;
      const cr = document.createElement('canvas'); cr.width = cr.height = cv.width;
      const k = cr.getContext('2d'); k.scale(sc, sc);
      const fg = k.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      fg.addColorStop(0, '#fff0c8'); fg.addColorStop(0.6, '#f2c27a'); fg.addColorStop(1, '#e0904a');
      k.fillStyle = fg; k.beginPath(); k.arc(cx, cy, r, 0, Math.PI * 2); k.fill();
      k.globalCompositeOperation = 'destination-out';
      k.beginPath(); k.arc(cx + r * 0.3, cy - r * 0.16, r * 0.9, 0, Math.PI * 2); k.fill();
      const halo = m.createRadialGradient(cx - r * 0.35, cy + r * 0.1, 4, cx, cy, S / 2);
      halo.addColorStop(0, 'rgba(255,190,120,0.28)'); halo.addColorStop(0.35, 'rgba(255,150,80,0.1)'); halo.addColorStop(1, 'rgba(255,120,60,0)');
      m.fillStyle = halo; m.fillRect(0, 0, S, S);
      m.drawImage(cr, 0, 0, S, S);
      this._crescent = { cv, sc, S };
    }
    {
      const M = this._crescent, mx = 1540, my = 230;
      c.save(); c.globalAlpha = fade * 0.92;
      c.translate(mx, my); c.rotate(-0.35);
      c.drawImage(M.cv, -M.S / 2, -M.S / 2, M.S, M.S);
      c.restore();
      c.save();
      for (let i = 0; i < 3; i++) { // 月を横切る煙
        const ph = (t * 0.03 + i / 3) % 1;
        const s = 90 + i * 30;
        c.globalAlpha = Math.sin(ph * Math.PI) * 0.55 * fade;
        c.drawImage(this.smokeSprite, mx - 260 + ph * 520 - s, my - 30 + i * 22 - s * 0.45, s * 2, s * 0.9);
      }
      c.restore();
    }
    // 煙（天守から立ち上る）
    c.save();
    for (let i = 0; i < 5; i++) {
      const ph = (t * 0.07 + i / 5) % 1;
      const s = 160 + ph * 360;
      c.globalAlpha = Math.sin(ph * Math.PI) * 0.75 * fade;
      c.drawImage(this.smokeSprite, baseX + Math.sin(i * 2.3 + t * 0.2) * 90 + ph * 120 - s, 360 - ph * 330 - s, s * 2, s * 2);
    }
    c.restore();
    this.drawCompound(c, t, fade, 'back');
    this.drawCompound(c, t, fade, 'mid');
    // 天守（陽炎：帯ごとに横へ揺らす）
    c.save();
    c.globalAlpha = 0.82 * fade;
    const dw = O.Wl * ks, dh = O.Hl * ks;
    const x0 = baseX - dw / 2, y0 = baseY - dh;
    const strips = 30, sh = O.cv.height / strips, dsh = dh / strips;
    for (let i = 0; i < strips; i++) {
      const amp = 1.6 * (1 - i / strips) + 0.5; // 上ほど大きく揺らぐ
      const dx = Math.sin(t * 3.1 + i * 0.55) * amp;
      c.drawImage(O.cv, 0, i * sh, O.cv.width, sh, x0 + dx, y0 + i * dsh, dw, dsh + 0.6);
    }
    c.restore();
    // 窓から噴く炎と金具の照り
    c.save();
    c.globalCompositeOperation = 'lighter';
    const spots = [[-90, -205], [40, -205], [110, -262], [-60, -318], [70, -365], [-20, -415], [0, -470]];
    spots.forEach(([lx, ly], i) => {
      const f = 0.6 + 0.4 * Math.sin(t * (5 + i) + i * 2.1);
      const r = (34 + (i % 3) * 14) * f;
      c.globalAlpha = 0.55 * fade * f;
      c.drawImage(this.emberSprite, baseX + lx * ks - r * 0.7, baseY + ly * ks - r * 1.6, r * 1.4, r * 2.4);
    });
    c.restore();
    // 手前の焼ける城下（地面へ接地させる黒い屋根並み）
    c.fillStyle = '#1a0b08';
    c.beginPath(); c.moveTo(0, this.V_HEIGHT);
    let x = -30; const R = mulberry32(615);
    while (x < W + 30) {
      const w = 90 + R() * 120, yy = 975 + R() * 18;
      c.lineTo(x, yy + 18); c.quadraticCurveTo(x + w * 0.12, yy + 3, x + w * 0.25, yy); c.lineTo(x + w * 0.75, yy); c.quadraticCurveTo(x + w * 0.88, yy + 3, x + w, yy + 18);
      x += w;
    }
    c.lineTo(W, this.V_HEIGHT); c.closePath(); c.fill();
    this.drawTokugawaArmy(c, t);
    // 題字の可読性のため、題字帯をわずかに沈める
    const band = c.createLinearGradient(0, 400, 0, 760);
    band.addColorStop(0, 'rgba(8,3,2,0)'); band.addColorStop(0.35, 'rgba(8,3,2,0.38)'); band.addColorStop(0.65, 'rgba(8,3,2,0.38)'); band.addColorStop(1, 'rgba(8,3,2,0)');
    c.fillStyle = band; c.fillRect(0, 400, W, 360);
  }

  // ================================================================== 徳川方の大軍（大坂夏の陣 1615）
  // 奥・中・手前の3層を一度だけオフスクリーンに描き、毎フレームは横パン＋列ごとの上下動（槍の揺れ）だけで動かす。
  _armyUnit(c, x, y, s, u, P, rim) {
    const sil = rim ? P.rim : P.sil;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = sil; c.strokeStyle = sil; c.lineCap = 'round';
    const flag = (fx, fy, w, h, col, crest) => {
      c.fillStyle = rim ? P.rim : col; c.fillRect(fx, fy, w, h);
      if (!rim && crest) this._aoi(c, fx + w / 2, fy + Math.min(h * 0.2, w * 0.6), w * 0.42, P.crest, col);
      c.fillStyle = sil;
    };
    if (u.kind === 'horse') {
      c.beginPath(); c.ellipse(0, -30, 27, 11, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(18, -36); c.lineTo(34, -56); c.lineTo(42, -52); c.lineTo(30, -30); c.closePath(); c.fill();
      c.lineWidth = 3.2;
      c.beginPath(); [-18, -11, 13, 20].forEach((lx, i) => { c.moveTo(lx, -24); c.lineTo(lx + (i % 2 ? 4 : -3), 0); }); c.stroke();
      c.beginPath(); c.moveTo(-26, -34); c.quadraticCurveTo(-36, -26, -33, -12); c.lineWidth = 3; c.stroke();
      c.beginPath(); c.moveTo(-7, -38); c.lineTo(7, -38); c.lineTo(5, -62); c.lineTo(-5, -62); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-11, -64); c.lineTo(0, -73); c.lineTo(11, -64); c.closePath(); c.fill(); // 兜
      c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -60); c.lineTo(-4, -104); c.stroke();
      flag(-14, -104, 10, 24, u.cloth, u.crest);
      if (u.spear) { c.lineWidth = 1.6; c.beginPath(); c.moveTo(6, -50); c.lineTo(22, -128); c.stroke(); }
    } else if (u.kind === 'nobori') {
      c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -40); c.stroke(); // 持ち手
      c.beginPath(); c.moveTo(-6, -22); c.lineTo(6, -22); c.lineTo(5, -44); c.lineTo(-5, -44); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-10, -45); c.lineTo(0, -53); c.lineTo(10, -45); c.closePath(); c.fill();
      c.lineWidth = 2; c.beginPath(); c.moveTo(-1, -30); c.lineTo(-1, -170); c.moveTo(-1, -166); c.lineTo(19, -166); c.stroke();
      flag(0, -165, 18, 110, u.cloth, u.crest);
    } else {
      c.lineWidth = 3.4;
      c.beginPath(); c.moveTo(-4, -22); c.lineTo(-6 - u.step, 0); c.moveTo(4, -22); c.lineTo(5 + u.step, 0); c.stroke();
      c.beginPath(); c.moveTo(-7, -21); c.lineTo(7, -21); c.lineTo(6, -44); c.lineTo(-6, -44); c.closePath(); c.fill();
      c.beginPath(); c.arc(0, -48, 4.5, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(-12, -49); c.lineTo(0, -56); c.lineTo(12, -49); c.closePath(); c.fill(); // 陣笠
      if (u.gun) { c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -34); c.lineTo(26, -42); c.stroke(); }
      else { c.lineWidth = 1.5; c.beginPath(); c.moveTo(5, -30); c.lineTo(5 + u.lean, -150); c.stroke();
        c.beginPath(); c.moveTo(5 + u.lean - 1.6, -146); c.lineTo(5 + u.lean * 1.03, -158); c.lineTo(5 + u.lean + 1.6, -146); c.closePath(); c.fill(); }
      if (u.sashi) { c.lineWidth = 1.4; c.beginPath(); c.moveTo(-5, -40); c.lineTo(-5, -84); c.stroke(); flag(-14, -84, 9, 20, u.cloth, u.crest); }
    }
    c.restore();
  }

  // 三つ葉葵（小さく控えめに）
  _aoi(c, x, y, r, col, bg) {
    // 三つ葉葵：丸の中に、先を中心へ向けたハート形の葵の葉3枚。葉脈は地色で抜く
    c.save(); c.translate(x, y);
    c.strokeStyle = col; c.fillStyle = col;
    c.lineWidth = Math.max(0.5, r * 0.11);
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke();
    for (let k = 0; k < 3; k++) {
      c.save(); c.rotate(k * Math.PI * 2 / 3);
      // 葉（外向きが切れ込み、中心側が葉先）
      c.beginPath();
      c.moveTo(0, -r * 0.1);
      c.bezierCurveTo(-r * 0.22, -r * 0.24, -r * 0.5, -r * 0.42, -r * 0.42, -r * 0.66);
      c.bezierCurveTo(-r * 0.36, -r * 0.84, -r * 0.1, -r * 0.86, 0, -r * 0.7);
      c.bezierCurveTo(r * 0.1, -r * 0.86, r * 0.36, -r * 0.84, r * 0.42, -r * 0.66);
      c.bezierCurveTo(r * 0.5, -r * 0.42, r * 0.22, -r * 0.24, 0, -r * 0.1);
      c.fill();
      if (bg && r > 3) { // 葉脈：切れ込みから放射
        c.strokeStyle = bg; c.lineWidth = Math.max(0.35, r * 0.045);
        c.beginPath();
        c.moveTo(0, -r * 0.68); c.lineTo(0, -r * 0.2);
        [[-1, 0.62], [1, 0.62], [-1, 0.48], [1, 0.48], [-1, 0.36], [1, 0.36]].forEach(([sd, yy]) => {
          c.moveTo(0, -r * yy); c.quadraticCurveTo(sd * r * 0.14, -r * (yy + 0.02), sd * r * 0.3, -r * (yy + 0.1));
        });
        c.stroke(); c.strokeStyle = col;
      }
      c.restore();
    }
    c.beginPath(); c.arc(0, 0, r * 0.08, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  _buildArmy() {
    const sc = this.scale, W = this.V_WIDTH;
    const TW = 1600, LH = 240;
    const defs = [
      { s: 0.24, rows: 3, gap: 9, base: 232, P: { sil: '#2c1410', rim: 'rgba(170,80,40,0.55)', cloth: '#4a2a1e', dark: '#24100c', crest: 'rgba(40,18,12,0.7)' }, n: 210, seed: 11 },
      { s: 0.4, rows: 2, gap: 14, base: 232, P: { sil: '#140807', rim: 'rgba(200,95,45,0.6)', cloth: '#4e3022', dark: '#100605', crest: 'rgba(25,10,8,0.75)' }, n: 110, seed: 22 },
      { s: 0.62, rows: 1, gap: 0, base: 236, P: { sil: '#050203', rim: 'rgba(230,120,55,0.55)', cloth: '#432a1f', dark: '#0a0405', crest: 'rgba(15,6,5,0.8)' }, n: 52, seed: 33 },
    ];
    this._army = { sc, TW, LH, layers: defs.map((d) => {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil((TW + W) * sc); cv.height = Math.ceil(LH * sc);
      const c = cv.getContext('2d'); c.scale(sc, sc);
      const R = mulberry32(d.seed);
      const units = [];
      for (let r = 0; r < d.rows; r++) {
        for (let i = 0; i < d.n; i++) {
          const roll = R();
          const kind = roll < 0.08 ? 'horse' : roll < 0.17 ? 'nobori' : 'foot';
          const white = R() < 0.55;
          units.push({ x: (i + R() * 0.8) * TW / d.n, y: d.base - (d.rows - 1 - r) * d.gap - R() * 4, kind,
            s: d.s * (0.92 + R() * 0.14), gun: R() < 0.3, sashi: R() < 0.55, lean: 6 + R() * 14, step: R() * 5 - 2.5, spear: R() < 0.6,
            cloth: white ? d.P.cloth : d.P.dark, crest: R() < (kind === 'foot' ? 0.2 : 0.6) });
        }
      }
      units.sort((a, b) => a.y - b.y);
      for (const pass of [true, false]) {          // 先に縁の光（上へずらす）、次に影
        units.forEach((u) => {
          for (const ox of [0, TW]) {
            if (u.x + ox > TW + W + 60) continue;
            this._armyUnit(c, u.x + ox + (pass ? 0.6 : 0), u.y - (pass ? 1.4 / u.s : 0), u.s, u, d.P, pass);
          }
        });
      }
      // 足元を地面へ沈める
      c.fillStyle = d.P.sil; c.fillRect(0, d.base - 2, TW + W, LH - d.base + 2);
      return { cv, d };
    }) };
  }

  drawTokugawaArmy(c, t) {
    const W = this.V_WIDTH, H = this.V_HEIGHT;
    if (!this._army || this._army.sc !== this.scale) this._buildArmy();
    const A = this._army, sc = A.sc;
    const fade = smooth(0.3, 2.2, t);
    const tops = [952, 968, 990];            // 各層の地面の高さ（奥ほど上）
    const speeds = [7, 13, 22];
    const strip = 48;
    A.layers.forEach(({ cv }, li) => {
      const creep = Math.min(t, 20) * (0.3 + li * 0.2);   // ゆっくり城へ押し寄せる
      const gy = tops[li] - creep - A.LH * 0.97 + 0;
      const off = (t * speeds[li] + li * 420) % A.TW;
      c.save(); c.globalAlpha = fade * (li === 0 ? 0.85 : 1);
      if (li === 0) c.drawImage(cv, off * sc, 0, W * sc, cv.height, 0, gy, W, A.LH);
      else for (let x = 0; x < W; x += strip) {
        const bob = Math.sin(t * (3.2 + li * 0.6) + x * 0.03 + li) * (0.6 + li * 0.9);
        c.drawImage(cv, (off + x) * sc, 0, strip * sc, cv.height, x, gy + bob, strip + 0.5, A.LH);
      }
      c.restore();
      if (li === 0) { // 奥の層に戦場の煙をかぶせて霞ませる
        const hz = c.createLinearGradient(0, 880, 0, 960);
        hz.addColorStop(0, 'rgba(90,36,20,0)'); hz.addColorStop(1, `rgba(70,28,16,${0.35 * fade})`);
        c.fillStyle = hz; c.fillRect(0, 880, W, 80);
      }
    });
    // 総大将の馬印（白地に三つ葉葵、文字なし）（左手、題字から離して控えめに）
    const bx = 300, by = 986, sw = Math.sin(t * 0.9) * 0.025;
    c.save(); c.globalAlpha = fade; c.translate(bx, by - Math.min(t, 20) * 0.5); c.rotate(sw); c.scale(0.68, 0.68);
    c.strokeStyle = '#0a0405'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -250); c.moveTo(0, -244); c.lineTo(36, -244); c.stroke();
    c.fillStyle = 'rgba(232,120,60,0.3)'; c.fillRect(1.5, -246, 36, 196);
    c.fillStyle = '#4e3426'; c.fillRect(1, -242, 35, 194);
    this._aoi(c, 18.5, -214, 14, 'rgba(14,6,4,0.88)', '#4e3426');
    this._aoi(c, 18.5, -170, 11, 'rgba(14,6,4,0.7)', '#4e3426');
    c.restore();
    // 最前の足元を暗く締める
    const fg = c.createLinearGradient(0, 965, 0, H);
    fg.addColorStop(0, 'rgba(3,1,1,0)'); fg.addColorStop(1, 'rgba(3,1,1,0.9)');
    c.fillStyle = fg; c.fillRect(0, 965, W, H - 965);
  }

  // 題字の炎：下から立ち上る火の舌（加算合成のスプライトのみで軽量）
  // front=false: 題字の背後の炎 / front=true: 題字の前をかすめる薄い炎と熱気
  drawTitleFire(c, t, front) {
    const W = this.V_WIDTH, H = this.V_HEIGHT;
    const I = smooth(0, 1.2, t) * (1 - 0.6 * smooth(4.0, 7.5, t));
    if (I <= 0.01) return;
    c.save();
    c.globalCompositeOperation = 'lighter';
    if (!front) {
      const g = c.createLinearGradient(0, H, 0, H * 0.3);
      g.addColorStop(0, `rgba(255,110,30,${0.55 * I})`); g.addColorStop(0.45, `rgba(190,40,10,${0.25 * I})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    const list = this.titleFlames;
    for (let i = front ? 0 : 1; i < list.length; i += 2) {
      const f = list[i];
      const k = ((t / f.per) + f.ph) % 1;           // 0→1 で一つの炎が立ち上り消える
      const y = lerp(H - 60, front ? 430 : 300, Math.pow(k, 0.8));
      const x = f.x + Math.sin(t * 2.2 + f.sway + k * 4) * 26;
      const r = f.r * (front ? 0.7 : 1) * Math.sin(Math.min(1, k * 1.25) * Math.PI) ;
      if (r <= 1) continue;
      c.globalAlpha = I * (front ? 0.16 : 0.42) * (1 - k * 0.7);
      c.drawImage(this.emberSprite, x - r, y - r * 1.3, r * 2, r * 2.6);
    }
    c.restore();
  }

  // 炎の中から浮かび上がる題字：下から焼き出すように現れ、赤熱→金へ冷える。陽炎の揺らぎ付き
  _drawFireGlyph(c, ch, cx, cy, fs, p, t, idx) {
    const gold = this._glyph(ch, fs, 'title');
    const hot = this._glyph(ch, fs, 'hot');
    const b = gold.box;
    const r = easeOut(p);
    const heat = 1 - r;
    const flick = 0.85 + 0.15 * Math.sin(t * 11 + idx * 1.9);
    const x0 = cx - b / 2, y0 = cy - b / 2;
    // 背後の熱の光
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = (0.25 + 0.6 * heat) * flick * Math.min(1, p * 3);
    c.drawImage(hot.halo, x0, y0, b, b);
    c.restore();
    // 下から上へ焼き出し（境界は赤熱の筋）
    const edgeY = cy + fs * 0.62 - r * fs * 1.3;
    c.save();
    c.beginPath(); c.rect(x0, edgeY, b, y0 + b - edgeY); c.clip();
    const strips = 12, src = gold.sharp.width, sh = src / strips, dh = b / strips;
    const amp = 1 + heat * 7; // 陽炎
    c.globalAlpha = Math.min(1, p * 2.2);
    c.drawImage(gold.halo, x0, y0, b, b);
    for (let s = 0; s < strips; s++) {
      const dx = Math.sin(t * 7 + s * 0.9 + idx) * amp;
      c.drawImage(gold.sharp, 0, s * sh, src, sh, x0 + dx, y0 + s * dh, b, dh + 0.5);
    }
    if (heat > 0.01) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = heat * 0.95;
      for (let s = 0; s < strips; s++) {
        const dx = Math.sin(t * 7 + s * 0.9 + idx) * amp;
        c.drawImage(hot.sharp, 0, s * sh, src, sh, x0 + dx, y0 + s * dh, b, dh + 0.5);
      }
    }
    c.restore();
    if (p < 1) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = Math.sin(p * Math.PI) * 0.9;
      c.drawImage(this.emberSprite, cx - fs * 0.7, edgeY - 14, fs * 1.4, 28);
      c.restore();
    }
  }


  drawSeal(c, x, y, s, p) {
    const e = p < 1 ? 1 + (1 - easeOut(p)) * 0.8 : 1;
    c.save();
    c.translate(x, y); c.rotate(-0.04); c.scale(e, e);
    c.globalAlpha = clamp(p * 1.4) * 0.95;
    c.fillStyle = '#b3241e';
    c.beginPath();
    c.moveTo(-s / 2 + 3, -s / 2); c.lineTo(s / 2, -s / 2 + 2); c.lineTo(s / 2 - 2, s / 2); c.lineTo(-s / 2, s / 2 - 3); c.closePath(); c.fill();
    c.strokeStyle = '#f0e2c8'; c.lineWidth = 3;
    c.strokeRect(-s / 2 + 8, -s / 2 + 8, s - 16, s - 16);
    c.fillStyle = '#f3e6cc';
    c.font = `${Math.round(s * 0.34)}px ${FONT_BRUSH}`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('天', s * 0.17, -s * 0.17); c.fillText('下', s * 0.17, s * 0.18);
    c.fillText('布', -s * 0.17, -s * 0.17); c.fillText('武', -s * 0.17, s * 0.18);
    c.restore();
  }

  // ------------------------------------------------------------------ 筆文字グリフのキャッシュ
  // ctx.filter(blur) を毎フレーム使うと重いため、各文字の「鮮明・滲み・光背」を
  // 実解像度のオフスクリーンに一度だけ描いて drawImage で合成する。
  _glyph(ch, fontSize, styleKey) {
    if (!this._glyphCache) this._glyphCache = new Map();
    if (this._glyphScale !== this.scale) { this._glyphCache.clear(); this._glyphScale = this.scale; }
    const key = ch + '|' + fontSize + '|' + styleKey;
    let gl = this._glyphCache.get(key);
    if (gl) return gl;
    const S = GLYPH_STYLES[styleKey];
    const sc = this.scale;
    const box = fontSize * 2;
    const px = Math.max(8, Math.ceil(box * sc));
    const hasFilter = 'filter' in CanvasRenderingContext2D.prototype;
    const make = (fill, blur, sizeMul, dx = 0, dy = 0) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = px;
      const g = cv.getContext('2d');
      g.font = `${Math.round(fontSize * sizeMul * sc)}px ${FONT_BRUSH}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (blur > 0) {
        if (hasFilter) g.filter = `blur(${(blur * sc).toFixed(2)}px)`;
        else { g.shadowColor = typeof fill === 'string' ? fill : '#000'; g.shadowBlur = blur * sc * 2; }
      }
      if (fill === 'gold') {
        const gg = g.createLinearGradient(0, px / 2 - fontSize * sc / 2, 0, px / 2 + fontSize * sc / 2);
        gg.addColorStop(0, '#fff7dc'); gg.addColorStop(0.45, '#efcd7a'); gg.addColorStop(0.75, '#c38c38'); gg.addColorStop(1, '#f3da96');
        g.fillStyle = gg;
      } else g.fillStyle = fill;
      g.fillText(ch, px / 2 + dx * sc, px / 2 + dy * sc);
      return cv;
    };
    gl = {
      box,
      sharp: make(S.fill, 0, 1),
      soft: make(S.fill, 6, 1),
      halo: make(S.halo, S.haloBlur, 1, S.haloDx || 0, S.haloDy || 0),
      bleed: S.bleed ? make(S.bleed, 12, 1.2) : null
    };
    this._glyphCache.set(key, gl);
    return gl;
  }

  // p: 0→1 出現進捗 / outA: 退場アルファ
  _drawInkGlyph(c, ch, cx, cy, fontSize, styleKey, p, outA, scaleBoost = 0) {
    const gl = this._glyph(ch, fontSize, styleKey);
    const e = easeOut(p);
    const a = e * outA;
    if (a <= 0.003) return;
    const b = gl.box;
    const k = 1 + scaleBoost * (1 - e);
    const draw = (cv, alpha, mul = 1) => {
      if (!cv || alpha <= 0.003) return;
      c.globalAlpha = Math.min(1, alpha);
      const s = b * k * mul;
      c.drawImage(cv, cx - s / 2, cy - s / 2, s, s);
    };
    if (p < 1) draw(gl.bleed, (1 - p) * 0.7 * outA, 1 + 0.25 * (1 - e)); // にじみ広がる淡墨
    draw(gl.halo, a * 0.8);
    // 滲み→鮮明（退場時は再び滲む）
    const softMix = clamp((1 - e) * 1.3 + (1 - outA) * 0.9);
    draw(gl.soft, a * softMix);
    draw(gl.sharp, a * (1 - softMix));
  }

  // ================================================================== 縦書き筆文字（墨の滲み表示）
  drawVerticalPoemLines(opts) {
    const {
      lines, startX, topY = 200, columnSpacing = 96, fontSize = 60,
      curTime, startTime, endTime, charInterval = 0.17, style = 'sumi'
    } = opts;
    if (curTime < startTime || curTime > endTime) return;
    const c = this.ctx;
    const el = curTime - startTime;
    const outA = 1 - smooth(endTime - startTime - 1.0, endTime - startTime, el);
    const charSpacing = fontSize * 1.1;
    c.save();
    let idx = 0;
    lines.forEach((line, li) => {
      const colX = startX - li * columnSpacing;
      // 散らし書き（二行目以降を下げる）。レターボックス内に収まるよう長い行は詰める
      let y0 = topY + li * fontSize * 0.9;
      const bottom = this.V_HEIGHT - 150;
      let fs = fontSize, sp = charSpacing;
      if (y0 + (line.length - 0.5) * sp > bottom) {
        y0 = Math.max(topY - 20, bottom - (line.length - 0.5) * sp);
        if (y0 + (line.length - 0.5) * sp > bottom) { sp = (bottom - y0) / (line.length - 0.5); fs = Math.round(Math.min(fontSize, sp / 1.04)); }
      }
      for (let k = 0; k < line.length; k++) {
        const p = clamp((el - idx * charInterval) / 1.1);
        idx++;
        if (p <= 0) continue;
        const cy = y0 + fs * 0.5 + k * sp - (1 - easeOut(p)) * 8;
        this._drawInkGlyph(c, line[k], colX, cy, fs, style, p, outA, 0.06);
      }
      idx += 2;
    });
    c.restore();
  }

  // ================================================================== 仕上げ
  drawFilmGrain() {
    if (!this.grain) return;
    const c = this.ctx;
    if (!this._grainPattern || this._grainCtx !== c) { this._grainPattern = c.createPattern(this.grain, 'repeat'); this._grainCtx = c; }
    c.save();
    c.globalAlpha = 0.6;
    c.translate(-Math.floor(Math.random() * 256), -Math.floor(Math.random() * 256));
    c.fillStyle = this._grainPattern;
    c.fillRect(0, 0, this.V_WIDTH + 256, this.V_HEIGHT + 256);
    c.restore();
  }

  drawVignette() {
    if (this.vignette) this.ctx.drawImage(this.vignette, 0, 0, this.V_WIDTH, this.V_HEIGHT);
  }

  // シネマスコープ帯（幕開けで全面の黒から上下へ開く）
  drawCinemascopeBars(t = 99) {
    const c = this.ctx, W = this.V_WIDTH, H = this.V_HEIGHT;
    const open = easeInOut(clamp((t - 0.15) / 1.8));
    const bar = lerp(H / 2 + 2, 100, open);
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, bar);
    c.fillRect(0, H - bar, W, bar);
    if (open > 0.6) {
      c.fillStyle = `rgba(190,150,80,${0.25 * (open - 0.6) / 0.4})`;
      c.fillRect(0, bar, W, 1);
      c.fillRect(0, H - bar - 1, W, 1);
    }
  }

  // 旧API互換エイリアス
  drawBonfire() {}
}
