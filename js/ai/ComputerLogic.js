/**
 * @file js/ai/ComputerLogic.js - CPU大名思考ルーチン・侵攻/内政/外交AI・城代補任
 * 戦国天下統一伝 ES6モジュール
 * @typedef {import('../types.js').Officer} Officer
 * @typedef {import('../types.js').Province} Province
 * @typedef {import('../types.js').PlayableDaimyo} PlayableDaimyo
 * @typedef {import('../types.js').Scenario} Scenario
 */

// モジュール間安全参照ヘルパー
var getClanAbility = (clanId) => (typeof window !== 'undefined' && typeof window.getClanAbility === 'function')
  ? window.getClanAbility(clanId)
  : ((typeof window !== 'undefined' && window.CLAN_ABILITIES?.[clanId]) || { politics: 60, military: 60, stratagem: 55, personality: 'balanced' });
var HISTORICAL_ALLIANCE_BONDS = (typeof window !== 'undefined' && window.HISTORICAL_ALLIANCE_BONDS) || [];
var AI_PERSONALITY_TUNING = (typeof window !== 'undefined' && window.AI_PERSONALITY_TUNING) || {
  aggressive: { attackProb: 0.65, requiredRatio: 0.95, forceRatio: 0.78, minSourceTroops: 1300, coalitionBoost: 0.28, coalitionCap: 0.90, ignoreRice: true,  allianceBonus: -0.10, frontShiftMax: 1200 },
  balanced:   { attackProb: 0.28, requiredRatio: 1.25, forceRatio: 0.70, minSourceTroops: 1600, coalitionBoost: 0.22, coalitionCap: 0.75, ignoreRice: false, allianceBonus: 0,     frontShiftMax: 600 },
  domestic:   { attackProb: 0.08, requiredRatio: 1.45, forceRatio: 0.65, minSourceTroops: 1800, coalitionBoost: 0.12, coalitionCap: 0.40, ignoreRice: false, allianceBonus: 0.12,  frontShiftMax: 400 },
  loyal:      { attackProb: 0.35, requiredRatio: 1.15, forceRatio: 0.70, minSourceTroops: 1500, coalitionBoost: 0.25, coalitionCap: 0.80, ignoreRice: false, allianceBonus: 0.25,  frontShiftMax: 700 },
  scheming:   { attackProb: 0.50, requiredRatio: 1.05, forceRatio: 0.72, minSourceTroops: 1200, coalitionBoost: 0.22, coalitionCap: 0.85, ignoreRice: true,  allianceBonus: -0.05, frontShiftMax: 900 }
};

export class ComputerLogic {
  constructor(game) {
    this.game = game;
  }
}

export const ComputerLogicMethods = {
  processBlankProvinceUprisings() {
    if (!this.provinces || !this.activeOfficers) return 0;

    const blankProvs = this.provinces.filter(p => !p.ownerId || p.ownerId === 'null' || p.ownerId === 'undefined');
    if (blankProvs.length === 0) return 0;

    let totalUprisings = 0;

    for (const prov of blankProvs) {
      // その空白地を本拠・流浪地(defaultProv)としている浪人武将（生存武将）
      const localRonins = this.activeOfficers.filter(o => 
        o.clanId === 'ronin' && 
        !o.isDead && 
        o.defaultProv === prov.id
      );

      // 元大名を優先。いなければ一般浪人も一定確率で旗揚げ
      let candidates = localRonins.filter(o => this.isFormerDaimyo(o));
      if (candidates.length === 0) {
        const chance = window.RONIN_BLANK_UPRISING_CHANCE || 0.28;
        if (Math.random() > chance) continue;
        candidates = [...localRonins];
      }
      if (candidates.length === 0) continue;

      // 複数いる場合は能力値合計の最も高い武将を選出
      candidates.sort((a, b) => {
        const scoreA = (Number(a.military) || 0) + (Number(a.politic) || 0) + (Number(a.intel) || 0);
        const scoreB = (Number(b.military) || 0) + (Number(b.politic) || 0) + (Number(b.intel) || 0);
        return scoreB - scoreA;
      });
      const leader = candidates[0];

      // 元々のクランID（マスターデータ上のクランID）
      const masterOff = (window.OFFICERS_MASTER || []).find(m => m.id === leader.id);
      const origClanId = leader._originalClanId || masterOff?.clanId || null;

      // 現在そのクランがマップ上に大名として現存しているか確認
      const isClanActiveOnMap = origClanId && origClanId !== 'ronin' && this.provinces.some(p => p.ownerId === origClanId);

      let newClanId = origClanId;
      if (!newClanId || newClanId === 'ronin' || isClanActiveOnMap) {
        // すでに同名勢力が現存しているか、元IDがない場合は独立勢力IDを生成
        newClanId = 'clan_' + leader.id.replace(/^off_/, '');
      }

      // 領国データの更新
      prov.ownerId = newClanId;
      prov.governorId = leader.id;
      prov.governance = 'direct';
      const koku = Number(prov.kokudaka) || 50000;
      prov.troops = Math.max(prov.troops || 0, this.getProvinceInitialTroops(koku));
      prov.rice = Math.min(this.getProvinceRiceCap(prov), Math.max(prov.rice || 0, Math.round(koku / 1000 * 1.5 + 40))); // 上限（2026-10-11 bh）
      prov.commerce = Math.min(this.getProvinceCommerceCap(prov), Math.max(prov.commerce || 0, Math.round((this.getProvinceBaseCommerce ? this.getProvinceBaseCommerce(prov) : koku / 2000) * 1.5 + 30))); // 国ごとの商業係数（2026-10-11 cd）・上限（2026-10-11 bl）
      prov.defense = Math.max(prov.defense || 0, 50);
      prov.morale = 85;
      prov.order = 85;

      // 当主武将データの更新
      leader.clanId = newClanId;
      leader.isDaimyo = true;
      leader.hasBeenDaimyo = true;
      leader.assignedProvId = prov.id;
      if (this.formerDaimyoIds) this.formerDaimyoIds.add(leader.id);

      // 本拠地と家名登録
      if (!window.CLAN_CAPITAL_PROVINCES) window.CLAN_CAPITAL_PROVINCES = {};
      window.CLAN_CAPITAL_PROVINCES[newClanId] = prov.id;
      if (!this.lastDaimyoNames) this.lastDaimyoNames = {};
      this.lastDaimyoNames[newClanId] = leader.name;
      if (!this.foundingLeaderNames) this.foundingLeaderNames = {};
      this.foundingLeaderNames[newClanId] = leader.name;

      // 旧臣・一門の同伴旗揚げ
      let joinedCount = 0;
      localRonins.forEach(r => {
        if (r.id !== leader.id && origClanId && (r.clanId === 'ronin' || r.clanId === origClanId)) {
          const rMaster = (window.OFFICERS_MASTER || []).find(m => m.id === r.id);
          if (rMaster?.clanId === origClanId || r._originalClanId === origClanId) {
            r.clanId = newClanId;
            r.isDaimyo = false;
            r.assignedProvId = null;
            joinedCount++;
          }
        }
      });

      const joinedNote = joinedCount > 0 ? `（旧臣${joinedCount}名も馳せ集まりました）` : '';
      const clanDisplayName = this.getClanFamilyName(newClanId);
      const castleName = prov.castleName || prov.castle || '城';
      this.log(`🚩【旗揚げ・御家再興】かつて大名であった名将・${leader.name}公が空白地の${prov.name}国（${castleName}）にて旗揚げし、【${clanDisplayName}】として天下に名乗りを上げました！${joinedNote}`, 'important');

      totalUprisings++;
    }

    if (totalUprisings > 0) {
      const upKey = `${this.year}-${this.seasonIdx}`;
      if (this._uprisingSfxSeason !== upKey) { this._uprisingSfxSeason = upKey; try { this.audio.playTaiko?.(); } catch(e) {} }
      this.updateUI();
    }

    return totalUprisings;
  },

  // 御家滅亡時: ゆかりの地の城主が独立、残りは空白地化,

  resolveClanCollapseIndependence(clanId) {
    const chance = window.CASTELLAN_INDEPENDENCE_CHANCE || 0.32;
    const owned = this.provinces.filter(p => p.ownerId === clanId);
    const independentProvIds = new Set();

    owned.forEach(p => {
      const gov = p.governorId
        ? (this.activeOfficers || []).find(o => o.id === p.governorId && !o.isDead)
        : null;
      const isHomeCastellan = gov && gov.defaultProv === p.id && !gov.isDaimyo;
      if (isHomeCastellan && Math.random() < chance) {
        const newClanId = 'clan_' + gov.id.replace(/^off_/, '');
        p.ownerId = newClanId;
        p.governorId = gov.id;
        p.governance = 'direct';
        p.morale = Math.max(70, p.morale || 70);
        p.order = Math.max(60, p.order || 60);
        gov.clanId = newClanId;
        gov.isDaimyo = true;
        gov.hasBeenDaimyo = true;
        gov.assignedProvId = p.id;
        if (this.formerDaimyoIds) this.formerDaimyoIds.add(gov.id);
        if (!window.CLAN_CAPITAL_PROVINCES) window.CLAN_CAPITAL_PROVINCES = {};
        window.CLAN_CAPITAL_PROVINCES[newClanId] = p.id;
        this.lastDaimyoNames = this.lastDaimyoNames || {};
        this.lastDaimyoNames[newClanId] = gov.name;
        this.foundingLeaderNames = this.foundingLeaderNames || {};
        this.foundingLeaderNames[newClanId] = gov.name;
        independentProvIds.add(p.id);
        this.log(`🚩【城主独立】${gov.name}がゆかりの地・${p.name}にて独立し、新勢力を旗揚げしました！`, 'important');
      }
    });

    owned.forEach(p => {
      if (independentProvIds.has(p.id)) return;
      p.ownerId = null;
      p.governorId = null;
      p.troops = Math.max(500, Math.round((p.troops || 1000) * 0.5));
    });

    (this.activeOfficers || []).forEach(o => {
      if (o.clanId === clanId) {
        if (o.isDaimyo && independentProvIds.has(o.assignedProvId)) return;
        o.clanId = 'ronin';
        o.assignedProvId = null;
        o.isDaimyo = false;
      }
    });
  },

  // ============================================================================
  // 途中雇用・待機武将の本拠城主任命システム
  // 要望2: 各勢力に途中から雇い入れられた武将が待機中となっているケースが多いですが、
  // それらの武将が歴史上本拠地としたところで城主としてきちんと任命されるようにする
  // ============================================================================,

  staffComputerVacancies(clanId, branches, pool, aliveGov, seat, scenGovMap = {}, pinnedGovs = {}) {
    const combat = (o) => (Number(o.military) || 0) * 2 + (Number(o.intel) || 0) + (Number(o.politic) || 0);
    const civil = (o) => (Number(o.politic) || 0) * 2 + (Number(o.intel) || 0) + (Number(o.military) || 0);
    
    // 史実城代判定
    const isHistGov = (provId, o) => {
      if (!provId || !o) return false;
      const target = scenGovMap[provId] || pinnedGovs[provId];
      return !!(target && (target === o.id || target === o.name));
    };
    // ゆかりの地に着任中判定
    const atHome = (o) => !!(o.assignedProvId && o.defaultProv === o.assignedProvId);
    // 史実城代として着任中判定
    const atHist = (o) => !!(o.assignedProvId && isHistGov(o.assignedProvId, o));
    let moved = 0;

    // 前線への戦略的配置・異動候補
    // ※史実城代・ゆかりの城主として着任中の武将は絶対に前線穴埋めへ回さず保護する！
    const availableForFront = (targetProvId) => pool.filter(o => {
      if (atHist(o)) return false; // 史実城代は保護
      if (atHome(o)) return false; // ゆかりの城主は保護
      if (!o.assignedProvId) return true; // 待機武将
      const seatP = this.provinces.find(x => x.id === o.assignedProvId && x.governorId === o.id && x.ownerId === clanId);
      if (!seatP) return true;
      return !this.isClanFrontline(seatP); // 安全な後方支城にいる一般武将
    }).sort((a, b) => {
      // 対象の城がゆかりの地である武将がいれば最優先
      const aHome = a.defaultProv === targetProvId ? 1 : 0;
      const bHome = b.defaultProv === targetProvId ? 1 : 0;
      if (aHome !== bHome) return bHome - aHome;
      return combat(b) - combat(a);
    });

    // 1. 前線の城（敵勢力と隣接）への戦略的配置・異動（戦闘力の高い武将を優先）
    const fronts = branches.filter(p => this.isClanFrontline(p))
      .sort((a, b) => this.frontlineWeight(b) - this.frontlineWeight(a));
    fronts.forEach(p => {
      const cur = aliveGov(p);
      // 史実城代またはゆかりの地の城主は前線防衛の要として絶対に交代させない
      if (cur && (isHistGov(p.id, cur) || cur.defaultProv === p.id)) return;
      const cands = availableForFront(p.id);
      const best = cands[0];
      if (!best || best.assignedProvId === p.id) return;
      // 既に城主がいる場合、明らかに戦闘能力が勝る武将がいる場合のみ戦略的交代
      if (cur && combat(cur) >= combat(best)) return;
      if (seat(p, best)) moved++;
    });

    // 2. 後方の空き城への戦略的配置（内政・経済発展重視）
    const rears = branches.filter(p => !aliveGov(p) && !this.isClanFrontline(p))
      .sort((a, b) => (Number(b.kokudaka) || 0) - (Number(a.kokudaka) || 0));
    rears.forEach(p => {
      // 待機武将（未任官）の中から内政スコアの高い武将を選抜
      // ※対象の城にゆかりがある武将がいれば最優先
      const unassigned = pool.filter(o => !o.assignedProvId).sort((a, b) => {
        const aHome = a.defaultProv === p.id ? 1 : 0;
        const bHome = b.defaultProv === p.id ? 1 : 0;
        if (aHome !== bHome) return bHome - aHome;
        return civil(b) - civil(a);
      });
      const next = unassigned[0];
      if (next && seat(p, next)) moved++;
    });
    return moved;
  },

  // コンピューター勢力の支城は、史実城代とゆかりの地を最優先で城主にする。
  // fillVacancies が真のとき（ゲーム進行中）のみ、前線の城や空き城へ最適な武将を戦略的に配置・移動する。
  // シナリオ開始時の初期配置では fillVacancies を渡さない。本拠親政は対象外。
  // プレイヤー勢力は、国司在京・天領代官の城に限って同じ規則で任命する。,

  autoAppointComputerCastellans(options) {
    const fillVacancies = !!(options && options.fillVacancies);
    if (!this.provinces || !this.activeOfficers) return 0;

    const scenGovMap = (window.SCENARIO_HISTORICAL_GOVERNORS && this.currentScenario)
      ? (window.SCENARIO_HISTORICAL_GOVERNORS[String(this.currentScenario.id)] || {})
      : {};
    const scenarioGovIds = new Set(Object.values(scenGovMap));
    const isUnlistedJodai = (o) => String(o.id || '').startsWith('off_jd_') && !scenarioGovIds.has(o.id);
    const pinnedGovs = (window.PINNED_SCENARIO_GOVERNORS && this.currentScenario)
      ? (window.PINNED_SCENARIO_GOVERNORS[String(this.currentScenario.id)] || {})
      : {};
    const isHistGov = (provId, o) => {
      if (!provId || !o) return false;
      const target = scenGovMap[provId] || pinnedGovs[provId];
      return !!(target && (target === o.id || target === o.name));
    };

    const score = (o) => (Number(o.politic) || 0) * 2 + (Number(o.intel) || 0) + (Number(o.military) || 0);
    const blocked = (p) => {
      if (!p || !p.ownerId) return true;
      if (this.isCapitalProvince(p.id, p.ownerId)) return true;
      if (!this.isSpectatorMode && p.ownerId === this.playerClanId) return true;
      return false;
    };
    const aliveGov = (p) => {
      if (!p || !p.governorId) return null;
      return this.activeOfficers.find(o => o.id === p.governorId && !o.isDead && o.clanId === p.ownerId) || null;
    };
    const seat = (prov, officer) => {
      if (!prov || !officer) return false;
      if (prov.governorId === officer.id && officer.assignedProvId === prov.id) return false;
      if (officer.assignedProvId && officer.assignedProvId !== prov.id) {
        const old = this.provinces.find(x => x.id === officer.assignedProvId);
        if (old && old.governorId === officer.id) old.governorId = null;
      }
      if (prov.governorId && prov.governorId !== officer.id) {
        const prev = this.activeOfficers.find(o => o.id === prov.governorId);
        if (prev && prev.assignedProvId === prov.id) prev.assignedProvId = null;
      }
      prov.governorId = officer.id;
      officer.assignedProvId = prov.id;
      return true;
    };

    const clanIds = [...new Set(this.provinces.map(p => p.ownerId).filter(id => id && id !== 'ronin' && id !== 'null'))];
    let total = 0;

    for (const clanId of clanIds) {
      if (!this.isSpectatorMode && clanId === this.playerClanId) continue;
      const branches = this.provinces.filter(p => p.ownerId === clanId && !blocked(p));
      if (branches.length === 0) continue;

      this.activeOfficers.forEach(o => {
        if (o.clanId !== clanId || !o.assignedProvId) return;
        const seated = this.provinces.find(x => x.id === o.assignedProvId);
        if (!seated || seated.ownerId !== clanId || seated.governorId !== o.id) o.assignedProvId = null;
      });

      branches.forEach(p => {
        if (p.governorId && !aliveGov(p)) {
          const stale = this.activeOfficers.find(o => o.id === p.governorId);
          if (stale && stale.assignedProvId === p.id) stale.assignedProvId = null;
          p.governorId = null;
        }
      });

      const pool = this.activeOfficers.filter(o =>
        o.clanId === clanId && !o.isDead && !o.isDaimyo && !this.isCourtFigure(o) && !isUnlistedJodai(o) && !o.isStandby && o.canBeGovernor !== false && o.id !== 'off_dm_amago_1560'
      );

      // 1. 【第1優先：史実城代の配置】自勢力内にその城の史実城代がいれば最優先で着任
      branches.forEach(p => {
        const histTarget = scenGovMap[p.id] || pinnedGovs[p.id];
        if (!histTarget) return;
        const cur = aliveGov(p);
        if (cur && (cur.id === histTarget || cur.name === histTarget)) return; // 既に史実城代が着任中
        const histOff = pool.find(o => !o.isDead && (o.id === histTarget || o.name === histTarget));
        if (histOff) {
          if (clanId === this.playerClanId && aliveGov(p)) return;
          if (seat(p, histOff)) total++;
        }
      });

      // 2. 【第2優先：ゆかりの地の配置】史実城代がいない城に、出身国・本拠地が一致する家臣を着任
      const homes = new Map();
      pool.forEach(o => {
        if (!o.defaultProv) return;
        const home = branches.find(p => p.id === o.defaultProv);
        if (!home) return;
        const cur = aliveGov(home);
        if (cur && cur.defaultProv === home.id) return;
        // 史実城代はゆかりの家臣でも交代させない（完全保護）
        if (cur && isHistGov(home.id, cur)) return;
        // 応仁の乱向け追加武将（off_onin2_）は、ゆかりの国による城主任命の対象外
        if (String(o.id).startsWith('off_onin2_')) return;
        if (!homes.has(home.id)) homes.set(home.id, []);
        homes.get(home.id).push(o);
      });

      homes.forEach((cands, provId) => {
        const home = branches.find(p => p.id === provId);
        if (clanId === this.playerClanId && aliveGov(home)) return;
        const movable = cands.filter(o => {
          if (clanId === this.playerClanId && o.assignedProvId && o.assignedProvId !== provId) return false;
          if (!o.assignedProvId || o.assignedProvId === provId) return true;
          const seated = this.provinces.find(p => p.id === o.assignedProvId && p.governorId === o.id);
          if (!seated) return true;
          if (this.isCapitalProvince(seated.id, seated.ownerId)) return false;
          if (o.defaultProv === seated.id) return false;
          // 史実城代として座っている武将はゆかりの地であっても他城へ動かさない
          if (isHistGov(seated.id, o)) return false;
          return true;
        });
        movable.sort((a, b) => score(b) - score(a));
        const best = movable[0];
        if (best && seat(home, best)) total++;
      });

      // 3. 【第3・第4優先：ゲーム進行中（fillVacancies: true）のみ】前線の城や空き城へ最適な武将を戦略的に配置・移動
      if (fillVacancies) {
        total += this.staffComputerVacancies(clanId, branches, pool, aliveGov, seat, scenGovMap, pinnedGovs);
      }
    }

    const inGame = document.getElementById('startModal')?.classList.contains('hidden');
    if (total > 0 && inGame) {
      this.log(`🏯【城主配置】諸大名は史実城代とゆかりの地を優先し、前線と空き城へ家臣${total}名を城主に任命しました。`);
    }
    return total;
  },

  // シナリオを切り替えるたびに、史実本拠の初期値へ戻してから「今領有している城」へ合わせる,

  toggleAutoPlay() {
    if (this.isAutoPlay) {
      this.stopAutoPlay('手動停止');
    } else {
      this.startAutoPlay();
    }
  },

  /**
   * オート進行時の大名・軍師自動政務
   * オート進行中、プレイヤーのAPが残っている場合に大名と軍師が本拠・直轄地を自動統治
   */
  /** オート統治：境の国の脅威（隣接する敵の最大兵力）と不足（2026-10-11 cj） */
  autoBorderNeeds(clanId = this.playerClanId, ratio = null) { // 勢力・割合の指定は AI 用（2026-10-11 cn）
    const B = this.aiBalance();
    const me = clanId;
    const mine = (this.provinces || []).filter(p => p.ownerId === me);
    const hostileOf = (p) => (p.neighbors || []).map(id => this.aiProvById(id))
      .filter(n => n && n.ownerId && n.ownerId !== me && n.ownerId !== 'null' && !this.isAllied(me, n.ownerId) && !(this.isTruceBlocked?.(n.ownerId, me)));
    return mine.map(p => {
      const foes = hostileOf(p);
      const threat = foes.length ? Math.max(...foes.map(n => Number(n.troops) || 0)) : 0;
      const target = Math.round(threat * (ratio ?? B.autoBorderThreatRatio));
      return { p, border: foes.length > 0, threat, target, deficit: Math.max(0, target - (Number(p.troops) || 0)) };
    });
  },

  /** オート統治：内地と余裕のある境から、手薄な境へ兵を回す。移した兵数を返す（兵は増えない。2026-10-11 cj） */
  autoReinforceBorders(clanId = this.playerClanId, ratio = null) { // 勢力・割合の指定は AI 用（2026-10-11 cn）
    const B = this.aiBalance();
    const me = clanId;
    const needs = this.autoBorderNeeds(me, ratio);
    const byId = new Map(needs.map(x => [x.p.id, x]));
    const short = needs.filter(x => x.deficit > 0).sort((a, b) => b.deficit - a.deficit);
    if (!short.length) return { moved: 0, to: [] };
    const capId = this.aiCapitalOf ? this.aiCapitalOf(me)?.id : null;
    // 自領伝いの距離
    const distFrom = (srcId) => {
      const d = new Map([[srcId, 0]]); const q = [srcId];
      while (q.length) { const id = q.shift(); const p = this.aiProvById(id);
        (p?.neighbors || []).forEach(n => { if (d.has(n)) return; const np = this.aiProvById(n); if (!np || np.ownerId !== me) return; d.set(n, d.get(id) + 1); q.push(n); }); }
      return d;
    };
    const spare = (x) => {
      const t = Number(x.p.troops) || 0;
      if (!x.border) {
        const keepRatio = x.p.id === capId ? Math.max(0.5, B.autoInteriorKeepRatio) : B.autoInteriorKeepRatio;
        return Math.max(0, Math.floor((t - Math.max(B.autoInteriorKeep, t * keepRatio)) * B.autoBorderMoveShare));
      }
      return Math.max(0, Math.floor((t - Math.max(B.autoInteriorKeep, x.target * 1.5)) * 0.5));
    };
    const donors = needs.filter(x => spare(x) >= 200).map(x => ({ x, left: spare(x), dist: distFrom(x.p.id) }));
    let moved = 0; const to = [];
    for (const s of short) {
      let need = s.deficit;
      const cands = donors.filter(d => d.left >= 200 && d.x.p.id !== s.p.id && d.dist.has(s.p.id) && (!d.x.border || d.dist.get(s.p.id) === 1))
        .sort((a, b) => (a.dist.get(s.p.id) - b.dist.get(s.p.id)) || (b.left - a.left));
      let got = 0;
      for (const d of cands) {
        if (need < 100) break;
        const n = Math.min(d.left, need);
        d.left -= n; need -= n; got += n;
        d.x.p.troops = (Number(d.x.p.troops) || 0) - n;
        s.p.troops = (Number(s.p.troops) || 0) + n;
      }
      if (got > 0) { moved += got; to.push(`${s.p.name}+${got.toLocaleString()}`); s.deficit = Math.max(0, s.deficit - got); }
    }
    return { moved, to };
  },

  executeAutoDaimyoGovernance() {
    if (this.ap <= 0) return;
    const myProvs = (this.provinces || []).filter(p => p.ownerId === this.playerClanId);
    if (myProvs.length === 0) return;

    const capitalId = (window.CLAN_CAPITAL_PROVINCES && window.CLAN_CAPITAL_PROVINCES[this.playerClanId]) || myProvs[0].id;
    const capital = this.provinces.find(p => p.id === capitalId) || myProvs[0];

    // 0. 手薄な境の国へ、内地と余裕のある境から兵を回す（行動力1。2026-10-11 cj）
    try {
      const r = this.autoReinforceBorders();
      if (r.moved > 0) {
        this.ap -= 1;
        this.log(`🛡【オート政務・国境後詰め】隣国の兵力に備え、内地から境へ兵${r.moved.toLocaleString()}人を回しました（${r.to.slice(0, 4).join('・')}${r.to.length > 4 ? ' ほか' : ''}）。`);
      }
    } catch (e) { console.warn('[オート政務・国境後詰め]', e); }

    while (this.ap > 0) {
      // 0b. 最も手薄な境の国で募兵（本拠より先。2026-10-11 cj）
      {
        const weak = this.autoBorderNeeds().filter(x => x.border && x.deficit > 0).sort((a, b) => b.deficit - a.deficit)[0];
        if (weak && this.gold >= 50 && this.rice >= 50) {
          this.ap -= 1;
          this.gold -= 50;
          this.rice -= 50;
          const recruitCount = Math.round(350 + Math.random() * 200);
          weak.p.troops = (Number(weak.p.troops) || 0) + recruitCount;
          this.log(`🚩【オート政務・境の徴募】隣国の兵に備え、${weak.p.name}にて兵員${recruitCount}人を徴募しました。`);
          continue;
        }
      }
      // 1. 治安危機領国（治安65以下）があれば治安向上を最優先
      const endangeredOrder = myProvs.find(p => (Number(p.order) || 80) <= 65 && this.gold >= 30);
      if (endangeredOrder) {
        this.ap -= 1;
        this.gold -= 30;
        endangeredOrder.order = Math.min(100, (Number(endangeredOrder.order) || 80) + 15);
        this.log(`📜【オート政務・徳政施策】軍師の進言により、治安の低下した${endangeredOrder.name}へ施策を行い治安を回復しました。(治安+15)`);
        continue;
      }

      // 2. 本拠地兵力が少なければ募兵（兵糧・金に余裕がある場合）
      const maxCapitalTroops = (Number(capital.rice) || 100) * 10 + 2000;
      if ((capital.troops || 0) < maxCapitalTroops * 0.75 && this.gold >= 50 && this.rice >= 50) {
        this.ap -= 1;
        this.gold -= 50;
        this.rice -= 50;
        const recruitCount = Math.round(350 + Math.random() * 200);
        capital.troops = (capital.troops || 0) + recruitCount;
        this.log(`🚩【オート政務・兵員徴募】本拠・${capital.name}にて兵員${recruitCount}人を徴募・訓練しました。`);
        continue;
      }

      // 3. 資金に余裕があれば本拠地を開墾・商業開発
      if (this.gold >= 60 && ((Number(capital.rice) || 0) < this.getProvinceRiceCap(capital) || (Number(capital.commerce) || 0) < this.getProvinceCommerceCap(capital))) {
        this.ap -= 1;
        this.gold -= 40;
        const capRiceBefore = Number(capital.rice) || 0;
        capital.rice = Math.min(this.getProvinceRiceCap(capital), (Number(capital.rice) || 50) + 2);
        capital.commerce = Math.min(this.getProvinceCommerceCap(capital), (Number(capital.commerce) || 50) + 2); // 上限（2026-10-11 bl）
        capital.defense = Math.min(100, (Number(capital.defense) || 50) + 2);
        const capRiceGain = capital.rice - capRiceBefore; // 実際の増分で記録（2026-10-11 bk）
        this.log(`🌾【オート政務・本拠開発】本拠・${capital.name}にて開墾・治水と城壁修築を実施しました。(${capRiceGain > 0 ? `石高+${(capRiceGain / 10).toFixed(1)}万石` : '石高は上限'}, 城防+2)`);
        continue;
      }

      break;
    }
  },

  async runAutoStep() {
    if (!this.isAutoPlay) return;
    // 前の期の処理中は次の期を始めず、終わるのを待つ
    if (this._seasonProcessing) {
      this.scheduleNextAutoSeason();
      return;
    }

    try {
      if (this.inBattle) {
        this.stopAutoPlay('合戦発生のため');
        return;
      }

      const defeatModal = document.getElementById('defeatModal');
      if (!this.isSpectatorMode && defeatModal && !defeatModal.classList.contains('hidden')) {
        this.stopAutoPlay('御家滅亡のため');
        return;
      }

      if (this.autoPlayPausedForEvent || this.isEventChoiceOpen()) {
        this.pauseAutoPlayForEvent();
        return;
      }

      if (this.tryAutoAcknowledgeDialogs()) {
        this.scheduleNextAutoSeason();
        return;
      }

      // 「季節を進める」ボタンに押下パルスアニメーション演出
      const nextBtn = document.getElementById('nextTurnBtn');
      if (nextBtn) {
        nextBtn.classList.add('auto-trigger-pulse');
        setTimeout(() => {
          nextBtn.classList.remove('auto-trigger-pulse');
        }, Math.min(80, Math.round(this.autoPlaySpeed * 1000 / 2)));
      }

      // オート進行時の大名・軍師による自動政務（APを無駄にせず有効活用）
      this.executeAutoDaimyoGovernance();

      // 季節進行（非同期完了を確実に待機してタイマー重複を防止）
      await this.nextSeason();

      // イベント選択や合戦・滅亡で止まっている間は次の期を進めない
      if (this.isAutoPlay && !this.autoPlayPausedForEvent && !this.isEventChoiceOpen() && !this.inBattle) {
        this.scheduleNextAutoSeason();
      }
    } catch (err) {
      console.error('オート進行エラー', err);
      this.log('⚠【季節オート進行】進行中に不具合が起きたため、次の期へ続行します。');
      if (this.isAutoPlay && !this.autoPlayPausedForEvent && !this.isEventChoiceOpen() && !this.inBattle) {
        this.scheduleNextAutoSeason();
      }
    }
  },

  // ============================================================================
  // 季節を進める (ターン終了・委任実行・AI思考・包囲網・自動セーブ)
  // ============================================================================,

  executeAiDiplomacy() {
    // 共通の強敵への対抗同盟・劣勢時の和睦/臣従・強国の同盟破棄（毎季。史実同盟は従来どおり春のみ）
    try { this.executeAiDynamicDiplomacy(); } catch (e) { console.warn('[AI外交]', e); }
    if (this.seasonIdx !== 0) return;
    const alive = new Set((this.provinces || []).map(p => p.ownerId).filter(Boolean));
    const bonds = HISTORICAL_ALLIANCE_BONDS.filter(bond =>
      this.year >= bond.from && this.year <= bond.to && alive.has(bond.a) && alive.has(bond.b)
    );
    bonds.sort((a, b) => {
      const aPlayer = (a.a === this.playerClanId || a.b === this.playerClanId) ? 1 : 0;
      const bPlayer = (b.a === this.playerClanId || b.b === this.playerClanId) ? 1 : 0;
      if (aPlayer !== bPlayer) return bPlayer - aPlayer;
      const aFresh = (this.year - a.from) <= 1 ? 1 : 0;
      const bFresh = (this.year - b.from) <= 1 ? 1 : 0;
      if (aFresh !== bFresh) return bFresh - aFresh;
      return Math.random() - 0.5;
    });

    let formed = 0;
    const maxForm = 3;
    const now = this.year * 4 + this.seasonIdx;
    for (const bond of bonds) {
      if (formed >= maxForm) break;
      if (this.isAllied(bond.a, bond.b)) continue;
      if (!bond.remote && !this.clansShareBorder(bond.a, bond.b)) continue;
      const key = [bond.a, bond.b].sort().join('|');
      const cooledAt = this.allianceCooldown ? this.allianceCooldown[key] : null;
      if (cooledAt != null && now - cooledAt < 4) continue;

      const fresh = (this.year - bond.from) <= 1;
      let chance = fresh ? 0.85 : 0.4;
      const abA = getClanAbility(bond.a);
      const abB = getClanAbility(bond.b);
      if (abA.personality === 'domestic' || abB.personality === 'domestic') chance += AI_PERSONALITY_TUNING.domestic.allianceBonus;
      // 攻勢型は手を縛られる同盟を嫌う（特にプレイヤーと国境を接している時は、同盟より切り取りを優先）
      [bond.a, bond.b].forEach(id => {
        if (id === this.playerClanId) return;
        if (getClanAbility(id).personality !== 'aggressive') return;
        chance += AI_PERSONALITY_TUNING.aggressive.allianceBonus;
        if (this.playerClanId && this.clansShareBorder(id, this.playerClanId)) chance -= 0.06;
      });
      if (this.clanFeelsThreatened(bond.a) || this.clanFeelsThreatened(bond.b)) chance += 0.12;
      if (Math.random() > Math.min(0.95, chance)) continue;

      if (!this.alliances) this.alliances = [];
      this.alliances.push({
        members: [bond.a, bond.b],
        formedYear: this.year,
        formedSeason: this.seasonIdx
      });
      formed++;
      const involvesPlayer = bond.a === this.playerClanId || bond.b === this.playerClanId;
      const partnerId = bond.a === this.playerClanId ? bond.b : (bond.b === this.playerClanId ? bond.a : null);
      if (involvesPlayer && partnerId) {
        this.log(`🤝【諸侯同盟】${this.allianceClanLabel(partnerId)}が${bond.label}を申し出て、貴家と二年間の同盟を結びました。`, 'important');
      } else {
        this.log(`🤝【諸侯同盟】${this.allianceClanLabel(bond.a)}と${this.allianceClanLabel(bond.b)}が${bond.label}を結びました。約定は二年です。`);
      }
    }
  },

  /**
   * AI思考改善第4弾: 謀略AI（AI大名による調略・流言・扇動・防諜戦）
   */
  async executeAiStratagems() {
    if (!this.provinces || this.provinces.length === 0) return;
    const allClanIds = [...new Set(this.provinces.map(p => p.ownerId))].filter(id => id && id !== 'null' && id !== 'ronin');
    // 観戦モードではプレイヤー家（既定の織田家など）も AI として動かす（ui_fixed12）
    const aiClanIds = allClanIds.filter(id => this.isSpectatorMode || id !== this.playerClanId);
    if (aiClanIds.length === 0) return;

    // 1季あたりの最大工作件数（勢力数に応じて増やす。プレイヤー向けは最大1件、包囲網結成中は2件）
    const B = this.aiBalance();
    let stratagemCount = 0;
    const maxStratagemsPerSeason = Math.max(B.plotCapBase, Math.min(B.plotCapMax, B.plotCapBase + Math.floor(aiClanIds.length / B.plotCapPerClans)));
    const maxVsPlayer = this.coalitionFormed ? 2 : 1;
    let targetPlayerCount = 0;
    let playerHome = null;
    try { playerHome = this.playerClanId ? this.getPlayerHomeProvince() : null; } catch (e) { playerHome = null; }

    // 各大名の知謀スコアでソート（知将・策士タイプを優先。同点は季ごとに決まる揺らぎ → ID の安定した比較）
    const sortedClans = aiClanIds.map(clanId => {
      const power = this.getClanStratagemPower ? this.getClanStratagemPower(clanId) : 55;
      const ab = getClanAbility(clanId);
      return { clanId, power, ability: ab, jitter: this.aiJitter('plot:' + clanId, 1) };
    }).filter(c => c.power >= B.plotMinPower) // 知謀が一定以上の勢力が工作を検討
      .sort((a, b) => (b.power - a.power) || (a.jitter - b.jitter) || String(a.clanId).localeCompare(String(b.clanId)));

    for (const { clanId, power, ability } of sortedClans) {
      if (stratagemCount >= maxStratagemsPerSeason) break;
      if (!this.clanHasLivingLord(clanId)) continue;
      // 工作資金（金）が無ければ見送る
      const econ = this.aiEcon(clanId);
      if (econ && econ.gold < B.plotGoldCost) continue;

      // 発令確率の判定（知謀が高いほど高確率、最大35%程度）
      const baseProb = Math.max(0.05, (power - 55) * 0.008);
      const threatened = this.clanFeelsThreatened(clanId);
      const prob = threatened ? baseProb * 1.3 : baseProb;
      if (Math.random() > prob) continue;

      // 前線城の探索
      const myProvs = this.provinces.filter(p => p.ownerId === clanId);
      const frontierProvs = myProvs.filter(p => {
        return (p.neighbors || []).some(nId => {
          const n = this.aiProvById(nId);
          return n && n.ownerId && n.ownerId !== clanId && !this.isAllied(clanId, n.ownerId);
        });
      });
      if (frontierProvs.length === 0) continue;

      // 隣接する敵領国の候補を抽出
      const potentialTargets = [];
      frontierProvs.forEach(src => {
        (src.neighbors || []).forEach(nId => {
          const tgt = this.aiProvById(nId);
          if (tgt && tgt.ownerId && tgt.ownerId !== clanId && !this.isAllied(clanId, tgt.ownerId) && !this.isTruceBlocked?.(clanId, tgt.ownerId)) {
            potentialTargets.push({ src, target: tgt });
          }
        });
      });
      if (potentialTargets.length === 0) continue;

      // 次の侵攻目標（侵攻計画と同じ評価で選ぶ）
      const tunePlot = AI_PERSONALITY_TUNING[ability.personality] || AI_PERSONALITY_TUNING.balanced;
      let plan = null;
      try { plan = this.findBestInvasionPlan(clanId, tunePlot, ability); } catch (e) { plan = null; }
      const planTargetId = plan && plan.target ? plan.target.id : null;

      // ターゲット評価（一度だけ点数を付けてから安定ソート）:
      // 1) 次の侵攻目標は最優先（城防を削り、守兵を減らしておく）
      // 2) プレイヤー城で直轄地（城主不在＝防諜手薄）、本拠や大きな国（流言の的）
      // 3) 治安が乱れている城
      const scored = potentialTargets.map(c => {
        const t = c.target;
        const isPl = t.ownerId === this.playerClanId;
        const eff = this.getEffectiveStats(t.id);
        let s = (isPl ? 20 : 0) + (eff.isDirectRule ? 25 : 0) + (100 - (t.order || 80)) * 0.5;
        if (t.id === planTargetId) s += 40;
        if (isPl) {
          if (playerHome && t.id === playerHome.id) s += 15;
          s += Math.min(20, (Number(t.rice) || 0) / 20);
        }
        return { src: c.src, target: t, score: s + this.aiJitter('plotT:' + clanId + ':' + t.id, 10) };
      }).sort((a, b) => (b.score - a.score) || String(a.target.id).localeCompare(String(b.target.id)) || String(a.src.id).localeCompare(String(b.src.id)));

      const chosen = scored[0];
      const targetProv = chosen.target;
      const isTargetPlayer = targetProv.ownerId === this.playerClanId && !this.isSpectatorMode;
      const isPlanTarget = targetProv.id === planTargetId;

      if (isTargetPlayer && targetPlayerCount >= maxVsPlayer) continue;

      const attackerName = this.getClanFamilyName(clanId);
      const targetName = targetProv.name;
      const targetEff = this.getEffectiveStats(targetProv.id);
      const targetStrat = Number(targetEff.stratagem) || 50;
      const targetOrder = Number(targetProv.order) || 80;

      // 防諜成功判定 (Counter-Intelligence)
      // 防衛側城主の知謀 + 治安補正 vs 攻撃側の知謀
      const diff = targetStrat - power;
      const orderBonus = (targetOrder - 70) * 0.003;
      const counterSuccessRate = Math.max(0.20, Math.min(0.85, 0.45 + diff * 0.007 + orderBonus));
      const counterSuccess = Math.random() < counterSuccessRate;

      stratagemCount++;
      if (isTargetPlayer) targetPlayerCount++;
      if (econ) econ.gold -= B.plotGoldCost; // 工作資金

      // 工作の種別（知謀に応じて決定）
      // 1: 放火・城割（defense低下）
      // 2: 流言・扇動（morale & order低下）
      // 3: 内応・調略（troops引き抜き脱走：知謀75以上限定）
      const typeRoll = Math.random();
      let stratType = 'fire';
      if (isPlanTarget) {
        // 次に攻める城：放火・城割で城防を削る（知将は内応で守兵も減らす）
        stratType = (power >= 75 && typeRoll < 0.35) ? 'treason' : 'fire';
      } else if (isTargetPlayer) {
        // プレイヤーの本拠・大国：流言で士気と治安を揺さぶる
        stratType = (power >= 75 && typeRoll < 0.2) ? 'treason' : (typeRoll < 0.8 ? 'rumor' : 'fire');
      } else if (power >= 75 && typeRoll < 0.35) {
        stratType = 'treason';
      } else if (typeRoll < 0.65) {
        stratType = 'rumor';
      } else {
        stratType = 'fire';
      }

      if (counterSuccess) {
        // ===== 防諜成功（撃退） =====
        if (isTargetPlayer) {
          // 撃退した敵謀略は通知（トースト・効果音）を出さず、年代記にだけ静かに記録する
          const govLabel = targetEff.isDirectRule
            ? `我が城代守備隊`
            : `我が城主・${targetEff.name}`;

          let extraReward = '';
          // 城主知謀が極めて高い（85以上）場合、敵の忍びを捕縛して工作資金を押収
          if (targetStrat >= 85 && Math.random() < 0.5) {
            const seizedGold = Math.round(20 + Math.random() * 25);
            this.gold += seizedGold;
            extraReward = ` さらに潜入した敵忍びを捕縛し、工作資金【金${seizedGold}貫】を押収しました！`;
          }

          this.log(`🛡️【防諜成功】${govLabel}の鋭い警戒網により、${attackerName}が${targetName}に放った忍び衆を捕捉・撃退！工作を未然に防ぎました！(防諜知謀:${targetStrat} vs 敵知謀:${power})${extraReward}`, 'quiet');
        } else {
          // AI同士
          this.log(`🛡️【防諜】${this.getClanFamilyName(targetProv.ownerId)}は${targetName}にて${attackerName}の忍びを警戒網で撃退しました。`, 'quiet');
        }
      } else {
        // ===== 工作成功（被災） =====
        if (stratType === 'fire') {
          // 放火・城割
          const defDmg = Math.round(10 + (power / 100) * 12);
          targetProv.defense = Math.max(15, (targetProv.defense || 50) - defDmg);
          if (isTargetPlayer) {
            try { this.audio.playSlash?.(); } catch(e) {}
            this.log(`🔥【敵国謀略・放火城割】${attackerName}の放った忍び衆が${targetName}の城下に潜入放火！堀と城壁が破壊されました！(城防 -${defDmg} / 防諜知謀:${targetStrat} vs 敵知謀:${power})`, 'battle');
            this.showOrderResult('🔥 敵の謀略！城郭破壊', `${targetName}にて ${attackerName}の放火工作！城防 -${defDmg}`, '#e74c3c');
          } else {
            this.log(`🔥【群雄謀略】${attackerName}が${targetName}に忍びを放ち放火！城防を削ぎました。`, 'quiet');
          }
        } else if (stratType === 'rumor') {
          // 流言・扇動
          const morDmg = Math.round(14 + (power / 100) * 14);
          const ordDmg = Math.round(10 + (power / 100) * 10);
          targetProv.morale = Math.max(20, (targetProv.morale || 70) - morDmg);
          targetProv.order = Math.max(20, (targetProv.order || 80) - ordDmg);
          if (isTargetPlayer) {
            try { this.audio.playHyoshigi?.(); } catch(e) {}
            this.log(`🗣️【敵国謀略・流言扇動】${attackerName}が放った密偵の流言飛語により、${targetName}の領民と将兵が動揺！(士気 -${morDmg}, 治安 -${ordDmg} / 防諜知謀:${targetStrat} vs 敵知謀:${power})`, 'battle');
            this.showOrderResult('🗣️ 敵の謀略！流言飛語', `${targetName}にて人心動揺！士気 -${morDmg} ｜ 治安 -${ordDmg}`, '#e67e22');
          } else {
            this.log(`🗣️【群雄謀略】${attackerName}が${targetName}に流言を放ち、将兵と領民を動揺させました。`, 'quiet');
          }
        } else {
          // 内応・調略（兵員離反）
          const betray = Math.min(Math.round((targetProv.troops || 1000) * 0.12), 650);
          targetProv.troops = Math.max(400, (targetProv.troops || 1000) - betray);
          targetProv.morale = Math.max(25, (targetProv.morale || 70) - 12);
          if (isTargetPlayer) {
            try { this.audio.playSlash?.(); } catch(e) {}
            this.log(`🤝【敵国謀略・兵員内応】${attackerName}の調略により、${targetName}の守備隊から${betray.toLocaleString()}人が寝返り・脱走しました！(守備兵 -${betray}人, 士気 -12)`, 'battle');
            this.showOrderResult('🤝 敵の調略！兵員離反', `${targetName}にて将兵が調略され ${betray.toLocaleString()}人が脱走！`, '#9b59b6');
          } else {
            this.log(`🤝【群雄謀略】${attackerName}が${targetName}の武士団を調略し、守備隊の一部を離反させました。`, 'quiet');
          }
        }
      }
    }
  },

  // ===== AI 勢力の個別補正（ui_fixed12）=====
  // window.AI_CLAN_STRENGTH_BOOSTS（GameRules.js）の補正を、AI が動かす家にだけ返す（プレイヤー家は対象外。観戦中は全家が AI）
  aiClanBoost(clanId) {
    const T = (typeof window !== 'undefined' && window.AI_CLAN_STRENGTH_BOOSTS) || {};
    const b = T[clanId];
    if (!b) return null;
    if (!this.isSpectatorMode && clanId === this.playerClanId) return null;
    // 当主が指定の武将の間だけ有効（織田家は信長の間だけ）
    if ((b.requireHeadIds && b.requireHeadIds.length) || (b.requireHeadNames && b.requireHeadNames.length)) {
      const head = (this.activeOfficers || []).find(o => o.clanId === clanId && o.isDaimyo && !o.isDead);
      if (!head) return null;
      if (!(b.requireHeadIds || []).includes(head.id) && !(b.requireHeadNames || []).includes(head.name)) return null;
    }
    return b;
  },

  /** ゲーム開始時に一度だけ：AI 家の兵力倍率と軍資金の上乗せ */
  applyAiClanStartBoosts() {
    const T = (typeof window !== 'undefined' && window.AI_CLAN_STRENGTH_BOOSTS) || {};
    Object.keys(T).forEach(clanId => {
      const b = this.aiClanBoost(clanId);
      if (!b) return;
      const owned = (this.provinces || []).filter(p => p.ownerId === clanId);
      if (!owned.length) return;
      if (b.startTroopMult) owned.forEach(p => { p.troops = Math.round((Number(p.troops) || 0) * b.startTroopMult); });
      const e = this.aiEcon(clanId);
      if (e && b.startGoldBonus) e.gold += b.startGoldBonus;
      if (e && b.startRiceBonus) e.rice += b.startRiceBonus;
    });
  },

  aiClanSupplyRatio(clanId) {
    const provs = (this.provinces || []).filter(p => p.ownerId === clanId);
    if (provs.length === 0) return 1;
    let cur = 0, base = 0;
    provs.forEach(p => {
      const init = (window.PROVINCES_DATA || []).find(item => item.id === p.id);
      cur += Number(p.rice) || 0;
      base += Math.max(20, Math.round((Number(init?.kokudaka) || 50000) / 1000));
    });
    return base > 0 ? cur / base : 1;
  },

  // ============================================================================
  // 家督相続時の離反独立（2026-10-11 am）
  // 当主が死去・不在となり一門（同族）が継がなかったとき、他で大名として登録されている家臣が
  // ゆかりの地で独立する（1回の相続につき最大5家）。
  // ============================================================================,

  /** 全シナリオの大名（playables の officerId）と clans.json の歴代当主名から「大名として登録された武将」を引く表 */
  breakawayDaimyoIndex() {
    if (this._breakawayIndex) return this._breakawayIndex;
    const byOfficerId = new Map(); // officerId -> [clanId...]
    const byName = new Map();      // 当主名 -> [clanId...]
    const push = (map, k, v) => { if (!k || !v) return; const a = map.get(k) || []; if (!a.includes(v)) a.push(v); map.set(k, a); };
    (window.SCENARIOS_DATA || (typeof SCENARIOS !== 'undefined' ? SCENARIOS : []) || []).forEach(s => {
      (s.playables || []).forEach(pl => push(byOfficerId, pl.officerId, pl.id));
    });
    Object.entries(window.CLAN_MASTER_DATA || {}).forEach(([cid, c]) => {
      Object.values((c && c.leaders) || {}).forEach(n => push(byName, String(n || ''), cid));
      if (c && c.leader) push(byName, String(c.leader), cid);
    });
    this._breakawayIndex = { byOfficerId, byName };
    return this._breakawayIndex;
  },

  officerMasterRecord(off) {
    if (!off) return null;
    return (window.OFFICERS_MASTER || []).find(o => o.id === off.id) || null;
  },

  /** 新当主が大名として登録された別の家（シナリオの大名・歴代当主）。見た目を借りられないときは理由付きで返す（2026-10-11 bp） */
  heirRegisteredClanFor(heir, clanId) {
    if (!heir || !clanId) return null;
    const idx = this.breakawayDaimyoIndex();
    const found = [];
    for (const cid of (idx.byOfficerId.get(heir.id) || [])) found.push(cid);
    for (const [name, cids] of idx.byName) {
      if (this.leaderNamesMatch(heir.name, name)) cids.forEach(c => found.push(c));
    }
    const clans = window.CLAN_MASTER_DATA || {};
    const uniq = [...new Set(found)].filter(c => c && c !== 'ronin' && c !== 'null' && clans[c]);
    if (!uniq.length) return null;
    if (uniq.includes(clanId)) return { clanId, self: true };      // 新当主の登録家が継いだ家そのもの
    const lineage = (window.EVENT_CLAN_LINEAGE || (typeof EVENT_CLAN_LINEAGE !== 'undefined' ? EVENT_CLAN_LINEAGE : [])).find(g => g.includes(clanId)) || [];
    const borrowedBy = (cid) => Object.entries(this.clanLookOverrides || {}).find(([k, v]) => k !== clanId && v && v.fromClanId === cid)?.[0] || null;
    let skip = null;
    for (const cid of uniq) {
      if (lineage.includes(cid)) { skip = skip || { clanId: cid, skip: 'lineage' }; continue; }
      if ((this.provinces || []).some(p => p.ownerId === cid)) { skip = skip || { clanId: cid, skip: 'exists' }; continue; }
      if (borrowedBy(cid)) { skip = skip || { clanId: cid, skip: 'borrowed' }; continue; }
      return { clanId: cid };
    }
    return skip;
  },

  /** 一門以外の新当主が他家の大名として登録されていれば、継いだ家の家紋・領国色をその家のものにする（2026-10-11 bp） */
  applyHeirClanLook(clanId, newHead) {
    if (!clanId || !newHead || clanId === 'ronin' || clanId === 'null') return null;
    const reg = this.heirRegisteredClanFor(newHead, clanId);
    if (!reg) return null;
    this.clanLookOverrides = this.clanLookOverrides || {};
    if (reg.self) {
      if (this.clanLookOverrides[clanId]) {
        delete this.clanLookOverrides[clanId];
        this.log(`🎌【家紋・旗色】${this.getClanFamilyName(clanId)}は新当主・${newHead.name}のもとで本来の家紋と旗色に戻しました。`);
      }
      return null;
    }
    if (reg.skip) return reg;
    const kamon = this.getClanKamonId(reg.clanId, true);
    const color = this.getRegisteredProvinceColor({ ownerId: reg.clanId }, true);
    // 登録家の家紋が実際に描けるときだけ切り替える（無ければ未登録扱いで今の見た目のまま。2026-10-11 bt）
    if (!kamon || kamon === 'kamon-default' || (this.kamonSymbolDefined && !this.kamonSymbolDefined(kamon)) || !color || color === '#5a4638') return null;
    this.clanLookOverrides[clanId] = { kamon, color, fromClanId: reg.clanId, heirId: newHead.id, heirName: newHead.name, year: this.year, seasonIdx: this.seasonIdx };
    const fromName = (window.CLAN_MASTER_DATA || {})[reg.clanId]?.family || this.getClanDisplayName?.(reg.clanId) || reg.clanId;
    const msg = `🎌【家紋・旗色】${this.getClanFamilyName(clanId)}は新当主・${newHead.name}に倣い、家紋と旗色を${fromName}（${newHead.name}の家）のものに改めました。`;
    if (clanId === this.playerClanId) this.log(msg, 'important'); else this.log(msg);
    return this.clanLookOverrides[clanId];
  },

  /** 家臣が独立するときの家 ID（無ければ null）と、その根拠 */
  breakawayClanFor(off, dyingClanId) {
    const idx = this.breakawayDaimyoIndex();
    const master = this.officerMasterRecord(off) || {};
    const clans = window.CLAN_MASTER_DATA || {};
    const lineage = (window.EVENT_CLAN_LINEAGE || (typeof EVENT_CLAN_LINEAGE !== 'undefined' ? EVENT_CLAN_LINEAGE : [])).find(g => g.includes(dyingClanId)) || [];
    const dyingStem = this.familyStemOf ? this.familyStemOf(this.getClanFamilyName(dyingClanId)) : '';
    const ok = (cid) => {
      if (!cid || cid === dyingClanId || cid === 'ronin' || cid === 'null' || cid === this.playerClanId) return false;
      if (!clans[cid]) return false;                 // 色・家紋の無い ID は作らない
      if (lineage.includes(cid)) return false;       // 同じ家系（表記揺れ・家督継承）の別 ID
      if (dyingStem && this.familyStemOf && this.familyStemOf(this.getClanFamilyName(cid)) === dyingStem) return false;
      if ((this.provinces || []).some(p => p.ownerId === cid)) return false; // 現存する家には合流させない
      if (Object.values(this.clanLookOverrides || {}).some(v => v && v.fromClanId === cid)) return false; // 見た目を他家が借りている（2026-10-11 bp）
      return true;
    };
    // 1) どこかのシナリオでその家の大名（playables の officerId）
    for (const cid of (idx.byOfficerId.get(off.id) || [])) if (ok(cid)) return { clanId: cid, why: 'シナリオの大名' };
    // 2) clans.json の歴代当主
    for (const [name, cids] of idx.byName) {
      if (!this.leaderNamesMatch(off.name, name)) continue;
      for (const cid of cids) if (ok(cid)) return { clanId: cid, why: '歴代当主' };
    }
    // 3) 武将データ上の自家 ID が今の家と違い、その家の苗字を名乗る一族
    const own = master.clanId;
    if (own && own !== dyingClanId && ok(own)) {
      const ownStem = this.familyStemOf ? this.familyStemOf(this.getClanFamilyName(own)) : '';
      const sur = this.extractPersonSurname ? this.extractPersonSurname(off.name) : '';
      if (ownStem && sur && this.surnameGroup(sur).includes(ownStem)) return { clanId: own, why: '自家の当主筋' };
    }
    return null;
  },

  /** ゆかりの地：その家の本拠（シナリオ→時代別→史実→clans.json の候補）→ 出身国（homeProvince）→ 既定の所在 → 今の所在 */
  breakawayHomeProvince(off, clanId) {
    const scenCap = this.currentScenario?.capitals?.[clanId];
    if (scenCap) return { provId: scenCap, why: 'シナリオの本拠' };
    const era = this.eraCapitalCandidates ? this.eraCapitalCandidates(clanId)[0] : null;
    if (era) return { provId: era, why: '時代別の本拠' };
    const baseCap = (window.CLAN_CAPITAL_PROVINCES_BASE || {})[clanId] || (window.CLAN_CAPITAL_PROVINCES || {})[clanId];
    if (baseCap) return { provId: baseCap, why: '史実の本拠' };
    const pref = (window.CLAN_MASTER_DATA || {})[clanId]?.capital_pref;
    if (Array.isArray(pref) && pref[0]) return { provId: pref[0], why: '家の本拠候補' };
    const master = this.officerMasterRecord(off) || {};
    if (master.homeProvince || off.homeProvince) return { provId: master.homeProvince || off.homeProvince, why: '出身国' };
    if (master.defaultProv) return { provId: master.defaultProv, why: '既定の所在' };
    return { provId: this.officerBaseProvinceId(off), why: '今の所在' };
  },

  /**
   * 一門が継がなかった相続の後、他で大名として登録されている家臣がゆかりの地で独立する。
   * 対象：その家の家臣（新当主・一門・元服前・没年超えは除く）。選ぶ順：忠誠の低い順 → 能力合計の高い順。上限なし（2026-10-11 bm：10家の上限を撤廃）。
   * ゆかりの地が死去した家の領国で、本拠ではなく、同じ相続で他の家臣がまだ取っていない場合のみ。
   * dryRun なら変更せず候補の一覧だけ返す。
   */
  applySuccessionBreakaways(clanId, newHead, deceasedName, dryRun = false) {
    if (!clanId) return [];
    // 一門以外の新当主が他家の大名なら、家紋・領国色をその家のものに（2026-10-11 bp）
    if (!dryRun) { try { this.applyHeirClanLook(clanId, newHead); } catch (e) {} }
    // 1回の相続での独立の上限は無し（2026-10-11 bm）
    const pool = (this.activeOfficers || []).filter(o => o && o.clanId === clanId && !o.isDead && !o.isDaimyo
      && (!newHead || o.id !== newHead.id) && this.officerCanInherit(o)
      && !this.isIchimonOfficer(o, clanId, deceasedName));
    const stat = o => (Number(o.military) || 0) + (Number(o.politic ?? o.politics) || 0) + (Number(o.intel ?? o.intelligence) || 0);
    const loy = o => Number.isFinite(Number(o.loyalty)) ? Number(o.loyalty) : 70;
    pool.sort((a, b) => (loy(a) - loy(b)) || (stat(b) - stat(a)) || String(a.id).localeCompare(String(b.id)));
    const taken = new Set(), usedClans = new Set(), plan = [];
    for (const off of pool) {
      const bc = this.breakawayClanFor(off, clanId);
      if (!bc || usedClans.has(bc.clanId)) continue;
      const home = this.breakawayHomeProvince(off, bc.clanId);
      const prov = (this.provinces || []).find(p => p.id === home.provId);
      if (!prov || prov.ownerId !== clanId || taken.has(prov.id)) continue;
      if (this.isCapitalProvince(prov.id, clanId)) continue;
      taken.add(prov.id); usedClans.add(bc.clanId);
      plan.push({ off, clanId: bc.clanId, why: bc.why, prov, provWhy: home.why });
    }
    if (dryRun || !plan.length) return plan;

    // 随従者：独立した当主の一門・独立した家の本来の家臣（親家の新当主・親家の一門は除く。近い縁を優先。2026-10-11 bw）
    const followersOf = new Map(plan.map(x => [x.clanId, []]));
    const leaderIds = new Set(plan.map(x => x.off.id));
    (this.activeOfficers || []).forEach(o => {
      if (!o || o.clanId !== clanId || o.isDead || o.isDaimyo || leaderIds.has(o.id)) return;
      if (newHead && o.id === newHead.id) return;
      if (this.isIchimonOfficer(o, clanId, deceasedName)) return;
      if (newHead && newHead.name && this.isIchimonOfficer(o, clanId, newHead.name)) return;
      const ownClan = (this.officerMasterRecord(o) || {}).clanId;
      let best = null;
      plan.forEach((x, i) => {
        const rank = this.isIchimonOfficer(o, x.clanId, x.off.name) ? 0 : (ownClan && ownClan === x.clanId ? 1 : -1);
        if (rank < 0) return;
        if (!best || rank < best.rank) best = { rank, clanId: x.clanId };
      });
      if (best) followersOf.get(best.clanId).push(o);
    });

    const isPlayer = clanId === this.playerClanId;
    // 相続前の家名（先代の苗字）で書く。家名は新当主の苗字に変わっていることがある
    const deadSur = deceasedName && this.extractPersonSurname ? this.extractPersonSurname(deceasedName) : '';
    const oldName = deadSur ? `${deadSur}家` : this.getClanFamilyName(clanId);
    const headLabel = newHead && newHead.name ? `（${newHead.name}）` : '';
    const borders = (prov) => (prov.neighbors || []).some(id => (this.provinces.find(p => p.id === id) || {}).ownerId === this.playerClanId);
    const rows = [];
    // 初期資金：分裂前の親家の金庫 ÷ 分裂前の国数（下限 金300・兵糧600）を親家から移す（2026-10-11 bv）
    const TB = this.aiBalance ? this.aiBalance() : {};
    const useTreasury = TB.breakawayTreasury !== false;
    const parentEcon = isPlayer ? null : (this.aiEcon ? this.aiEcon(clanId) : null);
    const parentFunds = (k) => Math.max(0, Number(isPlayer ? this[k] : parentEcon?.[k]) || 0);
    const parentProvCount = Math.max(1, (this.provinces || []).filter(p => p.ownerId === clanId).length);
    const shareOf = {
      gold: Math.max(Number(TB.breakawayGoldFloor ?? 300) || 0, Math.floor(parentFunds('gold') / parentProvCount)),
      rice: Math.max(Number(TB.breakawayRiceFloor ?? 600) || 0, Math.floor(parentFunds('rice') / parentProvCount))
    };
    // 兵の移籍：分裂前の本家の総兵力 × 割合 ÷ 独立した家の数を、本家に残る国から比例して集める（2026-10-11 ca）
    const planProvIds = new Set(plan.map(x => x.prov.id));
    const parentTroopsBefore = (this.provinces || []).filter(p => p.ownerId === clanId).reduce((s, p) => s + (Number(p.troops) || 0), 0);
    const troopShare = Math.max(0, Number(TB.breakawayTroopShare ?? 0.10) || 0);
    const minGarrison = Math.max(0, Number(TB.breakawayMinGarrison ?? 300) || 0);
    const troopsPerBreakaway = plan.length ? Math.floor(parentTroopsBefore * troopShare / plan.length) : 0;
    const takeTroopsFromParent = (want) => {
      if (!(want > 0)) return 0;
      const src = (this.provinces || []).filter(p => p.ownerId === clanId && !planProvIds.has(p.id));
      const spare = src.map(p => Math.max(0, Math.floor((Number(p.troops) || 0) - minGarrison)));
      const total = spare.reduce((s, v) => s + v, 0);
      if (total <= 0) return 0;
      const goal = Math.min(want, total);
      let taken = 0;
      src.forEach((p, i) => {
        const v = Math.min(spare[i], Math.floor(goal * spare[i] / total));
        p.troops = (Number(p.troops) || 0) - v; taken += v;
      });
      // 端数は余裕の大きい国から
      for (let i = 0; taken < goal && i < src.length; i++) {
        const j = spare.indexOf(Math.max(...spare)); if (j < 0) break;
        const room = Math.max(0, Math.floor((Number(src[j].troops) || 0) - minGarrison));
        const v = Math.min(room, goal - taken); src[j].troops -= v; taken += v; spare[j] = -1;
      }
      return taken;
    };
    const takeFromParent = (k) => {
      const v = Math.max(0, Math.min(shareOf[k], Math.floor(parentFunds(k))));
      if (isPlayer) this[k] = (Number(this[k]) || 0) - v;
      else if (parentEcon) parentEcon[k] = (Number(parentEcon[k]) || 0) - v;
      return v;
    };
    plan.forEach(({ off, clanId: newClan, prov }) => {
      this.handleProvinceLoss(prov, clanId);
      prov.ownerId = newClan;
      prov.justConquered = false;
      off.clanId = newClan;
      off.isDaimyo = true;
      off.isStandby = false;
      off.assignedProvId = prov.id;
      off.defaultProv = prov.id;
      prov.governorId = off.id;
      prov.jodaiId = off.id;
      if (window.CLAN_CAPITAL_PROVINCES) window.CLAN_CAPITAL_PROVINCES[newClan] = prov.id;
      this.lastDaimyoNames = this.lastDaimyoNames || {};
      this.lastDaimyoNames[newClan] = off.name;
      if (this.foundingLeaderNames && !this.foundingLeaderNames[newClan]) this.foundingLeaderNames[newClan] = off.name;
      if (this.aiEconomy) delete this.aiEconomy[newClan];
      let fund = null;
      if (useTreasury && this.aiEcon) {
        const base0 = TB.breakawayKeepProvinceStart !== false ? (this.aiEcon(newClan) || { gold: 0, rice: 0 }) : { gold: 0, rice: 0 }; // 従来の初期資金（その国から）
        const g = takeFromParent('gold'), r = takeFromParent('rice');
        fund = { gold: Math.round(Number(base0.gold) || 0) + g, rice: Math.round(Number(base0.rice) || 0) + r, paidGold: g, paidRice: r };
        this.aiEconomy[newClan] = { gold: fund.gold, rice: fund.rice };
      }
      const movedTroops = takeTroopsFromParent(troopsPerBreakaway);
      if (movedTroops > 0) prov.troops = (Number(prov.troops) || 0) + movedTroops;
      const followers = followersOf.get(newClan) || [];
      followers.forEach(f => {
        (this.provinces || []).forEach(p => {
          if (p.id === prov.id) return;
          if (p.governorId === f.id) p.governorId = null;
          if (p.jodaiId === f.id) p.jodaiId = null;
        });
        f.clanId = newClan;
        f.isStandby = false;
        f.assignedProvId = prov.id;
        f.defaultProv = prov.id;
      });
      const newName = this.getClanFamilyName(newClan);
      const fundText = fund && (fund.paidGold || fund.paidRice) ? `、軍資金${fund.paidGold.toLocaleString()}・兵糧${fund.paidRice.toLocaleString()}を持ち出し` : '';
      const msg = `⚡【家中分裂・独立】${oldName}の家督が一門以外${headLabel}に移ったのを機に、${off.name}が${prov.name}（兵${(Number(prov.troops) || 0).toLocaleString()}${fundText}）を率いて${newName}として独立しました。${movedTroops > 0 ? `本家より兵${movedTroops.toLocaleString()}が移りました。` : ''}`;
      // 通知はトーストではなく、相続1回につき確認ダイアログ1枚にまとめる（2026-10-11 bc）
      const truceN = this.addBreakawayTruce ? this.addBreakawayTruce(clanId, newClan) : 0; // 停戦（2026-10-11 cf）
      const fmsg0 = followers.length ? `${msg}随従：${followers.map(f => f.name).join('・')}（${followers.length}名）。` : msg;
      const fmsg = truceN > 0 ? `${fmsg0}本家は${truceN}季のあいだ${newName}を攻められません（停戦）。` : fmsg0;
      if (isPlayer || borders(prov)) this.log(fmsg, 'important');
      else this.log(fmsg);
      rows.push({ name: off.name, clanName: newName, provName: prov.name, troops: Number(prov.troops) || 0, movedTroops, gold: fund ? fund.gold : null, rice: fund ? fund.rice : null, followers: followers.map(f => f.name), truce: truceN });
    });
    try { this.resyncOfficerPlacements(); } catch (e) {}
    try { this.ensureClanCapitalsMatchMap(); } catch (e) {}
    this.queueSuccessionBreakawayDialog?.({ isPlayer, oldName, newHeadName: newHead?.name || '', rows });
    return plan;
  },

  /**
   * 家中分裂・独立の確認ダイアログ（1回の相続につき1枚。2026-10-11 bc）
   * 浪人の願い出と同じ待ち行列（enqueueRoninRequest）に入れ、他のポップアップと重ねない。
   * オート進行中は既存の慣例どおり tryAutoAcknowledgeDialogs が次の一手で自動的に閉じる。
   */
  queueSuccessionBreakawayDialog(info) {
    if (!info || !Array.isArray(info.rows) || !info.rows.length) return;
    if (this.isSpectatorMode) return; // 観戦モード時はダイアログ表示をスキップ（年代記記録のみ）
    this.breakawayDialogsQueued = (this.breakawayDialogsQueued || 0) + 1;
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const show = async () => {
      if (!window.Swal) return;
      try { this.audio.playHyoshigi?.(); } catch (e) {}
      const hasFunds = info.rows.some(r => r.gold != null); // 初期資金の列（2026-10-11 bv）
      const who = info.isPlayer ? '我が家' : esc(info.oldName);
      const head = info.newHeadName ? `（新当主：${esc(info.newHeadName)}）` : '';
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

      if (isMobile) {
        // スマートフォン画面：シンプルで文字が見切れないスマートカード表示
        const mobileCards = info.rows.map(r => `
          <div style="background:rgba(42,28,18,0.9); border:1px solid rgba(212,175,55,0.35); border-radius:5px; padding:6px 8px; margin-bottom:5px; text-align:left; line-height:1.35;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; gap:4px;">
              <span style="color:var(--gold-bright); font-weight:bold; font-size:10pt;">${esc(r.name)}</span>
              <span style="color:#88ccff; font-weight:bold; font-size:9pt;">${esc(r.clanName)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px; font-size:8.5pt; color:#ddd;">
              <span>🏯 ${esc(r.provName)}</span>
              <span style="color:#ff9999; font-weight:bold;">兵 ${esc((Number(r.troops) || 0).toLocaleString())}</span>
              ${(r.followers && r.followers.length) ? `<span style="color:#aaa;">随従${r.followers.length}名</span>` : ''}
              ${hasFunds && r.gold != null ? `<span style="color:#f39c12;">金${esc(Math.round(Number(r.gold) || 0).toLocaleString())}・糧${esc(Math.round(Number(r.rice) || 0).toLocaleString())}</span>` : ''}
            </div>
          </div>`).join('');

        await Swal.fire({
          title: info.isPlayer ? '⚡ 家中分裂・独立 ⚡' : `⚡ ${esc(info.oldName)}で家中分裂 ⚡`,
          html: `
            <div style="text-align:left; font-size:9pt; color:#f5eedc; font-family:'Noto Serif JP',serif; line-height:1.4;">
              <p style="margin:0 0 6px 0; font-size:8.8pt; color:#ccc;">${who}の家督相続${head}を機に家臣が独立：</p>
              <div style="max-height:48vh; overflow-y:auto; padding-right:2px; box-sizing:border-box;">
                ${mobileCards}
              </div>
              <p style="margin:6px 0 0 0; font-size:8.2pt; color:#aaa; text-align:right;">
                独立 ${info.rows.length}家${(info.rows[0] && info.rows[0].truce > 0) ? `　🕊 停戦 ${esc(info.rows[0].truce)}季` : ''}
              </p>
            </div>`,
          confirmButtonText: '承知した',
          confirmButtonColor: '#8e44ad',
          background: '#1c130d',
          color: '#f5eedc'
        });
      } else {
        // ウェブ上の画面（PC大画面）：従来の詳細テーブル表示を完全維持
        const rows = info.rows.map(r => `
          <tr>
            <td style="padding:4px 8px; border-bottom:1px solid #3d2f25; color:var(--gold-bright); font-weight:bold;">${esc(r.name)}</td>
            <td style="padding:4px 8px; border-bottom:1px solid #3d2f25;">${esc(r.clanName)}</td>
            <td style="padding:4px 8px; border-bottom:1px solid #3d2f25;">${esc(r.provName)}</td>
            <td style="padding:4px 8px; border-bottom:1px solid #3d2f25; text-align:right;">${esc((Number(r.troops) || 0).toLocaleString())}${r.movedTroops > 0 ? `<span style="font-size:10pt; color:#bbb;">（本家より+${esc(Number(r.movedTroops).toLocaleString())}）</span>` : ''}</td>
            <td style="padding:4px 8px; border-bottom:1px solid #3d2f25; font-size:10.5pt;">${(r.followers && r.followers.length) ? `${r.followers.length}名<span style="color:#bbb;">（${esc(r.followers.slice(0, 3).join('・'))}${r.followers.length > 3 ? ` 他${r.followers.length - 3}名` : ''}）</span>` : '—'}</td>
            ${hasFunds ? `<td style="padding:4px 8px; border-bottom:1px solid #3d2f25; text-align:right; white-space:nowrap;">${r.gold == null ? '—' : `金${esc(Math.round(Number(r.gold) || 0).toLocaleString())}・糧${esc(Math.round(Number(r.rice) || 0).toLocaleString())}`}</td>` : ''}
          </tr>`).join('');

        await Swal.fire({
          title: info.isPlayer ? '⚡ 家中分裂・独立 ⚡' : `⚡ ${esc(info.oldName)}で家中分裂 ⚡`,
          html: `
            <div style="text-align:left; font-size:12pt; color:#f5eedc; font-family:'Noto Serif JP',serif; line-height:1.6;">
              <p style="margin:0 0 10px 0;">${who}の家督が一門以外${head}に移ったのを機に、次の家臣が所領を率いて独立しました。</p>
              <div style="max-height:52vh; overflow-y:auto; border:1px solid #3d2f25; border-radius:3px;">
              <table style="width:100%; border-collapse:collapse; font-size:11.5pt;">
                <thead style="position:sticky; top:0; background:#1e140d; z-index:1;"><tr style="color:#d4b483; border-bottom:1px solid #5a4638;">
                  <th style="padding:4px 8px; text-align:left;">新大名</th><th style="padding:4px 8px; text-align:left;">家名</th>
                  <th style="padding:4px 8px; text-align:left;">領国</th><th style="padding:4px 8px; text-align:right;">兵力</th><th style="padding:4px 8px; text-align:left;">随従</th>${hasFunds ? '<th style="padding:4px 8px; text-align:right;">資金</th>' : ''}
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>
              </div>
              <p style="margin:10px 0 0 0; font-size:10.5pt; color:#bbb;">独立 ${info.rows.length} 家${(info.rows[0] && info.rows[0].truce > 0) ? `　🕊 停戦：本家は ${esc(info.rows[0].truce)} 季のあいだ独立した家を攻められません` : ''}</p>
            </div>`,
          confirmButtonText: '承知した',
          confirmButtonColor: '#8e44ad',
          background: '#1c130d',
          color: '#f5eedc',
          width: 820
        });
      }
    };
    if (typeof this.enqueueRoninRequest === 'function') this.enqueueRoninRequest(show);
    else void show();
  },


  // ============================================================================
  // AI改善（2026-10-11 ag）: 経済・防衛・侵攻先評価・外交・謀略の共通ヘルパー
  // ============================================================================,

  /** AI 調整値（window.AI_BALANCE で上書き可） */
  aiBalance() {
    const d = {
      recruitGoldPerTroop: 0.10, recruitRicePerTroop: 0.10, // 徴兵コスト
      domesticGoldPerProv: 3,       
      devGoldCost: 40, devGain: 3, devReserveBase: 400, devReservePerProv: 60, // 余剰資金での開発
      plotGoldCost: 40,             // 謀略1件の費用（プレイヤーと同じ）
      attackRiceRate: 0.10, attackRiceMin: 50, // 出陣時の兵糧（プレイヤーと同じ計算）
      startFundsMult: 3,            // 開始資金（シナリオ指定が無い勢力）= 商業・石高合計 × 倍率
      battleCapBase: 2, battleCapPerClans: 12, battleCapMin: 3, battleCapMax: 6, // 1季の合戦上限 = 基数 + 勢力数/割数
      plotCapBase: 2, plotCapPerClans: 10, plotCapMax: 5, plotMinPower: 55,      // 1季の謀略上限
      defenseMaxMovesPerClan: 4, defenseMoveMax: 1000, // 後詰め：1勢力1季の移動回数・1回の上限
      counterAllianceChance: 0.15, counterAllianceChanceVsPlayer: 0.25, counterAllianceSeasons: 8, maxCounterAlliances: 3, // 対抗同盟：1季1件・同時に最大3件
      truceChance: 0.15, truceSeasons: 4, vassalChance: 0.20, vassalSeasons: 16, maxPeacePacts: 3, // 和睦・臣従：同時に最大3件
      breakChance: 0.06, breakChanceAggressive: 0.10,
      autoBorderThreatRatio: 1.5, autoInteriorKeep: 800, autoInteriorKeepRatio: 0.2, autoBorderMoveShare: 0.9, // オート統治：境の目標兵力＝隣の敵の最大兵力×割合、内地の残し方（2026-10-11 cj）
      coalitionThresholdProvs: 15, coalitionGraceSeasons: 0, coalitionGrowthProvs: 0, // 反覇道包囲網：15国以上で結成。猶予は取り消し（0/0 で ck 以前と同じ。2026-10-11 cm）
      aiBorderReinforce: true, aiBorderThreatRatio: 1.2, // AI の国境後詰め（cj と同じ処理。目標＝隣の敵の最大兵力×割合。2026-10-11 cn）
      aiSupportShare: 0.5, aiSupportKeep: 600, aiSupportMax: 3, // 兵の集中：攻め先に接する他の自領から、兵の割合（残す下限）で加勢。加勢する国の上限
      aiWeakTargetBonusMax: 45, aiWeakTargetRatio: 1.5, // プレイヤーの手薄な国を狙う加点（攻め手÷守兵 が割合を超えた分×15、上限）
      aiRecruitShare: 0, aiRecruitThreatRatio: 1.0, aiRecruitStep: 100, // 既定0（0.05〜0.5 を試すと織田1582が5〜9国まで崩れたため切）。予備費超過分のうち徴兵に回す割合・境の目標（脅威×割合）・1回の人数
      aiAutumnAttackMult: 1.25, aiEngagedAttackMult: 1.3, aiEngagedTargetBonus: 20, // 時機：秋の出陣、他所と交戦中の敵への出陣・加点
      troopUpkeepGoldPerTroop: 0.01, // 兵の維持費（毎季・兵1人あたりの金。プレイヤー・AI 共通。0.02 ではオート統治の大家の金が尽きたため 0.01。2026-10-11 ci）
      surplusReserveBase: 800, surplusReservePerProv: 150, surplusSpendShare: 0.5, // AI：予備費を超えた金の一部を開発・城普請・徴兵へ（2026-10-11 ci）
      breakawayTruceSeasons: 2, // 家中分裂：本家は独立した家をこの季数攻められない（2026-10-11 cf）
      breakawayTroopShare: 0.10, breakawayMinGarrison: 300, // 家中分裂：本家の総兵力の1割を独立した家で等分し、本家の残る国から比例して移す（2026-10-11 ca）
      breakawayTreasury: true, breakawayGoldFloor: 300, breakawayRiceFloor: 600, breakawayKeepProvinceStart: true // 家中分裂で独立した家の初期資金：親家の金庫 ÷ 分裂前の国数（下限あり・親家から移す）。KeepProvinceStart=true なら従来の初期資金に上乗せ（2026-10-11 bv）
    };
    const o = (typeof window !== 'undefined' && window.AI_BALANCE) || {};
    return Object.assign(d, o);
  },

  aiProvById(id) {
    if (!this._aiProvIndex || this._aiProvIndex.list !== this.provinces) {
      this._aiProvIndex = { list: this.provinces, map: new Map((this.provinces || []).map(p => [p.id, p])) };
    }
    return this._aiProvIndex.map.get(id);
  },

  aiBaseKoku(prov) {
    const init = (window.PROVINCES_DATA || []).find(item => item.id === prov.id);
    return Number(init?.kokudaka) || 50000;
  },

  /** AI 勢力の金・兵糧（無ければ初期化） */
  aiEcon(clanId) {
    if (!clanId || (!this.isSpectatorMode && clanId === this.playerClanId) || clanId === 'null' || clanId === 'undefined' || clanId === 'ronin') return null;
    if (!this.aiEconomy) this.aiEconomy = {};
    let e = this.aiEconomy[clanId];
    if (!e || !Number.isFinite(Number(e.gold)) || !Number.isFinite(Number(e.rice))) {
      const B = this.aiBalance();
      const pl = (this.currentScenario?.playables || []).find(x => x.id === clanId);
      const owned = (this.provinces || []).filter(p => p.ownerId === clanId);
      const comm = owned.reduce((s, p) => s + (Number(p.commerce) || 0), 0);
      const rice = owned.reduce((s, p) => s + (Number(p.rice) || 0), 0);
      e = {
        gold: Number.isFinite(Number(pl?.gold)) ? Number(pl.gold) : Math.round(comm * B.startFundsMult),
        rice: Number.isFinite(Number(pl?.rice)) ? Number(pl.rice) : Math.round(rice * B.startFundsMult)
      };
      this.aiEconomy[clanId] = e;
    }
    return e;
  },

  /** 支払えれば支払って true */
  aiSpend(clanId, gold = 0, rice = 0) {
    const e = this.aiEcon(clanId);
    if (!e) return true;
    if (e.gold < gold || e.rice < rice) return false;
    e.gold -= gold; e.rice -= rice;
    return true;
  },

  /** 徴兵：払える分だけ兵を増やし、実際の増分を返す */
  aiPayTroops(clanId, want) {
    if (want <= 0) return 0;
    const e = this.aiEcon(clanId);
    if (!e) return want;
    const B = this.aiBalance();
    const afford = Math.floor(Math.min(want, e.gold / B.recruitGoldPerTroop, e.rice / B.recruitRicePerTroop));
    const n = Math.max(0, afford);
    e.gold -= n * B.recruitGoldPerTroop;
    e.rice -= n * B.recruitRicePerTroop;
    return n;
  },

  /** プレイヤーと同じ規則の収入（夏・冬に商業×0.8 の金、秋に石高×1.2 の兵糧。一揆中の国は無収入） */
  aiCollectIncome() {
    const ikki = window.IKKI_ORDER_THRESHOLD || 50;
    const clans = [...new Set((this.provinces || []).map(p => p.ownerId))].filter(id => id && (this.isSpectatorMode || id !== this.playerClanId) && id !== 'null' && id !== 'undefined' && id !== 'ronin');
    clans.forEach(clanId => {
      const e = this.aiEcon(clanId);
      if (!e) return;
      this.provinces.forEach(p => {
        if (p.ownerId !== clanId) return;
        if (Number.isFinite(Number(p.order)) && Number(p.order) <= ikki) return;
        if (this.seasonIdx === 2) e.rice += Math.round((Number(p.rice) || 0) * 1.2);
        if (this.seasonIdx === 1 || this.seasonIdx === 3) e.gold += this.provinceCommerceIncome ? this.provinceCommerceIncome(p) : Math.round((Number(p.commerce) || 0) * 0.8); // 開発分の上乗せ（2026-10-11 ce）
      });
    });
    // 兵の維持費（毎季。払えない分は払わない。2026-10-11 ci）
    const upkeep = this.troopUpkeepRate ? this.troopUpkeepRate() : 0;
    if (upkeep > 0) {
      const troopsBy = {};
      this.provinces.forEach(p => { if (p.ownerId) troopsBy[p.ownerId] = (troopsBy[p.ownerId] || 0) + (Number(p.troops) || 0); });
      clans.forEach(clanId => {
        const e = this.aiEcon(clanId);
        if (!e) return;
        e.gold = Math.max(0, e.gold - Math.round((troopsBy[clanId] || 0) * upkeep));
      });
    }
    // 滅亡した勢力の財布は片付ける
    Object.keys(this.aiEconomy || {}).forEach(id => { if (!clans.includes(id)) delete this.aiEconomy[id]; });
  },

  /** 余剰資金で開墾・商業開発（基準石高の1.5倍まで） */
  aiDevelop(clanId, personality) {
    const e = this.aiEcon(clanId);
    if (!e) return;
    const B = this.aiBalance();
    const owned = this.provinces.filter(p => p.ownerId === clanId);
    const times = personality === 'domestic' ? 2 : 1;
    for (let i = 0; i < times; i++) {
      if (e.gold < B.devReserveBase + B.devReservePerProv * owned.length) return;
      const cands = owned.map(p => {
        const base = Math.max(20, Math.round(this.aiBaseKoku(p) / 1000));
        return { p, cap: Math.round(base * 1.5), capC: Math.round(Math.max(10, base / 2) * 1.5), ratio: (Number(p.rice) || 0) / base };
      }).filter(c => (Number(c.p.rice) || 0) < c.cap || (Number(c.p.commerce) || 0) < c.capC)
        .sort((a, b) => (a.ratio - b.ratio) || String(a.p.id).localeCompare(String(b.p.id)));
      if (!cands.length) return;
      const c = cands[0];
      e.gold -= B.devGoldCost;
      c.p.rice = Math.min(c.cap, (Number(c.p.rice) || 0) + B.devGain);
      c.p.commerce = Math.min(c.capC, (Number(c.p.commerce) || 0) + B.devGain);
    }
  },

  /** 予備費を超えた金の一部を、開発・境の城普請・治安に順に回す（2026-10-11 ci） */
  aiSpendSurplus(clanId) {
    const e = this.aiEcon(clanId);
    if (!e) return 0;
    const B = this.aiBalance();
    const owned = this.provinces.filter(p => p.ownerId === clanId);
    if (!owned.length) return 0;
    const reserve = B.surplusReserveBase + B.surplusReservePerProv * owned.length;
    let budget = Math.floor((e.gold - reserve) * B.surplusSpendShare);
    if (budget < 40) return 0;
    const start = e.gold;
    // 脅威のある境・攻め口の国に限って徴兵（兵の上限＝石高×10+2000 まで。2026-10-11 cn）
    {
      let rb = Math.floor(budget * (Number(B.aiRecruitShare) || 0));
      if (rb >= 20) {
        const needs = this.autoBorderNeeds(clanId, Number(B.aiRecruitThreatRatio) || 1)
          .filter(x => x.border && x.deficit > 0 && (Number(x.p.troops) || 0) < (Number(x.p.rice) || 0) * 10 + 2000)
          .sort((a, b) => b.deficit - a.deficit);
        for (const x of needs) {
          if (rb < 20) break;
          const cap = (Number(x.p.rice) || 0) * 10 + 2000 - (Number(x.p.troops) || 0);
          const want = Math.min(x.deficit, cap, Math.floor(rb / B.recruitGoldPerTroop), Number(B.aiRecruitStep) || 100);
          if (want < 50) continue;
          const got = this.aiPayTroops(clanId, want);
          if (got <= 0) break;
          x.p.troops = (Number(x.p.troops) || 0) + got;
          rb -= Math.ceil(got * B.recruitGoldPerTroop); budget -= Math.ceil(got * B.recruitGoldPerTroop);
        }
      }
    }
    const hostile = (p) => (p.neighbors || []).some(id => { const n = this.aiProvById(id); return n && n.ownerId && n.ownerId !== clanId && !this.isAllied(clanId, n.ownerId); });
    const border = owned.filter(hostile);
    // 石高は通常の AI 開発と同じ基準の1.5倍まで（兵の上限＝石高×10 を膨らませない）。商業は土地の上限まで
    const riceCap = (p) => Math.min(this.getProvinceRiceCap ? this.getProvinceRiceCap(p) : Infinity, Math.round(Math.max(20, this.aiBaseKoku(p) / 1000) * 1.5));
    const commCap = (p) => this.getProvinceCommerceCap ? this.getProvinceCommerceCap(p) : Math.round(this.aiBaseKoku(p) / 2000 * 1.5);
    let idle = 0;
    for (let k = 0; k < 60 && budget >= 20 && idle < 3; k++) {
      const kind = k % 3; // 0: 開発 1: 境の城普請 2: 治安
      let spent = 0;
      if (kind === 0) {
        const p = owned.filter(q => (Number(q.rice) || 0) < riceCap(q) || (Number(q.commerce) || 0) < commCap(q))
          .sort((a, b) => ((Number(a.commerce) || 0) / Math.max(1, commCap(a))) - ((Number(b.commerce) || 0) / Math.max(1, commCap(b))) || String(a.id).localeCompare(String(b.id)))[0];
        if (p && e.gold >= B.devGoldCost && budget >= B.devGoldCost) {
          e.gold -= B.devGoldCost; spent = B.devGoldCost;
          p.rice = Math.min(riceCap(p), (Number(p.rice) || 0) + B.devGain);
          p.commerce = Math.min(commCap(p), (Number(p.commerce) || 0) + B.devGain);
        }
      } else if (kind === 1) {
        const p = border.filter(q => (Number(q.defense) || 0) < 100).sort((a, b) => (Number(a.defense) || 0) - (Number(b.defense) || 0))[0];
        if (p && e.gold >= 20) { e.gold -= 20; spent = 20; p.defense = Math.min(100, (Number(p.defense) || 0) + 3); }
      } else {
        // 徴兵には回さない（兵の上限まで双方が積み増して膨らむため）。代わりに治安を整える
        const p = owned.filter(q => (Number(q.order) || 0) < 95).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))[0];
        if (p && e.gold >= 20) { e.gold -= 20; spent = 20; p.order = Math.min(100, (Number(p.order) || 0) + 3); }
      }
      if (spent > 0) { budget -= spent; idle = 0; } else idle++;
    }
    return start - e.gold;
  },

  aiCapitalOf(clanId) {
    const owned = (this.provinces || []).filter(p => p.ownerId === clanId);
    if (!owned.length) return null;
    const scenCap = this.currentScenario?.capitals?.[clanId];
    const reg = (window.CLAN_CAPITAL_PROVINCES || {})[clanId];
    const hit = owned.find(p => p.id === scenCap) || owned.find(p => p.id === reg);
    if (hit) return hit;
    try { return this.pickFallbackCapital(owned, clanId) || owned[0]; } catch (e) { return owned[0]; }
  },

  aiBattleCap(nClans) {
    const B = this.aiBalance();
    return Math.max(B.battleCapMin, Math.min(B.battleCapMax, B.battleCapBase + Math.floor(nClans / B.battleCapPerClans)));
  },

  /** 安定した比較用の揺らぎ（同じ季・同じキーなら同じ値） */
  aiJitter(key, span = 10) {
    let h = 2166136261 ^ (this.year * 4 + (this.seasonIdx || 0));
    const s = String(key);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 10000) / 10000 * span - span / 2;
  },

  // ----------------------------------------------------------------------------
  // 防衛：後方からの段階輸送・本拠優先・プレイヤー大軍正面への事前集結
  // ----------------------------------------------------------------------------,

  executeAiDefenseReinforcements() {
    if (!this.provinces || this.provinces.length === 0) return;
    const B = this.aiBalance();
    const allClanIds = [...new Set(this.provinces.map(p => p.ownerId))].filter(id => id && id !== this.playerClanId && id !== 'null' && id !== 'ronin');
    for (const clanId of allClanIds) {
      const own = this.provinces.filter(p => p.ownerId === clanId);
      if (own.length <= 1) continue;
      const ownIds = new Set(own.map(p => p.id));
      const capital = this.aiCapitalOf(clanId);
      const hostileNbrs = (p) => (p.neighbors || []).map(id => this.aiProvById(id))
        .filter(n => n && n.ownerId && n.ownerId !== clanId && !this.isAllied(clanId, n.ownerId));
      // 各国の必要兵力
      const info = new Map();
      own.forEach(p => {
        const enemies = hostileNbrs(p);
        const isFront = enemies.length > 0;
        let threat = 0, playerBig = false;
        enemies.forEach(n => {
          const t = (Number(n.troops) || 0) * (n.ownerId === this.playerClanId ? 1.25 : 1);
          if (t > threat) threat = t;
          if (n.ownerId === this.playerClanId && (Number(n.troops) || 0) >= Math.max(3000, (Number(p.troops) || 0) * 1.2)) playerBig = true;
        });
        const isCap = capital && capital.id === p.id;
        let need = isFront ? threat * (playerBig ? 1.1 : 0.9) - (Number(p.troops) || 0) : 0;
        if (isCap) need = Math.max(need, (isFront ? 3000 : 2200) - (Number(p.troops) || 0));
        const weight = (playerBig ? 1.6 : 1) * (isCap ? 1.5 : 1) * (enemies.some(n => n.ownerId === this.playerClanId) ? 1.2 : 1);
        const reserve = isCap ? Math.max(2200, isFront ? threat * 0.9 : 0) : (isFront ? Math.max(1500, threat * 0.9) : 1200);
        info.set(p.id, { p, isFront, need, weight, reserve, playerBig, isCap, playerBorder: enemies.some(n => n.ownerId === this.playerClanId) });
      });
      const needy = [...info.values()].filter(x => x.need > 150)
        .sort((a, b) => (b.need * b.weight - a.need * a.weight) || String(a.p.id).localeCompare(String(b.p.id)))
        .slice(0, 3);
      if (!needy.length) continue;
      // 必要国からの距離（自領内の幅優先探索）
      const dist = new Map(); const queue = [];
      needy.forEach(x => { dist.set(x.p.id, 0); queue.push(x.p.id); });
      while (queue.length) {
        const id = queue.shift();
        const p = this.aiProvById(id);
        (p?.neighbors || []).forEach(nId => {
          if (!ownIds.has(nId) || dist.has(nId)) return;
          dist.set(nId, dist.get(id) + 1); queue.push(nId);
        });
      }
      const needySet = new Set(needy.map(x => x.p.id));
      const received = new Set();
      let moves = 0; const notes = [];
      const movers = [...info.values()].filter(x => !needySet.has(x.p.id) && dist.has(x.p.id))
        .sort((a, b) => (dist.get(a.p.id) - dist.get(b.p.id)) || ((Number(b.p.troops) || 0) - (Number(a.p.troops) || 0)));
      for (const m of movers) {
        if (moves >= B.defenseMaxMovesPerClan) break;
        if (received.has(m.p.id)) continue; // 今季受け取った兵は次の季に送る（段階輸送）
        const surplus = (Number(m.p.troops) || 0) - m.reserve;
        if (surplus < 150) continue;
        const d = dist.get(m.p.id);
        const next = (m.p.neighbors || []).filter(id => ownIds.has(id) && dist.get(id) === d - 1)
          .map(id => info.get(id))
          .sort((a, b) => ((needySet.has(b.p.id) ? 1 : 0) - (needySet.has(a.p.id) ? 1 : 0)) || (b.need * b.weight - a.need * a.weight) || String(a.p.id).localeCompare(String(b.p.id)))[0];
        if (!next) continue;
        const amount = Math.min(B.defenseMoveMax, Math.round(surplus * 0.5));
        if (amount < 150) continue;
        m.p.troops -= amount;
        next.p.troops = (Number(next.p.troops) || 0) + amount;
        next.need -= amount;
        received.add(next.p.id);
        moves++;
        if (next.playerBorder || needy.some(x => x.playerBorder && dist.get(next.p.id) <= 1)) notes.push(`${m.p.name}→${next.p.name} ${amount.toLocaleString()}人`);
      }
      if (notes.length && (!this.isAutoPlay || this.autoPlaySpeed >= 0.3)) {
        this.log(`🏯【後詰め・兵站】${this.getClanFamilyName(clanId)}は我が軍に備え、兵を前線へ送っています（${notes.slice(0, 3).join('、')}）。`);
      }
    }
  },

  // ----------------------------------------------------------------------------
  // 外交：対抗同盟・和睦・臣従・同盟破棄（史実同盟と包囲網はそのまま）
  // ----------------------------------------------------------------------------,

  aiClanStats() {
    const st = {};
    (this.provinces || []).forEach(p => {
      if (!p.ownerId || p.ownerId === 'null' || p.ownerId === 'ronin') return;
      const s = st[p.ownerId] ||= { provs: 0, troops: 0 };
      s.provs++; s.troops += Number(p.troops) || 0;
    });
    return st;
  },

  aiAddAlliance(members, kind, label, durationSeasons) {
    if (!this.alliances) this.alliances = [];
    this.alliances.push({ members: [...members], formedYear: this.year, formedSeason: this.seasonIdx, durationSeasons, kind, label });
  },

  aiCooledDown(a, b) {
    const key = [a, b].sort().join('|');
    const at = this.allianceCooldown ? this.allianceCooldown[key] : null;
    return at != null && (this.year * 4 + this.seasonIdx) - at < 4;
  },

  aiNotifyPlayer(title, message, color = '#e67e22') {
    try { this.showOrderResult(title, message, color); } catch (e) {}
  },

  executeAiDynamicDiplomacy() {
    const B = this.aiBalance();
    const st = this.aiClanStats();
    const player = this.playerClanId;
    const aiIds = Object.keys(st).filter(id => id !== player && this.clanHasLivingLord(id)).sort();
    if (aiIds.length < 2) return;
    // 直近4季の領国数の記録（劣勢判定用）
    this.aiDiploMemory = this.aiDiploMemory || {};
    const hist = this.aiDiploMemory.provHistory = this.aiDiploMemory.provHistory || {};
    Object.keys(st).forEach(id => { const h = hist[id] = hist[id] || []; h.push(st[id].provs); if (h.length > 5) h.shift(); });
    Object.keys(hist).forEach(id => { if (!st[id]) delete hist[id]; });

    const provsSorted = aiIds.map(id => st[id].provs).sort((a, b) => a - b);
    const median = provsSorted[Math.floor(provsSorted.length / 2)] || 1;
    const borders = (a, b) => this.clansShareBorder(a, b);

    // 1) 共通の強敵に対する臨時同盟（包囲網が結成済みならプレイヤー向けは包囲網に任せる）
    const strong = [];
    if (player && st[player] && !this.coalitionFormed && st[player].provs >= Math.max(10, median * 2.5)) strong.push(player);
    const topAi = aiIds.slice().sort((a, b) => (st[b].provs - st[a].provs) || a.localeCompare(b))[0];
    if (topAi && st[topAi].provs >= Math.max(8, median * 3)) strong.push(topAi);
    let formed = 0;
    const countKind = (...kinds) => (this.alliances || []).filter(g => !Array.isArray(g) && kinds.includes(g.kind)).length;
    if (countKind('counter') >= B.maxCounterAlliances) strong.length = 0;
    for (const S of strong) {
      const around = aiIds.filter(id => id !== S && borders(id, S) && !this.isAllied(id, S));
      for (let i = 0; i < around.length && formed < 1; i++) {
        for (let j = i + 1; j < around.length && formed < 1; j++) {
          const a = around[i], b = around[j];
          if (this.isAllied(a, b) || this.aiCooledDown(a, b)) continue;
          const chance = S === player ? B.counterAllianceChanceVsPlayer : B.counterAllianceChance;
          if (Math.random() > chance) continue;
          const sName = this.getClanFamilyName(S);
          this.aiAddAlliance([a, b], 'counter', `対${sName}同盟`, B.counterAllianceSeasons);
          formed++;
          const msg = `🤝【対抗同盟】${this.allianceClanLabel(a)}と${this.allianceClanLabel(b)}が、強大な${S === player ? '貴家' : sName}に対抗するため同盟を結びました（二年）。`;
          if (S === player) {
            this.log(msg, 'important');
            this.aiNotifyPlayer('⚠ 対抗同盟 結成', `${this.allianceClanLabel(a)}・${this.allianceClanLabel(b)}が貴家に対抗して同盟`, '#e67e22');
          } else {
            this.log(msg);
          }
        }
      }
    }

    // 2) 大きく劣勢な勢力の和睦・臣従（AI 同士のみ）
    let truces = 0, vassals = 0;
    const peaceRoom = countKind('truce', 'vassal') < B.maxPeacePacts;
    for (const W of (peaceRoom ? aiIds : [])) {
      if (truces >= 1 || vassals >= 1) break;
      const w = st[W]; if (!w || w.provs > 2) continue;
      const h = hist[W] || [];
      const lost = h.length >= 2 && Math.max(...h) > w.provs;
      const foes = aiIds.filter(X => X !== W && !this.isAllied(X, W) && borders(X, W))
        .filter(X => st[X].provs >= 3 * w.provs && st[X].troops >= 2.5 * w.troops)
        .sort((a, b) => (st[b].troops - st[a].troops) || a.localeCompare(b));
      // 直近に領国を失った、または兵力が強敵の2割未満のときだけ
      if (!foes.length || (!lost && w.troops >= 0.2 * st[foes[0]].troops)) continue;
      const X = foes[0];
      if (this.aiCooledDown(X, W)) continue;
      if (vassals < 1 && w.provs === 1 && st[X].provs >= 6 && Math.random() < B.vassalChance) {
        this.aiAddAlliance([X, W], 'vassal', '臣従', B.vassalSeasons);
        vassals++;
        this.log(`🙇【臣従】${this.allianceClanLabel(W)}は${this.allianceClanLabel(X)}の大軍を前に臣従し、その傘下に入りました。`);
      } else if (truces < 1 && Math.random() < B.truceChance) {
        this.aiAddAlliance([X, W], 'truce', '和睦', B.truceSeasons);
        truces++;
        this.log(`🕊️【和睦】${this.allianceClanLabel(W)}は劣勢のため、${this.allianceClanLabel(X)}と一年間の和睦を結びました。`);
      }
    }

    // 3) 強い勢力による同盟破棄（臣従・和睦・包囲網は対象外）
    const keep = [];
    let broken = 0;
    (this.alliances || []).forEach(g => {
      const members = this.allianceMembers(g);
      if (broken >= 1 || Array.isArray(g) || members.length !== 2 || ['vassal', 'truce', 'coalition'].includes(g.kind)) { keep.push(g); return; }
      if (this.allianceTurnsElapsed(g) < 4) { keep.push(g); return; }
      const [a, b] = members;
      const A = [a, b].filter(id => id !== player && st[id] && st[id].provs >= 6)
        .find(id => { const o = id === a ? b : a; return st[o] && st[id].provs >= 2.5 * st[o].provs && borders(id, o); });
      if (!A) { keep.push(g); return; }
      const partner = A === a ? b : a;
      if (this.coalitionFormed && partner !== player && borders(A, player) && borders(partner, player)) { keep.push(g); return; }
      const pers = getClanAbility(A).personality;
      if (pers === 'domestic' || pers === 'loyal') { keep.push(g); return; } // 義理堅い大名や内政型は同盟を一方的に破棄しない
      let chance = (pers === 'scheming') ? Math.min(0.85, (Number(B.breakChanceAggressive) || 0.35) * 1.8) // 梟雄は相手が弱ると積極的に破棄
                 : (pers === 'aggressive') ? (Number(B.breakChanceAggressive) || 0.35)
                 : (Number(B.breakChance) || 0.15);
      if (Math.random() > chance) { keep.push(g); return; }
      broken++;
      this.rememberAllianceBreak(members);
      const msg = `💔【同盟破棄】${this.allianceClanLabel(A)}は${partner === player ? '貴家' : this.allianceClanLabel(partner)}との同盟を一方的に破棄しました。`;
      if (partner === player) {
        this.log(msg, 'important');
        this.aiNotifyPlayer('💔 同盟破棄', `${this.allianceClanLabel(A)}が貴家との同盟を破棄しました！`, '#e74c3c');
      } else {
        this.log(msg);
      }
    });
    this.alliances = keep;
  },


  /**
   * AI思考改善第1弾: 大局観・戦略目標・背後急襲（隙突き）・要衝評価に基づく最適侵攻計画の策定
   * @param {string} clanId 
   * @param {object} tune 
   * @param {object} ability 
   * @returns {object|null} 最適な侵攻計画 { srcProv, target, attackForce, motive, score, powerRatio }
   */
  findBestInvasionPlan(clanId, tune, ability) {
    const clanProvs = (this.provinces || []).filter(p => p.ownerId === clanId);
    if (clanProvs.length === 0) return null;

    const personality = ability.personality || 'balanced';
    const threatened = this.clanFeelsThreatened(clanId);
    const myProvsCount = (this.provinces || []).filter(p => p.ownerId === this.playerClanId).length;

    // 最低出陣兵力を満たし、非同盟かつ自領以外の領国に隣接する前線城をすべて抽出
    const candidateFrontiers = clanProvs.filter(p => {
      if ((p.troops || 0) < tune.minSourceTroops) return false;
      return (p.neighbors || []).some(nId => {
        const n = this.provinces.find(x => x.id === nId);
        return n && n.ownerId !== clanId && !this.isAllied(clanId, n.ownerId);
      });
    });
    if (candidateFrontiers.length === 0) return null;

    // 本拠地・地域情報
    const capitalId = (window.CLAN_CAPITAL_PROVINCES && window.CLAN_CAPITAL_PROVINCES[clanId]) || clanProvs[0]?.id;
    const capitalProv = this.provinces.find(p => p.id === capitalId) || clanProvs[0];
    const capitalRegion = capitalProv?.region || null;

    // 上洛・畿内志向（天下を睨む大名）
    const KINAI_PROV_IDS = new Set(['yamashiro', 'south_omi', 'north_omi', 'settsu', 'kawachi', 'yamato', 'tamba', 'izumi', 'harima', 'iga', 'ise']);
    const isKyotoAmbitionClan = [
      'oda', 'takeda', 'uesugi', 'mori', 'hojo', 'tokugawa', 'imagawa',
      'miyoshi', 'ashikaga', 'hosokawa', 'asai', 'asakura', 'rokukaku'
    ].includes(clanId) || personality === 'aggressive' || this.coalitionFormed;

    const candidates = [];
    // 同盟国（攻略先の評価で使う）
    const myAllies = this.getAllies ? this.getAllies(clanId) : [];
    const allyRel = new Map();

    // 全前線城 × 隣接敵国の組み合わせを総当たりで戦略評価
    const BAL = this.aiBalance();
    for (const srcProv of candidateFrontiers) {
      const mainForce = Math.round(srcProv.troops * tune.forceRatio);
      const neighborTargets = (srcProv.neighbors || [])
        .map(nId => this.provinces.find(x => x.id === nId))
        .filter(n => n && n.ownerId !== clanId && !this.isAllied(clanId, n.ownerId) && !this.isTruceBlocked?.(clanId, n.ownerId));

      for (const target of neighborTargets) {
        // 兵の集中：攻め先に接する他の自領からも加勢（2026-10-11 cn）
        const supporters = [];
        if ((Number(BAL.aiSupportShare) || 0) > 0) {
          (target.neighbors || []).map(id => this.aiProvById(id))
            .filter(q => q && q.ownerId === clanId && q.id !== srcProv.id)
            .map(q => ({ prov: q, n: Math.floor(Math.min((Number(q.troops) || 0) * BAL.aiSupportShare, (Number(q.troops) || 0) - BAL.aiSupportKeep)) }))
            .filter(s => s.n >= 200).sort((a, b) => b.n - a.n).slice(0, Number(BAL.aiSupportMax) || 0)
            .forEach(s => supporters.push(s));
        }
        const attackForce = mainForce + supporters.reduce((s, x) => s + x.n, 0);
        const isTargetPlayer = target.ownerId === this.playerClanId;
        const isBlank = !target.ownerId || target.ownerId === 'null' || target.ownerId === 'undefined';

        // プレイヤー直前征服保護フラグ
        if (isTargetPlayer && target.justConquered) continue;

        // 1. 戦力比（Combat Power Ratio）の精密計算
        const targetAbility = isBlank
          ? { military: 45, politics: 45 }
          : getClanAbility(target.ownerId);

        const atkPowerEst = attackForce * ((ability.military || 65) / 65);
        const defDefenseFactor = Math.max(30, Number(target.defense) || 50) / 80;
        const defMoraleFactor = Math.max(30, Number(target.morale) || 70) / 80;
        const defMilFactor = (Number(targetAbility.military) || 60) / 65;
        const defPowerEst = Math.max(100, (Number(target.troops) || 500) * defDefenseFactor * defMoraleFactor * defMilFactor);

        const powerRatio = atkPowerEst / defPowerEst;
        const rawTroopRatio = attackForce / Math.max(1, Number(target.troops) || 1);

        // 勝算判定（必要比率を満たさない場合は無謀な突撃を自重）
        if (powerRatio < tune.requiredRatio && rawTroopRatio < tune.requiredRatio) continue;

        // 2. 戦略スコア算出 (初期値: 100)
        let score = 100;
        const motiveFactors = [];

        // --- A. 隙突き・背後急襲（脆弱度評価） ---
        let backstabScore = 0;
        if (target.troops <= 800) {
          backstabScore += 45;
        } else if (target.troops <= 1300) {
          backstabScore += 25;
        }
        if ((Number(target.defense) || 50) <= 40) {
          backstabScore += 30;
        } else if ((Number(target.defense) || 50) <= 55) {
          backstabScore += 15;
        }
        if ((Number(target.morale) || 70) <= 55) {
          backstabScore += 35;
        } else if ((Number(target.morale) || 70) <= 65) {
          backstabScore += 18;
        }
        if ((Number(target.order) || 80) <= 50) {
          backstabScore += 20;
        }
        if (!isBlank) {
          const friendlyNeighborsOfTarget = (target.neighbors || []).filter(nId => {
            const nb = this.provinces.find(x => x.id === nId);
            return nb && nb.ownerId === target.ownerId;
          }).length;
          if (friendlyNeighborsOfTarget === 0) {
            backstabScore += 30; // 完全孤立城
          } else if (friendlyNeighborsOfTarget === 1) {
            backstabScore += 15; // 突出部
          }
        }

        if (backstabScore > 0) {
          if (personality === 'scheming') backstabScore = Math.round(backstabScore * 1.6);
          else if (personality === 'aggressive') backstabScore = Math.round(backstabScore * 1.3);
          else if (personality === 'loyal') backstabScore = Math.round(backstabScore * 0.4); // 義に厚い大名は不意打ちを自重
          score += backstabScore;
          motiveFactors.push({
            type: 'backstab',
            title: personality === 'scheming' ? '梟雄の毒牙・背後急襲' : '背後急襲・虚を突く電撃戦',
            desc: `${target.name}の手薄な防備と動揺を見抜き、電撃奇襲`,
            weight: backstabScore
          });
        }

        // --- B. 空白地併合（内政型・小大名の手堅い領土拡張） ---
        if (isBlank) {
          let blankScore = 0;
          if (personality === 'domestic') {
            blankScore = 75;
          } else if (personality === 'balanced') {
            blankScore = 40;
          } else {
            blankScore = 20;
          }
          score += blankScore;
          motiveFactors.push({
            type: 'annex_blank',
            title: '無主の地を併合',
            desc: `空白地盤の${target.name}を併合し領国基盤を強化`,
            weight: blankScore
          });
        }

        // --- C. 大局観・戦略目標 ---
        // 1) 上洛・畿内回廊の掌握
        const isKinai = target.region === '近畿' || KINAI_PROV_IDS.has(target.id);
        if (isKinai && isKyotoAmbitionClan) {
          const kyotoScore = (target.id === 'yamashiro') ? 60 : 40;
          score += kyotoScore;
          motiveFactors.push({
            type: 'capital_push',
            title: '天下への道・上洛回廊',
            desc: `帝都・畿内へ向かう回廊を開かんと${target.name}へ進軍`,
            weight: kyotoScore
          });
        }

        // 2) 地方統一（同地域平定）
        if (capitalRegion && target.region === capitalRegion) {
          const unifyScore = 35;
          score += unifyScore;
          motiveFactors.push({
            type: 'unify_region',
            title: `${capitalRegion}地方の覇権確立`,
            desc: `${capitalRegion}地方一統を目指し同州の${target.name}へ出陣`,
            weight: unifyScore
          });
        }

        // 3) 経済・軍事要衝の争奪
        let resourceScore = 0;
        if (target.goldMine || target.silverMine) {
          resourceScore += 40;
        }
        if (target.specialty && /港|湊|海|貿易|鉄|刀|鉄砲/.test(target.specialty)) {
          resourceScore += 25;
        }
        if ((target.neighbors || []).length >= 5) {
          resourceScore += 20;
        }
        if (resourceScore > 0) {
          score += resourceScore;
          motiveFactors.push({
            type: 'resource_seize',
            title: '富国強兵・戦略要衝争奪',
            desc: `金山・湊など重要物資と交通の要衝たる${target.name}を攻略`,
            weight: resourceScore
          });
        }

        // --- D0. プレイヤーの手薄な国を狙う（2026-10-11 cn） ---
        if (isTargetPlayer) {
          const weak = attackForce / Math.max(1, Number(target.troops) || 0);
          const wb = Math.round(Math.min(Number(BAL.aiWeakTargetBonusMax) || 0, Math.max(0, (weak - (Number(BAL.aiWeakTargetRatio) || 1.5)) * 15)));
          if (wb > 0) { score += wb; motiveFactors.push({ type: 'backstab', title: '手薄な城を衝く', desc: `守りの薄い貴家領国・${target.name}を大軍で衝く`, weight: wb }); }
        }

        // --- D. プレイヤーに対する敵対心・包囲網 ---
        if (isTargetPlayer) {
          if (this.coalitionFormed) {
            const coalScore = 65;
            score += coalScore;
            motiveFactors.push({
              type: 'coalition_strike',
              title: '反覇権・包囲網一斉蜂起',
              desc: `諸侯包囲網の盟約に基づき、貴家領国・${target.name}へ総攻撃`,
              weight: coalScore
            });
          } else if (myProvsCount >= 12) {
            const containScore = 35;
            score += containScore;
            motiveFactors.push({
              type: 'contain_player',
              title: '強大勢力への牽制',
              desc: `勢力を伸ばす貴家を抑止すべく${target.name}へ侵攻`,
              weight: containScore
            });
          } else if (personality === 'aggressive') {
            const rivalScore = 25;
            score += rivalScore;
            motiveFactors.push({
              type: 'aggressive_rival',
              title: '好敵手との雌雄決戦',
              desc: `気鋭の武威を示さんと貴家領国・${target.name}へ出陣`,
              weight: rivalScore
            });
          } else if (personality === 'domestic' && !threatened) {
            score -= 40;
          }
        }

        // --- F. 攻略後の前線の長さ・二正面リスク・同盟国への配慮 ---
        {
          let newFront = 0, shielded = 0;
          const otherHostile = new Map();
          (target.neighbors || []).forEach(nId => {
            if (nId === srcProv.id) return;
            const n = this.aiProvById(nId);
            if (!n) return;
            if (n.ownerId === clanId) { shielded++; return; }
            if (!n.ownerId || n.ownerId === 'null') { newFront += 0.5; return; }
            if (this.isAllied(clanId, n.ownerId)) return;
            newFront++;
            if (n.ownerId !== target.ownerId) otherHostile.set(n.ownerId, (otherHostile.get(n.ownerId) || 0) + (Number(n.troops) || 0));
          });
          // 取った後に国境が縮む（自領に囲まれる）ほど加点、新たに接する敵国が多いほど減点
          const frontierScore = Math.max(-40, Math.min(30, Math.round(shielded * 8 - newFront * 7)));
          score += frontierScore;
          if (frontierScore >= 16) {
            motiveFactors.push({ type: 'consolidate', title: '国境の整理・領国一円化', desc: `${target.name}を取り込み国境線を縮める`, weight: frontierScore });
          }
          // 二正面：攻略先の周囲に別の強敵がいる／出陣後の留守城が別の敵に狙われる
          let twoFront = 0;
          otherHostile.forEach(troops => { if (troops >= attackForce * 0.6) twoFront += 15; });
          const srcRemain = (Number(srcProv.troops) || 0) - attackForce;
          let srcThreat = 0;
          (srcProv.neighbors || []).forEach(id => {
            const n = this.aiProvById(id);
            if (!n || n.id === target.id || !n.ownerId || n.ownerId === 'null' || n.ownerId === clanId || this.isAllied(clanId, n.ownerId)) return;
            srcThreat = Math.max(srcThreat, Number(n.troops) || 0);
          });
          if (srcThreat > srcRemain * 2) twoFront += 25;
          score -= Math.min(50, twoFront);
          // 同盟国への配慮：同盟国と国境を接して敵対する相手は共同戦線で加点、同盟国の盟友は減点
          if (!isBlank && myAllies.length) {
            let allyScore = 0;
            if (!allyRel.has(target.ownerId)) {
              let help = false, friend = false;
              myAllies.forEach(a => {
                if (a === target.ownerId) return;
                if (this.isAllied(a, target.ownerId)) friend = true;
                else if (this.clansShareBorder(a, target.ownerId)) help = true;
              });
              allyRel.set(target.ownerId, (help ? 12 : 0) - (friend ? 15 : 0));
            }
            allyScore = allyRel.get(target.ownerId);
            score += allyScore;
            if (allyScore > 0) motiveFactors.push({ type: 'ally_front', title: '同盟国との共同戦線', desc: `同盟国を脅かす${this.getClanFamilyName(target.ownerId)}の${target.name}を叩く`, weight: allyScore });
          }
        }

        // --- G. 他所と交戦中の相手を衝く（2026-10-11 cn） ---
        if (!isBlank && this._aiEngaged && this._aiEngaged.has(target.ownerId)) {
          const eb = Number(this.aiBalance().aiEngagedTargetBonus) || 0;
          if (eb) { score += eb; motiveFactors.push({ type: 'backstab', title: '他方面の戦の隙を衝く', desc: `他所で戦う${isTargetPlayer ? '貴家' : this.getClanFamilyName(target.ownerId)}の手薄な${target.name}を衝く`, weight: eb }); }
        }

        // --- E. 勝算ボーナスと揺らぎ ---
        score += Math.min(30, Math.max(0, (powerRatio - tune.requiredRatio) * 20));
        score += (Math.random() * 16 - 8);

        motiveFactors.sort((a, b) => b.weight - a.weight);
        const topMotive = motiveFactors[0] || {
          type: 'standard',
          title: '領国拡張の進軍',
          desc: `領土拡大と武威宣揚のため${target.name}へ進軍`,
          weight: 10
        };

        candidates.push({
          srcProv,
          target,
          attackForce,
          mainForce,
          supporters,
          score,
          powerRatio,
          motive: topMotive
        });
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  },

  async executeAiTurn() {
    // AI 勢力の収入（プレイヤーと同じ規則）
    this.aiCollectIncome();
    const B = this.aiBalance();
    this.executeAiDiplomacy();
    await this.executeAiStratagems();

    // 1. 兵力増加のゲームバランス適正化 (複利爆発を撤廃し、石高に応じた上限と性格別成長)
    // 観戦モードではプレイヤー家（既定の織田家など）も AI として増兵・侵攻する（ui_fixed12）
    const allClanIds = [...new Set(this.provinces.map(p => p.ownerId))].filter(id => this.isSpectatorMode || id !== this.playerClanId);

    // プレイヤー後方領国も治安良好なら緩やかに自然補充 (40〜80人)
    const myProvs = this.isSpectatorMode ? [] : this.provinces.filter(p => p.ownerId === this.playerClanId);
    myProvs.forEach(p => {
      const maxTroops = this.getProvinceTroopCap(p);
      if (!this.isProvinceFrontier(p) && (p.order || 80) >= 70 && p.troops < maxTroops) {
        const naturalRecovery = Math.round(40 + Math.random() * 40);
        p.troops = Math.min(maxTroops, p.troops + naturalRecovery);
      }
    });

    // AI諸大名の領国統治と兵備 (非同期ループでUIフリーズを防止)
    for (const clanId of allClanIds) {
      const clanProvs = this.provinces.filter(p => p.ownerId === clanId);
      if (clanProvs.length === 0) continue;

      const ability = getClanAbility(clanId);
      const personality = ability.personality; // aggressive / balanced / domestic
      const milRatio = (ability.military || 70) / 100;
      const polRatio = (ability.politics || 70) / 100;

      clanProvs.forEach(p => {
        // 兵力上限（初期兵力 + 石高×10%）でインフレを完全に防止
        const maxTroops = this.getProvinceTroopCap(p);

        if (personality === 'domestic') {
          // 内政型：城防・治安の維持が最優先、兵力は上限まで堅実に小幅補充（自国をガチガチに固める）
          const isBorder = (p.neighbors || []).some(nId => {
            const n = this.provinces.find(x => x.id === nId);
            return n && n.ownerId && n.ownerId !== clanId && !this.isAllied(clanId, n.ownerId);
          });
          // 城普請・治安維持は費用がかかる（払えない季は治安維持を小さく）
          if (this.aiSpend(clanId, B.domesticGoldPerProv, 0)) {
            p.defense = Math.min(100, p.defense + (isBorder ? 4 : 3));
            p.order = Math.min(100, (p.order || 80) + 4);
          } else {
            p.order = Math.min(100, (p.order || 80) + 1);
          }
          p.morale = Math.min(100, (Number(p.morale) || 70) + 1);
          // 開墾：ときどき石高が伸びる（基準石高の1.5倍まで）
          if (Math.random() < 0.2) {
            const init = (window.PROVINCES_DATA || []).find(item => item.id === p.id);
            const cap = Math.round((Number(init?.kokudaka) || 50000) / 1000 * 1.5);
            if (p.rice < cap) p.rice += 1;
          }
          if (p.troops < maxTroops) {
            p.troops += this.aiPayTroops(clanId, Math.min(maxTroops - p.troops, Math.round(100 + polRatio * 100)));
          }
        } else if (personality === 'balanced') {
          // バランス型：攻守の均衡
          p.defense = Math.min(100, p.defense + 1);
          if (p.troops < maxTroops) {
            p.troops += this.aiPayTroops(clanId, Math.min(maxTroops - p.troops, Math.round(130 + milRatio * 130)));
          }
        } else {
          // 攻勢型：前線に兵員を集中補充
          const isFrontier = (p.neighbors || []).some(nId => {
            const n = this.provinces.find(x => x.id === nId);
            return n && n.ownerId !== clanId;
          });
          const gain = isFrontier ? Math.round(200 + milRatio * 200) : Math.round(100 + milRatio * 90);
          if (p.troops < maxTroops) {
            p.troops += this.aiPayTroops(clanId, Math.min(maxTroops - p.troops, gain));
          }
          // 攻勢型は治安より軍備：後方の治安は緩む
          if (!isFrontier && (p.order || 80) > 60 && Math.random() < 0.3) p.order = (p.order || 80) - 1;
        }
      });

      // 余剰資金で開墾・商業開発
      this.aiDevelop(clanId, personality);
      this.aiSpendSurplus(clanId); // 予備費を超えた金の使い道（2026-10-11 ci）

      // 攻勢型：後方の余剰兵を隣接する自軍前線へ集中（兵站を顧みない前線集中）
      if (personality === 'aggressive') {
        const isFront = (q) => (q.neighbors || []).some(nId => {
          const n = this.provinces.find(x => x.id === nId);
          return n && n.ownerId !== clanId && !this.isAllied(clanId, n.ownerId);
        });
        clanProvs.filter(q => !isFront(q) && q.troops > 2200).forEach(q => {
          const front = (q.neighbors || [])
            .map(nId => this.provinces.find(x => x.id === nId))
            .filter(n => n && n.ownerId === clanId && isFront(n))
            .sort((a, b) => b.troops - a.troops)[0];
          if (!front) return;
          const move = Math.min(AI_PERSONALITY_TUNING.aggressive.frontShiftMax, Math.round((q.troops - 2000) * 0.30));
          if (move <= 0) return;
          q.troops -= move;
          front.troops += move;
        });
      }

      // メインスレッドのフリーズを防止するため非同期解放
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // 2. 敵AI防衛後詰め（劣勢・危機前線への救援増援）
    this.executeAiDefenseReinforcements();
    // 2b. プレイヤーのオート統治と同じ国境後詰め（内地から脅威のある境へ。2026-10-11 cn）
    if (B.aiBorderReinforce) {
      allClanIds.filter(id => id && id !== 'null' && id !== 'undefined' && id !== 'ronin').forEach(id => {
        if (this.provinces.filter(p => p.ownerId === id).length < 2) return;
        try { this.autoReinforceBorders(id, Number(B.aiBorderThreatRatio) || 1.2); } catch (e) {}
      });
    }
    // 交戦中の勢力（前の季とこの季の合戦。2026-10-11 cn）
    const warNow = new Set();
    this._aiEngaged = new Set(this._aiWarPrev || []);

    // 3. AI侵攻判断（「適宜バランスよく攻め込む」：1季の合戦上限は勢力数に応じて 3〜6）
    let battleCount = 0;
    const maxBattlesPerTurn = this.aiBattleCap(allClanIds.filter(id => id && id !== 'null' && id !== 'undefined' && id !== 'ronin' && this.clanHasLivingLord(id)).length);

    // 行動順をシャッフル（大名の攻勢型優先）
    const sortedClanIds = allClanIds.sort((a, b) => {
      const aAb = getClanAbility(a);
      const bAb = getClanAbility(b);
      const aScore = aAb.personality === 'aggressive' ? 2 : aAb.personality === 'balanced' ? 1 : 0;
      const bScore = bAb.personality === 'aggressive' ? 2 : bAb.personality === 'balanced' ? 1 : 0;
      return (bScore - aScore) || (this.aiJitter('turn:' + a, 1) - this.aiJitter('turn:' + b, 1)) || String(a).localeCompare(String(b));
    });

    for (const clanId of sortedClanIds) {
      if (battleCount >= maxBattlesPerTurn) break;
      // 領主のいない空白地（国人・土豪）や、当主不在の勢力は他国へ攻め込まない
      if (!this.clanHasLivingLord(clanId)) continue;

      const clanProvs = this.provinces.filter(p => p.ownerId === clanId);
      if (clanProvs.length === 0) continue;

      const ability = getClanAbility(clanId);
      const personality = ability.personality;

      // 性格に応じた侵攻確率の調整（AI_PERSONALITY_TUNING）
      // 凡庸・無名の世継ぎの家は、圧倒的に有利な時しか攻めない（ui_fixed12）
      const tune = ability.passiveHeir ? (window.PASSIVE_HEIR_TUNING || { attackProb: 0.03, requiredRatio: 2.5, forceRatio: 0.6, minSourceTroops: 2500, coalitionBoost: 0, coalitionCap: 0.03, ignoreRice: false, allianceBonus: 0.15, frontShiftMax: 300 })
        : (AI_PERSONALITY_TUNING[personality] || AI_PERSONALITY_TUNING.balanced);
      const threatened = this.clanFeelsThreatened(clanId);
      let attackProb = tune.attackProb;

      // 包囲網結成時やプレイヤー勢力拡大時は包囲網参加大名が好戦的に（内政型は控えめに）
      const myProvsCount = this.provinces.filter(p => p.ownerId === this.playerClanId).length;
      if (this.coalitionFormed || myProvsCount >= 12) {
        attackProb = Math.min(tune.coalitionCap, attackProb + tune.coalitionBoost);
      }
      // 内政型は多正面作戦をほぼ起こさない：既に他所で戦が起きている季は更に自重
      if (personality === 'domestic' && battleCount > 0 && !threatened) attackProb *= 0.5;

      // 兵糧事情：飢饉で石高が落ちている・冬季は、攻勢型以外は出陣を控える（攻勢型は兵糧を無視して出陣）
      if (!tune.ignoreRice) {
        const supply = this.aiClanSupplyRatio(clanId);
        if (supply < 0.75) attackProb *= personality === 'domestic' ? 0.2 : 0.5;
        if (this.seasonIdx === 3) attackProb *= personality === 'domestic' ? 0.4 : 0.75;
      }

      // 時機：秋（収穫後）は出陣しやすい。隣の敵が他所と交戦中なら出陣しやすい（2026-10-11 cn）
      if (this.seasonIdx === 2) attackProb *= Number(B.aiAutumnAttackMult) || 1;
      if (this._aiEngaged.size && clanProvs.some(p => (p.neighbors || []).some(id => { const n = this.aiProvById(id); return n && n.ownerId && n.ownerId !== clanId && this._aiEngaged.has(n.ownerId) && !this.isAllied(clanId, n.ownerId); }))) {
        attackProb *= Number(B.aiEngagedAttackMult) || 1;
      }
      // 軍令権（領国数で1〜5）に応じた行動力補正：3を基準に1点あたり±5%
      if (typeof this.computeMaxApForClan === 'function') attackProb *= 0.85 + 0.05 * this.computeMaxApForClan(clanId);
      attackProb = Math.min(0.95, attackProb);

      if (Math.random() > attackProb) continue;

      // AI思考改善第1弾: 大局観・戦略目標・背後急襲（隙突き）に基づく最適侵攻計画の策定
      const plan = this.findBestInvasionPlan(clanId, tune, ability);
      if (!plan) continue;

      const { srcProv, target, attackForce, motive } = plan;
      const mainForce = Number.isFinite(plan.mainForce) ? plan.mainForce : attackForce; // 2026-10-11 cn
      const supporters = plan.supporters || [];

      // 出陣の兵糧（プレイヤーと同じ計算）。足りなければ出陣を見送る（兵糧を顧みない攻勢型は半分あれば強行）
      const riceCost = Math.max(B.attackRiceMin, Math.round(attackForce * B.attackRiceRate));
      const econA = this.aiEcon(clanId);
      if (econA) {
        if (econA.rice >= riceCost) {
          econA.rice -= riceCost;
        } else if (tune.ignoreRice && econA.rice >= riceCost / 2) {
          econA.rice = 0;
        } else {
          continue;
        }
      }

      // ===== 合戦発生！ =====
      battleCount++;
      warNow.add(clanId); if (target.ownerId && target.ownerId !== 'null') { warNow.add(target.ownerId); this._aiEngaged.add(target.ownerId); } // 2026-10-11 cn
      const isAttackingPlayer = target.ownerId === this.playerClanId && !this.isSpectatorMode;
      const attackerName = this.getClanFamilyName(clanId);
      const defenderName = isAttackingPlayer
        ? `我が${this.playerDaimyo?.clan || '軍'}` : this.getClanFamilyName(target.ownerId);

      // 攻め込んだ時の効果音再生！
      const sfxKey = `${this.year}-${this.seasonIdx}`;
      const canPlayBattleSfx = (!this.isAutoPlay || this.autoPlaySpeed >= 0.3) && this._aiBattleSfxSeason !== sfxKey;
      if (canPlayBattleSfx) this._aiBattleSfxSeason = sfxKey;
      if (isAttackingPlayer) {
        // プレイヤーへの攻撃時：緊迫した法螺貝と激しい陣太鼓！
        if (canPlayBattleSfx) {
          this.audio.playHoragai(0.95);
          setTimeout(() => {
            this.audio.playTaiko(1.4);
            this.audio.playGachaGacha(1.2);
          }, 280);
        }
      } else {
        // AI同士の合戦時：遠くで響く陣太鼓で臨場感を演出！
        if (canPlayBattleSfx) {
          this.audio.playTaiko(0.75);
        }
      }

      // 戦闘結果の計算 (各大名軍事能力反映 + 陣形三すくみ・地形)
      const isBlankTarget = !target.ownerId || target.ownerId === 'null';
      const targetAbility = isBlankTarget
        ? { military: 45, politics: 45 }
        : getClanAbility(target.ownerId);

      const atkForm = this.pickEnemyFormation(clanId, target, null);
      const defForm = this.pickEnemyFormation(target.ownerId, target, atkForm);
      const rps = this.getRpsMultipliers(atkForm, defForm);
      const atkTerrain = this.getTerrainDealtBonus(atkForm, target);
      const defTerrain = this.getTerrainDealtBonus(defForm, target);
      // 項目27（2026-10-11 az）攻城の落城率で判定（プレイヤー攻城・委任軍と同じ computeSiegeOdds。基準70%、守将は配下補佐込みの実効能力）
      const siegeOdds = this.computeSiegeOdds({
        attackerClanId: clanId, srcProv, dstProv: target, attackTroops: attackForce, defenders: Number(target.troops) || 0,
        formation: { dealt: rps.dealt, taken: rps.taken, atkTerrain, defTerrain }
      });
      // AI 勢力の個別補正（ui_fixed12）：攻めの成功率・守りの粘り
      let siegeP = siegeOdds.p;
      const atkBoost = this.aiClanBoost(clanId);
      const defBoost = isBlankTarget ? null : this.aiClanBoost(target.ownerId);
      if (atkBoost && atkBoost.attackOddsMult) siegeP = Math.min(0.95, siegeP * atkBoost.attackOddsMult);
      if (defBoost) {
        const ownedN = this.provinces.filter(p => p.ownerId === target.ownerId).length;
        const m = (defBoost.smallClanDefendOddsMult && ownedN <= (defBoost.smallClanProvinces || 0)) ? defBoost.smallClanDefendOddsMult : defBoost.defendOddsMult;
        if (m) siegeP = siegeP * m;
      }
      const attackerWins = Math.random() < siegeP;

      // 出陣兵は全数を出陣元から差し引き、合戦後の生存兵だけが攻略先へ移る（敗退時は生存兵が帰還）
      srcProv.troops = Math.max(0, (Number(srcProv.troops) || 0) - mainForce);
      supporters.forEach(s => { s.prov.troops = Math.max(0, (Number(s.prov.troops) || 0) - s.n); }); // 加勢の国からも出陣（2026-10-11 cn）

      if (attackerWins) {
        const remainTroops = Math.max(Math.min(500, attackForce), Math.round(attackForce * 0.65)); // 項目27 az：出陣兵を超えて増えない
        const oldOwner = target.ownerId;
        this.handleProvinceLoss(target, oldOwner);
        target.ownerId = clanId;
        target.troops = remainTroops;
        target.defense = Math.max(35, target.defense - 25);
        target.morale = 75;
        // 余勢の制圧（大大名のみ。プレイヤー領でも同じ規則、本拠は取らない。2026-10-11 bo）
        try { this.applyMomentumCaptures(clanId, oldOwner, target, { isPlayer: false }); } catch (e) {}

        if (isAttackingPlayer) {
          // 領地喪失は年代記にだけ静かに記録（2026-10-11 bn）
          if (window.SHOW_CONQUEST_ALERTS) this.audio.playHyoshigi();
          let battleTitle = '⚔️ 敵軍侵攻！領地喪失';
          let battleLogIcon = '⚔';
          if (motive.type === 'backstab') {
            battleTitle = '⚡ 敵襲！手薄を衝かる';
            battleLogIcon = '⚡';
          } else if (motive.type === 'capital_push') {
            battleTitle = '👑 敵襲！上洛の要衝奪取';
            battleLogIcon = '👑';
          } else if (motive.type === 'coalition_strike') {
            battleTitle = '🔥 包囲網蜂起！領地喪失';
            battleLogIcon = '🔥';
          } else if (motive.type === 'resource_seize') {
            battleTitle = '💎 要衝争奪！領地喪失';
            battleLogIcon = '💎';
          }

          this.log(`${battleLogIcon}【敵襲・${motive.title}】${attackerName}軍が${motive.desc}として${target.name}に侵攻！我が守備軍は敗れ城を奪われました！`, 'quiet');
          if (window.SHOW_CONQUEST_ALERTS) this.showOrderResult(battleTitle, `${target.name} が ${attackerName}に攻略されました！ (${motive.title})`, '#e74c3c');
          if (this.selectedProvId === target.id) {
            this.selectedProvId = null;
          }
        } else {
          this.log(`⚔【群雄動乱・${motive.title}】${attackerName}が${motive.desc}として${target.name}へ進攻！激闘の末、${defenderName}軍を破り領国を奪回・併合しました。`, 'quiet');
          // 他国の大名が国を取った際のアラートは省略（戦国年代記の記録のみ）
          // 御家滅亡チェック
          if (oldOwner && oldOwner !== 'null') {
            const remainingDefProvs = (this.provinces || []).filter(p => p.ownerId === oldOwner);
            if (remainingDefProvs.length === 0) {
              this.log(`【御家滅亡】名門・${defenderName}は全領国を失い、完全に滅亡しました！`, 'important');
              // 滅亡のアラート（アイキャッチ通知）は省略し、戦国年代記の記録で確認
              try { this.audio.playHyoshigi?.(); } catch(e) {}
            }
          }
        }
      } else {
        // 撃退
        const defRemain = Math.max(300, Math.round(target.troops * 0.75));
        target.troops = defRemain;
        target.defense = Math.max(20, target.defense - 15);
        srcProv.troops += Math.round(mainForce * 0.40); // 生存兵の帰還（損耗六割は従来どおり）
        supporters.forEach(s => { if (s.prov.ownerId === clanId) s.prov.troops = (Number(s.prov.troops) || 0) + Math.round(s.n * 0.40); }); // 加勢の生存兵も帰還（2026-10-11 cn）

        if (isAttackingPlayer) {
          const repelKey = `${this.year}-${this.seasonIdx}`;
          if (this._aiRepelSfxSeason !== repelKey) { this._aiRepelSfxSeason = repelKey; this.audio.playFanfare(); }
          this.log(`🛡【防衛成功】${attackerName}軍による${target.name}侵攻（${motive.title}）を、我が守備隊が頑強に撃退しました！`, 'important');
          this.showOrderResult('🛡️ 敵襲撃退！', `${target.name}にて ${attackerName}軍の撃退に成功しました！`, '#2ecc71');
        } else {
          this.log(`🛡【防戦】${defenderName}軍が${target.name}にて${attackerName}軍の猛攻（${motive.title}）を退けました。`);
        }
      }
    }
    this._aiWarPrev = [...warNow]; // 次の季の「交戦中」（2026-10-11 cn）
  },

  executeGovernanceTurn() {
    const myProvs = (this.provinces || []).filter(p => p.ownerId === this.playerClanId);
    let domesticCount = 0;
    let militaryCount = 0;
    let logisticsCount = 0;
    let totalMovedTroops = 0;
    const conqueredProvinces = [];

    // 1. 各方針に基づく領国発展・徴募・兵站
    myProvs.forEach(p => {
      const effStats = this.getEffectiveStats(p.id);
      const mult = effStats.isDirectRule ? 0.5 : 1.0;
      const polBonus = (effStats.politics || 50) / 70;
      const milBonus = (effStats.military || 50) / 70;

      if (p.governance === 'domestic') {
        // 内政委任の知能化: 治安が危険（65以下）な場合は、一揆防止のため治安回復・徳政を最優先！
        if ((Number(p.order) || 80) <= 65) {
          p.order = Math.min(100, (Number(p.order) || 80) + Math.round(14 * mult * polBonus));
          p.defense = Math.min(100, (Number(p.defense) || 50) + Math.round(3 * mult));
        } else {
          const dRice = Math.round(20 * mult * polBonus);
          const dComm = Math.round(20 * mult * polBonus);
          p.rice = Math.min(this.getProvinceRiceCap(p), (Number(p.rice) || 50) + dRice); // 上限（2026-10-11 bh）
          p.commerce = Math.min(this.getProvinceCommerceCap(p), (Number(p.commerce) || 50) + dComm); // 上限（2026-10-11 bl）
          this.gold += Math.round(30 * mult * polBonus);
          this.rice += Math.round(40 * mult * polBonus);
        }
        domesticCount++;
      } else if (p.governance === 'military') {
        p.troops = (Number(p.troops) || 0) + Math.round(300 * mult * milBonus);
        p.defense = Math.min(100, (Number(p.defense) || 50) + Math.round(6 * mult));
        p.morale = Math.min(100, (Number(p.morale) || 70) + Math.round(4 * mult));
        militaryCount++;
      } else if (p.governance === 'balanced') {
        if ((Number(p.order) || 80) <= 60) {
          p.order = Math.min(100, (Number(p.order) || 80) + Math.round(10 * mult));
        }
        p.troops = (Number(p.troops) || 0) + Math.round(150 * mult * milBonus);
        p.rice = Math.min(this.getProvinceRiceCap(p), (Number(p.rice) || 50) + Math.round(8 * mult * polBonus)); // 上限（2026-10-11 bh）
        p.commerce = Math.min(this.getProvinceCommerceCap(p), (Number(p.commerce) || 50) + Math.round(8 * mult * polBonus)); // 上限（2026-10-11 bl）
        p.defense = Math.min(100, (Number(p.defense) || 50) + Math.round(3 * mult));
      } else if (p.governance === 'logistics') {
        // 兵站委任の知能化: 最も支援を必要としている危機前線へ重点ピストン輸送！
        if ((p.troops || 0) > 2500) {
          const surplus = Math.min(1000, (p.troops || 0) - 1000);
          const frontierCandidates = (p.neighbors || [])
            .map(nId => this.provinces.find(x => x.id === nId))
            .filter(x => x && x.ownerId === this.playerClanId && this.isProvinceFrontier(x));

          if (frontierCandidates.length > 0) {
            frontierCandidates.sort((a, b) => {
              const aEnemyTroops = (a.neighbors || [])
                .map(nId => this.provinces.find(x => x.id === nId))
                .filter(x => x && x.ownerId !== this.playerClanId)
                .reduce((sum, x) => sum + (x.troops || 0), 0);
              const bEnemyTroops = (b.neighbors || [])
                .map(nId => this.provinces.find(x => x.id === nId))
                .filter(x => x && x.ownerId !== this.playerClanId)
                .reduce((sum, x) => sum + (x.troops || 0), 0);
              const aNeed = aEnemyTroops * 0.6 - (a.troops || 0);
              const bNeed = bEnemyTroops * 0.6 - (b.troops || 0);
              return bNeed - aNeed;
            });

            const bestFrontier = frontierCandidates[0];
            p.troops -= surplus;
            bestFrontier.troops = (bestFrontier.troops || 0) + surplus;
            totalMovedTroops += surplus;
            logisticsCount++;
          }
        }
      }
    });

    // 2. 軍事委任領国による「戦略的自律進攻」（勝算と大局観に基づき確実に領土拡大）
    const militaryFrontiers = myProvs.filter(p => p.governance === 'military' && this.isProvinceFrontier(p));
    const attackedProvIds = new Set();
    let attackActions = 0;
    const maxAutonomousAttacks = 3;

    // 全ての軍事委任前線城 × 隣接敵国の組み合わせを戦略スコアリング評価
    const autonomousCandidates = [];
    for (const srcProv of militaryFrontiers) {
      if ((srcProv.troops || 0) < 1500) continue;
      const attackForce = Math.round((srcProv.troops || 0) * 0.72);
      const enemyNeighbors = (srcProv.neighbors || [])
        .map(nId => this.provinces.find(x => x.id === nId))
        .filter(n => n && n.ownerId !== this.playerClanId && !this.isAllied(this.playerClanId, n.ownerId) && !this.isTruceBlocked?.(this.playerClanId, n.ownerId));

      for (const target of enemyNeighbors) {
        const isBlank = !target.ownerId || target.ownerId === 'null';
        const srcEff = this.getEffectiveStats(srcProv.id);
        const targetEff = isBlank ? { military: 40 } : this.getEffectiveStats(target.id);

        const atkPowerEst = attackForce * ((Number(srcEff.military) || 60) / 60);
        const defDefenseFactor = Math.max(30, Number(target.defense) || 50) / 80;
        const defMoraleFactor = Math.max(30, Number(target.morale) || 70) / 80;
        const defMilFactor = (Number(targetEff.military) || 60) / 60;
        const defPowerEst = Math.max(100, (Number(target.troops) || 500) * defDefenseFactor * defMoraleFactor * defMilFactor);

        const powerRatio = atkPowerEst / defPowerEst;
        const troopRatio = attackForce / Math.max(1, Number(target.troops) || 1);

        // 勝算判定: 勝算が足りない場合は無謀な自爆特攻を自重！
        if (powerRatio < 1.05 && troopRatio < 1.15) continue;

        let score = 100;
        let motiveTitle = '領土拡大';

        if (isBlank) {
          score += 70; // 空白地は無血開城できる最優先目標！
          motiveTitle = '空白地の無血併合';
        } else {
          if ((target.troops || 0) <= 1000) { score += 35; motiveTitle = '手薄な守備への急襲'; }
          if ((Number(target.defense) || 50) <= 45) { score += 25; motiveTitle = '城防脆弱地の強襲'; }
          if ((Number(target.morale) || 70) <= 60) { score += 25; motiveTitle = '敵士気動揺への急襲'; }
          if (target.goldMine || target.silverMine) { score += 30; motiveTitle = '金山要衝の奪取'; }
        }
        score += Math.min(30, (powerRatio - 1.0) * 20);

        autonomousCandidates.push({
          srcProv,
          target,
          attackForce,
          score,
          powerRatio,
          motiveTitle,
          srcEff,
          targetEff
        });
      }
    }

    autonomousCandidates.sort((a, b) => b.score - a.score);

    for (const plan of autonomousCandidates) {
      if (attackActions >= maxAutonomousAttacks) break;
      if (this.rice < 60) break;
      if (attackedProvIds.has(plan.target.id)) continue;
      if ((plan.srcProv.troops || 0) < plan.attackForce + 500) continue;

      const { srcProv, target, attackForce, motiveTitle, srcEff, targetEff } = plan;
      attackedProvIds.add(target.id);
      attackActions++;

      const isBlank = !target.ownerId || target.ownerId === 'null';
      const riceCost = Math.min(this.rice, Math.max(50, Math.round(attackForce * 0.1)));
      this.rice = Math.max(0, this.rice - riceCost);

      // 項目27（2026-10-11 az）委任軍も同じ落城率で判定
      const siegeOdds = this.computeSiegeOdds({ attackerClanId: this.playerClanId, srcProv, dstProv: target, attackTroops: attackForce, defenders: Number(target.troops) || 0 });
      const won = Math.random() < siegeOdds.p;

      const enemyClanId = target.ownerId;
      const enemyClanName = isBlank ? '無主' : this.getClanFamilyName(enemyClanId);

      if (won) {
        const remainTroops = Math.max(Math.min(1200, attackForce), Math.round(attackForce * 0.75)); // 項目27 az：出陣兵を超えて増えない
        srcProv.troops = Math.max(600, (srcProv.troops || 0) - attackForce);

        this.handleProvinceLoss(target, enemyClanId);
        target.ownerId = this.playerClanId;
        target.troops = remainTroops;
        target.defense = Math.max(50, target.defense || 50);
        target.morale = 80;
        target.governance = 'military';
        target.justConquered = true;

        conqueredProvinces.push({
          srcName: srcProv.name,
          targetName: target.name,
          enemyClanName: enemyClanName,
          motiveTitle
        });

        this.log(`🎌【委任軍快進撃・${motiveTitle}】${srcProv.name}の委任軍（城主:${srcEff.name}）が敵領【${target.name}】（${enemyClanName}）へ電撃進攻！見事攻略し我が領土に組み入れました！`, 'quiet');

          if (enemyClanId && enemyClanId !== 'null') {
            const remainingEnemyProvs = this.provinces.filter(p => p.ownerId === enemyClanId);
            if (remainingEnemyProvs.length === 0) {
              this.log(`【御家滅亡】${enemyClanName}は全領国を失い、完全に滅亡しました！`, 'important');
              // 滅亡のアラート（アイキャッチ通知）は省略し、戦国年代記の記録で確認
              try { this.audio.playHyoshigi?.(); } catch(e) {}
            }
          }
      } else {
        srcProv.troops = Math.max(500, (srcProv.troops || 0) - Math.round(attackForce * 0.35));
        target.troops = Math.max(300, Math.round((target.troops || 500) * 0.75));
        this.log(`⚔【委任軍合戦】${srcProv.name}の委任軍が【${target.name}】（${enemyClanName}）へ進攻するも、敵の堅い守りに阻まれ撤退しました。`);
      }
    }

    // 委任進攻結果の演出
    if (conqueredProvinces.length > 0 && window.SHOW_CONQUEST_ALERTS) { // 既定は通知なし（年代記のみ。2026-10-11 bn）
      try { this.audio.playFanfare?.(); } catch(e) {}
      const conqueredNames = conqueredProvinces.map(c => `${c.targetName} (${c.enemyClanName})`).join('・');
      this.showOrderResult('🎌 委任軍 領土攻略！', `${conqueredNames} を電撃攻略！`, '#2ecc71');
    }

    if (domesticCount > 0 || militaryCount > 0 || logisticsCount > 0 || conqueredProvinces.length > 0) {
      const conqueredMsg = conqueredProvinces.length > 0 ? `、前線委任軍が【${conqueredProvinces.length}カ国】を攻略領有` : '';
      this.log(`【委任統治報告】内政型${domesticCount}国で開発・治安維持、軍事進攻型${militaryCount}国で増強${conqueredMsg}、兵站型から前線へ兵${totalMovedTroops.toLocaleString()}人を輸送完了。`);
    }
  },

  // 自動セーブ,

};
