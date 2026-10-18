// ============================================================================
// 戦国天下統一伝 〜群雄割拠の覇道〜
// 菅野よう子風 和洋折衷フルオーケストラ音響エンジン (Web Audio API)
// 壮大な交響詩、多彩な民族楽器、重厚な金管・打楽器、そして珠玉の戦国効果音群
// ============================================================================

// 厳密な音階周波数テーブル (Hz) - 全オクターブ0〜6 + フラット表記エイリアス完備
const SENGOKU_PITCH = {
  // オクターブ0
  C0: 16.35, Cs0: 17.32, Db0: 17.32, D0: 18.35, Ds0: 19.45, Eb0: 19.45, E0: 20.60, F0: 21.83, Fs0: 23.12, Gb0: 23.12, G0: 24.50, Gs0: 25.96, Ab0: 25.96, A0: 27.50, As0: 29.14, Bb0: 29.14, B0: 30.87,
  // オクターブ1
  C1: 32.70, Cs1: 34.65, Db1: 34.65, D1: 36.71, Ds1: 38.89, Eb1: 38.89, E1: 41.20, F1: 43.65, Fs1: 46.25, Gb1: 46.25, G1: 49.00, Gs1: 51.91, Ab1: 51.91, A1: 55.00, As1: 58.27, Bb1: 58.27, B1: 61.74,
  // オクターブ2
  C2: 65.41, Cs2: 69.30, Db2: 69.30, D2: 73.42, Ds2: 77.78, Eb2: 77.78, E2: 82.41, F2: 87.31, Fs2: 92.50, Gb2: 92.50, G2: 98.00, Gs2: 103.83, Ab2: 103.83, A2: 110.00, As2: 116.54, Bb2: 116.54, B2: 123.47,
  // オクターブ3
  C3: 130.81, Cs3: 138.59, Db3: 138.59, D3: 146.83, Ds3: 155.56, Eb3: 155.56, E3: 164.81, F3: 174.61, Fs3: 185.00, Gb3: 185.00, G3: 196.00, Gs3: 207.65, Ab3: 207.65, A3: 220.00, As3: 233.08, Bb3: 233.08, B3: 246.94,
  // オクターブ4
  C4: 261.63, Cs4: 277.18, Db4: 277.18, D4: 293.66, Ds4: 311.13, Eb4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, Gb4: 369.99, G4: 392.00, Gs4: 415.30, Ab4: 415.30, A4: 440.00, As4: 466.16, Bb4: 466.16, B4: 493.88,
  // オクターブ5
  C5: 523.25, Cs5: 554.37, Db5: 554.37, D5: 587.33, Ds5: 622.25, Eb5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, Gb5: 739.99, G5: 783.99, Gs5: 830.61, Ab5: 830.61, A5: 880.00, As5: 932.33, Bb5: 932.33, B5: 987.77,
  // オクターブ6
  C6: 1046.50, Cs6: 1108.73, Db6: 1108.73, D6: 1174.66, Ds6: 1244.51, Eb6: 1244.51, E6: 1318.51, F6: 1396.91, Fs6: 1479.98, Gb6: 1479.98, G6: 1567.98, Gs6: 1661.22, Ab6: 1661.22, A6: 1760.00, As6: 1864.66, Bb6: 1864.66, B6: 1975.53,
  _: 0 // 休符
};
const P = SENGOKU_PITCH;

// undefined / NaN は `freq <= 0` が false になり、既定 440Hz のオシレーターが鳴り続ける
function isAudibleFreq(freq) {
  return Number.isFinite(freq) && freq > 0;
}

class SengokuMusicEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.seGain = null;
    this.compressor = null;
    this.convolver = null;
    this.convolverGain = null;

    this.isBgmMuted = false;
    this.isSeMuted = false;
    this.isMuted = false;
    this.masterVolume = 0.75;
    this.bgmVolume = 0.60;
    this.seVolume = 0.85;
    // 効果音（SE）の ON/OFF・音量は BGM とは別に localStorage へ保存（既定 ON）
    this.loadSeSettings();

    this.currentTrack = 'op';
    this.stepIndex = 0;
    this.timerId = null;
    this.daimyoBgmEnabled = true; // 大名専用BGM優先フラグ

    // 全24曲：菅野よう子風 和洋折衷フルオーケストラ楽曲ライブラリ
    this.tracks = this.createTracks();
    // 効果音の入口はすべて効果音スイッチを通す（OFF なら鳴らさない・鳴らす音は効果音音量のバスへ）
    this.wrapSeMethods();
  }

  // ============================================================================
  // トラック定義生成 (全24曲)
  // ============================================================================
  createTracks() {
    return {
      // 1. 群雄割拠・オープニング大序曲
      op: {
        id: 'op',
        name: '天下創世・群雄割拠',
        genre: '大序曲・フルオーケストラ行進曲',
        desc: '菅野よう子サウンドの真骨頂。勇壮な金管ファンファーレと流麗な和琴、ティンパニが轟く乱世開幕の大序曲。',
        tempoMs: 180,
        melodyInst: 'trumpet',
        melody: [
          P.A4, P.A4, P.E5, P._,  P.C5, P._, P.G4, P.E4,
          P.A4, P._, P.F4, P.C5,  P.B4, P.G4, P.E4, P._,
          P.D5, P._, P.A4, P.F4,  P.D5, P.Bb4, P.F4, P._,
          P.E5, P.C5, P.A4, P._,  P.B4, P.Gs4, P.E4, P._,
          P.C5, P._, P.A4, P.F4,  P.G4, P.E4, P.C5, P._,
          P.D5, P.A4, P.F4, P._,  P.E5, P._, P.C5, P.A4,
          P.F5, P.D5, P.Bb4, P._,  P.C5, P.A4, P.F5, P._,
          P.B4, P.Gs4, P.E5, P._,  P.C5, P.A4, P.E4, P._
        ],
        counterInst: 'horn',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.C4, P.C4, P.E4, P._,
          P.A3, P.A3, P.C4, P._,  P.G3, P.G3, P.B3, P._,
          P.F3, P.F3, P.A3, P._,  P.F3, P.F3, P.A3, P._,
          P.C4, P.C4, P.E4, P._,  P.Gs3, P.Gs3, P.B3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.A3, P.C4, P.E4], [P.A3, P.C4, P.E4], [P.F3, P.A3, P.C4], [P.E3, P.G3, P.B3],
          [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.A3, P.C4, P.E4], [P.E3, P.Gs3, P.B3],
          [P.F3, P.A3, P.C4], [P.C3, P.E3, P.G3], [P.D3, P.F3, P.A3], [P.A3, P.C4, P.E4],
          [P.Bb2, P.D3, P.F3], [P.F3, P.A3, P.C4], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.A4, P.E4, P.C4, P.E4, P.A4, P.C5, P.B4, P.E4,
          P.D4, P.F4, P.A4, P.D5, P.C5, P.A4, P.E4, P.A3
        ],
        bass: [P.A2, P.A2, P.F2, P.E2, P.D2, P.Bb1, P.A2, P.E2, P.F2, P.C2, P.D2, P.A1, P.Bb1, P.F2, P.E2, P.A2],
        drums: [
          { wadaiko: true, taiko: false, timpani: true, cymbal: true },
          { wadaiko: false, taiko: true, timpani: false, cymbal: false },
          { wadaiko: true, taiko: false, timpani: false, cymbal: false },
          { wadaiko: false, taiko: true, timpani: false, cymbal: false }
        ]
      },

      // 2. 春・桜花爛漫 (春の内政)
      spring: {
        id: 'spring',
        name: '桜花爛漫・春萌えよ',
        genre: '春の内政・典雅なワルツと木管アンサンブル',
        desc: '『武将風雲録』を彷彿とさせる、フルートと十三絃箏の優雅な対話。雪解けの野山に新緑が芽吹く希望の旋律。',
        tempoMs: 220,
        melodyInst: 'flute',
        melody: [
          P.E5, P._, P.C5, P.A4,  P.A4, P.C5, P.F5, P._,
          P.D5, P.A4, P.F4, P._,  P.B4, P._, P.G4, P.E4,
          P.C5, P.E5, P.A4, P._,  P.D5, P.B4, P.G4, P._,
          P.A4, P._, P.C5, P.F5,  P.E5, P.C5, P.A4, P._,
          P.G5, P.E5, P.C5, P._,  P.D5, P.B4, P.G4, P._,
          P.E5, P.C5, P.A4, P._,  P.A4, P.C5, P.F5, P._,
          P.F5, P.D5, P.A4, P._,  P.B4, P.D5, P.G5, P._,
          P.E5, P.G4, P.C5, P._,  P.A4, P._, P.C5, P.E5
        ],
        counterInst: 'oboe',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.G3, P.G3, P.B3, P._,
          P.C4, P.C4, P.E4, P._,  P.B3, P.B3, P.D4, P._,
          P.A3, P.A3, P.C4, P._,  P.A3, P.A3, P.C4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.A3, P.C4, P.E4], [P.F3, P.A3, P.C4], [P.D3, P.F3, P.A3], [P.E3, P.G3, P.B3],
          [P.A3, P.C4, P.E4], [P.G3, P.B3, P.D4], [P.F3, P.A3, P.C4], [P.E3, P.A3, P.C4],
          [P.C3, P.E3, P.G3], [P.G3, P.B3, P.D4], [P.A3, P.C4, P.E4], [P.F3, P.A3, P.C4],
          [P.D3, P.F3, P.A3], [P.G3, P.B3, P.D4], [P.C3, P.E3, P.G3], [P.A3, P.C4, P.E4]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.A3, P.C4, P.E4, P.A4, P.C5, P.A4, P.E4, P.C4,
          P.F3, P.A3, P.C4, P.F4, P.E4, P.C4, P.A3, P.E3
        ],
        bass: [P.A2, P.F2, P.D2, P.E2, P.A2, P.G2, P.F2, P.E2, P.C2, P.G2, P.A2, P.F2, P.D2, P.G2, P.C2, P.A2],
        drums: [
          { tsuzumi: true, taiko: false },
          { tsuzumi: false, taiko: false },
          { tsuzumi: false, taiko: true },
          { tsuzumi: false, taiko: false }
        ]
      },

      // 3. 夏・青嵐の陣 (夏の内政)
      summer: {
        id: 'summer',
        name: '青嵐・南風の陣',
        genre: '夏の内政・躍動する金管と青嵐のストリングス',
        desc: '南風が青田を吹き抜ける爽快感。力強い金管アンサンブルと躍動するバイオリンによる生命力に満ちた調べ。',
        tempoMs: 180,
        melodyInst: 'violin',
        melody: [
          P.D5, P._, P.A4, P.F5,  P.E5, P.C5, P.G4, P._,
          P.F5, P.D5, P.A4, P._,  P.D5, P.Bb4, P.F4, P._,
          P.C5, P._, P.A4, P.F5,  P.D5, P.Bb4, P.G4, P._,
          P.E5, P.C5, P.A4, P._,  P.F5, P.D5, P.A4, P._,
          P.A4, P._, P.C5, P.F5,  P.G5, P.E5, P.C5, P._,
          P.A4, P.D5, P.F5, P._,  P.D5, P.F4, P.Bb4, P._,
          P.E5, P._, P.G4, P.C5,  P.A5, P.F5, P.C5, P._,
          P.B4, P.D5, P.G5, P._,  P.F5, P.D5, P.A4, P._
        ],
        counterInst: 'horn',
        counter: [
          P.F3, P.F3, P.A3, P._,  P.E3, P.E3, P.G3, P._,
          P.F3, P.F3, P.A3, P._,  P.D3, P.D3, P.F3, P._,
          P.A3, P.A3, P.C4, P._,  P.Bb3, P.Bb3, P.D4, P._,
          P.C4, P.C4, P.E4, P._,  P.F3, P.F3, P.A3, P._
        ],
        chordInst: 'brass',
        chords: [
          [P.D3, P.F3, P.A3], [P.C3, P.E3, P.G3], [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3],
          [P.F3, P.A3, P.C4], [P.G3, P.Bb3, P.D4], [P.A3, P.C4, P.E4], [P.D3, P.F3, P.A3],
          [P.F3, P.A3, P.C4], [P.C3, P.E3, P.G3], [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3],
          [P.C3, P.E3, P.G3], [P.F3, P.A3, P.C4], [P.G3, P.B3, P.D4], [P.D3, P.F3, P.A3]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.D4, P.F4, P.A4, P.D5, P.C5, P.A4, P.F4, P.D4,
          P.Bb3, P.D4, P.F4, P.Bb4, P.A4, P.F4, P.D4, P.A3
        ],
        bass: [P.D2, P.C2, P.D2, P.Bb1, P.F2, P.G2, P.A2, P.D2, P.F2, P.C2, P.D2, P.Bb1, P.C2, P.F2, P.G2, P.D2],
        drums: [
          { wadaiko: true, taiko: true },
          { wadaiko: false, taiko: false },
          { wadaiko: false, taiko: true },
          { wadaiko: false, taiko: false }
        ]
      },

      // 4. 秋・豊穣の祈り (秋の内政)
      autumn: {
        id: 'autumn',
        name: '豊穣の祈り・黄金の穂波',
        genre: '秋の内政・オーボエと尺八の哀愁',
        desc: '夕陽に黄金色に輝く稲穂と刈り入れの賑わい。オーボエの哀愁ある音色と篠笛の温かな息遣いが胸に迫る。',
        tempoMs: 230,
        melodyInst: 'oboe',
        melody: [
          P.D5, P._, P.Bb4, P.G4,  P.Bb4, P.G4, P.Eb5, P._,
          P.C5, P.A4, P.F4, P._,  P.D5, P.Bb4, P.G4, P._,
          P.F5, P.D5, P.Bb4, P._,  P.Eb5, P.C5, P.G4, P._,
          P.A4, P.Fs4, P.D5, P._,  P.Bb4, P.G4, P.D4, P._,
          P.D5, P._, P.F5, P.Bb4,  P.G4, P.Bb4, P.Eb5, P._,
          P.Eb5, P.C5, P.G4, P._,  P.D5, P.Bb4, P.G4, P._,
          P.C5, P.Ab4, P.Eb5, P._,  P.Ab4, P.C5, P.F5, P._,
          P.D5, P.B4, P.G4, P._,  P.Bb4, P.G4, P.D5, P._
        ],
        counterInst: 'shinobue',
        counter: [
          P.Bb3, P.Bb3, P.D4, P._,  P.G3, P.G3, P.Bb3, P._,
          P.A3, P.A3, P.C4, P._,  P.Bb3, P.Bb3, P.D4, P._,
          P.D4, P.D4, P.F4, P._,  P.Eb3, P.Eb3, P.G3, P._,
          P.Fs3, P.Fs3, P.A3, P._,  P.Bb3, P.Bb3, P.D4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.G3, P.Bb3, P.D4], [P.Eb3, P.G3, P.Bb3], [P.F3, P.A3, P.C4], [P.G3, P.Bb3, P.D4],
          [P.Bb3, P.D4, P.F4], [P.C3, P.Eb3, P.G3], [P.D3, P.Fs3, P.A3], [P.G3, P.Bb3, P.D4],
          [P.Bb2, P.D3, P.F3], [P.Eb3, P.G3, P.Bb3], [P.C3, P.Eb3, P.G3], [P.G3, P.Bb3, P.D4],
          [P.Ab2, P.C3, P.Eb3], [P.F3, P.Ab3, P.C4], [P.G2, P.B2, P.D3], [P.G3, P.Bb3, P.D4]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.G3, P.Bb3, P.D4, P.G4, P.F4, P.D4, P.Bb3, P.G3,
          P.Eb3, P.G3, P.Bb3, P.Eb4, P.D4, P.Bb3, P.G3, P.D3
        ],
        bass: [P.G2, P.Eb2, P.F2, P.G2, P.Bb2, P.C2, P.D2, P.G2, P.Bb2, P.Eb2, P.C2, P.G2, P.Ab1, P.F2, P.G2, P.G1],
        drums: [
          { hyoshigi: true, tsuzumi: false },
          { hyoshigi: false, tsuzumi: false },
          { hyoshigi: false, tsuzumi: true },
          { hyoshigi: false, tsuzumi: false }
        ]
      },

      // 5. 冬・静謐の陣 (冬の内政)
      winter: {
        id: 'winter',
        name: '静謐の雪化粧・雪月花',
        genre: '冬の内政・ハープとチェレスタの静謐交響詩',
        desc: '雪に閉ざされた天守閣と静かに燃える炉火。ハープの透明なアルペジオとチェレスタ、優しいチェロの温もり。',
        tempoMs: 260,
        melodyInst: 'shinobue',
        melody: [
          P.B4, P._, P._, P.E5,  P.G4, P._, P.E4, P._,
          P.C5, P._, P.A4, P._,  P.Fs4, P._, P._, P.B4,
          P.E5, P._, P.G4, P._,  P.Fs4, P.A4, P._, P.D5,
          P.Ds4, P._, P.Fs4, P._,  P.E4, P._, P._, P._,
          P.G5, P._, P.E5, P.C5,  P.E5, P.C5, P.A4, P._,
          P.B4, P.E5, P.G4, P._,  P.D5, P.B4, P.G4, P._,
          P.C5, P._, P.E5, P.A4,  P.Fs4, P._, P.Ds5, P.B4,
          P.G4, P.E5, P.B4, P._,  P.E5, P.G4, P._, P._
        ],
        counterInst: 'cello',
        counter: [
          P.G3, P.G3, P.B3, P._,  P.E3, P.E3, P.G3, P._,
          P.C3, P.C3, P.E3, P._,  P.Ds3, P.Ds3, P.Fs3, P._,
          P.E3, P.E3, P.G3, P._,  P.Fs3, P.Fs3, P.A3, P._,
          P.Ds3, P.Ds3, P.Fs3, P._,  P.G3, P.G3, P.B3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.E3, P.G3, P.B3], [P.C3, P.E3, P.G3], [P.A2, P.C3, P.E3], [P.B2, P.Ds3, P.Fs3],
          [P.C3, P.E3, P.G3], [P.D3, P.Fs3, P.A3], [P.B2, P.Ds3, P.Fs3], [P.E3, P.G3, P.B3],
          [P.C3, P.E3, P.G3], [P.A2, P.C3, P.E3], [P.E3, P.G3, P.B3], [P.G2, P.B2, P.D3],
          [P.A2, P.C3, P.E3], [P.B2, P.Ds3, P.Fs3], [P.E3, P.G3, P.B3], [P.C3, P.E3, P.G3]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.E4, P.G4, P.B4, P.E5, P.B4, P.G4, P.E4, P.B3,
          P.C4, P.E4, P.G4, P.C5, P.G4, P.E4, P.C4, P.G3
        ],
        bass: [P.E2, P.C2, P.A1, P.B1, P.C2, P.D2, P.B1, P.E2, P.C2, P.A1, P.E2, P.G2, P.A1, P.B1, P.E2, P.C2],
        drums: [
          { suzu: true },
          { suzu: false },
          { suzu: false },
          { suzu: false }
        ]
      },

      // 6. 織田家専用曲：天下布武・革命の覇王
      oda: {
        id: 'oda',
        name: '天下布武・革命の覇王',
        genre: '織田信長専用曲・荘厳なパイプオルガンと疾走する管弦楽',
        desc: '旧弊を打ち破る時代の寵児・織田信長。バロック調の劇的なオルガン和音と、南蛮渡来の壮麗なバイオリンが疾走する。',
        tempoMs: 165,
        melodyInst: 'violin',
        melody: [
          P.D5, P.D5, P.A4, P._,  P.Bb4, P.G4, P.D5, P._,
          P.E5, P._, P.C5, P.G4,  P.Cs5, P.E5, P.A4, P._,
          P.F5, P.D5, P.A4, P._,  P.D5, P.Bb4, P.F4, P._,
          P.Bb4, P.G4, P.D4, P._,  P.E5, P.Cs5, P.A4, P._,
          P.F5, P.C5, P.A4, P._,  P.D5, P.Bb4, P.F4, P._,
          P.E5, P.G4, P.C5, P._,  P.Cs5, P.A4, P.E5, P._,
          P.D5, P.F5, P.A5, P._,  P.D5, P._, P.Bb4, P.F4,
          P.G4, P.Bb4, P.D5, P._,  P.E5, P.Cs5, P.A4, P._
        ],
        counterInst: 'trumpet',
        counter: [
          P.F3, P.F3, P.A3, P._,  P.Bb3, P.Bb3, P.D4, P._,
          P.E3, P.E3, P.G3, P._,  P.Cs4, P.Cs4, P.E4, P._,
          P.F3, P.F3, P.A3, P._,  P.D3, P.D3, P.F3, P._,
          P.Bb3, P.Bb3, P.D4, P._,  P.Cs4, P.Cs4, P.E4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.D3, P.F3, P.A3], [P.G3, P.Bb3, P.D4], [P.C3, P.E3, P.G3], [P.A3, P.Cs4, P.E4],
          [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.G3, P.Bb3, P.D4], [P.A3, P.Cs4, P.E4],
          [P.F3, P.A3, P.C4], [P.Bb2, P.D3, P.F3], [P.C3, P.E3, P.G3], [P.A3, P.Cs4, P.E4],
          [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.G3, P.Bb3, P.D4], [P.A3, P.Cs4, P.E4]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.D4, P.F4, P.A4, P.D5, P.Bb4, P.G4, P.E4, P.Cs4,
          P.D4, P.F4, P.A4, P.D5, P.Cs5, P.A4, P.E4, P.A3
        ],
        bass: [P.D2, P.G2, P.C2, P.A2, P.D2, P.Bb1, P.G1, P.A1, P.F2, P.Bb1, P.C2, P.A1, P.D2, P.Bb1, P.G1, P.A1],
        drums: [
          { wadaiko: true, timpani: true },
          { taiko: true },
          { wadaiko: true },
          { taiko: true, cymbal: true }
        ]
      },

      // 7. 武田家専用曲：風林火山・甲斐の虎
      takeda: {
        id: 'takeda',
        name: '風林火山・甲斐の虎',
        genre: '武田信玄専用曲・重厚なホルンと地鳴りの赤備え軍鼓',
        desc: '「其の疾きこと風の如く、動かざること山の如し」。重厚なフレンチホルンと怒涛の大太鼓が鳴り響く、無敵の騎馬軍団。',
        tempoMs: 175,
        melodyInst: 'horn',
        melody: [
          P.E4, P._, P.B3, P.E4,  P.G4, P.E4, P._, P.C4,
          P.E4, P.C4, P.A3, P._,  P.Fs4, P._, P.B3, P._,
          P.G4, P.E4, P.C5, P._,  P.Fs4, P.A4, P.D4, P._,
          P.Ds4, P.Fs4, P.B3, P._,  P.E4, P._, P.B3, P._,
          P.G4, P._, P.B4, P.D5,  P.A4, P.Fs4, P.D5, P._,
          P.E5, P.B4, P.G4, P._,  P.G4, P.E4, P.C5, P._,
          P.E4, P.A4, P.C5, P._,  P.Fs4, P.B4, P.Ds5, P._,
          P.E5, P._, P.B4, P.G4,  P.D5, P.B4, P.G4, P._
        ],
        counterInst: 'shinobue',
        counter: [
          P.G3, P.G3, P.B3, P._,  P.E3, P.E3, P.G3, P._,
          P.C3, P.C3, P.E3, P._,  P.Ds3, P.Ds3, P.Fs3, P._,
          P.E3, P.E3, P.G3, P._,  P.Fs3, P.Fs3, P.A3, P._,
          P.Ds3, P.Ds3, P.Fs3, P._,  P.G3, P.G3, P.B3, P._
        ],
        chordInst: 'brass',
        chords: [
          [P.E3, P.G3, P.B3], [P.C3, P.E3, P.G3], [P.A2, P.C3, P.E3], [P.B2, P.Ds3, P.Fs3],
          [P.C3, P.E3, P.G3], [P.D3, P.Fs3, P.A3], [P.B2, P.Ds3, P.Fs3], [P.E3, P.G3, P.B3],
          [P.G2, P.B2, P.D3], [P.D3, P.Fs3, P.A3], [P.E3, P.G3, P.B3], [P.C3, P.E3, P.G3],
          [P.A2, P.C3, P.E3], [P.B2, P.Ds3, P.Fs3], [P.E3, P.G3, P.B3], [P.G2, P.B2, P.D3]
        ],
        arpInst: 'biwa',
        arpeggio: [
          P.E3, P.B3, P.E4, P.B3, P.G3, P.E3, P.B2, P.E3,
          P.C3, P.G3, P.C4, P.G3, P.E3, P.C3, P.G2, P.C3
        ],
        bass: [P.E2, P.C2, P.A1, P.B1, P.C2, P.D2, P.B1, P.E2, P.G2, P.D2, P.E2, P.C2, P.A1, P.B1, P.E2, P.G2],
        drums: [
          { wadaiko: true, timpani: true },
          { taiko: true },
          { wadaiko: true },
          { taiko: true, dora: false }
        ]
      },

      // 8. 上杉家専用曲：毘沙門天・義の白刃
      uesugi: {
        id: 'uesugi',
        name: '毘沙門天・義の白刃',
        genre: '上杉謙信専用曲・静寂の篠笛から激動するオーケストラ',
        desc: '「義を見てせざるは勇なきなり」。春日山の静寂に響く尺八から、毘沙門天の軍旗を翻して急襲する劇的シンフォニー。',
        tempoMs: 160,
        melodyInst: 'shinobue',
        melody: [
          P.A4, P._, P._, P.E5,  P.C5, P.A4, P._, P.F4,
          P.D5, P._, P.A4, P.F4,  P.B4, P.G4, P.E5, P._,
          P.A4, P.C5, P.F5, P._,  P.D5, P._, P.B4, P.G4,
          P.Gs4, P.B4, P.E5, P._,  P.A5, P.E5, P.C5, P._,
          P.F5, P._, P.C5, P.A4,  P.E5, P.G4, P.C5, P._,
          P.A4, P.D5, P.F5, P._,  P.E5, P.C5, P.A4, P._,
          P.D5, P.F4, P.Bb4, P._,  P.B4, P.D5, P.G5, P._,
          P.Gs4, P.E5, P.B4, P._,  P.A4, P._, P.C5, P.E5
        ],
        counterInst: 'violin',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.G3, P.G3, P.B3, P._,
          P.A3, P.A3, P.C4, P._,  P.B3, P.B3, P.D4, P._,
          P.Gs3, P.Gs3, P.B3, P._,  P.C4, P.C4, P.E4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.A3, P.C4, P.E4], [P.F3, P.A3, P.C4], [P.D3, P.F3, P.A3], [P.E3, P.G3, P.B3],
          [P.F3, P.A3, P.C4], [P.G3, P.B3, P.D4], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4],
          [P.F3, P.A3, P.C4], [P.C3, P.E3, P.G3], [P.D3, P.F3, P.A3], [P.A3, P.C4, P.E4],
          [P.Bb2, P.D3, P.F3], [P.G3, P.B3, P.D4], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.A3, P.E4, P.A4, P.C5, P.B4, P.A4, P.E4, P.C4,
          P.F3, P.C4, P.F4, P.A4, P.G4, P.E4, P.C4, P.A3
        ],
        bass: [P.A2, P.F2, P.D2, P.E2, P.F2, P.G2, P.E2, P.A2, P.F2, P.C2, P.D2, P.A1, P.Bb1, P.G2, P.E2, P.A2],
        drums: [
          { dora: true, hyoshigi: true },
          { taiko: false },
          { taiko: true },
          { taiko: false, timpani: true }
        ]
      },

      // 9. 伊達家専用曲：独眼竜・奥羽の疾風
      date: {
        id: 'date',
        name: '独眼竜・奥羽の疾風',
        genre: '伊達政宗専用曲・若武者の覇気と華麗な弦楽シンフォニー',
        desc: '奥州より天下を睨む若き独眼竜。躍動するバイオリンと華麗なトランペットが北の大地を疾駆する。',
        tempoMs: 155,
        melodyInst: 'trumpet',
        melody: [
          P.A4, P.D5, P._, P.F5,  P.E5, P._, P.G4, P.C5,
          P.D5, P.Bb4, P.F4, P._,  P.Cs5, P.E5, P.A4, P._,
          P.D5, P.A4, P.F5, P._,  P.Bb4, P.D5, P.G4, P._,
          P.E5, P.C5, P.G4, P._,  P.F5, P.D5, P.A4, P._,
          P.C5, P.A4, P.F5, P._,  P.G5, P.E5, P.C5, P._,
          P.D5, P.F5, P.Bb4, P._,  P.A4, P.D5, P.F5, P._,
          P.E5, P._, P.G4, P.C5,  P.A5, P.F5, P.C5, P._,
          P.B4, P.D5, P.G4, P._,  P.F5, P.D5, P.A4, P._
        ],
        counterInst: 'violin',
        counter: [
          P.F3, P.F3, P.A3, P._,  P.E3, P.E3, P.G3, P._,
          P.D3, P.D3, P.F3, P._,  P.Cs3, P.Cs3, P.E3, P._,
          P.F3, P.F3, P.A3, P._,  P.Bb3, P.Bb3, P.D4, P._,
          P.E3, P.E3, P.G3, P._,  P.F3, P.F3, P.A3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.D3, P.F3, P.A3], [P.C3, P.E3, P.G3], [P.Bb2, P.D3, P.F3], [P.A2, P.Cs3, P.E3],
          [P.D3, P.F3, P.A3], [P.G3, P.Bb3, P.D4], [P.C3, P.E3, P.G3], [P.D3, P.F3, P.A3],
          [P.F3, P.A3, P.C4], [P.C3, P.E3, P.G3], [P.Bb2, P.D3, P.F3], [P.D3, P.F3, P.A3],
          [P.C3, P.E3, P.G3], [P.F3, P.A3, P.C4], [P.G2, P.B2, P.D3], [P.D3, P.F3, P.A3]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.D4, P.F4, P.A4, P.D5, P.C5, P.A4, P.F4, P.D4,
          P.Bb3, P.D4, P.F4, P.Bb4, P.A4, P.F4, P.D4, P.A3
        ],
        bass: [P.D2, P.C2, P.Bb1, P.A1, P.D2, P.G2, P.C2, P.D2, P.F2, P.C2, P.Bb1, P.D2, P.C2, P.F2, P.G2, P.D2],
        drums: [
          { wadaiko: true, timpani: true },
          { taiko: true },
          { wadaiko: true },
          { taiko: true, cymbal: true }
        ]
      },

      // 10. 毛利・長宗我部専用曲：蒼波の覇者・西海の水軍
      mori_choso: {
        id: 'mori_choso',
        name: '蒼波の覇者・西海の水軍',
        genre: '毛利・長宗我部専用曲・瀬戸内海と黒潮を渡る勇壮な海戦交響詩',
        desc: '瀬戸内海・黒潮航路を制覇する西国の覇者たち。波のうねりを描く十三絃箏と、力強い琵琶、雄大なフルートの調べ。',
        tempoMs: 200,
        melodyInst: 'flute',
        melody: [
          P.A4, P._, P.D5, P.F5,  P.B4, P.D5, P.G4, P._,
          P.E5, P._, P.C5, P.A4,  P.F5, P.D5, P.A4, P._,
          P.C5, P.A4, P.F5, P._,  P.B4, P._, P.D5, P.G5,
          P.B4, P.G4, P.E5, P._,  P.D5, P.A4, P.F4, P._,
          P.D5, P.B4, P.G5, P._,  P.A4, P.Fs4, P.D5, P._,
          P.B4, P.E5, P.G4, P._,  P.G4, P.E4, P.C5, P._,
          P.A4, P.C5, P.E5, P._,  P.B4, P.D5, P.G4, P._,
          P.Fs4, P.A4, P.D5, P._,  P.F5, P.D5, P.A4, P._
        ],
        counterInst: 'biwa',
        counter: [
          P.F3, P.F3, P.A3, P._,  P.B3, P.B3, P.D4, P._,
          P.C4, P.C4, P.E4, P._,  P.F3, P.F3, P.A3, P._,
          P.A3, P.A3, P.C4, P._,  P.B3, P.B3, P.D4, P._,
          P.G3, P.G3, P.B3, P._,  P.F3, P.F3, P.A3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.D3, P.F3, P.A3], [P.G3, P.B3, P.D4], [P.A3, P.C4, P.E4], [P.D3, P.F3, P.A3],
          [P.F3, P.A3, P.C4], [P.G3, P.B3, P.D4], [P.E3, P.G3, P.B3], [P.D3, P.F3, P.A3],
          [P.G2, P.B2, P.D3], [P.D3, P.Fs3, P.A3], [P.E3, P.G3, P.B3], [P.C3, P.E3, P.G3],
          [P.A2, P.C3, P.E3], [P.G3, P.B3, P.D4], [P.D3, P.Fs3, P.A3], [P.D3, P.F3, P.A3]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.D4, P.F4, P.A4, P.D5, P.B4, P.A4, P.F4, P.D4,
          P.G3, P.B3, P.D4, P.G4, P.F4, P.D4, P.B3, P.G3
        ],
        bass: [P.D2, P.G2, P.A2, P.D2, P.F2, P.G2, P.E2, P.D2, P.G2, P.D2, P.E2, P.C2, P.A1, P.G2, P.D2, P.D1],
        drums: [
          { wadaiko: true, tsuzumi: true },
          { taiko: false },
          { wadaiko: false, taiko: true },
          { taiko: false }
        ]
      },

      // 11. 島津家専用曲：捨て奸・薩摩隼人
      shimazu: {
        id: 'shimazu',
        name: '捨て奸・薩摩隼人',
        genre: '島津家専用曲・剛毅木訥な低音金管と怒涛の軍鼓',
        desc: '九州南端から天下を揺るがす島津四兄弟。野太刀自顕流の一撃と「捨て奸」の覚悟を表現した、骨太で猛々しい重低音ブラス。',
        tempoMs: 170,
        melodyInst: 'horn',
        melody: [
          P.G3, P._, P.C4, P._,  P.Eb4, P.C4, P.Ab3, P._,
          P.F3, P.Bb3, P.D4, P._,  P.G3, P.Eb4, P.C4, P._,
          P.Bb3, P._, P.G4, P.Eb4, P.C4, P.Ab3, P.F4, P._,
          P.D4, P.B3, P.G3, P._,  P.Eb4, P.C4, P.G3, P._,
          P.Ab3, P._, P.C4, P.Eb4,  P.G3, P.Bb3, P.Eb4, P._,
          P.D4, P.F3, P.Bb3, P._,  P.G4, P.Eb4, P.C4, P._,
          P.C4, P._, P.Ab4, P.F4,  P.D4, P._, P.B3, P.G4,
          P.Eb4, P.C4, P.Ab3, P._,  P.G3, P.C4, P.Eb4, P._
        ],
        counterInst: 'trumpet',
        counter: [
          P.Eb3, P.Eb3, P.G3, P._,  P.C3, P.C3, P.Eb3, P._,
          P.D3, P.D3, P.F3, P._,  P.Eb3, P.Eb3, P.G3, P._,
          P.G3, P.G3, P.Bb3, P._,  P.Ab3, P.Ab3, P.C4, P._,
          P.B3, P.B3, P.D4, P._,  P.Eb3, P.Eb3, P.G3, P._
        ],
        chordInst: 'brass',
        chords: [
          [P.C3, P.Eb3, P.G3], [P.Ab2, P.C3, P.Eb3], [P.Bb2, P.D3, P.F3], [P.C3, P.Eb3, P.G3],
          [P.Eb3, P.G3, P.Bb3], [P.F3, P.Ab3, P.C4], [P.G3, P.B3, P.D4], [P.C3, P.Eb3, P.G3],
          [P.Ab2, P.C3, P.Eb3], [P.Eb3, P.G3, P.Bb3], [P.Bb2, P.D3, P.F3], [P.C3, P.Eb3, P.G3],
          [P.F3, P.Ab3, P.C4], [P.G2, P.B2, P.D3], [P.Ab2, P.C3, P.Eb3], [P.C3, P.Eb3, P.G3]
        ],
        arpInst: 'biwa',
        arpeggio: [
          P.C3, P.G3, P.C4, P.Eb4, P.C4, P.G3, P.Eb3, P.C3,
          P.Ab2, P.Eb3, P.Ab3, P.C4, P.Ab3, P.Eb3, P.C3, P.Ab2
        ],
        bass: [P.C2, P.Ab1, P.Bb1, P.C2, P.Eb2, P.F2, P.G2, P.C2, P.Ab1, P.Eb2, P.Bb1, P.C2, P.F2, P.G2, P.Ab1, P.C2],
        drums: [
          { wadaiko: true, timpani: true },
          { taiko: true },
          { wadaiko: true, timpani: true },
          { taiko: true, dora: true }
        ]
      },

      // 12. 北条家専用曲：五代の礎・相模小田原
      hojo: {
        id: 'hojo',
        name: '五代の礎・相模小田原',
        genre: '北条家専用曲・民を愛する温かなオーケストレーション',
        desc: '四公六民の善政と難攻不落の総構え。民百姓と城下が一体となった豊かさと安寧を讃える、温もり溢れる木管・弦楽合奏。',
        tempoMs: 210,
        melodyInst: 'oboe',
        melody: [
          P.C5, P.A4, P._, P.F4,  P.D5, P._, P.Bb4, P.F4,
          P.E5, P.C5, P.G4, P._,  P.A4, P.C5, P.F5, P._,
          P.F5, P.D5, P.A4, P._,  P.Bb4, P.D5, P.G4, P._,
          P.E5, P._, P.C5, P.G4,  P.C5, P.A4, P.F4, P._,
          P.F5, P.D5, P.Bb4, P._,  P.C5, P.A4, P.F4, P._,
          P.D5, P.Bb4, P.G4, P._,  P.E5, P.G5, P.C5, P._,
          P.A4, P.F5, P.D5, P._,  P.D5, P._, P.F4, P.Bb4,
          P.E5, P.C5, P.G4, P._,  P.C5, P.A4, P.F4, P._
        ],
        counterInst: 'flute',
        counter: [
          P.A3, P.A3, P.C4, P._,  P.D3, P.D3, P.F3, P._,
          P.E3, P.E3, P.G3, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.Bb3, P.Bb3, P.D4, P._,
          P.E3, P.E3, P.G3, P._,  P.A3, P.A3, P.C4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.F3, P.A3, P.C4], [P.Bb2, P.D3, P.F3], [P.C3, P.E3, P.G3], [P.F3, P.A3, P.C4],
          [P.D3, P.F3, P.A3], [P.G3, P.Bb3, P.D4], [P.C3, P.E3, P.G3], [P.F3, P.A3, P.C4],
          [P.Bb2, P.D3, P.F3], [P.F3, P.A3, P.C4], [P.G3, P.Bb3, P.D4], [P.C3, P.E3, P.G3],
          [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.C3, P.E3, P.G3], [P.F3, P.A3, P.C4]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.F3, P.A3, P.C4, P.F4, P.C4, P.A3, P.F3, P.C3,
          P.Bb2, P.D3, P.F3, P.Bb3, P.F3, P.D3, P.Bb2, P.F2
        ],
        bass: [P.F2, P.Bb1, P.C2, P.F2, P.D2, P.G2, P.C2, P.F2, P.Bb1, P.F2, P.G2, P.C2, P.D2, P.Bb1, P.C2, P.F2],
        drums: [
          { tsuzumi: true, hyoshigi: false },
          { tsuzumi: false, hyoshigi: false },
          { tsuzumi: false, hyoshigi: true },
          { tsuzumi: false, hyoshigi: false }
        ]
      },

      // 13. 茶会・文化専用曲：一期一会・風雅の茶会
      tea: {
        id: 'tea',
        name: '一期一会・風雅の茶会',
        genre: '茶会・名品鑑賞・水琴窟と十三絃箏の幽玄',
        desc: '千利休が極めた侘び茶の世界。静まり返った草庵に水滴が滴る水琴窟と、凛とした十三絃箏の爪弾きが魂を浄化する。',
        tempoMs: 280,
        melodyInst: 'shinobue',
        melody: [
          P.A4, P._, P._, P.E5,  P.D5, P._, P.A4, P._,
          P.B4, P._, P._, P.Gs4,  P.A4, P._, P._, P._,
          P.F4, P._, P.D5, P._,  P.C5, P._, P.A4, P._,
          P.B4, P._, P.E4, P._,  P.A4, P._, P._, P._,
          P.E5, P._, P.C5, P.A4,  P.D5, P.A4, P.F4, P._,
          P.B4, P.Gs4, P._, P.E4,  P.C5, P._, P.A4, P._,
          P.F4, P.D5, P._, P.A4,  P.B4, P.E5, P.Gs4, P._,
          P.A4, P._, P._, P._,  P.E4, P._, P._, P._
        ],
        counterInst: 'koto',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.Gs3, P.Gs3, P.B3, P._,
          P.E4, P.E4, P.C4, P._,  P.C4, P.C4, P.A3, P._,
          P.A3, P.A3, P.F3, P._,  P.B3, P.B3, P.Gs3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.A3, P.C4, P.E4], [P.D3, P.F3, P.A3], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4],
          [P.D3, P.F3, P.A3], [P.A3, P.C4, P.E4], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4],
          [P.A3, P.C4, P.E4], [P.D3, P.F3, P.A3], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4],
          [P.F3, P.A3, P.C4], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4], [P.A2, P.C3, P.E3]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.A3, P.E4, P.A4, P.C5, P.E5, P.C5, P.A4, P.E4,
          P.F3, P.C4, P.F4, P.A4, P.C5, P.A4, P.F4, P.C4
        ],
        bass: [P.A1, P.D1, P.E1, P.A1, P.D1, P.A1, P.E1, P.A1, P.A1, P.D1, P.E1, P.A1, P.F1, P.E1, P.A1, P.A1],
        drums: [
          { suzu: true },
          { suzu: false },
          { suzu: false },
          { suzu: false }
        ]
      },

      // 14. 外交・評定・謀略：深謀遠慮・策士の問答
      diplomacy: {
        id: 'diplomacy',
        name: '深謀遠慮・策士の問答',
        genre: '外交・調略・評定・ピチカートとチェロの心理劇',
        desc: '密室で交わされる同盟の密約と調略の罠。緊迫したピチカート弦楽と重苦しいチェロが、戦場以上の心理戦を浮き彫りにする。',
        tempoMs: 210,
        melodyInst: 'oboe',
        melody: [
          P.A4, P._, P.F4, P.D5,  P.F4, P.D4, P.Bb3, P._,
          P.D4, P.B3, P.Gs3, P._,  P.Cs4, P.E4, P.A4, P._,
          P.D5, P._, P.A4, P.F4,  P.Bb4, P.D5, P.G4, P._,
          P.E4, P.Cs5, P.A4, P._,  P.F4, P.D4, P.A3, P._,
          P.D5, P._, P.Bb4, P.F4,  P.G4, P.Bb4, P.D5, P._,
          P.E5, P.Cs5, P.A4, P._,  P.A4, P.F5, P.D5, P._,
          P.B3, P.D4, P.Gs4, P._,  P.Cs4, P.E4, P.A4, P._,
          P.F4, P.D5, P.Bb4, P._,  P.A4, P._, P.D4, P._
        ],
        counterInst: 'cello',
        counter: [
          P.F3, P.F3, P.A3, P._,  P.D3, P.D3, P.F3, P._,
          P.B2, P.B2, P.D3, P._,  P.Cs3, P.Cs3, P.E3, P._,
          P.F3, P.F3, P.A3, P._,  P.Bb2, P.Bb2, P.D3, P._,
          P.Cs3, P.Cs3, P.E3, P._,  P.F3, P.F3, P.A3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.Gs2, P.B2, P.D3], [P.A2, P.Cs3, P.E3],
          [P.D3, P.F3, P.A3], [P.G2, P.Bb2, P.D3], [P.A2, P.Cs3, P.E3], [P.D3, P.F3, P.A3],
          [P.Bb2, P.D3, P.F3], [P.G2, P.Bb2, P.D3], [P.A2, P.Cs3, P.E3], [P.D3, P.F3, P.A3],
          [P.Gs2, P.B2, P.D3], [P.A2, P.Cs3, P.E3], [P.Bb2, P.D3, P.F3], [P.D3, P.F3, P.A3]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.D3, P.F3, P.A3, P.D4, P.Cs4, P.A3, P.F3, P.D3,
          P.Bb2, P.D3, P.F3, P.Bb3, P.A3, P.F3, P.D3, P.Bb2
        ],
        bass: [P.D2, P.Bb1, P.Gs1, P.A1, P.D2, P.G1, P.A1, P.D2, P.Bb1, P.G1, P.A1, P.D2, P.Gs1, P.A1, P.Bb1, P.D2],
        drums: [
          { hyoshigi: true },
          { hyoshigi: false },
          { tsuzumi: true },
          { hyoshigi: false }
        ]
      },

      // 15. 軍勢進軍：出陣・鬨の声
      march: {
        id: 'march',
        name: '出陣・鬨の声',
        genre: '行軍・全軍出陣・勇壮なマーチとスネア・軍馬の地鳴り',
        desc: '城門が開き、天下を揺るがす大軍勢が進発する。スネア太鼓の行進リズムとホルンの咆哮、全軍一丸となった行進曲。',
        tempoMs: 160,
        melodyInst: 'trumpet',
        melody: [
          P.E4, P.E4, P._, P.A4,  P.C5, P.A4, P.F4, P._,
          P.D4, P.F4, P.A4, P._,  P.B3, P.E4, P.G4, P._,
          P.C5, P.A4, P.E5, P._,  P.A4, P.F4, P.C5, P._,
          P.Gs4, P.B4, P.E5, P._,  P.C5, P.A4, P.E4, P._,
          P.F5, P.C5, P.A4, P._,  P.E5, P.G4, P.C5, P._,
          P.D5, P.A4, P.F4, P._,  P.E5, P.C5, P.A4, P._,
          P.D5, P.F4, P.Bb4, P._,  P.Gs4, P.B4, P.E5, P._,
          P.A4, P.E5, P.C5, P._,  P.A4, P.C5, P.F4, P._
        ],
        counterInst: 'horn',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.G3, P.G3, P.B3, P._,
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.Gs3, P.Gs3, P.B3, P._,  P.C4, P.C4, P.E4, P._
        ],
        chordInst: 'brass',
        chords: [
          [P.A2, P.C3, P.E3], [P.F2, P.A2, P.C3], [P.D2, P.F2, P.A2], [P.E2, P.G2, P.B2],
          [P.A2, P.C3, P.E3], [P.F2, P.A2, P.C3], [P.E2, P.Gs2, P.B2], [P.A2, P.C3, P.E3],
          [P.F2, P.A2, P.C3], [P.C3, P.E3, P.G3], [P.D2, P.F2, P.A2], [P.A2, P.C3, P.E3],
          [P.Bb2, P.D3, P.F3], [P.E2, P.Gs2, P.B2], [P.A2, P.C3, P.E3], [P.F2, P.A2, P.C3]
        ],
        arpInst: 'biwa',
        arpeggio: [
          P.A3, P.C4, P.E4, P.A4, P.E4, P.C4, P.A3, P.E3,
          P.F3, P.A3, P.C4, P.F4, P.E4, P.C4, P.A3, P.F3
        ],
        bass: [P.A1, P.F1, P.D1, P.E1, P.A1, P.F1, P.E1, P.A1, P.F2, P.C2, P.D2, P.A1, P.Bb1, P.E2, P.A1, P.F1],
        drums: [
          { wadaiko: true, timpani: true },
          { taiko: true },
          { wadaiko: true, taiko: true },
          { taiko: true, cymbal: true }
        ]
      },

      // 16. 合戦通常：天王山・野戦激突
      battle: {
        id: 'battle',
        name: '合戦・天王山',
        genre: '野戦・緊迫するストリングス・リフと陣太鼓の激突',
        desc: '両軍本隊が野戦で激突。疾走するバイオリンの刻みリフと、怒涛の陣太鼓が交錯する王道の戦国合戦バトル交響曲。',
        tempoMs: 135,
        melodyInst: 'violin',
        melody: [
          P.E5, P._, P.C5, P.E5,  P.A4, P.C5, P.F5, P._,
          P.D5, P.A4, P._, P.F5,  P.B4, P.E5, P.G5, P._,
          P.A5, P.E5, P.C5, P._,  P.D5, P.B4, P.G4, P._,
          P.A4, P.C5, P.F5, P._,  P.B4, P.Gs4, P.E5, P._,
          P.C5, P.F5, P.A4, P._,  P.D5, P.F5, P.A4, P._,
          P.E5, P.C5, P.A5, P._,  P.B4, P.Gs4, P.E5, P._,
          P.D5, P._, P.B4, P.G5,  P.A4, P.C5, P.F5, P._,
          P.Gs4, P.E5, P.B4, P._,  P.A4, P._, P.E5, P.C5
        ],
        counterInst: 'horn',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.G3, P.G3, P.B3, P._,
          P.C4, P.C4, P.E4, P._,  P.B3, P.B3, P.D4, P._,
          P.A3, P.A3, P.C4, P._,  P.Gs3, P.Gs3, P.B3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.A3, P.C4, P.E4], [P.F3, P.A3, P.C4], [P.D3, P.F3, P.A3], [P.E3, P.G3, P.B3],
          [P.A3, P.C4, P.E4], [P.G3, P.B3, P.D4], [P.F3, P.A3, P.C4], [P.E3, P.Gs3, P.B3],
          [P.F3, P.A3, P.C4], [P.D3, P.F3, P.A3], [P.A3, P.C4, P.E4], [P.E3, P.Gs3, P.B3],
          [P.G3, P.B3, P.D4], [P.F3, P.A3, P.C4], [P.E3, P.Gs3, P.B3], [P.A3, P.C4, P.E4]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.A4, P.E4, P.C4, P.E4, P.A4, P.C5, P.B4, P.E4,
          P.D4, P.F4, P.A4, P.D5, P.C5, P.A4, P.E4, P.A3
        ],
        bass: [P.A2, P.F2, P.D2, P.E2, P.A2, P.G2, P.F2, P.E2, P.F2, P.D2, P.A2, P.E2, P.G2, P.F2, P.E2, P.A2],
        drums: [
          { wadaiko: true, timpani: true },
          { taiko: true },
          { wadaiko: true, taiko: true },
          { taiko: true, cymbal: true }
        ]
      },

      // 17. 決戦・総力戦：乾坤一擲・決戦の修羅
      battle_intense: {
        id: 'battle_intense',
        name: '乾坤一擲・決戦の修羅',
        genre: '決戦・大合戦・混声コーラスと咆哮するブラス・ティンパニ乱打',
        desc: '菅野よう子オーケストラの頂点。歴史を二分する関ヶ原級の大決戦。荘厳な混声クワイヤ合唱とティンパニ乱打が修羅場を描く。',
        tempoMs: 120,
        melodyInst: 'trumpet',
        melody: [
          P.D5, P.A4, P.D5, P._,  P.Bb4, P._, P.D5, P.G5,
          P.E5, P.C5, P._, P.G4,  P.Cs5, P.E5, P.A5, P._,
          P.D5, P.F5, P.A5, P._,  P.F5, P.D5, P.Bb4, P._,
          P.D5, P.Bb4, P.G4, P._,  P.E5, P.Cs5, P.A4, P._,
          P.F5, P.D5, P.Bb4, P._,  P.A4, P.C5, P.F5, P._,
          P.D5, P.Bb4, P.G5, P._,  P.A4, P.D5, P.F5, P._,
          P.E5, P.G4, P.C5, P._,  P.Cs5, P.A4, P.E5, P._,
          P.D5, P.F5, P.A5, P._,  P.E5, P.Cs5, P.A4, P._
        ],
        counterInst: 'horn',
        counter: [
          P.F3, P.F3, P.A3, P._,  P.Bb3, P.Bb3, P.D4, P._,
          P.E3, P.E3, P.G3, P._,  P.Cs4, P.Cs4, P.E4, P._,
          P.F3, P.F3, P.A3, P._,  P.D3, P.D3, P.F3, P._,
          P.Bb3, P.Bb3, P.D4, P._,  P.Cs4, P.Cs4, P.E4, P._
        ],
        chordInst: 'choir',
        chords: [
          [P.D3, P.F3, P.A3], [P.G3, P.Bb3, P.D4], [P.C3, P.E3, P.G3], [P.A3, P.Cs4, P.E4],
          [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.G3, P.Bb3, P.D4], [P.A3, P.Cs4, P.E4],
          [P.Bb2, P.D3, P.F3], [P.F3, P.A3, P.C4], [P.G3, P.Bb3, P.D4], [P.D3, P.F3, P.A3],
          [P.C3, P.E3, P.G3], [P.A3, P.Cs4, P.E4], [P.D3, P.F3, P.A3], [P.A2, P.Cs3, P.E3]
        ],
        arpInst: 'biwa',
        arpeggio: [
          P.D4, P.F4, P.A4, P.D5, P.C5, P.A4, P.F4, P.D4,
          P.G3, P.Bb3, P.D4, P.G4, P.F4, P.D4, P.Bb3, P.G3
        ],
        bass: [P.D2, P.G2, P.C2, P.A2, P.D2, P.Bb1, P.G1, P.A1, P.Bb1, P.F2, P.G2, P.D2, P.C2, P.A1, P.D2, P.A1],
        drums: [
          { wadaiko: true, timpani: true, cymbal: true },
          { taiko: true },
          { wadaiko: true, timpani: true },
          { taiko: true, cymbal: true, dora: true }
        ]
      },

      // 18. 攻城戦：難攻不落・攻城の鉄鎖
      siege: {
        id: 'siege',
        name: '難攻不落・攻城の鉄鎖',
        genre: '攻城戦・重々しい低弦と重層打楽器の包囲網',
        desc: '巨大山城を取り囲む幾重もの包囲陣。重低音コントラバスの執拗なリフレインと、城壁を叩く大筒の轟音を思わせる重厚な調べ。',
        tempoMs: 175,
        melodyInst: 'oboe',
        melody: [
          P.A3, P._, P.D4, P._,  P.D4, P.Bb3, P.F3, P._,
          P.Bb3, P._, P.D4, P.G3,  P.Cs4, P.E4, P.A3, P._,
          P.D4, P.F4, P.A4, P._,  P.G4, P.Eb4, P.Bb3, P._,
          P.E4, P.Cs4, P.A3, P._,  P.F4, P.D4, P.A3, P._,
          P.Bb3, P._, P.D4, P.G3,  P.A3, P.D4, P.F4, P._,
          P.Cs4, P.E4, P.A3, P._,  P.D4, P.F4, P.A4, P._,
          P.F4, P.D4, P.Bb3, P._,  P.E4, P._, P.Cs4, P.A3,
          P.A3, P._, P.D4, P._,  P.F4, P._, P.D4, P._
        ],
        counterInst: 'horn',
        counter: [
          P.F3, P.F3, P.A3, P._,  P.D3, P.D3, P.F3, P._,
          P.Bb3, P.Bb3, P.D4, P._,  P.Cs3, P.Cs3, P.E3, P._,
          P.F3, P.F3, P.A3, P._,  P.G3, P.G3, P.Bb3, P._,
          P.Cs3, P.Cs3, P.E3, P._,  P.F3, P.F3, P.A3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.D3, P.F3, P.A3], [P.Bb2, P.D3, P.F3], [P.G2, P.Bb2, P.D3], [P.A2, P.Cs3, P.E3],
          [P.D3, P.F3, P.A3], [P.Eb3, P.G3, P.Bb3], [P.A2, P.Cs3, P.E3], [P.D3, P.F3, P.A3],
          [P.G2, P.Bb2, P.D3], [P.D3, P.F3, P.A3], [P.A2, P.Cs3, P.E3], [P.D3, P.F3, P.A3],
          [P.Bb2, P.D3, P.F3], [P.A2, P.Cs3, P.E3], [P.D3, P.F3, P.A3], [P.D2, P.F2, P.A2]
        ],
        arpInst: 'biwa',
        arpeggio: [
          P.D3, P.A3, P.D4, P.F4, P.D4, P.A3, P.F3, P.D3,
          P.Bb2, P.F3, P.Bb3, P.D4, P.Bb3, P.F3, P.D3, P.Bb2
        ],
        bass: [P.D1, P.Bb0, P.G0, P.A0, P.D1, P.Eb1, P.A0, P.D1, P.G1, P.D1, P.A0, P.D1, P.Bb0, P.A0, P.D1, P.D1],
        drums: [
          { wadaiko: true, dora: true },
          { taiko: false },
          { wadaiko: true, timpani: true },
          { taiko: true }
        ]
      },

      // 19. 劣勢・危機：孤城落日・死線の防壁
      crisis: {
        id: 'crisis',
        name: '孤城落日・死線の防壁',
        genre: '劣勢・本拠急襲・胸を締め付ける悲壮なバイオリンとオーボエ',
        desc: '敵の大軍に城を囲まれ、風前の灯火となった本拠。悲壮感漂うソロバイオリンと重苦しいティンパニが死線の緊張感を煽る。',
        tempoMs: 230,
        melodyInst: 'violin',
        melody: [
          P.C5, P._, P.B4, P.A4,  P.A4, P.F4, P.D5, P._,
          P.B4, P._, P.Gs4, P.E4,  P.E5, P.C5, P.A4, P._,
          P.C5, P.A4, P.F4, P._,  P.F4, P.D4, P.A4, P._,
          P.B4, P.Gs4, P.E5, P._,  P.A4, P._, P.C5, P.E4,
          P.D5, P._, P.Bb4, P.F4,  P.A4, P.C5, P.F4, P._,
          P.D5, P.A4, P.F4, P._,  P.E5, P.C5, P.A4, P._,
          P.B4, P.Gs4, P.E4, P._,  P.Gs4, P.B4, P.E5, P._,
          P.C5, P.A4, P.E4, P._,  P.A4, P._, P._, P._
        ],
        counterInst: 'oboe',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.F3, P.F3, P.A3, P._,
          P.Gs3, P.Gs3, P.B3, P._,  P.C4, P.C4, P.E4, P._,
          P.A3, P.A3, P.C4, P._,  P.F3, P.F3, P.A3, P._,
          P.Gs3, P.Gs3, P.B3, P._,  P.C4, P.C4, P.E4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.A2, P.C3, P.E3], [P.D2, P.F2, P.A2], [P.E2, P.Gs2, P.B2], [P.A2, P.C3, P.E3],
          [P.F2, P.A2, P.C3], [P.D2, P.F2, P.A2], [P.E2, P.Gs2, P.B2], [P.A2, P.C3, P.E3],
          [P.Bb2, P.D3, P.F3], [P.F2, P.A2, P.C3], [P.D2, P.F2, P.A2], [P.A2, P.C3, P.E3],
          [P.E2, P.Gs2, P.B2], [P.E2, P.Gs2, P.B2], [P.A2, P.C3, P.E3], [P.A2, P.C3, P.E3]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.A3, P.C4, P.E4, P.A4, P.Gs4, P.E4, P.C4, P.A3,
          P.D3, P.F3, P.A3, P.D4, P.C4, P.A3, P.F3, P.D3
        ],
        bass: [P.A1, P.D1, P.E1, P.A1, P.F1, P.D1, P.E1, P.A1, P.Bb1, P.F1, P.D1, P.A1, P.E1, P.E1, P.A1, P.A1],
        drums: [
          { wadaiko: true, timpani: true },
          { taiko: false },
          { wadaiko: false },
          { taiko: true }
        ]
      },

      // 20. 優勢・勝機：破竹の勢い・勝機来たる
      advantage: {
        id: 'advantage',
        name: '破竹の勢い・勝機来たる',
        genre: '優勢・追撃・勝利を確信した輝かしいトランペット',
        desc: '敵陣崩壊、勝機を捉えて全軍突撃。まばゆいファンファーレと軽快なストリングスが、勝利への歓喜を歌い上げる。',
        tempoMs: 140,
        melodyInst: 'trumpet',
        melody: [
          P.Fs5, P.D5, P._, P.A4,  P.B4, P.D5, P.G5, P._,
          P.E5, P.Cs5, P.A4, P._,  P.Fs5, P.A5, P.D5, P._,
          P.D5, P.B4, P.Fs4, P._,  P.G4, P.B4, P.D5, P._,
          P.E5, P.Cs5, P.A4, P._,  P.Fs5, P.D5, P.A4, P._,
          P.D5, P.B4, P.G5, P._,  P.Fs5, P.A4, P.D5, P._,
          P.E5, P.Cs5, P.A5, P._,  P.Fs4, P.B4, P.D5, P._,
          P.B4, P.G4, P.D5, P._,  P.E5, P._, P.Cs5, P.A4,
          P.Fs5, P.D5, P.A4, P._,  P.D5, P.A4, P.Fs4, P._
        ],
        counterInst: 'violin',
        counter: [
          P.Fs3, P.Fs3, P.A3, P._,  P.B3, P.B3, P.D4, P._,
          P.Cs3, P.Cs3, P.E3, P._,  P.Fs3, P.Fs3, P.A3, P._,
          P.D3, P.D3, P.Fs3, P._,  P.B3, P.B3, P.D4, P._,
          P.Cs3, P.Cs3, P.E3, P._,  P.Fs3, P.Fs3, P.A3, P._
        ],
        chordInst: 'brass',
        chords: [
          [P.D3, P.Fs3, P.A3], [P.G2, P.B2, P.D3], [P.A2, P.Cs3, P.E3], [P.D3, P.Fs3, P.A3],
          [P.B2, P.D3, P.Fs3], [P.G2, P.B2, P.D3], [P.A2, P.Cs3, P.E3], [P.D3, P.Fs3, P.A3],
          [P.G2, P.B2, P.D3], [P.D3, P.Fs3, P.A3], [P.A2, P.Cs3, P.E3], [P.B2, P.D3, P.Fs3],
          [P.G2, P.B2, P.D3], [P.A2, P.Cs3, P.E3], [P.D3, P.Fs3, P.A3], [P.D3, P.Fs3, P.A3]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.D4, P.Fs4, P.A4, P.D5, P.A4, P.Fs4, P.D4, P.A3,
          P.G3, P.B3, P.D4, P.G4, P.D4, P.B3, P.G3, P.D3
        ],
        bass: [P.D2, P.G1, P.A1, P.D2, P.B1, P.G1, P.A1, P.D2, P.G2, P.D2, P.A1, P.B1, P.G1, P.A1, P.D2, P.D2],
        drums: [
          { wadaiko: true, timpani: true, cymbal: true },
          { taiko: true },
          { wadaiko: true, taiko: true },
          { taiko: true, cymbal: true }
        ]
      },

      // 21. 歴史イベント：風雲急・歴史の転換点
      event: {
        id: 'event',
        name: '風雲急・歴史の転換点',
        genre: '本能寺の変・歴史イベント・衝撃と運命のドラマ',
        desc: '「敵は本能寺にあり」。突如訪れる歴史の激変。ドラマチックな不協和音から広がる、運命の歯車が軋む重厚なオーケストレーション。',
        tempoMs: 200,
        melodyInst: 'violin',
        melody: [
          P.G4, P._, P.C5, P.Eb5,  P.C5, P.Ab4, P._, P.Eb4,
          P.Ab4, P.C5, P.F5, P._,  P.D5, P.B4, P.G4, P._,
          P.Eb5, P.C5, P.G4, P._,  P.C5, P.A4, P.Fs4, P._,
          P.D5, P._, P.B4, P.G4,  P.G4, P.Eb5, P.C5, P._,
          P.Eb5, P.C5, P.Ab4, P._,  P.G4, P.C5, P.Eb5, P._,
          P.D5, P.B4, P.G5, P._,  P.Eb5, P.C5, P.G4, P._,
          P.C5, P.Ab4, P.F5, P._,  P.B4, P.D5, P.G4, P._,
          P.Eb5, P.C5, P.G4, P._,  P.C5, P._, P.G4, P.Eb4
        ],
        counterInst: 'oboe',
        counter: [
          P.Eb3, P.Eb3, P.G3, P._,  P.C3, P.C3, P.Eb3, P._,
          P.Ab3, P.Ab3, P.C4, P._,  P.B3, P.B3, P.D4, P._,
          P.Eb3, P.Eb3, P.G3, P._,  P.A3, P.A3, P.C4, P._,
          P.B3, P.B3, P.D4, P._,  P.Eb3, P.Eb3, P.G3, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.C3, P.Ds3, P.G3], [P.Ab2, P.C3, P.Ds3], [P.F2, P.Ab2, P.C3], [P.G2, P.B2, P.D3],
          [P.C3, P.Ds3, P.G3], [P.Fs2, P.A2, P.C3], [P.G2, P.B2, P.D3], [P.C3, P.Ds3, P.G3],
          [P.Ab2, P.C3, P.Eb3], [P.C3, P.Eb3, P.G3], [P.G2, P.B2, P.D3], [P.C3, P.Eb3, P.G3],
          [P.F2, P.Ab2, P.C3], [P.G2, P.B2, P.D3], [P.C3, P.Eb3, P.G3], [P.C3, P.Eb3, P.G3]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.C4, P.Ds4, P.G4, P.C5, P.B4, P.G4, P.Ds4, P.C4,
          P.Ab3, P.C4, P.Ds4, P.Ab4, P.G4, P.Ds4, P.C4, P.Ab3
        ],
        bass: [P.C2, P.Ab1, P.F1, P.G1, P.C2, P.Fs1, P.G1, P.C2, P.Ab1, P.C2, P.G1, P.C2, P.F1, P.G1, P.C2, P.C1],
        drums: [
          { dora: true, timpani: true },
          { taiko: false },
          { wadaiko: true },
          { taiko: true, cymbal: true }
        ]
      },

      // 22. 征夷大将軍宣下：征夷大将軍・武門の頂
      shogun: {
        id: 'shogun',
        name: '征夷大将軍・武門の頂',
        genre: '将軍拝命・朝廷参内・雅楽の笙・篳篥とクラシックの融合',
        desc: '朝廷より征夷大将軍に任ぜられ、武士の頂点に立つ瞬間。雅楽の笙・篳篥を思わせる神々しい和音と、堂々たる宮廷交響楽。',
        tempoMs: 220,
        melodyInst: 'flute',
        melody: [
          P.D5, P.D5, P.B4, P.G4,  P.E5, P._, P.C5, P.G4,
          P.Fs4, P.A4, P.D5, P._,  P.B4, P._, P.D5, P.G5,
          P.B4, P.G4, P.E5, P._,  P.G4, P.E5, P.C5, P._,
          P.A4, P.Fs4, P.D5, P._,  P.B4, P.G4, P.D4, P._,
          P.E5, P.G4, P.C5, P._,  P.D5, P.B4, P.G4, P._,
          P.G4, P.B4, P.E5, P._,  P.Fs4, P.A4, P.D5, P._,
          P.A4, P.C5, P.E5, P._,  P.Fs4, P.A4, P.D5, P._,
          P.B4, P.D5, P.G5, P._,  P.D5, P.B4, P.G4, P._
        ],
        counterInst: 'horn',
        counter: [
          P.B3, P.B3, P.D4, P._,  P.E3, P.E3, P.G3, P._,
          P.Fs3, P.Fs3, P.A3, P._,  P.B3, P.B3, P.D4, P._,
          P.G3, P.G3, P.B3, P._,  P.E3, P.E3, P.G3, P._,
          P.Fs3, P.Fs3, P.A3, P._,  P.B3, P.B3, P.D4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.G3, P.B3, P.D4], [P.C3, P.E3, P.G3], [P.D3, P.Fs3, P.A3], [P.G3, P.B3, P.D4],
          [P.E3, P.G3, P.B3], [P.C3, P.E3, P.G3], [P.D3, P.Fs3, P.A3], [P.G3, P.B3, P.D4],
          [P.C3, P.E3, P.G3], [P.G3, P.B3, P.D4], [P.E3, P.G3, P.B3], [P.D3, P.Fs3, P.A3],
          [P.A2, P.C3, P.E3], [P.D3, P.Fs3, P.A3], [P.G3, P.B3, P.D4], [P.G2, P.B2, P.D3]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.G3, P.D4, P.G4, P.B4, P.D5, P.B4, P.G4, P.D4,
          P.C3, P.G3, P.C4, P.E4, P.G4, P.E4, P.C4, P.G3
        ],
        bass: [P.G2, P.C2, P.D2, P.G2, P.E2, P.C2, P.D2, P.G2, P.C2, P.G2, P.E2, P.D2, P.A1, P.D2, P.G2, P.G1],
        drums: [
          { suzu: true, tsuzumi: true },
          { tsuzumi: false },
          { hyoshigi: true },
          { tsuzumi: false }
        ]
      },

      // 23. 天下統一・エンドロール：大団円・天下泰平交響詩
      victory: {
        id: 'victory',
        name: '大団円・天下泰平交響詩',
        genre: '天下統一エンドロール・菅野よう子最高峰の圧倒的フルオーケストラ大円舞曲',
        desc: '戦乱の世を鎮め、二百年の泰平を打ち立てた英傑に捧ぐ。フルート、金管、ハープ、壮麗な弦楽が織りなす感動の大河交響詩。',
        tempoMs: 190,
        melodyInst: 'violin',
        melody: [
          P.E5, P._, P.G4, P.C5,  P.E5, P.C5, P.A4, P._,
          P.A4, P.C5, P.F5, P._,  P.D5, P.B4, P.G4, P._,
          P.E5, P.G5, P._, P.C5,  P.A4, P._, P.C5, P.F5,
          P.D5, P.A4, P.F4, P._,  P.B4, P.D5, P.G4, P._,
          P.E5, P._, P.G5, P.C6,  P.A5, P.F5, P.C5, P._,
          P.D5, P.B4, P.G4, P._,  P.E5, P.C5, P.G4, P.C5,
          P.E5, P._, P.C5, P.A4,  P.F5, P.C5, P.A4, P._,
          P.G5, P.E5, P.C5, P._,  P.D5, P.B4, P.G5, P._,
          P.A5, P.F5, P.C5, P._,  P.D5, P.F5, P.A4, P._,
          P.B4, P.D5, P.G4, P._,  P.E5, P.C5, P.G4, P.C5
        ],
        counterInst: 'horn',
        counter: [
          P.E4, P.E4, P.G4, P._,  P.C4, P.C4, P.E4, P._,
          P.A3, P.A3, P.C4, P._,  P.B3, P.B3, P.D4, P._,
          P.E4, P.E4, P.G4, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.B3, P.B3, P.D4, P._,
          P.E4, P.E4, P.G4, P._,  P.A3, P.A3, P.C4, P._,
          P.B3, P.B3, P.D4, P._,  P.E4, P.E4, P.G4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.C3, P.E3, P.G3], [P.A2, P.C3, P.E3], [P.F2, P.A2, P.C3], [P.G2, P.B2, P.D3],
          [P.C3, P.E3, P.G3], [P.F2, P.A2, P.C3], [P.D2, P.F2, P.A2], [P.G2, P.B2, P.D3],
          [P.C3, P.E3, P.G3], [P.F2, P.A2, P.C3], [P.G2, P.B2, P.D3], [P.C3, P.E3, P.G3],
          [P.A2, P.C3, P.E3], [P.F2, P.A2, P.C3], [P.C3, P.E3, P.G3], [P.G2, P.B2, P.D3],
          [P.F2, P.A2, P.C3], [P.D2, P.F2, P.A2], [P.G2, P.B2, P.D3], [P.C3, P.E3, P.G3]
        ],
        arpInst: 'harp',
        arpeggio: [
          P.C4, P.E4, P.G4, P.C5, P.B4, P.G4, P.E4, P.C4,
          P.A3, P.C4, P.E4, P.A4, P.G4, P.E4, P.C4, P.A3,
          P.F3, P.A3, P.C4, P.F4, P.E4, P.C4, P.A3, P.F3,
          P.G3, P.B3, P.D4, P.G4, P.F4, P.D4, P.B3, P.G3
        ],
        bass: [P.C2, P.A1, P.F1, P.G1, P.C2, P.F1, P.D1, P.G1, P.C2, P.F1, P.G1, P.C2, P.A1, P.F1, P.C2, P.G1, P.F1, P.D1, P.G1, P.C2],
        drums: [
          { timpani: true, cymbal: true, wadaiko: true },
          { taiko: true },
          { timpani: true, taiko: false },
          { taiko: true, cymbal: false }
        ]
      },

      // 24. 御家滅亡・敗北：散りゆく華・もののあわれ
      tragedy: {
        id: 'tragedy',
        name: '散りゆく華・もののあわれ',
        genre: '御家滅亡・敗北・尺八とチェロによる涙の鎮魂送葬曲',
        desc: '夢幻の如く散り果てた戦国武将たちの哀切。尺八のかすれ息とチェロ独奏が、諸行無常のもののあわれを深く静かに奏でる。',
        tempoMs: 310,
        melodyInst: 'shinobue',
        melody: [
          P.E5, P.E5, P._, P.C5,  P.A4, P._, P.C5, P._,
          P.D5, P._, P.A4, P._,  P.B4, P._, P.Gs4, P._,
          P.C5, P.A4, P.E4, P._,  P.F4, P._, P.A4, P.C5,
          P.B4, P.Gs4, P._, P.E4,  P.A4, P._, P._, P._,
          P.C5, P._, P.A4, P.F4,  P.D5, P._, P.A4, P._,
          P.E4, P.C5, P.A4, P._,  P.Gs4, P._, P.B4, P.E4,
          P.F4, P.D4, P.A3, P._,  P.B4, P._, P.Gs4, P._,
          P.C5, P._, P.A4, P._,  P.A4, P._, P._, P._
        ],
        counterInst: 'cello',
        counter: [
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.F3, P.F3, P.A3, P._,  P.Gs3, P.Gs3, P.B3, P._,
          P.C4, P.C4, P.E4, P._,  P.A3, P.A3, P.C4, P._,
          P.Gs3, P.Gs3, P.B3, P._,  P.C4, P.C4, P.E4, P._
        ],
        chordInst: 'strings',
        chords: [
          [P.A2, P.C3, P.E3], [P.F2, P.A2, P.C3], [P.D2, P.F2, P.A2], [P.E2, P.Gs2, P.B2],
          [P.A2, P.C3, P.E3], [P.F2, P.A2, P.C3], [P.E2, P.Gs2, P.B2], [P.A2, P.C3, P.E3],
          [P.F2, P.A2, P.C3], [P.D2, P.F2, P.A2], [P.A2, P.C3, P.E3], [P.E2, P.Gs2, P.B2],
          [P.D2, P.F2, P.A2], [P.E2, P.Gs2, P.B2], [P.A2, P.C3, P.E3], [P.A2, P.C3, P.E3]
        ],
        arpInst: 'koto',
        arpeggio: [
          P.A3, P.E4, P.A4, P.C5, P.B4, P.A4, P.E4, P.C4,
          P.F3, P.C4, P.F4, P.A4, P.E4, P.C4, P.A3, P.E3
        ],
        bass: [P.A1, P.F1, P.D1, P.E1, P.A1, P.F1, P.E1, P.A1, P.F1, P.D1, P.A1, P.E1, P.D1, P.E1, P.A1, P.A1],
        drums: [
          { dora: true },
          { dora: false },
          { dora: false },
          { dora: false }
        ]
      }
    };
  }

  // ============================================================================
  // オーディオ初期化＆マスターエフェクトルーティング
  // ============================================================================
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') {
        const unlockAudio = () => {
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
          document.removeEventListener('click', unlockAudio);
          document.removeEventListener('keydown', unlockAudio);
          document.removeEventListener('touchstart', unlockAudio);
        };
        document.addEventListener('click', unlockAudio, { once: true, passive: true });
        document.addEventListener('keydown', unlockAudio, { once: true, passive: true });
        document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
      }
    } catch (e) {
      console.warn('AudioContext creation deferred until user interaction:', e);
      return;
    }

    // 1. プロフェッショナル・マスタリング・コンプレッサー（音割れ防止と豊かなパンチ）
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
    this.compressor.connect(this.ctx.destination);

    // 2. マスターゲイン
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.compressor);

    // 3. BGM ＆ SE ゲイン
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.isBgmMuted ? 0 : this.bgmVolume, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.seGain = this.ctx.createGain();
    this.seGain.gain.setValueAtTime(this.isSeMuted ? 0 : this.seVolume, this.ctx.currentTime);
    this.seGain.connect(this.masterGain);

    // 4. 大河ドラマ風 コンボリューション・リバーブ（大空間の極上残響）
    this.createConvolver();
  }

  createConvolver() {
    if (!this.ctx) return;
    const rate = this.ctx.sampleRate;
    const length = rate * 2.8; // 大ホール級の残響
    const decay = 2.1;
    const buffer = this.ctx.createBuffer(2, length, rate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const factor = Math.exp(-t * decay);
      // 自然な初期反射とステレオ広がり
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = buffer;

    this.convolverGain = this.ctx.createGain();
    this.convolverGain.gain.setValueAtTime(0.48, this.ctx.currentTime);

    this.convolver.connect(this.convolverGain);
    this.convolverGain.connect(this.masterGain);

    // 効果音の残響送り：効果音の ON/OFF・音量に連動（2026-10-11 bj）
    this.seWet = this.ctx.createGain();
    this.seWet.gain.setValueAtTime(this.isSeMuted ? 0 : this.seVolume, this.ctx.currentTime);
    this.seWet.connect(this.convolver);
  }

  // 効果音バス（直接音・残響送り）の音量を設定に合わせる
  applySeGains() {
    if (!this.ctx) return;
    const v = this.isSeMuted ? 0 : this.seVolume;
    const t = this.ctx.currentTime;
    [this.seGain, this.seWet].forEach(g => {
      if (!g) return;
      try { g.gain.cancelScheduledValues(t); } catch (e) {}
      g.gain.setValueAtTime(v, t);
    });
  }

  // ============================================================================
  // 再生制御・シーケンサー
  // ============================================================================
  playTrack(trackKey, force = false, opts = null) {
    if (!this.tracks[trackKey]) {
      if (trackKey === 'ending') trackKey = 'victory';
      else if (trackKey === 'defeat') trackKey = 'tragedy';
      else return;
    }
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!force && this.currentTrack === trackKey && this.timerId) return;

    // 効果音 OFF・BGM ON：自動の曲替え（季節替わり・画面の stinger・画面を閉じた後の戻り）で新しい音の立ち上がりを出さない（2026-10-11 bx）
    let softStart = false;
    if (!force && opts && (opts.seasonRestart || opts.stinger || opts.seasonReturn)
        && this.autoAdvanceQuiet() && !this.isBgmMuted && this.timerId && this.currentTrack && this.tracks[this.currentTrack]) { // オート進行中のみ（2026-10-11 cb）
      if (opts.stinger) return;                                                   // 画面の曲替えはしない（今の曲を続ける）
      if (SengokuMusicEngine.HOME_TRACKS.includes(this.currentTrack)) return;     // 季節曲・大名曲はそのまま流し続ける
      softStart = true;                                                           // 場面曲からは静かにクロスフェード
    }

    this.currentTrack = trackKey;
    this.stepIndex = 0;
    this._softStartSteps = softStart ? SengokuMusicEngine.SOFT_START_STEPS : 0;
    // 季節替わりで曲を頭から始めるときだけ、最初の拍の打楽器を鳴らさない（2026-10-11 bq）
    this._skipFirstPercussion = !!(opts && opts.seasonRestart);
    // 画面に合わせた曲替え（イベント・当主逝去・包囲網）は、効果音 OFF なら曲頭の打楽器を鳴らさない（2026-10-11 br）
    if (opts && opts.stinger && this.isSeMuted) this._skipFirstPercussion = true;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // 先読みで予約済みの前の曲を短くフェードアウトし、新しい曲用のバスを用意
    const track = this.tracks[trackKey];
    const softSec = softStart ? Math.max(0.5, SengokuMusicEngine.SOFT_START_STEPS * (track.tempoMs || 250) / 1000) : 0;
    this.retireTrackBus(softStart ? softSec : 0.12);
    this.createTrackBus(softSec);

    this.stepMs = track.tempoMs;
    // 先読みスケジューラ：拍は AudioContext の時刻で数え、少し先までまとめて予約する（画面処理で止まらない）
    this.nextStepTime = this.ctx.currentTime + 0.03;
    this.scheduleAhead();
    this.timerId = setInterval(() => {
      this.scheduleAhead();
    }, SengokuMusicEngine.SCHEDULER_TICK_MS);

    // バッジ等のUI更新通知
    const badge = document.getElementById('bgmTitleBadge');
    if (badge && !this.isBgmMuted) {
      badge.textContent = `🎵 ${track.name}`;
    }
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    // 先読みで予約済みの音も止める
    this.retireTrackBus();
  }

  // ============================================================================
  // [86位] 戦況連動ダイナミック自動選曲エンジン (全24曲クロスフェード)
  // ============================================================================
  evaluateDynamicBGM(game) {
    if (!game || this.isBgmMuted) return;
    if (this.isDynamicBgmDisabled) return;

    let targetTrack = null;

    if (game.inBattle && game.currentBattle) {
      const b = game.currentBattle;
      const pMax = Math.max(1, b.playerMax || b.playerTroops);
      const eMax = Math.max(1, b.enemyMax || b.enemyTroops);
      const totalTroops = (b.playerTroops || 0) + (b.enemyTroops || 0);

      if (b.playerTroops <= (pMax * 0.35) || (b.playerTroops < b.enemyTroops * 0.45)) {
        targetTrack = 'crisis'; // 孤城落日・絶体絶命の危機
      } else if (b.enemyTroops <= (eMax * 0.30) || (b.enemyTroops < b.playerTroops * 0.35)) {
        targetTrack = 'advantage'; // 勝機来たる・総反撃の狼煙
      } else if (totalTroops >= 6000) {
        targetTrack = 'battle_intense'; // 死闘決戦・槍衾と騎馬突撃
      } else {
        targetTrack = 'battle'; // 野戦開戦・陣太鼓と激突
      }
    } else if (game.currentSiege) {
      const s = game.currentSiege;
      if (s.enemyTroops <= (s.enemyTroopsMax * 0.30) || s.castleWall <= 25) {
        targetTrack = 'advantage'; // 落城寸前・勝機来たる
      } else {
        targetTrack = 'siege'; // 城壁包囲・鉄壁の要塞
      }
    } else {
      // 平時・政略画面
      const myProvs = (game.provinces || []).filter(p => p.ownerId === game.playerClanId);
      const provCount = myProvs.length;
      const totalProvs = (game.provinces || []).length || 66;

      if (provCount >= totalProvs - 4 || provCount >= 50) {
        targetTrack = 'shogun'; // 天下静謐・大将軍目前
      } else if (game.coalitionFormed) {
        targetTrack = 'diplomacy'; // 諸侯包囲網・外交談判
      } else if (provCount >= 14) {
        targetTrack = 'march'; // 大軍進発・街道を埋め尽くす武者
      } else {
        targetTrack = game.getSeasonTrackKey ? game.getSeasonTrackKey() : 'spring';
      }
    }

    if (targetTrack && targetTrack !== this.currentTrack) {
      this.playTrack(targetTrack, false, { softCrossfade: true });
    }
  }

  // ---- BGM 先読みスケジューラ（2026-10-11 aq） ----
  // 今から LOOKAHEAD 秒先までの拍を予約する。メインスレッドが一時的に塞がっても、予約済みの音は鳴り続ける。
  scheduleAhead() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const stepSec = Math.max(0.05, (this.stepMs || 250) / 1000);
    if (!(this.nextStepTime > 0)) this.nextStepTime = now + 0.03;
    // 先読みを超えて止まっていた（タブが裏に回った等）ときは、溜まった拍をまとめて鳴らさず今から再開
    if (this.nextStepTime < now - 0.1) {
      const missed = Math.floor((now - this.nextStepTime) / stepSec);
      this.stepIndex += Math.max(0, missed);
      this.nextStepTime = now + 0.03;
    }
    let guard = 0;
    while (this.nextStepTime < now + SengokuMusicEngine.LOOKAHEAD_SEC && guard++ < 64) {
      this.playStep(this.nextStepTime);
      this.nextStepTime += stepSec;
    }
  }

  // 曲ごとの出力バス（BGM バスの手前）。曲替え・停止で先読み分をまとめて消せるようにする
  createTrackBus(fadeInSec = 0) {
    if (!this.ctx || !this.bgmGain) { this.trackBus = null; this.trackWet = null; return; }
    const t0 = this.ctx.currentTime;
    const setLevel = (g) => {
      if (fadeInSec > 0) { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(1, t0 + fadeInSec); } // 静かなクロスフェード（2026-10-11 bx）
      else g.gain.setValueAtTime(1, t0);
    };
    this.trackBus = this.ctx.createGain();
    setLevel(this.trackBus);
    this.trackBus.connect(this.bgmGain);
    this.trackWet = null;
    if (this.convolver) {
      this.trackWet = this.ctx.createGain();
      setLevel(this.trackWet);
      this.trackWet.connect(this.convolver);
    }
  }

  retireTrackBus(fadeSec = 0.12) {
    const buses = [this.trackBus, this.trackWet].filter(Boolean);
    this.trackBus = null;
    this.trackWet = null;
    if (!buses.length || !this.ctx) return;
    const t = this.ctx.currentTime;
    buses.forEach(b => {
      try {
        b.gain.cancelScheduledValues(t);
        b.gain.setValueAtTime(b.gain.value, t);
        b.gain.linearRampToValueAtTime(0, t + fadeSec);
      } catch (e) {}
    });
    setTimeout(() => { buses.forEach(b => { try { b.disconnect(); } catch (e) {} }); }, Math.round(fadeSec * 1000) + 300);
  }

  // 残響の送り先：BGM の音は曲ごとのバス経由（曲替えで一緒に消える）、効果音は今までどおり直接
  reverbSend() {
    if (this.dropUntaggedVoice()) return this.silentSink();
    if (!(this._seDepth > 0) && this.trackWet) return this.trackWet;
    // 効果音の残響は効果音の残響送り経由（OFF・音量 0 で残響も消える）
    if (this._seDepth > 0 && this.seWet) return this.seWet;
    return this.convolver;
  }

  // 茶会・雪・滅亡・密談だけ静かに。それ以外は出だしから前進し、後半で総奏に開く。
  scoreMoment(track) {
    const len = Math.max(32, track.melody?.length || 32);
    const pos = this.stepIndex % len;
    const phrase = Math.floor(pos / 32);
    const loop = Math.floor(this.stepIndex / len);
    const drums = track.drums || [];
    const epic = drums.some(d => d && (d.timpani || d.cymbal || d.wadaiko));
    const court = track.id === 'shogun' || track.id === 'victory';
    const quiet = track.id === 'tea' || track.id === 'winter' || track.id === 'tragedy' || track.id === 'diplomacy';
    const texture = quiet ? ((phrase + loop) % 2) : (phrase === 1 ? 2 : 1);
    const phrasePos = (pos % 32) / 32;
    let dyn = (0.58 + 0.46 * Math.sin(Math.PI * phrasePos)) * (quiet ? 0.82 : 1);
    return { phrase, texture, dyn, epic, court, quiet };
  }

  // 同じ音高が続く間は再発音せず、ひとつの音として伸ばす
  voicedNote(seq) {
    if (!seq || seq.length === 0) return null;
    const i = this.stepIndex % seq.length;
    const note = seq[i];
    if (!(note > 0)) return null;
    if (i > 0 && seq[i - 1] === note) return null;
    let dur = 1;
    while (i + dur < seq.length && seq[i + dur] === note) dur++;
    return { note, dur };
  }

  leadForTexture(base, texture, epic) {
    const home = base || 'violin';
    if (texture === 0) return home;
    if (texture === 1) {
      if (home === 'trumpet' || home === 'horn') return 'horn';
      if (home === 'shinobue' || home === 'oboe') return 'flute';
      return 'oboe';
    }
    if (!epic) return home === 'flute' ? 'violin' : home;
    return home === 'horn' ? 'horn' : 'trumpet';
  }

  leadForForm(base, form, epic) {
    const epicCycle = {
      violin: ['violin', 'flute', 'trumpet', 'horn'],
      flute: ['flute', 'oboe', 'violin', 'trumpet'],
      trumpet: ['trumpet', 'horn', 'violin', 'flute'],
      horn: ['horn', 'trumpet', 'violin', 'oboe'],
      oboe: ['oboe', 'flute', 'violin', 'horn'],
      shinobue: ['shinobue', 'flute', 'oboe', 'violin'],
      cello: ['cello', 'horn', 'violin', 'oboe'],
      koto: ['koto', 'harp', 'flute', 'violin']
    };
    const lyricCycle = {
      violin: ['violin', 'flute', 'oboe', 'cello'],
      flute: ['flute', 'oboe', 'shinobue', 'violin'],
      trumpet: ['horn', 'flute', 'violin', 'oboe'],
      horn: ['horn', 'oboe', 'cello', 'flute'],
      oboe: ['oboe', 'flute', 'shinobue', 'cello'],
      shinobue: ['shinobue', 'flute', 'oboe', 'koto'],
      cello: ['cello', 'oboe', 'flute', 'violin'],
      koto: ['koto', 'harp', 'flute', 'shinobue']
    };
    const table = epic ? epicCycle : lyricCycle;
    const list = table[base] || (epic
      ? ['violin', 'flute', 'trumpet', 'horn']
      : ['flute', 'oboe', 'violin', 'cello']);
    return list[form % 4];
  }

  // 1ステップ（1拍/半拍）ごとの多声部・管弦合奏処理
  playStep(when) {
    if (!this.ctx || this.isBgmMuted) return;
    const track = this.tracks[this.currentTrack];
    if (!track) return;
    // この中で鳴る音は BGM として扱う（効果音 OFF の低層ガードの目印。2026-10-11 bx）
    this._bgmDepth = (this._bgmDepth || 0) + 1;
    try { this.playStepBody(when, track); } finally { this._bgmDepth -= 1; }
  }

  playStepBody(when, track) {

    // 先読みスケジューラから予約時刻が渡される（無ければ今）
    const t = (typeof when === 'number' && when > 0) ? when : this.ctx.currentTime;
    const stepDur = (this.stepMs || track.tempoMs) / 1000;
    const { phrase, texture, dyn, epic, quiet } = this.scoreMoment(track);
    const beat = this.stepIndex % 4;
    // 静かなクロスフェードの最初の2小節は打楽器・ティンパニなし（2026-10-11 bx）
    const softNow = this._softStartSteps > 0 && this.stepIndex < this._softStartSteps;
    const chord = (track.chords && track.chords.length)
      ? track.chords[Math.floor(this.stepIndex / 4) % track.chords.length]
      : null;

    // 1. 主旋律 — 家の楽器のまま歌い、後半だけ遠いフルートが影のように重なる
    const mel = this.voicedNote(track.melody);
    if (mel) {
      const lead = track.melodyInst || 'violin';
      const dur = stepDur * mel.dur * 1.08;
      this.dispatchInstrument(lead, mel.note, t, dur, 0.20 * dyn, -0.2);
      if (!quiet && phrase === 1 && mel.note * 2 < 1200) {
        this.dispatchInstrument('flute', mel.note * 2, t, dur * 0.9, 0.028 * dyn, 0.28);
      }
    }

    // 2. 和音の内声（三度または五度）。書かれた対旋律が和声から外れないように、今のコードから取る
    if (beat === 0 && chord && chord.length > 0) {
      let inner = chord[texture === 2 ? Math.min(2, chord.length - 1) : 1] || chord[0];
      if (inner > 0) {
        while (inner < 170) inner *= 2;
        while (inner > 540) inner *= 0.5;
        const innerInst = epic && phrase === 1 ? 'horn' : 'cello';
        this.dispatchInstrument(innerInst, inner, t, stepDur * 3.6, 0.055 * dyn, 0.22);
      }
    }

    // 3. 弦楽、笙の五度、総奏の金管と合唱
    if (beat === 0 && chord && chord.length > 0) {
      const chordDur = stepDur * (texture === 2 ? 4.2 : 3.8);
      if (texture !== 0) {
        this.playStringsEnsemble(chord, t, chordDur, (texture === 2 ? 0.15 : 0.12) * dyn, 0);
      } else {
        this.playStringsEnsemble(chord, t, chordDur, 0.07 * dyn, 0);
      }
      const fifth = chord[2] || chord[0] * 1.5;
      this.playOpenFifth(chord[0], fifth, t, chordDur, 0.055 * dyn);
      if (!quiet && phrase === 1) {
        this.playBrassHorn(chord, t, chordDur, (epic ? 0.055 : 0.032) * dyn, 0.14);
        this.playChoirPad(chord, t, chordDur * 1.1, (epic ? 0.04 : 0.025) * dyn, 0);
      }
    }

    // 躍動は心臓の拍だけ。強拍に根音、次の強拍に五度。隙間を残す
    if (!quiet && chord && chord.length > 0 && (beat === 0 || beat === 2)) {
      const pulseTone = beat === 0 ? chord[0] : (chord[2] || chord[0]);
      if (pulseTone > 0) {
        let f = pulseTone;
        while (f < 174) f *= 2;
        while (f > 392) f *= 0.5;
        this.playDrivePulse(f, t, stepDur * 0.7, (beat === 0 ? 0.045 : 0.03) * dyn);
      }
    }

    // 4. 前半は箏・琵琶の定型、後半は今の和音をハープで分散
    if (phrase === 0 && track.arpeggio && track.arpeggio.length > 0 && beat % 2 === 0) {
      const arpNote = track.arpeggio[this.stepIndex % track.arpeggio.length];
      if (arpNote > 0 && (texture === 0 || beat % 2 === 0)) {
        const arpVol = 0.11 * dyn;
        if (track.arpInst === 'biwa') this.playBiwa(arpNote, t, 0.5, arpVol, -0.28);
        else if (track.arpInst === 'harp') this.playHarp(arpNote, t, 0.7, arpVol, 0.3);
        else this.playKoto(arpNote, t, 0.55, arpVol, 0.26);
      }
    } else if (phrase === 1 && chord && chord.length > 0 && beat % 2 === 1) {
      let f = chord[beat === 1 ? 0 : Math.min(2, chord.length - 1)];
      if (f > 0) {
        while (f < 260) f *= 2;
        while (f > 880) f *= 0.5;
        this.playHarp(f, t, 0.65, 0.08 * dyn, 0.32);
      }
    }

    // 5. コントラバス。総奏の強拍だけ音程のあるティンパニ
    if (track.bass && track.bass.length > 0 && beat === 0) {
      const bassNote = track.bass[Math.floor(this.stepIndex / 4) % track.bass.length];
      if (bassNote > 0) {
        this.playContrabass(bassNote, t, stepDur * 3.7, (texture === 2 ? 0.18 : 0.13) * dyn);
        if (phrase === 1 && epic && this.stepIndex % 8 === 0 && !softNow) {
          const timp = Math.max(52, Math.min(bassNote, 110));
          this.playPitchedTimpani(timp, t, 0.08 * dyn);
        }
      }
    }

    // 6. 打楽器 — 合戦は小節頭だけ、内政は二小節に一度。拍の隙間を残す
    // 季節替わりの再開直後の最初の拍は打楽器なし（次の拍・小節から通常どおり。2026-10-11 bq）
    const skipPerc = (!!this._skipFirstPercussion && this.stepIndex === 0) || softNow;
    if (this._skipFirstPercussion && this.stepIndex > 0) this._skipFirstPercussion = false;
    if (skipPerc) {
      // 打楽器なし
    } else if (!quiet && beat === 0 && (epic || this.stepIndex % 8 === 0)) {
      this.playWadaiko(58, t, (epic ? 0.12 : 0.055) * dyn, 0);
      if (epic && phrase === 1 && this.stepIndex % 32 === 0) this.playCymbal(t, 0.05 * dyn, 0.28);
    } else if (quiet && track.drums && track.drums.length > 0) {
      const drumPattern = track.drums[this.stepIndex % track.drums.length];
      if (drumPattern) {
        if (drumPattern.tsuzumi) this.playTsuzumi(t, 0.16 * dyn, -0.2);
        if (drumPattern.hyoshigi) this.playHyoshigiSound(t, 0.14 * dyn, 0);
        if (drumPattern.suzu) this.playSuzu(t, 0.10 * dyn, 0.3);
        if (drumPattern.dora && beat === 0) this.playDora(t, 0.10 * dyn, 0);
      }
    }

    this.stepIndex++;
  }

  // 楽器種別ディスパッチャー
  dispatchInstrument(inst, freq, time, dur, vol, pan) {
    switch (inst) {
      case 'violin': this.playViolinLead(freq, time, dur, vol, pan); break;
      case 'shinobue': this.playShinobue(freq, time, dur, vol, pan); break;
      case 'flute': this.playFlute(freq, time, dur, vol, pan); break;
      case 'oboe': this.playOboe(freq, time, dur, vol, pan); break;
      case 'trumpet': this.playTrumpetLead(freq, time, dur, vol, pan); break;
      case 'horn': this.playBrassHorn([freq], time, dur, vol, pan); break;
      case 'cello': this.playViolinLead(freq * 0.5, time, dur, vol * 1.1, pan); break;
      case 'koto': this.playKoto(freq, time, dur, vol, pan); break;
      case 'harp': this.playHarp(freq, time, dur, vol, pan); break;
      case 'biwa': this.playBiwa(freq, time, dur, vol, pan); break;
      default: this.playViolinLead(freq, time, dur, vol, pan);
    }
  }

  // ============================================================================
  // 管弦楽・和洋楽器 シンセサイズメソッド群
  // ============================================================================

  // 1. ソロ・ヴァイオリン (弓の擦過音、表情豊かなヴィブラート、倍音)
  playViolinLead(freq, time, dur, vol = 0.22, pan = -0.2) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.004, time);

    // 人間味あふれる温かいヴィブラート (5.4Hz)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(5.4, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.018, time + dur * 0.35); // 時間差で深まるヴィブラート
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);
    lfo.start(time);
    lfo.stop(time + dur);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.linearRampToValueAtTime(3200, time + dur * 0.3);
    filter.frequency.linearRampToValueAtTime(1200, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur);
    osc2.stop(time + dur);
  }

  // 2. 弦楽合奏 (Violin I/II, Viola, Cello, Contrabass の重厚なコードアンサンブル)
  playStringsEnsemble(chordFreqs, time, dur, vol = 0.16, pan = 0) {
    if (!this.ctx || !chordFreqs || chordFreqs.length === 0) return;
    const voiceVol = vol / Math.sqrt(chordFreqs.length);

    chordFreqs.forEach((freq, idx) => {
      if (!isAudibleFreq(freq)) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const voicePan = (idx % 2 === 0 ? -0.35 : 0.35) * (idx / chordFreqs.length);
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 1.007, time);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(freq * 0.5, time);
      const celloGain = this.ctx.createGain();
      celloGain.gain.setValueAtTime(voiceVol * 0.42, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, time);
      filter.frequency.linearRampToValueAtTime(2100, time + dur * 0.35);
      filter.frequency.linearRampToValueAtTime(780, time + dur);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(voiceVol, time + dur * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(celloGain);
      celloGain.connect(filter);
      filter.connect(gain);

      this.routeToOutput(gain, panner, voicePan, true);

      osc1.start(time);
      osc2.start(time);
      osc3.start(time);
      osc1.stop(time + dur);
      osc2.stop(time + dur);
      osc3.stop(time + dur);
    });
  }

  // 3. 篠笛・尺八 (竹の倍音、息の擦過音、ポルタメント)
  playShinobue(freq, time, dur, vol = 0.22, pan = -0.15) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const gainH = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 0.99, time);
    osc.frequency.linearRampToValueAtTime(freq * 1.012, time + dur * 0.4);
    osc.frequency.linearRampToValueAtTime(freq, time + dur);

    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 2, time);
    gainH.gain.setValueAtTime(vol * 0.25, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.05); // 息の立ち上がり
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    oscHarmonic.connect(gainH);
    gainH.connect(filter);
    filter.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc.start(time);
    oscHarmonic.start(time);
    osc.stop(time + dur);
    oscHarmonic.stop(time + dur);
  }

  // 4. クラシカル・フルート (透明感と気品、優しいヴィブラート)
  playFlute(freq, time, dur, vol = 0.20, pan = -0.1) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    // フルートの可憐なヴィブラート
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(5.8, time);
    lfoGain.gain.setValueAtTime(0, time);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.012, time + 0.15);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(time);
    lfo.stop(time + dur);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 2.5, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc.start(time);
    osc.stop(time + dur);
  }

  // 5. オーボエ・篳篥 (哀愁を帯びたダブルリードの鼻にかかった深い倍音)
  playOboe(freq, time, dur, vol = 0.18, pan = 0.15) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.8, time);
    filter.Q.setValueAtTime(2.2, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur);
    osc2.stop(time + dur);
  }

  // 6. フレンチホルン・トロンボーン (温かく雄大な金管アンサンブル)
  playBrassHorn(chordFreqs, time, dur, vol = 0.18, pan = 0.25) {
    if (!this.ctx || !chordFreqs || chordFreqs.length === 0) return;
    const voiceVol = vol / Math.sqrt(chordFreqs.length);

    chordFreqs.forEach((freq, idx) => {
      if (!isAudibleFreq(freq)) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 1.006, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, time);
      filter.frequency.linearRampToValueAtTime(1600, time + 0.12); // 金管のアタック
      filter.frequency.exponentialRampToValueAtTime(450, time + dur);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(voiceVol, time + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      this.routeToOutput(gain, panner, pan + (idx * 0.05), true);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + dur);
      osc2.stop(time + dur);
    });
  }

  // 7. トランペット (輝かしく鋭いファンファーレ・旋律)
  playTrumpetLead(freq, time, dur, vol = 0.22, pan = 0.1) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 1.002, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.linearRampToValueAtTime(3600, time + 0.05);
    filter.frequency.exponentialRampToValueAtTime(1500, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur);
    osc2.stop(time + dur);
  }

  // 8. 荘厳な混声合唱・クワイヤ (Aah/Ooh フォルマントフィルター)
  playChoirPad(chordFreqs, time, dur, vol = 0.14, pan = 0) {
    if (!this.ctx || !chordFreqs || chordFreqs.length === 0) return;
    const voiceVol = vol / Math.sqrt(chordFreqs.length);

    chordFreqs.forEach((freq, idx) => {
      if (!isAudibleFreq(freq)) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter1 = this.ctx.createBiquadFilter();
      const filter2 = this.ctx.createBiquadFilter();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      // 母音 "Aah" の第1・第2フォルマント
      filter1.type = 'bandpass';
      filter1.frequency.setValueAtTime(800, time);
      filter1.Q.setValueAtTime(4.0, time);

      filter2.type = 'bandpass';
      filter2.frequency.setValueAtTime(1200, time);
      filter2.Q.setValueAtTime(4.0, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(voiceVol, time + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(filter1);
      osc.connect(filter2);
      filter1.connect(gain);
      filter2.connect(gain);

      this.routeToOutput(gain, panner, (idx % 2 === 0 ? -0.2 : 0.2), true);

      osc.start(time);
      osc.stop(time + dur);
    });
  }

  // 9. 十三絃箏 (力強い撥弦アタックと優美な余韻)
  playKoto(freq, time, dur = 0.5, vol = 0.18, pan = 0.3) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.9, time);
    filter.Q.setValueAtTime(3.2, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc.start(time);
    osc.stop(time + dur);
  }

  // 10. 薩摩琵琶 (激しいバチ音とサワリの唸り)
  playBiwa(freq, time, dur = 0.45, vol = 0.20, pan = -0.3) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 1.05, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.08); // 強いバチのアタック

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.4, time);
    filter.Q.setValueAtTime(2.0, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc.start(time);
    osc.stop(time + dur);
  }

  // 11. グランドハープ・チェレスタ (天上の輝き、澄んだアルペジオ)
  playHarp(freq, time, dur = 0.6, vol = 0.18, pan = 0.25) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq * 2, time);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc1.connect(gain);
    osc2.connect(gain);

    this.routeToOutput(gain, panner, pan, true);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur);
    osc2.stop(time + dur);
  }

  // スピッカートの弦。短い弓で拍を前へ蹴る
  playDrivePulse(freq, time, dur, vol = 0.07) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.linearRampToValueAtTime(980, time + Math.min(0.08, dur * 0.45));
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputBus());
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // 笙・オルガヌムの開放五度。和音の下に古代の厚みを敷く
  playOpenFifth(root, fifth, time, dur, vol = 0.05) {
    if (!this.ctx || !isAudibleFreq(root)) return;
    let f = root;
    while (f < 98) f *= 2;
    while (f > 240) f *= 0.5;
    let fifthF = isAudibleFreq(fifth) ? fifth : f * 1.5;
    while (fifthF < f * 1.2) fifthF *= 2;
    while (fifthF > f * 1.7) fifthF *= 0.5;
    [f, fifthF].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, time);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(vol * (idx === 0 ? 1 : 0.7), time + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputBus());
      if (this.convolver) gain.connect(this.reverbSend());
      osc.start(time);
      osc.stop(time + dur + 0.02);
    });
  }

  // コントラバス（弓）。低い音は聞こえる音域まで上げ、和声の土台を保つ
  playContrabass(freq, time, dur, vol = 0.16) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    let f = freq;
    while (f < 49) f *= 2;
    while (f > 130) f *= 0.5;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(f, time);
    osc2.frequency.setValueAtTime(f, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, time);
    filter.frequency.linearRampToValueAtTime(520, time + Math.min(0.25, dur * 0.3));
    filter.frequency.linearRampToValueAtTime(240, time + dur);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(vol * 0.55, time);
    osc2.connect(subGain);

    osc1.connect(filter);
    subGain.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputBus());
    if (this.convolver) gain.connect(this.reverbSend());

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + dur);
    osc2.stop(time + dur);
  }

  // 音程のあるティンパニ（決戦の総奏で低音に合わせる）
  playPitchedTimpani(freq, time, vol = 0.16) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.72), time + 0.45);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    osc.connect(gain);
    gain.connect(this.outputBus());
    osc.start(time);
    osc.stop(time + 0.55);
  }

  // 12. 大太鼓・長胴太鼓 (地を揺るがす重低音サブベース 45Hz)
  playWadaiko(freq = 60, time = null, vol = 0.35, pan = 0) {
    if (!this.ctx || !isAudibleFreq(freq)) return;
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.9, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.35);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.outputBus());

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // 13. 締太鼓・陣太鼓 (乾いた抜けの良い中高域打音)
  playTaikoHit(time = null, vol = 0.25, pan = 0.15) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.outputBus());

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 14. 能楽・小鼓 (「ポンッ」とピッチが降下する雅な鼓音)
  playTsuzumi(time = null, vol = 0.28, pan = -0.2) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.18); // 特有のピッチ降下

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    if (this.convolver) gain.connect(this.reverbSend());
    gain.connect(this.outputBus());

    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 15. オーケストラ・ティンパニ (音程感とクレッシェンド連打)
  playTimpaniRoll(time = null, dur = 0.5, vol = 0.32, pan = -0.25) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + dur);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    if (this.convolver) gain.connect(this.reverbSend());
    gain.connect(this.outputBus());

    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // 16. オーケストラ・シンバル (華やかな炸裂クラッシュ)
  playCymbal(time = null, vol = 0.22, pan = 0.35) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.45);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 4500;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputBus());
      if (this.convolver) gain.connect(this.reverbSend());
      noise.start(t);
    } catch(e) {}
  }

  // 17. 銅鑼・大鐘 (重厚な金属のうねりと長い残響)
  playDora(time = null, vol = 0.28, pan = 0) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.linearRampToValueAtTime(78, t + 1.5);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    osc.connect(gain);
    if (this.convolver) gain.connect(this.reverbSend());
    gain.connect(this.outputBus());

    osc.start(t);
    osc.stop(t + 2.1);
  }

  // 18. 拍子木 (乾いた硬質な打音)
  playHyoshigiSound(time = null, vol = 0.25, pan = 0) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1850, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.08);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, t);
    filter.Q.setValueAtTime(4.0, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputBus());

    osc.start(t);
    osc.stop(t + 0.13);
  }

  // 19. 神楽鈴・チェレスタ鈴 (高域の煌めき)
  playSuzu(time = null, vol = 0.18, pan = 0.3) {
    if (!this.ctx) return;
    const t = time || this.ctx.currentTime;
    [3200, 3800, 4400].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);
      gain.gain.setValueAtTime(vol * 0.4, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.03 + 0.25);
      osc.connect(gain);
      gain.connect(this.outputBus());
      if (this.convolver) gain.connect(this.reverbSend());
      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.28);
    });
  }

  // 出力ルーティングヘルパー
  routeToOutput(gainNode, pannerNode, panValue, sendReverb = true) {
    if (pannerNode && this.ctx.createStereoPanner) {
      pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), this.ctx.currentTime);
      gainNode.connect(pannerNode);
      pannerNode.connect(this.outputBus());
      if (sendReverb && this.convolver) {
        pannerNode.connect(this.reverbSend());
      }
    } else {
      gainNode.connect(this.outputBus());
      if (sendReverb && this.convolver) {
        gainNode.connect(this.reverbSend());
      }
    }
  }

  // ============================================================================
  // 効果音 (SE) メソッド群 (全23種以上・オーケストラ＆戦国サウンド)
  // ============================================================================

  // 1. 陣中法螺貝 (リアル息遣い・唸り・木霊)
  playHoragai(vol = 1.0) {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(196, t);
    osc1.frequency.linearRampToValueAtTime(261.6, t + 0.4);
    osc1.frequency.linearRampToValueAtTime(293.7, t + 1.0);
    osc1.frequency.exponentialRampToValueAtTime(196, t + 2.0);

    osc2.frequency.setValueAtTime(196 * 1.01, t);
    osc2.frequency.linearRampToValueAtTime(261.6 * 1.01, t + 0.4);
    osc2.frequency.linearRampToValueAtTime(293.7 * 1.01, t + 1.0);
    osc2.frequency.exponentialRampToValueAtTime(196, t + 2.0);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.45 * vol, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.seGain);
    if (this.convolver) gain.connect(this.reverbSend());

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 2.3);
    osc2.stop(t + 2.3);
  }

  // 2. 拍子木 (乾いた和の木目)
  playHyoshigi() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playHyoshigiSound(this.ctx.currentTime, 0.4, 0);
  }

  // 3. 能楽小鼓 (「ポンッ」とピッチが落ちる鼓)
  playTsuzumiSound(vol = 1.0) {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playTsuzumi(this.ctx.currentTime, 0.45 * vol, 0);
  }

  // 4. 和太鼓・陣太鼓
  playTaiko(vol = 1.0) {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playTaikoHit(this.ctx.currentTime, 0.35 * vol);
  }

  playWadaikoSound(vol = 1.0) {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playWadaiko(55, this.ctx.currentTime, 0.45 * vol);
  }

  // 5. 祝賀金管ファンファーレ (トランペット3重奏＋ティンパニ＋シンバル)
  playFanfare() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    // C大三和音ファンファーレ
    [P.C4, P.E4, P.G4, P.C5].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.001, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.28, t + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(this.seGain);
      if (this.convolver) gain.connect(this.reverbSend());
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.65);
    });
    this.playTimpaniRoll(t + 0.25, 0.5, 0.35);
    this.playCymbal(t + 0.3, 0.3);
  }

  // 6. 征夷大将軍・天下統一 特大オーケストラファンファーレ
  playGrandFanfare() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playFanfare();
    setTimeout(() => this.asSe(() => {
      this.playHoragai(1.1);
      this.playDora(this.ctx.currentTime, 0.4);
    }), 450);
  }

  // 7. 刀撃・抜刀・白刃の火花
  playSword() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.14);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.seGain);
    osc.start(t);
    osc.stop(t + 0.18);

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.seGain);
      noise.start(t);
    } catch(e) {}
  }

  playGachaGacha(vol = 1.0) {
    this.playSword();
  }

  // 8. 火縄銃隊の一斉斉射 (炸薬の轟音・地鳴り)
  playTeppo() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.playWadaiko(50, t, 0.45);
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 850;
      filter.Q.value = 1.0;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.seGain);
      noise.start(t);
    } catch(e) {}
  }

  // 9. 弓矢隊一斉斉射 (弦のビィン音と風切り音)
  playArrow() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.12);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.seGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 10. 騎馬隊突撃 (怒涛の馬蹄と地鳴り)
  playCavalry() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.playWadaiko(65, t, 0.4);
    setTimeout(() => this.asSe(() => this.playWadaiko(70, null, 0.4)), 100);
    setTimeout(() => this.asSe(() => this.playWadaiko(60, null, 0.45)), 200);
  }

  // 11. 小判チャリン (内政・金銭獲得)
  playCoin() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    [1975, 2637, 3520].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.04);
      gain.gain.setValueAtTime(0.28, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.18);
      osc.connect(gain);
      gain.connect(this.seGain);
      if (this.convolver) gain.connect(this.reverbSend());
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.20);
    });
  }

  // 12. 忍び・工作風切り (調略・暗殺)
  playSlash() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1100, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.seGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // 13. 勝鬨・凱歌の轟き (勝利・敵壊滅・落城)
  playKachi() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playHoragai(1.0);
    const t = this.ctx.currentTime;
    setTimeout(() => { this.asSe(() => this.playTaikoHit(this.ctx.currentTime, 0.4)); }, 140);
    setTimeout(() => { this.asSe(() => this.playTaikoHit(this.ctx.currentTime, 0.45)); }, 360);
    setTimeout(() => { this.asSe(() => this.playTaikoHit(this.ctx.currentTime, 0.5)); }, 580);
    setTimeout(() => { if (!this.isSeMuted && this.ctx) this.playFanfare(); }, 800);
  }

  // 14. 敗北・破陣の重苦しいゴング
  playDefeat() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playDora(this.ctx.currentTime, 0.45);
    this.playWadaiko(40, this.ctx.currentTime, 0.45);
  }

  // 15. 官位昇進・武将成長 (天上のハープ・グリッサンド)
  playRankUp() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    [P.C4, P.E4, P.G4, P.B4, P.C5, P.E5, P.G5].forEach((freq, idx) => {
      this.playHarp(freq, t + idx * 0.05, 0.5, 0.22, 0);
    });
  }

  playLevelUp() {
    this.playRankUp();
  }

  // 16. 和風決定音 (上品な箏のピン音＋小鼓)
  playDecision() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.playKoto(P.A4, t, 0.25, 0.22, 0);
  }

  // 17. キャンセル音
  playCancel() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.playFlute(P.E4, t, 0.15, 0.18, 0);
  }

  // 18. 歴史事件オーケストラヒット (「ジャーン！」)
  playEventNotice() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    [P.C3, P.Ds3, P.Fs3, P.A3, P.C4].forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.seGain);
      if (this.convolver) gain.connect(this.reverbSend());
      osc.start(t);
      osc.stop(t + 0.65);
    });
    this.playTimpaniRoll(t, 0.6, 0.4);
    this.playCymbal(t, 0.35);
  }

  // 19. 茶の湯・水琴窟 (静寂の清らかな水滴音)
  playTea() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1450, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.08);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.seGain);
    if (this.convolver) gain.connect(this.reverbSend());
    osc.start(t);
    osc.stop(t + 0.38);
  }

  playDoraSound() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playDora(this.ctx.currentTime, 0.45);
  }

  playCymbalSound() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playCymbal(this.ctx.currentTime, 0.35);
  }

  // 神楽鈴（効果音として単発で鳴らす。BGM の鈴は playSuzu を直接使う）
  playSuzuSound(vol = 1.0) {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    this.playSuzu(null, 0.18 * vol, 0.3);
  }

  // 20. 大名奥義専用ボイス風SE（大太鼓連打＋銅鑼＋法螺貝＋雄叫びボイス）
  playOugiVoiceSe() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1) 大太鼓の連打（ド・ドドン・ドドン！）
    this.playWadaiko(58, t, 0.55);
    this.playWadaiko(62, t + 0.08, 0.6);
    this.playWadaiko(54, t + 0.18, 0.65);
    this.playWadaiko(50, t + 0.28, 0.7);
    this.playTaikoHit(t + 0.40, 0.85);

    // 2) 銅鑼（ジャァァァン）
    this.playDora(t + 0.12, 0.6);

    // 3) 法螺貝（ブォォォーーーッ）
    this.playHoragai(1.25);

    // 4) 人間の雄叫び・ボイス風フォルマント合成（「オォォーッ！！」という気合の鬨の声）
    try {
      [145, 148, 152].forEach((baseFreq, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        // 男声の気合ピッチカーブ (135Hz -> 180Hz -> 120Hz)
        osc.frequency.setValueAtTime(baseFreq * 0.9, t + 0.05);
        osc.frequency.linearRampToValueAtTime(baseFreq * 1.25, t + 0.25);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, t + 0.9);

        // 母音フォルマントフィルター（「オ」〜「ア」の共鳴帯域：F1: 650Hz, F2: 1100Hz）
        const f1 = this.ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.value = 680 + idx * 25;
        f1.Q.value = 4.0;

        const f2 = this.ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.frequency.value = 1150 + idx * 35;
        f2.Q.value = 3.5;

        const voiceGain = this.ctx.createGain();
        voiceGain.gain.setValueAtTime(0.001, t + 0.05);
        voiceGain.gain.linearRampToValueAtTime(0.22, t + 0.22);
        voiceGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

        osc.connect(f1);
        osc.connect(f2);
        f1.connect(voiceGain);
        f2.connect(voiceGain);
        voiceGain.connect(this.seGain);
        if (this.convolver) voiceGain.connect(this.reverbSend());

        osc.start(t + 0.05);
        osc.stop(t + 1.0);
      });
    } catch(e) {}
  }

  // 21. 内政振興フィードバック音（鍬で耕す音＋小判チャリン）
  playDomesticSound() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 鍬（くわ）で耕す音（ザクッ、サクッという乾いた土の摩擦ノイズ＋低いインパクト）
    const playHoeHit = (time, intensity = 0.35) => {
      try {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(650, time);
        filter.frequency.exponentialRampToValueAtTime(320, time + 0.1);
        filter.Q.value = 1.6;

        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(intensity, time);
        nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.seGain);
        noise.start(time);

        // 低音インパクト（土を突く「ドスッ」）
        const osc = this.ctx.createOscillator();
        const oGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.09);
        oGain.gain.setValueAtTime(intensity * 0.75, time);
        oGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(oGain);
        oGain.connect(this.seGain);
        osc.start(time);
        osc.stop(time + 0.11);
      } catch(e) {}
    };

    playHoeHit(t, 0.4);
    playHoeHit(t + 0.16, 0.45);

    // 小判の音（チャリン、チャリーン）
    [2200, 2936, 3920].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + 0.25 + idx * 0.05);
      gain.gain.setValueAtTime(0.24, t + 0.25 + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25 + idx * 0.05 + 0.28);
      osc.connect(gain);
      gain.connect(this.seGain);
      if (this.convolver) gain.connect(this.reverbSend());
      osc.start(t + 0.25 + idx * 0.05);
      osc.stop(t + 0.25 + idx * 0.05 + 0.3);
    });
  }

  // 22. 軍備増強フィードバック音（鍛冶屋の槌音＋鬨の声）
  playMilitarySound() {
    this.init();
    if (this.isSeMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 鍛冶屋の槌音（カキンッ、カーン！と灼熱の鉄を打つ金属打撃）
    const playHammerStrike = (time, basePitch = 2400) => {
      [basePitch, basePitch * 1.48, basePitch * 2.15].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(i === 0 ? 0.35 : 0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
        osc.connect(gain);
        gain.connect(this.seGain);
        if (this.convolver) gain.connect(this.reverbSend());
        osc.start(time);
        osc.stop(time + 0.25);
      });
      // 打撃の瞬間スパークノイズ
      try {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.25, time);
        nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
        noise.connect(nGain);
        nGain.connect(this.seGain);
        noise.start(time);
      } catch(e) {}
    };

    playHammerStrike(t, 2200);
    playHammerStrike(t + 0.18, 2550);

    // 鬨の声（「オーッ！！」と武者たちの勇ましい合唱フォルマント）
    try {
      [160, 163, 166].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t + 0.28);
        osc.frequency.linearRampToValueAtTime(f * 1.15, t + 0.45);
        osc.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.85);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 750 + idx * 30; // 「オ」のフォルマント
        filter.Q.value = 3.2;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, t + 0.28);
        gain.gain.linearRampToValueAtTime(0.24, t + 0.42);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.88);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);
        if (this.convolver) gain.connect(this.reverbSend());
        osc.start(t + 0.28);
        osc.stop(t + 0.92);
      });
    } catch(e) {}
  }

  // ============================================================================
  // 効果音スイッチ（ON/OFF・音量・保存）
  // ============================================================================
  // 効果音の入口メソッド。ここに挙げたものは効果音 OFF のとき何も鳴らさない
  static get SE_METHODS() {
    return ['playHoragai', 'playHyoshigi', 'playTsuzumiSound', 'playTaiko', 'playWadaikoSound', 'playFanfare',
      'playGrandFanfare', 'playSword', 'playGachaGacha', 'playTeppo', 'playArrow', 'playCavalry', 'playCoin',
      'playSlash', 'playKachi', 'playDefeat', 'playRankUp', 'playLevelUp', 'playDecision', 'playCancel',
      'playEventNotice', 'playTea', 'playDoraSound', 'playCymbalSound', 'playSuzuSound', 'playOugiVoiceSe',
      'playDomesticSound', 'playMilitarySound', 'playSe'];
  }

  wrapSeMethods() {
    SengokuMusicEngine.SE_METHODS.forEach(name => {
      const orig = SengokuMusicEngine.prototype[name];
      if (typeof orig !== 'function') return;
      this[name] = (...args) => this.asSe(() => orig.apply(this, args));
    });
  }

  // 効果音として鳴らす（OFF なら何もしない。中で鳴る楽器音も効果音バスへ）
  asSe(fn) {
    if (this.isSeMuted) return undefined;
    this._seDepth = (this._seDepth || 0) + 1;
    try {
      return fn();
    } finally {
      this._seDepth -= 1;
    }
  }

  // 楽器音の出力先：効果音の最中は効果音バス、それ以外は BGM バス
  outputBus() {
    if (this.dropUntaggedVoice()) return this.silentSink();
    if (this._seDepth > 0 && this.seGain) return this.seGain;
    return this.trackBus || this.bgmGain;
  }

  // 季節オート進行中か（app.js が isAutoAdvanceActive を渡す。2026-10-11 bz）
  autoAdvanceQuiet() {
    try { return typeof this.isAutoAdvanceActive === 'function' && !!this.isAutoAdvanceActive(); } catch (e) { return false; }
  }

  // 低層ガード：効果音 OFF のとき、BGM の拍の中でも効果音の中でもない音は無音の出口へ（2026-10-11 bx）
  dropUntaggedVoice() {
    if (!this.isSeMuted) return false;
    if (this._seDepth > 0) return true;           // 効果音（OFF なら asSe で既に止まるが念のため）
    return !(this._bgmDepth > 0);                 // BGM の拍の外で鳴ろうとした音
  }

  silentSink() {
    if (!this._silentSink && this.ctx) {
      this._silentSink = this.ctx.createGain();
      this._silentSink.gain.setValueAtTime(0, this.ctx.currentTime); // どこにもつながない
    }
    return this._silentSink;
  }

  loadSeSettings() {
    try {
      if (typeof localStorage === 'undefined') return;
      const muted = localStorage.getItem('sengoku_se_muted');
      if (muted !== null) this.isSeMuted = (muted === '1');
      const vol = parseFloat(localStorage.getItem('sengoku_se_volume'));
      if (!isNaN(vol)) this.seVolume = Math.max(0, Math.min(1, vol));
    } catch (e) { /* 保存領域が使えないときは既定値（ON） */ }
  }

  saveSeSettings() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem('sengoku_se_muted', this.isSeMuted ? '1' : '0');
      localStorage.setItem('sengoku_se_volume', String(this.seVolume));
    } catch (e) { /* 保存できなくても再生は続ける */ }
  }

  isSeEnabled() {
    return !this.isSeMuted;
  }

  setSeEnabled(enabled) {
    this.isSeMuted = !enabled;
    this.applySeGains();
    this.saveSeSettings();
    return !this.isSeMuted;
  }

  toggleSe() {
    return this.setSeEnabled(this.isSeMuted);
  }

  // 効果音の中央の入口：OFF なら何もしない（2026-10-11 bj）
  playSfx(name, ...args) {
    if (this.isSeMuted) return undefined;
    const fn = this[name];
    if (typeof fn !== 'function') return undefined;
    return this.asSe(() => fn.apply(this, args));
  }

  // 汎用SEディスパッチ
  playSe(type) {
    switch(type) {
      case 'sword': this.playSword(); break;
      case 'cannon': case 'teppo': this.playTeppo(); break;
      case 'fanfare': this.playFanfare(); break;
      case 'horagai': this.playHoragai(); break;
      case 'taiko': this.playTaiko(); break;
      case 'kachi': this.playKachi(); break;
      case 'coin': this.playCoin(); break;
      case 'hyoshigi': this.playHyoshigi(); break;
      case 'tsuzumi': this.playTsuzumiSound(); break;
      case 'tea': this.playTea(); break;
      case 'notice': this.playEventNotice(); break;
      default: break;
    }
  }

  // ============================================================================
  // ボリューム・ミュート・ジュークボックス制御
  // ============================================================================
  setVolume(val) {
    this.init();
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
  }

  setBgmVolume(val) {
    this.init();
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain) {
      const target = this.isBgmMuted ? 0 : this.bgmVolume;
      this.bgmGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
  }

  setSeVolume(val) {
    this.init();
    this.seVolume = Math.max(0, Math.min(1, val));
    this.applySeGains();
    this.saveSeSettings();
  }

  toggleMute() {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setMute(muted) {
    this.init();
    this.isMuted = !!muted;
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  toggleBgmMute() {
    this.init();
    this.isBgmMuted = !this.isBgmMuted;
    if (this.bgmGain) {
      const target = this.isBgmMuted ? 0 : this.bgmVolume;
      this.bgmGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
    return this.isBgmMuted;
  }

  toggleBgm() {
    return this.toggleBgmMute();
  }

  getTrackList() {
    return Object.values(this.tracks);
  }

  getCurrentTrackInfo() {
    return this.tracks[this.currentTrack] || null;
  }

  playNextTrack() {
    const keys = Object.keys(this.tracks);
    const currIdx = keys.indexOf(this.currentTrack);
    const nextIdx = (currIdx + 1) % keys.length;
    this.playTrack(keys[nextIdx], true);
    return keys[nextIdx];
  }

  playPrevTrack() {
    const keys = Object.keys(this.tracks);
    const currIdx = keys.indexOf(this.currentTrack);
    const prevIdx = (currIdx - 1 + keys.length) % keys.length;
    this.playTrack(keys[prevIdx], true);
    return keys[prevIdx];
  }
}
// BGM 先読みスケジューラの設定（2026-10-11 aq）
SengokuMusicEngine.LOOKAHEAD_SEC = 1.5;
// 効果音 OFF のとき季節替わり・画面の曲替えで鳴らし続ける「いつもの曲」と、静かなクロスフェードの長さ（2小節 = 8拍。2026-10-11 bx）
SengokuMusicEngine.HOME_TRACKS = ['spring', 'summer', 'autumn', 'winter', 'oda', 'takeda', 'uesugi', 'date', 'mori_choso', 'shimazu', 'hojo'];
SengokuMusicEngine.SOFT_START_STEPS = 8;
SengokuMusicEngine.SCHEDULER_TICK_MS = 50;

// 未定義メソッド呼び出し時の安全フォールバック（例外クラッシュ完全防止Proxy）
const _rawSengokuMusic = new SengokuMusicEngine();
window.sengokuMusic = new Proxy(_rawSengokuMusic, {
  get(target, prop, receiver) {
    if (prop in target) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return val.bind(target);
      }
      return val;
    }
    if (typeof prop === 'string' && (prop.startsWith('play') || prop.startsWith('stop') || prop.startsWith('set') || prop.startsWith('get'))) {
      return (...args) => {
        console.warn(`[SengokuMusic] 未定義の効果音メソッド呼び出しを安全にスキップ: ${prop}`);
      };
    }
    return undefined;
  }
});
