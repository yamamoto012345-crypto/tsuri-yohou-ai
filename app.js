// ===================== 定数・マッピング =====================

const TIME_OF_DAY_HOUR = { dawn: 5, noon: 12, dusk: 17, night: 21 };
const TIME_OF_DAY_LABEL = { dawn: '朝マズメ', noon: '昼', dusk: '夕マズメ', night: '夜' };

const WIND_DIRS = ['北','北北東','北東','東北東','東','東南東','南東','南南東','南','南南西','南西','西南西','西','西北西','北西','北北西'];

// WMO weather code -> 日本語ラベル・晴れ/雨判定
const WEATHER_CODE_MAP = {
  0: { label: '快晴', icon: '☀️', sunny: true, rain: false },
  1: { label: '晴れ', icon: '🌤️', sunny: true, rain: false },
  2: { label: '晴れ時々曇り', icon: '⛅', sunny: true, rain: false },
  3: { label: '曇り', icon: '☁️', sunny: false, rain: false },
  45: { label: '霧', icon: '🌫️', sunny: false, rain: false },
  48: { label: '霧', icon: '🌫️', sunny: false, rain: false },
  51: { label: '弱い霧雨', icon: '🌦️', sunny: false, rain: true },
  53: { label: '霧雨', icon: '🌦️', sunny: false, rain: true },
  55: { label: '強い霧雨', icon: '🌧️', sunny: false, rain: true },
  61: { label: '弱い雨', icon: '🌦️', sunny: false, rain: true },
  63: { label: '雨', icon: '🌧️', sunny: false, rain: true },
  65: { label: '強い雨', icon: '🌧️', sunny: false, rain: true },
  71: { label: '弱い雪', icon: '🌨️', sunny: false, rain: false },
  73: { label: '雪', icon: '🌨️', sunny: false, rain: false },
  75: { label: '強い雪', icon: '❄️', sunny: false, rain: false },
  80: { label: 'にわか雨', icon: '🌦️', sunny: false, rain: true },
  81: { label: 'にわか雨', icon: '🌧️', sunny: false, rain: true },
  82: { label: '激しいにわか雨', icon: '⛈️', sunny: false, rain: true },
  95: { label: '雷雨', icon: '⛈️', sunny: false, rain: true },
  96: { label: '雷雨（雹）', icon: '⛈️', sunny: false, rain: true },
  99: { label: '雷雨（雹）', icon: '⛈️', sunny: false, rain: true },
};

function weatherInfo(code) {
  return WEATHER_CODE_MAP[code] || { label: '不明', icon: '❔', sunny: false, rain: false };
}

function windDirLabel(deg) {
  if (deg == null) return '-';
  const idx = Math.round(deg / 22.5) % 16;
  return WIND_DIRS[(idx + 16) % 16];
}

// ===================== 技術データベース =====================
// score(cond) は {score:number, reasons:string[]} を返す

const TECHNIQUES = {
  sea: [
    {
      name: 'ジグ単フォール（アジング）',
      tackle: '0.5〜1.5gジグヘッド＋2inワーム（ライトタックル）',
      depth: '表層〜中層（0.5〜3m）',
      action: 'リフト&フォールでフォール中のバイトを拾う。ラインスラックに注意して着底/フォール速度を一定に保つ。',
      castDistance: '足元〜15m程度（近距離のリフト&フォール中心）',
      tags: ['calm', 'nightLight', 'structure'],
      score(c) {
        let s = 45; const r = [];
        if (['dawn', 'dusk', 'night'].includes(c.timeOfDay)) { s += 20; r.push(`${TIME_OF_DAY_LABEL[c.timeOfDay]}はアジ・メバルの活性が上がりやすい時間帯`); }
        else { s -= 10; }
        if (c.windSpeed < 4) { s += 15; r.push(`風速${c.windSpeed.toFixed(1)}m/sと穏やかでライトリグが扱いやすい`); }
        else if (c.windSpeed > 7) { s -= 15; r.push(`風速${c.windSpeed.toFixed(1)}m/sでラインが流されやすい点は注意`); }
        if (c.tide) {
          if (c.tide.fractionTenth > 1 && c.tide.fractionTenth < 9) { s += 10; r.push(`潮が動いている（${c.tide.state}${c.tide.fractionTenth}分）ためベイトの動きに反応しやすい`); }
          else { s -= 10; r.push('潮止まり付近で活性が下がりやすい'); }
        }
        if (!c.isSunny) { s += 5; r.push('薄暗い光量が常夜灯周りの回遊を誘発'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: '表層プラグのただ巻き（メバリング）',
      tackle: '2〜3gフローティングプラグ／シンキングペンシル',
      depth: '表層（0〜1m）',
      action: '常夜灯の明暗の境目をゆっくりただ巻き。時々ポーズを入れてリアクションを誘う。',
      castDistance: '5〜15m（常夜灯の明暗の境目まで届く範囲）',
      tags: ['nightLight', 'calmHarbor'],
      score(c) {
        let s = 40; const r = [];
        if (c.timeOfDay === 'night') { s += 25; r.push('夜間は常夜灯周りの表層メバリングが本命'); }
        else if (['dawn', 'dusk'].includes(c.timeOfDay)) { s += 10; r.push('マズメ時は表層でも反応が出やすい'); }
        else { s -= 20; r.push('日中は表層プラグへの反応が鈍い傾向'); }
        if (c.windSpeed < 3) { s += 15; r.push(`風速${c.windSpeed.toFixed(1)}m/sで水面が穏やかなため表層攻略がしやすい`); }
        else if (c.windSpeed > 6) { s -= 20; r.push('風で表層が波立ち、プラグが安定しにくい'); }
        if (c.tide && c.tide.state === '下げ' && c.tide.fractionTenth <= 5) { s += 10; r.push('下げ始めの潮でベイトが払い出されメバルが着きやすい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'サビキ仕掛け（回遊魚狙い）',
      tackle: 'サビキ仕掛け＋アミエビカゴ',
      depth: '中層〜底（撒き餌の効く層）',
      action: '足元に仕掛けを落として棚を探り、群れが入ったら同じ棚で待つ。',
      castDistance: '足元直下（遠投せず真下に投入）',
      tags: ['pier', 'calmHarbor', 'current'],
      score(c) {
        let s = 42; const r = [];
        if (['noon', 'dawn'].includes(c.timeOfDay)) { s += 18; r.push(`${TIME_OF_DAY_LABEL[c.timeOfDay]}は回遊魚のサビキ実績が高い`); }
        if (c.tide && c.tide.state === '上げ') { s += 15; r.push('上げ潮はベイトの回遊が活発になりやすい'); }
        if (c.windSpeed > 10) { s -= 10; r.push('強風下では仕掛けが振られやすい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'ちょい投げ（キス・カレイ）',
      tackle: '天秤＋オモリ10号＋ジャリメ/アオイソメ',
      depth: '底',
      action: 'キャスト後、底を這わせるようにゆっくりズル引きしてくる。',
      castDistance: '20〜30m（遠投して広く探る）',
      tags: ['surf', 'sandy'],
      score(c) {
        let s = 38; const r = [];
        if (c.windSpeed > 5) { s += 12; r.push(`風速${c.windSpeed.toFixed(1)}m/sでも底を取る釣りなので影響を受けにくい`); }
        if (c.isRain) { s += 10; r.push('雨後の濁りはキス・カレイの警戒心を下げる'); }
        if (c.tide && c.tide.state === '下げ') { s += 10; r.push('下げ潮は砂地の回遊魚が動きやすい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'フカセ（ウキ釣り）',
      tackle: '磯竿＋円錐ウキ＋オキアミ',
      depth: '中層（潮に合わせて可変）',
      action: '潮の流れに仕掛けを乗せ、自然に流してアタリを待つ。',
      castDistance: '10〜20m（潮に乗せて流れる分を含む）',
      tags: ['current', 'deepEdge'],
      score(c) {
        let s = 40; const r = [];
        if (c.tide && c.tide.fractionTenth >= 3 && c.tide.fractionTenth <= 7) { s += 20; r.push(`潮がしっかり動く時間帯（${c.tide.state}${c.tide.fractionTenth}分）で仕掛けがナチュラルに流れる`); }
        else if (c.tide) { s -= 15; r.push('潮止まり/最強時は仕掛けが流れにくい'); }
        if (c.windSpeed >= 2 && c.windSpeed <= 6) { s += 10; r.push('適度な風でウキが流れやすい'); }
        return { score: s, reasons: r };
      },
    },
  ],

  bass: [
    {
      name: 'トップウォーター（ポッパー/ノーシンカーワーム）',
      tackle: 'ポッパー or 4inノーシンカーワーム',
      depth: '表層',
      action: 'ドッグウォークやポーズを入れつつ、ストラクチャー周りを丁寧にトレース。',
      castDistance: '10〜20m（ストラクチャー際を丁寧に）',
      tags: ['calm', 'shallowCove', 'vegetation'],
      score(c) {
        let s = 40; const r = [];
        if (['dawn', 'dusk'].includes(c.timeOfDay)) { s += 25; r.push(`${TIME_OF_DAY_LABEL[c.timeOfDay]}の低光量はトップウォーターの好機`); }
        else { s -= 15; }
        if (c.windSpeed < 2) { s += 20; r.push(`風速${c.windSpeed.toFixed(1)}m/sの無風〜微風で水面が油面のように穏やか`); }
        else if (c.windSpeed > 5) { s -= 25; r.push('風で水面が波立ちトップの誘いが伝わりにくい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'スピナーベイト/クランクベイトの巻物',
      tackle: 'スピナーベイト1/2oz or シャッドクランク',
      depth: '中層',
      action: 'ストラクチャーやブレイクラインに沿ってただ巻きし、広範囲をスピーディに探る。',
      castDistance: '20〜30m（広範囲をスピーディに探る）',
      tags: ['nearBreak', 'current'],
      score(c) {
        let s = 42; const r = [];
        if (!c.isSunny) { s += 15; r.push('曇天でベイトフィッシュが浮きやすく巻物への反応が良い'); }
        if (c.windSpeed >= 2 && c.windSpeed <= 6) { s += 10; r.push('適度な風で水面が揉まれ警戒心が緩む'); }
        if (c.timeOfDay === 'noon') { s += 10; r.push('日中の回遊個体を広く探るのに向く'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'ネコリグ/ダウンショットのボトムフィネス',
      tackle: '3.5inワームのネコリグ or ダウンショット',
      depth: 'ボトム',
      action: 'ボトムでシェイクしながらスローに誘い、時々放置してバイトを待つ。',
      castDistance: '5〜15m（ボトムを丁寧に探れる近距離）',
      tags: ['structure', 'deepEdge'],
      score(c) {
        let s = 38; const r = [];
        if (c.isSunny) { s += 20; r.push('晴天無風でプレッシャーが高い時はフィネスが強い'); }
        if (c.windSpeed > 6) { s += 15; r.push('強風で表層系が扱いにくい時のボトム攻略'); }
        if (c.timeOfDay === 'noon') { s += 10; }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'ラバージグのカバー撃ち',
      tackle: '3/8ozラバージグ＋トレーラー',
      depth: 'ボトム〜カバー際',
      action: 'カバーの奥にピッチングし、フォール→ズル引き→シェイクでリアクションを誘う。',
      castDistance: '10〜15m（カバーの奥へピンポイント）',
      tags: ['structure', 'shallowCove'],
      score(c) {
        let s = 36; const r = [];
        if (c.isRain) { s += 15; r.push('降雨後の濁りはラバージグのシルエットが効きやすい'); }
        if (c.isLowActivitySeason) { s += 12; r.push(`${c.lowActivityReasonText}、カバー撃ちでスローに口を使わせやすい`); }
        return { score: s, reasons: r };
      },
    },
  ],

  trout: [
    {
      name: 'ミノーイング（表層〜中層）',
      tackle: '50〜60mmシンキングミノー',
      depth: '表層〜30cm',
      action: 'アップ〜クロス方向にキャストし、ただ巻き+時々ヒラ打ちさせて誘う。',
      castDistance: '15〜25m（アップ〜クロスにキャスト）',
      tags: ['current', 'nearBreak'],
      score(c) {
        let s = 42; const r = [];
        if (!c.isSunny) { s += 20; r.push('曇天は警戒心が緩みミノーへの反応が良い'); }
        if (c.timeOfDay === 'dusk') { s += 15; r.push('夕方は捕食活性が上がりやすい'); }
        if (c.timeOfDay === 'noon' && c.isSunny) { s -= 10; r.push('日中の直射日光下はプレッシャーが高い'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'スプーンのボトムトレース',
      tackle: '2〜3gスプーン',
      depth: 'ボトム〜中層',
      action: 'ボトムをかすめるように引き、時々リフト&フォールでリアクションを誘発。',
      castDistance: '15〜20m',
      tags: ['deepEdge', 'current'],
      score(c) {
        let s = 40; const r = [];
        if (c.isSunny) { s += 15; r.push('晴天クリアウォーターではボトム寄りのレンジが安定'); }
        if (c.timeOfDay === 'noon') { s += 10; }
        if (c.isLowActivitySeason) { s += 10; r.push(`${c.lowActivityReasonText}、魚がボトム付近に着きやすい`); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'ドライフライ',
      tackle: '#14〜#18 パラシュートフライ',
      depth: '水面',
      action: 'ナチュラルドリフトで流し、ライズに合わせてアワセを入れる。',
      castDistance: '5〜10m（ナチュラルドリフトできる距離）',
      tags: ['calm', 'shallowCove'],
      score(c) {
        let s = 35; const r = [];
        if (['dawn', 'dusk'].includes(c.timeOfDay)) { s += 25; r.push('虫の活動が増えるマズメ時はライズが出やすい'); }
        else { s -= 15; }
        if (c.temp > 18) { s += 10; r.push(`気温${c.temp.toFixed(1)}℃と暖かく水生昆虫の活動が活発`); }
        if (c.windSpeed > 4) { s -= 20; r.push('風が強いとフライの着水制御が難しい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'エサ釣り（ミミズ・川虫）の流し釣り',
      tackle: '渓流竿＋ミミズ or 川虫＋玉ウキ',
      depth: 'ボトム〜中層（流れに乗せる）',
      action: '流れに自然に仕掛けを乗せ、竿先でアタリを取る。',
      castDistance: '流れの筋に合わせて5〜15m',
      tags: ['current'],
      score(c) {
        let s = 44; const r = [];
        if (c.isRain) { s += 15; r.push('増水・濁り時はエサ釣りの安定感が強み'); }
        if (c.windSpeed > 5) { s += 10; r.push('悪天候下でもエサの実績は落ちにくい'); }
        r.push('季節・天候を問わず対応できる万能な選択肢');
        return { score: s, reasons: r };
      },
    },
  ],

  jigging: [
    {
      name: 'メタルジグのワンピッチジャーク',
      tackle: '20〜40gメタルジグ',
      depth: '中層〜ボトム',
      action: 'ボトムを取ってからワンピッチジャークで中層まで巻き上げ、レンジを探る。',
      castDistance: '30〜50m（遠投してボトムを取る）',
      tags: ['current', 'deepEdge'],
      score(c) {
        let s = 44; const r = [];
        if (['dawn', 'dusk'].includes(c.timeOfDay)) { s += 20; r.push(`${TIME_OF_DAY_LABEL[c.timeOfDay]}はナブラ・青物の活性が上がりやすい`); }
        if (c.windSpeed >= 3 && c.windSpeed <= 8) { s += 10; r.push('適度な風でジグの操作性とキャスト距離が両立する'); }
        else if (c.windSpeed > 12) { s -= 10; r.push('強風下はライン管理が難しい'); }
        if (c.tide && c.tide.state === '上げ') { s += 10; r.push('上げ潮はベイトの回遊とリンクしやすい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: '高速巻きただ引き（表層）',
      tackle: 'メタルジグ or ミノー高速巻き',
      depth: '表層',
      action: 'キャスト後すぐに高速でただ巻きし、表層のナブラ・ボイルを狙う。',
      castDistance: '30〜40m',
      tags: ['current'],
      score(c) {
        let s = 38; const r = [];
        if (c.isSunny) { s += 15; r.push('晴天でベイトが表層に浮きやすい'); }
        if (['dawn', 'noon'].includes(c.timeOfDay)) { s += 10; }
        if (c.tide && (c.tide.fractionTenth <= 1 || c.tide.fractionTenth >= 9)) { s -= 10; r.push('潮止まり付近は表層の活性が下がりやすい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'スロージギング（ボトムステイ）',
      tackle: '60〜100gスロージグ',
      depth: 'ボトム',
      action: 'リフト&フォールでボトム付近をじっくりステイさせ、フォール中のバイトを拾う。',
      castDistance: '20〜40m（堤防先端や船からのボトム攻略）',
      tags: ['deepEdge', 'calm'],
      score(c) {
        let s = 36; const r = [];
        if (c.windSpeed < 5) { s += 15; r.push('風・流れが緩い時はスローなフォールが決めやすい'); }
        if (c.tide && c.tide.fractionTenth >= 4 && c.tide.fractionTenth <= 6) { s += 10; r.push('潮の流れが緩やかでジグを支配しやすい'); }
        if (c.isLowActivitySeason) { s += 10; r.push(`${c.lowActivityReasonText}、低活性魚に強いスロー系が有利`); }
        return { score: s, reasons: r };
      },
    },
  ],

  other: [
    {
      name: '汎用ワームのリフト&フォール',
      tackle: '3inワーム＋ジグヘッド',
      depth: '中層〜ボトム',
      action: 'リフト&フォールを繰り返し、フォール中心にレンジを探る万能パターン。',
      castDistance: '15〜25m',
      score(c) {
        let s = 46; const r = ['天候・魚種を問わず対応しやすい万能パターン'];
        if (c.windSpeed < 5) { s += 10; r.push('穏やかな風で操作性が良い'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'ただ巻きミノー/プラグ',
      tackle: 'ミノー or シャッドプラグ',
      depth: '表層〜中層',
      action: '一定速度のただ巻きでレンジをキープし、広く探る。',
      castDistance: '20〜30m',
      score(c) {
        let s = 40; const r = [];
        if (!c.isSunny || ['dawn', 'dusk'].includes(c.timeOfDay)) { s += 10; r.push('低光量条件でプラグへの反応が良くなりやすい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'ちょい投げ/ぶっこみ釣り',
      tackle: '天秤オモリ＋エサ（虫餌・魚餌）',
      depth: 'ボトム',
      action: 'キャスト後に置き竿にして、底でアタリを待つ。',
      castDistance: '20〜30m',
      score(c) {
        let s = 34; const r = [];
        if (c.windSpeed > 5 || c.isRain) { s += 12; r.push('やや荒れた条件でも安定して狙える底の釣り'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: '探り釣り（全レンジサーチ）',
      tackle: '汎用ルアー/エサをローテーション',
      depth: '表層・中層・ボトムを順に探索',
      action: '各レンジを順番に探り、反応のあった層を重点的に攻める。',
      castDistance: '10〜20m（レンジごとに探索）',
      score(c) {
        let s = 32; const r = ['条件が読みにくい時のレンジ探索の保険'];
        if (c.timeOfDay === 'noon') { s += 5; }
        return { score: s, reasons: r };
      },
    },
  ],
};

// ===================== 広域エリア → 詳細ポイント選出ロジック =====================
// 「琵琶湖」「淡路島」のような広域名が入力された場合に、エリア内の詳細な釣りポイントを
// 3件提示するための仕組み。実在の有名スポットをキュレーションしたデータベースを優先し、
// 該当がない場合は座標の範囲(bounding box)から機械的に3エリアを生成するフォールバックを使う
// （存在しない「実績ポイント」を偽って生成することは避け、その場合は目安である旨を明示する）。

const TAG_LABEL = {
  shallowCove: 'ワンド状の浅場',
  vegetation: '水草(ウィード)の多いエリア',
  calm: '流れが穏やかなエリア',
  nearBreak: 'ブレイク(駆け上がり)が隣接するエリア',
  structure: 'ストラクチャーが多いエリア',
  current: '潮通し・流れが良いエリア',
  pier: '足場の良い波止・堤防',
  calmHarbor: '静穏な港内',
  nightLight: '常夜灯のあるエリア',
  deepEdge: '深場に近いエリア',
  surf: '遠浅のサーフ',
  sandy: '砂地のエリア',
};

// 実在の有名釣りスポットをキュレーションしたデータベース（座標・特性は目安）
const CURATED_AREAS = [
  {
    keywords: ['琵琶湖'],
    areaLabel: '琵琶湖',
    spots: [
      {
        name: '南湖・赤野井湾ワンド周辺',
        lat: 35.129, lon: 135.986,
        traits: ['ワンド状の地形で水通しが穏やか', '浅場に水草(ウィード)が多くベイトが溜まりやすい'],
        tags: ['shallowCove', 'vegetation', 'calm'],
      },
      {
        name: '木浜周辺（南湖東岸）',
        lat: 35.118, lon: 135.995,
        traits: ['遠浅で沖にブレイク(駆け上がり)が点在', '護岸沿いの沈み物にベイトが着きやすい'],
        tags: ['nearBreak', 'structure'],
      },
      {
        name: '近江大橋周辺（南湖）',
        lat: 35.022, lon: 135.904,
        traits: ['橋脚周りに流れが生まれ潮通しが良い', '深場と浅場の境目が近く一年中実績が高い'],
        tags: ['current', 'nearBreak', 'structure'],
      },
    ],
  },
  {
    keywords: ['淡路島'],
    areaLabel: '淡路島',
    spots: [
      {
        name: '江井漁港周辺',
        lat: 34.548, lon: 134.889,
        traits: ['港内は足場が良く常夜灯もあり夜釣り向き', '静穏な港内でファミリーフィッシングにも好適'],
        tags: ['pier', 'calmHarbor', 'nightLight'],
      },
      {
        name: '生穂新島沖の波止周辺',
        lat: 34.345, lon: 134.865,
        traits: ['沖の波止で潮通しが良く回遊魚が狙える', '足元から水深があり大型回遊魚も期待できる'],
        tags: ['current', 'deepEdge', 'pier'],
      },
      {
        name: '慶野松原海岸周辺',
        lat: 34.285, lon: 134.748,
        traits: ['遠浅のサーフで投げ釣り向き', '砂地でキス・カレイの実績が高い'],
        tags: ['surf', 'sandy'],
      },
    ],
  },
];

function matchCuratedArea(text) {
  if (!text) return null;
  return CURATED_AREAS.find((a) => a.keywords.some((k) => text.includes(k))) || null;
}

function bboxSizeKm(bbox) {
  if (!bbox || bbox.length < 4) return 0;
  const [s, n, w, e] = bbox;
  const latKm = Math.abs(n - s) * 111;
  const lonKm = Math.abs(e - w) * 111 * Math.cos(((s + n) / 2) * Math.PI / 180);
  return Math.max(latKm, lonKm);
}

// キュレーション対象外の広域エリア用フォールバック: 実績データではなく、
// 範囲(bounding box)から機械的に生成した「岸寄り/沖合い/中間」の目安ポイント3件
function generateGenericSpots(geo, bbox) {
  const [s, n, w, e] = bbox && bbox.length >= 4 ? bbox : [geo.lat - 0.01, geo.lat + 0.01, geo.lon - 0.01, geo.lon + 0.01];
  const latHalf = Math.max(Math.abs(n - s) / 2, 0.003);
  const lonHalf = Math.max(Math.abs(e - w) / 2, 0.003);
  const defs = [
    { dLat: latHalf * 0.5, dLon: 0, label: '北側エリア', tags: ['structure', 'shallowCove'], trait: '岸寄り・浅場を想定したエリア' },
    { dLat: -latHalf * 0.35, dLon: lonHalf * 0.45, label: '南東側エリア', tags: ['deepEdge', 'current'], trait: '沖合い・深場を想定したエリア' },
    { dLat: -latHalf * 0.15, dLon: -lonHalf * 0.5, label: '西側エリア', tags: [], trait: 'バランス型の中間エリア' },
  ];
  return defs.map((d) => ({
    name: `${geo.shortLabel}${d.label}`,
    lat: geo.lat + d.dLat,
    lon: geo.lon + d.dLon,
    traits: [d.trait, '※実績データに基づく特定ポイントではなく、エリア内の目安位置です'],
    tags: d.tags,
  }));
}

// 技術のtagsとスポットのtagsが重なる場合にボーナス加点し、選出理由を1文追加する
function spotAffinityAdjust(technique, spot) {
  if (!spot || !technique.tags || !technique.tags.length || !spot.tags) return { bonus: 0, reason: null };
  const matched = technique.tags.filter((t) => spot.tags.includes(t));
  if (!matched.length) return { bonus: 0, reason: null };
  const bonus = Math.min(matched.length, 2) * 15;
  const reason = `${spot.name}は${matched.map((t) => TAG_LABEL[t] || t).join('・')}という特性があり相性が良い`;
  return { bonus, reason };
}

// 指定スポットに対して、条件スコア＋スポット特性ボーナスが最も高い釣り方を1つ選ぶ
function pickBestTechniqueForSpot(fishType, cond, spot) {
  const list = TECHNIQUES[fishType] || TECHNIQUES.other;
  let best = null;
  for (const tech of list) {
    const { score, reasons } = tech.score(cond);
    const affinity = spotAffinityAdjust(tech, spot);
    const total = score + affinity.bonus;
    if (!best || total > best.score) {
      best = { ...tech, score: total, reasons: affinity.reason ? [...reasons, affinity.reason] : reasons };
    }
  }
  return best;
}

// ===================== 日時・気象・潮汐ロジック =====================

function pad2(n) { return n.toString().padStart(2, '0'); }
function toDateStr(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function stripTime(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

function bucketFromHour(hour) {
  if (hour >= 4 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 16) return 'noon';
  if (hour >= 16 && hour < 19) return 'dusk';
  return 'night';
}

function computeTargetDateTime({ dateOption, timeOfDay, customDate }) {
  const now = new Date();
  if (dateOption === 'now') return { date: now, timeOfDay: bucketFromHour(now.getHours()) };

  let base;
  if (dateOption === 'today') base = new Date();
  else if (dateOption === 'tomorrow') { base = new Date(); base.setDate(base.getDate() + 1); }
  else if (dateOption === 'custom' && customDate) base = new Date(customDate + 'T00:00:00');
  else base = new Date();

  const hour = TIME_OF_DAY_HOUR[timeOfDay] ?? 12;
  const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0, 0);
  return { date: dt, timeOfDay };
}

async function geocode(name) {
  // Open-Meteoのジオコーディングは日本語表記(漢字・かな)の地名をほぼ検索できないため、
  // 日本語地名に強いNominatim(OpenStreetMap)を使用する。公開デモサーバーはfair-use制限があり
  // 短時間に連続アクセスすると一時的に結果0件を返すことがあるため、軽くリトライする。
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=jsonv2&limit=5&addressdetails=1&accept-language=ja`;
  let data = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('位置情報の取得に失敗しました。通信環境をご確認ください。');
    data = await res.json();
    if (Array.isArray(data) && data.length) break;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800));
  }
  if (!Array.isArray(data) || !data.length) {
    throw new Error(`「${name}」の場所が見つかりませんでした。地名や住所を変えてお試しください。`);
  }
  // 飲食店・店舗など地形とは無関係なPOIが同名で上位に来ることがあるため除外する
  const deprioritized = new Set(['amenity', 'shop', 'office']);
  const best = data.find((r) => !deprioritized.has(r.class)) || data[0];
  const addr = best.address || {};
  const label = [best.name || name, addr.city || addr.town || addr.village || addr.county, addr.state, addr.country]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');
  const bbox = Array.isArray(best.boundingbox) ? best.boundingbox.map(Number) : null;
  return { lat: parseFloat(best.lat), lon: parseFloat(best.lon), label, shortLabel: best.name || name, bbox };
}

async function fetchWeather(lat, lon, targetDate) {
  const today = new Date();
  const diffDays = Math.round((stripTime(targetDate) - stripTime(today)) / 86400000);

  const hourlyParams = 'temperature_2m,pressure_msl,weathercode,windspeed_10m,winddirection_10m';
  let url, approximated = false;

  if (diffDays >= -92 && diffDays <= 16) {
    const ds = toDateStr(targetDate);
    url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams}&timezone=auto&start_date=${ds}&end_date=${ds}`;
  } else if (diffDays < -92) {
    const ds = toDateStr(targetDate);
    url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams}&timezone=auto&start_date=${ds}&end_date=${ds}`;
  } else {
    const clamped = new Date(today); clamped.setDate(clamped.getDate() + 16);
    const ds = toDateStr(clamped);
    url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams}&timezone=auto&start_date=${ds}&end_date=${ds}`;
    approximated = true;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error('気象データの取得に失敗しました。');
  const data = await res.json();
  if (!data.hourly || !data.hourly.time || !data.hourly.time.length) {
    throw new Error('指定日時の気象データが見つかりませんでした。');
  }

  const targetHourStr = `${toDateStr(targetDate)}T${pad2(targetDate.getHours())}:00`;
  let idx = data.hourly.time.indexOf(targetHourStr);
  if (idx === -1) idx = Math.min(targetDate.getHours(), data.hourly.time.length - 1);

  return {
    time: data.hourly.time[idx],
    temp: data.hourly.temperature_2m[idx],
    pressure: data.hourly.pressure_msl[idx],
    weathercode: data.hourly.weathercode[idx],
    windspeed: data.hourly.windspeed_10m[idx],
    winddirection: data.hourly.winddirection_10m[idx],
    approximated,
  };
}

// 実測の海面水温（海釣り/ショアジギング用）。気候変動で「例年の低水温期」がズレても
// 実測値なら毎回その年の実態に対応できる。海に面していない座標では信頼できない値
// （elevationが大きい＝内陸の湖等）が返ることがあるため、その場合はnullを返して
// 呼び出し側でカレンダーベースの簡易判定にフォールバックさせる。
async function fetchSeaSurfaceTemp(lat, lon, targetDate) {
  const today = new Date();
  const diffDays = Math.round((stripTime(targetDate) - stripTime(today)) / 86400000);
  if (diffDays < -5 || diffDays > 16) return null; // 対応範囲外は無理に取得しない

  try {
    const ds = toDateStr(targetDate);
    const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=sea_surface_temperature&timezone=auto&start_date=${ds}&end_date=${ds}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.elevation === 'number' && data.elevation > 5) return null; // 内陸グリッド＝海ではない
    if (!data.hourly || !data.hourly.time || !data.hourly.time.length) return null;
    const targetHourStr = `${ds}T${pad2(targetDate.getHours())}:00`;
    let idx = data.hourly.time.indexOf(targetHourStr);
    if (idx === -1) idx = Math.min(targetDate.getHours(), data.hourly.time.length - 1);
    const v = data.hourly.sea_surface_temperature[idx];
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

// 湖・川用: 海面水温のような直接データがないため、直近5日間の気温の平均を
// 「今の実際の気温トレンド」の目安として使う（カレンダー上の月だけで判断しない）。
async function fetchRecentAvgTemp(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_mean&past_days=5&forecast_days=1&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const vals = data.daily && Array.isArray(data.daily.temperature_2m_mean)
      ? data.daily.temperature_2m_mean.slice(0, 5).filter((v) => typeof v === 'number')
      : [];
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  } catch {
    return null;
  }
}

// 潮汐は正式な観測データではなく、月齢に基づく簡易的な近似モデル（実際の潮汐表とは異なる）
function getMoonAge(date) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const synodicDays = 29.53058867;
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  let age = diffDays % synodicDays;
  if (age < 0) age += synodicDays;
  return age;
}

function tideTypeFromMoonAge(age) {
  const distToFull = Math.min(Math.abs(age - 0), Math.abs(age - 14.77), Math.abs(age - 29.53));
  const distToQuarter = Math.min(Math.abs(age - 7.38), Math.abs(age - 22.15));
  if (distToFull <= 2.5) return '大潮';
  if (distToQuarter <= 2.5) return '小潮';
  if (distToFull <= 5) return '中潮';
  return distToQuarter <= 5 ? '若潮' : '長潮';
}

function tideHeightFn(date, lon) {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const periodHours = 12.4206; // 半日周潮(M2)の概算周期
  const lonPhaseHours = lon / 15; // 経度による位相の粗い近似
  return (t) => {
    const hoursSinceEpoch = (t.getTime() - knownNewMoon) / 3600000 + lonPhaseHours;
    return Math.sin((2 * Math.PI * hoursSinceEpoch) / periodHours);
  };
}

function computeTide(targetDate, lat, lon) {
  const heightFn = tideHeightFn(targetDate, lon);
  const eps = 60 * 1000; // 1分
  const h0 = heightFn(targetDate);
  const h1 = heightFn(new Date(targetDate.getTime() + eps));
  const rising = h1 > h0;
  const fractionTenth = Math.round(((h0 + 1) / 2) * 10);

  // 前後の高潮・低潮を数値探索で概算
  const stepMin = 6;
  const points = [];
  for (let m = -12 * 60; m <= 12 * 60; m += stepMin) {
    const t = new Date(targetDate.getTime() + m * 60000);
    points.push({ t, h: heightFn(t) });
  }
  let nextHigh = null, nextLow = null;
  for (let i = 1; i < points.length - 1; i++) {
    const { t, h } = points[i];
    if (t <= targetDate) continue;
    if (h >= points[i - 1].h && h >= points[i + 1].h && !nextHigh) nextHigh = t;
    if (h <= points[i - 1].h && h <= points[i + 1].h && !nextLow) nextLow = t;
    if (nextHigh && nextLow) break;
  }

  const moonAge = getMoonAge(targetDate);
  return {
    type: tideTypeFromMoonAge(moonAge),
    state: rising ? '上げ' : '下げ',
    fractionTenth: Math.max(0, Math.min(10, fractionTenth)),
    nextHigh,
    nextLow,
    simplified: true,
  };
}

// ===================== 診断アルゴリズム =====================

// 「低水温期で活性が下がりやすいか」を、可能な限り実測データから毎回判定する。
// 気候変動で暖冬/早い寒波などカレンダーとズレても対応できるよう、
// 1) 実測の海面水温 → 2) 直近5日間の気温トレンド → 3) カレンダー上の月、の順で使えるものを優先する。
function computeLowActivitySeason(waterTemp, recentAvgTemp, month) {
  if (typeof waterTemp === 'number') {
    return { isLow: waterTemp < 15, reasonText: `実測の海面水温${waterTemp.toFixed(1)}℃と低めのため` };
  }
  if (typeof recentAvgTemp === 'number') {
    return { isLow: recentAvgTemp < 10, reasonText: `直近5日間の平均気温${recentAvgTemp.toFixed(1)}℃と低めのため` };
  }
  const isLow = [11, 12, 1, 2, 3].includes(month);
  return { isLow, reasonText: 'この時期は一般的に低水温期とされるため（実測データ未取得のためカレンダーで簡易判定）' };
}

function buildConditions(fishType, weather, tide, targetDate, waterTemp, recentAvgTemp) {
  const wInfo = weatherInfo(weather.weathercode);
  const month = targetDate.date.getMonth() + 1;
  const lowSeason = computeLowActivitySeason(waterTemp, recentAvgTemp, month);
  return {
    windSpeed: weather.windspeed,
    windDirLabel: windDirLabel(weather.winddirection),
    weatherLabel: wInfo.label,
    weatherIcon: wInfo.icon,
    isSunny: wInfo.sunny,
    isRain: wInfo.rain,
    temp: weather.temp,
    pressure: weather.pressure,
    timeOfDay: targetDate.timeOfDay,
    month,
    tide: tide || null,
    waterTemp: typeof waterTemp === 'number' ? waterTemp : null,
    isLowActivitySeason: lowSeason.isLow,
    lowActivityReasonText: lowSeason.reasonText,
  };
}

// 実測の風向・風速から「どちら向きにキャストすべきか」を助言する。
// 特定の足場・座標を断定するものではなく、風という実データに基づく一般論としての方向付け。
function castDirectionAdvice(cond) {
  if (cond.windSpeed < 1.5) {
    return 'ほぼ無風のため、キャスト方向による影響は小さく、地形（ブレイクや障害物）を基準に狙う方向を決めやすい。';
  }
  const downwindIdx = (WIND_DIRS.indexOf(cond.windDirLabel) + 8) % 16;
  const downwindLabel = WIND_DIRS[downwindIdx];
  if (cond.windSpeed >= 6) {
    return `${cond.windDirLabel}の風・風速${cond.windSpeed.toFixed(1)}m/sとやや強めのため、風を背にして${downwindLabel}方向へキャストすると追い風で距離が出やすくライン操作も安定する。正面から風を受ける向きは避けたい。`;
  }
  return `${cond.windDirLabel}の風・風速${cond.windSpeed.toFixed(1)}m/sのため、風を背にして${downwindLabel}方向へキャストすると距離を出しやすい。横風気味の向きでも操作性への影響は小さい。`;
}

// 実測の天候（晴天/曇天/降雨）から、警戒されにくいルアーカラーの傾向を助言する。
function lureColorAdvice(cond) {
  if (cond.isRain) {
    return '雨・濁り水を想定し、視認性の高いチャートリュース系/オレンジ系など目立つカラーが有利。';
  }
  if (!cond.isSunny) {
    return '曇天・低光量を想定し、シルエットが出やすいダーク系やグロー・ラメ入りカラーが有利。';
  }
  return '晴天・クリアウォーターを想定し、ナチュラル系(クリア/パール/ワカサギ系)など警戒されにくいカラーが有利。';
}

// 「釣果数の予測」はできない（実際の釣果ログや個体数データが存在しないため）。
// 代わりに、風・天候・水温・潮汐・時間帯という実測/準実測データだけから、
// 「その日の釣り条件そのものの良さ」を技術選択とは無関係に算出する。
// (個々の釣り方スコアを使うと「4択の中で一番マッチする手法」を反映してしまい、
//  悪条件でも常に高評価になってしまうため、あえて技術選択から切り離している。)
function overallConditionScore(cond) {
  let s = 50;
  if (cond.windSpeed >= 1 && cond.windSpeed <= 6) s += 15;
  else if (cond.windSpeed > 12) s -= 15;
  if (cond.isRain) s -= 15;
  else s += 10;
  if (cond.isLowActivitySeason) s -= 10;
  if (cond.tide) {
    if (cond.tide.fractionTenth >= 2 && cond.tide.fractionTenth <= 8) s += 10;
    else s -= 10;
  }
  if (['dawn', 'dusk'].includes(cond.timeOfDay)) s += 5;
  else if (cond.timeOfDay === 'noon') s -= 5;
  return Math.max(0, Math.min(100, s));
}

function scoreToExpectationTier(score) {
  if (score >= 70) return { icon: '◎', label: '絶好調', desc: '条件が非常に良く、活性の高い展開が期待できる' };
  if (score >= 50) return { icon: '○', label: '良好', desc: '条件が良く、狙い方次第で反応が得やすい' };
  if (score >= 30) return { icon: '△', label: '普通', desc: '標準的な条件。丁寧な誘いが必要になりやすい' };
  return { icon: '▲', label: '厳しめ', desc: '活性が下がりやすい条件。粘り強いアプローチが鍵' };
}

// 実測の水温トレンド(cond.isLowActivitySeason)に基づく、その時期に狙われやすい魚種の一般的な傾向。
// 個体の存否や釣果を保証するものではなく、季節性の一般論として表示する。
const TARGET_SPECIES_HINT = {
  sea: {
    active: 'アジ・メバル・クロダイ・回遊魚(サビキで狙える小型回遊魚)など',
    low: 'メバル・カサゴなどの根魚中心（回遊魚は活性が下がりやすい時期）',
  },
  bass: {
    active: 'ブラックバス（表層〜中層でも反応しやすい活性期）',
    low: 'ブラックバス（低水温期はボトム中心で低活性想定）',
  },
  trout: {
    active: 'ニジマス・ヤマメ・イワナ（虫の活動も活発な時期）',
    low: 'ニジマス中心（渓流種は低水温期に活性が下がりやすい）',
  },
  jigging: {
    active: '青物（ブリ・サワラ・カツオ等の回遊魚）',
    low: '根魚・青物（低水温期は青物の回遊が鈍りやすい）',
  },
  other: {
    active: '季節の回遊魚・根魚など',
    low: '根魚中心（低水温期は回遊魚の活性が下がりやすい）',
  },
};

function targetSpeciesHint(fishType, cond) {
  const hint = TARGET_SPECIES_HINT[fishType] || TARGET_SPECIES_HINT.other;
  return cond.isLowActivitySeason ? hint.low : hint.active;
}

// 備考欄（自由記述の要望）に対するAI回答。Anthropic APIキーが設定されている場合のみ動作する。
// ルールベースの3枚のカード（既存の診断ロジック）とは完全に独立した補助機能であり、
// AI呼び出しが失敗してもメインの診断結果には一切影響しない。
async function fetchAiSuggestion(remarks, ctx) {
  const apiKey = localStorage.getItem('anthropicKey');
  if (!apiKey) return { unavailable: true };

  const contextText = [
    `釣種: ${ctx.fishTypeLabel}`,
    `場所: ${ctx.placeLabel}`,
    `日時: ${ctx.dateLabel}（時間帯: ${ctx.timeOfDayLabel}）`,
    `天候: ${ctx.cond.weatherLabel}、気温${ctx.cond.temp.toFixed(1)}℃、風${ctx.cond.windDirLabel}${ctx.cond.windSpeed.toFixed(1)}m/s`,
    ctx.cond.waterTemp != null ? `実測海面水温: ${ctx.cond.waterTemp.toFixed(1)}℃` : null,
    ctx.cond.tide ? `潮汐(簡易推定): ${ctx.cond.tide.type} ${ctx.cond.tide.state}${ctx.cond.tide.fractionTenth}分` : null,
  ].filter(Boolean).join('\n');

  const systemPrompt = 'あなたは日本の釣りに詳しいアシスタントです。ユーザーの備考・要望と、実測の気象/潮汐条件を踏まえて、要望に最も合う釣り方を1つ提案してください。出力は必ず次のJSON形式のみで、前後に他の文章やマークダウンのコードブロックを含めないでください。\n{"targetSpecies":"対象魚種","technique":"釣り方の名称","tackle":"仕掛け/ルアー/エサ","depth":"狙うタナ","action":"アクション/釣り方の説明","reason":"この条件でこの提案を選んだ理由"}\n釣果数や匹数を保証する表現は使わないでください。';

  const userPrompt = `【現在の条件】\n${contextText}\n\n【ユーザーの備考・要望】\n${remarks}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `AI呼び出しに失敗しました（HTTP ${res.status}）`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AIの回答を解析できませんでした。');
  }
  return { unavailable: false, ...parsed };
}

function selectTopTechniques(fishType, cond) {
  const list = TECHNIQUES[fishType] || TECHNIQUES.other;
  const scored = list.map((tech) => {
    const { score, reasons } = tech.score(cond);
    return { ...tech, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

// ===================== UI 制御 =====================

const el = (id) => document.getElementById(id);
let map = null, markers = [];
let gmap = null, gMarkers = [];
let mapEngine = null; // 'leaflet' | 'google'
let gmapsLoadPromise = null;

function initSettings() {
  const key = localStorage.getItem('gmapsKey') || '';
  el('gmapsKey').value = key;
  el('gmapsKey').addEventListener('input', (e) => {
    localStorage.setItem('gmapsKey', e.target.value.trim());
  });

  const aKey = localStorage.getItem('anthropicKey') || '';
  el('anthropicKey').value = aKey;
  el('anthropicKey').addEventListener('input', (e) => {
    localStorage.setItem('anthropicKey', e.target.value.trim());
  });
}

function bindUI() {
  el('dateOption').addEventListener('change', (e) => {
    el('customDateWrap').classList.toggle('hidden', e.target.value !== 'custom');
    const isNow = e.target.value === 'now';
    el('timeOfDay').disabled = isNow;
    el('timeOfDay').classList.toggle('opacity-50', isNow);
  });
  el('fishForm').addEventListener('submit', onSubmit);
}

function showLoading(v) { el('loading').classList.toggle('hidden', !v); el('submitBtn').disabled = v; }
function showError(msg) { const box = el('errorBox'); box.textContent = msg; box.classList.remove('hidden'); }
function clearError() { el('errorBox').classList.add('hidden'); el('errorBox').textContent = ''; }

async function onSubmit(e) {
  e.preventDefault();
  clearError();
  el('results').classList.add('hidden');

  const location = el('location').value.trim();
  if (!location) { showError('釣り場所を入力してください。'); return; }

  const params = {
    fishType: el('fishType').value,
    dateOption: el('dateOption').value,
    timeOfDay: el('timeOfDay').value,
    customDate: el('customDate').value,
    remarks: el('remarks').value.trim(),
  };
  if (params.dateOption === 'custom' && !params.customDate) {
    showError('日付を指定してください。'); return;
  }

  showLoading(true);
  try {
    const geo = await geocode(location);
    const targetDate = computeTargetDateTime(params);

    // 入力が「琵琶湖」「淡路島」等の広域名かどうかを判定し、広域なら詳細ポイント3件を選出する
    const curated = matchCuratedArea(location) || matchCuratedArea(geo.label);
    const isBroadArea = !!curated || bboxSizeKm(geo.bbox) > 1.5;

    let mapSpotsBase, areaLabel;
    if (isBroadArea) {
      areaLabel = curated ? curated.areaLabel : geo.label;
      const rawSpots = curated ? curated.spots : generateGenericSpots(geo, geo.bbox);
      mapSpotsBase = rawSpots.map((spot) => ({ ...spot, areaLabel, isSubSpot: true }));
    } else {
      mapSpotsBase = [{ name: geo.label, areaLabel: geo.label, lat: geo.lat, lon: geo.lon, traits: [], isSubSpot: false }];
    }

    // 天気・水温は「広域の中心点」ではなく、実在する詳細ポイント（内陸になりがちな
    // エリア中心とは違い実際の水辺）の1つを代表点として取得する
    const repLat = mapSpotsBase[0].lat, repLon = mapSpotsBase[0].lon;
    const weather = await fetchWeather(repLat, repLon, targetDate.date);
    const needsTide = params.fishType === 'sea' || params.fishType === 'jigging';
    const tide = needsTide ? computeTide(targetDate.date, repLat, repLon) : null;

    // 「低水温期」判定を毎回できるだけ実測データに基づかせる（海は実測水温、
    // 湖・川は直近5日の気温トレンド）。取得できなければカレンダーにフォールバックする。
    const waterTemp = needsTide ? await fetchSeaSurfaceTemp(repLat, repLon, targetDate.date) : null;
    const recentAvgTemp = !needsTide ? await fetchRecentAvgTemp(repLat, repLon) : null;

    const cond = buildConditions(params.fishType, weather, tide, targetDate, waterTemp, recentAvgTemp);

    let resultItems, mapSpots;
    if (isBroadArea) {
      mapSpots = mapSpotsBase;
      resultItems = mapSpots.map((spot) => ({
        spot,
        technique: pickBestTechniqueForSpot(params.fishType, cond, spot),
      }));
    } else {
      const techniques = selectTopTechniques(params.fishType, cond);
      mapSpots = mapSpotsBase;
      resultItems = techniques.map((technique) => ({ spot: mapSpotsBase[0], technique }));
    }

    el('results').classList.remove('hidden');
    renderMap(mapSpots);
    renderConditionStrip(cond, weather, targetDate.date);
    renderExpectationNote(cond);
    renderTideNote(cond.tide);
    renderResultCards(resultItems, {
      castAdvice: castDirectionAdvice(cond),
      colorAdvice: lureColorAdvice(cond),
      speciesHint: targetSpeciesHint(params.fishType, cond),
    });

    // 備考欄への回答はメインの診断ロジックとは独立した補助機能。
    // 失敗してもメインの診断結果（上記3枚のカード）には影響させない。
    if (params.remarks) {
      const fishTypeLabels = { sea: '海釣り', bass: 'ブラックバス', trout: '渓流・トラウト', jigging: 'ショアジギング', other: 'その他' };
      try {
        const aiResult = await fetchAiSuggestion(params.remarks, {
          fishTypeLabel: fishTypeLabels[params.fishType] || params.fishType,
          placeLabel: mapSpots[0].name,
          dateLabel: toDateStr(targetDate.date),
          timeOfDayLabel: TIME_OF_DAY_LABEL[targetDate.timeOfDay] || targetDate.timeOfDay,
          cond,
        });
        renderAiSuggestion(params.remarks, aiResult);
      } catch (aiErr) {
        renderAiSuggestion(params.remarks, { error: aiErr.message });
      }
    } else {
      el('aiSuggestion').classList.add('hidden');
    }
  } catch (err) {
    showError(err.message || '診断中にエラーが発生しました。');
  } finally {
    showLoading(false);
  }
}

function renderMap(spots) {
  const key = localStorage.getItem('gmapsKey');
  const wantEngine = key ? 'google' : 'leaflet';
  const container = el('map');

  if (mapEngine && mapEngine !== wantEngine) {
    container.innerHTML = '';
    map = null; gmap = null; markers = []; gMarkers = [];
  }
  mapEngine = wantEngine;

  if (wantEngine === 'google') {
    loadGoogleMaps(key).then(() => {
      if (!gmap) gmap = new google.maps.Map(container, { center: { lat: spots[0].lat, lng: spots[0].lon }, zoom: 13 });
      gMarkers.forEach((m) => m.setMap(null));
      gMarkers = spots.map((s, i) => new google.maps.Marker({
        position: { lat: s.lat, lng: s.lon },
        map: gmap,
        label: spots.length > 1 ? String(i + 1) : undefined,
        title: s.name,
      }));
      if (spots.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        spots.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lon }));
        gmap.fitBounds(bounds, 40);
      } else {
        gmap.setCenter({ lat: spots[0].lat, lng: spots[0].lon });
        gmap.setZoom(13);
      }
    }).catch(() => {
      mapEngine = 'leaflet';
      container.innerHTML = '';
      renderLeafletMap(spots, container);
    });
  } else {
    renderLeafletMap(spots, container);
  }
}

function renderLeafletMap(spots, container) {
  if (!map) {
    map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);
  }
  map.invalidateSize();
  markers.forEach((m) => m.remove());
  const marks = ['①', '②', '③'];
  markers = spots.map((s, i) => L.marker([s.lat, s.lon]).addTo(map).bindPopup(`${spots.length > 1 ? marks[i] + ' ' : ''}${escapeHtml(s.name)}`));
  if (spots.length > 1) {
    map.fitBounds(L.latLngBounds(spots.map((s) => [s.lat, s.lon])), { padding: [30, 30] });
  } else {
    map.setView([spots[0].lat, spots[0].lon], 13);
  }
  if (markers[0]) markers[0].openPopup();
  setTimeout(() => map && map.invalidateSize(), 200);
}

function loadGoogleMaps(key) {
  if (window.google && window.google.maps) return Promise.resolve();
  if (gmapsLoadPromise) return gmapsLoadPromise;
  gmapsLoadPromise = new Promise((resolve, reject) => {
    window.__gmapsInitCb = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__gmapsInitCb`;
    script.onerror = () => reject(new Error('Google Mapsの読み込みに失敗しました'));
    document.head.appendChild(script);
  });
  return gmapsLoadPromise;
}

function renderConditionStrip(cond, weather, date) {
  const items = [
    { label: '天気', value: `${cond.weatherIcon} ${cond.weatherLabel}` },
    { label: '気温', value: `${cond.temp.toFixed(1)}℃` },
    { label: '風', value: `${cond.windDirLabel} ${cond.windSpeed.toFixed(1)}m/s` },
    { label: '気圧', value: `${Math.round(cond.pressure)}hPa` },
  ];
  if (cond.waterTemp != null) {
    items.push({ label: '海面水温(実測)', value: `${cond.waterTemp.toFixed(1)}℃` });
  }
  el('conditionStrip').innerHTML = items.map((it) => `
    <div class="bg-white rounded-xl border border-slate-200 py-2.5 px-1">
      <div class="text-[11px] text-slate-400">${it.label}</div>
      <div class="text-sm font-bold text-slate-700">${it.value}</div>
    </div>
  `).join('');
  if (weather.approximated) {
    el('errorBox').classList.remove('hidden');
    el('errorBox').className = 'mt-4 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3';
    el('errorBox').textContent = '指定日が予報範囲（約16日先）を超えているため、直近の予報データで近似しています。';
  }
}

function renderTideNote(tide) {
  const box = el('tideNote');
  if (!tide) { box.classList.add('hidden'); return; }
  const fmt = (d) => d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '-';
  box.innerHTML = `🌊 <b>潮汐（簡易推定）</b>: ${tide.type} / ${tide.state}${tide.fractionTenth}分　次の高潮 ${fmt(tide.nextHigh)}　次の低潮 ${fmt(tide.nextLow)}<br>※月齢に基づく簡易モデルのため、実際の潮汐表と異なる場合があります。`;
  box.classList.remove('hidden');
}

function renderExpectationNote(cond) {
  const box = el('expectationNote');
  const score = overallConditionScore(cond);
  const tier = scoreToExpectationTier(score);
  box.innerHTML = `🎯 <b>本日の期待度：${tier.icon} ${tier.label}</b>（${tier.desc}）<br>※釣果数の予測ではなく、風・天候・水温・潮汐等から算出した条件の良さの目安です（条件スコア${score}/100）。`;
  box.classList.remove('hidden');
}

function renderResultCards(items, advice) {
  const medals = ['🥇', '🥈', '🥉'];
  el('techniqueCards').innerHTML = items.map((item, i) => {
    const { spot, technique } = item;
    const headerLine = spot.isSubSpot
      ? `<div class="text-xs font-semibold text-cyan-700 mb-1">🗺️ ${escapeHtml(spot.areaLabel)} ／ 【${escapeHtml(spot.name)}】</div>`
      : `<div class="text-xs font-semibold text-cyan-700 mb-1">📍 ${escapeHtml(spot.name)}</div>`;
    const traitsHtml = spot.traits && spot.traits.length
      ? `<div class="mt-1 text-xs text-slate-500">特性: ${spot.traits.map(escapeHtml).join(' / ')}</div>`
      : '';
    return `
    <div class="card-pop bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-start gap-3">
        <div class="text-2xl">${medals[i] || '🎯'}</div>
        <div class="flex-1">
          ${headerLine}
          <h3 class="font-bold text-slate-800">${technique.name}</h3>
          ${traitsHtml}
          <div class="mt-1 text-xs text-slate-500">参考: ${advice.speciesHint}</div>
          <dl class="mt-2 text-sm text-slate-600 space-y-1">
            <div><dt class="inline font-semibold text-slate-500">仕掛け/ルアー/エサ：</dt><dd class="inline">${technique.tackle}</dd></div>
            <div><dt class="inline font-semibold text-slate-500">狙うタナ：</dt><dd class="inline">${technique.depth}</dd></div>
            <div><dt class="inline font-semibold text-slate-500">キャスト距離の目安：</dt><dd class="inline">${technique.castDistance || '状況に応じて調整'}</dd></div>
            <div><dt class="inline font-semibold text-slate-500">アクション：</dt><dd class="inline">${technique.action}</dd></div>
          </dl>
          <div class="mt-2 bg-sky-50 border border-sky-100 rounded-lg p-2 text-xs text-sky-800 space-y-0.5">
            <div>🧭 <b>キャスト方向：</b>${advice.castAdvice}</div>
            <div>🎨 <b>ルアーカラーの目安：</b>${advice.colorAdvice}</div>
          </div>
          <div class="mt-2 bg-teal-50 border border-teal-100 rounded-lg p-2 text-xs text-teal-800">
            <b>選出理由：</b>${technique.reasons.length ? technique.reasons.join('。') + '。' : '総合的に条件に適した選択です。'}
          </div>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderAiSuggestion(remarks, result) {
  const box = el('aiSuggestion');
  box.classList.remove('hidden');

  if (result.unavailable) {
    box.innerHTML = `
      <div class="bg-slate-50 border border-slate-200 text-slate-500 text-xs rounded-xl p-3">
        💬 備考「${escapeHtml(remarks)}」への回答にはAnthropic APIキーの設定が必要です（詳細設定）。
      </div>`;
    return;
  }
  if (result.error) {
    box.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
        💬 備考への回答中にエラーが発生しました: ${escapeHtml(result.error)}
      </div>`;
    return;
  }

  box.innerHTML = `
    <div class="card-pop bg-violet-50 border-2 border-violet-200 rounded-2xl shadow-sm p-4">
      <div class="text-xs font-semibold text-violet-700 mb-1">💬 備考「${escapeHtml(remarks)}」へのAI回答</div>
      <h3 class="font-bold text-slate-800">${escapeHtml(result.targetSpecies || '')} ${escapeHtml(result.technique || '')}</h3>
      <dl class="mt-2 text-sm text-slate-600 space-y-1">
        <div><dt class="inline font-semibold text-slate-500">仕掛け/ルアー/エサ：</dt><dd class="inline">${escapeHtml(result.tackle || '-')}</dd></div>
        <div><dt class="inline font-semibold text-slate-500">狙うタナ：</dt><dd class="inline">${escapeHtml(result.depth || '-')}</dd></div>
        <div><dt class="inline font-semibold text-slate-500">アクション：</dt><dd class="inline">${escapeHtml(result.action || '-')}</dd></div>
      </dl>
      <div class="mt-2 bg-violet-100 border border-violet-200 rounded-lg p-2 text-xs text-violet-800">
        <b>提案理由：</b>${escapeHtml(result.reason || '')}
      </div>
      <p class="mt-2 text-[11px] text-slate-400">※これはAI(Claude)が備考内容と現在の条件から生成した提案であり、上記のルールベース診断とは別の補助情報です。釣果を保証するものではありません。</p>
    </div>`;
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

initSettings();
bindUI();
registerServiceWorker();
