/**

 * @file js/ui/UIManager.js - UI表示・モーダル・HUD・ジュークボックス制御

 * 戦国天下統一伝 ES6モジュール

 * @typedef {import('../types.js').Officer} Officer

 * @typedef {import('../types.js').Province} Province

 * @typedef {import('../types.js').PlayableDaimyo} PlayableDaimyo

 * @typedef {import('../types.js').Scenario} Scenario

 * @typedef {import('../types.js').HistoricalEvent} HistoricalEvent

 */



import { OpeningMovie } from './OpeningMovie.js?v=20261031_sound_sync';



// モジュール間安全参照ヘルパー

var getClanAbility = (clanId) => (typeof window !== 'undefined' && typeof window.getClanAbility === 'function')

  ? window.getClanAbility(clanId)

  : ((typeof window !== 'undefined' && window.CLAN_ABILITIES?.[clanId]) || { politics: 60, military: 60, stratagem: 55, personality: 'balanced' });



function _createArrayProxy(getter) {

  return new Proxy([], {

    get(target, prop, receiver) {

      const arr = getter();

      if (prop === 'length') return arr.length;

      if (prop === Symbol.iterator) return arr[Symbol.iterator].bind(arr);

      const val = Reflect.get(arr, prop, receiver);

      return typeof val === 'function' ? val.bind(arr) : val;

    },

    has(target, prop) { return Reflect.has(getter(), prop); },

    ownKeys(target) { return Reflect.ownKeys(getter()); },

    getOwnPropertyDescriptor(target, prop) { return Object.getOwnPropertyDescriptor(getter(), prop); }

  });

}

function _createObjectProxy(getter) {

  return new Proxy({}, {

    get(target, prop, receiver) {

      const obj = getter();

      const val = Reflect.get(obj, prop, receiver);

      return typeof val === 'function' ? val.bind(obj) : val;

    },

    has(target, prop) { return Reflect.has(getter(), prop); },

    ownKeys(target) { return Reflect.ownKeys(getter()); },

    getOwnPropertyDescriptor(target, prop) { return Object.getOwnPropertyDescriptor(getter(), prop); }

  });

}



var SCENARIOS = _createArrayProxy(() => (typeof window !== 'undefined' && ((window.SCENARIOS_DATA?.length ? window.SCENARIOS_DATA : window.SCENARIOS) || [])) || []);

var CLAN_MASTER = _createObjectProxy(() => (typeof window !== 'undefined' && (window.CLAN_MASTER_DATA || window.CLAN_MASTER || {})) || {});

var DAIMYOS = (typeof window !== 'undefined' && window.DAIMYOS) || [];

var DAIMYO_EPILOGUES = (typeof window !== 'undefined' && window.DAIMYO_EPILOGUES) || {};

var triggerCelebrationConfetti = (typeof window !== 'undefined' && window.triggerCelebrationConfetti) || (() => {});

var formatHistoricalYear = (y) => (typeof window !== 'undefined' && typeof window.formatHistoricalYear === 'function')

  ? window.formatHistoricalYear(y)

  : (Number(y) < 0 ? `前${Math.abs(Number(y))}` : String(y ?? ''));



export class UIManager {

  constructor(game) {

    this.game = game;

  }

}



export const UIManagerMethods = {

  formatYear(year = this.year) {

    return formatHistoricalYear(year);

  },



  savedDaimyoName(data) {

    const clanId = data?.playerClanId;

    if (!clanId) return '無名';



    const living = (data.activeOfficers || []).find(o =>

      o && o.clanId === clanId && o.isDaimyo && !o.isDead && !this.looksLikeClanId(o.name)

    );

    if (living) return living.name;



    const last = data.lastDaimyoNames?.[clanId];

    if (!this.looksLikeClanId(last)) return last;



    const scens = (window.SCENARIOS_DATA && window.SCENARIOS_DATA.length > 0) ? window.SCENARIOS_DATA : (SCENARIOS || []);

    const scen = scens.find(s => String(s.id) === String(data.currentScenarioId));

    const playable = scen?.playables?.find(x => x.id === clanId);

    if (playable && !this.looksLikeClanId(playable.name)) return playable.name;



    const master = (window.CLAN_MASTER_DATA || CLAN_MASTER || {})[clanId];

    if (master?.leaders) {

      const curY = Number(data.year || 0);

      const validYears = Object.keys(master.leaders)

        .map(Number)

        .filter(y => !isNaN(y) && y <= curY)

        .sort((a, b) => b - a);

      const dated = validYears.length > 0 ? master.leaders[String(validYears[0])] : '';

      if (!this.looksLikeClanId(dated)) return dated;

      if (!this.looksLikeClanId(master.leaders.default)) return master.leaders.default;

    }



    const template = DAIMYOS.find(x => x.id === clanId);

    if (template && !this.looksLikeClanId(template.name)) return template.name;

    if (master?.family && !this.looksLikeClanId(master.family)) {

      return String(master.family).replace(/軍$/, '');

    }

    return '大名';

  },



  // 人名には「公」。家名・朝廷名（河内源氏、平安朝廷など）には付けない。

  // 「源義家」のように名が「家」で終わる人物は人名として扱う。,



  savedDaimyoLabel(data, name) {

    const clanId = data?.playerClanId;

    const labels = new Set();

    const master = (window.CLAN_MASTER_DATA || CLAN_MASTER || {})[clanId];

    if (master?.family) labels.add(String(master.family));

    const scens = (window.SCENARIOS_DATA && window.SCENARIOS_DATA.length > 0) ? window.SCENARIOS_DATA : (SCENARIOS || []);

    const scen = scens.find(s => String(s.id) === String(data?.currentScenarioId));

    const playable = scen?.playables?.find(x => x.id === clanId);

    if (playable?.clan) labels.add(playable.clan);

    if (labels.has(name) || /(氏|朝廷|幕府|政府|衆|党)$/.test(name || '')) return name;

    return `${name}公`;

  },



  // 自動セーブ・複数スロットデータの確認と再開UI,



  checkResumeSaveData() {

    // 「記録読込」ボタン：前回の戦況から再開・記録枠・ファイル読込を一つの読込ダイアログで提供

    const loadBtn = document.getElementById('openLoadDialogBtn');

    if (loadBtn) loadBtn.onclick = () => { this.checkResumeSaveData._refresh?.(); this.openSaveLoadModal('load'); };



    // オートセーブおよび各スロットから最新のセーブデータを探索（読込ダイアログ先頭の「前回の戦況から再開」に使う）

    const findLatest = () => {

      let latestData = null, latestTime = 0;

      const slots = (typeof window !== 'undefined' && window.SAVE_SLOTS) || [

        { id: 'auto', key: 'sengoku_save_data', label: '自動保存' },

        { id: 'slot1', key: 'sengoku_save_slot_1', label: '手動記録枠 壱' },

        { id: 'slot2', key: 'sengoku_save_slot_2', label: '手動記録枠 弐' },

        { id: 'slot3', key: 'sengoku_save_slot_3', label: '手動記録枠 参' },

        { id: 'slot4', key: 'sengoku_save_slot_4', label: '手動記録枠 四' },

        { id: 'slot5', key: 'sengoku_save_slot_5', label: '手動記録枠 五' }

      ];

      slots.forEach(s => {

        try {

          const raw = localStorage.getItem(s.key);

          if (raw) {

            const d = JSON.parse(raw);

            const t = d.savedAt ? new Date(d.savedAt).getTime() : 1;

            if (t >= latestTime) { latestTime = t; latestData = d; }

          }

        } catch (e) {}

      });

      this._latestResumeData = latestData;

      this._latestResumeSummary = '';

      if (!latestData) return;

      try {

        const provs = latestData.provincesDelta || latestData.provinces || [];

        const myProvs = provs.filter(p => p.ownerId === latestData.playerClanId);

        const daimyoLabel = this.savedDaimyoLabel(latestData, this.savedDaimyoName(latestData));

        const seasonName = ['春', '夏', '秋', '冬'][latestData.seasonIdx || 0];

        const totalCount = provs.length || ((window.PROVINCES_DATA && window.PROVINCES_DATA.length) || 77);

        this._latestResumeSummary = `${formatHistoricalYear(latestData.year)}年 ${seasonName} / ${daimyoLabel}（支配: ${myProvs.length}/${totalCount}国 / 兵力: ${myProvs.reduce((a,c)=>a+(c.troops || 0),0).toLocaleString()}人）`;

      } catch (e) {

        console.warn('Invalid save data:', e);

      }

    };

    this.checkResumeSaveData._refresh = findLatest;

    findLatest();

  },



  // 読込ダイアログ先頭：前回の戦況（最新の記録）から再開するカード

  _renderResumeLatestCard(container) {

    this.checkResumeSaveData._refresh?.();

    const data = this._latestResumeData;

    if (!data) return;

    const card = document.createElement('div');

    card.className = 'resume-latest-card';

    card.style.cssText = 'background:linear-gradient(90deg, rgba(27,79,114,0.9), rgba(41,128,185,0.9)); border:2px solid #5dade2; border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;';

    const info = document.createElement('div');

    info.style.cssText = 'flex:1; min-width:0; font-size:11.5pt; color:#d4e6f1;';

    info.innerHTML = `<div style="font-weight:bold; color:#fff;">▶ 前回の戦況から再開</div><div style="font-size:10.5pt; margin-top:2px;">${this._latestResumeSummary || ''}</div>`;

    const btn = document.createElement('button');

    btn.className = 'turn-btn';

    btn.id = 'resumeSaveBtn';

    btn.style.cssText = 'margin:0; width:auto; padding:6px 18px; font-size:11pt; background:linear-gradient(180deg, #27ae60, #1e8449); border-color:#2ecc71;';

    btn.textContent = '前回の戦況から再開';

    btn.onclick = () => {

      document.getElementById('saveLoadModal')?.classList.add('hidden');

      this.loadGameData(data);

      document.getElementById('startModal')?.classList.add('hidden');

    };

    card.appendChild(info); card.appendChild(btn);

    container.appendChild(card);

  },



  // シナリオ切替,



  renderStartModal() {

    this.updateDiffBadge();

    document.querySelectorAll('.diff-option-btn[data-diff]').forEach(b => {

      b.classList.toggle('selected', b.dataset.diff === this.currentDifficulty);

    });



    // 多重登録防止: イベントリスナーは親コンテナへのイベントデリゲーションで初回のみ登録

    if (!this._startModalDelegated) {

      this._startModalDelegated = true;



      this.preSengokuOpen = false;
      this.postSengokuOpen = false;
      this.updateScenarioTabsAndList();

      const modal = document.getElementById('startModal');

      if (modal) {

        modal.addEventListener('click', (e) => {

          // 0. オープニングムービー鑑賞ボタン (武将風雲録風 HTML Canvas絵巻)

          const opBtn = e.target.closest('#startOpeningMovieBtn');

          if (opBtn) {

            this.playOpeningMovie();

            return;

          }



          // 0.5 乱世より前／乱世より後 まとめボタン
          const cushionBtn = e.target.closest('.era-cushion-btn');
          if (cushionBtn) {
            if (cushionBtn.id === 'btnCushionPre') {
              this.preSengokuOpen = !this.preSengokuOpen;
              if (this.preSengokuOpen) this.postSengokuOpen = false;
            } else if (cushionBtn.id === 'btnCushionPost') {
              this.postSengokuOpen = !this.postSengokuOpen;
              if (this.postSengokuOpen) this.preSengokuOpen = false;
            }
            this.updateScenarioTabsAndList({ scrollToTop: true });
            if (this.audio && this.audio.playHyoshigi) {
              this.audio.playHyoshigi();
            }
            return;
          }

          // 1. 時代タブ
          const tab = e.target.closest('.era-tab-btn');
          if (tab) {
            const wasActive = tab.classList.contains('active');
            document.querySelectorAll('.era-tab-btn').forEach(t => t.classList.remove('active'));
            if (!wasActive) {
              tab.classList.add('active');
            }
            this.updateScenarioTabsAndList();
            if (this.audio && this.audio.playHyoshigi) {
              this.audio.playHyoshigi();
            }
            return;
          }



          // 2. シナリオ選択ボタン

          const scenBtn = e.target.closest('.scenario-btn');

          if (scenBtn && scenBtn.dataset.scenId) {

            this.switchScenario(scenBtn.dataset.scenId);

            if (this.audio && this.audio.playHyoshigi) {

              this.audio.playHyoshigi();

            }

            return;

          }



          // 3. 難易度選択ボタン

          const diffBtn = e.target.closest('.diff-option-btn[data-diff]');

          if (diffBtn) {

            document.querySelectorAll('.diff-option-btn[data-diff]').forEach(b => b.classList.remove('selected'));

            diffBtn.classList.add('selected');

            this.currentDifficulty = diffBtn.dataset.diff;

            this.updateDiffBadge();

            if (this.audio && this.audio.playHyoshigi) {

              this.audio.playHyoshigi();

            }

            this.showDifficultyInfoDialog(diffBtn);

            return;

          }



          // 4. ゲーム開始ボタン (AudioContext を確実に resume)

          const startBtn = e.target.closest('#startGameBtn');

          if (startBtn) {

            if (this.music) {

              this.music.init();

              if (this.music.ctx && this.music.ctx.state === 'suspended') {

                this.music.ctx.resume().catch(() => {});

              }

            }

            this.startGame();

            return;

          }



          // 5. 天下観戦（成り行きを見守る）ボタン

          const specBtn = e.target.closest('#startSpectatorBtn');

          if (specBtn) {

            this.startSpectatorMode();

            return;

          }

        });

      }



      // 大名詳細ポップアップ内のデリゲーション

      const popup = document.getElementById('daimyoPopup');

      if (popup) {

        popup.addEventListener('click', (e) => {

          if (e.target.closest('#daimyoPopupStartBtn')) {

            popup.classList.add('hidden');

            if (this.music) {

              this.music.init();

              if (this.music.ctx && this.music.ctx.state === 'suspended') {

                this.music.ctx.resume().catch(() => {});

              }

            }

            this.startGame();

          } else if (e.target.closest('#daimyoPopupCloseBtn') || e.target.closest('#daimyoPopupCancelBtn') || e.target === popup) {

            popup.classList.add('hidden');

          }

        });

      }

    }



    this.switchScenario(this.currentScenarioId);

  },



  /**

   * 戦国天下統一伝 オープニング絵巻ムービーを再生 (信長の野望 武将風雲録風)

   */

  // 難易度の説明ダイアログ（選択後に表示し、「閉じる」で選択画面へ戻る）

  showDifficultyInfoDialog(btn) {

    const key = btn.dataset.diff;

    const info = {

      easy:   { name: '初級・天下泰平', lines: ['初期資金 金800／米1200', '自軍の内政収入 +25%', '敵AIの徴兵速度 0.8倍（穏健）', '包囲網の発生率 極小'] },

      normal: { name: '中級・群雄割拠', lines: ['初期資金 金500／米800', '標準バランス', '敵AIの徴兵・進攻速度 1.0倍', '12か国制覇で包囲網が発生'] },

      hard:   { name: '上級・風雲再起', lines: ['初期資金 金350／米500', '敵AIの徴兵速度 1.3倍', '敵の好戦度 +20%', '10か国制覇で包囲網が早期結成'] },

      hell:   { name: '超級・戦国地獄', lines: ['初期資金 金250／米300', '敵AIの徴兵速度 1.6倍', '敵軍の攻撃力 +20%', '全大名が敵対し、包囲網が頻発'] }

    }[key];

    if (!info) return;

    const html = `<ul style="text-align:left; margin:0 auto; padding-left:1.2em; font-size:12pt; line-height:1.8; color:#f0e6d0;">${info.lines.map(l => `<li>${l}</li>`).join('')}</ul>`;

    if (typeof Swal !== 'undefined' && Swal.fire) {

      Swal.fire({ title: `難易度【${info.name}】`, html, confirmButtonText: '閉じる', confirmButtonColor: '#9a7b2c', background: '#241710', color: '#ffd700' });

    } else {

      alert(`難易度【${info.name}】\n` + info.lines.join('\n'));

    }

  },



  updateScenarioTabsAndList({ scrollToTop = false } = {}) {
    const preOpen = !!this.preSengokuOpen;
    const postOpen = !!this.postSengokuOpen;

    const group = document.getElementById('scenarioSelectorGroup');
    if (group) {
      group.classList.toggle('mode-pre-sengoku', preOpen);
      group.classList.toggle('mode-post-sengoku', postOpen);
    }

    // 1. クッションボタンの表示・開閉状態更新（シンプル表示）
    const preBtn = document.getElementById('btnCushionPre');
    if (preBtn) {
      preBtn.setAttribute('aria-expanded', preOpen ? 'true' : 'false');
      preBtn.classList.toggle('open', preOpen);
      const icon = preBtn.querySelector('.cushion-icon');
      if (icon) icon.textContent = preOpen ? '▼' : '▶';
      const note = preBtn.querySelector('.cushion-note');
      if (note) note.textContent = '';
    }
    const postBtn = document.getElementById('btnCushionPost');
    if (postBtn) {
      postBtn.setAttribute('aria-expanded', postOpen ? 'true' : 'false');
      postBtn.classList.toggle('open', postOpen);
      const icon = postBtn.querySelector('.cushion-icon');
      if (icon) icon.textContent = postOpen ? '▼' : '▶';
      const note = postBtn.querySelector('.cushion-note');
      if (note) note.textContent = '';
    }

    // 2. 時代タブの連動表示・非表示
    // 乱世より前モード時: 古代・平安、源平・鎌倉、室町の3つに絞る
    // 乱世より後モード時: 泰平・幕末のみに絞る
    // 通常時（どちらも閉）: 戦国乱世、天下統一のみ表示
    document.querySelectorAll('#scenarioEraTabs .era-tab-btn').forEach(tab => {
      const era = tab.dataset.era;
      if (preOpen) {
        tab.style.display = ['ancient', 'genpei_kamakura', 'muromachi'].includes(era) ? '' : 'none';
      } else if (postOpen) {
        tab.style.display = (era === 'edo_bakumatsu') ? '' : 'none';
      } else {
        tab.style.display = ['sengoku_climax', 'unification'].includes(era) ? '' : 'none';
      }
    });

    // 非表示になったタブが active だった場合は解除
    const activeTab = document.querySelector('.era-tab-btn.active');
    if (activeTab && activeTab.style.display === 'none') {
      activeTab.classList.remove('active');
    }

    // 現在選択されている時代タブ
    const curActive = document.querySelector('.era-tab-btn.active');
    const targetEra = curActive ? curActive.dataset.era : null;

    // 3. シナリオボタンの表示・非表示（乱世より前・乱世より後で対称に挙動統一）
    document.querySelectorAll('.scenario-btn').forEach(btn => {
      const era = btn.dataset.era;
      const isPre = (era === 'ancient' || era === 'genpei_kamakura' || era === 'muromachi');
      const isPost = (era === 'edo_bakumatsu');
      const isSengoku = (era === 'sengoku_climax' || era === 'unification' || era === 'virtual');

      // 乱世より前モード時: 前シナリオのみ表示、戦国・後は非表示
      if (preOpen) {
        if (!isPre) {
          btn.style.display = 'none';
          return;
        }
      } else if (isPre) {
        btn.style.display = 'none';
        return;
      }

      // 乱世より後モード時: 後シナリオのみ表示、戦国・前は非表示
      if (postOpen) {
        if (!isPost) {
          btn.style.display = 'none';
          return;
        }
      } else if (isPost) {
        btn.style.display = 'none';
        return;
      }

      // 通常時（前も後も閉）で戦国シナリオの場合
      if (!preOpen && !postOpen && isSengoku) {
        if (targetEra && targetEra !== 'all') {
          btn.style.display = (era === targetEra) ? '' : 'none';
        } else {
          btn.style.display = '';
        }
        return;
      }

      // フィルター適用
      if (targetEra && targetEra !== 'all') {
        btn.style.display = (era === targetEra) ? '' : 'none';
      } else {
        btn.style.display = '';
      }
    });

    // 4. クッションボタン自体の表示制御
    if (preBtn) {
      if (postOpen) {
        preBtn.style.display = 'none';
      } else {
        preBtn.style.display = (!targetEra || ['ancient', 'genpei_kamakura', 'muromachi', 'sengoku_climax'].includes(targetEra)) ? '' : 'none';
      }
    }
    if (postBtn) {
      if (preOpen) {
        postBtn.style.display = 'none';
      } else {
        postBtn.style.display = (!targetEra || ['unification', 'edo_bakumatsu'].includes(targetEra)) ? '' : 'none';
      }
    }

    // スクロールコンテナのスクロール位置を最上部に合わせる
    if (scrollToTop) {
      const container = document.querySelector('.sl-scen-body') || document.querySelector('.scenario-selector-container');
      if (container) {
        container.scrollTop = 0;
      }
    }

    if (window.SengokuStartLayout && window.SengokuStartLayout.refresh) {
      window.SengokuStartLayout.refresh();
    }
  },

  playOpeningMovie() {

    if (!this.openingMovie) {

      this.openingMovie = new OpeningMovie({

        music: this.music || window.sengokuMusic,

        onClose: () => {

          // オープニング終了時のハンドラ

          console.info('[UIManager] オープニング絵巻を終了しました');

        }

      });

    }

    this.openingMovie.start();

  },



  // 大名の初期資金（シナリオデータに金・兵糧が欠けていても、領国数から自動生成と同じ式で補う）

  _playableFunds(d, key) {

    const v = Number(d && d[key]);

    if (Number.isFinite(v) && v > 0) return v;

    const n = (d && (d.provCount || (d.myProvinces && d.myProvinces.length))) || 1;

    return key === 'gold' ? Math.max(2500, n * 2000 + 1000) : Math.max(3000, n * 2500 + 1200);

  },



  // 要望対応: シナリオに領国を持つすべての勢力をプレイ可能大名として網羅,



  renderDaimyoGrid(playables, defaultClanId) {

    const grid = document.getElementById('daimyoGrid');

    if (!grid) return;

    grid.innerHTML = '';



    grid.style.maxHeight = '480px';

    grid.style.overflowY = 'auto';

    grid.style.overflowX = 'hidden';

    grid.style.display = 'grid';

    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(152px, 1fr))';

    grid.style.gap = '6px';

    grid.style.padding = '4px 6px';

    grid.style.boxSizing = 'border-box';



    let initialSelectedDaimyo = null;



    playables.forEach(d => {

      const isSelected = d.id === defaultClanId;

      if (isSelected || (!initialSelectedDaimyo && !defaultClanId)) {

        this.playerClanId = d.id;

        this.playerDaimyo = d;

        initialSelectedDaimyo = d;

      }



      const card = document.createElement('div');

      card.className = `daimyo-card ${isSelected ? 'selected' : ''}`;

      card.dataset.id = d.id;

      card.style.cursor = 'pointer';



      // 能力値・性格の取得 (d.statsを最優先し、詳細モーダルとの完全一致を保証)

      const ability = getClanAbility(d.id);

      const stats = d.stats || ability;

      const milVal = stats.military ?? ability.military ?? 60;

      const polVal = stats.politics ?? stats.politic ?? ability.politics ?? 60;

      const strVal = stats.stratagem ?? stats.intel ?? stats.intellect ?? ability.stratagem ?? 55;

      const personalityKey = d.personality || ability.personality || 'balanced';

      const personLabel = personalityKey === 'aggressive' ? '攻勢型 ⚔️'

                        : personalityKey === 'domestic'   ? '内政型 🌾'

                        : 'バランス型 ⚖️';

      const personColor = personalityKey === 'aggressive' ? '#ff6b6b'

                        : personalityKey === 'domestic'   ? '#2ecc71'

                        : '#3498db';

      const provCount = d.provCount || (d.myProvinces ? d.myProvinces.length : 1);

      const kamonId = this.getClanKamonId(d.id);

      // 本拠地の国名（大名詳細の「本拠」と同じ startProvId から引く）

      const homeProvId = d.startProvId || (d.myProvinces && d.myProvinces[0]);

      const homeProvName = this.getProvinceJapaneseName(homeProvId);



      card.title = `${d.clan} 当主: ${d.name}\n支配: ${provCount}国\n(クリックで戦略解説・出陣)`;

      card.innerHTML = `

        <div class="daimyo-name">

          <div class="daimyo-name-wrap">

            <svg style="width:18px; height:18px; vertical-align:middle; flex-shrink:0; margin-top:1px;">

              <use href="#${kamonId}"></use>

            </svg>

            <span class="daimyo-name-text" title="${d.name}">${d.name}</span>

          </div>

          <span class="daimyo-prov-badge">${provCount}国</span>

        </div>

        <div class="daimyo-clan-row">

          <span class="daimyo-clan-name" title="${d.clan}・本拠 ${homeProvName}">${homeProvName}</span>

          <span style="color:${personColor}; font-size: 10.5pt; background:rgba(0,0,0,0.6); padding:1px 4px; border-radius:2px; border:1px solid ${personColor}; flex-shrink:0;">${d.difficulty || '中級'}</span>

        </div>

        <div class="daimyo-card-stats" style="display:flex; justify-content:space-between; font-size: 11.5pt; background:rgba(0,0,0,0.35); padding:1px 4px; border-radius:2px;">

          <span style="color:#ffaaaa;">武<strong>${milVal}</strong></span>

          <span style="color:#aaffaa;">内<strong>${polVal}</strong></span>

          <span style="color:#aaaaff;">知<strong>${strVal}</strong></span>

        </div>

      `;



      // シングルクリックで各大名の詳細解説ダイアログを展開

      card.addEventListener('click', () => {

        document.querySelectorAll('.daimyo-card').forEach(c => c.classList.remove('selected'));

        card.classList.add('selected');

        this.playerClanId = d.id;

        this.playerDaimyo = d;

        this.gold = this._playableFunds(d, 'gold');

        this.rice = this._playableFunds(d, 'rice');

        if (window.SengokuStartLayout && typeof window.SengokuStartLayout.selectClan === 'function') {
          window.SengokuStartLayout.selectClan(d.id, { scroll: false, silent: true });
        }



        const badge = document.getElementById('selectedDaimyoBadge');

        if (badge) {

          badge.textContent = `選択中: ${d.name} (${d.clan}・支配${provCount}国)`;

        }



        this.audio.playHyoshigi();

        this.showDaimyoPopup(d);

      });



      grid.appendChild(card);

    });



    const defaultCard = grid.querySelector(`.daimyo-card[data-id="${defaultClanId}"]`) || grid.querySelector('.daimyo-card');

    if (defaultCard) {

      document.querySelectorAll('.daimyo-card').forEach(c => c.classList.remove('selected'));

      defaultCard.classList.add('selected');

      // 北から並べたので、おすすめ大名がグリッドの下にあっても見えるところまで送る（ページ自体は動かさない）

      const top = defaultCard.offsetTop - grid.offsetTop;

      if (top > grid.clientHeight - defaultCard.offsetHeight) grid.scrollTop = Math.max(0, top - 8);

      else grid.scrollTop = 0;

      const dData = playables.find(d => d.id === defaultCard.dataset.id) || playables[0];

      if (dData) {

        this.playerClanId = dData.id;

        this.playerDaimyo = dData;

        this.gold = this._playableFunds(dData, 'gold');

        this.rice = this._playableFunds(dData, 'rice');



        const provCount = dData.provCount || (dData.myProvinces ? dData.myProvinces.length : 1);

        const badge = document.getElementById('selectedDaimyoBadge');

        if (badge) {

          badge.textContent = `選択中: ${dData.name} (${dData.clan}・支配${provCount}国)`;

        }

      }

    }

  },



  showDaimyoPopup(d) {

    const popup = document.getElementById('daimyoPopup');

    if (!popup) return;



    this.playerClanId = d.id;

    this.playerDaimyo = d;

    this.gold = this._playableFunds(d, 'gold');

    this.rice = this._playableFunds(d, 'rice');



    const ability = getClanAbility(d.id);

    const stats = d.stats || ability;

    const milVal = stats.military ?? ability.military ?? 60;

    const polVal = stats.politics ?? stats.politic ?? ability.politics ?? 60;

    const strVal = stats.stratagem ?? stats.intel ?? stats.intellect ?? ability.stratagem ?? 55;

    const personalityKey = d.personality || ability.personality || 'balanced';

    const personLabel = personalityKey === 'aggressive' ? '攻勢型 ⚔️'

                      : personalityKey === 'domestic'   ? '内政型 🌾'

                      : 'バランス型 ⚖️';

    const personColor = personalityKey === 'aggressive' ? '#ff6b6b'

                      : personalityKey === 'domestic'   ? '#2ecc71'

                      : '#3498db';

    const kamonId = this.getClanKamonId(d.id);

    const provCount = d.provCount || (d.myProvinces ? d.myProvinces.length : 1);



    // シナリオ情報の取得 (IDまたは年で柔軟に検索)

    const scen = this.currentScenario || (window.SCENARIOS_DATA || SCENARIOS || []).find(s => String(s.id) === String(this.currentScenarioId) || String(s.year) === String(this.currentScenarioId)) || (window.SCENARIOS_DATA || SCENARIOS || [])[0];

    const scenTitle = scen ? `${formatHistoricalYear(scen.year)}年 ${scen.title}` : '戦国天下統一伝';



    // シナリオ固有の解説文を取得（大名の歴史的位置づけ）

    const scenDesc = (scen && scen.clanDescs && scen.clanDescs[d.id]) || d.desc || '天下布武の志を抱き、乱世に覇を唱えんとする当主。';



    const useEl = document.getElementById('popupKamonUse');

    if (useEl) useEl.setAttribute('href', `#${kamonId}`);



    const nameEl = document.getElementById('popupDaimyoName');

    if (nameEl) nameEl.textContent = d.name || '不明';



    const clanEl = document.getElementById('popupClanName');

    if (clanEl) clanEl.textContent = d.clan || '';



    const scenContextEl = document.getElementById('popupScenarioContext');

    if (scenContextEl) scenContextEl.textContent = `❖ ${scenTitle} ❖`;



    const diffEl = document.getElementById('popupDifficulty');

    if (diffEl) {

      const diffVal = d.difficulty || '中級';

      diffEl.textContent = diffVal;

      const isSuper = diffVal === '超上級' || diffVal === '修羅';

      diffEl.style.borderColor = diffVal === '初級' ? '#2ecc71' : diffVal === '中級' ? '#f39c12' : isSuper ? '#c0392b' : '#e74c3c';

      diffEl.style.color = diffVal === '初級' ? '#a9dfbf' : diffVal === '中級' ? '#f8c471' : isSuper ? '#ff6b6b' : '#ff9999';

    }



    const totalProvs = (this.provinces && this.provinces.length > 0) ? this.provinces.length : ((window.PROVINCES_DATA && window.PROVINCES_DATA.length) || 77);

    const provEl = document.getElementById('popupProvCount');

    if (provEl) provEl.textContent = `支配: ${provCount}国 (天下統一まで${Math.max(0, totalProvs - provCount)}国)`;



    const milEl = document.getElementById('popupMilitary');

    if (milEl) milEl.textContent = milVal;



    const polEl = document.getElementById('popupPolitics');

    if (polEl) polEl.textContent = polVal;



    const strEl = document.getElementById('popupStratagem');

    if (strEl) strEl.textContent = strVal;



    const persEl = document.getElementById('popupPersonality');

    if (persEl) persEl.innerHTML = `<span style="color:${personColor}; border:1px solid ${personColor}; padding:3px 12px; border-radius:4px; font-size:12pt; font-weight:bold;">【${personLabel}】</span>`;



    const goldEl = document.getElementById('popupGold');

    if (goldEl) goldEl.textContent = (d.gold || 400).toLocaleString() + ' 貫';



    const riceEl = document.getElementById('popupRice');

    if (riceEl) riceEl.textContent = (d.rice || 600).toLocaleString() + ' 石';



    const descEl = document.getElementById('popupDesc');

    if (descEl) descEl.textContent = scenDesc;



    const tacEl = document.getElementById('popupTactic');

    if (tacEl) tacEl.innerHTML = `<strong>⚡ 奥義「${d.tactic || '全軍奮戦'}」</strong> ${d.tacticDesc || '全軍の力を結集して戦う！'}`;



    const startBtn = document.getElementById('daimyoPopupStartBtn');

    if (startBtn) {

      startBtn.innerHTML = `⚔️ 【${d.name}（${d.clan}）】で天下統一へ出陣！`;

    }



    // 周辺の出来事・近隣勢力動向 ＆ 戦略解説図 (SVG) の生成

    this.renderDaimyoStrategyBriefing(d, scen, ability);



    popup.classList.remove('hidden');

  },



  renderDaimyoStrategyBriefing(d, scen, ability) {

    const myProvs = d.myProvinces || [d.startProvId];

    const startProvId = d.startProvId || myProvs[0];

    const provList = this.provinces.length > 0 ? this.provinces : (window.PROVINCES_DATA || []);

    const homeProv = provList.find(p => p.id === startProvId);

    const homeProvName = homeProv ? homeProv.name : startProvId;

    const homeCastleName = (scen.castles && scen.castles[startProvId]) || (homeProv ? homeProv.castle : `${homeProvName}城`);



    const homeCastleLabel = document.getElementById('popupHomeCastleName');

    if (homeCastleLabel) homeCastleLabel.textContent = `本拠: ${homeProvName}国 (${homeCastleName})`;



    // 隣接する領国と他家勢力の抽出

    const neighborProvIds = new Set();

    myProvs.forEach(pId => {

      const p = provList.find(x => x.id === pId);

      if (p && p.neighbors) {

        p.neighbors.forEach(nId => {

          if (!myProvs.includes(nId)) {

            neighborProvIds.add(nId);

          }

        });

      }

    });



    const neighborClansMap = new Map();

    neighborProvIds.forEach(nId => {

      const ownerClanId = (scen.owners && scen.owners[nId]) || 'independent';

      const nProv = provList.find(x => x.id === nId);

      const nProvName = nProv ? nProv.name : nId;

      const nCastle = (scen.castles && scen.castles[nId]) || (nProv ? nProv.castle : `${nProvName}城`);



      if (!neighborClansMap.has(ownerClanId)) {

        const rivalPlayable = scen.playables ? scen.playables.find(x => (x && typeof x === 'object' ? x.id : x) === ownerClanId) : null;

        const rivalProfile = (window.CLAN_MASTER_DATA && window.CLAN_MASTER_DATA[ownerClanId]) || (window.CLAN_MASTER && window.CLAN_MASTER[ownerClanId]) || null;

        const rivalName = (rivalPlayable && typeof rivalPlayable === 'object' && rivalPlayable.name)

          ? rivalPlayable.name

          : ((typeof this.getDaimyoLeaderName === 'function' ? this.getDaimyoLeaderName(ownerClanId) : '') || rivalProfile?.family || ownerClanId);

        const rivalClan = (rivalPlayable && typeof rivalPlayable === 'object' && rivalPlayable.clan)

          ? rivalPlayable.clan

          : ((typeof this.getClanFamilyName === 'function' ? this.getClanFamilyName(ownerClanId) : '') || rivalProfile?.family || ownerClanId);

        const rivalKamon = this.getClanKamonId(ownerClanId);

        neighborClansMap.set(ownerClanId, {

          clanId: ownerClanId,

          name: rivalName || ownerClanId || '隣国',

          clan: rivalClan || ownerClanId || '隣家',

          kamonId: rivalKamon,

          provinces: [],

          castles: []

        });

      }

      const entry = neighborClansMap.get(ownerClanId);

      entry.provinces.push(nProvName);

      entry.castles.push(nCastle);

    });



    const neighborList = Array.from(neighborClansMap.values());



    // 周辺の出来事・近隣勢力動向テキストの生成

    const surroundingEl = document.getElementById('popupSurroundingEvents');

    if (surroundingEl) {

      if (neighborList.length === 0) {

        surroundingEl.innerHTML = `周囲に直接隣接する他家はなく、領内の治世と国力増強に専念できる稀有な情勢です。まずは内政で兵糧と軍資金を蓄えましょう。`;

      } else {

        const rivalDescParts = neighborList.slice(0, 3).map(r => {

          return `<strong style="color:var(--gold-bright);">${r.clan}</strong>（${r.name} / ${r.provinces.slice(0, 2).join('・')}）`;

        });

        surroundingEl.innerHTML = `

          本拠【${homeProvName}国】の周辺には、${rivalDescParts.join('、および')}などの群雄が隣接しています。<br>

          ${scen.title}の動乱を受け、諸大名は領国拡大を狙って一触即発の睨み合いを続けています。隣接国への侵攻路を慎重に吟味し、敵の防備が薄い隙を突くことが覇道への要衝となります。

        `;

      }

    }



    // 戦略解説図 (SVG) の動的生成

    const diagContainer = document.getElementById('popupStrategyDiagram');

    if (diagContainer) {

      const playerKamon = this.getClanKamonId(d.id);

      const keyNeighbors = neighborList.slice(0, 3);

      const px = 95, py = 85;



      const nCoords = keyNeighbors.length === 1 ? [

        { x: 355, y: 85, stance: '攻略目標', color: '#ffd700', marker: 'arrowGold' }

      ] : keyNeighbors.length === 2 ? [

        { x: 355, y: 46, stance: '攻略推奨', color: '#ffd700', marker: 'arrowGold' },

        { x: 355, y: 124, stance: '侵攻警戒', color: '#ff6b6b', marker: 'arrowRed' }

      ] : [

        { x: 355, y: 35, stance: '攻略推奨', color: '#ffd700', marker: 'arrowGold' },

        { x: 365, y: 85, stance: '係争敵対', color: '#f39c12', marker: 'arrowGold' },

        { x: 355, y: 135, stance: '侵攻警戒', color: '#ff6b6b', marker: 'arrowRed' }

      ];



      let svgContent = `

        <svg viewBox="0 0 460 170" width="100%" height="100%" style="display:block;">

          <defs>

            <linearGradient id="pCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">

              <stop offset="0%" stop-color="#3d281a"/>

              <stop offset="100%" stop-color="#1c120b"/>

            </linearGradient>

            <linearGradient id="eCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">

              <stop offset="0%" stop-color="#381515"/>

              <stop offset="100%" stop-color="#1a0808"/>

            </linearGradient>

            <marker id="arrowGold" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">

              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffd700" />

            </marker>

            <marker id="arrowRed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">

              <path d="M 0 1 L 10 5 L 0 9 z" fill="#ff6b6b" />

            </marker>

          </defs>



          <!-- 背景羅針盤グリッド線 -->

          <line x1="20" y1="85" x2="440" y2="85" stroke="rgba(212,175,55,0.12)" stroke-dasharray="3,3"/>

          <circle cx="95" cy="85" r="70" fill="none" stroke="rgba(212,175,55,0.1)" stroke-dasharray="2,4"/>

      `;



      // 矢印・相関線の描画

      keyNeighbors.forEach((nbr, i) => {

        const coord = nCoords[i];

        const isGold = coord.marker === 'arrowGold';

        svgContent += `

          <path d="M ${px + 52} ${py} Q ${(px + coord.x)/2} ${(py + coord.y)/2} ${coord.x - 52} ${coord.y}"

                fill="none" stroke="${coord.color}" stroke-width="2.2" stroke-dasharray="${isGold ? 'none' : '4,3'}"

                marker-end="url(#${coord.marker})"/>

          <text x="${(px + coord.x)/2 - 8}" y="${(py + coord.y)/2 - 5}" font-size="11" fill="${coord.color}" font-weight="bold" text-anchor="middle">

            ${coord.stance}

          </text>

        `;

      });



      // 貴家本拠ノード (左)

      svgContent += `

        <g transform="translate(${px - 50}, ${py - 35})">

          <rect x="0" y="0" width="102" height="70" rx="8" fill="url(#pCardGrad)" stroke="#ffd700" stroke-width="2" filter="drop-shadow(0 0 6px rgba(255,215,0,0.4))"/>

          <svg x="6" y="15" width="40" height="40"><use href="#${playerKamon}"/></svg>

          <text x="50" y="24" font-size="12" font-weight="bold" fill="#fff">${String(d.name || '').substring(0, 4)}</text>

          <text x="50" y="38" font-size="11" fill="#e59866">${String(d.clan || '').substring(0, 5)}</text>

          <rect x="48" y="44" width="48" height="16" rx="3" fill="rgba(212,175,55,0.25)"/>

          <text x="72" y="56" font-size="11" fill="#ffd700" text-anchor="middle" font-weight="bold">【貴家】</text>

        </g>

      `;



      // 周辺勢力ノード (右)

      if (keyNeighbors.length === 0) {

        svgContent += `

          <g transform="translate(290, 60)">

            <rect x="0" y="0" width="130" height="50" rx="6" fill="rgba(0,0,0,0.5)" stroke="#664422"/>

            <text x="65" y="30" font-size="12" fill="#aaa" text-anchor="middle">直接隣接する他家なし</text>

          </g>

        `;

      } else {

        keyNeighbors.forEach((nbr, i) => {

          const coord = nCoords[i];

          svgContent += `

            <g transform="translate(${coord.x - 50}, ${coord.y - 24})">

              <rect x="0" y="0" width="102" height="48" rx="6" fill="url(#eCardGrad)" stroke="${coord.color}" stroke-width="1.5"/>

              <svg x="5" y="7" width="34" height="34"><use href="#${nbr.kamonId}"/></svg>

              <text x="42" y="19" font-size="11" font-weight="bold" fill="#fff">${String(nbr.name || '').substring(0, 4)}</text>

              <text x="42" y="33" font-size="11" fill="#bbb">${String((nbr.provinces && nbr.provinces[0]) || '隣国').substring(0, 4)}</text>

            </g>

          `;

        });

      }



      svgContent += `</svg>`;

      diagContainer.innerHTML = svgContent;

    }



    // 初手攻略方針ガイダンスの動的生成

    const adviceEl = document.getElementById('popupStrategyAdvice');

    if (adviceEl) {

      const topTarget = neighborList[0] ? `隣接する【${(neighborList[0].provinces && neighborList[0].provinces[0]) || '隣国'}（${neighborList[0].clan || ''}）】` : '近隣の隣接国';

      if (ability.personality === 'aggressive') {

        adviceEl.innerHTML = `🎯 <strong>初手攻略方針:</strong> 武勇に優れる貴家は電撃戦が得意です。まずは兵力を前線へ集結し、${topTarget}への進撃路を開いて城郭を速やかに攻め落としましょう。`;

      } else if (ability.personality === 'domestic') {

        adviceEl.innerHTML = `🎯 <strong>初手攻略方針:</strong> 内政に長ける貴家は富国強兵が王道です。初期資金と米を活かして本拠地の商業・石高を開墾し、十分な兵站を築いてから${topTarget}へ侵攻しましょう。`;

      } else {

        adviceEl.innerHTML = `🎯 <strong>初手攻略方針:</strong> 攻守の調和に優れた貴家は臨機応変の軍略が鍵です。前線城の防備を固めつつ隣国の動向を睨み、隙を見て${topTarget}へ進出を図りましょう。`;

      }

    }

  },



  showOfficerDetailModal(offOrId) {

    this.pauseAutoPlayForScreen?.('武将詳細の表示');

    if (!offOrId) return;

    const targetId = typeof offOrId === 'string' ? ((window.OFFICER_ID_ALIASES && window.OFFICER_ID_ALIASES[offOrId]) || offOrId) : null;

    const off = typeof offOrId === 'string'

      ? (this.activeOfficers || []).find(o => o.id === targetId || o.id === offOrId) || (this.officers || []).find(o => o.id === targetId || o.id === offOrId) || (window.OFFICERS_MASTER || []).find(o => o.id === targetId || o.id === offOrId) || { name: offOrId }

      : offOrId;



    let modal = document.getElementById('officerDetailModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'officerDetailModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.78); z-index:100005; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    const assignedProv = (off.assignedProvId && off.clanId !== 'ronin') ? this.provinces.find(x => x.id === off.assignedProvId) : null;

    const isMyClan = off.clanId === this.playerClanId;

    const isRonin = off.clanId === 'ronin';

    const clanName = isRonin ? '浪人 (未仕官)' : this.getClanFamilyName(off.clanId);

    const detailClanText = isRonin ? clanName : (off.isDaimyo ? `${clanName} (当主)` : `${clanName} 配下`);

    const age = this.year - (off.birthYear || 1530);

    const comment = this.getOfficerComment(off);



    let roleBadge = '';

    if (off.isDaimyo) {

      roleBadge = '<span style="background:#b7950b; color:#fff; padding:3px 12px; border-radius:4px; font-size:12pt; font-weight:bold;">👑 当主</span>';

    } else if (assignedProv) {

      roleBadge = `<span style="background:#27ae60; color:#fff; padding:3px 12px; border-radius:4px; font-size:12pt;">🏯 ${assignedProv.name}城主</span>`;

    } else if (isRonin) {

      roleBadge = '<span style="background:#7f8c8d; color:#fff; padding:3px 12px; border-radius:4px; font-size:12pt;">流浪の士</span>';

    } else {

      roleBadge = '<span style="background:#2980b9; color:#fff; padding:3px 12px; border-radius:4px; font-size:12pt;">待機中</span>';

    }



    modal.innerHTML = `

      <div style="background:#1c130d; border:2px solid var(--gold); border-radius:8px; width:92vw; max-width:660px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 0 50px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif; animation:modalPopIn 0.18s ease-out;">

        <!-- ヘッダー -->

        <div style="padding:14px 22px; border-bottom:1px solid #5a4638; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%); display:flex; justify-content:space-between; align-items:center;">

          <div style="display:flex; align-items:center; gap:8px;">

            <span style="font-size:15pt; color:var(--gold-bright); font-weight:bold;">❖ 武将詳細・名将列伝 ❖</span>

          </div>

          <button id="closeOfficerDetailBtn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer; padding:0 6px;">✕</button>

        </div>



        <!-- 本文スクロール領域 -->

        <div style="padding:20px 24px; overflow-y:auto; flex:1;">

          <!-- 武将名 & 身分 & 所属 -->

          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:14px; border-bottom:1px solid #4a3b2c; padding-bottom:10px;">

            <div style="display:flex; align-items:center; gap:12px;">

              <span id="officerDetailName" style="font-size:19pt; font-weight:bold; color:#ffffff; letter-spacing:1px;">${off.name}</span>

              ${roleBadge}

            </div>

            <div style="font-size:12pt;">

              <span style="color:#aaa;">所属: </span>

              <strong style="color:${isRonin ? '#bdc3c7' : (isMyClan ? '#2ecc71' : 'var(--gold)')}; font-size:12.5pt;">${detailClanText}</strong>

            </div>

          </div>



          <!-- 生没年 & 所在・旧国名 & 特技 -->

          <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:18px; background:rgba(0,0,0,0.35); padding:10px 14px; border-radius:5px; border:1px solid #3d2d20;">

            <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; font-size:12pt; color:#ccc;">

              <div>

                生没年: <strong style="color:#ffffff;">${off.birthYear != null ? formatHistoricalYear(off.birthYear) + '年' : '?'} 〜 ${off.deathYear != null ? formatHistoricalYear(off.deathYear) + '年' : '?'}</strong>

                <span style="color:#aaa; margin-left:6px;">(現在 ${age}歳)</span>

              </div>

              <div>

                所在: <strong style="color:var(--gold-bright);">${this.getOfficerLocationInfo(off).provName}国</strong>

                <span style="color:#aaa; font-size:11pt; margin-left:2px;">(${this.getOfficerLocationInfo(off).label})</span>

              </div>

              ${(() => { const op = this.officerOriginProv ? this.officerOriginProv(off) : off.defaultProv; return op ? `<div style="font-size:12pt; color:#ccc;">出身: <strong>${this.getProvinceJapaneseName(op)}</strong></div>` : ''; })()}

            </div>

            <div style="font-size:12pt;">

              <span style="color:#ffeaa7; background:rgba(183,149,11,0.25); border:1px solid #b7950b; padding:3px 10px; border-radius:4px; font-weight:bold; font-size:12pt;">

                特技: ${off.skill || '名将の資質'}

              </span>

            </div>

          </div>



          <!-- 能力値カード -->

          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; text-align:center;">

            <div style="background:rgba(231,76,60,0.14); border:1px solid #c0392b; padding:10px 8px; border-radius:6px;">

              <div style="font-size:12pt; color:#ff7675; font-weight:bold;">⚔️ 武勇</div>

              <div style="font-size:19pt; font-weight:bold; color:#ff7675; margin-top:3px;">${off.military}</div>

            </div>

            <div style="background:rgba(52,152,219,0.14); border:1px solid #2980b9; padding:10px 8px; border-radius:6px;">

              <div style="font-size:12pt; color:#74b9ff; font-weight:bold;">🌾 内政</div>

              <div style="font-size:19pt; font-weight:bold; color:#74b9ff; margin-top:3px;">${off.politic || off.politics}</div>

            </div>

            <div style="background:rgba(46,204,113,0.14); border:1px solid #27ae60; padding:10px 8px; border-radius:6px;">

              <div style="font-size:12pt; color:#55efc4; font-weight:bold;">📜 知略</div>

              <div style="font-size:19pt; font-weight:bold; color:#55efc4; margin-top:3px;">${off.intel || off.stratagem}</div>

            </div>

          </div>



          <!-- 人物列伝本文 -->

          <div>

            <div style="font-size:13pt; color:var(--gold); font-weight:bold; margin-bottom:8px; display:flex; align-items:center; gap:8px;">

              <span>📖</span><span>人物列伝・歴史事績</span>

            </div>

            <div style="background:rgba(0,0,0,0.5); border:1px solid #5a4638; border-radius:6px; padding:16px 18px; font-size:13pt; color:#f0e6d2; line-height:1.85; letter-spacing:0.4px; word-break:break-all;">

              ${off.lore ? this.cleanOfficerLore(off.lore) : '（歴史の波間に埋もれし伝記。記録された詳細な事績はありません）'}

            </div>

          </div>

        </div>



        <!-- フッター -->

        <div style="padding:12px 24px; border-top:1px solid #443322; background:rgba(0,0,0,0.35); display:flex; justify-content:flex-end;">

          <button id="closeOfficerDetailBtnBottom" style="background:#555; color:#fff; border:none; padding:7px 24px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; transition:0.15s;">閉じる</button>

        </div>

      </div>

    `;



    modal.style.display = 'flex';

    this.audio.playHyoshigi();



    const closeModal = () => { modal.style.display = 'none'; };

    document.getElementById('closeOfficerDetailBtn')?.addEventListener('click', closeModal);

    document.getElementById('closeOfficerDetailBtnBottom')?.addEventListener('click', closeModal);



    // モーダル背景クリックで閉じる

    modal.onclick = (e) => {

      if (e.target === modal) closeModal();

    };

  },



  // 城主任命モーダル（表形式・ソート対応・幅広ダイアログ・文字サイズ12pt以上）,



  openAppointGovernorModal(provId) {

    this.pauseAutoPlayForScreen?.('城主任命画面の表示');

    const p = this.provinces.find(x => x.id === provId);

    if (!p || p.ownerId !== this.playerClanId) return;



    let modal = document.getElementById('governorAppointModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'governorAppointModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    let sortKey = 'role'; // 'role', 'name', 'age', 'military', 'politic', 'intel', 'comment'

    let sortOrder = 'desc'; // 'asc' or 'desc'

    let searchQuery = '';



    const render = () => {

      // 自家の全武将（現在生存中の武将）

      const myOfficers = (this.activeOfficers || this.officers || []).filter(o => o.clanId === this.playerClanId && !o.isDead);

      const currentGov = p.governorId ? myOfficers.find(o => o.id === p.governorId) : null;



      let list = [...myOfficers];



      if (searchQuery) {

        const q = searchQuery.trim().toLowerCase();

        list = list.filter(o => {

          const comment = this.getOfficerComment(o).toLowerCase();

          return (o.name && o.name.toLowerCase().includes(q)) || comment.includes(q);

        });

      }



      // ソート処理

      list.sort((a, b) => {

        let diff = 0;

        if (sortKey === 'role') {

          // 当主(3) > 現職城主(2.5) > 他城主(2) > 待機中(1)

          const getRoleScore = (off) => {

            if (off.isDaimyo) return 3;

            if (off.id === p.governorId) return 2.5;

            if (off.assignedProvId) return 2;

            return 1;

          };

          diff = getRoleScore(a) - getRoleScore(b);

          if (diff === 0) diff = (a.military || 0) - (b.military || 0);

        } else if (sortKey === 'name') {

          diff = (a.name || '').localeCompare(b.name || '', 'ja');

        } else if (sortKey === 'age') {

          const ageA = this.year - (a.birthYear || 1530);

          const ageB = this.year - (b.birthYear || 1530);

          diff = ageA - ageB;

        } else if (sortKey === 'military') {

          diff = (a.military || 0) - (b.military || 0);

        } else if (sortKey === 'politic') {

          diff = (a.politic || 0) - (b.politic || 0);

        } else if (sortKey === 'base') {

          const getBaseName = (off) => {

            if (off.assignedProvId) {

              const pr = this.provinces.find(x => x.id === off.assignedProvId);

              return pr ? pr.name : '';

            }

            if (off.isDaimyo) {

              const home = this.getDaimyoHomeProvince(off);

              return home ? home.name : '';

            }

            return '';

          };

          diff = getBaseName(a).localeCompare(getBaseName(b), 'ja');

        } else if (sortKey === 'intel') {

          diff = (a.intel || 0) - (b.intel || 0);

        } else if (sortKey === 'comment') {

          diff = this.getOfficerComment(a).localeCompare(this.getOfficerComment(b), 'ja');

        }

        return sortOrder === 'desc' ? -diff : diff;

      });



      const getSortIcon = (key) => {

        if (sortKey !== key) return '<span style="color:#776655; font-size:11pt; margin-left:4px;">↕</span>';

        return sortOrder === 'asc' 

          ? '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▲</span>' 

          : '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▼</span>';

      };



      modal.innerHTML = `

        <div class="custom-modal-content appoint-modal-content" style="background:#1b140e; border:2px solid var(--gold); border-radius:8px; width:95vw; max-width:1180px; height:88vh; display:flex; flex-direction:column; box-shadow:0 0 45px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif;">

          <!-- ヘッダー -->

          <div class="modal-header-bar appoint-header-bar" style="padding:12px 22px; border-bottom:1px solid #5a4638; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%); display:flex; justify-content:space-between; align-items:center;">

            <div>

              <h3 class="modal-title-text" style="margin:0; font-size:15pt; color:var(--gold-bright);">❖ ${p.name}国 (${p.castleName || p.castle}) 城代・城主任命 ❖</h3>

              <span class="modal-subtitle-text" style="font-size:12pt; color:#ccc;">武将行をクリックすると直ちに城主任命。各列ヘッダークリックで並び替え。城主不在時は城代が統治（能力${Math.round((p.jodaiRatio || 0.55)*100)}%）。</span>

            </div>

            <button id="closeGovModalBtn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer; padding:0 8px;">✕</button>

          </div>

          

          <!-- 現在の統治状況バー & 検索 -->

          <div class="modal-control-bar appoint-control-bar" style="padding:10px 20px; background:rgba(0,0,0,0.35); border-bottom:1px dashed #5a4638; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">

            <div class="appoint-current-status" style="display:flex; align-items:center; gap:14px;">

              <div>

                <span style="color:#aaa; font-size:12pt;">現在の統治: </span>

                ${currentGov ? (currentGov.isDaimyo ? `<strong style="color:var(--gold-bright); font-size:13pt;">👑 本拠: ${currentGov.name}</strong> <span style="font-size:12pt; color:#ddd;">${this.formatLordStatsInline(p.id, currentGov)}</span>` : `<strong style="color:#2ecc71; font-size:13pt;">🏯 城主: ${currentGov.name}</strong> <span style="font-size:12pt; color:#ddd;">${this.formatLordStatsInline(p.id, currentGov)}</span>`) : `<strong style="color:#e67e22; font-size:13pt;">🏯 ${this.getEffectiveStats(p.id).vacantBadge || '城代統治'}</strong>`}

              </div>

              ${currentGov ? `<button id="btnDismissGov" style="background:#78281f; color:#fff; border:1px solid #c0392b; padding:5px 14px; border-radius:4px; cursor:pointer; font-size:12pt; transition:0.2s;">城代に戻す (城主解任)</button>` : ''}

            </div>

            <div class="modal-search-wrap" style="display:flex; align-items:center; gap:8px;">

              <span class="modal-search-label" style="font-size:12pt; color:#aaa;">検索:</span>

              <input id="inputGovSearch" type="text" placeholder="武将名・特技..." value="${searchQuery}" style="background:#22160d; color:#fff; border:1px solid #775533; padding:5px 10px; border-radius:4px; font-size:12pt; width:180px;">

            </div>

          </div>



          <!-- スマホ用ソートバー (身分、名前、武勇、内政、知略、年齢) -->

          <div class="modal-mobile-sort-bar appoint-mobile-sort-bar">

            <span class="mobile-sort-label">並換:</span>

            <button class="mobile-sort-btn ${sortKey === 'role' ? 'active' : ''}" data-key="role">身分${sortKey === 'role' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'name' ? 'active' : ''}" data-key="name">名前${sortKey === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'military' ? 'active' : ''}" data-key="military">武勇${sortKey === 'military' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'politic' ? 'active' : ''}" data-key="politic">内政${sortKey === 'politic' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'intel' ? 'active' : ''}" data-key="intel">知略${sortKey === 'intel' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'age' ? 'active' : ''}" data-key="age">年齢${sortKey === 'age' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

          </div>



          <!-- テーブル一覧コンテナ -->

          <div class="modal-table-scroll appoint-table-scroll" style="flex:1; overflow-y:auto; padding:0 20px;">

            <table class="appoint-list-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:12pt;">

              <thead>

                <tr style="position:sticky; top:0; background:#261a12; border-bottom:2px solid #775533; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.5);">

                  <th class="sortable-gov-th appoint-th-name" data-key="name" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:160px; font-size:12pt;">名前 ${getSortIcon('name')}</th>

                  <th class="sortable-gov-th appoint-th-role" data-key="role" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:110px; text-align:center; font-size:12pt;">身分・配置 ${getSortIcon('role')}</th>

                  <th class="sortable-gov-th appoint-th-base" data-key="base" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:135px; text-align:center; font-size:12pt;">拠点 ${getSortIcon('base')}</th>

                  <th class="sortable-gov-th appoint-th-age" data-key="age" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:80px; text-align:center; font-size:12pt;">年齢 ${getSortIcon('age')}</th>

                  <th class="sortable-gov-th appoint-th-mil" data-key="military" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:85px; text-align:center; font-size:12pt;">武勇 ${getSortIcon('military')}</th>

                  <th class="sortable-gov-th appoint-th-pol" data-key="politic" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:85px; text-align:center; font-size:12pt;">内政 ${getSortIcon('politic')}</th>

                  <th class="sortable-gov-th appoint-th-int" data-key="intel" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:85px; text-align:center; font-size:12pt;">知略 ${getSortIcon('intel')}</th>

                  <th class="appoint-th-action" style="padding:11px 12px; color:var(--gold); width:125px; text-align:center; font-size:12pt;">任命操作</th>

                </tr>

              </thead>

              <tbody>

                ${list.length === 0 ? `

                  <tr>

                    <td colspan="8" style="text-align:center; padding:30px; color:#888; font-size:12pt;">該当する武将は見つかりませんでした。</td>

                  </tr>

                ` : ''}

                ${list.map((off, idx) => {

                  const isAssignedHere = off.clanId !== 'ronin' && off.id === p.governorId;

                  const assignedProv = (off.assignedProvId && off.clanId !== 'ronin') ? this.provinces.find(x => x.id === off.assignedProvId) : null;

                  const age = this.year - (off.birthYear || 1530);



                  let roleBadge = '';

                  if (off.isDaimyo) {

                    roleBadge = '<span style="background:#b7950b; color:#fff; padding:2px 8px; border-radius:3px; font-weight:bold; font-size:12pt;">👑 当主</span>';

                  } else if (isAssignedHere) {

                    roleBadge = '<span style="background:#27ae60; color:#fff; padding:2px 8px; border-radius:3px; font-weight:bold; font-size:12pt;">🏯 当国城主</span>';

                  } else if (assignedProv) {

                    roleBadge = '<span style="background:#5d6d7e; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt; font-weight:bold;">🏯 城主</span>';

                  } else {

                    roleBadge = '<span style="background:#2980b9; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt;">待機中</span>';

                  }



                  let baseDisplay = '-';

                  if (assignedProv) {

                    baseDisplay = `<span style="color:#2ecc71; font-weight:bold;">${assignedProv.name}</span><span style="color:#aaa; font-size:11pt; margin-left:3px;">(${assignedProv.castleName || assignedProv.castle})</span>`;

                  } else if (off.isDaimyo) {

                    const capProv = this.getDaimyoHomeProvince(off);

                    baseDisplay = capProv 

                      ? `<span style="color:var(--gold-bright); font-weight:bold;">${capProv.name}</span><span style="color:#aaa; font-size:11pt; margin-left:3px;">(居城)</span>` 

                      : `<span style="color:#888;">所領なし</span>`;

                  } else {

                    baseDisplay = '<span style="color:#5dade2;">本国待機</span>';

                  }



                  const rowBg = isAssignedHere 

                    ? 'rgba(39, 174, 96, 0.16)' 

                    : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.18)');



                  return `

                    <tr class="appoint-table-row" data-off-id="${off.id}" title="${isAssignedHere ? '現在任命中' : `クリックして${off.name}を城主任命`}" style="background:${rowBg}; border-bottom:1px solid #3d2d20; cursor:pointer; font-size:12pt; transition:background 0.15s;" onmouseover="this.style.background='rgba(215, 175, 100, 0.12)'" onmouseout="this.style.background='${rowBg}'">

                      <td class="appoint-td-name" style="padding:10px 12px; font-weight:bold; color:#ffffff; white-space:nowrap; font-size:12.5pt;">

                        ${off.name}

                      </td>

                      <td class="appoint-td-role" style="padding:10px 12px; text-align:center; white-space:nowrap;">

                        ${roleBadge}

                      </td>

                      <td class="appoint-td-base" style="padding:10px 12px; text-align:center; white-space:nowrap; font-size:12pt;">

                        ${baseDisplay}

                      </td>

                      <td class="appoint-td-age" style="padding:10px 10px; text-align:center; color:#ddd; white-space:nowrap; font-size:12pt;">

                        ${age}歳

                      </td>

                      <td class="appoint-td-mil" style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#ff6b6b; font-size:12.5pt;">${off.military}</b>

                      </td>

                      <td class="appoint-td-pol" style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#5dade2; font-size:12.5pt;">${off.politic}</b>

                      </td>

                      <td class="appoint-td-int" style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#a3e4d7; font-size:12.5pt;">${off.intel}</b>

                      </td>

                      <td class="appoint-td-mobile-card" style="display:none;">

                        <!-- 1行目: 武将名・年齢 (左) ＆ 能力値 (右) -->

                        <div class="appoint-mcard-row1">

                          <div class="appoint-mcard-left">

                            <strong class="appoint-mcard-name">${off.name}</strong>

                            <span class="appoint-mcard-age">${age}歳</span>

                          </div>

                          <div class="appoint-mcard-stats">

                            <span class="stat-mil">武<b>${off.military}</b></span>

                            <span class="stat-pol">内<b>${off.politic}</b></span>

                            <span class="stat-int">智<b>${off.intel}</b></span>

                          </div>

                        </div>

                        <!-- 2行目: 身分・拠点 (左) ＆ 任命ボタン (右) -->

                        <div class="appoint-mcard-row2">

                          <div class="appoint-mcard-meta">

                            <span class="appoint-mcard-role">${roleBadge}</span>

                            <span class="appoint-mcard-base">🏯${baseDisplay}</span>

                          </div>

                          <div class="appoint-mcard-action">

                            ${isAssignedHere ? `

                              <span style="color:#2ecc71; font-weight:bold; font-size:9pt;">任命中</span>

                            ` : `

                              <button class="btn-select-gov" data-off-id="${off.id}" style="background:#1b4f72; color:#fff; border:1px solid #3498db; padding:2px 8px; border-radius:3px; cursor:pointer; font-size:8.5pt; font-weight:bold;">任命</button>

                            `}

                          </div>

                        </div>

                      </td>

                      <td class="appoint-td-action" style="padding:10px 12px; text-align:center; white-space:nowrap;">

                        ${isAssignedHere ? `

                          <span style="color:#2ecc71; font-weight:bold; font-size:12pt;">任命中</span>

                        ` : `

                          <button class="btn-select-gov" data-off-id="${off.id}" style="background:#1b4f72; color:#fff; border:1px solid #3498db; padding:5px 12px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; transition:all 0.15s;">城主任命</button>

                        `}

                      </td>

                    </tr>

                  `;

                }).join('')}

              </tbody>

            </table>

          </div>



          <!-- フッター -->

          <div class="modal-footer-bar appoint-footer-bar" style="padding:12px 20px; border-top:1px solid #443322; background:rgba(0,0,0,0.4); display:flex; justify-content:space-between; align-items:center;">

            <span class="modal-footer-info" style="font-size:12pt; color:#aaa;">表示中: ${list.length}名 (現在年: ${formatHistoricalYear(this.year)}年) 💡武将行をクリックで直ちに城主任命</span>

            <div class="appoint-footer-btn-group" style="display:flex; gap:8px;">

              <button id="openBatchGovFromSingle" class="btn-batch-gov" style="background:#1b4f72; color:#fff; border:1px solid #3498db; padding:7px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; white-space:nowrap;">

                <span class="btn-label-full">城主を一括任命</span>

                <span class="btn-label-short">一括任命</span>

              </button>

              <button id="closeGovModalBtnBottom" class="modal-footer-close-btn" style="background:#555; color:#fff; border:none; padding:7px 22px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; white-space:nowrap;">

                <span class="btn-label-full">閉じる</span>

                <span class="btn-label-short">閉じる</span>

              </button>

            </div>

          </div>

        </div>

      `;



      modal.style.display = 'flex';



      const closeModal = () => { modal.style.display = 'none'; };

      document.getElementById('closeGovModalBtn')?.addEventListener('click', closeModal);

      document.getElementById('closeGovModalBtnBottom')?.addEventListener('click', closeModal);

      document.getElementById('openBatchGovFromSingle')?.addEventListener('click', () => {

        closeModal();

        this.openBatchGovernorModal();

      });



      // ヘッダークリックソート

      modal.querySelectorAll('.sortable-gov-th').forEach(th => {

        th.addEventListener('click', () => {

          const key = th.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'base' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // スマホ用ソートボタンクリック

      modal.querySelectorAll('.appoint-mobile-sort-bar .mobile-sort-btn').forEach(btn => {

        btn.addEventListener('click', () => {

          const key = btn.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'base' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // 解任ボタン

      document.getElementById('btnDismissGov')?.addEventListener('click', () => {

        if (currentGov) {

          currentGov.assignedProvId = null;

        }

        p.governorId = null;

        const isCap = this.isCapitalProvince(p.id, p.ownerId);

        if (isCap) {

          this.log(`【城主解任】${p.name}の城主を解任し、大名本拠地親政（能力100%発揮）としました。`);

        } else {

          this.log(`【城主解任】${p.name}の城主を解任し、城代統治（大名能力の${Math.round((p.jodaiRatio || 0.55)*100)}%発揮）としました。`);

        }

        this.audio.playHyoshigi();

        closeModal();

        this.updateUI({ provId: p.id });

      });



      // ヘッダークリックソート

      modal.querySelectorAll('.sortable-gov-th').forEach(th => {

        th.addEventListener('click', () => {

          const key = th.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // 武将を城主任命する共通処理

      const appointOfficer = (offId) => {

        const newGov = myOfficers.find(o => o.id === offId);

        if (!newGov) return;

        if (newGov.id === p.governorId) {

          closeModal();

          return;

        }

        this.commitGovernorAppointment(p.id, offId);

        closeModal();

        this.updateUI({ provId: p.id });

      };



      // 行クリックで直接その武将を城主任命（列伝は表示しない）

      modal.querySelectorAll('.officer-table-row').forEach(row => {

        row.addEventListener('click', (e) => {

          const offId = row.dataset.offId;

          appointOfficer(offId);

        });

      });



      // 検索入力

      const searchInp = document.getElementById('inputGovSearch');

      if (searchInp) {

        const applySearch = (value) => {

          searchQuery = value;

          render();

          const newInp = document.getElementById('inputGovSearch');

          if (newInp) {

            newInp.focus();

            newInp.selectionStart = newInp.selectionEnd = newInp.value.length;

          }

        };

        searchInp.addEventListener('input', (e) => {

          if (e.isComposing || e.inputType === 'insertCompositionText') return;

          applySearch(e.target.value);

        });

        searchInp.addEventListener('compositionend', (e) => {

          applySearch(e.target.value);

        });

      }



      // 任命ボタン（行クリックと同一の任命処理を実行）

      modal.querySelectorAll('.btn-select-gov').forEach(btn => {

        btn.addEventListener('click', (e) => {

          e.stopPropagation();

          const offId = e.currentTarget.dataset.offId;

          appointOfficer(offId);

        });

      });

    };



    render();

  },



  // 城主一人を任命する。silent のときはログと音を出さない（一括任命用）,



  openBatchGovernorModal() {

    this.pauseAutoPlayForScreen?.('一括城主任命画面の表示');

    const mine = (this.provinces || []).filter(p => p.ownerId === this.playerClanId);

    if (mine.length === 0) {

      this.showOrderResult('⚠ 領国なし', '城主を任命できる自領がありません。', '#e67e22');

      return;

    }



    let modal = document.getElementById('batchGovernorModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'batchGovernorModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100000; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    const officers = () => (this.activeOfficers || []).filter(o => o.clanId === this.playerClanId && !o.isDead);

    const draft = new Map();

    mine.forEach(p => draft.set(p.id, p.governorId || ''));



    const officerScore = (o) => (Number(o.politic) || 0) * 2 + (Number(o.intel) || 0) + (Number(o.military) || 0);



    const fillVacant = () => {

      const used = new Set();

      mine.forEach(p => {

        const id = draft.get(p.id);

        if (id) used.add(id);

      });



      let pool = officers().filter(o => !o.isDaimyo && !used.has(o.id));

      const vacant = mine.filter(p => !draft.get(p.id) && !this.isCapitalProvince(p.id, this.playerClanId));

      const remainingVacant = [];

      vacant.forEach(p => {

        const homeOfficers = pool.filter(o => o.defaultProv === p.id);

        if (homeOfficers.length > 0) {

          homeOfficers.sort((a, b) => officerScore(b) - officerScore(a));

          const best = homeOfficers[0];

          draft.set(p.id, best.id);

          used.add(best.id);

          pool = pool.filter(o => o.id !== best.id);

        } else {

          remainingVacant.push(p);

        }

      });



      const combat = (o) => (Number(o.military) || 0) * 2 + (Number(o.intel) || 0) + (Number(o.politic) || 0);

      const civil = (o) => (Number(o.politic) || 0) * 2 + (Number(o.intel) || 0) + (Number(o.military) || 0);

      const fronts = remainingVacant.filter(p => this.isClanFrontline(p))

        .sort((a, b) => this.frontlineWeight(b) - this.frontlineWeight(a));

      const rears = remainingVacant.filter(p => !this.isClanFrontline(p));

      pool.sort((a, b) => combat(b) - combat(a));

      fronts.forEach(p => {

        const next = pool.shift();

        if (!next) return;

        draft.set(p.id, next.id);

        used.add(next.id);

      });

      pool.sort((a, b) => civil(b) - civil(a));

      rears.forEach(p => {

        const next = pool.shift();

        if (!next) return;

        draft.set(p.id, next.id);

        used.add(next.id);

      });

    };



    mine.forEach(p => {

      if (!draft.get(p.id) && !this.isCapitalProvince(p.id, this.playerClanId)) {

        const used = new Set([...draft.values()].filter(Boolean));

        const homeOff = officers().find(o => !o.isDaimyo && !used.has(o.id) && o.defaultProv === p.id);

        if (homeOff) draft.set(p.id, homeOff.id);

      }

    });



    const render = () => {

      const offs = officers();

      const rows = mine.map(p => {

        const selected = draft.get(p.id) || '';

        const isCap = this.isCapitalProvince(p.id, this.playerClanId);

        const options = [`<option value="">城代のまま</option>`].concat(offs.map(o => {

          const age = this.year - (o.birthYear || 1530);

          const isHome = o.defaultProv === p.id;

          const homeBadge = isHome ? '★ゆかりの国 ' : '';

          const role = o.isDaimyo ? '当主' : (o.assignedProvId && o.assignedProvId !== p.id ? '他城' : '待機');

          return `<option value="${o.id}" ${selected === o.id ? 'selected' : ''}>${homeBadge}${o.name}（${role}・${age}歳 武${o.military} 内${o.politic} 謀${o.intel}）</option>`;

        })).join('');

        return `

          <tr style="border-bottom:1px solid #3d2d20;">

            <td style="padding:8px 10px; color:#fff; font-weight:bold; white-space:nowrap;">${this.getProvinceJapaneseName(p.id)} <span style="color:#aaa; font-weight:normal; font-size:11pt;">${p.castleName || p.castle || ''}</span> ${isCap ? '<span style="color:var(--gold-bright); font-size:11pt;">本拠</span>' : ''}</td>

            <td style="padding:8px 10px;">

              <select class="batch-gov-select" data-prov-id="${p.id}" style="width:100%; background:#22160d; color:#fff; border:1px solid #775533; padding:6px 8px; border-radius:4px; font-size:12pt;">

                ${options}

              </select>

            </td>

          </tr>`;

      }).join('');



      modal.innerHTML = `

        <div style="background:#1b140e; border:2px solid var(--gold); border-radius:8px; width:95vw; max-width:920px; height:86vh; display:flex; flex-direction:column; color:#f5eedc; font-family:'Noto Serif JP',serif;">

          <div style="padding:12px 20px; border-bottom:1px solid #5a4638; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%);">

            <div>

              <h3 style="margin:0; font-size:15pt; color:var(--gold-bright);">❖ 城主一括任命 ❖</h3>

              <span style="font-size:12pt; color:#ccc;">各国の城主を選んで一度に任命します。自動任命はゆかりの地を優先し、強い武将を前線の城へ、残りの待機武将も空いた城へ配ります。本拠は対象外です。</span>

            </div>

            <button id="closeBatchGovBtn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer;">✕</button>

          </div>

          <div style="flex:1; overflow-y:auto; padding:8px 16px;">

            <table style="width:100%; border-collapse:collapse; font-size:12pt;">

              <thead>

                <tr style="position:sticky; top:0; background:#261a12; color:var(--gold);">

                  <th style="text-align:left; padding:8px 10px; width:34%;">領国</th>

                  <th style="text-align:left; padding:8px 10px;">城主</th>

                </tr>

              </thead>

              <tbody>${rows}</tbody>

            </table>

          </div>

          <div style="padding:12px 16px; border-top:1px solid #443322; display:flex; justify-content:space-between; gap:8px; flex-wrap:wrap;">

            <button id="batchGovAutoFill" style="background:#1b4f72; color:#fff; border:1px solid #3498db; padding:8px 14px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">空き城を自動任命</button>

            <div style="display:flex; gap:8px;">

              <button id="batchGovApply" style="background:linear-gradient(180deg, #d4af37, #b7950b); color:#111; border:none; padding:8px 18px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">この内容で一括任命</button>

              <button id="closeBatchGovBtnBottom" style="background:#555; color:#fff; border:none; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:12pt;">閉じる</button>

            </div>

          </div>

        </div>`;



      const close = () => { modal.style.display = 'none'; };

      document.getElementById('closeBatchGovBtn')?.addEventListener('click', close);

      document.getElementById('closeBatchGovBtnBottom')?.addEventListener('click', close);

      modal.onclick = (e) => { if (e.target === modal) close(); };



      modal.querySelectorAll('.batch-gov-select').forEach(sel => {

        sel.addEventListener('change', () => {

          const provId = sel.dataset.provId;

          const val = sel.value;

          if (val) {

            mine.forEach(other => {

              if (other.id !== provId && draft.get(other.id) === val) draft.set(other.id, '');

            });

          }

          draft.set(provId, val);

          render();

        });

      });



      document.getElementById('batchGovAutoFill')?.addEventListener('click', () => {

        fillVacant();

        render();

      });



      document.getElementById('batchGovApply')?.addEventListener('click', () => {

        const daimyo = offs.find(o => o.isDaimyo);

        const ordered = mine.slice().sort((a, b) => {

          const aD = draft.get(a.id) && daimyo && draft.get(a.id) === daimyo.id ? 1 : 0;

          const bD = draft.get(b.id) && daimyo && draft.get(b.id) === daimyo.id ? 1 : 0;

          return aD - bD;

        });

        let changed = 0;

        ordered.forEach(p => {

          const want = draft.get(p.id) || '';

          if (!want) {

            if (this.clearCastleGovernor(p.id, { silent: true })) changed++;

          } else if (this.commitGovernorAppointment(p.id, want, { silent: true })) {

            changed++;

          }

        });

        this.log(`【城主一括任命】${changed}件の城主任命を更新しました。`, 'important');

        this.audio.playTaiko();

        this.showOrderResult('🏯 城主一括任命', `${changed}件の任命を更新しました`, '#2ecc71');

        const listOpen = document.getElementById('provinceListModal')?.style.display === 'flex';

        close();

        if (this.selectedProvId) this.updateUI({ provId: this.selectedProvId });

        if (listOpen) this.openProvinceListModal();

      });

    };



    render();

    modal.style.display = 'flex';

    this.audio.playHyoshigi();

  },



  // 武将一覧モーダル（表形式・ソート対応・幅広ダイアログ・文字サイズ12pt以上）,



  openOfficerListModal() {

    this.pauseAutoPlayForScreen?.('武将一覧の表示');

    this.reconcileDaimyoWithMap();

    let modal = document.getElementById('officerListModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'officerListModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    let currentTab = 'my'; // 'my', 'all', or 'ronin'

    let sortKey = 'role'; // 'role', 'name', 'clan', 'age', 'military', 'politic', 'intel', 'comment'

    let sortOrder = 'desc'; // 'asc' or 'desc'

    let searchQuery = '';



    const render = () => {

      const allActive = (this.activeOfficers || this.officers || []).filter(o => !o.isDead);

      const myActive = allActive.filter(o => o.clanId === this.playerClanId);

      const roninActive = allActive.filter(o => o.clanId === 'ronin');

      

      let list = currentTab === 'my' ? [...myActive] : (currentTab === 'ronin' ? [...roninActive] : [...allActive]);



      if (searchQuery) {

        const q = searchQuery.trim().toLowerCase();

        list = list.filter(o => {

          const comment = this.getOfficerComment(o).toLowerCase();

          const clanName = `${this.getClanDisplayName(o.clanId) || ''} ${this.getClanFamilyName(o.clanId) || ''}`.toLowerCase();

          return (o.name && o.name.toLowerCase().includes(q)) || 

                 comment.includes(q) || 

                 clanName.includes(q);

        });

      }



      // ソート処理

      list.sort((a, b) => {

        let diff = 0;

        if (sortKey === 'role') {

          // 当主(3) > 城代(2) > 待機中(1) > 浪人(0)

          const getRoleScore = (off) => {

            if (off.isDaimyo) return 3;

            if (off.assignedProvId) return 2;

            if (off.clanId === 'ronin') return 0;

            return 1;

          };

          diff = getRoleScore(a) - getRoleScore(b);

          if (diff === 0) diff = (a.military || 0) - (b.military || 0);

        } else if (sortKey === 'base') {

          diff = this.provinceGeoRank(this.officerBaseProvinceId(a)) - this.provinceGeoRank(this.officerBaseProvinceId(b));

          if (diff === 0) diff = (a.name || '').localeCompare(b.name || '', 'ja');

        } else if (sortKey === 'name') {

          diff = (a.name || '').localeCompare(b.name || '', 'ja');

        } else if (sortKey === 'clan') {

          const clanA = a.clanId === 'ronin' ? '浪人' : (this.getClanDisplayName(a.clanId) || '');

          const clanB = b.clanId === 'ronin' ? '浪人' : (this.getClanDisplayName(b.clanId) || '');

          diff = clanA.localeCompare(clanB, 'ja');

        } else if (sortKey === 'age') {

          const ageA = this.year - (a.birthYear || 1530);

          const ageB = this.year - (b.birthYear || 1530);

          diff = ageA - ageB;

        } else if (sortKey === 'military') {

          diff = (a.military || 0) - (b.military || 0);

        } else if (sortKey === 'politic') {

          diff = (a.politic || 0) - (b.politic || 0);

        } else if (sortKey === 'intel') {

          diff = (a.intel || 0) - (b.intel || 0);

        } else if (sortKey === 'comment') {

          diff = this.getOfficerComment(a).localeCompare(this.getOfficerComment(b), 'ja');

        }

        return sortOrder === 'desc' ? -diff : diff;

      });



      const getSortIcon = (key) => {

        if (sortKey !== key) return '<span style="color:#776655; font-size:11pt; margin-left:4px;">↕</span>';

        return sortOrder === 'asc' 

          ? '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▲</span>' 

          : '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▼</span>';

      };



      modal.innerHTML = `

        <div class="custom-modal-content officer-modal-content" style="background:#1b140e; border:2px solid var(--gold); border-radius:8px; width:95vw; max-width:1180px; height:88vh; display:flex; flex-direction:column; box-shadow:0 0 45px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif;">

          <!-- ヘッダー -->

          <div class="modal-header-bar" style="padding:12px 22px; border-bottom:1px solid #5a4638; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%); display:flex; justify-content:space-between; align-items:center;">

            <div>

              <h3 class="modal-title-text" style="margin:0; font-size:15pt; color:var(--gold-bright);">❖ 参陣武将録・名将一覧 ❖</h3>

              <span class="modal-subtitle-text" style="font-size:12pt; color:#ccc;">自軍および天下に名轟く武将・浪人の身分・拠点・能力を閲覧できます。浪人は直接登用も可能です。</span>

            </div>

            <button id="closeOfficerModalBtn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer; padding:0 8px;">✕</button>

          </div>



          <!-- コントロールバー（タブ、検索） -->

          <div class="modal-control-bar" style="padding:10px 20px; background:rgba(0,0,0,0.35); border-bottom:1px dashed #5a4638; display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">

            <div class="modal-tabs-wrap" style="display:flex; gap:8px; flex-wrap:wrap;">

              <button id="tabMyOfficers" style="background:${currentTab === 'my' ? '#922b21' : '#2b1d14'}; color:#fff; border:1px solid ${currentTab === 'my' ? '#c0392b' : '#664422'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; transition:0.2s;">

                我が軍の武将 (${myActive.length}名)

              </button>

              <button id="tabRoninOfficers" style="background:${currentTab === 'ronin' ? '#b7950b' : '#2b1d14'}; color:${currentTab === 'ronin' ? '#fff' : '#f1c40f'}; border:1px solid ${currentTab === 'ronin' ? '#d4af37' : '#886622'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; transition:0.2s;">

                🤝 浪人・未仕官 (${roninActive.length}名)

              </button>

              <button id="tabAllOfficers" style="background:${currentTab === 'all' ? '#922b21' : '#2b1d14'}; color:#fff; border:1px solid ${currentTab === 'all' ? '#c0392b' : '#664422'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; transition:0.2s;">

                天下の武将 (${allActive.length}名)

              </button>

            </div>



            <div class="modal-search-wrap" style="display:flex; align-items:center; gap:8px;">

              <span class="modal-search-label" style="font-size:12pt; color:#aaa;">検索:</span>

              <input id="inputOfficerSearch" type="text" placeholder="武将名・所属..." value="${searchQuery}" style="background:#22160d; color:#fff; border:1px solid #775533; padding:5px 10px; border-radius:4px; font-size:12pt; width:190px;">

            </div>

          </div>



          <!-- スマホ用ソートバー (身分、拠点、名前、所属、武勇、内政、知略、年齢) -->

          <div class="modal-mobile-sort-bar officer-mobile-sort-bar">

            <span class="mobile-sort-label">並換:</span>

            <button class="mobile-sort-btn ${sortKey === 'role' ? 'active' : ''}" data-key="role">身分${sortKey === 'role' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'base' ? 'active' : ''}" data-key="base">拠点${sortKey === 'base' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'name' ? 'active' : ''}" data-key="name">名前${sortKey === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'clan' ? 'active' : ''}" data-key="clan">所属${sortKey === 'clan' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'military' ? 'active' : ''}" data-key="military">武勇${sortKey === 'military' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'politic' ? 'active' : ''}" data-key="politic">内政${sortKey === 'politic' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'intel' ? 'active' : ''}" data-key="intel">知略${sortKey === 'intel' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'age' ? 'active' : ''}" data-key="age">年齢${sortKey === 'age' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

          </div>



          <!-- 武将テーブル一覧 -->

          <div class="modal-table-scroll officer-table-scroll" style="flex:1; overflow-y:auto; padding:0 20px;">

            <table class="officer-list-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:12pt;">

              <thead>

                <tr style="position:sticky; top:0; background:#261a12; border-bottom:2px solid #775533; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.5);">

                  <th class="sortable-off-th off-th-name" data-key="name" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:140px; font-size:12pt;">名前 ${getSortIcon('name')}</th>

                  <th class="sortable-off-th off-th-role" data-key="role" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:110px; text-align:center; font-size:12pt;">身分・配置 ${getSortIcon('role')}</th>

                  <th class="sortable-off-th off-th-base" data-key="base" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:135px; text-align:center; font-size:12pt;">拠点 ${getSortIcon('base')}</th>

                  <th class="sortable-off-th off-th-clan" data-key="clan" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:130px; font-size:12pt;">所属 ${getSortIcon('clan')}</th>

                  <th class="sortable-off-th off-th-age" data-key="age" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:150px; text-align:center; font-size:12pt;">年齢・生没年 ${getSortIcon('age')}</th>

                  <th class="sortable-off-th off-th-mil" data-key="military" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:80px; text-align:center; font-size:12pt;">武勇 ${getSortIcon('military')}</th>

                  <th class="sortable-off-th off-th-pol" data-key="politic" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:80px; text-align:center; font-size:12pt;">内政 ${getSortIcon('politic')}</th>

                  <th class="sortable-off-th off-th-int" data-key="intel" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:80px; text-align:center; font-size:12pt;">知略 ${getSortIcon('intel')}</th>

                  <th class="off-th-action" style="padding:11px 10px; color:var(--gold); width:100px; text-align:center; font-size:12pt;">登用</th>

                </tr>

              </thead>

              <tbody>

                ${list.length === 0 ? `

                  <tr>

                    <td colspan="9" style="text-align:center; padding:30px; color:#888; font-size:12pt;">該当する武将は見つかりませんでした。</td>

                  </tr>

                ` : ''}

                ${list.map((off, idx) => {

                  const assignedProv = (off.assignedProvId && off.clanId !== 'ronin') ? this.provinces.find(x => x.id === off.assignedProvId) : null;

                  const isMyClan = off.clanId === this.playerClanId;

                  const isRonin = off.clanId === 'ronin';

                  const homeProv = off.isDaimyo ? this.getDaimyoHomeProvince(off) : null;

                  const isMapDaimyo = !!homeProv;

                  const clanName = isRonin ? '浪人 (未仕官)' : this.getClanFamilyName(off.clanId);

                  const clanAffiliation = isRonin ? clanName : (isMapDaimyo ? `${clanName} (当主)` : `${clanName} 配下`);

                  const age = this.year - (off.birthYear || 1530);



                  let roleBadge = '';

                  if (isMapDaimyo) {

                    roleBadge = '<span style="background:#b7950b; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt; font-weight:bold;">👑 当主</span>';

                  } else if (assignedProv) {

                    roleBadge = '<span style="background:#27ae60; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt; font-weight:bold;">🏯 城主</span>';

                  } else if (isRonin) {

                    roleBadge = '<span style="background:#7f8c8d; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt;">浪人</span>';

                  } else {

                    roleBadge = '<span style="background:#2980b9; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt;">待機中</span>';

                  }



                  // 拠点

                  let baseDisplay = '-';

                  if (assignedProv) {

                    baseDisplay = `<span style="color:#2ecc71; font-weight:bold;">${assignedProv.name}</span><span style="color:#aaa; font-size:11pt; margin-left:3px;">(${assignedProv.castleName || assignedProv.castle})</span>`;

                  } else if (isMapDaimyo) {

                    baseDisplay = `<span style="color:var(--gold-bright); font-weight:bold;">${homeProv.name}</span><span style="color:#aaa; font-size:11pt; margin-left:3px;">(居城)</span>`;

                  } else if (isRonin) {

                    const defProvName = off.defaultProv ? this.getProvinceJapaneseName(off.defaultProv) : '';

                    const isDefProvMine = off.defaultProv && this.provinces.some(p => p.id === off.defaultProv && p.ownerId === this.playerClanId);

                    baseDisplay = defProvName 

                      ? `<span style="color:${isDefProvMine ? '#2ecc71' : '#bdc3c7'}; font-weight:${isDefProvMine ? 'bold' : 'normal'};">${defProvName}</span><span style="color:#888; font-size:11pt; margin-left:3px;">(${isDefProvMine ? '自領内' : '流浪'})</span>` 

                      : '<span style="color:#888;">諸国流浪</span>';

                  } else {

                    // 自領内にゆかりの地があればそこで待機、なければ主君の本拠

                    const baseProvId = this.officerBaseProvinceId(off);

                    const baseProv = baseProvId ? this.provinces.find(p => p.id === baseProvId) : null;

                    baseDisplay = baseProv 

                      ? `<span style="color:#5dade2;">${baseProv.name}</span><span style="color:#888; font-size:11pt; margin-left:3px;">(待機)</span>` 

                      : '<span style="color:#888;">本国待機</span>';

                  }



                  const rowBg = isMapDaimyo 

                    ? 'rgba(183, 149, 11, 0.12)' 

                    : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.18)');



                  const roninReach = isRonin ? this.getRoninServiceReach(off, this.playerClanId) : null;

                  const farNote = roninReach && roninReach.dist > 1

                    ? `<div style="font-size:10pt; color:${roninReach.lacksHeir ? '#f5b041' : '#85c1e9'}; margin-top:2px;">${roninReach.lacksHeir ? '遠国・跡継ぎ不在で上昇' : '遠国・登用可'}</div>`

                    : '';

                  const recruitBtn = isRonin

                    ? (roninReach.reachable

                      ? `<button class="btn-recruit-ronin-row" data-off-id="${off.id}" style="background:linear-gradient(180deg, #d4af37, #b7950b); color:#111; border:none; padding:3px 10px; border-radius:3px; font-weight:bold; font-size:11.5pt; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.5);">🤝 登用</button>${farNote}`

                      : `<span style="color:#888; font-size:11.5pt;" title="所在が分からず登用できません">所在不明</span>`)

                    : (isMyClan ? '<span style="color:#2ecc71; font-size:11.5pt;">自軍配下</span>' : '<span style="color:#777; font-size:11.5pt;">他家所属</span>');



                  return `

                    <tr class="officer-table-row" data-off-id="${off.id}" title="クリックで人物列伝を表示" style="background:${rowBg}; border-bottom:1px solid #3d2d20; cursor:pointer; font-size:12pt; transition:background 0.15s;" onmouseover="this.style.background='rgba(215, 175, 100, 0.12)'" onmouseout="this.style.background='${rowBg}'">

                      <td class="off-td-name" style="padding:10px 12px; font-weight:bold; color:#ffffff; white-space:nowrap; font-size:12.5pt; text-decoration:none; border-bottom:none;">

                        ${off.name}

                      </td>

                      <td class="off-td-role" style="padding:10px 12px; text-align:center; white-space:nowrap;">

                        ${roleBadge}

                      </td>

                      <td class="off-td-base" style="padding:10px 12px; text-align:center; white-space:nowrap; font-size:12pt;">

                        ${baseDisplay}

                      </td>

                      <td class="off-td-clan" style="padding:10px 12px; white-space:nowrap;">

                        <span style="background:${isRonin ? 'rgba(127, 140, 141, 0.25)' : (isMyClan ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 255, 255, 0.05)')}; color:${isRonin ? '#bdc3c7' : (isMyClan ? '#2ecc71' : '#e0d8c3')}; padding:3px 8px; border-radius:3px; border:1px solid ${isRonin ? '#7f8c8d' : (isMyClan ? '#27ae60' : '#5a4638')}; font-size:12pt;">

                          ${clanAffiliation}

                        </span>

                      </td>

                      <td class="off-td-age" style="padding:10px 12px; text-align:center; color:#ddd; white-space:nowrap; font-size:12pt;">

                        <strong style="color:#ffffff; font-size:12.5pt;">${age}歳</strong>

                        <span style="color:#aaa; font-size:12pt; margin-left:4px;">(${formatHistoricalYear(off.birthYear)}〜${formatHistoricalYear(off.deathYear)})</span>

                      </td>

                      <td class="off-td-mil" style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#ff6b6b; font-size:12.5pt;">${off.military}</b>

                      </td>

                      <td class="off-td-pol" style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#5dade2; font-size:12.5pt;">${off.politic}</b>

                      </td>

                      <td class="off-td-int" style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#a3e4d7; font-size:12.5pt;">${off.intel}</b>

                      </td>

                      <td class="off-td-mobile-card" style="display:none;">

                        <div class="off-mcard-row1">

                          <div class="off-mcard-left">

                            <strong class="off-mcard-name">${off.name}</strong>

                            <span class="off-mcard-age">${age}歳</span>

                          </div>

                          <div class="off-mcard-stats">

                            <span class="stat-mil">武<b>${off.military}</b></span>

                            <span class="stat-pol">内<b>${off.politic}</b></span>

                            <span class="stat-int">智<b>${off.intel}</b></span>

                          </div>

                        </div>

                        <div class="off-mcard-row2">

                          <div class="off-mcard-meta">

                            <span class="off-mcard-role">${roleBadge}</span>

                            <span class="off-mcard-base">🏯${baseDisplay}</span>

                            <span class="off-mcard-clan">${clanAffiliation}</span>

                          </div>

                          ${isRonin && roninReach && roninReach.reachable ? `<div class="off-mcard-action"><button class="btn-recruit-ronin-row" data-off-id="${off.id}" style="background:linear-gradient(180deg, #d4af37, #b7950b); color:#111; border:none; padding:1px 7px; border-radius:3px; font-weight:bold; font-size:8.5pt; cursor:pointer;">登用</button></div>` : ''}

                        </div>

                      </td>

                      <td class="off-td-action" style="padding:10px 8px; text-align:center; white-space:nowrap;">

                        ${recruitBtn}

                      </td>

                    </tr>

                  `;

                }).join('')}

              </tbody>

            </table>

          </div>



          <!-- フッター -->

          <div class="modal-footer-bar officer-footer-bar" style="padding:12px 20px; border-top:1px solid #443322; background:rgba(0,0,0,0.4); display:flex; justify-content:space-between; align-items:center;">

            <span class="modal-footer-info" style="font-size:12pt; color:#aaa;">表示中: ${list.length}名 (現在年: ${formatHistoricalYear(this.year)}年) 💡行クリックで人物列伝を表示 ｜ 遠国も登用可（遠いほど成功率は低下）。跡継ぎ不在時は確率が上がり、仕官も来ます</span>

            <button id="closeOfficerModalBtnBottom" class="modal-footer-close-btn" style="background:#555; color:#fff; border:none; padding:7px 14px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">閉</button>

          </div>

        </div>

      `;



      modal.style.display = 'flex';



      const closeModal = () => { modal.style.display = 'none'; };

      document.getElementById('closeOfficerModalBtn')?.addEventListener('click', closeModal);

      document.getElementById('closeOfficerModalBtnBottom')?.addEventListener('click', closeModal);



      document.getElementById('tabMyOfficers')?.addEventListener('click', () => { currentTab = 'my'; render(); });

      document.getElementById('tabRoninOfficers')?.addEventListener('click', () => { currentTab = 'ronin'; render(); });

      document.getElementById('tabAllOfficers')?.addEventListener('click', () => { currentTab = 'all'; render(); });



      // 浪人の直接登用ボタン

      modal.querySelectorAll('.btn-recruit-ronin-row').forEach(btn => {

        btn.addEventListener('click', (e) => {

          e.stopPropagation();

          const offId = btn.dataset.offId;

          this.recruitRonin(offId, () => {

            render();

          });

        });

      });



      // ヘッダークリックソート

      modal.querySelectorAll('.sortable-off-th').forEach(th => {

        th.addEventListener('click', () => {

          const key = th.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'clan' || key === 'base' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // スマホ用ソートボタンクリック

      modal.querySelectorAll('.officer-mobile-sort-bar .mobile-sort-btn').forEach(btn => {

        btn.addEventListener('click', () => {

          const key = btn.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'clan' || key === 'base' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // 行クリックで武将詳細・列伝モーダル展開

      modal.querySelectorAll('.officer-table-row').forEach(row => {

        row.addEventListener('click', (e) => {

          if (e.target.closest('button')) return;

          const offId = row.dataset.offId;

          const off = list.find(o => o.id === offId) 

                   || (this.activeOfficers || []).find(o => o.id === offId)

                   || (window.OFFICERS_MASTER || []).find(o => o.id === offId);

          if (off) {

            this.showOfficerDetailModal(off);

          }

        });

      });



      const searchInput = document.getElementById('inputOfficerSearch');

      if (searchInput) {

        const applySearch = (value) => {

          searchQuery = value;

          render();

          const newInp = document.getElementById('inputOfficerSearch');

          if (newInp) {

            newInp.focus();

            newInp.selectionStart = newInp.selectionEnd = newInp.value.length;

          }

        };

        searchInput.addEventListener('input', (e) => {

          if (e.isComposing || e.inputType === 'insertCompositionText') return;

          applySearch(e.target.value);

        });

        searchInput.addEventListener('compositionend', (e) => {

          applySearch(e.target.value);

        });

      }

    };



    render();

    this.audio.playHyoshigi();

  },



  // 領国一覧モーダル（武将一覧と同じ表形式・ソート・検索）,



  openProvinceListModal() {

    this.pauseAutoPlayForScreen?.('領国一覧の表示');

    if (this.isAutoPlay) this.stopAutoPlay('領国一覧表示のため');



    let modal = document.getElementById('provinceListModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'provinceListModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    let currentTab = 'my'; // 'my', 'all', or 'blank'

    let sortKey = 'castle';

    let sortOrder = 'asc';

    let searchQuery = '';

    const geoIndex = (row) => this.provinceGeoRank(row.p && row.p.id);

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({

      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'

    }[c]));



    const formatManKoku = (n) => {

      const v = Number(n) || 0;

      const man = v >= 5000 ? (v / 10000) : (v / 10);

      return `${man.toFixed(1)}万石`;

    };



    const render = () => {

      const allProvs = this.provinces || [];

      const myProvs = allProvs.filter(p => p.ownerId === this.playerClanId);

      const blankProvs = allProvs.filter(p => !p.ownerId);

      let source = currentTab === 'my' ? myProvs : (currentTab === 'blank' ? blankProvs : allProvs);



      const castleOf = (p) => (this.currentScenario && this.currentScenario.castles && this.currentScenario.castles[p.id]) || p.castleName || p.castle || '居城';



      let rows = source.map(p => {

        const isBlank = !p.ownerId;

        const isMine = p.ownerId === this.playerClanId;

        const eff = isBlank ? null : this.getEffectiveStats(p.id);

        const castle = castleOf(p);

        const ownerName = isBlank ? '空白地' : (this.getClanFamilyName(p.ownerId) || '無所属');

        let govName = isBlank ? '国人・土豪' : (eff?.name || '城代');

        let roleRank = 0;

        if (!isBlank && eff?.isCapital && eff?.isDaimyo) roleRank = 3;

        else if (!isBlank && eff?.governor) roleRank = 2;

        else if (!isBlank) roleRank = 1;

        const officer = (!isBlank && eff && !eff.isJodai && eff.governor) ? eff.governor : null;

        let military = isBlank ? null : Number(eff?.military ?? 0);

        let politics = isBlank ? null : Number(eff?.politics ?? 0);

        let stratagem = isBlank ? null : Number(eff?.stratagem ?? 0);

        return {

          p,

          isBlank,

          isMine,

          eff,

          castle,

          region: p.region || '諸国',

          ownerName,

          govName,

          roleRank,

          officer,

          military,

          politics,

          stratagem,

          kokudaka: Number(p.kokudaka) || 0,

          troops: Number(p.troops) || 0,

          defense: Number(p.defense) || 0,

          commerce: Number(p.commerce) || 0,

          morale: Number(p.morale) || 0,

          order: Number(p.order !== undefined ? p.order : 85) || 0,

          specialty: p.specialty || ''

        };

      });



      if (searchQuery) {

        const q = searchQuery.trim().toLowerCase();

        rows = rows.filter(r => {

          const policy = r.isBlank ? '' : this.getGovernModeName(r.p.governance);

          const blob = `${r.p.name || ''} ${r.castle} ${r.region} ${r.ownerName} ${r.govName} ${r.specialty} ${policy}`.toLowerCase();

          return blob.includes(q);

        });

      }



      rows.sort((a, b) => {

        let diff = 0;

        if (sortKey === 'name') diff = (a.p.name || '').localeCompare(b.p.name || '', 'ja');

        else if (sortKey === 'castle' || sortKey === 'region') diff = geoIndex(a) - geoIndex(b);



        else if (sortKey === 'owner') diff = a.ownerName.localeCompare(b.ownerName, 'ja');

        else if (sortKey === 'governor') {

          diff = a.roleRank - b.roleRank;

          if (diff === 0) diff = a.govName.localeCompare(b.govName, 'ja');

        } else if (sortKey === 'military') diff = (a.military ?? -1) - (b.military ?? -1);

        else if (sortKey === 'politics') diff = (a.politics ?? -1) - (b.politics ?? -1);

        else if (sortKey === 'stratagem') diff = (a.stratagem ?? -1) - (b.stratagem ?? -1);

        else if (sortKey === 'kokudaka') diff = a.kokudaka - b.kokudaka;

        else if (sortKey === 'troops') diff = a.troops - b.troops;

        else if (sortKey === 'defense') diff = a.defense - b.defense;

        else if (sortKey === 'commerce') diff = a.commerce - b.commerce;

        else if (sortKey === 'morale') diff = a.morale - b.morale;

        else if (sortKey === 'order') diff = a.order - b.order;

        const tie = (a.p.name || '').localeCompare(b.p.name || '', 'ja');

        const primary = sortOrder === 'desc' ? -diff : diff;

        return primary || tie;

      });



      const getSortIcon = (key) => {

        if (sortKey !== key) return '<span style="color:#776655; font-size:11pt; margin-left:4px;">↕</span>';

        return sortOrder === 'asc'

          ? '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▲</span>'

          : '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▼</span>';

      };



      const th = (key, label, extra) => `<th class="sortable-prov-th" data-key="${key}" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; font-size:12pt; white-space:nowrap; ${extra || ''}">${label} ${getSortIcon(key)}</th>`;



      const governorCell = (r, roleBadge) => `<td class="prov-td-gov" style="padding:8px 8px; white-space:nowrap;">${roleBadge}<b style="margin-left:6px; color:#fff;">${esc(r.govName)}</b></td>`;



      modal.innerHTML = `

        <div class="custom-modal-content province-modal-content" style="background:#1b140e; border:2px solid var(--gold); border-radius:8px; width:96vw; max-width:1560px; height:88vh; display:flex; flex-direction:column; box-shadow:0 0 45px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif;">

          <div class="modal-header-bar" style="padding:12px 22px; border-bottom:1px solid #5a4638; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%); display:flex; justify-content:space-between; align-items:center;">

            <div>

              <h3 class="modal-title-text" style="margin:0; font-size:15pt; color:var(--gold-bright);">❖ 領国録・城主と石高 ❖</h3>

              <span class="modal-subtitle-text" style="font-size:12pt; color:#ccc;">城主と武勇・内政・智謀、兵力や表高を一覧できます。城主・当主の行をクリックすると、その武将の概要と列伝が開きます。城代や空白地の行は、地図でその領国を選びます。</span>

            </div>

            <button id="closeProvinceModalBtn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer; padding:0 8px;">✕</button>

          </div>



          <div class="modal-control-bar" style="padding:10px 20px; background:rgba(0,0,0,0.35); border-bottom:1px dashed #5a4638; display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">

            <div class="modal-tabs-wrap" style="display:flex; gap:8px; flex-wrap:wrap;">

              <button id="tabMyProvinces" style="background:${currentTab === 'my' ? '#922b21' : '#2b1d14'}; color:#fff; border:1px solid ${currentTab === 'my' ? '#c0392b' : '#664422'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">

                我が領国 (${myProvs.length}国)

              </button>

              <button id="tabAllProvinces" style="background:${currentTab === 'all' ? '#922b21' : '#2b1d14'}; color:#fff; border:1px solid ${currentTab === 'all' ? '#c0392b' : '#664422'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">

                天下の領国 (${allProvs.length}国)

              </button>

              <button id="tabBlankProvinces" style="background:${currentTab === 'blank' ? '#7f8c8d' : '#2b1d14'}; color:${currentTab === 'blank' ? '#fff' : '#bdc3c7'}; border:1px solid ${currentTab === 'blank' ? '#bdc3c7' : '#664422'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">

                空白地 (${blankProvs.length}国)

              </button>

              <button id="provListOpenBatchGov" title="自領の城主をまとめて任命" style="background:linear-gradient(180deg, #d4af37, #b7950b); color:#111; border:none; padding:6px 14px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">城主一括任命</button>

            </div>

            <div class="modal-search-wrap" style="display:flex; align-items:center; gap:8px;">

              <span class="modal-search-label" style="font-size:12pt; color:#aaa;">検索:</span>

              <input id="inputProvinceSearch" type="text" placeholder="国名・城・城主・領主..." value="${esc(searchQuery)}" style="background:#22160d; color:#fff; border:1px solid #775533; padding:5px 10px; border-radius:4px; font-size:12pt; width:210px;">

            </div>

          </div>



          <!-- スマホ用ソートバー (国名、拠点、城主、武勇、内政、智謀、兵力、石高) -->

          <div class="modal-mobile-sort-bar province-mobile-sort-bar">

            <span class="mobile-sort-label">並換:</span>

            <button class="mobile-sort-btn ${sortKey === 'name' ? 'active' : ''}" data-key="name">国名${sortKey === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'castle' ? 'active' : ''}" data-key="castle">拠点${sortKey === 'castle' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'governor' ? 'active' : ''}" data-key="governor">城主${sortKey === 'governor' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'military' ? 'active' : ''}" data-key="military">武勇${sortKey === 'military' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'politics' ? 'active' : ''}" data-key="politics">内政${sortKey === 'politics' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'stratagem' ? 'active' : ''}" data-key="stratagem">智謀${sortKey === 'stratagem' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'troops' ? 'active' : ''}" data-key="troops">兵力${sortKey === 'troops' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'kokudaka' ? 'active' : ''}" data-key="kokudaka">石高${sortKey === 'kokudaka' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

          </div>



          <div id="provinceListScroll" class="modal-table-scroll province-table-scroll" style="flex:1; overflow:auto; padding:0 12px 0 20px;">

            <table class="province-list-table" style="width:max-content; min-width:100%; border-collapse:collapse; text-align:left; font-size:12pt;">

              <thead>

                <tr style="position:sticky; top:0; background:#261a12; border-bottom:2px solid #775533; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.5);">

                  ${th('name', '国名', '')}

                  ${th('castle', '城', 'min-width:14em;')}

                  ${th('region', '地方', 'text-align:center;')}

                  ${th('owner', '領主', '')}

                  ${th('governor', '城主', 'min-width:11em;')}

                  ${th('military', '武勇', 'text-align:center;')}

                  ${th('politics', '内政', 'text-align:center;')}

                  ${th('stratagem', '智謀', 'text-align:center;')}

                  ${th('troops', '兵力', 'text-align:right;')}

                  ${th('defense', '防御', 'text-align:center;')}

                  ${th('morale', '士気', 'text-align:center;')}

                  ${th('kokudaka', '表高', 'text-align:right;')}

                  ${th('commerce', '商業', 'text-align:right;')}

                  ${th('order', '治安度', 'text-align:center;')}

                </tr>

              </thead>

              <tbody>

                ${rows.length === 0 ? `

                  <tr>

                    <td colspan="14" style="text-align:center; padding:30px; color:#888; font-size:12pt;">該当する領国は見つかりませんでした。</td>

                  </tr>

                ` : rows.map((r, idx) => {

                  const eff = r.eff;

                  let roleBadge = '';

                  if (r.isBlank) {

                    roleBadge = '<span style="background:#7f8c8d; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt;">空白</span>';

                  } else if (eff && eff.isCapital && eff.isDaimyo) {

                    roleBadge = '<span style="background:#b7950b; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt; font-weight:bold;">👑 本拠</span>';

                  } else if (eff && eff.governor) {

                    roleBadge = '<span style="background:#27ae60; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt; font-weight:bold;">🏯 城主</span>';

                  } else {

                    const rawBadge = String(eff?.vacantBadge || '城代');

                    const badgeText = rawBadge.startsWith('城代統治') ? '城代統治' : rawBadge;

                    const badge = esc(badgeText);

                    roleBadge = `<span style="background:#d35400; color:#fff; padding:2px 8px; border-radius:3px; font-size:12pt; font-weight:bold;">${badge}</span>`;

                  }

                  const statCell = (value, color, mark = '', cls = '') => value == null

                    ? `<td class="${cls}" style="padding:10px 8px; text-align:center; white-space:nowrap; color:#777;">—</td>`

                    : `<td class="${cls}" style="padding:10px 8px; text-align:center; white-space:nowrap;"><b style="color:${color}; font-size:12.5pt;">${value}</b>${mark}</td>`;

                  const isSelected = r.p.id === this.selectedProvId;

                  const rowBg = isSelected

                    ? 'rgba(215, 175, 100, 0.22)'

                    : (r.isMine && eff && eff.isCapital

                      ? 'rgba(183, 149, 11, 0.12)'

                      : (r.isBlank

                        ? 'rgba(127, 140, 141, 0.08)'

                        : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.18)')));

                  const ownerStyle = r.isBlank

                    ? 'background:rgba(127,140,141,0.25); color:#bdc3c7; border:1px solid #7f8c8d;'

                    : (r.isMine

                      ? 'background:rgba(46,204,113,0.2); color:#2ecc71; border:1px solid #27ae60;'

                      : 'background:rgba(255,255,255,0.05); color:#e0d8c3; border:1px solid #5a4638;');

                  const rowTitle = r.officer ? 'クリックで武将の概要と列伝を表示' : 'クリックで地図上の領国を選択';

                  return `

                    <tr class="province-table-row" role="button" tabindex="0" data-prov-id="${esc(r.p.id)}" data-off-id="${esc(r.officer ? r.officer.id : '')}" title="${rowTitle}" style="background:${rowBg}; border-bottom:1px solid #3d2d20; cursor:pointer; font-size:12pt;" onmouseover="this.style.background='rgba(215, 175, 100, 0.12)'" onmouseout="this.style.background='${rowBg}'">

                      <td class="prov-td-name" style="padding:10px 8px; font-weight:bold; color:#fff; white-space:nowrap; font-size:12.5pt;">

                        ${esc(r.p.name)} <span class="prov-mobile-castle-name" style="font-size:10pt; color:#ddd; font-weight:normal; margin-left:4px;">🏯${esc(r.castle)}</span>

                      </td>

                      <td class="prov-td-castle" style="padding:10px 8px; color:#f5eedc; white-space:nowrap; min-width:14em;" title="${esc(r.specialty)}">${esc(r.castle)}</td>

                      <td class="prov-td-region" style="padding:10px 8px; text-align:center; white-space:nowrap; color:#ccc;">${esc(r.region)}</td>

                      <td class="prov-td-owner" style="padding:10px 10px; white-space:nowrap;">

                        <span style="${ownerStyle} padding:3px 8px; border-radius:3px; font-size:12pt;">${esc(r.ownerName)}</span>

                      </td>

                      <td class="prov-td-mobile-card" style="display:none;">

                        <!-- 1行目: 国名・城名 (左) ＆ 所属大名家 (右) -->

                        <div class="prov-mcard-row1">

                          <div class="prov-mcard-left">

                            <strong class="prov-mcard-name">${esc(r.p.name)}</strong>

                            <span class="prov-mcard-castle">🏯${esc(r.castle)}</span>

                          </div>

                          <span class="prov-mcard-owner" style="${ownerStyle}">${esc(r.ownerName)}</span>

                        </div>

                        <!-- 2行目: 城主 (左) ＆ 能力値 (右) -->

                        <div class="prov-mcard-row2">

                          <div class="prov-mcard-gov">

                            <span class="prov-mcard-badge">${roleBadge}</span>

                            <strong class="prov-mcard-govname">${esc(r.govName)}</strong>

                          </div>

                          <div class="prov-mcard-stats">

                            <span class="stat-mil">武<b>${r.military ?? '—'}</b></span>

                            <span class="stat-pol">内<b>${r.politics ?? '—'}</b></span>

                            <span class="stat-strat">智<b>${r.stratagem ?? '—'}</b></span>

                          </div>

                        </div>

                        <!-- 3行目: 軍事・経済データ (横並び) -->

                        <div class="prov-mcard-row3">

                          <div class="prov-mcard-mil-data">

                            <span class="mdata-item">兵 <b>${r.troops.toLocaleString('ja-JP')}</b></span>

                            <span class="mdata-item">防御 <b>${r.defense}</b></span>

                            <span class="mdata-item">士気 <b>${r.morale}</b></span>

                          </div>

                          <div class="prov-mcard-eco-data">

                            <span class="mdata-item">石高 <b>${formatManKoku(r.kokudaka)}</b></span>

                            <span class="mdata-item">商 <b>${r.commerce.toLocaleString('ja-JP')}</b></span>

                            <span class="mdata-item">治 <b>${r.order}%</b></span>

                          </div>

                        </div>

                      </td>

                      ${governorCell(r, roleBadge)}

                      ${statCell(r.military, '#ff6b6b', this.lordAideMark(r.eff, 'military'), 'prov-td-mil')}

                      ${statCell(r.politics, '#5dade2', this.lordAideMark(r.eff, 'politics'), 'prov-td-pol')}

                      ${statCell(r.stratagem, '#a3e4d7', this.lordAideMark(r.eff, 'stratagem'), 'prov-td-strat')}

                      <td class="prov-td-troops" style="padding:10px 10px; text-align:right; white-space:nowrap;">${r.troops.toLocaleString('ja-JP')}<span style="color:#aaa; font-size:11pt;"> 人</span></td>

                      <td class="prov-td-defense" style="padding:10px 8px; text-align:center; white-space:nowrap;">${r.defense}</td>

                      <td class="prov-td-morale" style="padding:10px 8px; text-align:center; white-space:nowrap;">${r.morale}</td>

                      <td class="prov-td-kokudaka" style="padding:10px 10px; text-align:right; white-space:nowrap;"><b style="color:#ffd700; font-size:12.5pt;">${formatManKoku(r.kokudaka)}</b></td>

                      <td class="prov-td-commerce" style="padding:10px 10px; text-align:right; white-space:nowrap;">${r.commerce.toLocaleString('ja-JP')}<span style="color:#aaa; font-size:11pt;"> 貫</span></td>

                      <td class="prov-td-order" style="padding:10px 8px; text-align:center; white-space:nowrap;">${r.order}%</td>

                    </tr>

                  `;

                }).join('')}

              </tbody>

            </table>

          </div>



          <div class="modal-footer-bar province-footer-bar" style="padding:12px 20px; border-top:1px solid #443322; background:rgba(0,0,0,0.4); display:flex; justify-content:space-between; align-items:center; gap:12px;">

            <span class="modal-footer-info" style="font-size:12pt; color:#aaa;">表示中: ${rows.length}国 (現在年: ${formatHistoricalYear(this.year)}年) ｜ 城主・当主の行は列伝 ｜ 城代・空白地の行は地図を選択</span>

            <button id="closeProvinceModalBtnBottom" class="modal-footer-close-btn" style="background:#555; color:#fff; border:none; padding:7px 14px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; white-space:nowrap;">閉</button>

          </div>

        </div>

      `;



      modal.style.display = 'flex';



      const closeModal = () => { modal.style.display = 'none'; };

      document.getElementById('closeProvinceModalBtn')?.addEventListener('click', closeModal);

      document.getElementById('closeProvinceModalBtnBottom')?.addEventListener('click', closeModal);



      document.getElementById('tabMyProvinces')?.addEventListener('click', () => { currentTab = 'my'; render(); });

      document.getElementById('tabAllProvinces')?.addEventListener('click', () => { currentTab = 'all'; render(); });

      document.getElementById('tabBlankProvinces')?.addEventListener('click', () => { currentTab = 'blank'; render(); });

      document.getElementById('provListOpenBatchGov')?.addEventListener('click', () => this.openBatchGovernorModal());



      modal.querySelectorAll('.sortable-prov-th').forEach(el => {

        el.addEventListener('click', () => {

          const key = el.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'castle' || key === 'region' || key === 'owner') ? 'asc' : 'desc';

          }

          render();

        });

      });



      // スマホ用ソートボタンクリック

      modal.querySelectorAll('.province-mobile-sort-bar .mobile-sort-btn').forEach(btn => {

        btn.addEventListener('click', () => {

          const key = btn.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'castle' || key === 'region' || key === 'owner') ? 'asc' : 'desc';

          }

          render();

        });

      });



      modal.querySelectorAll('.province-table-row').forEach(row => {

        row.addEventListener('click', () => {

          const offId = row.dataset.offId;

          if (offId) {

            const off = (this.activeOfficers || []).find(o => o.id === offId)

              || (this.officers || []).find(o => o.id === offId)

              || (window.OFFICERS_MASTER || []).find(o => o.id === offId);

            if (off) {

              this.showOfficerDetailModal(off);

              return;

            }

          }

          const provId = row.dataset.provId;

          if (!provId) return;

          closeModal();

          this.selectProvince(provId);

        });

      });



      const searchInput = document.getElementById('inputProvinceSearch');

      if (searchInput) {

        const applySearch = (value) => {

          searchQuery = value;

          render();

          const newInp = document.getElementById('inputProvinceSearch');

          if (newInp) {

            newInp.focus();

            newInp.selectionStart = newInp.selectionEnd = newInp.value.length;

          }

        };

        searchInput.addEventListener('input', (e) => {

          if (e.isComposing || e.inputType === 'insertCompositionText') return;

          applySearch(e.target.value);

        });

        searchInput.addEventListener('compositionend', (e) => {

          applySearch(e.target.value);

        });

      }

    };



    render();

    this.audio.playHyoshigi();

  },



  // ============================================================================

  // 勢力一覧 ＆ 外交・同盟関係モーダル（表形式・ソート対応・同盟締結＆破棄対応）

  // ============================================================================,



  openFactionListModal() {

    this.pauseAutoPlayForScreen?.('勢力一覧の表示');

    let modal = document.getElementById('factionListModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'factionListModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    let sortKey = 'provCount'; // 'clan', 'leader', 'base', 'provCount', 'totalRice', 'totalTroops', 'officerCount', 'diplomacy'

    let sortOrder = 'desc'; // 'asc' or 'desc'

    let searchQuery = '';



    const render = () => {

      // 地図上に存在する全大名勢力ID（領国を持つ大名）

      const activeClanIds = [...new Set((this.provinces || []).map(p => p.ownerId).filter(Boolean))];



      // 各大名家の統計情報を集計

      let factions = activeClanIds.map(clanId => {

        const clanName = this.getClanFamilyName(clanId);

        const daimyoName = this.getDaimyoLeaderName(clanId);

        const provs = (this.provinces || []).filter(p => p.ownerId === clanId);

        const provCount = provs.length;

        const totalRice = provs.reduce((sum, p) => sum + (Number(p.rice) || 0), 0);

        const totalTroops = provs.reduce((sum, p) => sum + (Number(p.troops) || 0), 0);

        const officers = (this.activeOfficers || this.officers || []).filter(o => o.clanId === clanId && !o.isDead);

        const officerCount = officers.length;



        // 本拠地城

        const capId = (window.CLAN_CAPITAL_PROVINCES && window.CLAN_CAPITAL_PROVINCES[clanId]);

        const capProv = capId ? this.provinces.find(p => p.id === capId && p.ownerId === clanId) : null;

        const mainProv = capProv || provs[0];

        const capitalDisplay = mainProv ? `${mainProv.name} (${mainProv.castleName || mainProv.castle || '居城'})` : '-';



        // 同盟国一覧

        const allies = this.getAllies(clanId);



        // プレイヤーとの関係

        const isPlayer = (clanId === this.playerClanId);

        const isAlliedWithPlayer = this.isAllied(this.playerClanId, clanId);



        return {

          clanId,

          clanName,

          daimyoName,

          provinces: provs,

          provCount,

          totalRice,

          totalTroops,

          officerCount,

          capitalDisplay,

          mainProvId: mainProv ? mainProv.id : null,

          allies,

          isPlayer,

          isAlliedWithPlayer

        };

      });



      // 検索フィルター

      if (searchQuery) {

        const q = searchQuery.trim().toLowerCase();

        factions = factions.filter(f => 

          f.clanName.toLowerCase().includes(q) ||

          f.daimyoName.toLowerCase().includes(q) ||

          f.capitalDisplay.toLowerCase().includes(q) ||

          f.allies.some(aId => `${this.getClanFamilyName(aId)} ${this.getDaimyoLeaderName(aId)}`.toLowerCase().includes(q))

        );

      }



      // ソート処理

      factions.sort((a, b) => {

        let diff = 0;

        if (sortKey === 'clan') {

          diff = a.clanName.localeCompare(b.clanName, 'ja');

        } else if (sortKey === 'leader') {

          diff = a.daimyoName.localeCompare(b.daimyoName, 'ja');

        } else if (sortKey === 'base') {

          diff = this.provinceGeoRank(a.mainProvId) - this.provinceGeoRank(b.mainProvId);

        } else if (sortKey === 'provCount') {

          diff = a.provCount - b.provCount;

        } else if (sortKey === 'totalRice') {

          diff = a.totalRice - b.totalRice;

        } else if (sortKey === 'totalTroops') {

          diff = a.totalTroops - b.totalTroops;

        } else if (sortKey === 'officerCount') {

          diff = a.officerCount - b.officerCount;

        } else if (sortKey === 'allies') {

          const aCount = (a.allies && a.allies.length) || 0;

          const bCount = (b.allies && b.allies.length) || 0;

          diff = aCount - bCount;

        } else if (sortKey === 'diplomacy') {

          const getDipScore = (f) => f.isPlayer ? 3 : (f.isAlliedWithPlayer ? 2 : 1);

          diff = getDipScore(a) - getDipScore(b);

        }

        return sortOrder === 'desc' ? -diff : diff;

      });



      const getSortIcon = (key) => {

        if (sortKey !== key) return '<span style="color:#776655; font-size:11pt; margin-left:4px;">↕</span>';

        return sortOrder === 'asc' 

          ? '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▲</span>' 

          : '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▼</span>';

      };



      const myAllies = this.getAllies(this.playerClanId);

      const myDaimyoName = this.playerDaimyo?.name || this.getDaimyoLeaderName(this.playerClanId);

      const myClanName = this.getClanFamilyName(this.playerClanId);



      modal.innerHTML = `

        <div class="custom-modal-content faction-modal-content" style="background:#1b140e; border:2px solid var(--gold); border-radius:8px; width:95vw; max-width:1580px; height:88vh; display:flex; flex-direction:column; box-shadow:0 0 45px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif;">

          <!-- ヘッダー -->

          <div class="modal-header-bar" style="padding:12px 22px; border-bottom:1px solid #5a4638; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%); display:flex; justify-content:space-between; align-items:center;">

            <div>

              <h3 class="modal-title-text" style="margin:0; font-size:15pt; color:var(--gold-bright);">❖ 天下大名勢力録・外交指南 ❖</h3>

              <span class="modal-subtitle-text" style="font-size:12pt; color:#ccc;">天下諸大名の支配領国、総石高、総兵力、武将数および外交同盟関係を閲覧できます。他大名との同盟締結・破棄が可能です。</span>

            </div>

            <button id="closeFactionModalBtn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer; padding:0 8px;">✕</button>

          </div>



          <!-- コントロールバー（自軍状況、検索） -->

          <div class="modal-control-bar" style="padding:10px 20px; background:rgba(0,0,0,0.35); border-bottom:1px dashed #5a4638; display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">

            <div class="faction-my-info-bar" style="display:flex; flex-wrap:wrap; align-items:center; gap:12px; font-size:12pt;">

              <span class="fac-info-item" style="background:rgba(212,175,55,0.15); border:1px solid var(--gold); padding:4px 12px; border-radius:4px;">

                👑 貴家: <strong style="color:var(--gold-bright);">${myClanName}</strong> (${myDaimyoName}公)

              </span>

              <span class="fac-info-item" style="background:rgba(0,0,0,0.4); border:1px solid #555; padding:4px 10px; border-radius:4px;">

                ⚡ 行動力: <strong style="color:#5dade2;">${this.ap} AP</strong>

              </span>

              <span class="fac-info-item" style="background:rgba(0,0,0,0.4); border:1px solid #555; padding:4px 10px; border-radius:4px;">

                💰 軍資金: <strong style="color:#ffd700;">${(Number(this.gold) || 0).toLocaleString()} 両</strong>

              </span>

              <span class="fac-info-item" style="background:rgba(46,204,113,0.15); border:1px solid #27ae60; padding:4px 10px; border-radius:4px;">

                🤝 同盟国: <strong style="color:#2ecc71;">${myAllies.length} 家</strong>

              </span>

            </div>



            <div class="modal-search-wrap" style="display:flex; align-items:center; gap:8px;">

              <span class="modal-search-label" style="font-size:12pt; color:#aaa;">勢力検索:</span>

              <input id="inputFactionSearch" type="text" placeholder="大名家・当主・本拠..." value="${searchQuery}" style="background:#22160d; color:#fff; border:1px solid #775533; padding:5px 10px; border-radius:4px; font-size:12pt; width:200px;">

            </div>

          </div>



          <!-- スマホ用ソートバー (本拠、領国数、石高、兵力、武将) -->

          <div class="modal-mobile-sort-bar faction-mobile-sort-bar">

            <span class="mobile-sort-label">並換:</span>

            <button class="mobile-sort-btn ${sortKey === 'base' ? 'active' : ''}" data-key="base">本拠${sortKey === 'base' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'provCount' ? 'active' : ''}" data-key="provCount">領国数${sortKey === 'provCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'totalRice' ? 'active' : ''}" data-key="totalRice">石高${sortKey === 'totalRice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'totalTroops' ? 'active' : ''}" data-key="totalTroops">兵力${sortKey === 'totalTroops' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'officerCount' ? 'active' : ''}" data-key="officerCount">武将${sortKey === 'officerCount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

          </div>



          <!-- 勢力テーブル一覧 -->

          <div class="modal-table-scroll faction-table-scroll" style="flex:1; overflow-y:auto; padding:0 20px;">

            <table class="faction-list-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:12pt;">

              <thead>

                <tr style="position:sticky; top:0; background:#261a12; border-bottom:2px solid #775533; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.5);">

                  <th class="sortable-fac-th fac-th-clan" data-key="clan" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:260px; min-width:260px; white-space:nowrap; font-size:12pt;">大名家 ${getSortIcon('clan')}</th>

                  <th class="sortable-fac-th fac-th-leader" data-key="leader" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:130px; font-size:12pt;">当主 ${getSortIcon('leader')}</th>

                  <th class="sortable-fac-th fac-th-base" data-key="base" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:360px; min-width:360px; white-space:nowrap; font-size:12pt;">本拠地 (居城) ${getSortIcon('base')}</th>

                  <th class="sortable-fac-th fac-th-provs" data-key="provCount" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:95px; text-align:center; font-size:12pt;">領国数 ${getSortIcon('provCount')}</th>

                  <th class="sortable-fac-th fac-th-rice" data-key="totalRice" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:110px; text-align:right; font-size:12pt;">総石高 ${getSortIcon('totalRice')}</th>

                  <th class="sortable-fac-th fac-th-troops" data-key="totalTroops" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:110px; text-align:right; font-size:12pt;">総兵力 ${getSortIcon('totalTroops')}</th>

                  <th class="sortable-fac-th fac-th-officers" data-key="officerCount" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:85px; text-align:center; font-size:12pt;">武将数 ${getSortIcon('officerCount')}</th>

                  <th class="sortable-fac-th fac-th-allies" data-key="allies" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:200px; font-size:12pt;">同盟国 ${getSortIcon('allies')}</th>

                  <th class="sortable-fac-th fac-th-action" data-key="diplomacy" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:170px; text-align:center; font-size:12pt;">外交・同盟 ${getSortIcon('diplomacy')}</th>

                </tr>

              </thead>

              <tbody>

                ${factions.length === 0 ? `

                  <tr>

                    <td colspan="9" style="text-align:center; padding:30px; color:#888; font-size:12pt;">該当する勢力は見つかりませんでした。</td>

                  </tr>

                ` : ''}

                ${factions.map(f => {

                  const provNames = f.provinces.map(p => p.name).join('、');

                  const isPlayer = f.isPlayer;

                  const isAllied = f.isAlliedWithPlayer;



                  let rowBg = 'transparent';

                  let borderLeft = 'none';

                  if (isPlayer) {

                    rowBg = 'rgba(212,175,55,0.12)';

                    borderLeft = '4px solid var(--gold)';

                  } else if (isAllied) {

                    rowBg = 'rgba(46,204,113,0.08)';

                    borderLeft = '4px solid #2ecc71';

                  }



                  // 同盟国タグ一覧（同盟国が多すぎると行の高さが長くなってしまうので、2家以上は「何々家他何家」ボタンにしてクリックで全体表示）
                  let alliesTagsHtml = '<span style="color:#777;">なし</span>';
                  const alliesCount = (f.allies && f.allies.length) || 0;

                  if (alliesCount === 1) {
                    const aId = f.allies[0];
                    const aName = this.getClanFamilyName(aId);
                    const isMy = (aId === this.playerClanId);
                    const left = this.getAllianceRemainingSeasons(f.clanId, aId);
                    const remain = left >= 0 ? ` 残${left}季` : '';
                    alliesTagsHtml = `
                      <button class="btn-open-faction-allies" data-clan-id="${f.clanId}" style="display:inline-block; padding:2px 7px; border-radius:3px; font-size:11pt; background:${isMy ? 'rgba(212,175,55,0.25)' : 'rgba(46,204,113,0.2)'}; border:1px solid ${isMy ? 'var(--gold)' : '#27ae60'}; color:${isMy ? 'var(--gold-bright)' : '#2ecc71'}; font-weight:${isMy ? 'bold' : 'normal'}; cursor:pointer; white-space:nowrap; transition:0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'" title="クリックで同盟諸国の詳細一覧を表示">🤝 ${aName}${remain}</button>
                    `;
                  } else if (alliesCount >= 2) {
                    // 貴家が含まれる場合は貴家を優先して代表表示、なければ先頭大名家
                    const leadId = f.allies.includes(this.playerClanId) ? this.playerClanId : f.allies[0];
                    const leadName = (leadId === this.playerClanId) ? '貴家' : this.getClanFamilyName(leadId);
                    const isLeadMy = (leadId === this.playerClanId);
                    const left = this.getAllianceRemainingSeasons(f.clanId, leadId);
                    const remain = left >= 0 ? ` 残${left}季` : '';
                    const otherCount = alliesCount - 1;

                    alliesTagsHtml = `
                      <div class="fac-allies-compact-wrap" style="display:inline-flex; align-items:center; gap:4px; max-width:100%; white-space:nowrap;">
                        <button class="btn-open-faction-allies" data-clan-id="${f.clanId}" style="display:inline-block; padding:2px 7px; border-radius:3px; font-size:11pt; background:${isLeadMy ? 'rgba(212,175,55,0.25)' : 'rgba(46,204,113,0.2)'}; border:1px solid ${isLeadMy ? 'var(--gold)' : '#27ae60'}; color:${isLeadMy ? 'var(--gold-bright)' : '#2ecc71'}; font-weight:${isLeadMy ? 'bold' : 'normal'}; cursor:pointer; white-space:nowrap; transition:0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'" title="筆頭同盟国 (${leadName}) - クリックで全同盟国一覧を表示">🤝 ${leadName}${remain}</button>
                        <button class="btn-open-faction-allies btn-allies-more-pill" data-clan-id="${f.clanId}" style="display:inline-flex; align-items:center; padding:2px 7px; border-radius:3px; font-size:10.5pt; background:rgba(46,204,113,0.18); border:1px solid #27ae60; color:#2ecc71; cursor:pointer; font-weight:bold; white-space:nowrap; transition:0.15s; line-height:1.3;" onmouseover="this.style.background='rgba(46,204,113,0.38)'; this.style.borderColor='#2ecc71';" onmouseout="this.style.background='rgba(46,204,113,0.18)'; this.style.borderColor='#27ae60';" title="他${otherCount}家 (全${alliesCount}家) - クリックで全同盟国一覧を表示">他${otherCount}家 ▾</button>
                      </div>
                    `;
                  }

                  // 家中分裂の停戦タグ（2026-10-11 cf）
                  const truceTagsHtml = this.breakawayTruceTags ? this.breakawayTruceTags(f.clanId) : '';
                  if (truceTagsHtml) alliesTagsHtml = ((f.allies && f.allies.length > 0) ? (alliesTagsHtml + ' ' + truceTagsHtml) : truceTagsHtml);



                  // 外交行動ボタン

                  let actionHtml = '';

                  if (isPlayer) {

                    actionHtml = '<span style="background:#b7950b; color:#fff; padding:3px 12px; border-radius:4px; font-weight:bold; font-size:11pt; display:inline-block;">👑 貴家</span>';

                  } else if (isAllied) {

                    actionHtml = `

                      <div style="display:flex; justify-content:center; align-items:center; gap:6px;">

                        <span style="background:#27ae60; color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:11pt;">🤝 盟友</span>

                        <button class="btn-break-alliance-row" data-clan-id="${f.clanId}" style="background:#922b21; color:#fff; border:1px solid #c0392b; padding:3px 8px; border-radius:4px; cursor:pointer; font-size:11pt; transition:0.2s;" title="同盟を破棄し手切れとします (AP 1消費)">破棄</button>

                      </div>

                    `;

                  } else {

                    actionHtml = `

                      <div style="display:flex; justify-content:center; align-items:center; gap:6px;">

                        <span style="background:#555; color:#ddd; padding:3px 8px; border-radius:4px; font-size:11pt;">敵対</span>

                        <button class="btn-form-alliance-row" data-clan-id="${f.clanId}" style="background:linear-gradient(180deg, #27ae60, #1e8449); color:#fff; border:1px solid #2ecc71; padding:3px 10px; border-radius:4px; cursor:pointer; font-size:11pt; font-weight:bold; transition:0.2s;" title="使者を派遣して同盟を結びます (金500両・AP 1消費)">同盟</button>

                      </div>

                    `;

                  }



                  return `

                    <tr class="faction-table-row" style="border-bottom:1px solid #3d2b1f; background:${rowBg}; border-left:${borderLeft}; transition:background 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.06)'" onmouseout="this.style.backgroundColor='${rowBg}'">

                      <td class="fac-td-clan" style="padding:10px 12px; font-weight:bold; color:${isPlayer ? 'var(--gold-bright)' : '#fff'}; white-space:nowrap;">

                        ${isPlayer ? '★ ' : ''}${f.clanName} <span class="fac-mobile-leader-name" style="color:var(--gold-bright); font-size:10.5pt; font-weight:normal; margin-left:4px;">(${f.daimyoName})</span>${(f.allies && f.allies.length > 0) ? ` <button class="fac-mobile-allies-badge btn-open-faction-allies" data-clan-id="${f.clanId}" style="display:none; padding:1px 6px; font-size:9.5pt; background:rgba(46,204,113,0.2); border:1px solid #27ae60; color:#2ecc71; border-radius:3px; cursor:pointer; vertical-align:middle;" title="同盟諸国一覧を表示">🤝${f.allies.length}家</button>` : ''}

                      </td>

                      <td class="fac-td-leader" style="padding:10px 12px; color:var(--gold-bright); font-weight:bold;">

                        ${f.daimyoName}

                      </td>

                      <td class="fac-td-base" style="padding:10px 12px; color:#ddd; white-space:nowrap;">

                        ${f.capitalDisplay}

                      </td>

                      <td class="fac-td-provs" style="padding:10px 10px; text-align:center;" title="支配領国: ${provNames}">

                        <span style="font-weight:bold; color:${f.provCount >= 5 ? '#e74c3c' : (f.provCount >= 3 ? '#e67e22' : '#fff')};">${f.provCount}</span> ヶ国

                      </td>

                      <td class="fac-td-rice" style="padding:10px 10px; text-align:right; color:#2ecc71; font-weight:bold;">

                        ${(f.totalRice / 10).toFixed(1)} 万石

                      </td>

                      <td class="fac-td-troops" style="padding:10px 10px; text-align:right; color:#f39c12; font-weight:bold;">

                        ${f.totalTroops.toLocaleString()} 人

                      </td>

                      <td class="fac-td-officers" style="padding:10px 10px; text-align:center; color:#ccc;">

                        ${f.officerCount} 名

                      </td>

                      <td class="fac-td-allies" style="padding:10px 12px;">

                        ${alliesTagsHtml}

                      </td>

                      <td class="fac-td-action" style="padding:10px 12px; text-align:center;">

                        ${actionHtml}

                      </td>

                    </tr>

                  `;

                }).join('')}

              </tbody>

            </table>

          </div>



          <!-- フッター -->

          <div class="modal-footer-bar faction-footer-bar" style="padding:12px 20px; border-top:1px solid #443322; background:rgba(0,0,0,0.4); display:flex; justify-content:space-between; align-items:center;">

            <div class="modal-footer-info" style="font-size:12pt; color:#aaa;">

              現存大名: <strong style="color:#fff;">${factions.length}</strong> 家 ｜ 貴家の同盟国: <strong style="color:#2ecc71;">${myAllies.length}</strong> 家

              <span class="fac-footer-note" style="margin-left:14px; color:#bbb; font-size:11pt;">💡【同盟効果】相互攻撃不可・防衛戦での援軍（二年＝八季で解消。滅亡した大名は一覧から消える。締結: 金500両・AP 1点）</span>

            </div>

            <div>

              <button id="closeFactionModalBtnBottom" class="modal-footer-close-btn" style="background:#555; color:#fff; border:none; padding:7px 22px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">閉</button>

            </div>

          </div>

        </div>

      `;



      modal.style.display = 'flex';



      const closeModal = () => { modal.style.display = 'none'; };

      document.getElementById('closeFactionModalBtn')?.addEventListener('click', closeModal);

      document.getElementById('closeFactionModalBtnBottom')?.addEventListener('click', closeModal);



      // 全体の同盟国一覧表示ボタン

      modal.querySelectorAll('.btn-open-faction-allies').forEach(btn => {

        btn.addEventListener('click', (e) => {

          e.stopPropagation();

          const targetClanId = btn.dataset.clanId;

          this.openFactionAlliesModal(targetClanId);

        });

      });



      // 同盟締結ボタン

      modal.querySelectorAll('.btn-form-alliance-row').forEach(btn => {

        btn.addEventListener('click', (e) => {

          e.stopPropagation();

          const targetClanId = btn.dataset.clanId;

          this.formAlliance(targetClanId, () => render());

        });

      });



      // 同盟破棄ボタン

      modal.querySelectorAll('.btn-break-alliance-row').forEach(btn => {

        btn.addEventListener('click', (e) => {

          e.stopPropagation();

          const targetClanId = btn.dataset.clanId;

          this.breakAlliance(targetClanId, () => render());

        });

      });



      // ヘッダークリックソート

      modal.querySelectorAll('.sortable-fac-th').forEach(th => {

        th.addEventListener('click', () => {

          const key = th.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'clan' || key === 'leader' || key === 'base' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // スマホ用ソートボタンクリック

      modal.querySelectorAll('.faction-mobile-sort-bar .mobile-sort-btn').forEach(btn => {

        btn.addEventListener('click', () => {

          const key = btn.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'base' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // 検索フィルター入力

      const searchInput = document.getElementById('inputFactionSearch');

      if (searchInput) {

        const applySearch = (value) => {

          searchQuery = value;

          render();

          const newInp = document.getElementById('inputFactionSearch');

          if (newInp) {

            newInp.focus();

            newInp.selectionStart = newInp.selectionEnd = newInp.value.length;

          }

        };

        searchInput.addEventListener('input', (e) => {

          if (e.isComposing || e.inputType === 'insertCompositionText') return;

          applySearch(e.target.value);

        });

        searchInput.addEventListener('compositionend', (e) => {

          applySearch(e.target.value);

        });

      }

    };



    render();

    this.audio?.playHyoshigi();

  },



  // ============================================================================

  // 勢力の同盟国一覧モーダル（全同盟国・残り期間・領国・兵力等の詳細表示）

  // ============================================================================

  openFactionAlliesModal(clanId) {

    if (!clanId) return;



    let modal = document.getElementById('factionAlliesModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'factionAlliesModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.82); z-index:100010; display:flex; justify-content:center; align-items:center; padding:15px; box-sizing:border-box;';

      document.body.appendChild(modal);

    }



    const clanName = this.getClanFamilyName(clanId);

    const daimyoName = this.getDaimyoLeaderName(clanId);

    const allies = this.getAllies(clanId) || [];

    const isPlayerClan = (clanId === this.playerClanId);



    // 同盟国データを収集・整理

    const allyDataList = allies.map(aId => {

      const aName = this.getClanFamilyName(aId);

      const aLeader = this.getDaimyoLeaderName(aId);

      const provs = (this.provinces || []).filter(p => p.ownerId === aId);

      const provCount = provs.length;

      const totalRice = provs.reduce((sum, p) => sum + (Number(p.rice) || 0), 0);

      const totalTroops = provs.reduce((sum, p) => sum + (Number(p.troops) || 0), 0);

      const left = this.getAllianceRemainingSeasons(clanId, aId);

      const isMy = (aId === this.playerClanId);

      const isAlliedWithPlayer = this.isAllied(this.playerClanId, aId);



      return {

        clanId: aId,

        clanName: aName,

        daimyoName: aLeader,

        provCount,

        totalRice,

        totalTroops,

        left,

        isMy,

        isAlliedWithPlayer

      };

    });



    // プレイヤー（貴家）を最優先で先頭に、それ以外は領国数降順

    allyDataList.sort((a, b) => {

      if (a.isMy) return -1;

      if (b.isMy) return 1;

      return b.provCount - a.provCount;

    });



    // 家中分裂の停戦情報（もしあれば）

    let truceInfoHtml = '';

    const truceLeft = this.breakawayTruceLeft ? this.breakawayTruceLeft : null;

    const nowTruceTurn = this.truceTurnIndex ? this.truceTurnIndex() : 0;

    const truces = (this.breakawayTruces || []).filter(t => t && t.until >= nowTruceTurn && (t.parent === clanId || t.child === clanId));

    if (truces.length > 0) {

      const truceItems = truces.map(t => {

        const otherId = (t.parent === clanId ? t.child : t.parent);

        const otherName = this.getClanFamilyName(otherId);

        const leftTurn = truceLeft ? truceLeft.call(this, t.parent, t.child) : Math.max(0, t.until - nowTruceTurn);

        const label = t.parent === clanId ? `${otherName}への攻撃不可` : `本家${otherName}と停戦`;

        return `

          <div style="background:rgba(127,140,141,0.18); border:1px solid #7f8c8d; border-radius:4px; padding:6px 10px; display:flex; justify-content:space-between; align-items:center;">

            <span style="color:#eee; font-size:11pt;">🕊 ${label}</span>

            <span style="color:#f1c40f; font-weight:bold; font-size:11pt;">残 ${leftTurn} 季</span>

          </div>

        `;

      }).join('');



      truceInfoHtml = `

        <div style="margin-top:14px; padding-top:12px; border-top:1px dashed #554433;">

          <div style="font-size:11pt; color:#bbb; margin-bottom:6px; font-weight:bold;">🕊 家中分裂による停戦約定:</div>

          <div style="display:flex; flex-direction:column; gap:5px;">

            ${truceItems}

          </div>

        </div>

      `;

    }



    modal.innerHTML = `

      <div style="background:linear-gradient(180deg, #1f140e 0%, #150d09 100%); border:2px solid var(--gold); border-radius:8px; width:94vw; max-width:540px; max-height:86vh; display:flex; flex-direction:column; box-shadow:0 10px 45px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif; animation:modalPopIn 0.18s ease-out; overflow:hidden;">

        <!-- ヘッダー -->

        <div style="background:linear-gradient(90deg, #3d2b1f, #22150e); padding:12px 18px; border-bottom:1px solid var(--gold); display:flex; justify-content:space-between; align-items:center;">

          <div>

            <h3 style="margin:0; font-size:14pt; color:var(--gold-bright); display:flex; align-items:center; gap:6px;">

              <span>🤝</span>

              <span>【${clanName}】同盟諸国録</span>

            </h3>

            <div style="font-size:10.5pt; color:#ccc; margin-top:3px;">

              当主: <strong style="color:#fff;">${daimyoName}</strong> ｜ 同盟国: <strong style="color:#2ecc71;">${allies.length}</strong> 家

            </div>

          </div>

          <button id="closeFactionAlliesModalBtnTop" style="background:transparent; border:none; color:#ddd; font-size:18pt; cursor:pointer; padding:0 6px; line-height:1;" title="閉じる">✕</button>

        </div>



        <!-- 同盟国一覧ボディ -->

        <div style="flex:1; overflow-y:auto; padding:14px 18px;">

          ${allyDataList.length === 0 ? `

            <div style="text-align:center; padding:35px 20px; color:#888; font-size:12pt;">

              現在、同盟を結んでいる勢力はありません。

            </div>

          ` : `

            <div style="display:flex; flex-direction:column; gap:8px;">

              ${allyDataList.map(a => {

                const relationBadge = a.isMy 

                  ? `<span style="background:var(--gold); color:#000; font-size:9.5pt; font-weight:bold; padding:2px 7px; border-radius:3px;">👑 貴家</span>`

                  : (a.isAlliedWithPlayer 

                      ? `<span style="background:#27ae60; color:#fff; font-size:9.5pt; font-weight:bold; padding:2px 7px; border-radius:3px;">🤝 盟友</span>`

                      : `<span style="background:#443322; color:#bbb; font-size:9.5pt; padding:2px 7px; border-radius:3px;">他家</span>`);



                const remainHtml = a.left >= 0

                  ? `<span style="color:#2ecc71; font-weight:bold; font-size:11.5pt;">残 ${a.left} 季</span><span style="font-size:9.5pt; color:#888; margin-left:4px;">(約${Math.ceil(a.left / 4)}年)</span>`

                  : `<span style="color:#2ecc71; font-weight:bold; font-size:11pt;">永続</span>`;



                const borderLeftColor = a.isMy ? 'var(--gold)' : (a.isAlliedWithPlayer ? '#2ecc71' : '#775533');

                const cardBg = a.isMy ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)';



                return `

                  <div style="background:${cardBg}; border:1px solid #443322; border-left:4px solid ${borderLeftColor}; padding:9px 12px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; gap:10px;">

                    <div style="flex:1; min-width:0;">

                      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">

                        <strong style="font-size:12pt; color:${a.isMy ? 'var(--gold-bright)' : '#fff'};">🤝 ${a.clanName}</strong>

                        ${relationBadge}

                      </div>

                      <div style="font-size:10pt; color:#aaa; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">

                        当主: <span style="color:#ddd;">${a.daimyoName}</span> ｜ 領国: <strong style="color:#fff;">${a.provCount}</strong>ヶ国 ｜ 兵力: <strong style="color:#f39c12;">${a.totalTroops.toLocaleString()}</strong>人

                      </div>

                    </div>

                    <div style="text-align:right; white-space:nowrap;">

                      <div style="font-size:10pt; color:#aaa;">盟約期間</div>

                      <div>${remainHtml}</div>

                    </div>

                  </div>

                `;

              }).join('')}

            </div>

          `}



          ${truceInfoHtml}

        </div>



        <!-- フッター -->

        <div style="padding:10px 18px; border-top:1px solid #443322; background:rgba(0,0,0,0.45); display:flex; justify-content:flex-end; align-items:center;">

          <button id="closeFactionAlliesModalBtnBottom" style="background:#555; color:#fff; border:none; padding:6px 20px; border-radius:4px; cursor:pointer; font-size:11pt; font-weight:bold; white-space:nowrap; transition:0.2s;" onmouseover="this.style.background='#666'" onmouseout="this.style.background='#555'">閉じる</button>

        </div>

      </div>

    `;



    modal.style.display = 'flex';



    const closeModal = () => {

      modal.style.display = 'none';

    };



    document.getElementById('closeFactionAlliesModalBtnTop')?.addEventListener('click', closeModal);

    document.getElementById('closeFactionAlliesModalBtnBottom')?.addEventListener('click', closeModal);



    modal.onclick = (e) => {

      if (e.target === modal) closeModal();

    };



    const onKey = (e) => {

      if (e.key === 'Escape') {

        closeModal();

        window.removeEventListener('keydown', onKey);

      }

    };

    window.addEventListener('keydown', onKey);

  },



  // ============================================================================

  // 浪人登用（単体実行処理）

  // ============================================================================

  async recruitRonin(officerId, callback = null) {

    const off = (this.activeOfficers || []).find(o => o.id === officerId && !o.isDead);

    if (!off || off.clanId !== 'ronin') {

      if (window.Swal) {

        Swal.fire({

          icon: 'info',

          title: '登用不可',

          text: '該当の浪人は現在仕官可能な状態ではありません。',

          background: '#1c130d',

          color: '#f5eedc'

        });

      }

      return;

    }



    // 所在国情報（遠国も登用可。遠いほど成功率は下がり、跡継ぎ不在なら上がる）

    const defProvName = off.defaultProv ? this.getProvinceJapaneseName(off.defaultProv) : '諸国';

    const reach = this.calcPlayerRoninRecruitRate(off);

    const isDefProvMine = reach.dist === 0;

    const isNeighbor = reach.dist === 1;

    const age = this.year - (off.birthYear || 1530);

    const rate = reach.rate;

    const reachBadge = isDefProvMine

      ? { bg: 'rgba(46,204,113,0.3)', border: '#27ae60', color: '#2ecc71', text: `🏯 流浪国（自領） (${defProvName})` }

      : isNeighbor

        ? { bg: 'rgba(230,126,34,0.3)', border: '#e67e22', color: '#f5b041', text: `隣国より仕官 (${defProvName})` }

        : { bg: 'rgba(52,152,219,0.28)', border: '#2980b9', color: '#85c1e9', text: `遠国より仕官・可 (${defProvName})` };

    const rateNote = !reach.reachable

      ? ''

      : isDefProvMine

        ? (reach.lacksHeir ? '（流浪国・跡継ぎ不在ボーナス）' : '（流浪国ボーナス）')

        : isNeighbor

          ? (reach.lacksHeir ? '（隣国・跡継ぎ不在で上昇）' : '（隣国のため成功率低下）')

          : (reach.lacksHeir ? '（遠国だが跡継ぎ不在のため成功率上昇）' : '（遠国・登用可。遠いため成功率低下）');



    if (!reach.reachable) {

      if (window.Swal) {

        Swal.fire({

          icon: 'info',

          title: '所在不明のため登用できず',

          html: `<div style="font-size:12pt; color:#f5eedc; line-height:1.7;">${off.name}の流浪先が判らず、使者を送れません。</div>`,

          confirmButtonText: '承知した',

          confirmButtonColor: '#7f8c8d',

          background: '#1c130d',

          color: '#f5eedc'

        });

      }

      return;

    }



    if (this.ap <= 0) {

      this.showOrderResult('⚠ 軍令権不足', '今季の軍令権(AP)が不足しています。「次季へ進む」で回復してください。', '#e67e22');

      return;

    }



    if (this.gold < 40) {

      this.showOrderResult('⚠ 資金不足', `浪人登用には支度金40貫が必要です（現在: ${this.gold}貫）。`, '#e74c3c');

      return;

    }



    // 確認ダイアログ

    let proceed = true;

    if (window.Swal) {

      const confirmRes = await Swal.fire({

        title: `❖ 浪人登用使者の派遣 ❖`,

        html: `

          <div style="text-align:left; font-size:12pt; color:#f5eedc; font-family:'Noto Serif JP',serif; line-height:1.6;">

            <div style="border-bottom:1px solid #5a4638; padding-bottom:8px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">

              <div>

                <span style="font-size:16pt; font-weight:bold; color:var(--gold-bright);">${off.name}</span>

                <span style="font-size:11.5pt; color:#ccc; margin-left:6px;">(${age}歳)</span>

              </div>

              <div>

                <span style="background:${reachBadge.bg}; border:1px solid ${reachBadge.border}; color:${reachBadge.color}; padding:2px 8px; border-radius:3px; font-size:11pt;">

                  ${reachBadge.text}

                </span>

              </div>

            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; text-align:center; margin-bottom:12px;">

              <div style="background:rgba(231,76,60,0.2); border:1px solid #c0392b; padding:4px; border-radius:4px;">

                <div style="font-size:10pt; color:#ff7675;">⚔️ 武勇</div>

                <div style="font-size:14pt; font-weight:bold; color:#ff7675;">${off.military}</div>

              </div>

              <div style="background:rgba(52,152,219,0.2); border:1px solid #2980b9; padding:4px; border-radius:4px;">

                <div style="font-size:10pt; color:#74b9ff;">🌾 内政</div>

                <div style="font-size:14pt; font-weight:bold; color:#74b9ff;">${off.politic}</div>

              </div>

              <div style="background:rgba(46,204,113,0.2); border:1px solid #27ae60; padding:4px; border-radius:4px;">

                <div style="font-size:10pt; color:#55efc4;">📜 知略</div>

                <div style="font-size:14pt; font-weight:bold; color:#55efc4;">${off.intel}</div>

              </div>

            </div>

            <div style="background:rgba(0,0,0,0.4); padding:8px 10px; border-radius:4px; margin-bottom:12px; font-size:11.5pt; color:#ddd; line-height:1.5;">

              <strong>【列伝】</strong> ${this.cleanOfficerLore(off.lore) || '天下に名を響かせる士。'}

            </div>

            <div style="background:rgba(212,175,55,0.12); border:1px solid var(--gold); border-radius:4px; padding:8px 10px; font-size:11.5pt;">

              💰 登用費用: <strong>金40貫</strong> ｜ 📜 軍令権: <strong>1消費</strong><br>

              🎯 登用成功見込み: <strong style="color:var(--gold-bright); font-size:13pt;">${rate}%</strong> ${rateNote}

            </div>

          </div>

        `,

        showCancelButton: true,

        confirmButtonText: '🤝 使者を派遣して登用する',

        confirmButtonColor: '#27ae60',

        cancelButtonText: '見送る',

        cancelButtonColor: '#7f8c8d',

        background: '#1c130d',

        color: '#f5eedc'

      });

      proceed = confirmRes.isConfirmed;

    }



    if (!proceed) return;



    // 行動力消費

    this.ap -= 1;

    this.updateStatusHeader();



    const isSuccess = (Math.random() * 100) < rate;



    if (isSuccess) {

      this.gold -= 40;

      off.clanId = this.playerClanId;

      off.isDaimyo = false;

      off.assignedProvId = null;



      this.log(`🤝【浪人登用成功】「殿の器量、天下一に候！我が命、貴家に捧げましょう！」${off.name}公が我が軍の配下に加わりました！`, 'important');

      try { this.audio.playGrandFanfare?.(); } catch(e) {}

      this.appointHistoricalHomeGovernors(this.playerClanId);



      if (window.Swal) {

        await Swal.fire({

          icon: 'success',

          title: '登用成功！',

          html: `

            <div style="font-size:13pt; color:#2ecc71; font-weight:bold; margin-bottom:8px; font-family:'Noto Serif JP',serif;">「我が忠義、生涯殿に捧げましょう！」</div>

            <div style="font-size:12pt; color:#f5eedc;">名将・<strong>${off.name}</strong>公が我が軍の配下武将に加わりました！<br>直ちに城主への任命や軍事・内政に登用可能です。</div>

          `,

          confirmButtonText: '大儀であった',

          confirmButtonColor: '#27ae60',

          background: '#1c130d',

          color: '#f5eedc'

        });

      }

    } else {

      // 失敗時は使者手当として金20貫のみ消費

      this.gold -= 20;

      this.log(`🍂【登用不首尾】使者を派遣するも、${off.name}は「今はまだ仕官の時ではない」と仕官を固辞しました（支度金20貫を返還）。`);

      try { this.audio.playHyoshigi?.(); } catch(e) {}



      if (window.Swal) {

        await Swal.fire({

          icon: 'warning',

          title: '登用不首尾……',

          html: `

            <div style="font-size:13pt; color:#e67e22; font-weight:bold; margin-bottom:8px; font-family:'Noto Serif JP',serif;">「今はまだ機が熟さぬ……」</div>

            <div style="font-size:12pt; color:#f5eedc;">${off.name}は仕官を固辞し、立ち去りました。<br>（支度金20貫を返還。次期以降も再登用可能です）</div>

          `,

          confirmButtonText: 'やむを得ぬ',

          confirmButtonColor: '#7f8c8d',

          background: '#1c130d',

          color: '#f5eedc'

        });

      }

    }



    this.updateUI(); // 選択中の国パネルも updateUI 内で再描画

    if (callback) callback();

  },



  // ============================================================================

  // 諸国人材登用・浪人招聘モーダル

  // ============================================================================,



  openRecruitRoninModal(targetRoninId = null) {

    this.pauseAutoPlayForScreen?.('浪人登用画面の表示');

    if (this.isAutoPlay) this.stopAutoPlay('登用画面表示のため');

    if (targetRoninId) {

      this.recruitRonin(targetRoninId);

      return;

    }



    let modal = document.getElementById('recruitRoninModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'recruitRoninModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    let currentFilter = 'all'; // 'all' or 'myProv'

    let sortKey = 'military'; // 'military', 'politic', 'intel', 'age', 'name', 'prov'

    let sortOrder = 'desc';

    let searchQuery = '';



    const render = () => {

      const ronins = (this.activeOfficers || []).filter(o => o.clanId === 'ronin' && !o.isDead);

      const myProvIds = this.provinces.filter(p => p.ownerId === this.playerClanId).map(p => p.id);

      

      let list = ronins.filter(r => {

        if (currentFilter === 'myProv') {

          return r.defaultProv && myProvIds.includes(r.defaultProv);

        }

        return true;

      });



      if (searchQuery) {

        const q = searchQuery.trim().toLowerCase();

        list = list.filter(o => {

          const comment = this.getOfficerComment(o).toLowerCase();

          const defProvName = (o.defaultProv ? this.getProvinceJapaneseName(o.defaultProv) : '').toLowerCase();

          return (o.name && o.name.toLowerCase().includes(q)) || 

                 comment.includes(q) || 

                 defProvName.includes(q);

        });

      }



      // ソート処理

      list.sort((a, b) => {

        let diff = 0;

        if (sortKey === 'military') diff = (a.military || 0) - (b.military || 0);

        else if (sortKey === 'politic') diff = (a.politic || 0) - (b.politic || 0);

        else if (sortKey === 'intel') diff = (a.intel || 0) - (b.intel || 0);

        else if (sortKey === 'age') {

          const ageA = this.year - (a.birthYear || 1530);

          const ageB = this.year - (b.birthYear || 1530);

          diff = ageA - ageB;

        } else if (sortKey === 'name') {

          diff = (a.name || '').localeCompare(b.name || '', 'ja');

        } else if (sortKey === 'prov') {

          const provA = a.defaultProv ? this.getProvinceJapaneseName(a.defaultProv) : '';

          const provB = b.defaultProv ? this.getProvinceJapaneseName(b.defaultProv) : '';

          diff = provA.localeCompare(provB, 'ja');

        }

        return sortOrder === 'desc' ? -diff : diff;

      });



      const myProvCount = ronins.filter(r => r.defaultProv && myProvIds.includes(r.defaultProv)).length;



      const getSortIcon = (key) => {

        if (sortKey !== key) return '<span style="color:#776655; font-size:11pt; margin-left:4px;">↕</span>';

        return sortOrder === 'asc' 

          ? '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▲</span>' 

          : '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▼</span>';

      };



      modal.innerHTML = `

        <div style="background:#1b140e; border:2px solid var(--gold); border-radius:8px; width:95vw; max-width:1180px; height:88vh; display:flex; flex-direction:column; box-shadow:0 0 45px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif;">

          <!-- ヘッダー -->

          <div style="padding:12px 22px; border-bottom:1px solid #5a4638; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%); display:flex; justify-content:space-between; align-items:center;">

            <div>

              <h3 style="margin:0; font-size:15pt; color:var(--gold-bright);">❖ 人材登用・浪人招聘所 ❖</h3>

              <span style="font-size:12pt; color:#ccc;">遠国の浪人も登用できます。遠いほど成功率は下がり、跡継ぎがいないときは上がります（令状: 1 ｜ 支度金: 金40貫）。</span>

            </div>

            <button id="closeRecruitModalBtn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer; padding:0 8px;">✕</button>

          </div>



          <!-- コントロールバー -->

          <div style="padding:10px 20px; background:rgba(0,0,0,0.35); border-bottom:1px dashed #5a4638; display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; align-items:center;">

            <div style="display:flex; gap:8px;">

              <button id="filterAllRonin" style="background:${currentFilter === 'all' ? '#b7950b' : '#2b1d14'}; color:${currentFilter === 'all' ? '#fff' : '#f1c40f'}; border:1px solid ${currentFilter === 'all' ? '#d4af37' : '#886622'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; transition:0.2s;">

                全国の浪人 (${ronins.length}名)

              </button>

              <button id="filterMyProvRonin" style="background:${currentFilter === 'myProv' ? '#27ae60' : '#2b1d14'}; color:${currentFilter === 'myProv' ? '#fff' : '#a9dfbf'}; border:1px solid ${currentFilter === 'myProv' ? '#2ecc71' : '#1e8449'}; padding:6px 16px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold; transition:0.2s;">

                🏯 自領内滞在 (${myProvCount}名) ★成功率上昇

              </button>

            </div>



            <div style="display:flex; align-items:center; gap:8px;">

              <span style="font-size:12pt; color:#aaa;">検索:</span>

              <input id="inputRecruitSearch" type="text" placeholder="武将名・流浪地..." value="${searchQuery}" style="background:#22160d; color:#fff; border:1px solid #775533; padding:5px 10px; border-radius:4px; font-size:12pt; width:190px;">

            </div>

          </div>



          <!-- 浪人テーブル一覧 -->

          <div style="flex:1; overflow-y:auto; padding:0 20px;">

            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:12pt;">

              <thead>

                <tr style="position:sticky; top:0; background:#261a12; border-bottom:2px solid #775533; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.5);">

                  <th class="sortable-rec-th" data-key="name" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:150px; font-size:12pt;">名前 ${getSortIcon('name')}</th>

                  <th class="sortable-rec-th" data-key="prov" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:140px; text-align:center; font-size:12pt;">滞在国 ${getSortIcon('prov')}</th>

                  <th class="sortable-rec-th" data-key="age" style="padding:11px 12px; color:var(--gold); cursor:pointer; user-select:none; width:130px; text-align:center; font-size:12pt;">年齢 ${getSortIcon('age')}</th>

                  <th class="sortable-rec-th" data-key="military" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:85px; text-align:center; font-size:12pt;">武勇 ${getSortIcon('military')}</th>

                  <th class="sortable-rec-th" data-key="politic" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:85px; text-align:center; font-size:12pt;">内政 ${getSortIcon('politic')}</th>

                  <th class="sortable-rec-th" data-key="intel" style="padding:11px 10px; color:var(--gold); cursor:pointer; user-select:none; width:85px; text-align:center; font-size:12pt;">知略 ${getSortIcon('intel')}</th>

                  <th style="padding:11px 10px; color:var(--gold); width:130px; text-align:center; font-size:12pt;">登用工作</th>

                </tr>

              </thead>

              <tbody>

                ${list.length === 0 ? `

                  <tr>

                    <td colspan="7" style="text-align:center; padding:35px; color:#888; font-size:12pt;">該当する浪人は見つかりませんでした。</td>

                  </tr>

                ` : ''}

                ${list.map((off, idx) => {

                  const reach = this.getRoninServiceReach(off, this.playerClanId);

                  const isMine = reach.dist === 0;

                  const isNeighbor = reach.dist === 1;

                  const defProvName = off.defaultProv ? this.getProvinceJapaneseName(off.defaultProv) : '諸国';

                  const age = this.year - (off.birthYear || 1530);

                  const rowBg = idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.18)';

                  const stayLabel = isMine ? '(流浪国)' : (isNeighbor ? '(隣国)' : (reach.reachable ? '(遠国・可)' : '(所在不明)'));

                  const stayColor = isMine ? '#2ecc71' : (isNeighbor ? '#f5b041' : '#85c1e9');

                  const stayBorder = isMine ? '#27ae60' : (isNeighbor ? '#e67e22' : '#2980b9');

                  const stayBg = isMine ? 'rgba(46,204,113,0.25)' : (isNeighbor ? 'rgba(230,126,34,0.22)' : 'rgba(52,152,219,0.22)');

                  const farNote = !isMine && !isNeighbor && reach.reachable

                    ? `<div style="font-size:10pt; color:${reach.lacksHeir ? '#f5b041' : '#85c1e9'}; margin-top:2px;">${reach.lacksHeir ? '跡継ぎ不在で上昇' : '登用可'}</div>`

                    : '';

                  const recruitCell = reach.reachable

                    ? `<button class="btn-do-recruit" data-off-id="${off.id}" style="background:linear-gradient(180deg, #d4af37, #b7950b); color:#111; border:none; padding:4px 14px; border-radius:4px; font-weight:bold; font-size:12pt; cursor:pointer; box-shadow:0 1px 4px rgba(0,0,0,0.5);">🤝 登用</button>${farNote}`

                    : `<span style="color:#888; font-size:11.5pt;" title="所在が分からず登用できません">所在不明</span>`;



                  return `

                    <tr class="recruit-table-row" data-off-id="${off.id}" style="background:${rowBg}; border-bottom:1px solid #3d2d20; cursor:pointer; font-size:12pt; transition:background 0.15s;" onmouseover="this.style.background='rgba(215, 175, 100, 0.12)'" onmouseout="this.style.background='${rowBg}'">

                      <td style="padding:10px 12px; font-weight:bold; color:#ffffff; white-space:nowrap; font-size:12.5pt;">

                        ${off.name}

                      </td>

                      <td style="padding:10px 12px; text-align:center; white-space:nowrap;">

                        <span style="background:${stayBg}; color:${stayColor}; border:1px solid ${stayBorder}; padding:2px 8px; border-radius:3px; font-size:11.5pt;">

                          ${defProvName} ${stayLabel}

                        </span>

                      </td>

                      <td style="padding:10px 12px; text-align:center; color:#ddd; white-space:nowrap; font-size:12pt;">

                        <strong style="color:#ffffff; font-size:12.5pt;">${age}歳</strong>

                      </td>

                      <td style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#ff6b6b; font-size:12.5pt;">${off.military}</b>

                      </td>

                      <td style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#5dade2; font-size:12.5pt;">${off.politic}</b>

                      </td>

                      <td style="padding:10px 10px; text-align:center; white-space:nowrap;">

                        <b style="color:#a3e4d7; font-size:12.5pt;">${off.intel}</b>

                      </td>

                      <td style="padding:10px 8px; text-align:center; white-space:nowrap;">

                        ${recruitCell}

                      </td>

                    </tr>

                  `;

                }).join('')}

              </tbody>

            </table>

          </div>



          <!-- フッター -->

          <div style="padding:12px 20px; border-top:1px solid #443322; background:rgba(0,0,0,0.4); display:flex; justify-content:space-between; align-items:center;">

            <span style="font-size:12pt; color:#aaa;">表示中: ${list.length}名 ｜ 遠国も登用可 ｜ 流浪国は上昇、隣国・遠国は低下。跡継ぎ不在時は確率が上がり仕官も来ます</span>

            <button id="closeRecruitModalBtnBottom" style="background:#555; color:#fff; border:none; padding:7px 22px; border-radius:4px; cursor:pointer; font-size:12pt; font-weight:bold;">閉じる</button>

          </div>

        </div>

      `;



      modal.style.display = 'flex';



      const closeModal = () => { modal.style.display = 'none'; };

      document.getElementById('closeRecruitModalBtn')?.addEventListener('click', closeModal);

      document.getElementById('closeRecruitModalBtnBottom')?.addEventListener('click', closeModal);



      document.getElementById('filterAllRonin')?.addEventListener('click', () => { currentFilter = 'all'; render(); });

      document.getElementById('filterMyProvRonin')?.addEventListener('click', () => { currentFilter = 'myProv'; render(); });



      // ヘッダークリックソート

      modal.querySelectorAll('.sortable-rec-th').forEach(th => {

        th.addEventListener('click', () => {

          const key = th.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'prov' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // 行クリックで列伝モーダル

      modal.querySelectorAll('.recruit-table-row').forEach(row => {

        row.addEventListener('click', (e) => {

          if (e.target.closest('button')) return;

          const offId = row.dataset.offId;

          const off = (this.activeOfficers || []).find(o => o.id === offId);

          if (off) this.showOfficerDetailModal(off);

        });

      });



      // 登用ボタンクリック

      modal.querySelectorAll('.btn-do-recruit').forEach(btn => {

        btn.addEventListener('click', (e) => {

          e.stopPropagation();

          const offId = btn.dataset.offId;

          this.recruitRonin(offId, () => {

            render();

          });

        });

      });



      const searchInput = document.getElementById('inputRecruitSearch');

      if (searchInput) {

        const applySearch = (value) => {

          searchQuery = value;

          render();

          const newInp = document.getElementById('inputRecruitSearch');

          if (newInp) {

            newInp.focus();

            newInp.selectionStart = newInp.selectionEnd = newInp.value.length;

          }

        };

        searchInput.addEventListener('input', (e) => {

          if (e.isComposing || e.inputType === 'insertCompositionText') return;

          applySearch(e.target.value);

        });

        searchInput.addEventListener('compositionend', (e) => {

          applySearch(e.target.value);

        });

      }

    };



    render();

    this.audio.playHyoshigi();

  },



  // 氏名から苗字を取る（豊臣・羽柴・長宗我部など複数文字を優先）,



  openProvinceOfficersModal(provId) {

    this.pauseAutoPlayForScreen?.('領国詳細の表示');

    if (this.isAutoPlay) this.stopAutoPlay('武将一覧表示のため');



    const p = (this.provinces || []).find(x => x.id === provId);

    if (!p) return;



    let modal = document.getElementById('provinceOfficersModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'provinceOfficersModal';

      modal.className = 'custom-modal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    let sortKey = 'role'; // 'role', 'name', 'clan', 'age', 'military', 'politic', 'intel', 'comment'

    let sortOrder = 'desc';

    let searchQuery = '';



    const curCastle = (this.currentScenario && this.currentScenario.castles && this.currentScenario.castles[p.id]) || p.castleName || p.castle || '居城';

    const isMine = p.ownerId === this.playerClanId;

    const isBlank = !p.ownerId;

    const ownerName = isBlank ? '空白地 (領主不在)' : this.getClanDisplayName(p.ownerId);



    const closeModal = () => {

      if (modal) {

        modal.style.display = 'none';

        modal.innerHTML = '';

      }

      document.removeEventListener('keydown', handleKeyDown);

    };



    const handleKeyDown = (e) => {

      if (e.key === 'Escape') closeModal();

    };

    document.addEventListener('keydown', handleKeyDown);



    const render = () => {

      const provOfficers = this.getOfficersInProvince(p.id);



      let list = [...provOfficers];



      if (searchQuery) {

        const q = searchQuery.trim().toLowerCase();

        list = list.filter(o => {

          const comment = this.getOfficerComment(o).toLowerCase();

          const clanName = (o.clanId === 'ronin' ? '浪人' : `${this.getClanDisplayName(o.clanId) || ''} ${this.getClanFamilyName(o.clanId) || ''}`).toLowerCase();

          return (o.name && o.name.toLowerCase().includes(q)) || comment.includes(q) || clanName.includes(q);

        });

      }



      // ソート処理

      list.sort((a, b) => {

        let diff = 0;

        if (sortKey === 'role') {

          // 当主(3) > 城主(2) > 配下(1) > 浪人(0)

          const getRoleScore = (off) => {

            if (off.isDaimyo) return 3;

            if (off.id === p.governorId || off.assignedProvId === p.id) return 2;

            if (off.clanId === 'ronin') return 0;

            return 1;

          };

          diff = getRoleScore(a) - getRoleScore(b);

          if (diff === 0) diff = (a.military || 0) - (b.military || 0);

        } else if (sortKey === 'name') {

          diff = (a.name || '').localeCompare(b.name || '', 'ja');

        } else if (sortKey === 'clan') {

          const clanA = a.clanId === 'ronin' ? '浪人' : (this.getClanDisplayName(a.clanId) || '');

          const clanB = b.clanId === 'ronin' ? '浪人' : (this.getClanDisplayName(b.clanId) || '');

          diff = clanA.localeCompare(clanB, 'ja');

        } else if (sortKey === 'age') {

          const ageA = this.year - (a.birthYear || 1530);

          const ageB = this.year - (b.birthYear || 1530);

          diff = ageA - ageB;

        } else if (sortKey === 'military') {

          diff = (a.military || 0) - (b.military || 0);

        } else if (sortKey === 'politic') {

          diff = (a.politic || 0) - (b.politic || 0);

        } else if (sortKey === 'intel') {

          diff = (a.intel || 0) - (b.intel || 0);

        } else if (sortKey === 'comment') {

          diff = this.getOfficerComment(a).localeCompare(this.getOfficerComment(b), 'ja');

        }

        return sortOrder === 'desc' ? -diff : diff;

      });



      const getSortIcon = (key) => {

        if (sortKey !== key) return '<span style="color:#776655; font-size:11pt; margin-left:4px;">↕</span>';

        return sortOrder === 'asc' 

          ? '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▲</span>' 

          : '<span style="color:var(--gold-bright); font-size:12pt; margin-left:4px;">▼</span>';

      };



      modal.style.display = 'flex';

      modal.innerHTML = `

        <div class="custom-modal-content prov-officers-modal-content" style="background:#1b140e; border:2px solid var(--gold); border-radius:8px; width:95vw; max-width:1080px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 0 45px rgba(0,0,0,0.95); color:#f5eedc; font-family:'Noto Serif JP',serif;">

          <!-- ヘッダー -->

          <div class="modal-header-bar prov-officers-header-bar" style="padding:12px 20px; border-bottom:1px solid #5a4638; background:linear-gradient(180deg, #2b1d14 0%, #1a110a 100%); display:flex; justify-content:space-between; align-items:center;">

            <div>

              <h3 class="modal-title-text prov-officers-title-text" style="margin:0; font-size:15pt; color:var(--gold-bright);">

                🏯【${p.name}】在国武将一覧

                <span class="prov-officers-castle-tag" style="font-size:12pt; color:#ccc; font-weight:normal; margin-left:8px;">(城郭: ${curCastle})</span>

              </h3>

              <div class="modal-subtitle-text prov-officers-subtitle-text" style="font-size:11.5pt; color:#aaa; margin-top:2px;">

                支配: <strong style="color:${isMine ? 'var(--gold)' : (isBlank ? '#bdc3c7' : '#e0d8c3')}">${ownerName}</strong> 

                ｜ 滞在武将: <strong style="color:var(--gold-bright);">${provOfficers.length} 名</strong>

                <span class="prov-officers-note-pc" style="color:#888; margin-left:8px;">※武将をクリックすると列伝・詳細を確認できます</span>

              </div>

              <div class="prov-officers-mobile-sub" style="display:none;">

                <span class="prov-officers-mobile-owner">支配: <strong style="color:${isMine ? 'var(--gold)' : (isBlank ? '#bdc3c7' : '#e0d8c3')}">${ownerName}</strong></span>

                <span class="prov-officers-mobile-count">滞在: <strong style="color:var(--gold-bright);">${provOfficers.length}名</strong></span>

              </div>

            </div>

            <button id="closeProvOfficersModalBtn" class="modal-close-x-btn" style="background:transparent; border:none; color:#ddd; font-size:20pt; cursor:pointer; padding:0 8px; line-height:1;">✕</button>

          </div>



          <!-- 検索バー ＆ アクション -->

          <div class="modal-control-bar prov-officers-control-bar" style="padding:8px 20px; background:rgba(0,0,0,0.35); border-bottom:1px dashed #5a4638; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">

            <div class="prov-officers-actions">

              ${isMine ? `

                <button id="btnProvOfficersAppoint" class="btn-prov-officers-appoint" style="background:linear-gradient(180deg, #b7950b, #967208); color:#fff; border:1px solid #d4af37; padding:4px 12px; border-radius:3px; cursor:pointer; font-size:11.5pt; font-weight:bold; white-space:nowrap;">

                  🏯 城主を交代・任命

                </button>

              ` : ''}

            </div>

            <div class="modal-search-wrap prov-officers-search-wrap" style="display:flex; align-items:center; gap:8px;">

              <span class="modal-search-label" style="font-size:11.5pt; color:#aaa;">検索:</span>

              <input id="inputProvOfficerSearch" type="text" placeholder="武将名・所属・略歴..." value="${searchQuery}" style="background:#22160d; color:#fff; border:1px solid #775533; padding:4px 8px; border-radius:4px; font-size:11.5pt; width:180px;">

            </div>

          </div>



          <!-- スマホ用ソートバー (身分、名前、所属、武勇、内政、知略、年齢) -->

          <div class="modal-mobile-sort-bar prov-officers-mobile-sort-bar">

            <span class="mobile-sort-label">並換:</span>

            <button class="mobile-sort-btn ${sortKey === 'role' ? 'active' : ''}" data-key="role">身分${sortKey === 'role' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'name' ? 'active' : ''}" data-key="name">名前${sortKey === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'clan' ? 'active' : ''}" data-key="clan">所属${sortKey === 'clan' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'military' ? 'active' : ''}" data-key="military">武勇${sortKey === 'military' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'politic' ? 'active' : ''}" data-key="politic">内政${sortKey === 'politic' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'intel' ? 'active' : ''}" data-key="intel">知略${sortKey === 'intel' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

            <button class="mobile-sort-btn ${sortKey === 'age' ? 'active' : ''}" data-key="age">年齢${sortKey === 'age' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</button>

          </div>



          <!-- 武将テーブル一覧 -->

          <div class="modal-table-scroll prov-officers-table-scroll" style="flex:1; overflow-y:auto; padding:0 20px;">

            <table class="prov-officers-table" style="width:100%; border-collapse:collapse; text-align:left; font-size:12pt;">

              <thead>

                <tr style="position:sticky; top:0; background:#261a12; border-bottom:2px solid #775533; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.5);">

                  <th class="sortable-prov-th prov-th-name" data-key="name" style="padding:10px 12px; color:var(--gold); cursor:pointer; user-select:none; width:140px;">名前 ${getSortIcon('name')}</th>

                  <th class="sortable-prov-th prov-th-role" data-key="role" style="padding:10px 12px; color:var(--gold); cursor:pointer; user-select:none; width:150px; min-width:150px; white-space:nowrap; text-align:center;">身分・役職 ${getSortIcon('role')}</th>

                  <th class="sortable-prov-th prov-th-clan" data-key="clan" style="padding:10px 12px; color:var(--gold); cursor:pointer; user-select:none; width:120px;">所属 ${getSortIcon('clan')}</th>

                  <th class="sortable-prov-th prov-th-age" data-key="age" style="padding:10px 12px; color:var(--gold); cursor:pointer; user-select:none; width:190px; min-width:190px; white-space:nowrap; text-align:center;">年齢・生没年 ${getSortIcon('age')}</th>

                  <th class="sortable-prov-th prov-th-mil" data-key="military" style="padding:10px 10px; color:var(--gold); cursor:pointer; user-select:none; width:70px; text-align:center;">武勇 ${getSortIcon('military')}</th>

                  <th class="sortable-prov-th prov-th-pol" data-key="politic" style="padding:10px 10px; color:var(--gold); cursor:pointer; user-select:none; width:70px; text-align:center;">内政 ${getSortIcon('politic')}</th>

                  <th class="sortable-prov-th prov-th-int" data-key="intel" style="padding:10px 10px; color:var(--gold); cursor:pointer; user-select:none; width:70px; text-align:center;">知略 ${getSortIcon('intel')}</th>

                  <th class="prov-th-comment" style="padding:10px 12px; color:var(--gold);">略歴・特徴</th>

                </tr>

              </thead>

              <tbody>

                ${list.length === 0 ? `

                  <tr class="prov-officers-empty-row">

                    <td colspan="8" style="text-align:center; padding:40px 20px; color:#aaa;">

                      <div style="font-size:28pt; margin-bottom:8px;">🏯</div>

                      <div style="font-size:13pt; color:#e0d8c3; font-weight:bold; margin-bottom:6px;">

                        ${provOfficers.length === 0 ? '現在、この国に滞在している武将はいません。' : '条件に合致する武将が見つかりませんでした。'}

                      </div>

                      <div style="font-size:11.5pt; color:#888;">

                        ${provOfficers.length === 0 

                          ? (isBlank ? '領主不在の空白地です。' : (isMine ? '※「城主を交代・任命」ボタンから家臣を城主に任命できます。' : '※城代と守備隊が防備にあたっています。')) 

                          : '検索条件を変更してください。'}

                      </div>

                    </td>

                  </tr>

                ` : ''}

                ${list.map((off, idx) => {

                  const isGov = off.clanId !== 'ronin' && (off.id === p.governorId || off.assignedProvId === p.id);

                  const isDaimyo = off.isDaimyo;

                  const isRonin = off.clanId === 'ronin';

                  const clanName = isRonin ? '浪人 (未仕官)' : (this.getClanDisplayName(off.clanId) || this.getClanFamilyName(off.clanId));

                  const age = this.year - (off.birthYear || 1530);

                  const comment = this.getOfficerComment(off);



                  const roleBadgeBase = 'display:inline-block; white-space:nowrap; padding:2px 8px; border-radius:3px; font-size:11pt;';

                  let roleBadge = '';

                  if (isDaimyo) {

                    roleBadge = `<span style="${roleBadgeBase} background:#b7950b; color:#fff; font-weight:bold;">👑 当主</span>`;

                  } else if (isGov) {

                    roleBadge = `<span style="${roleBadgeBase} background:#27ae60; color:#fff; font-weight:bold;">🏯 城主</span>`;

                  } else if (isRonin) {

                    roleBadge = `<span style="${roleBadgeBase} background:#7f8c8d; color:#fff;">🤝 浪人</span>`;

                  } else {

                    roleBadge = `<span style="${roleBadgeBase} background:#2980b9; color:#fff;">⚔️ 配下待機</span>`;

                  }



                  const rowBg = isDaimyo 

                    ? 'rgba(183, 149, 11, 0.12)' 

                    : (isGov ? 'rgba(39, 174, 96, 0.08)' : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.18)'));



                  return `

                    <tr class="prov-officer-table-row" data-off-id="${off.id}" style="border-bottom:1px solid #3d2d20; background:${rowBg}; cursor:pointer; transition:background 0.15s;" onmouseover="this.style.background='rgba(212,175,55,0.18)'" onmouseout="this.style.background='${rowBg}'">

                      <td class="prov-off-td-name" style="padding:10px 12px; font-weight:bold; color:#fff;">

                        <span class="prov-off-name-text">${off.name}</span>

                        ${off.isDaimyo ? ' <span style="color:var(--gold-bright); font-size:10.5pt;">★</span>' : ''}

                      </td>

                      <td class="prov-off-td-role" style="padding:10px 12px; text-align:center; white-space:nowrap;">${roleBadge}</td>

                      <td class="prov-off-td-clan" style="padding:10px 12px; color:#d5dbdb;">${clanName}</td>

                      <td class="prov-off-td-age" style="padding:10px 12px; text-align:center; color:#ccc; white-space:nowrap;">

                        <span class="prov-off-age-num">${age}歳</span>

                        <span class="prov-off-lifespan" style="font-size:10.5pt; color:#888;">(${off.birthYear != null ? formatHistoricalYear(off.birthYear) : '?'}〜${off.deathYear != null ? formatHistoricalYear(off.deathYear) : '?'})</span>

                      </td>

                      <td class="prov-off-td-mil" style="padding:10px 10px; text-align:center; font-weight:bold; color:#ff6b6b;">${off.military || 0}</td>

                      <td class="prov-off-td-pol" style="padding:10px 10px; text-align:center; font-weight:bold; color:#5dade2;">${off.politic || 0}</td>

                      <td class="prov-off-td-int" style="padding:10px 10px; text-align:center; font-weight:bold; color:#a3e4d7;">${off.intel || 0}</td>

                      <td class="prov-off-td-mobile-stats" style="display:none;">

                        <div class="prov-off-mobile-stats-line">

                          <span class="stat-badge stat-mil">⚔️武勇 <b>${off.military || 0}</b></span>

                          <span class="stat-badge stat-pol">🌾内政 <b>${off.politic || 0}</b></span>

                          <span class="stat-badge stat-int">💡知略 <b>${off.intel || 0}</b></span>

                        </div>

                      </td>

                      <td class="prov-off-td-comment" style="padding:10px 12px; font-size:11pt; color:#c8b9ab; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${comment}">

                        ${comment}

                      </td>

                    </tr>

                  `;

                }).join('')}

              </tbody>

            </table>

          </div>



          <!-- フッター -->

          <div class="modal-footer-bar prov-officers-footer-bar" style="padding:10px 20px; border-top:1px solid #5a4638; background:rgba(0,0,0,0.4); display:flex; justify-content:space-between; align-items:center;">

            <div class="modal-footer-info prov-officers-footer-info" style="font-size:11.5pt; color:#aaa;">

              💡 武将をタップすると人物列伝・能力の詳細が開きます。

            </div>

            <button id="btnProvOfficersCloseFooter" class="modal-footer-close-btn" style="background:#555; color:#fff; border:none; padding:6px 20px; border-radius:4px; cursor:pointer; font-size:11.5pt; font-weight:bold;">

              閉じる

            </button>

          </div>

        </div>

      `;



      // イベントリスナー

      modal.onclick = (e) => {

        if (e.target === modal) closeModal();

      };

      document.getElementById('closeProvOfficersModalBtn')?.addEventListener('click', closeModal);

      document.getElementById('btnProvOfficersCloseFooter')?.addEventListener('click', closeModal);



      document.getElementById('btnProvOfficersAppoint')?.addEventListener('click', () => {

        closeModal();

        this.openAppointGovernorModal(p.id);

      });



      // テーブルヘッダークリックソート

      modal.querySelectorAll('.sortable-prov-th').forEach(th => {

        th.addEventListener('click', () => {

          const key = th.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'clan' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // スマホ用ソートボタンクリック

      modal.querySelectorAll('.prov-officers-mobile-sort-bar .mobile-sort-btn').forEach(btn => {

        btn.addEventListener('click', () => {

          const key = btn.dataset.key;

          if (sortKey === key) {

            sortOrder = (sortOrder === 'asc' ? 'desc' : 'asc');

          } else {

            sortKey = key;

            sortOrder = (key === 'name' || key === 'clan' ? 'asc' : 'desc');

          }

          render();

        });

      });



      // 検索

      const searchInp = document.getElementById('inputProvOfficerSearch');

      if (searchInp) {

        const applySearch = (value) => {

          searchQuery = value;

          render();

          const newInp = document.getElementById('inputProvOfficerSearch');

          if (newInp) {

            newInp.focus();

            newInp.selectionStart = newInp.selectionEnd = newInp.value.length;

          }

        };

        searchInp.addEventListener('input', (e) => {

          if (e.isComposing || e.inputType === 'insertCompositionText') return;

          applySearch(e.target.value);

        });

        searchInp.addEventListener('compositionend', (e) => {

          applySearch(e.target.value);

        });

      }



      // 列伝表示（行クリック）

      modal.querySelectorAll('.prov-officer-table-row').forEach(row => {

        row.addEventListener('click', (e) => {

          if (e.target.closest('button')) return;

          const offId = row.dataset.offId;

          const off = (this.activeOfficers || []).find(o => o.id === offId) 

                   || (window.OFFICERS_MASTER || []).find(o => o.id === offId);

          if (off) this.showOfficerDetailModal(off);

        });

      });

    };



    render();

  },



  getCircledNumber(num) {

    const n = Math.floor(Number(num) || 0);

    if (n === 0) return '⓪';

    if (n >= 1 && n <= 20) return String.fromCharCode(0x2460 + n - 1);

    if (n >= 21 && n <= 35) return String.fromCharCode(0x3251 + n - 21);

    if (n >= 36 && n <= 50) return String.fromCharCode(0x32b1 + n - 36);

    return `(${n})`;

  },



  getGovernModeName(mode) {

    const map = {

      direct: '👑 直轄（手動指揮）',

      military: '⚔️ 軍事進攻型',

      domestic: '🌾 内政型',

      balanced: '⚖️ 均衡型',

      logistics: '🚚 兵站輸送'

    };

    return map[mode] || mode || '直轄';

  },



  // 領国の選択と詳細表示,



  selectProvince(provId) {

    // diplomacy perspective: 他勢力領をクリックしたら視点を切替

    if (this.mapHeatMode === 'diplomacy') {

      const clicked = (this.provinces || []).find(x => x.id === provId);

      if (clicked && clicked.ownerId) {

        this.mapPerspectiveClanId = clicked.ownerId;

      }

    }

    this.selectedProvId = provId;

    const p = this.provinces.find(x => x.id === provId);

    if (!p) return;



    // 自国領土の全最前面押し出し・大名カラー輪郭ハイライト・選択中タイル最前面化を実行

    this.updateMapDisplay();



    if (this.isSpectatorMode && !this._inUpdateUI) {

      this.updateUI();

    }



    const curCastle = (this.currentScenario && this.currentScenario.castles && this.currentScenario.castles[p.id]) || p.castleName || p.castle || '居城';

    const badge = document.getElementById('selectedProvBadge');

    if (badge) {

      badge.textContent = `${p.name} (${curCastle})`;

      badge.style.color = p.ownerId === this.playerClanId ? 'var(--gold-bright)' : '#e0d8c3';

    }



    const loreBtn = document.getElementById('btnMobileCastleLore');

    if (loreBtn) {

      const loreText = p.castleLore || (window.HISTORICAL_CASTLE_LORES && window.HISTORICAL_CASTLE_LORES[curCastle]);

      if (loreText) {

        loreBtn.classList.remove('is-hidden');

        loreBtn.title = `${curCastle}の解説を見る`;

      } else {

        loreBtn.classList.add('is-hidden');

      }

    }



    const isMine = p.ownerId === this.playerClanId;

    const ownerName = this.getClanDisplayName(p.ownerId);



    const detailBox = document.getElementById('provDetailBox');

    if (detailBox) {

      const isBlank = !p.ownerId;

      const provOfficers = this.getOfficersInProvince(p.id);

      const ownerAb = isBlank ? null : getClanAbility(p.ownerId);

      const abStr = ownerAb ? `武${ownerAb.military} 内${ownerAb.politics} 謀${ownerAb.stratagem}` : '';

      const effStats = this.getEffectiveStats(p.id);



      let governorBadge = '';

      if (isBlank) {

        governorBadge = `

          <div style="margin:2px 0; background:rgba(127,140,141,0.15); border:1px solid #7f8c8d; border-radius:3px; padding:3px 8px; display:flex; justify-content:space-between; align-items:center; font-size:12pt; color:#bdc3c7;">

            <span style="font-weight:bold; color:#f5eedc;">🏕️ 領主不在（国人・土豪が自治中）</span>

            <span style="font-size:11pt; color:#ffd700;">※出陣・進軍で無血領有可能</span>

          </div>

        `;

      } else if (effStats.isCapital && effStats.isDaimyo) {

        governorBadge = `

          <div style="margin:2px 0; background:rgba(212,175,55,0.12); border:1px solid #b7950b; border-radius:3px; padding:2px 6px; display:flex; justify-content:space-between; align-items:center; font-size:12pt; white-space:nowrap; overflow:hidden;">

            <div style="display:flex; align-items:center; gap:5px; overflow:hidden;">

              <span style="color:var(--gold-bright); font-weight:bold;">👑 本拠: ${effStats.name}</span>

              <span style="color:#f5eedc; font-size:12pt;" title="${this.describeLordAides(effStats)}">武<b style="color:#ff6b6b;">${effStats.military}</b>${this.lordAideMark(effStats, 'military')} 内<b style="color:#5dade2;">${effStats.politics}</b>${this.lordAideMark(effStats, 'politics')} 謀<b style="color:#a3e4d7;">${effStats.stratagem}</b>${this.lordAideMark(effStats, 'stratagem')}</span>

            </div>

            ${isMine ? `<button id="btnAppointGovernor" style="background:#b7950b; color:#fff; border:none; padding:1px 6px; border-radius:2px; cursor:pointer; font-size:12pt; font-weight:bold; white-space:nowrap;">交代</button>` : ''}

          </div>

        `;

      } else if (effStats.governor) {

        governorBadge = `

          <div style="margin:2px 0; background:rgba(39,174,96,0.12); border:1px solid #27ae60; border-radius:3px; padding:2px 6px; display:flex; justify-content:space-between; align-items:center; font-size:12pt; white-space:nowrap; overflow:hidden;">

            <div style="display:flex; align-items:center; gap:5px; overflow:hidden;">

              <span style="color:#2ecc71; font-weight:bold;">🏯 城主: ${effStats.name}</span>

              

              <span style="color:#d5dbdb; font-size:12pt;" title="${this.describeLordAides(effStats)}">武<b style="color:#ff6b6b;">${effStats.military}</b>${this.lordAideMark(effStats, 'military')} 内<b style="color:#5dade2;">${effStats.politics}</b>${this.lordAideMark(effStats, 'politics')} 謀<b style="color:#a3e4d7;">${effStats.stratagem}</b>${this.lordAideMark(effStats, 'stratagem')}</span>

            </div>

            ${isMine ? `<button id="btnAppointGovernor" style="background:#34495e; color:#fff; border:1px solid #7f8c8d; padding:1px 6px; border-radius:2px; cursor:pointer; font-size:12pt; white-space:nowrap;">交代</button>` : ''}

          </div>

        `;

      } else {

        governorBadge = `

          <div style="margin:2px 0; background:rgba(230,126,34,0.12); border:1px solid #d35400; border-radius:3px; padding:2px 6px; display:flex; justify-content:space-between; align-items:center; font-size:12pt; white-space:nowrap; overflow:hidden;">

            <div style="display:flex; align-items:center; gap:5px; overflow:hidden;">

              <span style="color:#f39c12; font-weight:bold;">🏯 ${effStats.vacantBadge || '城代統治'}</span>

              <span style="color:#f5eedc; font-size:12pt;">武<b style="color:#ff6b6b;">${effStats.military}</b> 内<b style="color:#5dade2;">${effStats.politics}</b> 謀<b style="color:#a3e4d7;">${effStats.stratagem}</b></span>

            </div>

            ${isMine ? `<button id="btnAppointGovernor" style="background:#2980b9; color:#fff; border:1px solid #5dade2; padding:1px 6px; border-radius:2px; cursor:pointer; font-size:12pt; font-weight:bold; white-space:nowrap;">任命</button>` : ''}

          </div>

        `;

      }



      try { this.clampProvinceRice?.(p); this.clampProvinceCommerce?.(p); } catch (e) {} // 表示前に上限へ（2026-10-11 bk, bl）

      detailBox.innerHTML = `

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; flex-wrap:wrap; gap:2px 6px;">

          <div style="display:flex; align-items:baseline; gap:5px; flex-wrap:wrap;">

            ${isBlank ? `

              <span style="font-size: 12pt;">状態: <strong style="color:#bdc3c7; font-size:12.5pt;">空白地</strong> <span style="font-size: 11.5pt; color:#aaa;">(領主不在・無所属)</span></span>

            ` : `

              <span style="font-size: 12pt;">領主: <strong style="color:var(--gold); font-size:12.5pt;">${ownerName}</strong> <span style="font-size: 12pt; color:#ccc;">(${this.getClanFamilyName(p.ownerId)})</span></span>

            `}

            ${abStr ? `<span style="font-size: 12pt; color:#f9e79f; font-weight:bold; background:rgba(0,0,0,0.45); padding:1px 6px; border-radius:3px; border:1px solid #7d6608; white-space:nowrap; letter-spacing:0.5px;">${abStr}</span>` : ''}

          </div>

          <button id="btnViewProvOfficers" class="btn-view-prov-officers" style="background:linear-gradient(180deg, #3d2c1d, #22160d); color:var(--gold-bright); border:1px solid #8e6d3a; border-radius:3px; padding:2px 8px; font-size:11.5pt; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 1px 3px rgba(0,0,0,0.5); white-space:nowrap; transition:all 0.15s ease;" title="${p.name}の在国武将を一覧表示">

            <span class="prov-officers-icon">👥</span><span class="prov-officers-text"> 武将</span>

            <span class="prov-officers-count" style="background:rgba(212,175,55,0.25); color:#ffd700; border-radius:8px; padding:0 5px; font-size:10.5pt; border:1px solid rgba(212,175,55,0.4);">${provOfficers.length}</span>

            <span class="prov-officers-mobile-count">${this.getCircledNumber(provOfficers.length)}</span>

          </button>

        </div>

        ${governorBadge}

        ${(() => {

          const era = (typeof getEraFlavor === 'function') ? getEraFlavor(this.year) : null;

          const troopsLbl = era ? era.troopsLabel : '駐留兵力';

          const troopsUnit = era ? era.troopsUnit : '人';

          const kokuLbl = era ? `${era.kokudakaLabel} (万石)` : '石高 (万石)';

          const kokuValUnit = '万石';

          const goldValUnit = era ? era.goldUnit : '貫';



          // 兵力上限（初期兵力 + 石高×10%）および各ステータス上限判定

          const maxTroops = Math.round(typeof this.getProvinceTroopCap === 'function' ? this.getProvinceTroopCap(p) : ((Number(p.rice) || 0) * 12 + 2500));

          const isTroopsMax = (Number(p.troops) || 0) >= maxTroops;



          const maxDefense = 100;

          const isDefenseMax = (Number(p.defense) || 0) >= maxDefense;



          const maxRice = typeof this.getProvinceRiceCap === 'function' ? this.getProvinceRiceCap(p) : 0;

          const isRiceMax = maxRice > 0 && (Number(p.rice) || 0) >= maxRice;



          const maxCommerce = typeof this.getProvinceCommerceCap === 'function' ? this.getProvinceCommerceCap(p) : 0;

          const isCommerceMax = maxCommerce > 0 && (Number(p.commerce) || 0) >= maxCommerce;



          const maxMorale = 100;

          const isMoraleMax = (Number(p.morale) || 0) >= maxMorale;



          const curOrder = p.order !== undefined ? Number(p.order) : 85;

          const isOrderMax = curOrder >= 100;



          const maxStyle = 'color:#00e676; text-shadow:0 0 6px rgba(0,230,118,0.45);';



          return `

            <div class="prov-detail-grid">

              <div class="prov-stat-row"><span>${troopsLbl}</span><span class="val${isTroopsMax ? ' is-max' : ''}" style="${isTroopsMax ? maxStyle : ''}" title="${isTroopsMax ? `扶養兵力上限に到達 (${maxTroops.toLocaleString()} ${troopsUnit})` : `扶養兵力上限: ${maxTroops.toLocaleString()} ${troopsUnit}`}">${p.troops.toLocaleString()} ${troopsUnit}</span></div>

              <div class="prov-stat-row"><span>城郭防御</span><span class="val${isDefenseMax ? ' is-max' : ''}" style="${isDefenseMax ? maxStyle : ''}" title="${isDefenseMax ? '城郭防御上限 (100)' : '防御上限: 100'}">${p.defense} / 100</span></div>

              <div class="prov-stat-row"><span>${kokuLbl}</span><span class="val${isRiceMax ? ' is-max' : ''}" style="${isRiceMax ? maxStyle : ''}" title="${isRiceMax ? `石高上限に到達 (${(maxRice / 10).toFixed(1)} ${kokuValUnit})` : (maxRice > 0 ? `石高上限: ${(maxRice / 10).toFixed(1)} ${kokuValUnit}` : '')}">${(Number(p.rice) / 10).toFixed(1)} ${kokuValUnit}</span></div>

              <div class="prov-stat-row"><span>商業 (金)</span><span class="val${isCommerceMax ? ' is-max' : ''}" style="${isCommerceMax ? maxStyle : ''}" title="${isCommerceMax ? `商業上限に到達 (${maxCommerce} ${goldValUnit})` : (maxCommerce > 0 ? `商業上限: ${maxCommerce} ${goldValUnit}` : '')}">${p.commerce} ${goldValUnit}</span></div>

              <div class="prov-stat-row"><span>軍勢士気</span><span class="val${isMoraleMax ? ' is-max' : ''}" style="${isMoraleMax ? maxStyle : ''}" title="${isMoraleMax ? '士気上限に到達 (100)' : '士気上限: 100'}">${p.morale}</span></div>

              <div class="prov-stat-row"><span>治安度</span><span class="val${isOrderMax ? ' is-max' : ''}" style="${isOrderMax ? maxStyle : ''}" title="${isOrderMax ? '治安度上限に到達 (100%)' : '治安度上限: 100%'}">${curOrder}%</span></div>

            </div>

          `;

        })()}

        ${isMine ? `

          <div class="prov-govern-policy-row" style="margin-top:2px; background:rgba(0,0,0,0.35); padding:2px 6px; border-radius:3px; border:1px solid #553e2a; display:flex; justify-content:space-between; align-items:center;">

            <span class="govern-policy-label" style="font-size: 12pt; color:var(--gold-bright); white-space:nowrap;">統治方針:</span>

            <select id="singleProvGovernSelect" style="background:#1c130d; color:#fff; border:1px solid #775533; padding:1px 4px; border-radius:3px; font-family:inherit; font-size: 12pt; height:24px;">

              <option value="direct" ${p.governance === 'direct' ? 'selected' : ''}>👑 直轄（手動指揮）</option>

              <option value="military" ${p.governance === 'military' ? 'selected' : ''}>⚔️ 軍事進攻型</option>

              <option value="domestic" ${p.governance === 'domestic' ? 'selected' : ''}>🌾 内政型</option>

              <option value="balanced" ${p.governance === 'balanced' ? 'selected' : ''}>⚖️ 均衡型</option>

              <option value="logistics" ${p.governance === 'logistics' ? 'selected' : ''}>🚚 兵站輸送</option>

            </select>

          </div>

        ` : ''}

        ${p.castleLore ? `<div class="castle-lore-box" style="margin-top:2px; font-size: 12pt; color:#c8b9ab; line-height:1.3; border-top:1px dashed #553e2a; padding-top:2px;">🏯 ${p.castleLore}</div>` : ''}

      `;



      // スマホ用委任プルダウンの同期・制御

      const mobileGovWrap = document.getElementById('mobileGovernPolicyWrap');

      const mobileGovSelect = document.getElementById('mobileProvGovernSelect');

      if (mobileGovWrap && mobileGovSelect) {

        if (isMine) {

          mobileGovWrap.classList.remove('is-hidden');

          mobileGovWrap.style.display = 'inline-flex';

          mobileGovSelect.value = p.governance || 'direct';

          mobileGovSelect.disabled = false;

          mobileGovSelect.onchange = (e) => {

            p.governance = e.target.value;

            const pcSelect = document.getElementById('singleProvGovernSelect');

            if (pcSelect) pcSelect.value = p.governance;

            this.log(`【統治方針】${p.name}の方針を「${this.getGovernModeName(p.governance)}」に変更しました。`);

            this.showOrderResult('📋 統治方針 変更', `${p.name}の方針を「${this.getGovernModeName(p.governance)}」に変更`, '#ffd700');

          };

        } else {

          mobileGovWrap.classList.add('is-hidden');

          mobileGovWrap.style.display = 'none';

        }

      }



      if (isMine) {

        document.getElementById('btnAppointGovernor')?.addEventListener('click', () => {

          this.openAppointGovernorModal(p.id);

        });

        document.getElementById('singleProvGovernSelect')?.addEventListener('change', (e) => {

          p.governance = e.target.value;

          const mobSelect = document.getElementById('mobileProvGovernSelect');

          if (mobSelect) mobSelect.value = p.governance;

          this.log(`【統治方針】${p.name}の方針を「${this.getGovernModeName(p.governance)}」に変更しました。`);

          this.showOrderResult('📋 統治方針 変更', `${p.name}の方針を「${this.getGovernModeName(p.governance)}」に変更`, '#ffd700');

        });

      }



      document.getElementById('btnViewProvOfficers')?.addEventListener('click', () => {

        this.openProvinceOfficersModal(p.id);

      });

    }



    this.updateCommandButtons();

  },



  openCastleLoreModal(provId) {

    this.pauseAutoPlayForScreen?.('城郭解説の表示');

    const p = (this.provinces || []).find(x => x.id === provId);

    if (!p) return;



    const modal = document.getElementById('castleLoreModal');

    if (!modal) return;



    const curCastle = (this.currentScenario && this.currentScenario.castles && this.currentScenario.castles[p.id]) || p.castleName || p.castle || '居城';

    const loreText = p.castleLore || (window.HISTORICAL_CASTLE_LORES && window.HISTORICAL_CASTLE_LORES[curCastle]) || `${curCastle}の城郭です。`;

    const isBlank = !p.ownerId;

    const ownerName = isBlank ? '空白地（領主不在）' : this.getClanDisplayName(p.ownerId);



    const titleEl = document.getElementById('castleLoreModalTitle');

    if (titleEl) titleEl.textContent = `城郭解説：${curCastle}`;



    const placeEl = document.getElementById('castleLoreModalPlace');

    if (placeEl) placeEl.textContent = `${p.name}国（${curCastle}）`;



    const ownerEl = document.getElementById('castleLoreModalOwner');

    if (ownerEl) {

      ownerEl.textContent = isBlank ? ownerName : `領主: ${ownerName}`;

      ownerEl.style.color = p.ownerId === this.playerClanId ? 'var(--gold-bright)' : '#e0d8c3';

    }



    const contentEl = document.getElementById('castleLoreModalContent');

    if (contentEl) {

      // [32位] 名城固有の攻城戦ギミック連動表示

      const gimmick = window.CASTLE_GIMMICKS && window.CASTLE_GIMMICKS[p.id];

      if (gimmick) {

        contentEl.innerHTML = `

          <div style="margin-bottom:10px;">${loreText}</div>

          <div style="background:linear-gradient(90deg, rgba(80,25,20,0.85), rgba(40,15,10,0.9)); border:1px solid #d4af37; border-radius:4px; padding:8px 12px; font-size:11.5pt; color:#ffd700;">

            <div style="font-weight:bold; font-size:12pt; margin-bottom:4px; display:flex; align-items:center; gap:6px;">

              <span>🏰 名城固有特性：</span><span style="color:#fff;">【${gimmick.title}】</span>

            </div>

            <div style="color:#e0d0b0; font-size:11pt; line-height:1.4;">${gimmick.desc}</div>

            <div style="margin-top:6px; font-size:10.5pt; color:#ffb74d; border-top:1px dashed #664422; padding-top:4px;">

              攻城戦補正：城郭耐久上限 +${gimmick.defenseAdd} ｜ 強襲防御倍率 +${Math.round((gimmick.assaultDefenseMult - 1) * 100)}% ｜ ${gimmick.starveResist ? '兵糧攻め耐性' : '堅城防壁'}

            </div>

          </div>

        `;

      } else {

        contentEl.textContent = loreText;

      }

    }



    const statsEl = document.getElementById('castleLoreModalStats');

    if (statsEl) {

      statsEl.innerHTML = `

        <span style="display:inline-flex; align-items:center; gap:3px;">🛡️ 城防: <strong style="color:var(--gold-bright);">${p.defense}</strong>/100</span>

        <span style="display:inline-flex; align-items:center; gap:3px;">👥 兵力: <strong style="color:#eee;">${p.troops.toLocaleString()}</strong>人</span>

        <span style="display:inline-flex; align-items:center; gap:3px;">🌾 石高: <strong style="color:#ffcc66;">${(Number(p.rice) / 10).toFixed(1)}</strong>万石</span>

        <span style="display:inline-flex; align-items:center; gap:3px;">💰 商業: <strong style="color:#ffd700;">${p.commerce}</strong>貫</span>

      `;

    }



    modal.classList.remove('hidden');

    try { this.audio.playDecision?.(); } catch (e) {}

  },



  closeCastleLoreModal() {

    const modal = document.getElementById('castleLoreModal');

    if (modal && !modal.classList.contains('hidden')) {

      modal.classList.add('hidden');

      try { this.audio.playCancel?.(); } catch (e) {}

    }

  },



  updateCommandButtons() {

    const p = this.provinces.find(x => x.id === this.selectedProvId);

    const isMine = p && p.ownerId === this.playerClanId;

    const hasAp = this.ap > 0;



    const cmdAttack = document.getElementById('cmdAttack');

    const cmdDomestic = document.getElementById('cmdDomestic');

    const cmdMilitary = document.getElementById('cmdMilitary');

    const cmdStratagem = document.getElementById('cmdStratagem');

    const cmdTransfer = document.getElementById('cmdTransfer');

    const cmdRecruit = document.getElementById('cmdRecruit');



    // ボタンのdisabled属性を解除し、常にクリックを受け付けて親切に処理・ガイドする

    [cmdAttack, cmdDomestic, cmdMilitary, cmdStratagem, cmdTransfer, cmdRecruit].forEach(btn => {

      btn?.removeAttribute('disabled');

    });



    if (cmdAttack) {

      const canAttack = isMine ? (p.neighbors || []).some(nId => {

        const n = this.provinces.find(x => x.id === nId);

        return n && n.ownerId !== this.playerClanId;

      }) && p.troops >= 1000 && this.rice >= 80 : true;

      cmdAttack.style.opacity = (canAttack && hasAp) ? '1' : '0.75';

    }



    if (cmdDomestic) {

      cmdDomestic.style.opacity = (this.gold >= 40 && hasAp) ? '1' : '0.75';

    }



    if (cmdMilitary) {

      const sel = this.provinces.find(x => x.id === this.selectedProvId);

      const needGold = sel && sel.ownerId === this.playerClanId ? this.getMilitaryGoldCost(sel) : 50;

      cmdMilitary.style.opacity = (this.gold >= needGold && hasAp) ? '1' : '0.75';

    }



    if (cmdStratagem) {

      cmdStratagem.style.opacity = (this.gold >= 40 && hasAp) ? '1' : '0.75';

    }



    if (cmdTransfer) {

      cmdTransfer.style.opacity = (isMine && p.troops >= 1000 && hasAp) ? '1' : '0.75';

    }



    if (cmdRecruit) {

      cmdRecruit.style.opacity = (this.gold >= 40 && hasAp) ? '1' : '0.75';

    }

  },



  // ============================================================================

  // 領国一括委任モーダル

  // ============================================================================,



  openGovernModal() {

    this.pauseAutoPlayForScreen?.('統治方針画面の表示');

    const modal = document.getElementById('governModal');

    if (!modal) return;

    this.renderGovernTable();

    modal.classList.remove('hidden');

    this.audio.playHyoshigi();

  },



  renderGovernTable() {

    const tbody = document.getElementById('governProvTableBody');

    if (!tbody) return;

    tbody.innerHTML = '';



    const myProvs = this.provinces.filter(p => p.ownerId === this.playerClanId);

    myProvs.forEach(p => {

      const isFrontier = this.isProvinceFrontier(p);

      const tr = document.createElement('tr');

      tr.className = 'govern-prov-row';

      tr.style.borderBottom = '1px solid #3a2a1a';



      tr.innerHTML = `

        <td class="gov-td-check" style="padding:6px 10px;"><input type="checkbox" class="govern-select-cb" data-prov-id="${p.id}" style="accent-color:var(--gold);"></td>

        <td class="gov-td-name" style="padding:6px 10px; font-weight:bold; color:#fff;">${p.name} <span class="gov-castle-name" style="font-size: 12pt; color:#aaa;">(${p.castleName || p.castle || "居城"})</span></td>

        <td class="gov-td-pos" style="padding:6px 10px;">${isFrontier ? '<span class="gov-pos-badge frontier" style="color:#ff8888;">前線</span>' : '<span class="gov-pos-badge rear" style="color:#a9dfbf;">後方</span>'}</td>

        <td class="gov-td-troops" style="padding:6px 10px; color:#ffaaaa;">${p.troops.toLocaleString()} 人</td>

        <td class="gov-td-eco" style="padding:6px 10px; color:#ffd700;">${(Number(p.rice) / 10).toFixed(1)}万石 / ${p.commerce}貫</td>

        <td class="gov-td-select" style="padding:6px 10px;">

          <select class="govern-row-select" data-prov-id="${p.id}" style="background:#1a110a; color:#fff; border:1px solid #664422; padding:3px 6px; border-radius:3px; font-size: 12pt;">

            <option value="direct" ${p.governance === 'direct' ? 'selected' : ''}>👑 直轄</option>

            <option value="military" ${p.governance === 'military' ? 'selected' : ''}>⚔️ 軍事進攻型（自動攻略）</option>

            <option value="domestic" ${p.governance === 'domestic' ? 'selected' : ''}>🌾 内政型</option>

            <option value="balanced" ${p.governance === 'balanced' ? 'selected' : ''}>⚖️ 均衡型</option>

            <option value="logistics" ${p.governance === 'logistics' ? 'selected' : ''}>🚚 兵站輸送</option>

          </select>

        </td>

      `;



      tr.querySelector('.govern-row-select')?.addEventListener('change', (e) => {

        p.governance = e.target.value;

      });



      tbody.appendChild(tr);

    });

  },



  openTransferModal() {

    this.pauseAutoPlayForScreen?.('兵輸送画面の表示');

    let p = this.provinces.find(x => x.id === this.selectedProvId);



    // 1. 自領でない、または選択なしの場合は自領で兵力のある領国を自動探索

    if (!p || p.ownerId !== this.playerClanId) {

      const myProvs = this.provinces.filter(x => x.ownerId === this.playerClanId && x.troops >= 600);

      if (myProvs.length > 0) {

        p = myProvs[0];

        this.selectProvince(p.id);

      } else {

        this.showOrderResult('⚠ 移動不可', '前線兵力移動を行える自領がありません。自領の駐留兵力を確認してください（城の守備兵力最低500人が必要）。', '#e74c3c');

        return;

      }

    }



    // 2. 移動元兵力チェック（防衛最低500人 + 移動最低100人 = 600人必要）

    if (p.troops < 600) {

      this.showOrderResult('⚠ 兵力不足', `${p.name}の駐留兵力は${p.troops.toLocaleString()}人です。城の最低防衛兵力(500人)を保つため、兵力600人以上が必要です。`, '#e74c3c');

      return;

    }



    // 3. 隣接する味方領国の確認

    const friendlyNeighbors = (p.neighbors || [])

      .map(nId => this.provinces.find(x => x.id === nId))

      .filter(x => x && x.ownerId === this.playerClanId);



    if (friendlyNeighbors.length === 0) {

      this.showOrderResult('⚠ 移動先なし', `${p.name}に隣接する味方領国がありません。前線兵力移動は隣接する領国間のみ可能です。`, '#e74c3c');

      return;

    }



    const modal = document.getElementById('transferModal');

    const srcName = document.getElementById('transferSrcName');

    const maxTroops = document.getElementById('transferMaxTroops');

    const dstSelect = document.getElementById('transferDstSelect');

    const range = document.getElementById('transferTroopRange');

    const countLabel = document.getElementById('transferTroopCount');

    const remainLabel = document.getElementById('transferRemainTroops');

    const confirmBtn = document.getElementById('transferConfirmBtn');



    if (!modal || !dstSelect || !range) return;



    srcName.textContent = `${p.name} (${p.castleName || p.castle || "居城"})`;

    maxTroops.textContent = p.troops.toLocaleString();



    dstSelect.innerHTML = '';

    friendlyNeighbors.forEach(target => {

      const opt = document.createElement('option');

      opt.value = target.id;

      opt.textContent = `${target.name} (${target.castleName || target.castle || "居城"} / 現駐留: ${target.troops.toLocaleString()}人)`;

      dstSelect.appendChild(opt);

    });



    const maxTransfer = Math.max(0, p.troops - 500);

    range.min = 100;

    range.max = maxTransfer;

    range.step = 50;

    range.value = Math.min(1000, maxTransfer);



    const updateLabels = () => {

      const val = parseInt(range.value, 10) || 0;

      countLabel.textContent = val.toLocaleString();

      remainLabel.textContent = (p.troops - val).toLocaleString();

      if (confirmBtn) {

        confirmBtn.disabled = (val <= 0 || val > maxTransfer || !dstSelect.value);

        confirmBtn.style.opacity = confirmBtn.disabled ? '0.45' : '1';

        confirmBtn.style.cursor = confirmBtn.disabled ? 'not-allowed' : 'pointer';

      }

    };



    range.oninput = updateLabels;

    dstSelect.onchange = updateLabels;

    updateLabels();



    modal.classList.remove('hidden');

    this.audio.playHyoshigi();

  },



  openDeployModal() {

    this.pauseAutoPlayForScreen?.('出陣画面の表示');

    let p = this.provinces.find(x => x.id === this.selectedProvId);

    let target = null;



    if (p && p.ownerId !== this.playerClanId) {

      // 同盟国への攻撃を禁止

      if (this.isAllied(this.playerClanId, p.ownerId)) {

        this.showOrderResult('⚠ 同盟関係', `${p.name}を領有する${this.getClanFamilyName(p.ownerId)}とは同盟関係にあります。同盟国を攻撃することはできません。`, '#e67e22');

        return;

      }

      // 家中分裂の停戦中は独立した家を攻められない（2026-10-11 cf）

      if (this.isTruceBlocked?.(this.playerClanId, p.ownerId)) {

        this.showOrderResult('⚠ 停戦中', `${this.getClanFamilyName(p.ownerId)}とは家中分裂の停戦中です（残り${this.breakawayTruceLeft(this.playerClanId, p.ownerId)}季）。まだ攻めることはできません。`, '#e67e22');

        return;

      }

      // 敵国を選択中に出陣を押した場合：その敵国に隣接する自国領土（兵力1000以上）を探索

      target = p;

      const friendlyNeighbors = (p.neighbors || [])

        .map(nId => this.provinces.find(x => x.id === nId))

        .filter(x => x && x.ownerId === this.playerClanId && x.troops >= 1000);

      if (friendlyNeighbors.length === 0) {

        this.showOrderResult('⚠ 出陣不可', `${target.name}に隣接する貴家の領国で出陣可能な兵力(1,000人以上)を持つ城がありません。`, '#e74c3c');

        return;

      }

      p = friendlyNeighbors.sort((a, b) => b.troops - a.troops)[0];

      this.selectedProvId = p.id;

    } else {

      if (!p || p.ownerId !== this.playerClanId) {

        const myProvs = this.provinces.filter(x => x.ownerId === this.playerClanId && x.troops >= 1000);

        if (myProvs.length > 0) {

          p = myProvs[0];

          this.selectProvince(p.id);

        }

      }

      if (!p || p.troops < 1000) {

        this.showOrderResult('⚠ 出陣不可', '出陣には駐留兵力1,000人以上が必要です。自国領国を選択してください。', '#e74c3c');

        return;

      }

    }



    const modal = document.getElementById('deployModal');

    const srcName = document.getElementById('deploySrcName');

    const maxTroops = document.getElementById('deployMaxTroops');

    const dstSelect = document.getElementById('deployDstSelect');

    const range = document.getElementById('deployTroopRange');

    const countLabel = document.getElementById('deployTroopCount');

    const remainLabel = document.getElementById('deployRemainTroops');

    const riceCostLabel = document.getElementById('deployRiceCost');



    if (!modal || !dstSelect || !range) return;



    srcName.textContent = `${p.name} (${p.castleName || p.castle || "居城"})`;

    maxTroops.textContent = p.troops.toLocaleString();



    dstSelect.innerHTML = '';

    (p.neighbors || []).forEach(nId => {

      const neighbor = this.provinces.find(x => x.id === nId);

      // 同盟国を攻撃対象から除外

      if (neighbor && neighbor.ownerId !== this.playerClanId && !this.isAllied(this.playerClanId, neighbor.ownerId) && !this.isTruceBlocked?.(this.playerClanId, neighbor.ownerId)) { // 停戦も除外（2026-10-11 cf）

        const isTargetBlank = !neighbor.ownerId;

        const opt = document.createElement('option');

        opt.value = neighbor.id;

        if (isTargetBlank) {

          opt.textContent = `【空白地】${neighbor.name} (${neighbor.castleName || neighbor.castle || "城"} / 土豪兵: ${neighbor.troops.toLocaleString()}人 / ⚔️無血進駐可能)`;

        } else {

          opt.textContent = `${neighbor.name} (${neighbor.castleName || neighbor.castle || "居城"} / 敵兵: ${neighbor.troops.toLocaleString()}人 / 城防: ${neighbor.defense})`;

        }

        if (target && neighbor.id === target.id) {

          opt.selected = true;

        }

        dstSelect.appendChild(opt);

      }

    });



    if (dstSelect.options.length === 0) {

      this.showOrderResult('⚠ 出陣不可', `${p.name}に隣接する敵国がありません（同盟国または自国領）。前線の領国を選択してください。`, '#e74c3c');

      return;

    }



    const maxDeploy = Math.max(500, p.troops - 500);

    range.min = 500;

    range.max = maxDeploy;

    range.value = Math.min(3000, maxDeploy);



    const updateLabels = () => {

      const val = parseInt(range.value, 10) || 500;

      const riceCost = Math.round(val * 0.08);

      countLabel.textContent = val.toLocaleString();

      remainLabel.textContent = (p.troops - val).toLocaleString();

      riceCostLabel.textContent = riceCost.toLocaleString();

      this.refreshDeploySiegeOdds(p, val);

    };



    range.oninput = updateLabels;

    updateLabels();



    this._deployPredictedEnemyForm = null;

    this._deployPredictedFor = null;

    this.refreshDeployFormationIntel();

    dstSelect.onchange = () => {

      this._deployPredictedEnemyForm = null;

      this._deployPredictedFor = null;

      this.refreshDeployFormationIntel();

      this.refreshDeploySiegeOdds(p, parseInt(range.value, 10) || 500);

    };



    modal.classList.remove('hidden');

    try { this.audio.playHoragai?.(); } catch(e) {}

  },



  // 項目27（2026-10-11 az）出陣画面：攻城の推定落城率（野戦後の目安。兵は野戦で約15%減る想定、城兵は国の兵換算）

  refreshDeploySiegeOdds(src, troopCount) {

    const dstSelect = document.getElementById('deployDstSelect');

    const target = (this.provinces || []).find(x => x.id === dstSelect?.value);

    let box = document.getElementById('deploySiegeOdds');

    const anchor = document.getElementById('formationIntelBox');

    if (!box && anchor && anchor.parentNode && typeof document.createElement === 'function') {

      box = document.createElement('div');

      box.id = 'deploySiegeOdds';

      box.style.cssText = 'margin-top:6px; font-size:11.5pt; color:#ffe9a8; background:rgba(90,30,20,0.35); border:1px solid #a64b2a; border-radius:4px; padding:6px 8px;';

      anchor.parentNode.insertBefore(box, anchor.nextSibling);

    }

    if (!box) return;

    if (!src || !target || !target.ownerId) { box.innerHTML = target && !target.ownerId ? '🏕️ 空白地：攻城なしで進駐できます。' : ''; return; }

    const odds = this.computeSiegeOdds({ attackerClanId: this.playerClanId, srcProv: src, dstProv: target, attackTroops: Math.round((Number(troopCount) || 0) * 0.85), defenders: Number(target.troops) || 0, atkMorale: 90 });

    const col = odds.pct >= 70 ? '#2ecc71' : (odds.pct >= 45 ? '#f1c40f' : '#e74c3c');

    box.innerHTML = `🏯 攻城の推定落城率（野戦勝利後の目安）: <strong style="color:${col}; font-size:12.5pt;">${odds.pct}%</strong><br><span style="font-size:10.5pt; color:#e8d9b0;">${this.describeSiegeOdds(odds, 5)}</span>`;

  },



  startEndingRoll(isShogunRoute = false) {

    if (this.isShogunEndingAllowed && !this.isShogunEndingAllowed()) {

      isShogunRoute = false;

    }

    const rollModal = document.getElementById('endingRollModal');

    if (!rollModal) return;



    // オーケストラBGM演奏開始！

    this.music.playTrack('victory');

    triggerCelebrationConfetti();



    // 桜吹雪Canvasアニメーション開始

    this.initEndingSakura();



    // 背景に大名の家紋透かしを設定

    const kamonContainer = document.getElementById('endingKamonBackdrop');

    if (kamonContainer && this.playerClanId) {

      kamonContainer.innerHTML = `

        <svg viewBox="0 0 100 100" style="width:100%; height:100%; filter: drop-shadow(0 0 20px rgba(255,215,0,0.4));">

          <use href="#${this.getClanKamonId ? this.getClanKamonId(this.playerClanId) : `kamon-${this.playerClanId}`}"></use>

        </svg>

      `;

    }



    // エンドロールのコンテンツ生成

    // 統一した時点の当主・家名を使う（家督相続後の当主、改めた家名）（ui_fixed12）

    const uniHead = this.syncPlayerHeadAtUnification ? this.syncPlayerHeadAtUnification() : { clanName: this.playerDaimyo?.clan || '武家', daimyoName: this.playerDaimyo?.name || '当主', headChanged: false };

    const headChanged = uniHead.headChanged;

    const clanName = uniHead.clanName;

    const daimyoName = uniHead.daimyoName;

    const myProvs = this.provinces.filter(p => p.ownerId === this.playerClanId);

    const scenYear = this.getScenarioYear ? this.getScenarioYear() : Number(this.year || 1560);

    const isShogun = isShogunRoute && (!this.isShogunEndingAllowed || this.isShogunEndingAllowed());



    const defaultRegime = isShogun

      ? `${clanName}幕府・天下泰平の新体制`

      : (scenYear >= 1868 ? `${clanName}新政府・近代国家の新体制` : `${clanName}政権・天下泰平の新体制`);



    // 当主が開始時から代わっていれば、開始時の当主を前提にした家別エピローグは使わない（ui_fixed12）

    const ep = (!headChanged && DAIMYO_EPILOGUES[this.playerClanId]) || {

      regime: defaultRegime,

      capital: `${daimyoName}公の居城（京洛ならびに天下の要衝）`,

      pillar1: scenYear <= 801

        ? '大いなる和の規範を敷き、私闘を禁じ民百姓が安心して暮らせる法と秩序を整えた。'

        : (scenYear >= 1868 ? '四民平等の原則を貫き、国民の権利を守り法の下の公正な統治を確立した。' : '万民の生業を安堵し、武力による横暴を厳禁とする徳政令と武家諸法度を敷いた。'),

      pillar2: scenYear >= 1868

        ? '近代産業の振興と交通網の整備を全国で推進し、国力富強の礎を築いた。'

        : '新田開拓と街道・河川の整備を全国で推進し、飢饉なき豊かな国づくりを成し遂げた。',

      pillar3: '諸大名との和睦と公正な統治を確立し、百余年にわたる乱世の争乱を永遠に終焉させた。',

      future10: '【統一後十年：礎の時代】天下普請と新法度の敷設。荒廃した山河が蘇り、民百姓の安穏な耕作が戻った。',

      future50: '【統一後五十年：文化と産業の開花】二代・三代へと政権が継承され、街道と港湾が結ばれ空前の好景気を迎えた。',

      future100: '【統一後百年〜近代へ：悠久の泰平】百年の平和が人々の心を潤し、夜も戸を鎖さぬ世界無比の平和国家が完成した。',

      historianQuote: '『乱世の塗炭の苦しみから人々を救い出し、永遠の泰平を築いたその英名は、未来永劫語り継がれるであろう』'

    };



    const totalProvs = this.provinces?.length || (window.PROVINCES_DATA ? window.PROVINCES_DATA.length : 77);

    const kanjiProvs = (typeof toKanjiNumber === 'function') ? toKanjiNumber(totalProvs) : `${totalProvs}`;

    const titlePrefix = isShogun ? '朝廷勅許・征夷大将軍就任' : `日本全${kanjiProvs}州（全${totalProvs}国）完全平定`;

    const titleMain = isShogun ? `${clanName}幕府 開府創世録` : '天下統一・不滅の大覇業録';



    // 天下静謐の大綱（泰平の法制・仁政）

    let peaceEdicts;

    if (scenYear <= 801) {

      peaceEdicts = [

        { title: '大和建国・万民安撫', desc: '戦乱の荒波を鎮め、すべての民が安らかに暮らせる大いなる和の国を確立。' },

        { title: '官道整備・交易振興', desc: '諸国を結ぶ官道を拓き、各地の物産と文化の交流を促して国力を高める。' },

        { title: '律令遵法・公正の治', desc: '私利私闘を排し、公平無私の規範と信義に基づく大いなる政道を敷く。' },

        { title: '治水開拓・美田創出', desc: '大河の治水と新田の開発を推し進め、飢饉なき豊かな実りある国土を築く。' }

      ];

    } else if (scenYear >= 1868) {

      peaceEdicts = [

        { title: '四民平等・万民安堵', desc: '旧来の身分制を排し、すべての民が誇りと活力を発揮できる近代国家を確立。' },

        { title: '殖産興業・文明開化', desc: '近代産業と交通・通信網を全国に張り巡らせ、世界の列強に伍する富国を推進。' },

        { title: '立憲法治・信義の天下', desc: '法の下の平等を定め、国民の信義と公正に基づく近代立憲政治の基礎を築く。' },

        { title: '四海静謐・治水開拓', desc: '国土の保全と近代土木技術による開墾を進め、万民が安穏に暮らせる社会を実現。' }

      ];

    } else {

      peaceEdicts = [

        { title: '兵農分離・万民安堵', desc: '武士は武と徳を修めて治安を護り、農民は耕作に専念する盤石の秩序を確立。' },

        { title: '五街道整備・楽市楽座', desc: '関所を撤廃し諸国の交易を奨励。街道と宿場町が賑わい、豊かな文化が花開く。' },

        { title: '武家諸法度・信義の天下', desc: '私闘や横暴を厳禁とし、公明正大なる法治と信義に基づく泰平の政道を敷く。' },

        { title: '四海静謐・治水開墾', desc: '大河川の治水と新田開発を全国で推進し、飢饉なき豊かな美田を後世へ遺す。' }

      ];

    }



    const edictsHtml = peaceEdicts.map(e => `

      <div style="background:rgba(212,175,55,0.08); border:1px solid #775533; border-radius:6px; padding:14px 18px; text-align:left;">

        <div style="font-size:12.5pt; color:#ffd700; font-weight:bold; margin-bottom:6px;">❖ ${e.title}</div>

        <div style="font-size: 12pt; color:#e0d8c3; line-height:1.7;">${e.desc}</div>

      </div>

    `).join('');



    const contentEl = document.getElementById('endingRollContent');

    if (contentEl) {

      contentEl.innerHTML = `

        <!-- 題字 -->

        <div style="margin-bottom: 70px;">

          <div style="font-size: 14pt; color: #d4af37; letter-spacing: 8px; margin-bottom: 12px;">❖ ${titlePrefix} ❖</div>

          <div style="font-size: 32pt; font-weight: bold; color: #fff; text-shadow: 0 0 30px rgba(255,215,0,0.9); letter-spacing: 6px; margin-bottom: 16px;">

            ${titleMain}

          </div>

          <div style="font-size: 22pt; color: #ffd700; font-weight: bold;">

            ${isShogun ? `初代征夷大将軍 ${daimyoName}` : `天下統一覇者 ${daimyoName}`}

          </div>

          <div style="font-size: 13pt; color: #aaa; margin-top: 8px;">

            ${clanName} ${isShogun ? '宗家' : ''}

          </div>

        </div>



        <!-- 第一幕：大平定の記録 -->

        <div style="margin-bottom: 80px; padding: 24px; border-top: 1px solid #664422; border-bottom: 1px solid #664422; background: rgba(0,0,0,0.4); border-radius: 8px;">

          <div style="font-size: 15pt; color: #ffd700; font-weight: bold; margin-bottom: 14px; letter-spacing: 4px;">

            【第一幕：天下統一の軌跡】

          </div>

          <p style="font-size: 12.5pt; color: #eee; max-width: 680px; margin: 0 auto 16px auto; line-height: 2.2; text-indent: 1.5em;">

            時に${window.formatYearWithEra ? window.formatYearWithEra(this.year) : (this.year < 0 ? '紀元前' + Math.abs(this.year) : '西暦' + this.year)}年 ${this.seasonNames[this.seasonIdx]}。百余年にわたり幾多の英傑が夢見ながらも果たすことの叶わなかった天下静謐の誓いが、ここに結実せり。

            北の蝦夷松前から南の薩摩大隅に至るまで、戦禍の煙はことごとく消え去り、日の本全土に満開の桜と民の歓喜が満ち溢れた。

          </p>

          <div style="font-size: 12pt; color: #ffdd88; margin-top: 10px;">

            激闘戦歴: ${this.stats.battlesWon}勝 (${this.stats.battlesFought}戦) ｜ 領有州国: ${myProvs.length}州 ｜ 軍勢総員: ${myProvs.reduce((acc, p) => acc + p.troops, 0).toLocaleString()}名

          </div>

        </div>



        <!-- 第二幕：幕府施政大綱 -->

        <div style="margin-bottom: 90px;">

          <div style="font-size: 15pt; color: #ffd700; font-weight: bold; margin-bottom: 16px; letter-spacing: 4px;">

            【第二幕：${isShogun ? '武門棟梁・新政の柱石' : '天下統一・新政の柱石'}】

          </div>

          <div style="font-size: 18pt; color: #fff; font-weight: bold; margin-bottom: 8px;">

            ${ep.regime}

          </div>

          <div style="font-size: 12pt; color: #bbb; margin-bottom: 24px;">

            政庁本拠：${ep.capital}

          </div>

          <div style="max-width: 700px; margin: 0 auto; text-align: left; background: rgba(212,175,55,0.06); border: 1px solid #775533; border-radius: 8px; padding: 20px 28px; line-height: 2.2;">

            <div style="margin-bottom: 12px;"><strong style="color:#ffd700;">一、法治と道義：</strong> ${ep.pillar1}</div>

            <div style="margin-bottom: 12px;"><strong style="color:#ffd700;">一、産業と民生：</strong> ${ep.pillar2}</div>

            <div><strong style="color:#ffd700;">一、秩序と泰平：</strong> ${ep.pillar3}</div>

          </div>

        </div>



        <!-- 第三幕：その後の幕府と日本の歴史（百年の変遷）★最重要 -->

        <div style="margin-bottom: 100px; padding: 30px 20px; border-top: 2px solid #ffd700; border-bottom: 2px solid #ffd700; background: radial-gradient(circle, rgba(40,20,10,0.6) 0%, rgba(0,0,0,0.85) 100%); border-radius: 8px;">

          <div style="font-size: 18pt; color: #ffd700; font-weight: bold; margin-bottom: 20px; letter-spacing: 6px; text-shadow: 0 0 15px rgba(255,215,0,0.7);">

            【第三幕：この${isShogun ? '幕府' : (scenYear >= 1868 ? '新政府' : '政権')}が紡いだ「その後の日本」】

          </div>

          <div style="font-size: 13pt; color: #dcd0c0; margin-bottom: 30px; font-style: italic;">

            〜 乱世を越えて、時代はどのように受け継がれたのか 〜

          </div>



          <div style="max-width: 720px; margin: 0 auto; text-align: left; line-height: 2.3; font-size: 12pt;">

            <div style="margin-bottom: 28px; background: rgba(0,0,0,0.4); padding: 16px 20px; border-left: 4px solid #ffd700; border-radius: 0 6px 6px 0;">

              <div style="font-size: 13pt; color: #ffd700; font-weight: bold; margin-bottom: 6px;">

                ❖ 統一後十年【礎の時代】

              </div>

              <div style="color: #f7f1e3; text-indent: 1em;">

                ${ep.future10}

              </div>

            </div>



            <div style="margin-bottom: 28px; background: rgba(0,0,0,0.4); padding: 16px 20px; border-left: 4px solid #e67e22; border-radius: 0 6px 6px 0;">

              <div style="font-size: 13pt; color: #ffaa55; font-weight: bold; margin-bottom: 6px;">

                ❖ 統一後五十年【黄金期と文化の爛熟】

              </div>

              <div style="color: #f7f1e3; text-indent: 1em;">

                ${ep.future50}

              </div>

            </div>



            <div style="margin-bottom: 28px; background: rgba(0,0,0,0.4); padding: 16px 20px; border-left: 4px solid #2ecc71; border-radius: 0 6px 6px 0;">

              <div style="font-size: 13pt; color: #a9dfbf; font-weight: bold; margin-bottom: 6px;">

                ❖ 統一後百年〜近代へ【悠久の泰平と世界への飛躍】

              </div>

              <div style="color: #f7f1e3; text-indent: 1em;">

                ${ep.future100}

              </div>

            </div>



            <div style="margin-top: 36px; padding: 20px 24px; border: 1px dashed #ffd700; border-radius: 8px; background: rgba(255,215,0,0.05); text-align: center;">

              <div style="font-size: 12pt; color: #aaa; margin-bottom: 6px;">後世の歴史家が記す言葉</div>

              <div style="font-size: 13pt; color: #ffd700; font-style: italic; line-height: 2.1;">

                ${ep.historianQuote}

              </div>

            </div>

          </div>

        </div>



        <!-- 第四幕：天下静謐の誓い・諸国万民の安堵 -->

        <div style="margin-bottom: 90px;">

          <div style="font-size: 15pt; color: #ffd700; font-weight: bold; margin-bottom: 20px; letter-spacing: 4px;">

            【第四幕：天下静謐の誓い・諸国万民の安堵】

          </div>

          <p style="font-size: 12pt; color: #eee; max-width: 680px; margin: 0 auto 24px auto; line-height: 2.2;">

            百余年に及ぶ争乱の火はことごとく消え去り、日の本全土に真の静謐が訪れり。<br>

            刀を鍬に持ち替え美田を拓く民の歓喜が山河を満たし、<br>

            貴家の敷きし仁政と大義は、未来永劫にわたり泰平を護る礎となった。

          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; max-width: 760px; margin: 0 auto; text-align: center;">

            ${edictsHtml}

          </div>

        </div>



        <!-- 終幕：悠久の祈りとフィナーレ -->

        <div style="margin-top: 100px; margin-bottom: 120px;">

          <div style="font-size: 20pt; color: #ffd700; font-style: italic; letter-spacing: 4px; line-height: 2.4; margin-bottom: 30px;">

            「もののふの 捧げし至誠は 豊秋の実りとなり<br>

            民の笑顔は 悠久の泰平の光となる」

          </div>



          <div style="font-size: 34pt; font-weight: bold; color: #fff; letter-spacing: 12px; margin: 40px 0; text-shadow: 0 0 40px rgba(255,215,0,1);">

            完

          </div>



          <div style="font-size: 14pt; color: #d4af37; letter-spacing: 6px; margin-bottom: 40px;">

            〜 天下泰平 ・ 日の本の黎明 〜

          </div>



          <button id="endingCloseFinalBtn" class="ending-close-btn" style="padding: 12px 36px; font-size: 14pt; font-weight: bold; background: linear-gradient(180deg, #ffd700 0%, #b8860b 100%); color: #111; border: 2px solid #fff; border-radius: 30px; cursor: pointer; box-shadow: 0 0 30px rgba(255,215,0,0.8); font-family: inherit; white-space: nowrap;">

            <span class="btn-label-full">❖ 統一の記録・詳細へ進む ❖</span>

            <span class="btn-label-short">❖ 統一記録へ ❖</span>

          </button>

        </div>

      `;



      document.getElementById('endingCloseFinalBtn')?.addEventListener('click', () => {

        this.closeEndingRoll();

      });

    }



    // 表示開始

    rollModal.classList.remove('hidden');



    // スクロール開始

    this.startEndingScroll();

  },



  startEndingScroll() {

    const container = document.getElementById('endingRollContainer');

    if (!container) return;



    this.endingScrollSpeed = 0.75; // 基本速度 (px/frame)

    this.endingIsPaused = false;

    container.scrollTop = 0;



    const scrollLoop = () => {

      if (document.getElementById('endingRollModal')?.classList.contains('hidden')) return;



      if (!this.endingIsPaused && container) {

        container.scrollTop += this.endingScrollSpeed;

      }



      this._rollAnimId = requestAnimationFrame(scrollLoop);

    };



    if (this._rollAnimId) cancelAnimationFrame(this._rollAnimId);

    this._rollAnimId = requestAnimationFrame(scrollLoop);



    // コントロールボタンのイベント

    const pauseBtn = document.getElementById('endingPauseBtn');

    if (pauseBtn) {

      pauseBtn.onclick = () => {

        this.endingIsPaused = !this.endingIsPaused;

        pauseBtn.textContent = this.endingIsPaused ? '▶ 再開' : '⏸ 一時停止';

      };

    }



    const speedBtn = document.getElementById('endingSpeedBtn');

    if (speedBtn) {

      speedBtn.onclick = () => {

        if (this.endingScrollSpeed <= 0.8) {

          this.endingScrollSpeed = 1.6;

          speedBtn.textContent = '⏩ 速度: 2.0x';

        } else if (this.endingScrollSpeed <= 1.8) {

          this.endingScrollSpeed = 3.2;

          speedBtn.textContent = '⏩ 速度: 4.0x';

        } else {

          this.endingScrollSpeed = 0.75;

          speedBtn.textContent = '⏩ 速度: 1.0x';

        }

      };

    }



    const skipBtn = document.getElementById('endingSkipBtn');

    if (skipBtn) {

      skipBtn.onclick = () => this.closeEndingRoll();

    }

  },



  updateDiffBadge() {

    const badge = document.getElementById('diffBadgeDisplay');

    if (!badge) return;

    const diff = this.currentDifficulty || 'normal';

    const config = {

      easy:   { text: '【初級】', color: '#2ecc71', border: '#27ae60', bg: 'rgba(46,204,113,0.25)' },

      normal: { text: '【中級】', color: '#f39c12', border: '#d68910', bg: 'rgba(243,156,18,0.25)' },

      hard:   { text: '【上級】', color: '#e67e22', border: '#d35400', bg: 'rgba(230,126,34,0.25)' },

      hell:   { text: '【超級】', color: '#ff6666', border: '#aa3333', bg: 'rgba(100,20,20,0.4)' }

    };

    const c = config[diff] || config.normal;

    badge.textContent = c.text;

    badge.style.color = c.color;

    badge.style.borderColor = c.border;

    badge.style.background = c.bg;

  },



  // ============================================================================

  // ヘッダー・ステータス更新

  // ============================================================================,



  // 観戦モード時のヘッダーボタン表示制御（一行増やさず「見守り」と「停止・途中参加」を相互切替）

  updateSpectatorHeaderUI() {

    const isSpectator = !!this.isSpectatorMode;

    document.body.classList.toggle('spectator-mode', isSpectator);



    const toggleBtn = document.getElementById('spectatorToggleBtn');

    const pauseBtn = document.getElementById('spectatorAutoPlayPauseBtn');

    const joinBtn = document.getElementById('spectatorSelectDaimyoBtn');

    const banner = document.getElementById('spectatorBanner');



    // 観戦バナーの一行表示は行わず常に非表示

    if (banner) banner.style.display = 'none';



    if (toggleBtn) {

      toggleBtn.classList.toggle('hidden', isSpectator);

    }

    if (pauseBtn) {

      pauseBtn.classList.toggle('hidden', !isSpectator);

    }

    if (joinBtn) {

      joinBtn.classList.toggle('hidden', !isSpectator);

    }

  },



  updateStatusHeader() {

    this.updateDiffBadge();

    this.updateSpectatorHeaderUI();

    const seasonDisp = document.getElementById('seasonDisplay');

    if (seasonDisp) {

      seasonDisp.innerHTML = `<i data-lucide="calendar" style="width:16px; height:16px;"></i><span class="season-year-text">${(typeof window.formatYearWithEraHtml === 'function' ? window.formatYearWithEraHtml(this.year) : formatHistoricalYear(this.year))}年 ${this.seasonNames[this.seasonIdx]}</span>`;

      if (window.lucide) lucide.createIcons();

    }



    const weatherDisp = document.getElementById('weatherDisplay');

    if (weatherDisp) {

      // [23位] 天候アイコンとツールチップ解説

      const weatherIcons = {

        '晴天': '☀️',

        '曇天': '☁️',

        '恵みの雨': '🌧️',

        '豪雨': '⛈️',

        '大雪': '🌨️',

        '吹雪': '❄️'

      };

      const wIcon = weatherIcons[this.currentWeather] || '🌤️';

      weatherDisp.innerHTML = `${wIcon} ${this.currentWeather}`;



      const wEffect = (window.WEATHER_EFFECTS && window.WEATHER_EFFECTS[this.currentWeather]) || {

        gunPowerMult: 1.0,

        chargePowerMult: 1.0,

        marchRiceMult: 1.0,

        desc: '通常状態。すべての兵科・行軍が標準通り機能します。'

      };



      const tooltipText = `【天候：${this.currentWeather}】\n${wEffect.desc}\n・鉄砲射撃威力: ${Math.round(wEffect.gunPowerMult * 100)}%\n・騎馬突撃威力: ${Math.round(wEffect.chargePowerMult * 100)}%\n・行軍兵糧消費: ${wEffect.marchRiceMult}倍${wEffect.restrictColdRegions ? '\n※北陸・東北・奥羽・甲信への出陣不可' : ''}`;

      weatherDisp.title = tooltipText;

      weatherDisp.style.cursor = 'help';

    }



    if (this.isSpectatorMode) {

      // 選択中の領国を取得（無ければ存続大名の領国から自動フォールバック）

      let p = this.selectedProvId ? (this.provinces || []).find(x => x.id === this.selectedProvId) : null;

      if (!p) {

        const activeProvs = (this.provinces || []).filter(x => x.ownerId && x.ownerId !== 'independent' && x.ownerId !== 'court');

        if (activeProvs.length > 0) {

          const counts = {};

          activeProvs.forEach(x => counts[x.ownerId] = (counts[x.ownerId] || 0) + 1);

          const topClan = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];

          p = activeProvs.find(x => x.ownerId === topClan) || activeProvs[0];

          if (p) this.selectedProvId = p.id;

        }

      }



      const daimyoEl = document.getElementById('statDaimyo');

      const clanEl = document.getElementById('statClan');

      const badgeEl = document.getElementById('statPersonalityBadge');

      const milEl = document.getElementById('statMil');

      const polEl = document.getElementById('statPol');

      const stratEl = document.getElementById('statStrat');

      const goldEl = document.getElementById('statGold');

      const riceEl = document.getElementById('statRice');

      const provsEl = document.getElementById('statProvinces');

      const progEl = document.getElementById('statProgression');

      const probEl = document.getElementById('statProbability');

      const probBar = document.getElementById('statProbBar');

      const probDesc = document.getElementById('statProbDesc');

      const troopsEl = document.getElementById('statTroops');

      const apEl = document.getElementById('statAp');

      const apTokens = document.getElementById('apTokensContainer');

      const headKamon = document.getElementById('headerKamonSvg');

      const totalCount = (this.provinces && this.provinces.length > 0) ? this.provinces.length : ((window.PROVINCES_DATA && window.PROVINCES_DATA.length) || 77);



      const targetClanId = p?.ownerId;



      if (targetClanId && targetClanId !== 'independent' && targetClanId !== 'court') {

        // 大名家の場合

        const clanProvs = (this.provinces || []).filter(x => x.ownerId === targetClanId);

        const ability = (typeof getClanAbility === 'function' ? getClanAbility(targetClanId) : null) || { military: 70, politics: 70, stratagem: 70, personality: 'balanced' };

        const livingLord = (this.activeOfficers || []).find(o => o.clanId === targetClanId && o.isDaimyo && !o.isDead);

        const daimyoName = livingLord ? livingLord.name : this.getClanDisplayName(targetClanId);

        const dynamicClan = this.getClanFamilyName(targetClanId);



        if (daimyoEl) daimyoEl.textContent = daimyoName;

        if (clanEl) clanEl.textContent = dynamicClan;



        // 家紋

        const kamonId = this.getClanKamonId(targetClanId);

        if (headKamon) {

          headKamon.innerHTML = `<use href="#${kamonId}" x="0" y="0" width="32" height="32"/>`;

        }



        // 性格バッジ

        const pers = ability.personality || 'balanced';

        const personLabel = pers === 'aggressive' ? '攻勢型'

                          : pers === 'domestic'   ? '内政型'

                          : 'バランス型';

        const personColor = pers === 'aggressive' ? '#ff8888'

                          : pers === 'domestic'   ? '#88ff88'

                          : '#88ccff';

        const personBg = pers === 'aggressive' ? 'rgba(255,107,107,0.18)'

                       : pers === 'domestic'   ? 'rgba(46,204,113,0.18)'

                       : 'rgba(52,152,219,0.18)';

        if (badgeEl) {

          badgeEl.textContent = `👀 ${personLabel}`;

          badgeEl.style.color = personColor;

          badgeEl.style.background = personBg;

          badgeEl.style.borderColor = personColor;

        }



        // 能力値（武・内・知）

        const stats = livingLord?.stats || ability;

        const milVal = stats.military ?? livingLord?.military ?? ability.military ?? 70;

        const polVal = stats.politics ?? stats.politic ?? livingLord?.politics ?? ability.politics ?? 70;

        const strVal = stats.stratagem ?? stats.intel ?? stats.intellect ?? livingLord?.stratagem ?? ability.stratagem ?? 70;

        if (milEl) milEl.textContent = milVal;

        if (polEl) polEl.textContent = polVal;

        if (stratEl) stratEl.textContent = strVal;



        // 覇道進捗（波動進捗）

        const prob = Math.min(100, Math.round((clanProvs.length / Math.max(1, totalCount)) * 100));

        if (probEl) probEl.textContent = `${prob}%`;

        if (probBar) probBar.style.width = `${prob}%`;

        if (probDesc) {

          const kanjiDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

          const tenth = Math.min(10, Math.floor(prob / 10));

          const kanjiTenth = kanjiDigits[tenth] || `${tenth}`;

          probDesc.textContent = prob === 100 ? '天下統一達成 覇道成る' : `天下統一進捗 ${kanjiTenth}割`;

        }



        // 支配領域

        if (provsEl) provsEl.textContent = `${clanProvs.length} / ${totalCount} 国`;

        if (progEl) progEl.textContent = `天下統一まで ${Math.max(0, totalCount - clanProvs.length)}国`;



        // 軍略点・評定枚数（軍令権）

        const clanMaxAp = Math.min(5, Math.max(3, 3 + Math.floor(clanProvs.length / 15)));

        const clanAp = clanMaxAp;

        if (apEl) apEl.textContent = `${clanAp} / ${clanMaxAp}`;

        if (apTokens) {

          apTokens.innerHTML = '';

          for (let i = 0; i < clanMaxAp; i++) {

            const t = document.createElement('div');

            t.className = `ap-token ${i < clanAp ? 'active' : ''}`;

            apTokens.appendChild(t);

          }

        }



        // 備蓄点（金・米）

        let clanGold = 0;

        let clanRice = 0;

        if (typeof this.aiEcon === 'function') {

          const econ = this.aiEcon(targetClanId);

          if (econ) {

            clanGold = Math.max(0, Math.round(econ.gold || 0));

            clanRice = Math.max(0, Math.round(econ.rice || 0));

          }

        }

        if (clanGold === 0 && clanRice === 0) {

          clanGold = clanProvs.reduce((s, x) => s + (Number(x.commerce) || 0), 0);

          clanRice = clanProvs.reduce((s, x) => s + (Number(x.rice) || 0), 0);

        }

        if (goldEl) goldEl.textContent = clanGold.toLocaleString();

        if (riceEl) riceEl.textContent = clanRice.toLocaleString();



        // 総動員兵力

        let totalTroops = 0;

        clanProvs.forEach(x => totalTroops += (Number(x.troops) || 0));

        if (troopsEl) troopsEl.textContent = totalTroops.toLocaleString();



      } else if (p) {

        // 空白地・自治領・朝廷領の場合

        const isCourt = targetClanId === 'court';

        const title = isCourt ? '朝廷領' : `${p.name} 国人衆`;

        const clanTitle = isCourt ? '禁裏・朝廷' : '中立・自治領';

        if (daimyoEl) daimyoEl.textContent = title;

        if (clanEl) clanEl.textContent = clanTitle;

        if (headKamon) {

          headKamon.innerHTML = `<use href="#kamon-default" x="0" y="0" width="32" height="32"/>`;

        }

        if (badgeEl) {

          badgeEl.textContent = isCourt ? '👑 朝廷' : '🏕️ 自治中';

          badgeEl.style.color = '#bdc3c7';

          badgeEl.style.background = 'rgba(127,140,141,0.18)';

          badgeEl.style.borderColor = '#bdc3c7';

        }

        if (milEl) milEl.textContent = p.defense || 50;

        if (polEl) polEl.textContent = p.commerce || 50;

        if (stratEl) stratEl.textContent = p.morale || 50;



        if (probEl) probEl.textContent = '0%';

        if (probBar) probBar.style.width = '0%';

        if (probDesc) probDesc.textContent = '局地割拠';



        if (provsEl) provsEl.textContent = `1 / ${totalCount} 国`;

        if (progEl) progEl.textContent = '天下統一対象外';



        if (apEl) apEl.textContent = '- / -';

        if (apTokens) apTokens.innerHTML = '';



        if (goldEl) goldEl.textContent = (Number(p.commerce) || 0).toLocaleString();

        if (riceEl) riceEl.textContent = (Number(p.rice) || 0).toLocaleString();

        if (troopsEl) troopsEl.textContent = (Number(p.troops) || 0).toLocaleString();

      } else {

        // 万一の未選択・極限状況

        if (daimyoEl) daimyoEl.textContent = '天下観戦中';

        if (clanEl) clanEl.textContent = '成り行き見守り';

        if (badgeEl) {

          badgeEl.textContent = '👀 観戦中';

          badgeEl.style.color = '#ffd700';

          badgeEl.style.background = 'rgba(255, 215, 0, 0.18)';

          badgeEl.style.borderColor = '#ffd700';

        }

        if (milEl) milEl.textContent = '-';

        if (polEl) polEl.textContent = '-';

        if (stratEl) stratEl.textContent = '-';

        if (goldEl) goldEl.textContent = '---';

        if (riceEl) riceEl.textContent = '---';

        const activeClans = new Set((this.provinces || []).map(x => x.ownerId).filter(id => id && id !== 'independent' && id !== 'court'));

        if (provsEl) provsEl.textContent = `残存 ${activeClans.size} 勢力`;

        if (progEl) progEl.textContent = '全土争乱中';

        if (probEl) probEl.textContent = '0%';

        if (probBar) probBar.style.width = '0%';

        if (probDesc) probDesc.textContent = 'AI群雄割拠';

        if (troopsEl) troopsEl.textContent = '---';

        if (apEl) apEl.textContent = '---';

        if (apTokens) apTokens.innerHTML = '';

      }



      if (window.lucide && typeof lucide.createIcons === 'function') {

        lucide.createIcons();

      }



      return;

    }



    const daimyoEl = document.getElementById('statDaimyo');

    const livingPlayerDaimyo = (this.activeOfficers || []).find(o => o.clanId === this.playerClanId && o.isDaimyo && !o.isDead);

    if (livingPlayerDaimyo && this.playerDaimyo && livingPlayerDaimyo.name && this.playerDaimyo.name !== livingPlayerDaimyo.name) {

      this.playerDaimyo.name = livingPlayerDaimyo.name;

      this.playerDaimyo.officerId = livingPlayerDaimyo.id;

    }

    if (daimyoEl && this.playerDaimyo) daimyoEl.textContent = this.playerDaimyo.name;



    const ability = getClanAbility(this.playerClanId);

    const stats = this.playerDaimyo?.stats || ability;

    const milVal = stats.military ?? ability.military ?? 70;

    const polVal = stats.politics ?? stats.politic ?? ability.politics ?? 70;

    const strVal = stats.stratagem ?? stats.intel ?? stats.intellect ?? ability.stratagem ?? 70;



    const personLabel = (this.playerDaimyo?.personality || ability.personality) === 'aggressive' ? '攻勢型'

                      : (this.playerDaimyo?.personality || ability.personality) === 'domestic'   ? '内政型'

                      : 'バランス型';

    const personColor = (this.playerDaimyo?.personality || ability.personality) === 'aggressive' ? '#ff8888'

                      : (this.playerDaimyo?.personality || ability.personality) === 'domestic'   ? '#88ff88'

                      : '#88ccff';

    const personBg = (this.playerDaimyo?.personality || ability.personality) === 'aggressive' ? 'rgba(255,107,107,0.18)'

                   : (this.playerDaimyo?.personality || ability.personality) === 'domestic'   ? 'rgba(46,204,113,0.18)'

                   : 'rgba(52,152,219,0.18)';



    const clanEl = document.getElementById('statClan');

    const dynamicClan = this.getClanFamilyName(this.playerClanId);

    if (clanEl) clanEl.textContent = dynamicClan;

    if (this.playerDaimyo) this.playerDaimyo.clan = dynamicClan;



    const badgeEl = document.getElementById('statPersonalityBadge');

    if (badgeEl) {

      badgeEl.textContent = personLabel;

      badgeEl.style.color = personColor;

      badgeEl.style.background = personBg;

      badgeEl.style.borderColor = personColor;

    }



    const milEl = document.getElementById('statMil');

    if (milEl) milEl.textContent = milVal;

    const polEl = document.getElementById('statPol');

    if (polEl) polEl.textContent = polVal;

    const stratEl = document.getElementById('statStrat');

    if (stratEl) stratEl.textContent = strVal;



    const era = (typeof getEraFlavor === 'function') ? getEraFlavor(this.year) : null;



    const goldEl = document.getElementById('statGold');

    if (goldEl) goldEl.textContent = (Number(this.gold) || 0).toLocaleString();



    const riceEl = document.getElementById('statRice');

    if (riceEl) riceEl.textContent = (Number(this.rice) || 0).toLocaleString();



    const myProvs = this.provinces.filter(p => p.ownerId === this.playerClanId);

    const totalCount = (this.provinces && this.provinces.length > 0) ? this.provinces.length : ((window.PROVINCES_DATA && window.PROVINCES_DATA.length) || 77);

    const provsEl = document.getElementById('statProvinces');

    if (provsEl) provsEl.textContent = `${myProvs.length} / ${totalCount} 国`;



    const progEl = document.getElementById('statProgression');

    if (progEl) progEl.textContent = `天下統一まで ${Math.max(0, totalCount - myProvs.length)}国`;



    const prob = Math.min(100, Math.round((myProvs.length / Math.max(1, totalCount)) * 100));

    const probEl = document.getElementById('statProbability');

    if (probEl) probEl.textContent = `${prob}%`;

    const probBar = document.getElementById('statProbBar');

    if (probBar) probBar.style.width = `${prob}%`;



    const probDesc = document.getElementById('statProbDesc');

    if (probDesc) {

      const kanjiDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

      const tenth = Math.min(10, Math.floor(prob / 10));

      const kanjiTenth = kanjiDigits[tenth] || `${tenth}`;

      probDesc.textContent = prob === 100 ? '天下統一達成 覇道成る' : `天下統一進捗 ${kanjiTenth}割`;

    }



    let totalTroops = 0;

    myProvs.forEach(p => totalTroops += p.troops);

    const troopsEl = document.getElementById('statTroops');

    if (troopsEl) troopsEl.textContent = totalTroops.toLocaleString();



    const apEl = document.getElementById('statAp');

    if (apEl) apEl.textContent = `${this.ap} / ${this.maxAp}`;



    const apTokens = document.getElementById('apTokensContainer');

    if (apTokens) {

      apTokens.innerHTML = '';

      for (let i = 0; i < this.maxAp; i++) {

        const t = document.createElement('div');

        t.className = `ap-token ${i < this.ap ? 'active' : ''}`;

        apTokens.appendChild(t);

      }

    }



    if (window.lucide && typeof lucide.createIcons === 'function') {

      lucide.createIcons();

    }



    const headKamon = document.getElementById('headerKamonSvg');

    if (headKamon && this.playerClanId) {

      headKamon.innerHTML = `<use href="#${this.getClanKamonId(this.playerClanId)}" x="0" y="0" width="32" height="32"/>`;

    }

  },



  // 大名家・家紋に即した鮮明なハイライト輪郭カラーの取得,



  log(msg, type = '') {

    // type 'quiet'：画面下の最新ログ欄は書き換えず、戦況年代記の一覧にだけ記録する

    const logBox = document.getElementById('gameLog');

    if (logBox && type !== 'quiet') {

      logBox.innerHTML = '';

      const div = document.createElement('div');

      div.className = `log-entry ${type}`;

      div.textContent = msg;

      if (window.armorIconHTML && /^【(御家滅亡|同盟消滅|攻城失敗|斬首処刑)/.test(msg)) div.insertAdjacentHTML('afterbegin', window.armorIconHTML() + ' '); // deploy47: 髑髏→甲冑

      logBox.appendChild(div);

    }

    const fullList = document.getElementById('chronicleFullList');

    if (fullList) {

      const div = document.createElement('div');

      div.className = `log-entry ${type}`;

      div.textContent = `${(window.formatYearWithEra || formatHistoricalYear)(this.year)}年 ${this.seasonNames[this.seasonIdx]}: ${msg}`;

      if (window.armorIconHTML && /^【(御家滅亡|同盟消滅|攻城失敗|斬首処刑)/.test(msg)) div.insertAdjacentHTML('afterbegin', window.armorIconHTML() + ' '); // deploy47

      fullList.insertBefore(div, fullList.firstChild);

      // 新しい3000件だけ残す（長いオート進行でページが重くなるのを防ぐ。2026-10-11 cl）

      const maxEntries = Number(window.CHRONICLE_MAX_ENTRIES) || 3000;

      while (fullList.childElementCount > maxEntries && fullList.lastElementChild) fullList.removeChild(fullList.lastElementChild);

    }

  },



  // ============================================================================

  // UIイベントバインディング

  // ============================================================================,



  initUI() {

    // 戦況年代記モーダル開閉

    const openChronicle = () => {

      this.pauseAutoPlayForScreen?.('戦況年代記の表示');

      document.getElementById('chronicleModal')?.classList.remove('hidden');

      this.audio.playHyoshigi();

    };

    document.getElementById('headerChronicleWrap')?.addEventListener('click', openChronicle);

    document.getElementById('headerChronicleBtnMobile')?.addEventListener('click', openChronicle);

    document.getElementById('closeChronicleModalBtn')?.addEventListener('click', () => {

      document.getElementById('chronicleModal')?.classList.add('hidden');

    });

    document.getElementById('closeChronicleModalBtn2')?.addEventListener('click', () => {

      document.getElementById('chronicleModal')?.classList.add('hidden');

    });



    // 厳選5大コマンドボタン

    document.getElementById('cmdDomestic')?.addEventListener('click', () => this.executeDomestic());

    document.getElementById('cmdMilitary')?.addEventListener('click', () => this.executeMilitary());

    document.getElementById('cmdStratagem')?.addEventListener('click', () => this.executeStratagem());

    document.getElementById('cmdRecruit')?.addEventListener('click', () => this.openRecruitRoninModal());

    document.getElementById('cmdAttack')?.addEventListener('click', () => this.openDeployModal());

    document.getElementById('cmdTransfer')?.addEventListener('click', () => this.openTransferModal());

    document.getElementById('nextTurnBtn')?.addEventListener('click', () => {

      if (this.isAutoPlay) {

        this.stopAutoPlay('手動停止');

      }

      this.nextSeason();

    });



    // オートプレーモード設定

    document.getElementById('autoPlayToggleBtn')?.addEventListener('click', () => {

      this.toggleAutoPlay();

    });

    const autoSpeedSlider = document.getElementById('autoPlaySpeedSlider');

    if (autoSpeedSlider) {

      autoSpeedSlider.addEventListener('input', (e) => {

        this.updateAutoPlaySpeed(e.target.value);

      });

    }



    // 観戦モード（成り行きを見守る）設定

    document.getElementById('startSpectatorBtn')?.addEventListener('click', () => {

      this.startSpectatorMode();

    });

    document.getElementById('spectatorToggleBtn')?.addEventListener('click', () => {

      this.toggleSpectatorMode();

    });

    document.getElementById('spectatorSelectDaimyoBtn')?.addEventListener('click', () => {

      this.openSpectatorDaimyoModal();

    });

    document.getElementById('spectatorAutoPlayPauseBtn')?.addEventListener('click', () => {

      this.toggleAutoPlay();

    });

    document.getElementById('closeSpectatorDaimyoModalBtn')?.addEventListener('click', () => {

      document.getElementById('spectatorDaimyoModal')?.classList.add('hidden');

    });

    document.getElementById('closeSpectatorDaimyoModalBtn2')?.addEventListener('click', () => {

      document.getElementById('spectatorDaimyoModal')?.classList.add('hidden');

    });



    // 出陣モーダル

    document.getElementById('deployCancelBtn')?.addEventListener('click', () => {

      document.getElementById('deployModal')?.classList.add('hidden');

    });

    document.getElementById('deployConfirmBtn')?.addEventListener('click', () => this.confirmDeploy());



    // 陣形選択

    document.querySelectorAll('#formationOptionGroup .diff-option-btn').forEach(btn => {

      btn.addEventListener('click', () => {

        document.querySelectorAll('#formationOptionGroup .diff-option-btn').forEach(b => b.classList.remove('selected'));

        btn.classList.add('selected');

        this.selectedFormationKey = btn.dataset.form;

        this.refreshDeployFormationIntel();

      });

    });



    // 地図ヒートマップ切替

    document.querySelectorAll('#mapHeatFilter .map-heat-btn').forEach(btn => {

      btn.addEventListener('click', () => {

        this.setMapHeatMode(btn.dataset.heat);

      });

    });



    // 兵力移動モーダル

    document.getElementById('transferCancelBtn')?.addEventListener('click', () => {

      document.getElementById('transferModal')?.classList.add('hidden');

    });

    document.getElementById('transferConfirmBtn')?.addEventListener('click', () => this.confirmTransfer());



    // 合戦行動ボタン (一騎討ち廃止)

    document.getElementById('bCmdAssault')?.addEventListener('click', () => this.handleBattleAction('assault'));

    document.getElementById('bCmdShoot')?.addEventListener('click', () => this.handleBattleAction('shoot'));

    document.getElementById('bCmdDefend')?.addEventListener('click', () => this.handleBattleAction('defend'));

    document.getElementById('bCmdTactic')?.addEventListener('click', () => this.handleBattleAction('tactic'));

    document.getElementById('bCmdRetreat')?.addEventListener('click', () => this.handleBattleAction('retreat'));



    // 攻城戦行動ボタン (完全強化)

    document.getElementById('siegeBtnAssault')?.addEventListener('click', () => this.handleSiegeAction('assault'));

    document.getElementById('siegeBtnShoot')?.addEventListener('click', () => this.handleSiegeAction('shoot'));

    document.getElementById('siegeBtnSurround')?.addEventListener('click', () => this.handleSiegeAction('surround'));

    document.getElementById('siegeBtnPersuade')?.addEventListener('click', () => this.handleSiegeAction('persuade'));

    document.getElementById('siegeBtnRetreat')?.addEventListener('click', () => this.handleSiegeAction('retreat'));



    // 勢力一覧モーダル

    document.getElementById('factionListModalBtn')?.addEventListener('click', () => this.openFactionListModal());



    // 領国一覧モーダル

    document.getElementById('provinceListModalBtn')?.addEventListener('click', () => this.openProvinceListModal());



    // 武将一覧モーダル

    document.getElementById('officerListModalBtn')?.addEventListener('click', () => this.openOfficerListModal());



    // 城郭解説モーダル（スマホ用ピクトグラムボタン連動）

    document.getElementById('btnMobileCastleLore')?.addEventListener('click', () => {

      if (this.selectedProvId) {

        this.openCastleLoreModal(this.selectedProvId);

      }

    });

    document.getElementById('closeCastleLoreModalBtn')?.addEventListener('click', () => {

      this.closeCastleLoreModal();

    });

    document.getElementById('closeCastleLoreModalBtn2')?.addEventListener('click', () => {

      this.closeCastleLoreModal();

    });

    document.getElementById('castleLoreModal')?.addEventListener('click', (e) => {

      if (e.target.id === 'castleLoreModal') {

        this.closeCastleLoreModal();

      }

    });

    document.addEventListener('keydown', (e) => {

      if (e.key === 'Escape') {

        const loreModal = document.getElementById('castleLoreModal');

        if (loreModal && !loreModal.classList.contains('hidden')) {

          this.closeCastleLoreModal();

        }

      }

    });



    // 領国一括委任モーダル

    document.getElementById('governModalBtn')?.addEventListener('click', () => this.openGovernModal());

    document.getElementById('closeGovernModalBtn')?.addEventListener('click', () => {

      document.getElementById('governModal')?.classList.add('hidden');

      if (this.selectedProvId) this.selectProvince(this.selectedProvId);

    });



    // 委任プリセット

    document.getElementById('btnPresetDomestic')?.addEventListener('click', () => this.applyPresetGovernance('rear_domestic'));

    document.getElementById('btnPresetLogistics')?.addEventListener('click', () => this.applyPresetGovernance('rear_logistics'));

    document.getElementById('btnPresetMilitary')?.addEventListener('click', () => this.applyPresetGovernance('front_military'));

    document.getElementById('btnPresetDirect')?.addEventListener('click', () => this.applyPresetGovernance('all_direct'));



    // 委任一括適用

    document.getElementById('applyDirectBatch')?.addEventListener('click', () => this.applyBatchGovernance('direct'));

    document.getElementById('applyMilitaryBatch')?.addEventListener('click', () => this.applyBatchGovernance('military'));

    document.getElementById('applyDomesticBatch')?.addEventListener('click', () => this.applyBatchGovernance('domestic'));

    document.getElementById('applyBalancedBatch')?.addEventListener('click', () => this.applyBatchGovernance('balanced'));

    document.getElementById('applyLogisticsBatch')?.addEventListener('click', () => this.applyBatchGovernance('logistics'));



    // 全選択チェックボックス

    document.getElementById('selectAllProvsCheckbox')?.addEventListener('change', (e) => {

      document.querySelectorAll('.govern-select-cb').forEach(cb => cb.checked = e.target.checked);

    });



    // 征夷大将軍宣下モーダルボタン

    document.getElementById('shogunAcceptEndingBtn')?.addEventListener('click', () => {

      document.getElementById('shogunModal')?.classList.add('hidden');

      if (this.isShogunEndingAllowed && !this.isShogunEndingAllowed()) return;

      this.shogunAppointed = true;

      this.triggerVictory(true); // 将軍就任エンディング

    });

    document.getElementById('shogunContinueConquestBtn')?.addEventListener('click', () => {

      document.getElementById('shogunModal')?.classList.add('hidden');

      this.shogunAppointed = true;

      this.audio.playHoragai();

      const totalCount = (this.provinces && this.provinces.length > 0) ? this.provinces.length : ((window.PROVINCES_DATA && window.PROVINCES_DATA.length) || 77);

      const kanjiTotal = (typeof toKanjiNumber === 'function') ? toKanjiNumber(totalCount) : `${totalCount}`;

      this.log(`👑【征夷大将軍宣下】朝廷より征夷大将軍に任ぜられました！残る群雄を平定し日本全${kanjiTotal}州（全${totalCount}国）完全統一へ進軍します！`, 'important');

      Swal.fire({

        icon: 'success',

        title: '👑 征夷大将軍 拝命！',

        text: `大将軍の武威を轟かせ、残る群雄を平定し日本全${kanjiTotal}州（全${totalCount}国）の完全統一へ邁進します！`,

        background: '#241710',

        color: '#ffd700'

      });

      this.updateUI();

      this.resumeAutoPlayAfterEvent?.(); // 宣下で一時停止したオート進行を再開（2026-10-11 cc）

    });



    // [81位] 天下統一・証書画像保存 & 𝕏ポストボタン

    document.getElementById('victoryCertificateBtn')?.addEventListener('click', () => {

      this.downloadVictoryCertificate?.();

    });

    document.getElementById('victoryShareBtn')?.addEventListener('click', () => {

      this.shareVictoryOnX?.();

    });



    // 天下統一・エンドロール再鑑賞ボタン

    document.getElementById('victoryWatchRollBtn')?.addEventListener('click', () => {

      document.getElementById('victoryModal')?.classList.add('hidden');

      this.startEndingRoll(this._isShogunRoute);

    });



    // 天下統一・滅亡再戦ボタン

    document.getElementById('victoryRestartBtn')?.addEventListener('click', () => location.reload());

    document.getElementById('defeatRestartBtn')?.addEventListener('click', () => location.reload());

    document.getElementById('defeatSpectateBtn')?.addEventListener('click', () => {

      this.continueDefeatAsSpectator();

    });



    // [42位] 前線／後方位置変化時の統治方針自動切替セレクト

    const autoFrontierSel = document.getElementById('selectAutoFrontierPolicy');

    if (autoFrontierSel) {

      autoFrontierSel.value = this.autoFrontierPolicy || 'logistics';

      autoFrontierSel.addEventListener('change', (e) => {

        this.autoFrontierPolicy = e.target.value;

        const textMap = { logistics: '兵站輸送型へ自動切替', domestic: '内政型へ自動切替', none: '自動切替なし' };

        this.showOrderResult?.('📋 統治自動転換設定', `後方領地を【${textMap[e.target.value] || e.target.value}】に設定`, '#ffd700');

        this.checkAutoFrontierPolicySwitch?.();

      });

    }



    // [70位] 難易度ボタンのホバー/クリック時のAI補正値ガイド動的更新

    const diffDescriptions = {

      easy: '💡 <strong>【初級・天下泰平】</strong> 自軍金800/米1200 ｜ 自軍内政収入+25% ｜ 敵AI徴兵速度: 0.8倍 (穏健) ｜ 包囲網発生率: 極小',

      normal: '💡 <strong>【中級・群雄割拠】</strong> 自軍金500/米800 ｜ 敵AI徴兵・進攻速度: 1.0倍 (標準) ｜ 包囲網: 12国制覇で通常発生',

      hard: '💡 <strong>【上級・風雲再起】</strong> 自軍金350/米500 ｜ 敵AI徴兵速度: 1.3倍 ｜ 敵好戦度+20% ｜ 包囲網: 10国制覇で早期結成',

      hell: '💡 <strong>【超級・戦国地獄】</strong> 自軍金250/米300 ｜ 敵AI徴兵速度: 1.6倍 ｜ 敵軍突撃力+20% ｜ 全大名敵対・包囲網頻発'

    };

    document.querySelectorAll('.diff-option-btn').forEach(btn => {

      const diffKey = btn.dataset.diff;

      if (diffDescriptions[diffKey]) {

        btn.addEventListener('mouseenter', () => {

          const guideEl = document.getElementById('diffDetailText');

          if (guideEl) guideEl.innerHTML = diffDescriptions[diffKey];

        });

      }

    });



    // [24位] モーダル背景（overlay）クリックで閉じる一括処理

    const closeableModals = [

      'chronicleModal',

      'castleLoreModal',

      'governModal',

      'provinceListModal',

      'officerListModal',

      'musicJukeboxModal',

      'transferModal',

      'appointModal',

      'allianceModal',

      'rewardModal',

      'scenarioIntroModal',

      'strategyGuideModal',

      'ruleModal',

      'helpModal',

      'formationModal'

    ];

    closeableModals.forEach(mId => {

      const modalEl = document.getElementById(mId);

      if (modalEl) {

        modalEl.addEventListener('click', (e) => {

          if (e.target === modalEl) {

            modalEl.classList.add('hidden');

            try { this.audio?.playCancel?.(); } catch (err) {}

          }

        });

      }

    });



    const syncMainSoundUI = (isMuted) => {
      const soundBtn = document.getElementById('soundToggleBtn');
      const soundText = document.getElementById('soundText');
      const soundIcon = document.getElementById('soundIcon');
      if (soundText) soundText.textContent = isMuted ? '音: OFF' : '音: ON';
      if (soundIcon) soundIcon.textContent = isMuted ? '🔇' : '🔊';
      if (soundBtn) {
        soundBtn.title = isMuted ? '音声を再生 (現在消音中)' : '音声を消音 (現在再生中)';
        soundBtn.classList.toggle('is-muted', isMuted);
      }
    };

    document.getElementById('soundToggleBtn')?.addEventListener('click', () => {
      this.music.init();
      let isMuted;
      if (typeof window !== 'undefined' && window.SengokuSoundSync) {
        isMuted = window.SengokuSoundSync.toggle();
      } else if (typeof this.music.toggleAllMuted === 'function') {
        isMuted = this.music.toggleAllMuted();
      } else {
        isMuted = this.music.toggleMute();
        this.music.isBgmMuted = isMuted;
        try { localStorage.setItem('sengoku_bgm_muted', isMuted ? '1' : '0'); } catch (_) {}
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sengoku-sound-mute-changed', { detail: { isMuted } }));
        }
      }
      syncMainSoundUI(isMuted);

      const slider = document.getElementById('volumeSlider');
      if (slider && !isMuted && parseFloat(slider.value) === 0) {
        slider.value = 0.7;
        this.music.setVolume(0.7);
      }

      // 消音解除時：もし曲が止まっていたら、ゲーム中の季節曲（または大名専用曲）を再生再開
      if (!isMuted && (!this.music.timerId || this.music.currentTrack === 'op')) {
        try {
          if (this.currentScenarioId) {
            const trk = (typeof this.getSeasonTrackKey === 'function') ? this.getSeasonTrackKey() : 'spring';
            this.music.playTrack(trk, false);
          }
        } catch (_) {}
      }
    });

    document.getElementById('volumeSlider')?.addEventListener('input', (e) => {
      this.music.init();
      const val = parseFloat(e.target.value);
      if (val === 0) {
        if (typeof window !== 'undefined' && window.SengokuSoundSync) {
          window.SengokuSoundSync.setMuted(true);
        } else if (typeof this.music.setAllMuted === 'function') {
          this.music.setAllMuted(true);
        } else {
          this.music.setMute(true);
          this.music.isBgmMuted = true;
          try { localStorage.setItem('sengoku_bgm_muted', '1'); } catch (_) {}
          window.dispatchEvent(new CustomEvent('sengoku-sound-mute-changed', { detail: { isMuted: true } }));
        }
        syncMainSoundUI(true);
      } else {
        const isCurrentlyMuted = !!(this.music.isMuted || this.music.isBgmMuted);
        if (isCurrentlyMuted) {
          if (typeof window !== 'undefined' && window.SengokuSoundSync) {
            window.SengokuSoundSync.setMuted(false);
          } else if (typeof this.music.setAllMuted === 'function') {
            this.music.setAllMuted(false);
          } else {
            this.music.setMute(false);
            this.music.isBgmMuted = false;
            try { localStorage.setItem('sengoku_bgm_muted', '0'); } catch (_) {}
            window.dispatchEvent(new CustomEvent('sengoku-sound-mute-changed', { detail: { isMuted: false } }));
          }
          syncMainSoundUI(false);
          if (!this.music.timerId || this.music.currentTrack === 'op') {
            try {
              if (this.currentScenarioId) {
                const trk = (typeof this.getSeasonTrackKey === 'function') ? this.getSeasonTrackKey() : 'spring';
                this.music.playTrack(trk, false);
              }
            } catch (_) {}
          }
        }
        this.music.setVolume(val);
      }
    });

    window.addEventListener('sengoku-sound-mute-changed', (e) => {
      syncMainSoundUI(!!e.detail?.isMuted);
    });
    const initMuted = (typeof window !== 'undefined' && window.SengokuSoundSync)
      ? window.SengokuSoundSync.isMuted
      : (this.music ? (!!this.music.isBgmMuted || !!this.music.isMuted) : false);
    syncMainSoundUI(initMuted);



    // 戦況記録・再開 (複数スロット＆JSON入出力) UI初期化

    this.initSaveLoadUI();



    // 菅野よう子風 戦国管弦楽 響宴録 UI初期化

    this.initMusicJukeboxUI();

  },



  // ============================================================================

  // 戦況記録・再開 (複数スロット ＆ JSONエクスポート/インポート) UI制御

  // ============================================================================



  initSaveLoadUI() {

    const modal = document.getElementById('saveLoadModal');

    if (!modal) return;



    // ヘッダーボタン連動

    document.getElementById('saveGameBtn')?.addEventListener('click', () => {

      this.openSaveLoadModal('save');

    });



    document.getElementById('loadGameBtn')?.addEventListener('click', () => {

      this.openSaveLoadModal('load');

    });



    // 閉じるボタン

    const closeModal = () => {

      modal.classList.add('hidden');

      this.resumeAutoPlayAfterScreen?.();

    };

    document.getElementById('closeSaveLoadModalBtn')?.addEventListener('click', closeModal);

    document.getElementById('closeSaveLoadModalBtn2')?.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {

      if (e.target === modal) closeModal();

    });



    // タブ切替

    const tabSave = document.getElementById('tabSaveModeBtn');

    const tabLoad = document.getElementById('tabLoadModeBtn');

    const tabExportImport = document.getElementById('tabExportImportBtn');



    tabSave?.addEventListener('click', () => this.switchSaveLoadTab('save'));

    tabLoad?.addEventListener('click', () => this.switchSaveLoadTab('load'));

    tabExportImport?.addEventListener('click', () => this.switchSaveLoadTab('export_import'));



    // JSONエクスポートボタン

    document.getElementById('btnExportJsonFile')?.addEventListener('click', () => {

      const data = this.createSaveData ? this.createSaveData() : null;

      if (!data) return;

      downloadSaveJson(data);

      Swal.fire({

        icon: 'success',

        title: 'JSON出力完了',

        text: '戦況JSONファイルをダウンロード保存しました。別端末で「JSON読込」から再開できます。',

        background: '#241710',

        color: '#ffd700'

      });

    });



    document.getElementById('btnExportJsonCopy')?.addEventListener('click', async () => {

      const data = this.createSaveData ? this.createSaveData() : null;

      if (!data) return;

      const ok = await copySaveJsonToClipboard(data);

      if (ok) {

        Swal.fire({

          icon: 'success',

          title: 'クリップボードにコピー',

          text: '戦況JSON文字列をコピーしました。メールやメモ帳経由で別端末へ引き継げます。',

          background: '#241710',

          color: '#ffd700'

        });

      } else {

        Swal.fire({

          icon: 'error',

          title: 'コピー失敗',

          text: 'クリップボードへのアクセスが許可されていません。',

          background: '#241710',

          color: '#fff'

        });

      }

    });



    // JSONファイルインポート

    const fileInput = document.getElementById('importJsonFileInput');

    document.getElementById('btnTriggerFileImport')?.addEventListener('click', () => {

      fileInput?.click();

    });



    fileInput?.addEventListener('change', (e) => {

      const file = e.target.files?.[0];

      if (!file) return;

      const reader = new FileReader();

      reader.onload = (evt) => {

        try {

          const jsonText = evt.target?.result;

          const data = JSON.parse(jsonText);

          const val = validateSaveData(data);

          if (!val.valid) {

            Swal.fire({ icon: 'error', title: '読込失敗', text: val.message, background: '#241710', color: '#fff' });

            return;

          }

          this.loadGameData(data);

          modal.classList.add('hidden');

          document.getElementById('startModal')?.classList.add('hidden');

          Swal.fire({

            icon: 'success',

            title: '戦況復元完了',

            text: `${formatHistoricalYear(data.year)}年の戦況を復元しました。覇道を再開します！`,

            background: '#241710',

            color: '#ffd700'

          });

        } catch(err) {

          Swal.fire({ icon: 'error', title: 'パース失敗', text: 'JSONファイルの解析に失敗しました。正しいセーブファイルを選択してください。', background: '#241710', color: '#fff' });

        } finally {

          fileInput.value = '';

        }

      };

      reader.readAsText(file, 'utf-8');

    });



    // テキスト貼付インポート

    document.getElementById('btnImportFromText')?.addEventListener('click', () => {

      const ta = document.getElementById('importJsonTextArea');

      const valText = (ta?.value || '').trim();

      if (!valText) {

        Swal.fire({ icon: 'warning', title: 'データ未入力', text: 'JSONテキストを貼り付けてください。', background: '#241710', color: '#fff' });

        return;

      }

      try {

        const data = JSON.parse(valText);

        const val = validateSaveData(data);

        if (!val.valid) {

          Swal.fire({ icon: 'error', title: '読込失敗', text: val.message, background: '#241710', color: '#fff' });

          return;

        }

        this.loadGameData(data);

        modal.classList.add('hidden');

        document.getElementById('startModal')?.classList.add('hidden');

        if (ta) ta.value = '';

        Swal.fire({

          icon: 'success',

          title: '戦況復元完了',

          text: `${formatHistoricalYear(data.year)}年の戦況を復元しました。覇道を再開します！`,

          background: '#241710',

          color: '#ffd700'

        });

      } catch(e) {

        Swal.fire({ icon: 'error', title: '貼付データ無効', text: 'JSON形式が正しくありません。貼り付け内容を確認してください。', background: '#241710', color: '#fff' });

      }

    });

  },



  openSaveLoadModal(mode = 'save') {

    this.pauseAutoPlayForScreen?.('戦況記録・再開画面の表示');

    const modal = document.getElementById('saveLoadModal');

    if (!modal) return;

    this.switchSaveLoadTab(mode);

    modal.classList.remove('hidden');

  },



  switchSaveLoadTab(mode) {

    this._currentSaveLoadMode = mode;

    const tabSave = document.getElementById('tabSaveModeBtn');

    const tabLoad = document.getElementById('tabLoadModeBtn');

    const tabExportImport = document.getElementById('tabExportImportBtn');

    const slotsContainer = document.getElementById('saveLoadSlotsContainer');

    const jsonContainer = document.getElementById('saveLoadJsonContainer');

    const titleEl = document.getElementById('saveLoadModalTitle');

    const iconEl = document.getElementById('saveLoadModalIcon');



    const setActive = (btn, active) => {

      if (!btn) return;

      if (active) {

        btn.style.background = 'linear-gradient(180deg, #3d2c1d, #22160d)';

        btn.style.borderColor = 'var(--gold)';

        btn.style.color = 'var(--gold-bright)';

      } else {

        btn.style.background = 'linear-gradient(180deg, #2a1f15, #150e09)';

        btn.style.borderColor = '#775533';

        btn.style.color = '#ccc';

      }

    };



    setActive(tabSave, mode === 'save');

    setActive(tabLoad, mode === 'load');

    setActive(tabExportImport, mode === 'export_import');



    if (mode === 'export_import') {

      slotsContainer?.classList.add('hidden');

      jsonContainer?.classList.remove('hidden');

      if (titleEl) titleEl.textContent = '戦況JSON入出力・端末間移行';

      if (iconEl) iconEl.textContent = '📦';

    } else {

      jsonContainer?.classList.add('hidden');

      slotsContainer?.classList.remove('hidden');

      if (mode === 'save') {

        if (titleEl) titleEl.textContent = '天下戦況の記録（保存枠選択）';

        if (iconEl) iconEl.textContent = '💾';

      } else {

        if (titleEl) titleEl.textContent = '天下戦況の再開（読込枠選択）';

        if (iconEl) iconEl.textContent = '📂';

      }

      this.renderSaveLoadSlots(mode);

    }

  },



  renderSaveLoadSlots(mode = 'save') {

    const container = document.getElementById('saveLoadSlotsContainer');

    if (!container) return;

    container.innerHTML = '';

    if (mode === 'load') this._renderResumeLatestCard(container);



    const slots = (typeof window !== 'undefined' && window.SAVE_SLOTS) || [

      { id: 'auto', key: 'sengoku_save_data', label: '自動保存 (オートセーブ)', isAuto: true },

      { id: 'slot1', key: 'sengoku_save_slot_1', label: '手動記録枠 壱' },

      { id: 'slot2', key: 'sengoku_save_slot_2', label: '手動記録枠 弐' },

      { id: 'slot3', key: 'sengoku_save_slot_3', label: '手動記録枠 参' },

      { id: 'slot4', key: 'sengoku_save_slot_4', label: '手動記録枠 四' },

      { id: 'slot5', key: 'sengoku_save_slot_5', label: '手動記録枠 五' }

    ];



    slots.forEach(slot => {

      const meta = (typeof getSaveSlotMeta === 'function') ? getSaveSlotMeta(slot.key) : null;

      const card = document.createElement('div');

      card.style.cssText = 'background:rgba(0,0,0,0.45); border:1px solid ' + (meta ? 'var(--gold)' : '#553e2a') + '; border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;';



      const left = document.createElement('div');

      left.style.cssText = 'display:flex; flex-direction:column; gap:3px; flex:1; min-width:240px;';



      const titleRow = document.createElement('div');

      titleRow.style.cssText = 'display:flex; align-items:center; gap:8px;';

      const badge = document.createElement('span');

      badge.style.cssText = 'font-size:10.5pt; font-weight:bold; padding:2px 8px; border-radius:3px; background:' + (slot.isAuto ? 'rgba(41,128,185,0.3); border:1px solid #5dade2; color:#85c1e9;' : 'rgba(212,175,55,0.2); border:1px solid var(--gold); color:var(--gold-bright);');

      badge.textContent = slot.label;

      titleRow.appendChild(badge);



      if (meta) {

        const timeSpan = document.createElement('span');

        timeSpan.style.cssText = 'font-size:10pt; color:#aaa;';

        timeSpan.textContent = meta.savedAt ? `🕒 ${meta.savedAt}` : '';

        titleRow.appendChild(timeSpan);

      }

      left.appendChild(titleRow);



      const contentRow = document.createElement('div');

      if (meta) {

        contentRow.innerHTML = `

          <div style="font-size:11.5pt; color:#fff; font-weight:bold; margin-top:2px;">

            【${meta.scenTitle}】 ${meta.yearStr}年 ${meta.seasonName} ｜ <span style="color:var(--gold);">${meta.clanName}</span> (${meta.daimyoName})

          </div>

          <div style="font-size:10pt; color:#ddd; margin-top:1px;">

            支配: <strong style="color:#ffd700;">${meta.provCount} / ${meta.totalProvs} 国</strong> ｜ 総兵力: <strong style="color:#ff8888;">${meta.totalTroops.toLocaleString()}人</strong> ｜ 金: ${meta.gold.toLocaleString()} ｜ 兵糧: ${meta.rice.toLocaleString()}

          </div>

        `;

      } else {

        contentRow.innerHTML = `

          <div style="font-size:11pt; color:#888; font-style:italic; margin-top:4px;">

            📭 未記録（空きスロット）

          </div>

        `;

      }

      left.appendChild(contentRow);

      card.appendChild(left);



      // 右側のアクションボタン群

      const right = document.createElement('div');

      right.style.cssText = 'display:flex; gap:8px; align-items:center; flex-wrap:wrap;';



      if (mode === 'save') {

        if (slot.isAuto) {

          const autoSaveBtn = document.createElement('button');

          autoSaveBtn.className = 'turn-btn';

          autoSaveBtn.style.cssText = 'margin:0; width:auto; padding:5px 14px; font-size:10.5pt; background:linear-gradient(180deg, #2980b9, #1b4f72); border-color:#5dade2;';

          autoSaveBtn.textContent = '🔄 オート枠に保存';

          autoSaveBtn.onclick = () => {

            this.autoSave(true);

            this.renderSaveLoadSlots('save');

            Swal.fire({ icon: 'success', title: '保存完了', text: 'オートセーブ枠に現在の戦況を記録しました。', background: '#241710', color: '#ffd700' });

          };

          right.appendChild(autoSaveBtn);

        } else {

          const saveBtn = document.createElement('button');

          saveBtn.className = 'turn-btn';

          saveBtn.style.cssText = 'margin:0; width:auto; padding:5px 14px; font-size:10.5pt; background:linear-gradient(180deg, #27ae60, #1e8449); border-color:#2ecc71;';

          saveBtn.textContent = meta ? '💾 上書き記録' : '💾 ここに記録';

          saveBtn.onclick = async () => {

            if (meta) {

              const res = await Swal.fire({

                title: '上書き確認',

                text: `${slot.label} には既存の記録（${meta.yearStr}年 ${meta.daimyoName}）があります。上書きしますか？`,

                icon: 'warning',

                showCancelButton: true,

                confirmButtonColor: '#27ae60',

                cancelButtonColor: '#7f8c8d',

                confirmButtonText: '上書きする',

                cancelButtonText: 'やめる',

                background: '#241710',

                color: '#fff'

              });

              if (!res.isConfirmed) return;

            }

            const res = this.saveToSlot(slot.id);

            if (res.success) {

              this.renderSaveLoadSlots('save');

              Swal.fire({ icon: 'success', title: '記録完了', text: `${slot.label} に現在の戦況を記録しました！`, background: '#241710', color: '#ffd700' });

            } else {

              Swal.fire({ icon: 'error', title: '保存失敗', text: '保存処理に失敗しました。', background: '#241710', color: '#fff' });

            }

          };

          right.appendChild(saveBtn);

        }

      } else {

        // 読込モード

        if (meta) {

          const loadBtn = document.createElement('button');

          loadBtn.className = 'turn-btn';

          loadBtn.style.cssText = 'margin:0; width:auto; padding:5px 16px; font-size:10.5pt; background:linear-gradient(180deg, #d4af37, #9a7b2c); color:#111; font-weight:bold; border-color:#ffd700;';

          loadBtn.textContent = '🚀 この戦況から再開';

          loadBtn.onclick = async () => {

            const res = await Swal.fire({

              title: '戦況再開確認',

              text: `${slot.label}（${meta.yearStr}年 ${meta.seasonName} ${meta.clanName}）の戦況を読み込みますか？ 現在の未保存進行状況は破棄されます。`,

              icon: 'question',

              showCancelButton: true,

              confirmButtonColor: '#d4af37',

              cancelButtonColor: '#7f8c8d',

              confirmButtonText: '再開する',

              cancelButtonText: 'やめる',

              background: '#241710',

              color: '#fff'

            });

            if (!res.isConfirmed) return;

            const loadRes = this.loadFromSlot(slot.id);

            if (loadRes.success) {

              document.getElementById('saveLoadModal')?.classList.add('hidden');

              document.getElementById('startModal')?.classList.add('hidden');

              Swal.fire({ icon: 'success', title: '戦況再開', text: `${meta.daimyoName}公の覇業を再開しました！`, background: '#241710', color: '#ffd700' });

            } else {

              Swal.fire({ icon: 'error', title: '読込失敗', text: loadRes.message || '読込に失敗しました。', background: '#241710', color: '#fff' });

            }

          };

          right.appendChild(loadBtn);



          // ダウンロードボタン

          const dlBtn = document.createElement('button');

          dlBtn.className = 'turn-btn';

          dlBtn.style.cssText = 'margin:0; width:auto; padding:5px 8px; font-size:10.5pt; background:#2c3e50; border-color:#7f8c8d; color:#ddd;';

          dlBtn.title = 'この記録をJSONファイルとして出力';

          dlBtn.textContent = '📥';

          dlBtn.onclick = () => {

            downloadSaveJson(meta.data);

          };

          right.appendChild(dlBtn);



          // 削除ボタン (手動スロットのみ)

          if (!slot.isAuto) {

            const delBtn = document.createElement('button');

            delBtn.className = 'turn-btn';

            delBtn.style.cssText = 'margin:0; width:auto; padding:5px 8px; font-size:10.5pt; background:#922b21; border-color:#c0392b; color:#fff;';

            delBtn.title = 'この記録を消去';

            delBtn.textContent = '🗑️';

            delBtn.onclick = async () => {

              const res = await Swal.fire({

                title: '削除確認',

                text: `${slot.label} の記録を完全に消去しますか？`,

                icon: 'warning',

                showCancelButton: true,

                confirmButtonColor: '#c0392b',

                cancelButtonColor: '#7f8c8d',

                confirmButtonText: '消去する',

                cancelButtonText: 'やめる',

                background: '#241710',

                color: '#fff'

              });

              if (res.isConfirmed) {

                this.deleteSlot(slot.id);

                this.renderSaveLoadSlots('load');

              }

            };

            right.appendChild(delBtn);

          }

        }

      }



      card.appendChild(right);

      container.appendChild(card);

    });

    // 読込モード：同じダイアログからファイル読込も行えるようにする（JSON入出力タブの読込を呼び出す）

    if (mode === 'load') {

      const fc = document.createElement('div');

      fc.className = 'load-file-card';

      fc.style.cssText = 'background:rgba(0,0,0,0.45); border:1px dashed #775533; border-radius:6px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;';

      fc.innerHTML = '<div style="flex:1; min-width:0; font-size:11pt; color:#e0d8c3;">📤 保存したJSONファイル（別端末の記録など）から再開</div>';

      const fb = document.createElement('button');

      fb.className = 'turn-btn';

      fb.style.cssText = 'margin:0; width:auto; padding:6px 18px; font-size:11pt; background:linear-gradient(180deg, #2980b9, #1b4f72); border-color:#5dade2;';

      fb.textContent = '📂 ファイルを選択して読込';

      fb.onclick = () => document.getElementById('btnTriggerFileImport')?.click();

      fc.appendChild(fb);

      container.appendChild(fc);

    }

  },





  // ============================================================================

  // 戦国管弦楽 響宴録 (ジュークボックス・サウンドテスト) UI制御

  // ============================================================================,



  initMusicJukeboxUI() {

    const modal = document.getElementById('musicJukeboxModal');

    if (!modal) return;



    // 開く関数

    const openJukebox = () => {

      this.pauseAutoPlayForScreen?.('音楽・音量設定の表示');

      this.music.init();

      modal.classList.remove('hidden');

      this.updateJukeboxDisplay();

      try { this.audio.playDecision?.(); } catch(e) {}

    };



    // 閉じる関数

    const closeJukebox = () => {

      modal.classList.add('hidden');

      try { this.audio.playCancel?.(); } catch(e) {}

    };



    document.getElementById('openJukeboxBtn')?.addEventListener('click', openJukebox);


    document.getElementById('closeJukeboxBtn')?.addEventListener('click', closeJukebox);

    document.getElementById('closeJukeboxBtn2')?.addEventListener('click', closeJukebox);



    // コントロールボタン

    document.getElementById('jbPrevBtn')?.addEventListener('click', () => {

      this.music.playPrevTrack();

      this.updateJukeboxDisplay();

      try { this.audio.playDecision?.(); } catch(e) {}

    });



    document.getElementById('jbNextBtn')?.addEventListener('click', () => {

      this.music.playNextTrack();

      this.updateJukeboxDisplay();

      try { this.audio.playDecision?.(); } catch(e) {}

    });



    document.getElementById('jbPlayPauseBtn')?.addEventListener('click', () => {

      this.music.toggleBgm();

      this.updateJukeboxDisplay();

    });



    // スライダー連動

    document.getElementById('jbMasterVol')?.addEventListener('input', (e) => {

      const val = parseFloat(e.target.value);

      this.music.setVolume(val);

      const mainSlider = document.getElementById('volumeSlider');

      if (mainSlider) mainSlider.value = val;

    });



    document.getElementById('jbBgmVol')?.addEventListener('input', (e) => {

      const val = parseFloat(e.target.value);

      this.music.setBgmVolume(val);

    });



    document.getElementById('jbSeVol')?.addEventListener('input', (e) => {

      const val = parseFloat(e.target.value);

      this.music.setSeVolume(val);

    });



    // 効果音 ON/OFF（BGM とは別。localStorage に保存、既定 ON）

    const seCheck = document.getElementById('jbSeEnabledCheck');

    const syncSeControls = () => {

      const on = !this.music.isSeMuted;

      if (seCheck) seCheck.checked = on;

      const lbl = document.getElementById('jbSeEnabledLabel');

      if (lbl) lbl.textContent = on ? '効果音 ON' : '効果音 OFF';

      const seVol = document.getElementById('jbSeVol');

      if (seVol) {

        seVol.value = this.music.seVolume;

        seVol.disabled = !on;

      }

    };

    seCheck?.addEventListener('change', (e) => {

      this.music.setSeEnabled(e.target.checked);

      if (this.audio && this.audio !== this.music && this.audio.setSeEnabled) this.audio.setSeEnabled(e.target.checked);

      syncSeControls();

    });



    // 大名専用曲優先チェックボックス

    const daimyoCb = document.getElementById('jbDaimyoModeCheck');

    if (daimyoCb) {

      daimyoCb.checked = this.music.daimyoBgmEnabled;

      daimyoCb.addEventListener('change', (e) => {

        this.music.daimyoBgmEnabled = e.target.checked;

        if (!this.inBattle) {

          this.music.playTrack(this.getSeasonTrackKey(), true);

          this.updateJukeboxDisplay();

        }

      });

    }



    // 4大カテゴリ別 楽曲選曲リストの生成

    this.renderJukeboxTrackList();



    // SE試聴グリッドの生成

    this.renderJukeboxSeGrid();

  },



  renderJukeboxTrackList() {

    const container = document.getElementById('jbTrackListContainer');

    if (!container) return;

    container.innerHTML = '';



    const categories = [

      {

        title: '🌸【四季・天下創世の情景】',

        tracks: ['op', 'spring', 'summer', 'autumn', 'winter']

      },

      {

        title: '🏯【英傑大名 専用交響詩】',

        tracks: ['oda', 'takeda', 'uesugi', 'date', 'mori_choso', 'shimazu', 'hojo']

      },

      {

        title: '⚔️【合戦・決戦・激突】',

        tracks: ['battle', 'battle_intense', 'siege', 'march', 'advantage', 'crisis']

      },

      {

        title: '📜【歴史・天下泰平・鎮魂】',

        tracks: ['event', 'shogun', 'tea', 'diplomacy', 'victory', 'tragedy']

      }

    ];



    categories.forEach(cat => {

      const group = document.createElement('div');

      group.className = 'jb-category-group';



      const titleEl = document.createElement('div');

      titleEl.className = 'jb-category-title';

      titleEl.textContent = cat.title;

      group.appendChild(titleEl);



      const grid = document.createElement('div');

      grid.className = 'jb-track-grid';



      cat.tracks.forEach(trackId => {

        const trk = this.music.tracks[trackId];

        if (!trk) return;



        const card = document.createElement('div');

        card.className = `jb-track-card ${this.music.currentTrack === trackId ? 'active' : ''}`;

        card.dataset.trackId = trackId;



        card.innerHTML = `

          <div class="jb-track-card-info">

            <div class="jb-track-card-name">🎵 ${trk.name}</div>

            <div class="jb-track-card-genre">${trk.genre || ''}</div>

          </div>

          <span style="font-size: 10pt; color: var(--gold-bright);">▶ 演奏</span>

        `;



        card.addEventListener('click', () => {

          this.music.playTrack(trackId, true);

          this.updateJukeboxDisplay();

          try { this.audio.playDecision?.(); } catch(e) {}

        });



        grid.appendChild(card);

      });



      group.appendChild(grid);

      container.appendChild(group);

    });

  },



  renderJukeboxSeGrid() {

    const grid = document.getElementById('jbSeGrid');

    if (!grid) return;

    grid.innerHTML = '';



    // ゲーム中で実際に鳴る効果音だけ（2026-10-25 sfx39）
    const seItems = [
      { label: '📯 陣中法螺貝', action: () => this.audio.playHoragai?.(1.0) },
      { label: '🪵 拍子木', action: () => this.audio.playHyoshigi?.() },
      { label: '🥁 締太鼓連打', action: () => this.audio.playTaiko?.(1.2) },
      { label: '🥁 地鳴り大太鼓', action: () => this.audio.playWadaikoSound?.() },
      { label: '🔔 大銅鑼・梵鐘', action: () => this.audio.playDoraSound?.() },
      { label: '🎺 祝賀ファンファーレ', action: () => this.audio.playFanfare?.() },
      { label: '👑 大将軍特大凱歌', action: () => this.audio.playGrandFanfare?.() },
      { label: '⚔️ 抜刀・白刃火花', action: () => this.audio.playSword?.() },
      { label: '⚔️ 乱戦', action: () => this.audio.playGachaGacha?.() },
      { label: '💥 火縄銃隊一斉射', action: () => this.audio.playTeppo?.() },
      { label: '🏹 弓矢隊斉射', action: () => this.audio.playArrow?.() },
      { label: '🥷 調略', action: () => this.audio.playSlash?.() },
      { label: '🌾 内政', action: () => this.audio.playDomesticSound?.() },
      { label: '🔨 軍備', action: () => this.audio.playMilitarySound?.() },
      { label: '🎌 勝鬨・全軍凱歌', action: () => this.audio.playKachi?.() },
      { label: '🔥 大名奥義', action: () => this.audio.playOugiVoiceSe?.() },
      { label: '⚡ 運命の劇的ヒット', action: () => this.audio.playEventNotice?.() }
    ];



    seItems.forEach(item => {

      const btn = document.createElement('button');

      btn.className = 'jb-se-btn';

      btn.textContent = item.label;

      btn.addEventListener('click', () => {

        try { item.action(); } catch(e) {}

      });

      grid.appendChild(btn);

    });

  },



  updateJukeboxDisplay() {

    const curTrk = this.music.getCurrentTrackInfo();

    if (!curTrk) return;



    // 現在曲のタイトル・ジャンル・解説

    const titleEl = document.getElementById('jbTrackTitle');

    const genreEl = document.getElementById('jbTrackGenre');

    const descEl = document.getElementById('jbTrackDesc');

    const playPauseBtn = document.getElementById('jbPlayPauseBtn');

    const eqVis = document.getElementById('jbEqVisualizer');

    const badge = document.getElementById('bgmTitleBadge');



    if (titleEl) titleEl.textContent = curTrk.name;

    if (genreEl) genreEl.textContent = curTrk.genre || '';

    if (descEl) descEl.textContent = curTrk.desc || '';



    if (playPauseBtn) {

      playPauseBtn.textContent = this.music.isBgmMuted ? '▶ 再生' : '⏸ 停止';

    }



    if (eqVis) {

      if (this.music.isBgmMuted) {

        eqVis.classList.add('paused');

      } else {

        eqVis.classList.remove('paused');

      }

    }



    if (badge) {

      badge.textContent = this.music.isBgmMuted ? '🔇 BGM: 停止' : `🎵 ${curTrk.name}`;

    }



    // カードの active クラス更新

    document.querySelectorAll('.jb-track-card').forEach(card => {

      if (card.dataset.trackId === this.music.currentTrack) {

        card.classList.add('active');

      } else {

        card.classList.remove('active');

      }

    });

  },



  // ============================================================================

  // 四季折々の日本美・季節＆天候パーティクルビジュアル (Canvas)

  // ============================================================================,



  showHonnoujiSuccessorSelectModal(ev) {

    const options = (ev && ev.successorOptions) || ((typeof this.historicalSuccessionData === 'function' ? this.historicalSuccessionData(ev && ev.rules ? ev : null) : null) || {}).successorOptions || [];



    let modal = document.getElementById('honnoujiSuccessorModal');

    if (!modal) {

      modal = document.createElement('div');

      modal.id = 'honnoujiSuccessorModal';

      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.88); z-index:99999; display:flex; justify-content:center; align-items:center;';

      document.body.appendChild(modal);

    }



    modal.innerHTML = `

      <div style="background:#19120c; border:2px solid #e74c3c; border-radius:8px; width:92%; max-width:760px; max-height:88vh; display:flex; flex-direction:column; box-shadow:0 0 40px rgba(231,76,60,0.6); color:#f5eedc; font-family:'Noto Serif JP',serif;">

        <div style="padding:14px 20px; border-bottom:1px solid #78281f; background:linear-gradient(180deg, #3a1510 0%, #1c0a08 100%);">

          <h2 style="margin:0; font-size:16pt; color:#ff6b6b; text-align:center;">❖ 天下動乱・後継勢力の選択 ❖</h2>

          <p style="margin:6px 0 0 0; font-size:11pt; color:#e0d8c3; text-align:center; line-height:1.4;">

            織田信長公の落命により、織田帝国は瞬く間に分裂いたしました。<br>

            以後の乱世を生き抜くため、貴殿が率いる後継勢力を選定してください。

          </p>

          ${this.autoPlayPausedForEvent ? '<p class="event-auto-pause-note" style="margin:8px 0 0 0; font-size:11pt; color:#f5b041; text-align:center;">⏸ オート進行を一時停止しています。後継を選ぶと再開します。</p>' : ''}

        </div>

        <div style="flex:1; overflow-y:auto; padding:16px 20px; display:flex; flex-direction:column; gap:12px;">

          ${options.map(opt => {

            const ab = getClanAbility(opt.clanId) || { military: 75, politics: 75, stratagem: 75 };

            const provCount = this.provinces.filter(p => p.ownerId === opt.clanId).length;

            return `

              <div style="background:rgba(255,255,255,0.04); border:1px solid #5a4638; border-radius:6px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; gap:12px;">

                <div style="flex:1;">

                  <div style="display:flex; align-items:baseline; gap:10px; margin-bottom:4px;">

                    <strong style="font-size:13pt; color:var(--gold-bright);">${opt.name}</strong>

                    <span style="font-size:10.5pt; color:#e67e22; font-weight:bold;">${opt.title}</span>

                    <span style="font-size:10pt; color:#aaa;">支配領国: ${provCount}カ国</span>

                  </div>

                  <div style="font-size:10.5pt; color:#ccc; margin-bottom:4px;">${opt.desc}</div>

                  <div style="font-size:10pt; color:#f9e79f;">

                    能力: 武勇${ab.military} / 内政${ab.politics} / 知略${ab.stratagem}

                  </div>

                </div>

                <div>

                  <button class="btn-choose-successor" data-clan-id="${opt.clanId}" style="background:#922b21; color:#fff; border:1px solid #e74c3c; padding:8px 16px; border-radius:4px; cursor:pointer; font-size:11.5pt; font-weight:bold; white-space:nowrap; transition:0.2s;">この勢力を率いる</button>

                </div>

              </div>

            `;

          }).join('')}

        </div>

      </div>

    `;



    modal.style.display = 'flex';



    modal.querySelectorAll('.btn-choose-successor').forEach(btn => {

      btn.addEventListener('click', (e) => {

        const clanId = e.currentTarget.dataset.clanId;

        const chosen = options.find(o => o.clanId === clanId);

        modal.style.display = 'none';



        this.executeHonnoujiSuccession(clanId);

        /* 選択後の太鼓・ファンファーレは鳴らさない（2026-10-25） */

        this.music.playTrack(this.getSeasonTrackKey(), false, { seasonReturn: true });



        if (this.autoPlayPausedForEvent || this.isAutoPlay) {

          this.log(`【天下動乱】${chosen.name}が立ち上がり、後継勢力として覇業を開始しました！`, 'important');

          this.updateUI();

          const homeProv = this.getPlayerHomeProvince ? this.getPlayerHomeProvince() : null;

          if (homeProv) this.selectProvince(homeProv.id);

          else {

            const myProvs = this.provinces.filter(p => p.ownerId === this.playerClanId);

            if (myProvs.length > 0) this.selectProvince(myProvs[0].id);

          }

          this.continueAfterHistoricalEvent();

          return;

        }



        Swal.fire({

          title: `❖ 新当主 就任 ❖`,

          html: `

            <div style="text-align:center; padding:10px; font-family:'Noto Serif JP',serif;">

              <p style="font-size:14pt; color:#ffd700; margin-bottom:12px;"><strong>【${chosen.name} 公、天下取りへ名乗りを上げる！】</strong></p>

              <p style="font-size:11.5pt; color:#fff; line-height:1.6;">

                信長公の遺志を継ぎ、あるいは新たな武門の天下を築くため、${chosen.name}公が立ち上がりました！<br>

                山崎・賤ヶ岳の激戦を制し、天下統一を成し遂げてください！

              </p>

            </div>

          `,

          background: '#1c130d',

          color: '#f5eedc',

          confirmButtonText: 'いざ、出陣！',

          confirmButtonColor: '#922b21'

        }).then(() => {

          this.log(`【天下動乱】${chosen.name}が立ち上がり、後継勢力として覇業を開始しました！`, 'important');

          this.updateUI();

          const homeProv = this.getPlayerHomeProvince ? this.getPlayerHomeProvince() : null;

          if (homeProv) {

            this.selectProvince(homeProv.id);

          } else {

            const myProvs = this.provinces.filter(p => p.ownerId === this.playerClanId);

            if (myProvs.length > 0) {

              this.selectProvince(myProvs[0].id);

            }

          }

          this.continueAfterHistoricalEvent();

        });

      });

    });

  },



  showHistoricalEvent(ev) {

    if (this.isVirtualScenario && this.isVirtualScenario()) {

      this.continueAfterHistoricalEvent();

      return;

    }

    this.sealRebellionPair(ev.id);

    const choices = typeof ev.choices === 'function' ? ev.choices(this) : (ev.choices || []);

    if (this.isAutoPlay) this.pauseAutoPlayForEvent();



    const modal = document.getElementById('historyEventModal');

    if (!modal) {

      const choice = choices.find(c => c.isHistorical) || choices[0];

      if (choice) this.applyHistoricalChoice(ev, choice);

      else this.continueAfterHistoricalEvent();

      return;

    }



    if (this.audio.playEventChime) this.audio.playEventChime(); else this.audio.playEventNotice?.();



    const titleEl = document.getElementById('eventTitle');

    const badgeEl = document.getElementById('eventSeasonBadge');

    const subTitleEl = document.getElementById('eventSubTitle');

    const narrativeEl = document.getElementById('eventNarrative');

    const container = document.getElementById('eventChoicesContainer');



    if (titleEl) titleEl.textContent = ev.title;

    if (badgeEl) badgeEl.textContent = `${formatHistoricalYear(this.year)}年 ${this.seasonNames[this.seasonIdx]}`;

    if (subTitleEl) subTitleEl.textContent = ev.subTitle;

    if (narrativeEl) narrativeEl.textContent = typeof ev.narrative === 'function' ? ev.narrative(this) : ev.narrative;



    if (container) {

      container.innerHTML = '';



      choices.forEach((c, idx) => {

        const card = document.createElement('div');

        card.className = `event-choice-card ${c.isHistorical ? 'historical' : 'if-route'}`;

        card.innerHTML = `

          <div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">

              <span style="font-size: 12pt; font-weight:bold; color:${c.isHistorical ? '#5dade2' : '#f39c12'}; background:rgba(0,0,0,0.5); padding:2px 8px; border-radius:3px;">

                ${c.isHistorical ? '📜 史実の決断' : '⚡ 歴史改変IFルート'}

              </span>

              <span style="font-size: 12pt; color:#aaa;">選択肢 ${idx + 1}</span>

            </div>

            <div style="font-size: 12pt; font-weight:bold; color:#fff; line-height:1.4; margin-bottom:6px;">

              ${c.text}

            </div>

            <div style="font-size: 12pt; color:#ddd; line-height:1.45;">

              <div style="color:#ffd700; margin-bottom:2px;">この選択の効果</div>

              ${c.desc}

              ${this.choiceEffectHtml(c, ev)}

            </div>

          </div>

          <button class="turn-btn" style="margin:8px 0 0 0; padding:6px 12px; font-size: 12pt; background:${c.isHistorical ? 'linear-gradient(180deg, #2980b9, #1b4f72)' : 'linear-gradient(180deg, #d35400, #962d00)'};">

            この決断を断行する

          </button>

        `;



        card.addEventListener('click', () => {

          if (this._eventDecidedId === ev.id) return;

          this._eventDecidedId = ev.id;

          this.applyHistoricalChoice(ev, c);

        });



        container.appendChild(card);

      });

    }



    this._eventDecidedId = null;

    modal.classList.remove('hidden');

  }



  /**

   * 選択イベントの史実ルートで、リンク先データイベントの領地変更が落ちないのを補う。

   * 選択側が既に ownerId を書き換えている／反乱・本能寺専用処理がある場合は触らない。

   */



};

