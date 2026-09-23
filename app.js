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
      score(c) {
        let s = 36; const r = [];
        if (c.isRain) { s += 15; r.push('降雨後の濁りはラバージグのシルエットが効きやすい'); }
        if ([11, 12, 1, 2, 3].includes(c.month)) { s += 12; r.push('低水温期はカバー撃ちでスローに口を使わせやすい'); }
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
      score(c) {
        let s = 40; const r = [];
        if (c.isSunny) { s += 15; r.push('晴天クリアウォーターではボトム寄りのレンジが安定'); }
        if (c.timeOfDay === 'noon') { s += 10; }
        if ([11, 12, 1, 2, 3].includes(c.month)) { s += 10; r.push('低水温期は魚がボトム付近に着きやすい'); }
        return { score: s, reasons: r };
      },
    },
    {
      name: 'ドライフライ',
      tackle: '#14〜#18 パラシュートフライ',
      depth: '水面',
      action: 'ナチュラルドリフトで流し、ライズに合わせてアワセを入れる。',
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
      score(c) {
        let s = 36; const r = [];
        if (c.windSpeed < 5) { s += 15; r.push('風・流れが緩い時はスローなフォールが決めやすい'); }
        if (c.tide && c.tide.fractionTenth >= 4 && c.tide.fractionTenth <= 6) { s += 10; r.push('潮の流れが緩やかでジグを支配しやすい'); }
        if ([11, 12, 1, 2].includes(c.month)) { s += 10; r.push('低水温期は低活性魚に強いスロー系が有利'); }
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
      score(c) {
        let s = 32; const r = ['条件が読みにくい時のレンジ探索の保険'];
        if (c.timeOfDay === 'noon') { s += 5; }
        return { score: s, reasons: r };
      },
    },
  ],
};

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
  return { lat: parseFloat(best.lat), lon: parseFloat(best.lon), label };
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

function buildConditions(fishType, weather, tide, targetDate) {
  const wInfo = weatherInfo(weather.weathercode);
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
    month: targetDate.date.getMonth() + 1,
    tide: tide || null,
  };
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
let map = null, marker = null;
let gmap = null, gmarker = null;
let mapEngine = null; // 'leaflet' | 'google'
let gmapsLoadPromise = null;

function initSettings() {
  const key = localStorage.getItem('gmapsKey') || '';
  el('gmapsKey').value = key;
  el('gmapsKey').addEventListener('input', (e) => {
    localStorage.setItem('gmapsKey', e.target.value.trim());
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
  };
  if (params.dateOption === 'custom' && !params.customDate) {
    showError('日付を指定してください。'); return;
  }

  showLoading(true);
  try {
    const geo = await geocode(location);
    const targetDate = computeTargetDateTime(params);
    const weather = await fetchWeather(geo.lat, geo.lon, targetDate.date);
    const needsTide = params.fishType === 'sea' || params.fishType === 'jigging';
    const tide = needsTide ? computeTide(targetDate.date, geo.lat, geo.lon) : null;
    const cond = buildConditions(params.fishType, weather, tide, targetDate);
    const picks = selectTopTechniques(params.fishType, cond);

    renderMap(geo);
    renderConditionStrip(cond, weather, targetDate.date);
    renderTideNote(cond.tide);
    renderTechniqueCards(picks);

    el('results').classList.remove('hidden');
  } catch (err) {
    showError(err.message || '診断中にエラーが発生しました。');
  } finally {
    showLoading(false);
  }
}

function renderMap(geo) {
  const key = localStorage.getItem('gmapsKey');
  const wantEngine = key ? 'google' : 'leaflet';
  const container = el('map');

  if (mapEngine && mapEngine !== wantEngine) {
    container.innerHTML = '';
    map = null; gmap = null; marker = null; gmarker = null;
  }
  mapEngine = wantEngine;

  if (wantEngine === 'google') {
    loadGoogleMaps(key).then(() => {
      if (!gmap) gmap = new google.maps.Map(container, { center: { lat: geo.lat, lng: geo.lon }, zoom: 13 });
      else gmap.setCenter({ lat: geo.lat, lng: geo.lon });
      if (gmarker) gmarker.setMap(null);
      gmarker = new google.maps.Marker({ position: { lat: geo.lat, lng: geo.lon }, map: gmap, title: geo.label });
    }).catch(() => {
      mapEngine = 'leaflet';
      container.innerHTML = '';
      renderLeafletMap(geo, container);
    });
  } else {
    renderLeafletMap(geo, container);
  }
}

function renderLeafletMap(geo, container) {
  if (!map) {
    map = L.map(container, { scrollWheelZoom: false }).setView([geo.lat, geo.lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);
  } else {
    map.setView([geo.lat, geo.lon], 13);
  }
  if (marker) marker.remove();
  marker = L.marker([geo.lat, geo.lon]).addTo(map).bindPopup(geo.label).openPopup();
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

function renderTechniqueCards(picks) {
  const medals = ['🥇', '🥈', '🥉'];
  el('techniqueCards').innerHTML = picks.map((p, i) => `
    <div class="card-pop bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div class="flex items-start gap-3">
        <div class="text-2xl">${medals[i] || '🎯'}</div>
        <div class="flex-1">
          <h3 class="font-bold text-slate-800">${p.name}</h3>
          <dl class="mt-2 text-sm text-slate-600 space-y-1">
            <div><dt class="inline font-semibold text-slate-500">仕掛け/ルアー/エサ：</dt><dd class="inline">${p.tackle}</dd></div>
            <div><dt class="inline font-semibold text-slate-500">狙うタナ：</dt><dd class="inline">${p.depth}</dd></div>
            <div><dt class="inline font-semibold text-slate-500">アクション：</dt><dd class="inline">${p.action}</dd></div>
          </dl>
          <div class="mt-2 bg-teal-50 border border-teal-100 rounded-lg p-2 text-xs text-teal-800">
            <b>選出理由：</b>${p.reasons.length ? p.reasons.join('。') + '。' : '総合的に条件に適した選択です。'}
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

initSettings();
bindUI();
registerServiceWorker();
