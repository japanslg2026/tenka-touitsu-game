/* タイトルBGM: オープニング曲('op')を初期選択画面・武将名鑑・大名名鑑でもループ再生する。
 * 音源は bgm.js の SengokuMusicEngine（window.sengokuMusic）をそのまま使う。
 * ゲーム開始で他の曲（季節曲など）に切り替わったら手を引き、残っていれば停止する。
 * 消音状態は localStorage 'sengoku_bgm_muted' に保存し、エンジンの isBgmMuted（ジュークボックスと共通）に反映。 */
(function () {
  'use strict';
  const KEY = 'sengoku_bgm_muted';
  const m = () => window.sengokuMusic || null;
  let done = false, startClicked = false, unlocked = false;
  const store = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (_) {} };
  const stored = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
  const muted = () => { const e = m(); return e ? !!e.isBgmMuted : stored(); };
  const movieOn = () => { const mm = document.getElementById('openingMovieModal'); return !!(mm && !mm.classList.contains('hidden')); };
  const ctxRunning = () => { const e = m(); return !!(e && e.ctx && e.ctx.state === 'running'); };

  function applyStored() { const e = m(); if (!e) return; if (stored() !== !!e.isBgmMuted) { try { e.toggleBgmMute(); } catch (_) { e.isBgmMuted = stored(); } } }
  function ensure() {
    const e = m(); if (!e || done || movieOn() || muted()) return;
    if (!unlocked && !ctxRunning()) return; // ユーザー操作前は鳴らさない（自動再生制限でエラーを出さない）
    if (e.currentTrack !== 'op' && e.timerId) { done = true; return; } // 他の曲へ引き継がれた
    if (e.currentTrack === 'op' && e.timerId) return;
    try { e.playTrack('op', false); } catch (_) {}
  }
  function unlock() {
    if (unlocked) return; unlocked = true;
    const e = m(); if (!e) return;
    try { e.init(); if (e.ctx && e.ctx.state === 'suspended') e.ctx.resume().catch(() => {}); } catch (_) {}
    setTimeout(ensure, 50);
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(t => window.addEventListener(t, unlock, { capture: true, passive: true }));


  // ===== 出陣のほら貝（WebAudio 合成・音源ファイル不要）=====
  // 独立した AudioContext で鳴らすので、ゲーム開始処理や BGM 切替に影響されず、開始もブロックしない。
  let horaCtx = null, horaAt = 0, horaEndAt = 0;
  const horagaiRemainingMs = () => Math.max(0, horaEndAt - Date.now());
  function horagai() {
    if (muted()) return;
    const now0 = Date.now(); if (now0 - horaAt < 1500) return; horaAt = now0;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = horaCtx || (horaCtx = new AC()); if (c.state === 'suspended') c.resume().catch(() => {});
      const t = c.currentTime + 0.03, D = 2.6;
      const out = c.createGain(); out.gain.value = 0.55;
      const comp = c.createDynamicsCompressor(); out.connect(comp); comp.connect(c.destination);
      // 本体: 鋸波の倍音列を共鳴フィルタで角笛らしく。音程は低く始まり持ち上がって最後に少し落ちる
      const f0 = 146.8; // D3
      const freq = (p) => { p.setValueAtTime(f0 * 0.86, t); p.exponentialRampToValueAtTime(f0, t + 0.35); p.setValueAtTime(f0, t + 1.9); p.exponentialRampToValueAtTime(f0 * 0.9, t + D); };
      const env = c.createGain(); env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.35, t + 0.25); env.gain.linearRampToValueAtTime(0.75, t + 1.3);
      env.gain.linearRampToValueAtTime(0.6, t + 2.0); env.gain.exponentialRampToValueAtTime(0.0001, t + D);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4;
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1400, t + 1.3); lp.frequency.linearRampToValueAtTime(700, t + D);
      const fm = c.createBiquadFilter(); fm.type = 'peaking'; fm.frequency.value = 620; fm.Q.value = 2; fm.gain.value = 8;
      env.connect(lp); lp.connect(fm); fm.connect(out);
      const vib = c.createOscillator(); vib.frequency.value = 5.2; const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(2.2, t + 1.5); vib.connect(vg);
      [['sawtooth', 1, 0.5], ['sawtooth', 1.004, 0.35], ['triangle', 0.5, 0.5]].forEach(([ty, r, g]) => {
        const o = c.createOscillator(); o.type = ty; freq(o.frequency); if (r !== 1) o.detune.value = 1200 * Math.log2(r);
        vg.connect(o.frequency); const og = c.createGain(); og.gain.value = g; o.connect(og); og.connect(env); o.start(t); o.stop(t + D + 0.1);
      });
      vib.start(t); vib.stop(t + D + 0.1);
      // 息の音: 帯域ノイズ
      const len = Math.floor(c.sampleRate * (D + 0.1)); const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const ns = c.createBufferSource(); ns.buffer = buf; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
      const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.22, t + 0.12); ng.gain.linearRampToValueAtTime(0.08, t + 1.0); ng.gain.exponentialRampToValueAtTime(0.0001, t + D);
      ns.connect(bp); bp.connect(ng); ng.connect(out); ns.start(t); ns.stop(t + D + 0.1);
      horaEndAt = Date.now() + Math.ceil((D + 0.15) * 1000);
      window.__horagaiPlayed = (window.__horagaiPlayed || 0) + 1;
    } catch (_) {}
  }

  const ICON_ON = '🔊', ICON_OFF = '🔇';
  function paint() {
    const mu = muted();
    document.querySelectorAll('.bgm-toggle-btn').forEach(b => {
      const i = b.querySelector('.opening-btn-icon'); if (i) i.textContent = mu ? ICON_OFF : ICON_ON;
      const t = b.querySelector('.opening-btn-text'); if (t) t.textContent = mu ? 'BGM 切' : 'BGM';
      const lbl = mu ? '音楽を再生' : '音楽を消す'; b.title = lbl; b.setAttribute('aria-label', lbl); b.setAttribute('aria-pressed', mu ? 'true' : 'false');
      b.classList.toggle('is-muted', mu);
    });
  }
  function toggle(ev) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    const e = m(); unlock();
    if (e) { try { e.toggleBgmMute(); } catch (_) { e.isBgmMuted = !e.isBgmMuted; } }
    store(muted()); paint();
    if (!muted()) setTimeout(ensure, 30);
  }
  function makeBtn(cls) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bgm-toggle-btn ' + cls;
    b.innerHTML = '<span class="opening-btn-icon"></span><span class="opening-btn-text"></span>';
    b.addEventListener('click', toggle); return b;
  }
  function addHeaderBtn() {
    const bar = document.querySelector('#startModal .start-header-actions');
    if (!bar || bar.querySelector('.bgm-toggle-btn')) return;
    bar.insertBefore(makeBtn('load-record-top-btn'), bar.firstChild); paint();
  }
  function addMeikanBtn(ov) {
    const head = ov.querySelector('.mk-head'), close = ov.querySelector('.mk-close');
    if (!head || head.querySelector('.bgm-toggle-btn')) return;
    const b = makeBtn('mk-bgm'); head.insertBefore(b, close || null); paint();
  }
  function boot() {
    applyStored(); addHeaderBtn(); paint();
    new MutationObserver(ms => ms.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('mk-overlay')) addMeikanBtn(n); })))
      .observe(document.body, { childList: true });
    document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#daimyoPopupStartBtn')) {
      startClicked = true; done = true;
      const e2 = m(); if (e2 && e2.currentTrack === 'op' && e2.timerId) { try { e2.stop(); } catch (_) {} } // タイトル曲は法螺貝と重ねずに止める
      horagai();
    } }, true);
    setInterval(() => {
      if (!done && startClicked) { // ゲーム開始：別の曲が始まらなければ止める
        const e = m(); done = true;
        setTimeout(() => { if (e && e.currentTrack === 'op' && e.timerId) try { e.stop(); } catch (_) {} }, 1500);
        return;
      }
      ensure();
    }, 500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.SengokuTitleBgm = { toggle, horagai, horagaiRemainingMs, isMuted: muted, get active() { return !done; } };
})();
