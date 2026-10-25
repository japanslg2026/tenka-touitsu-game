/**
 * @file js/app.js - 戦国天下統一伝 メインエントリーポイント (ES6モジュール)
 * @typedef {import('./types.js').Officer} Officer
 * @typedef {import('./types.js').Province} Province
 * @typedef {import('./types.js').PlayableDaimyo} PlayableDaimyo
 * @typedef {import('./types.js').Scenario} Scenario
 * @typedef {import('./types.js').HistoricalEvent} HistoricalEvent
 * @typedef {import('./types.js').AllianceBond} AllianceBond
 * @typedef {import('./types.js').GameSaveData} GameSaveData
 */

import { GameState, GameStateMethods } from './core/GameState.js?v=20261025_d74';
import { UIManager, UIManagerMethods } from './ui/UIManager.js?v=20261025_d74';
import { MapRenderer, MapRendererMethods } from './render/MapRenderer.js?v=20261025_ui48';
import { ComputerLogic, ComputerLogicMethods } from './ai/ComputerLogic.js?v=20261025_ui49';
import { DataLoader } from './core/DataLoader.js?v=20261025_d74';
import * as GameRules from './core/GameRules.js?v=20261025_d74';

// 早期初期化: モジュール評価時点で即座に window.getClanAbility を配備
if (typeof window !== 'undefined') {
  window.getClanAbility = window.getClanAbility || function(clanId) {
    const abilities = window.CLAN_ABILITIES || {};
    return abilities[clanId] || abilities['default'] || { politics: 60, military: 60, stratagem: 55, personality: 'balanced' };
  };
}


// 重複武将統合IDエイリアスマップ (後方互換・セーブデータ・動的参照対応)
window.OFFICER_ID_ALIASES = {
  "off_pl1570_134": "off_eriguchi_nobutsune",
  "off_hist_1586_tamura_muneaki": "off_tamura_muneaki",
  "off_succ_ashina_1585_8": "off_ashina_yoshihiro",
  "off_pl1159_030": "off_dm_satake_1156",
  "off_pl1438_061": "off_dm_shoni_1438",
  "off_jd_348": "off_fujiwara_korenori_1028",
  "off_pl1400_040": "off_dm_mogami_1438",
  "off_abe_tadayoshi_1028": "off_dm_abe_939",
  "off_tomo_kaneyuki": "off_tomo_no_kaneyuki",
  "off_jd_113": "off_jd_172",
  "off_dm_ito_1495": "off_ito_korenaga",
  "off_dm_kono_1438": "off_dm_kono_1495",
  "off_dm_shiba_1438": "off_shiba_yoshitake",
  "off_dm_chosokabe_1495": "off_chosokabe_ketsugu",
  "off_dm_ashina_1467": "off_dm_ashina_1495",
  "off_dm_kyogoku_1333": "off_sasaki_doyo",
  "off_dm_akamatsu_1336": "off_akamatsu_enshin",
  "off_jo_nagashige": "off_dm_jo_1180",
  "off_dm_ando_1438": "off_ando_morisue",
  "off_dm_saika_1570": "off_saika_magoichi",
  "off_ononoyoshifuru": "off_ono_yoshifuru",
  "off_sadamori_kiyomori": "off_taira_kiyomori",
  "off_masakado_succ_5": "off_chiba_tsunetane",
  "off_tsunemoto_succ_4": "off_minamoto_yoshitomo",
  "off_dm_otomo_1156": "off_otomo_yoshinao_early_bridge",
  "off_sadamori_munemori": "off_taira_munemori",
  "off_tsunemoto_yoritomo": "off_minamoto_yoritomo",
  "off_dm_kono_1180": "off_kono_michinobu_early",
  "off_dm_satake_1180": "off_satake_hideyoshi",
  "off_heian_court_gotoba": "off_gotoba_in",
  "off_gotoba_in_as_goshirakawa": "off_gotoba_in",
  "off_masakado_succ_7": "off_dm_chiba_1221",
  "off_dm_shimazu_1221": "off_shimazu_proto_tadahisa",
  "off_sasakidoyo": "off_sasaki_doyo",
  "off_dm_ogasawara_1331": "off_ogasawara_sadamune",
  "off_dm_mori_1331": "off_mori_motoharu",
  "off_dm_otomo_1331": "off_otomo_sadamune",
  "off_dm_satomi_1331": "off_satomi_yoshitane",
  "off_dm_shimazu_1331": "off_shimazu_sadahisa",
  "off_dm_rokkaku_1336": "off_rokkaku_ujiyori",
  "off_dm_ouchi_1336": "off_ouchi_hiroyo",
  "off_dm_ogasawara_1350": "off_ogasawara_masahide",
  "off_hojo_tokiyuki_early": "off_hojo_tokiyuki",
  "off_dm_rokkaku_1438": "off_rokkaku_mitsutaka",
  "off_dm_satake_1438": "off_satake_yoshijin",
  "off_dm_chosokabe_1438": "off_chosokabe_fumikane",
  "off_dm_shimazu_1438": "off_shimazu_hisatoyo",
  "off_dm_rokkaku_1467": "off_rokkaku_takayori",
  "off_dm_jinbo_1467": "off_jinbo_nagasei",
  "off_dm_ashikaga_1495": "off_ashikaga_yoshitane",
  "off_dm_togashi_1495": "off_togashi_yasutaka",
  "off_dm_yamana_1495": "off_yamana_masatoyo",
  "off_dm_azai_1495": "off_azai_sukemasa_add",
  "off_dm_murakami_1495": "off_murakami_masakiyo",
  "off_dm_murakami_1467": "off_murakami_masakiyo",
  "off_dm_hosokawa_1495": "off_hosokawa_masamoto",
  "off_succ_mori_1668_95": "off_mori_yoshinari",
  "off_dm_kitabatake_1546": "off_kitabatake_harutomo",
  "off_dm_otomo_1546": "off_otomo_yoshiaki_early",
  "off_dm_fukuoka_kuroda_1868": "off_kuroda_nagashige",
  "off_dm_kumamoto_hosokawa_1868": "off_hosokawa_morihisa",
  "off_kyogoku_takatsugu_add": "off_kyogoku_takatsugu",
  "off_shimazu_tadashige_m": "off_shimazu_tadashige",
  "off_fujiwara_fuminori": "off_fujiwara_fumimoto",
  "off_okura_harumi": "off_okura_haruzane",
  "off_tsunemoto_yoriie": "off_minamoto_yoriie",
  "off_minamoto_sanetomo_yoshitomo": "off_minamoto_sanetomo",
  "off_tsunemoto_sanetomo": "off_minamoto_sanetomo",
  "off_ashikaga_yasuuji_yoshitomo": "off_ashikaga_yasuuhi",
  "off_ashikaga_ietoki_yoshitomo": "off_ashikaga_ietoki",
  "off_shimazu_proto_tadayoshi": "off_shimazu_tadatoki",
  "off_oyama_tomomasa": "off_koyama_tomomasa",
  "off_uesugi_sadakatsu_succ": "off_uesugi_sadakatsu",
  "off_masakado_succ_6": "off_chiba_shigeta",
  "off_utsunomiya_okitsuna_early_bridge": "off_utsunomiya_okitsuna",
  "off_soma_masatane_early_bridge": "off_soma_masatane",
  "off_kuroda_nagaaki": "off_kuroda_nagashige_fuk",
  "off_hosokawa_moritaka": "off_hosokawa_moritatsu",
  "off_takeda_nobuyoshi_early_bridge": "off_takeda_nobuyoshi_koke",
  "off_hosokawa_morishige": "off_hosokawa_morinari",
  "off_succ_gotoba_in_1220_18": "off_gosaga_in",
  "off_gosaga_in_bridge": "off_gosaga_in",
  "off_satake_yoshitsugu_bridge": "off_succ_satake_1723_148",
  "off_succ2_hachisuka_1558": "off_hachisuka_iemasa",
  "off_succ2_kakizaki_1829": "off_matsumae_takahiro_bridge",
  "off_edo_tokugawa_1823_32": "off_itakura_katsukiyo",
  "off_edo_tokugawa_1805_33": "off_yamada_hokoku",
  "off_edo_kumamoto_hosokawa_1804_212": "off_hosokawa_narimori",
  "off_kuroda_nagahiro2": "off_kuroda_nagahiro_han",
  "off_oguri_tadasumi": "off_oguri_kozukenosuke",
  "off_abe_masato": "off_abe_masakata",
  "off_mori_hidenori": "off_mori_hidemoto",
  "off_sasaki_hirotuna": "off_sasaki_hirotsuna",
  "off_katakura_kojuro": "off_katakura_kagenori",
  "off_succ_takeda_1630_194": "off_takeda_nobumasa_koke",
  "off_heian_court_goshira": "off_goshirakawa_in",
  "off_hosokawa_yusai_add": "off_hosokawa_fujitaka",
  "off_matsudaira_hidetada_m": "off_tokugawa_hidetada",
  "off_matsudaira_iemitsu_m": "off_tokugawa_iemitsu",
  "off_matsudaira_ietsuna_m": "off_tokugawa_ietsuna",
  "off_matsudaira_tsunayoshi_m": "off_tokugawa_tsunayoshi",
  "off_matsudaira_yoshinobu_m": "off_tokugawa_ienobu",
  "off_succ_takeda_1541_192": "off_anayama_baisetsu",
  "off_edo_matsue_1743_167": "off_edo_matsudaira_harusato",
  "off_matsudaira_yoritaka": "off_edo_matsudaira_yorizane",
  "off_dm_fujiwara_hiraizumi_1156": "off_fujiwara_motohira",
  "off_tsunemoto_succ_3": "off_minamoto_tameyoshi",
  "off_dm_so_1180": "off_dm_so_1156",
  "off_heian_court_succ3": "off_shirakawa_in",
  "off_sadamori_tadamori": "off_taira_tadamori",
  "off_shimazu_tadatoki_1221": "off_shimazu_tadatoki",
  "off_abe_tadayoshi_939": "off_dm_abe_939",
  "off_ooe_koretoki_anc": "off_ooe_koretoki_939",
  "off_taira_kimimasa_1028": "off_fujiwara_takamasa_1028",
  "off_taira_kimimasa_anc": "off_taira_kimimasa",
  "off_ando_sadasue": "off_dm_ando_1331",
  "off_jd_242": "off_dm_ando_1331",
  "off_jd_367": "off_dm_ando_1336",
  "off_jd_300": "off_abe_masato",
  "off_jd_311": "off_abe_chadayori",
  "off_jd_321": "off_date_munetsuna",
  "off_jd_add_003": "off_ito_tadakiyo",
  "off_jd_add_021": "off_edo_ii_1848_144",
  "off_jd_add_022": "off_edo_tokugawa_1800_62",
  "off_jd_234": "off_isshiki_norouji",
  "off_jd_add_009": "off_dm_ukita_1582",
  "off_jd_238": "off_masuda_kanemi",
  "off_jd_add_012": "off_masuda_motoyoshi",
  "off_jd_add_006": "off_masuda_fujikane",
  "off_jd_231": "off_dm_enyo_1331",
  "off_jd_453": "off_jd_092",
  "off_jd_add_010": "off_jd_031",
  "off_jd_319": "off_dm_kasai_1331",
  "off_ki_no_tsurayuki_real": "off_ki_no_tsurayuki",
  "off_ki_no_yoshihito_939": "off_ki_no_yoshito",
  "off_kikuchi_tsunetaka_1028": "off_kikuchi_fusasumi",
  "off_jd_205": "off_kikuchi_takenao",
  "off_jd_191": "off_yohiko_hidetake",
  "off_yoshihiko_hidetake": "off_yohiko_hidetake",
  "off_tachibana_kimiyori": "off_tachibana_kimiyori_real",
  "off_jd_add_007": "off_miyabe_keijun",
  "off_jd_add_013": "off_succ_kyogoku_1590_81",
  "off_jd_add_014": "off_kanamori_arishige",
  "off_jd_add_015": "off_edo_tokugawa_1590_81",
  "off_harada_tanenao_1156": "off_harada_tanenao",
  "off_minamoto_yoshitsuna_1087": "off_minamoto_yoshitsuna",
  "off_minamoto_yoshitsuna_1087_mikawa": "off_minamoto_yoshitsuna",
  "off_minamoto_tsunenari_1056_izumi": "off_minamoto_tsunenari_1056",
  "off_minamoto_nakamune_1087_shinano": "off_minamoto_nakamune_1087",
  "off_minamoto_yorikuni_1028": "off_minamoto_yorikuni",
  "off_minamoto_yorinobu": "off_minamoto_yorinobu_1028",
  "off_minamoto_yorichika_1028": "off_minamoto_yorichika",
  "off_minamoto_yorikiyo_1028_shinano": "off_minamoto_yorikiyo_1028",
  "off_jd_448": "off_edo_arao_narinao",
  "off_jd_125": "off_jd_074",
  "off_jd_221": "off_ko_no_moronao",
  "off_sasaki_shigekiyo_1221": "off_sasaki_shigekiyo",
  "off_hosokawa_yoriharu": "off_dm_hosokawa_1336",
  "off_jd_217": "off_dm_hosokawa_1336",
  "off_jd_232": "off_dm_hosokawa_1331",
  "off_miura_taneyoshi": "off_miura_taneyoshi_1221",
  "off_jd_229": "off_shiba_ienaga",
  "off_jd_270": "off_sakai_tadamochi",
  "off_jd_add_018": "off_edo_tokugawa_1597_86",
  "off_ono_yoshifuru_939": "off_ono_yoshifuru",
  "off_jd_220": "off_dm_shoni_1331",
  "off_jd_362": "off_dm_shoni_1336",
  "off_matsudaira_yoshitoh": "off_edo_matsue_1685_164",
  "off_matsudaira_norimura": "off_matsudaira_norisato_toba",
  "off_matsudaira_nobuzumi": "off_edo_matsue_1723_165",
  "off_jd_266": "off_edo_matsue_1601_161",
  "off_jd_286": "off_dm_matsue_1868",
  "off_jd_380": "off_dm_kuwana_1868",
  "off_jd_386": "off_uesugi_norisada",
  "off_jd_225": "off_uesugi_shigenori",
  "off_jd_add_020": "off_sanada_yukitaka_m",
  "off_jd_add_019": "off_masaki_yoritada",
  "off_jd_192": "off_kiyohara_iehira",
  "off_kiyohara_takehira_1087": "off_kiyohara_takehira",
  "off_jd_180": "off_kiyohara_takenori",
  "off_jd_243": "off_dm_chiba_1438",
  "off_jd_235": "off_dm_chiba_1331",
  "off_jd_288": "off_dm_maeda_1868",
  "off_jd_333": "off_dm_maeda_1600",
  "off_soma_yoshitane_2": "off_soma_yoshitane",
  "off_jd_446": "off_edo_ota_sukeyoshi",
  "off_otomo_ujiie_1336": "off_dm_otomo_1336",
  "off_jd_393": "off_otomo_chikayo",
  "off_succ_okayama_1687_118": "off_ikeda_tsugumasa",
  "off_succ_okayama_1745_119": "off_succ_okayama_1768_120",
  "off_jd_308": "off_nakamura_kazuuji",
  "off_jd_add_011": "off_cho_tsuratatsu",
  "off_taguchi_shigeyoshi_1156": "off_taguchi_shigeyoshi",
  "off_jd_163": "off_fujiwara_tamenori",
  "off_fujiwara_norimichi_1028": "off_fujiwara_norimichi",
  "off_jd_189": "off_fujiwara_tsunekiyo",
  "off_fujiwara_tsunesuke_1056_wakasa": "off_fujiwara_tsunesuke_1056",
  "off_fujiwara_koshin_1056_tango": "off_fujiwara_koshin_1028",
  "off_jd_add_002": "off_fujiwara_tsunetoshi",
  "off_jd_210": "off_fujiwara_kunihiro",
  "off_fujiwara_sukehira_1028": "off_fujiwara_sukehira",
  "off_fujiwara_sukehira_tajima": "off_fujiwara_sukehira",
  "off_jd_187": "off_fujiwara_sukehira",
  "off_fujiwara_saneyori_939": "off_fujiwara_saneyori",
  "off_fujiwara_munemichi_heian": "off_minamoto_tsunenari_1087_north_omi",
  "off_fujiwara_hidehira_brother": "off_fujiwara_hiderae",
  "off_jd_211": "off_fujiwara_hideyasu",
  "off_fujiwara_hidezumi_1221": "off_hidesato_succ_4",
  "off_fujiwara_suminori_939": "off_fujiwara_suminori",
  "off_jd_417": "off_taira_tadamoto_939",
  "off_fujiwara_munezane_1087_south_omi": "off_fujiwara_munezane_heian",
  "off_jd_add_001": "off_fujiwara_fumimoto",
  "off_fujiwara_yorimichi": "off_fujiwara_yorimichi_1028",
  "off_jd_add_008": "off_naito_takaharu",
  "off_jd_304": "off_dm_nanbu_1467",
  "off_jd_302": "off_dm_nanbu_1495",
  "off_jd_396": "off_dm_nanbu_1438",
  "off_jd_223": "off_nanbu_masanaga",
  "off_jd_268": "off_nanbu_toshimoto",
  "off_namba_tsuneto_1156": "off_namba_tsuneto",
  "off_tomo_kanechika_1087": "off_tomo_no_kanezada",
  "off_jd_add_017": "off_edo_tokugawa_1588_77",
  "off_jd_176": "off_taira_korehira",
  "off_taira_koreshige_1028": "off_taira_koremau",
  "off_jd_357": "off_taira_iesada_1156",
  "off_taira_iesada": "off_taira_iesada_1156",
  "off_taira_norimori_1156": "off_taira_norimori",
  "off_jd_add_004": "off_taira_sukemori",
  "off_taira_tsunemasa_1028": "off_taira_tsunemasa",
  "off_taira_tsunemasa_anc": "off_taira_tsunemasa",
  "off_jd_188": "off_taira_tsuneharu",
  "off_jd_190": "off_taira_masahira",
  "off_taira_korenobu_1087_suruga": "off_taira_masahira",
  "off_taira_masahira_1056": "off_taira_masahira",
  "off_taira_masahira_1087": "off_taira_masahira",
  "off_taira_masamori_1087_wakasa": "off_taira_masamori",
  "off_taira_morikuni_1156": "off_taira_morikuni",
  "off_jd_356": "off_taira_tomonori_1156",
  "off_jd_174": "off_taira_naokata",
  "off_taira_naokata_1028": "off_taira_naokata",
  "off_taira_naokata_1056": "off_taira_naokata",
  "off_jd_add_005": "off_taira_sadanou",
  "off_taira_sadamori_1156": "off_taira_sadanou",
  "off_taira_yorimori": "off_taira_yorimori_1156",
  "off_jd_395": "off_succ_kitabatake_1390_69",
  "off_senoo_kaneyasu_1156": "off_senoo_kaneyasu",
  "off_jd_230": "off_nawa_yoshitaka",
  "off_jd_add_016": "off_kimata_morikatsu",
  "off_jd_330": "off_satomi_yoshihiro",
  "off_jd_119": "off_edo_tachibana_1809_215",
  "off_jd_228": "off_wakiya_yoshisuke",
  "off_jd_397": "off_dm_ashina_1438",
  "off_jd_324": "off_ashina_morimune"
};

/**
 * 戦国天下統一伝 〜群雄割拠の覇道〜
 * 全10大歴史シナリオ、領国一括委任統治、厳選4大コマンド、攻城戦強化、自動セーブ再開、場面別BGM
 */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  // スマホ幅のときだけ、操作メニューと勢力状況の折りたたみを初期化する
  setupMobileLayout();
  setupMobileAlerts();
});

// スマホ用アラートの簡単・軽量表示（SweetAlert2のスマホ最適化・画面占有防止）
function setupMobileAlerts() {
  if (typeof window === 'undefined') return;
  const patchSwal = () => {
    if (!window.Swal || window._mobileSwalPatched) return;
    window._mobileSwalPatched = true;

    const origFire = window.Swal.fire.bind(window.Swal);
    window.Swal.fire = function(...args) {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && args.length > 0) {
        let opts = {};
        if (typeof args[0] === 'string') {
          opts.title = args[0];
          if (typeof args[1] === 'string') opts.html = args[1];
          if (typeof args[2] === 'string') opts.icon = args[2];
        } else if (typeof args[0] === 'object' && args[0] !== null) {
          opts = Object.assign({}, args[0]);
        }

        // スマホ画面では上部に配置し画面中央の占有を防止
        if (!opts.position) opts.position = 'top';

        // スマホ画面での文字見切れ防止（PC用の固定横幅を解除し画面幅に適応）
        if (opts.width && (typeof opts.width === 'number' && opts.width > 360 || typeof opts.width === 'string' && /px/.test(opts.width))) {
          delete opts.width;
        }

        // 包囲網警告表示の簡潔化（スマホ画面で画面いっぱいを占有しないよう要約）
        const isCoalition = (opts.title && /包囲網|反覇道/.test(opts.title)) || (opts.text && /包囲網|反覇道/.test(opts.text));
        if (isCoalition) {
          opts.title = '⚠ 反覇道包囲網 結成';
          opts.text = '諸大名が貴家打倒の包囲網を結成！国境防備を固めよ';
          delete opts.html;
        }

        // 確認ダイアログ（キャンセルボタン、入力項目等）ではない単なる通知/警告/完了アラート
        const isNotice = !opts.showCancelButton && !opts.showDenyButton && !opts.input && !opts.preConfirm;
        if (isNotice) {
          if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
          if (opts.allowEscapeKey === undefined) opts.allowEscapeKey = true;

          // スマホ用アラートは画面占有を避けるため、自動消去またはコンパクト表示に
          if (!opts.timer) {
            if (isCoalition || opts.icon === 'warning' || opts.icon === 'error') {
              opts.timer = 3200; // 警告系は3.2秒で自動消去（外側タップでも即消去）
              opts.timerProgressBar = true;
            } else {
              opts.timer = 2000; // 成功・案内系は2秒で自動消去
              opts.timerProgressBar = true;
            }
          }
          // ボタン文言もコンパクトに
          if (opts.confirmButtonText && opts.confirmButtonText.length > 4) {
            opts.confirmButtonText = '了解';
          }
        }
        return origFire(opts);
      }
      return origFire(...args);
    };
  };

  patchSwal();
  // 万一Swalが後から読み込まれた場合にも対応
  if (!window.Swal) {
    window.addEventListener('load', patchSwal, { once: true });
  }
}

// 画面幅768px以下のレイアウト切替（見た目だけ。ゲーム進行の計算は触らない）
function setupMobileLayout() {
  const mq = window.matchMedia('(max-width: 768px)');
  const headerControls = document.getElementById('headerControls');
  const headerToggle = document.getElementById('headerControlsToggle');
  const clanBar = document.getElementById('clanBar');
  const clanToggle = document.getElementById('clanBarToggle');

  // ボタン文言を、ピクトグラム1文字で表示（開閉時は✕）
  const refreshLabels = () => {
    if (!headerToggle || !clanToggle) return;
    const headerOpen = !!(headerControls && headerControls.classList.contains('is-open'));
    const clanOpen = !!(clanBar && clanBar.classList.contains('is-open'));
    headerToggle.innerHTML = headerOpen ? '✕' : '⚙️';
    clanToggle.innerHTML = clanOpen ? '✕' : '🏯';
    headerToggle.setAttribute('aria-expanded', headerOpen ? 'true' : 'false');
    clanToggle.setAttribute('aria-expanded', clanOpen ? 'true' : 'false');
  };

  // 地図の高さはレスポンシブCSS (38dvh) に委ねる
  const fitMobileMap = () => {
    const map = document.getElementById('mapWrapper');
    if (!map) return;
    map.style.height = '';
  };

  headerToggle?.addEventListener('click', () => {
    headerControls?.classList.toggle('is-open');
    refreshLabels();
    requestAnimationFrame(fitMobileMap);
  });

  clanToggle?.addEventListener('click', () => {
    const willOpen = !(clanBar && clanBar.classList.contains('is-open'));
    clanBar?.classList.toggle('is-open');
    refreshLabels();
    // 開いた金・兵糧・兵力が、下の固定バーに隠れない位置までスクロールする
    if (willOpen && mq.matches) {
      clanBar?.scrollIntoView({ block: 'end', inline: 'nearest' });
    }
    requestAnimationFrame(fitMobileMap);
  });

  // PC幅に戻したときはスマホ用の開閉状態を消し、元の全表示に戻す
  const syncToWidth = () => {
    if (!mq.matches) {
      headerControls?.classList.remove('is-open');
      clanBar?.classList.remove('is-open');
    }
    refreshLabels();
    requestAnimationFrame(fitMobileMap);
  };

  syncToWidth();
  mq.addEventListener('change', syncToWidth);
  window.addEventListener('resize', fitMobileMap);
  window.addEventListener('orientationchange', fitMobileMap);
}

// マスターデータベース群 (data.jsで定義されたグローバル配列・オブジェクトへの安全な参照)
var SCENARIOS = window.SCENARIOS_DATA || [];
var INITIAL_PROVINCES = window.PROVINCES_DATA || [];
var CLAN_MASTER = window.CLAN_MASTER_DATA || {};

// 史実イベントの受け取り先IDが地図上に無いとき、同じ家系として扱う別ID（先頭ほど優先）
// 源義朝家は頼朝が継ぐため、鎌倉源氏のイベントは義朝家へも渡す
var EVENT_CLAN_LINEAGE = [
  ['genji_yoritomo', 'minamoto_yoritomo', 'genji', 'minamoto_yoshitomo'],
  ['kiso', 'kiso_genji']
];

// 大名能力値取得ヘルパー
function getClanAbility(clanId) {
  const abilities = window.CLAN_ABILITIES || {};











  const base = abilities[clanId] || abilities['default'] || { politics: 60, military: 60, stratagem: 55, personality: 'balanced' };
  // 凡庸・無名の世継ぎが継いだ CPU 家は内政型・ほぼ攻めない（ui_fixed12）
  const g = window.game;
  const ov = (g && typeof g.getHeirTemperamentOverride === 'function') ? g.getHeirTemperamentOverride(clanId) : null;
  return ov ? { ...base, ...ov } : base;
}

// 史実の同盟。from/to は締結が史実に沿う年（両端含む）。remote は国境を接していなくても結べる盟約。
const HISTORICAL_ALLIANCE_BONDS = [
  { a: 'taira_sadamori', b: 'fujiwara_hidesato', from: 939, to: 941, label: '朝廷追討同盟', remote: true },
  { a: 'taira_sadamori', b: 'heian_court', from: 939, to: 941, label: '朝廷追討同盟', remote: true },
  { a: 'fujiwara_hidesato', b: 'heian_court', from: 939, to: 941, label: '朝廷追討同盟', remote: true },
  { a: 'minamoto_tsunemoto', b: 'heian_court', from: 1028, to: 1031, label: '忠常追討', remote: true },
  { a: 'fujiwara_hidesato', b: 'heian_court', from: 1028, to: 1031, label: '忠常追討', remote: true },
  { a: 'taira_sadamori', b: 'heian_court', from: 1028, to: 1031, label: '忠常追討', remote: true },
  { a: 'minamoto_tsunemoto', b: 'kiyohara', from: 1087, to: 1089, label: '義家・清衡同盟', remote: true },
  { a: 'minamoto_tsunemoto', b: 'fujiwara_hidesato', from: 1087, to: 1089, label: '坂東の援軍', remote: true },
  { a: 'goshirakawa_in', b: 'taira_kiyomori', from: 1156, to: 1159, label: '後白河・平氏同盟', remote: true },
  { a: 'genji_yoritomo', b: 'chiba', from: 1180, to: 1185, label: '鎌倉御家人' },
  { a: 'genji_yoritomo', b: 'kazusa_nosuke', from: 1180, to: 1185, label: '鎌倉御家人' },
  { a: 'genji_yoritomo', b: 'miura', from: 1180, to: 1185, label: '鎌倉御家人' },
  { a: 'genji_yoritomo', b: 'hojo_kamakura', from: 1180, to: 1199, label: '源氏・北条同盟' },
  { a: 'hojo_kamakura', b: 'chiba', from: 1200, to: 1333, label: '鎌倉御家人', remote: true },
  { a: 'hojo_kamakura', b: 'ando', from: 1200, to: 1333, label: '鎌倉御家人', remote: true },
  { a: 'hojo_kamakura', b: 'miura', from: 1200, to: 1247, label: '鎌倉御家人' },
  { a: 'godaiho', b: 'kusunoki', from: 1331, to: 1336, label: '宮方同盟' },
  { a: 'godaiho', b: 'nitta', from: 1331, to: 1338, label: '宮方同盟', remote: true },
  { a: 'godaiho', b: 'kitabatake', from: 1331, to: 1338, label: '宮方同盟', remote: true },
  { a: 'kusunoki', b: 'nitta', from: 1331, to: 1336, label: '宮方同盟', remote: true },
  { a: 'ashikaga', b: 'shiba', from: 1336, to: 1466, label: '足利・斯波同盟', remote: true },
  { a: 'ashikaga', b: 'hosokawa', from: 1336, to: 1466, label: '足利・細川同盟', remote: true },
  { a: 'ashikaga', b: 'uesugi_yamanouchi', from: 1438, to: 1455, label: '幕府・山内上杉同盟', remote: true },
  { a: 'hosokawa', b: 'ashikaga', from: 1467, to: 1477, label: '東軍同盟', remote: true },
  { a: 'yamana', b: 'hatakeyama_soshu', from: 1467, to: 1477, label: '西軍同盟', remote: true },
  { a: 'yamana', b: 'hatakeyama_noto', from: 1467, to: 1477, label: '西軍同盟', remote: true },
  { a: 'hatakeyama_soshu', b: 'hatakeyama_noto', from: 1467, to: 1477, label: '西軍同盟', remote: true },
  { a: 'hosokawa', b: 'hatakeyama_bishu', from: 1467, to: 1477, label: '東軍同盟', remote: true },
  { a: 'uesugi_yamanouchi', b: 'uesugi_ogigayatsu', from: 1490, to: 1546, label: '両上杉同盟' },
  { a: 'uesugi_yamanouchi', b: 'ashikaga_koga', from: 1540, to: 1546, label: '上杉・古河公方同盟' },
  { a: 'uesugi_ogigayatsu', b: 'ashikaga_koga', from: 1540, to: 1546, label: '上杉・古河公方同盟' },
  { a: 'takeda', b: 'hojo', from: 1554, to: 1568, label: '甲相同盟' },
  { a: 'takeda', b: 'imagawa', from: 1554, to: 1560, label: '甲駿同盟' },
  { a: 'hojo', b: 'imagawa', from: 1554, to: 1568, label: '相駿同盟' },
  { a: 'takeda', b: 'hojo', from: 1569, to: 1570, label: '甲相同盟' },
  { a: 'uesugi', b: 'hojo', from: 1571, to: 1578, label: '越相同盟', remote: true },
  { a: 'oda', b: 'tokugawa', from: 1562, to: 1582, label: '清洲同盟' },
  { a: 'azai', b: 'asakura', from: 1560, to: 1573, label: '浅井・朝倉同盟' },
  { a: 'oda', b: 'azai', from: 1567, to: 1570, label: '織田・浅井同盟' },
  { a: 'sue', b: 'mori', from: 1551, to: 1553, label: '陶・毛利の盟約' },
  { a: 'sue', b: 'otomo', from: 1551, to: 1556, label: '大内義長擁立の盟', remote: true },
  { a: 'oda', b: 'matsunaga', from: 1567, to: 1571, label: '織田・松永の盟約', remote: true },
  { a: 'shimazu', b: 'arima', from: 1584, to: 1587, label: '島津・有馬の盟約' },
  { a: 'takeda', b: 'honganji', from: 1570, to: 1573, label: '信長包囲網', remote: true },
  { a: 'mori', b: 'honganji', from: 1570, to: 1580, label: '毛利・本願寺同盟', remote: true },
  { a: 'takeda', b: 'mori', from: 1570, to: 1573, label: '甲斐・毛利同盟', remote: true },
  { a: 'ashikaga', b: 'takeda', from: 1570, to: 1573, label: '将軍・武田同盟', remote: true },
  { a: 'ashikaga', b: 'azai', from: 1570, to: 1573, label: '将軍・浅井同盟', remote: true },
  { a: 'ashikaga', b: 'asakura', from: 1570, to: 1573, label: '将軍・朝倉同盟', remote: true },
  { a: 'ashikaga', b: 'mori', from: 1570, to: 1573, label: '将軍・毛利同盟', remote: true },
  { a: 'azai', b: 'honganji', from: 1570, to: 1573, label: '浅井・本願寺同盟', remote: true },
  { a: 'satake', b: 'utsunomiya', from: 1550, to: 1590, label: '反北条同盟' },
  { a: 'uesugi', b: 'satake', from: 1561, to: 1578, label: '越後・佐竹同盟', remote: true },
  { a: 'mori', b: 'ukita', from: 1574, to: 1598, label: '毛利・宇喜多同盟' },
  { a: 'mori', b: 'kobayakawa', from: 1555, to: 1598, label: '毛利・小早川同盟' },
  { a: 'chosokabe', b: 'mori', from: 1575, to: 1585, label: '長宗我部・毛利同盟', remote: true },
  { a: 'toyotomi', b: 'tokugawa', from: 1584, to: 1598, label: '豊臣・徳川同盟', remote: true },
  { a: 'toyotomi', b: 'maeda', from: 1583, to: 1598, label: '豊臣・前田同盟', remote: true },
  { a: 'toyotomi', b: 'uesugi', from: 1586, to: 1598, label: '豊臣・上杉同盟', remote: true },
  { a: 'toyotomi', b: 'mori', from: 1582, to: 1598, label: '豊臣・毛利同盟', remote: true },
  { a: 'toyotomi', b: 'date', from: 1590, to: 1598, label: '豊臣・伊達同盟', remote: true },
  { a: 'toyotomi', b: 'shimazu', from: 1587, to: 1598, label: '豊臣・島津同盟', remote: true },
  { a: 'toyotomi', b: 'chosokabe', from: 1585, to: 1598, label: '豊臣・長宗我部同盟', remote: true },
  { a: 'oda', b: 'tokugawa', from: 1582, to: 1584, label: '織田・徳川同盟' },
  { a: 'tokugawa', b: 'date', from: 1600, to: 1600, label: '東軍同盟', remote: true },
  { a: 'tokugawa', b: 'mogami', from: 1600, to: 1600, label: '東軍同盟', remote: true },
  { a: 'tokugawa', b: 'maeda', from: 1600, to: 1600, label: '東軍同盟', remote: true },
  { a: 'tokugawa', b: 'kuroda', from: 1600, to: 1600, label: '東軍同盟', remote: true },
  { a: 'tokugawa', b: 'kato', from: 1600, to: 1600, label: '東軍同盟', remote: true },
  { a: 'tokugawa', b: 'ii', from: 1600, to: 1615, label: '徳川・井伊同盟', remote: true },
  { a: 'date', b: 'mogami', from: 1600, to: 1600, label: '東軍同盟' },
  { a: 'ishida', b: 'mori', from: 1600, to: 1600, label: '西軍同盟', remote: true },
  { a: 'ishida', b: 'ukita', from: 1600, to: 1600, label: '西軍同盟', remote: true },
  { a: 'ishida', b: 'uesugi', from: 1600, to: 1600, label: '西軍同盟', remote: true },
  { a: 'ishida', b: 'shimazu', from: 1600, to: 1600, label: '西軍同盟', remote: true },
  { a: 'ishida', b: 'chosokabe', from: 1600, to: 1600, label: '西軍同盟', remote: true },
  { a: 'uesugi', b: 'mori', from: 1600, to: 1600, label: '西軍同盟', remote: true },
  { a: 'mori', b: 'ukita', from: 1600, to: 1600, label: '西軍同盟' },
  { a: 'toyotomi', b: 'sanada', from: 1614, to: 1615, label: '大坂方同盟', remote: true },
  { a: 'toyotomi', b: 'chosokabe', from: 1614, to: 1615, label: '大坂方同盟', remote: true },
  { a: 'shimazu', b: 'mori', from: 1866, to: 1868, label: '薩長同盟', remote: true },
  { a: 'shimazu', b: 'tosa', from: 1867, to: 1868, label: '薩土同盟', remote: true },
  { a: 'mori', b: 'tosa', from: 1867, to: 1868, label: '長土同盟', remote: true },
  { a: 'meiji', b: 'shimazu', from: 1868, to: 1869, label: '官軍同盟', remote: true },
  { a: 'meiji', b: 'mori', from: 1868, to: 1869, label: '官軍同盟', remote: true },
  { a: 'meiji', b: 'tosa', from: 1868, to: 1869, label: '官軍同盟', remote: true },
  { a: 'aizu', b: 'date', from: 1868, to: 1868, label: '奥羽列藩同盟' },
  { a: 'aizu', b: 'uesugi', from: 1868, to: 1868, label: '奥羽越列藩同盟', remote: true },
  { a: 'date', b: 'uesugi', from: 1868, to: 1868, label: '奥羽越列藩同盟' },
  { a: 'aizu', b: 'tokugawa', from: 1868, to: 1868, label: '旧幕府同盟', remote: true },
  { a: 'tokugawa', b: 'kuwana', from: 1868, to: 1868, label: '旧幕府同盟', remote: true },
  { a: 'tokugawa', b: 'makino', from: 1868, to: 1868, label: '旧幕府同盟', remote: true },
  { a: 'aizu', b: 'makino', from: 1868, to: 1868, label: '奥羽越列藩同盟', remote: true }
];
const ALLIANCE_DURATION_SEASONS = 8;
const INITIAL_ALLIANCE_DURATION_SEASONS = 20;
const DAIMYOS = [];
const FORMATIONS_DATA = window.FORMATIONS_DATA || {};
const SENGOKU_HOUSE_CODES = {};
const SAMURAI_ANECDOTES = {};
const BATTLEFIELDS_CHRONICLES = {};
const DAIMYO_POLICIES = {};
const STRATEGIC_DOCTRINES = {};
const HISTORICAL_CHRONICLES = [];
const HISTORICAL_WARRIORS_LORE = [];
const HISTORICAL_TREASURES_LORE = [];
const COURT_RANKS_DATA = [];

// 大名専用 統一年代記・エピローグ定義
const DAIMYO_EPILOGUES = {
  chosokabe: {
    regime: '長宗我部幕府・四国共和の泰平',
    capital: '土佐・岡豊城（ならびに大坂城）',
    pillar1: '『長宗我部元親百箇条』の全国敷設。民百姓の田畑耕作権を不可侵とし、奢侈を戒め勤倹を尊ぶ質実剛健の法治を完成させた。',
    pillar2: '一領具足制の昇華による国民皆兵・産業一体の防衛体制。平時は新田開墾と治水に励み、有事には即座に規律ある軍勢を結集する強靭な国土を築いた。',
    pillar3: '黒潮航路と南蛮海運の掌握。土佐浦戸港および堺を対外貿易の拠点とし、海洋国家日本としての富を全国諸藩へ循環させた。',
    future10: '【統一後十年：礎の時代】岡豊城と大坂をつなぐ瀬戸内・黒潮海運が完成。『元親百箇条』により武士と民百姓の権利が法制化され、四国から全国へ質実剛健の徳政が浸透した。',
    future50: '【統一後五十年：海洋立国の黄金期】二代・三代へと政権が継承される中、一領具足の勤倹の精神が国民的気風へと定着。土佐・堺・長崎を起点とする南蛮貿易船団が東南アジア全域を往来し、世界屈指の海洋商業国家として繁栄を極めた。',
    future100: '【統一後百年〜近代へ：民権と平和の成熟】身分にとらわれず実力ある民衆を登用する気風は、後に自由民権の思想的土壌となり、アジアで最も早く民意を汲む近代立憲連邦へと発展を遂げた。',
    historianQuote: '『南海の覇者・長宗我部が築いた政権は、武断独裁を排し、民衆の勤労と海洋通商を尊んだ最も前進的な武家共和政の青写真であった』'
  },
  oda: {
    regime: '織田政権・天下布武の大創世',
    capital: '尾張・安土城',
    pillar1: '楽市楽座の全国徹底と関所全廃。商工業の自由化により経済の活力を最大化し、貨幣経済の飛躍的発展を牽引した。',
    pillar2: '兵農分離の断行と近代常備軍の創設。最新火縄銃の大量配備と専門軍人化により、揺るぎなき国防の礎を築いた。',
    pillar3: '安土城を頂点とする新時代の中央政権。南蛮文化と新式技術を積極的に導入し、日本の大航海時代を切り拓いた。',
    future10: '【統一後十年：大航海と近代化の曙】関所は完全に撤廃され、全国の街道と運河が整備された。安土城下には世界各地から商人・宣教師・職人が集い、世界有数の国際メトロポリスへと成長した。',
    future50: '【統一後五十年：産業革命の先駆け】西洋の活版印刷、天文学、製鉄、造船技術が全国に導入され、封建制を脱した近代工業の礎が築かれた。織田家の朱印船艦隊は太平洋とインド洋を横断し、黄金のジパングの英名を世界に轟かせた。',
    future100: '【統一後百年〜近代へ：世界の先進立国へ】身分にとらわれぬ才能主義が社会を牽引し、欧米列強の進出を先んじて跳ね返す強大な近代主権国家が完成。アジアにおいて他の追随を許さぬ科学・文化大国となった。',
    historianQuote: '『信長の天下布武は、中世の闇を百年前倒しで消し去った。もし織田政権が続いていなければ、近代世界における日本の飛躍はこれほど劇的ではなかったであろう』'
  },
  takeda: {
    regime: '武田幕府・風林火山の信義',
    capital: '甲斐・躑躅ヶ崎館',
    pillar1: '『甲州法度之次第』の全国拡充。武家法廷と公正な裁判制度を整備し、領民の信服を得る仁政を敷いた。',
    pillar2: '信玄堤の治水技術を天下の河川へ展開。大水害を克服して美田を創出し、飢饉のない豊かな社会を実現した。',
    pillar3: '赤備え騎馬隊の精強さを国防の象徴とし、諸大名との強固な信頼と同盟関係によって戦乱の再発を永遠に封じた。',
    future10: '【統一後十年：大治水と信義の確立】信玄堤の土木技術が利根川・信濃川・木曽川など全国の暴れ川へ展開され、大水害の時代が終焉。美田が各地に拓かれ、農民の暮らしは急速に安定した。',
    future50: '【統一後五十年：農本連邦の繁栄】「人は城、人は石垣」の格言通り、民意を汲む目安箱と公正無私な裁判制度が確立。諸大名の自主性を重んじる合議制連邦により、内戦の火種は完全に消し止められた。',
    future100: '【統一後百年〜近代へ：道徳と地方自治の結実】飢饉を知らぬ豊かな農業基盤と、信義を重んじる教育精神が全国民に浸透。地方自治と分権的連邦の模範として、近代日本の平和的民主制の礎となった。',
    historianQuote: '『武田の統治は、武力による威嚇ではなく民福と信義に基づいていた。その仁政と合議の思想は、後の日本における道徳的立憲主義の源流となった』'
  },
  uesugi: {
    regime: '上杉政権・義の天下泰平',
    capital: '越後・春日山城',
    pillar1: '『義』を根本規範とする国家統治。私利私欲の覇権争いを排し、天下の公儀を確立して道徳高き社会を創った。',
    pillar2: '毘沙門天信仰と崇高なる武士道の徹底。武人の誇りと清廉潔白を規範とし、乱世の殺伐とした人心を浄化した。',
    pillar3: '日本海航路の整備と特産青苧・交易の振興。民衆の暮らしを第一に据え、貧富の格差なき平穏な社会を築き上げた。',
    future10: '【統一後十年：義の公儀令の布告】「私利私欲のための合戦を永久に禁ず」。上杉の掲げた義の規範が全国諸侯に受諾され、弱き大名も強国に侵されぬ公儀の平和が確立された。',
    future50: '【統一後五十年：清廉なる道徳社会】武士には質素倹約と学問が義務づけられ、民衆には慈悲と公平な減税が施された。北前船が日本海を網の目のように結び、格差なき共栄の社会が花開いた。',
    future100: '【統一後百年〜近代へ：高潔なる精神大国】「義を見てせざるは勇なきなり」の教えは近代日本の最高道徳として世界に賞賛され、物質的繁栄に溺れぬ品格高き精神立国を成し遂げた。',
    historianQuote: '『力による支配ではなく、正義と倫理による天下統一を信じ抜いた上杉の治世は、乱世の暗雲に差した一筋の神光であった』'
  },
  tokugawa: {
    regime: '徳川幕府・二百有余年の泰平',
    capital: '三河・江戸城',
    pillar1: '幕藩体制の確立と武家諸法度の制定。諸大名の統率と適正な領地配置により、揺るぎない平和の秩序を固めた。',
    pillar2: '全国検地と石高制の均質化。農民の耕作基盤を安定させ、質素倹約を旨とする持続可能な社会を築いた。',
    pillar3: '儒学と礼節の重視。三河武士の忠義の気風を天下の鑑とし、武断から文治への見事な転換を成し遂げた。',
    future10: '【統一後十年：江戸天下普請と制度確立】巨大城下町・江戸の建設と五街道の整備。武家諸法度と参勤交代の礎が固まり、大名の反乱を構造的に封じる平和の骨格が完成した。',
    future50: '【統一後五十年：文治政治への大転換】四代・五代将軍の治世。戦を知らぬ世代が社会を支え、儒学と朱子学の振興により、刀を抜かぬ礼節と文治の社会が定着した。',
    future100: '【統一後百年〜二百年：世界史の奇跡・無戦の世紀】元禄・化政の町人文化が爛熟。浮世絵、歌舞伎、和算、国学が庶民の間に咲き誇り、人類史上類を見ない二百六十余年の平和を達成した。',
    historianQuote: '『平和の重みを何よりも知る徳川の忍耐と制度設計は、内戦を根絶し、日本独自の精緻で美しい文化を育む揺りかごとなった』'
  },
  mori: {
    regime: '毛利政権・三矢協調の連邦泰平',
    capital: '安芸・広島城',
    pillar1: '三本の矢の教えに基づく合議指導体制。一族と家臣団が結束し、独裁を排した安定感ある国家運営を実現した。',
    pillar2: '瀬戸内海運と石見銀山の掌握。豊富な鉱山資源と海上交易を背景に健全財政を確立した。',
    pillar3: '強力な水軍力と陸上防衛網の有機的結合。外敵の侵略を許さぬ海洋国家体制を築いた。',
    future10: '【統一後十年：三矢の合議制の敷設】広島城を中心に、諸侯が車座になって国政を議する「天下大会議」が定着。独裁の過ちを防ぐ協調体制が完成した。',
    future50: '【統一後五十年：銀山と瀬戸内海運の繁栄】石見銀山の近代採掘技術と瀬戸内の廻船網により、天下の財政は黒字化。飢饉に備える巨大な郷倉が全国に整備された。',
    future100: '【統一後百年〜近代へ：堅実なる海洋平和国家】一族団結と堅実経営の気風は、近代日本の商工業と金融制度の基盤となり、外敵の脅威に対しても盤石の結束で国を守り抜いた。',
    historianQuote: '『毛利の平和は派手さこそないが、最も崩れぬ堅牢さを誇った。「結束すれば折れぬ」という智恵は、国家百年の計の模範である』'
  },
  hojo: {
    regime: '北条幕府・四公六民の仁政',
    capital: '相模・小田原城',
    pillar1: '『四公六民』の低税率を天下に定着。民衆の負担を軽減し、農民と職人が安心して暮らせる仁政を敷いた。',
    pillar2: '小田原城郭技術を応用した全国の防災・防塁ネットワークの整備。外敵や災害から町と民を守る国土防備を完成させた。',
    pillar3: '目安箱と公正な裁判の徹底。領民の直訴を受け止め、官僚の不正を戒める清廉な法治社会を創り上げた。',
    future10: '【統一後十年：四公六民の天下敷設】過重な年貢に苦しんでいた全国の農民は歓喜し、新田開墾が爆発的に進展。小田原城下は天下第一の仁政の都となった。',
    future50: '【統一後五十年：民福と都市防災の完成】目安箱を通じて庶民の直訴が政治に直結。小田原総構えの土木技術が全国の治水・堤防に応用され、天災に強い国土が実現した。',
    future100: '【統一後百年〜近代へ：世界屈指の福祉社会へ】一人の餓死者も出さぬ備蓄制度と低税率により、民衆の富が蓄積。世界史上で最も早く「民の幸福を第一義とする福祉国家」が成熟した。',
    historianQuote: '『北条が天下を獲ったことは、日本の庶民にとって最大の福音であった。その四公六民の仁政は、後の福祉思想の不滅の原点である』'
  },
  shimazu: {
    regime: '島津幕府・薩摩雄飛と海洋国防の覇光',
    capital: '薩摩・鹿児島城（ならびに大坂城）',
    pillar1: '外城制と郷士制度の全国展開。質実剛健なる気風を天下に広め、不撓不屈の国防基盤を築き上げた。',
    pillar2: '琉球・南蛮交易路の全面開拓。最新の洋式造船術と火術を導入し、海洋国家日本の富を飛躍的に増大させた。',
    pillar3: '四兄弟結束の精神に基づく合議執政。一族重臣の和を尊び、戦傷病者を慈しむ手厚い施政を行った。',
    future10: '【統一後十年：郷士防衛網と南海貿易】全国要衝に外城制が布かれ、平時は農耕、有事は即座に国防を担う強靭な社会を構築。琉球・明・南蛮の貿易船が錦江湾と堺を埋め尽くした。',
    future50: '【統一後五十年：東アジア屈指の外洋海軍】最新の洋式反射炉、大砲鋳造、大型帆船建造が推進され、西洋列強の進出を先んじて抑止する無敵の海洋防衛線が確立された。',
    future100: '【統一後百年〜近代へ：世界列強と対等な近代国家へ】薩摩隼人の猛勇と進取の気性は、アジアが植民地化される波を完全に跳ね返し、誇り高き独立と近代化を両立させた。',
    historianQuote: '『島津の天下統一は、日本を外洋へと力強く押し出した。勇気と開明性を兼ね備えた薩摩の気風は、日本の主権を不抜のものとした』'
  },
  date: {
    regime: '伊達幕府・独眼竜の開放創生',
    capital: '陸奥・青葉城（仙台ならびに江戸城）',
    pillar1: '遣欧使節と太平洋航路の開拓。南蛮・西洋文明の知見を積極的に導入し、文化・学問・技術の先進立国を実現した。',
    pillar2: '奥羽の沃野を開墾し巨大運河網を整備。寒冷地農業を克服して天下の穀倉地帯を築き、飢饉なき社会を達成した。',
    pillar3: '伊達者と称された華麗なる文芸と工芸の振興。武辺一辺倒を脱し、雅と粋が息づく平和の黄金時代を創出した。',
    future10: '【統一後十年：太平洋航路と東国大回廊】慶長遣欧使節団の偉業を起点に、スペイン・ローマとの直接通商同盟を締結。青葉城下には西洋の天文台や医学校が開設された。',
    future50: '【統一後五十年：杜の都から世界都市へ】ガレオン船団が太平洋を横断し、奥羽の黄金と絹が世界中へ輸出された。「伊達者」の美意識が建築・美術・演劇を爛漫と咲かせた。',
    future100: '【統一後百年〜近代へ：東西文明の架け橋】鎖国することなく世界と対話し続けた伊達政権のもと、日本はルネサンスの活気を受け継ぎ、世界から仰がれる開明文明国として君臨した。',
    historianQuote: '『独眼竜政宗の天下は、日本を狭い島国から解き放った。その広大無辺な視野は、世界史の大海原へと日本を導いたのである』'
  },
  toyotomi: {
    regime: '豊臣政権・太閤泰平の黄金創世',
    capital: '山城・伏見城（ならびに大坂城）',
    pillar1: '太閤検地と刀狩令の断行による兵農分離。武士は国を護り農民は田を耕す、近世社会の盤石の秩序を完成させた。',
    pillar2: '京都改造と大坂城天下普請。全国の街道と運河を結び、金銀鉱山の開発と貨幣経済の大発展を牽引した。',
    pillar3: '北野大茶湯に象徴される桃山文化の爛漫。身分を問わず才能ある者を登用し、民衆の活気みなぎる栄華の世を築いた。',
    future10: '【統一後十年：大坂の天下普請と黄金の都】大坂と京の伏見は世界最大の商業拠点となり、全国の富が集散。太閤検地と刀狩により戦乱の元凶であった私兵は根絶された。',
    future50: '【統一後五十年：桃山文化の爛漫と身分流動性】農民から天下人となった太閤の遺志を継ぎ、平民からも多くの俊英が官僚や将軍に抜擢。民衆の活気が全土に溢れかえった。',
    future100: '【統一後百年〜近代へ：町民経済と活力の結実】金銀貨幣の全国流通と自由闊達な商業精神は、近代資本主義の礎をどこよりも早く築き、豊かな庶民社会を完成させた。',
    historianQuote: '『豊臣の統一は、日本史上最もダイナミックな身分解放と富の創出をもたらした。その夢の如き栄華は、永遠に語り継がれる』'
  },
  kusunoki: {
    regime: '楠木政権・忠烈至誠の建武新生',
    capital: '河内・千早城（ならびに京洛・二条城）',
    pillar1: '『三神授の兵法』に基づく信賞必罰と公正無私の仁政。民百姓を国基と尊び、租税の軽減と徳政を天下に布いた。',
    pillar2: '山河の険を活かした自然共生型の国土防衛体制。私利私欲の武闘を禁じ、忠勇義烈の武士道を天下の規範とした。',
    pillar3: '朝廷・公武融和の新たな国家秩序の建設。万民が安寧に暮らし、戦乱の悲劇を二度と繰り返さぬ誓いを立てた。',
    future10: '【統一後十年：公武合一と徳政の成就】都に公儀の威光が蘇り、建武の新政の真の理想が花開いた。楠木正成の無私の仁政により、都大路は民の歓喜で満たされた。',
    future50: '【統一後五十年：忠勇義烈の社会倫理】千早城の防衛哲学が全国の都市計画に応用され、自然と共生する要塞都市が完成。私利私欲を恥とする崇高な倫理観が社会を律した。',
    future100: '【統一後百年〜近代へ：悠久の大義と精神の鑑】朝廷を敬い民衆を愛する楠木流の国体思想は、日本人の精神的背骨として確立され、不滅の道徳大国を築き上げた。',
    historianQuote: '『楠木正成の統一は、日本精神史の至高の勝利である。その私心なき忠烈と仁政は、千載の未来まで八百万の民の鑑となった』'
  },
  ashikaga: {
    regime: '足利幕府再興・室町文化と公儀の新生',
    capital: '山城・室町花の御所',
    pillar1: '『建武式目』の精神を蘇らせる公儀秩序の再構築。諸大名の調停機関を機能させ、合議による天下静謐を達成した。',
    pillar2: '五山文学・能楽・庭園文化の全国振興。禅の精神と質素の美を天下に広め、精神性の高い豊かな日本文化を育てた。',
    pillar3: '勘合貿易の再編と海禁緩和。大陸との公的な善隣外交を回復し、東アジアの平和と交易の繁栄を牽引した。',
    future10: '【統一後十年：花の御所の復興と管領合議】焼け野原となった京洛が見事に復興。五山禅僧の智恵を政治に活かし、格式と教養を備えた雅やかな公武秩序が甦った。',
    future50: '【統一後五十年：室町文化の黄金開花】能楽、茶の湯、書院造、水墨画が全国の武士と町衆に浸透。大陸との勘合貿易が再開され、東アジアの平和的秩序が回復した。',
    future100: '【統一後百年〜近代へ：伝統美と外交の精華】「わび・さび」の美意識と洗練された外交術は、日本固有の文化遺産として世界から尊敬を集める平和国家を育んだ。',
    historianQuote: '『室町の公儀を甦らせた足利の治世は、殺伐とした武断の時代に優雅な芸術と精神の深みを取り戻した至福の時代であった』'
  },
  sanada: {
    regime: '真田政権・六文銭の信義と知謀',
    capital: '信濃・上田城',
    pillar1: '智謀と外交の妙を以て諸侯を調和。小国が大国に呑まれぬ公正な国際秩序と互恵の盟約を全国に広めた。',
    pillar2: '山岳地帯の築城術を活かした国土強靱化。治水と砂防を徹底し、天災に屈せぬ強固な郷土を築いた。',
    pillar3: '不惜身命の気骨を民政へ昇華。領民の声に耳を傾け、身分を越えた結束によって真の平和を守り抜いた。',
    future10: '【統一後十年：上田の機略と天下調停】六文銭の旗の下、信濃上田から天下へ号令。小国を虐げず大国に媚びぬ公正な連合秩序が完成した。',
    future50: '【統一後五十年：不屈の知恵と国土防衛】真田流の築城と山林治水が全国で模範とされ、天災を克服。民衆は真田の智勇を誇りとし、講談や芝居として日本中に語り継がれた。',
    future100: '【統一後百年〜近代へ：知恵と工夫の匠の国へ】知略と粘り強さの気風は産業技術へと昇華し、小企業や職人たちが世界最高水準の精密工業を花開かせる匠の国へ発展した。',
    historianQuote: '『智謀兼備の真田が天下を統べたことは、日本人に「知恵と勇気があれば運命を切り拓ける」という不屈の魂を永遠に植え付けた』'
  },
  enomoto: {
    regime: '箱館共和国・近代立憲連邦の創世',
    capital: '蝦夷・五稜郭（ならびに東京）',
    pillar1: '万国公法に準拠したアジア初の公選大統領（総裁）制。身分を撤廃し、全国民の投票による近代民主政治の礎を築いた。',
    pillar2: '開拓使と洋式鉱山・重工業の全国展開。オランダ・フランスの技術を導入し、近代製鉄と蒸気鉄道網を敷設した。',
    pillar3: '強力な近代蒸気艦隊による専守防衛体制。列強の侵略を退ける武装中立と主権独立を確立した。',
    future10: '【統一後十年：五稜郭憲法の全国施行】公選制度と三権分立が日本全土に布かれ、士農工商の身分制は完全撤廃。アジアで最初の近代的共和国が誕生した。',
    future50: '【統一後五十年：科学立国と産業革命の成熟】蒸気機関車が全国を駆け巡り、函館・横浜・神戸港が世界貿易のハブへと躍進。近代教育を受けた技術者が次々と新産業を興した。',
    future100: '【統一後百年〜現代へ：東洋のスイス・不抜の連邦国家】強固な科学力と高度な民主主義を併せ持つ立憲連邦として、世界平和を調停するアジアの誇るべき先進国家となった。',
    historianQuote: '『榎本武揚の統一は、封建の残滓を一掃し、日本を百年先頭の近代民主国家へと昇華させた世紀の快挙であった』'
  },
  mito: {
    regime: '水戸幕府・尊皇魁の文治大成',
    capital: '常陸・水戸城（ならびに江戸城）',
    pillar1: '『大日本史』の編纂精神に基づく国体明徴と尊皇の大義。朝廷を篤く敬い、万民が一体となる道徳国家を築いた。',
    pillar2: '弘道館教育の全国拡充。文武両道を旨とし、全国民に基礎学問と実学を修めさせる世界屈指の教育立国を実現した。',
    pillar3: 'パリ万博の知見を活かした西洋科学と国学の融和。伝統的精神を失わずに近代技術を取り入れる品格ある富国強兵を成し遂げた。',
    future10: '【統一後十年：弘道館精神の全国敷設】藩校と郷校が全国に設置され、武士から農民まであらゆる階層に教育の扉が開かれた。水戸学の尊皇の大義が天下の背骨となった。',
    future50: '【統一後五十年：道徳と近代科学の調和】パリ万博から導入された最新機械技術と伝統の倫理観が見事に調和。精神を失わぬ品格高き産業国家として成熟した。',
    future100: '【統一後百年〜近代へ：世界が仰ぐ道義国家】物質的豊かさと道徳の調和した水戸の国家体制は、近代世界における理想の文明国として国際的な賞賛を集めた。',
    historianQuote: '『尊皇の魁・水戸の治世は、日本の伝統の美徳と西洋の科学を完璧に融合させた。品格ある近代日本の規範はここにある』'
  }
};

// 祝賀エフェクト (花吹雪)
function triggerCelebrationConfetti() {
  if (typeof confetti !== 'function') return;
  const duration = 5000;
  const animationEnd = Date.now() + duration;
  const colors = ['#ffd700', '#ff69b4', '#ffffff', '#e74c3c', '#2ecc71'];

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 65,
      origin: { x: 0, y: 0.7 },
      colors: colors
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 65,
      origin: { x: 1, y: 0.7 },
      colors: colors
    });

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame);
    }
  }());
}

// ============================================================================
// SengokuGame メインクラス
// ============================================================================

// ============================================================================
// 大名AIの性格別パラメータ（投資スタイル）
//   aggressive: 兵糧を無視してでも積極出陣・前線集中
//   domestic  : 自国の城防・治安を固め、脅威が無ければ出陣しない
// ============================================================================
const AI_PERSONALITY_TUNING = {
  aggressive: { attackProb: 0.60, requiredRatio: 0.98, forceRatio: 0.75, minSourceTroops: 1400, coalitionBoost: 0.25, coalitionCap: 0.88, ignoreRice: true,  allianceBonus: -0.08, frontShiftMax: 500 },
  balanced:   { attackProb: 0.25, requiredRatio: 1.25, forceRatio: 0.70, minSourceTroops: 1600, coalitionBoost: 0.25, coalitionCap: 0.75, ignoreRice: false, allianceBonus: 0 },
  domestic:   { attackProb: 0.07, requiredRatio: 1.45, forceRatio: 0.65, minSourceTroops: 1800, coalitionBoost: 0.15, coalitionCap: 0.40, ignoreRice: false, allianceBonus: 0.10 }
};

// 各モジュールおよびグローバルとの相互運用性を担保するためのwindow公開
if (typeof window !== 'undefined') {
  window.getClanAbility = getClanAbility;
  window.SCENARIOS = SCENARIOS;
  window.INITIAL_PROVINCES = INITIAL_PROVINCES;
  window.CLAN_MASTER = CLAN_MASTER;
  window.EVENT_CLAN_LINEAGE = EVENT_CLAN_LINEAGE;
  window.HISTORICAL_ALLIANCE_BONDS = HISTORICAL_ALLIANCE_BONDS;
  window.ALLIANCE_DURATION_SEASONS = ALLIANCE_DURATION_SEASONS;
  window.INITIAL_ALLIANCE_DURATION_SEASONS = INITIAL_ALLIANCE_DURATION_SEASONS;
  window.DAIMYOS = DAIMYOS;
  window.FORMATIONS_DATA = FORMATIONS_DATA;
  window.SENGOKU_HOUSE_CODES = SENGOKU_HOUSE_CODES;
  window.SAMURAI_ANECDOTES = SAMURAI_ANECDOTES;
  window.BATTLEFIELDS_CHRONICLES = BATTLEFIELDS_CHRONICLES;
  window.DAIMYO_POLICIES = DAIMYO_POLICIES;
  window.STRATEGIC_DOCTRINES = STRATEGIC_DOCTRINES;
  window.HISTORICAL_CHRONICLES = HISTORICAL_CHRONICLES;
  window.HISTORICAL_WARRIORS_LORE = HISTORICAL_WARRIORS_LORE;
  window.HISTORICAL_TREASURES_LORE = HISTORICAL_TREASURES_LORE;
  window.COURT_RANKS_DATA = COURT_RANKS_DATA;
  window.DAIMYO_EPILOGUES = DAIMYO_EPILOGUES;
  window.triggerCelebrationConfetti = triggerCelebrationConfetti;
  window.AI_PERSONALITY_TUNING = AI_PERSONALITY_TUNING;
}



export class SengokuGame {
  constructor(gameData = {}) {
    this.gameData = gameData;
    // ES6モジュール・サブマネージャーの初期化
    this.state = new GameState(this);
    this.ui = new UIManager(this);
    this.renderer = new MapRenderer(this);
    this.ai = new ComputerLogic(this);

    this.music = window.sengokuMusic || new SengokuMusicEngine();
    this.audio = this.music;
    // 季節オート進行中は季節替わりで曲を替えない（音楽エンジンが問い合わせる。2026-10-11 bz）
    this.music.isAutoAdvanceActive = () => !!this.isAutoPlay;

    // ゲーム進行状態
    this.currentScenarioId = '1560';
    this.currentDifficulty = 'normal';
    this.playerClanId = 'chosokabe';
    this.playerDaimyo = null;
    this.foundingLeaderNames = {};
    this.activeOfficers = [];
    this.officers = [];

    this.year = 1560;
    this.seasonIdx = 1; // 0:春, 1:夏, 2:秋, 3:冬
    this.seasonNames = ['春', '夏', '秋', '冬'];
    this.seasonBgmTracks = ['spring', 'summer', 'autumn', 'winter'];
    this.currentWeather = '晴天';

    this.gold = 400;
    this.rice = 600;
    this.ap = 3;
    this.maxAp = 3;
    this.selectedProvId = null;
    this.mapHeatMode = 'owner'; // owner | diplomacy | troops | rice
    this.mapPerspectiveClanId = null; // 外交モードの視点（未設定時はプレイヤー）
    this.coalitionFormed = false;
    this.shogunAppointed = false;
    this.alliances = [];
    this.allianceCooldown = {};

    // オートプレーモード設定
    this.isAutoPlay = false; this.audio?.setAutoQuiet?.(false);
    this.autoPlayPausedForEvent = false;
    this.autoPlaySpeed = 0.5; // 秒単位 (0.1〜3.0)
    this.autoPlayTimer = null;
    this._lastAutoSaveTime = 0;
    this._lastHyoshigiTime = 0;

    // 戦闘状態
    this.inBattle = false;
    this.currentBattle = null;
    this.currentSiege = null;
    this.selectedFormationKey = 'gyorin';

    // SVGマップパン・ズーム
    this.mapScale = 1.0;
    this.mapPanX = 0;
    this.mapPanY = 0;
    this.isMapDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // 統計
    this.stats = {
      battlesFought: 0,
      battlesWon: 0,
      conqueredClans: []
    };

    // 歴史大イベント発火管理
    this.triggeredHistoricalEvents = new Set();

    // 過去に大名になったことのある武将の管理（旗揚げ・御家再興用）
    this.formerDaimyoIds = new Set();

    // 季節・天候パーティクル管理
    this.seasonParticles = [];
    this.seasonCanvas = null;
    this.seasonCtx = null;

    this.initData();
    this.initUI();
    this.initSvgMap();
    this.initSeasonCanvas();
    this.checkResumeSaveData();
    this.renderStartModal();
    // 起動時はまずオープニングを自動再生（スキップまたは終了で大名選択画面へ）
    try { this.playOpeningMovie?.(); } catch (e) { console.warn('[app] opening autoplay failed:', e); }

  }

  /**
   * 単方向データフロー: GameState経由で状態変更をコミットし、画面再描画を一元管理
   * @param {Object|Function} mutation - 状態変更データまたはミューテーション関数
   * @param {Object} [uiOpts] - 再描画オプション
   */
  commit(mutation, uiOpts = {}) {
    return this.state.commit(mutation, uiOpts);
  }
}

// 既存のすべての内部呼び出し (this.xxx) および HTML 内の呼び出しとの 100% 互換性を保つためメソッドを合成
Object.assign(
  SengokuGame.prototype,
  GameStateMethods,
  UIManagerMethods,
  MapRendererMethods,
  ComputerLogicMethods
);

// グローバル公開
window.SengokuGame = SengokuGame;

/**
 * 起動処理：DataLoader.loadAllData() により JSON データを非同期ロードし、
 * DOM 準備完了後に SengokuGame インスタンスを確実に生成・初期化する
 */
async function bootSengokuGame() {
  try {
    // 1. 全マスターデータの非同期ロード (fetch API)
    const gameData = await DataLoader.loadAllData();

    // 2. DOM 準備完了の確認
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    // 2.5 家紋SVGシンボルの注入を確実に完了保証（初期シナリオでの家紋同一化バグ防止）
    if (typeof window.loadKamonSymbols === 'function') {
      await window.loadKamonSymbols();
    }

    // 3. 基本定数・武将データのサニタイズ
    SCENARIOS = window.SCENARIOS = gameData.scenarios || [];
    INITIAL_PROVINCES = window.INITIAL_PROVINCES = gameData.provinces || [];
    CLAN_MASTER = window.CLAN_MASTER = gameData.clans || {};

    if (gameData.officers && Array.isArray(gameData.officers)) {
      gameData.officers.forEach(o => {
        if (o && o.name && /[（(][^）)]+[）)]/.test(o.name)) {
          o.name = o.name.replace(/\s*[（(][^）)]+[）)]/g, '').trim();
        }
      });
    }

    // 4. SengokuGame インスタンスの生成と開始
    if (!window.game) {
      window.game = new SengokuGame(gameData);
      window.dispatchEvent(new CustomEvent('gameReady', { detail: window.game }));
    }
  } catch (err) {
    console.error("Fatal error during SengokuGame async initialization:", err);
    const errBox = document.getElementById('scenarioDescBox');
    if (errBox) {
      errBox.innerHTML = `<div style="color:#ff6b6b; padding:10px;">データの読み込みに失敗しました。HTTPサーバー経由でアクセスしてください。<br><small>${err.message}</small></div>`;
    }
    const grid = document.getElementById('daimyoGrid');
    if (grid) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; color: #ff8888; text-align: center; padding: 20px; font-size: 13pt; background: rgba(0,0,0,0.5); border: 1px solid #c0392b; border-radius: 6px;">
        ⚠️ ゲームデータ(JSON)の読み込みに失敗しました。<br>
        <span style="font-size: 11pt; color: #ddd; margin-top: 6px; display: inline-block;">
          ブラウザのセキュリティ制限（CORS）のため、ファイルを直接開く（file://）のではなく、<br>
          ローカルWebサーバー（VS Codeの「Live Server」や <code>python -m http.server</code> 等）経由でアクセスしてください。<br>
          <small style="color:#aaa;">エラー詳細: ${err.message}</small>
        </span>
      </div>`;
    }
  }
}

// 起動実行
bootSengokuGame();

// ui_fixed24: generic backdrop-click-to-close for dismissable modals/overlays.
// Clicking the backdrop (target === overlay) triggers the modal's own close (×) button.
// Modals without a close button, and mandatory ones listed below, are left alone.
(() => {
  const NON_DISMISSABLE = new Set([
    'startModal', 'scenarioIntroModal', 'openingMovieModal', 'endingRollModal',
    'victoryModal', 'defeatModal', 'shogunModal', 'historicalEventModal', 'historyEventModal',
    'battleModal', 'siegeModal', 'deployModal'
  ]);
  const CLOSE_ID_RE = /^close.*btn(2|bottom)?$|closebtn$|closefooter$/i;
  const CLOSE_TEXT_RE = /^(×|✕|✖|閉|閉じる)$/;
  const isOverlay = (el) => {
    if (!el || el === document.body || el === document.documentElement) return false;
    if (el.closest('.swal2-container')) return false;
    if (el.id && NON_DISMISSABLE.has(el.id)) return false;
    const sig = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`;
    if (!/modal|overlay|popup|backdrop/i.test(sig)) return false;
    const pos = getComputedStyle(el).position;
    return pos === 'fixed' || pos === 'absolute';
  };
  const visible = (b) => b.offsetParent !== null || getComputedStyle(b).position === 'fixed';
  const findCloseBtn = (overlay) => {
    const btns = Array.from(overlay.querySelectorAll('button, .close-btn, [data-close]'));
    return btns.find(b => CLOSE_ID_RE.test(b.id || '') && visible(b))
      || btns.find(b => CLOSE_TEXT_RE.test((b.textContent || '').trim()) && visible(b))
      || null;
  };
  let downTarget = null;
  document.addEventListener('mousedown', (e) => { downTarget = e.target; }, true);
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t !== downTarget) return; // ignore drags that started inside the content
    if (!isOverlay(t)) return;
    const btn = findCloseBtn(t);
    if (!btn) return;
    e.stopPropagation();
    btn.click();
  });
})();
