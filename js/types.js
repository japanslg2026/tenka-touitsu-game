/**
 * @file js/types.js - 戦国天下統一伝 JSDoc型定義マスター
 * バニラJavaScript環境において型安全性を確保し、プロパティのタイポを防止するための定義群
 */

/**
 * @typedef {Object} OfficerStats
 * @property {number} military - 武勇 (0-120)
 * @property {number} politics - 内政 (0-120) ※JSONマスターの politic と相互運用
 * @property {number} stratagem - 知略 (0-120) ※JSONマスターの intel と相互運用
 * @property {number} [intellect] - 知力 (stratagemと同義のエイリアス)
 */

/**
 * @typedef {Object} Officer
 * @property {string} id - 武将一意ID (例: 'off_oda_nobunaga')
 * @property {string} name - 武将氏名 (例: '織田信長')
 * @property {string} [clanId] - 所属勢力ID (例: 'oda', 'ronin', 'null')
 * @property {string} [defaultProv] - 初期拠点の領国ID (例: 'owari')。fiefs があればシナリオ年の所領で上書き
 * @property {string} [originProv] - 出身国（真の生国・本貫）。UIの「出身」表示に使用
 * @property {Array<{from:number,to:number,province:string,castle?:string,clan?:string}>} [fiefs] - 時期別の所領
 * @property {string} [assignedProvId] - 現在の配置先領国ID (城代または駐屯国)
 * @property {string} [provId] - 現在所在領国ID (assignedProvIdのエイリアス)
 * @property {number} military - 武勇値 (0-120)
 * @property {number} [politics] - 内政値 (0-120)
 * @property {number} [politic] - 内政値 (JSONマスター初期プロパティ)
 * @property {number} [stratagem] - 知略値 (0-120)
 * @property {number} [intel] - 知略値 (JSONマスター初期プロパティ)
 * @property {number} [birthYear] - 生年 (西暦)
 * @property {number} [deathYear] - 没年 (西暦)
 * @property {string} [era] - 活躍年代区分
 * @property {string} [skill] - 保有特技・戦術名
 * @property {string} [lore] - 列伝・人物解説テキスト
 * @property {boolean} [isDaimyo] - 現在大名当主であるか
 * @property {boolean} [hasBeenDaimyo] - 過去に大名当主となったことがあるか
 * @property {boolean} [isCastellan] - 城代（城主）に任じられているか
 * @property {boolean} [isDead] - 死亡状態フラグ
 * @property {boolean} [actionDone] - 当該ターンに行動済みか
 * @property {number} [loyalty] - 忠誠度 (0-100)
 */

/**
 * @typedef {Object} Province
 * @property {string} id - 領国ID (例: 'owari', 'kai')
 * @property {string} name - 領国和名 (例: '尾張', '甲斐')
 * @property {string} [reading] - 領国読み (例: 'おわり')
 * @property {string} [region] - 地方区分 (例: '東海', '甲信')
 * @property {string|null} ownerId - 支配大名ID (領有勢力ID。空白地はnullまたは'ronin')
 * @property {string} [castle] - 本城名 (例: '清洲城', '躑躅ヶ崎館')
 * @property {string} [castleName] - 本城名 (castleと同義)
 * @property {number} kokudaka - 石高 (基本経済力)
 * @property {number} [commerce] - 商業値
 * @property {number} [commercial] - 商業値 (JSONマスター初期キー)
 * @property {number} troops - 駐留兵力 (兵員数)
 * @property {number} [military] - 兵力初期値 (JSONマスターキー)
 * @property {number} rice - 兵糧備蓄 (石)
 * @property {number} [gold] - 金銭備蓄 (両)
 * @property {number} defense - 城防衛度 (0-100)
 * @property {number} order - 治安度 (0-100)
 * @property {number} [loyalty] - 領民忠誠度 / 治安 (JSON初期キー)
 * @property {'direct'|'delegated'|string} [governance] - 統治方針 ('direct': 親政, 'delegated': 委任)
 * @property {string|null} [jodaiId] - 任命城代武将ID
 * @property {string|null} [governorId] - 任命城代武将ID (jodaiIdと同義)
 * @property {string[]} [neighbors] - 隣接領国IDリスト
 * @property {string[]} [specialties] - 領国特産品リスト
 * @property {boolean} [isCapital] - 本拠地（首都）フラグ
 * @property {number} [cx] - SVG地図X座標
 * @property {number} [cy] - SVG地図Y座標
 * @property {string} [d] - SVGパス定義データ
 */

/**
 * @typedef {Object} PlayableDaimyo
 * @property {string} id - 大名家勢力ID (例: 'oda', 'takeda')
 * @property {string} name - 当主武将氏名 (例: '織田信長')
 * @property {string} [clan] - 家名 (例: '織田家', '武田家')
 * @property {string} color - 勢力テーマカラー (16進数カラーコード)
 * @property {string} crest - 簡易家紋文字 (例: '織', '武')
 * @property {string} kamonSvgId - 家紋SVGシンボルID (例: 'kamon-oda')
 * @property {string} difficulty - 難易度表記 (例: '初級', '中級', '上級', '★')
 * @property {number} winRate - 推定勝率 (%)
 * @property {string} startProvId - 初期本拠地領国ID (例: 'owari')
 * @property {number} provCount - 支配領国数
 * @property {string[]} [myProvinces] - 領有国IDリスト
 * @property {number} gold - 初期軍資金
 * @property {number} rice - 初期兵糧
 * @property {'aggressive'|'domestic'|'balanced'|string} [personality] - AI性格
 * @property {string} [tactic] - 固有戦術名
 * @property {string} [tacticDesc] - 固有戦術効果解説
 * @property {OfficerStats} [stats] - 当主基礎能力値
 * @property {string} [officerId] - 当主武将ID (例: 'off_oda_nobunaga')
 * @property {string} [desc] - 勢力解説文
 * @property {string} [scenarioLeaderName] - シナリオ原本の当主名
 */

/**
 * @typedef {Object} Scenario
 * @property {string} id - シナリオID (例: '1560', '1582')
 * @property {number} year - 開始年 (西暦)
 * @property {'春'|'夏'|'秋'|'冬'|string} season - 開始季節
 * @property {number} seasonIdx - 季節インデックス (0: 春, 1: 夏, 2: 秋, 3: 冬)
 * @property {string} title - シナリオ本題 (例: '桶狭間の戦い')
 * @property {string} [subtitle] - シナリオ副題
 * @property {string} [gengo] - 元号年号 (例: '永禄3年')
 * @property {string[][]} [alliances] - 初期同盟ペアリスト
 * @property {string} desc - シナリオ背景説明
 * @property {string} [lore_background] - 歴史背景詳細
 * @property {string} [lore_factions] - 主要勢力図詳細
 * @property {string} [lore_focus] - 焦点解説
 * @property {Object<string, string>} owners - 領国支配者マップ { provId: clanId }
 * @property {Object<string, string>} castles - 領国城名マップ { provId: castleName }
 * @property {Object<string, string>} [capitals] - 勢力本拠地マップ { clanId: provId }
 * @property {PlayableDaimyo[]} playables - 選択可能大名リスト
 * @property {string} [recommendedClan] - 推奨大名勢力ID
 */

/**
 * @typedef {Object} HistoricalEventChoice
 * @property {string} label - 選択肢ボタン文言
 * @property {string} [desc] - 選択肢解説テキスト
 * @property {Object} [effects] - 選択時のパラメータ変動
 * @property {Function} [action] - 選択時実行コールバック
 */

/**
 * @typedef {Object} HistoricalEvent
 * @property {string} id - イベントID (例: 'okehazama', 'honnouji')
 * @property {string} title - イベント名称
 * @property {number} year - 発生年
 * @property {string} [season] - 発生季節
 * @property {string} desc - 出来事テキスト
 * @property {string} [triggerClan] - 発生主体勢力ID
 * @property {Function} [condition] - 発動判定関数 (game) => boolean
 * @property {HistoricalEventChoice[]} [choices] - IF分岐選択肢
 */

/**
 * @typedef {Object} AllianceBond
 * @property {string} clanA - 盟主勢力ID
 * @property {string} clanB - 相手勢力ID
 * @property {number} remainingSeasons - 残り有効季節数 (ターン数)
 * @property {number} [startYear] - 締結年
 * @property {number} [startSeason] - 締結季節インデックス
 */

/**
 * @typedef {Object} GameSaveData
 * @property {number} version - セーブデータ構造バージョン
 * @property {string} currentScenarioId - シナリオID
 * @property {number} year - 現在年
 * @property {number} seasonIdx - 現在季節 (0-3)
 * @property {string} playerClanId - プレイヤー大名勢力ID
 * @property {string} [currentWeather] - 現在の天候
 * @property {Province[]} provinces - 領国状態配列 (差分保存最適化対象)
 * @property {Officer[]} activeOfficers - アクティブ武将配列 (差分保存最適化対象)
 * @property {AllianceBond[]} alliances - 現在の同盟関係
 * @property {string[]} triggeredHistoricalEvents - 発生済み歴史イベントID一覧
 * @property {string[]} formerDaimyoIds - 元大名武将ID一覧
 * @property {Object} [stats] - 戦績統計
 */

export {};
