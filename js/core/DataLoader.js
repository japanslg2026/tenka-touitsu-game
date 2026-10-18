/**
 * @file js/core/DataLoader.js - ゲームデータの非同期ロード管理
 * 戦国天下統一伝 ES6モジュール
 * @typedef {import('../types.js').Scenario} Scenario
 * @typedef {import('../types.js').Officer} Officer
 * @typedef {import('../types.js').Province} Province
 * @typedef {import('../types.js').PlayableDaimyo} PlayableDaimyo
 * @typedef {import('../types.js').HistoricalEvent} HistoricalEvent
 */

export class DataLoader {
  /**
   * 全ゲームデータを非同期で並列フェッチし、統合データオブジェクトを生成する
   * @returns {Promise<{scenarios: Scenario[], officers: Officer[], provinces: Province[], clans: Object, clanAbilities: Object, clanCapitals: Object, governors: Object, jodaiClans: Object, pinnedGovernors: Object, historicalEvents: Object, castleChanges: Object, daimyoLifespans: Object}>}
   */
  static async loadAllData() {
    try {
      const v = '20261017otomo';
      const [scenarios, officers, provinces, clansData, governorsData, eventsData] = await Promise.all([
        DataLoader.fetchJson(`data/scenarios.json?v=${v}`),
        DataLoader.fetchJson(`data/officers.json?v=${v}`),
        DataLoader.fetchJson(`data/provinces.json?v=${v}`),
        DataLoader.fetchJson(`data/clans.json?v=${v}`),
        DataLoader.fetchJson(`data/governors.json?v=${v}`),
        DataLoader.fetchJson(`data/events.json?v=${v}`)
      ]);

      const gameData = {
        scenarios: scenarios || [],
        officers: officers || [],
        provinces: provinces || [],
        clans: clansData?.clans || {},
        clanAbilities: clansData?.abilities || {},
        clanCapitals: clansData?.capitals || {},
        governors: governorsData?.governors || {},
        jodaiClans: governorsData?.jodaiClans || {},
        pinnedGovernors: governorsData?.pinnedGovernors || {},
        historicalEvents: eventsData?.historicalEvents || {},
        castleChanges: eventsData?.castleChanges || {},
        daimyoLifespans: eventsData?.daimyoLifespans || {}
      };

      // 既存のコードとの100%完全な互換性を確保するためのグローバル参照同期
      DataLoader.syncGlobalReferences(gameData);

      return gameData;
    } catch (err) {
      console.warn('DataLoader: fetch failed or running under restricted protocol (e.g. file://). Attempting fallback.', err);
      // フォールバック: 既存グローバルデータが存在すればそれを利用
      if (typeof window !== 'undefined' && window.SCENARIOS_DATA && window.PROVINCES_DATA) {
        return {
          scenarios: window.SCENARIOS_DATA || [],
          officers: window.OFFICERS_MASTER || [],
          provinces: window.PROVINCES_DATA || [],
          clans: window.CLAN_MASTER_DATA || {},
          clanAbilities: window.CLAN_ABILITIES || {},
          clanCapitals: window.CLAN_CAPITAL_PROVINCES || {},
          governors: window.SCENARIO_HISTORICAL_GOVERNORS || {},
          jodaiClans: window.JODAI_CLAN_BY_SCENARIO || {},
          pinnedGovernors: window.PINNED_SCENARIO_GOVERNORS || {},
          historicalEvents: window.HISTORICAL_EVENTS_DATA || {},
          castleChanges: window.HISTORICAL_CASTLE_CHANGES || {},
          daimyoLifespans: window.DAIMYO_LIFESPAN_DATA || {}
        };
      }
      throw err;
    }
  }

  /**
   * JSONファイルをfetchしてパース
   * @param {string} url 
   * @returns {Promise<any>}
   */
  static async fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} while fetching ${url}`);
    }
    return await res.json();
  }

  /**
   * 既存コードとの互換性のためグローバル変数を安全に同期
   * @param {Object} data 
   */
  static syncGlobalReferences(data) {
    if (typeof window === 'undefined') return;

    window.SCENARIOS_DATA = data.scenarios;
    window.SCENARIOS = data.scenarios;
    window.OFFICERS_MASTER = data.officers;
    window.PROVINCES_DATA = data.provinces;
    window.INITIAL_PROVINCES = data.provinces;
    window.CLAN_MASTER_DATA = data.clans;
    window.CLAN_MASTER = data.clans;
    window.CLAN_ABILITIES = data.clanAbilities;
    window.CLAN_CAPITAL_PROVINCES = data.clanCapitals;
    window.SCENARIO_HISTORICAL_GOVERNORS = data.governors;
    window.JODAI_CLAN_BY_SCENARIO = data.jodaiClans;
    window.PINNED_SCENARIO_GOVERNORS = data.pinnedGovernors;
    window.HISTORICAL_EVENTS_DATA = data.historicalEvents;
    window.HISTORICAL_CASTLE_CHANGES = data.castleChanges;
    window.DAIMYO_LIFESPAN_DATA = data.daimyoLifespans;
  }
}
