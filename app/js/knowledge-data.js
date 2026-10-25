// 事前編集した知識データ（個人の記録は含まない）。
// 素材: 「スペシャルティコーヒー探求のための『引ける事典』」PDF（内容の確認時点 2026-10-24）。
// PDFの表を産地・品種・精製の記事に再構成し、PDF内の個人向け提案・価格・相場・在庫は収録しない。
// info の種類: fact=事実 / tendency=一般傾向 / suggestion=提案。
// confidence: 'pdf' = PDFの記述 / 'editorial' = 編集メモ（一次資料での確認は未実施）。

export const KNOWLEDGE_VERSION = '2026.10.25';

export const SOURCES = {
  pdf: { title: '「スペシャルティコーヒー探求のための引ける事典」（編集素材PDF。確認時点 2026-10-24）', url: null },
  editorial: { title: '編集メモ（一般的な知識。一次資料での確認は未実施。要確認）', url: null },
  'wcr-var': { title: 'World Coffee Research, Arabica Coffee Varieties Catalog', url: 'https://varieties.worldcoffeeresearch.org/' },
  'wcr-lex': { title: 'World Coffee Research, Sensory Lexicon', url: 'https://worldcoffeeresearch.org/resources/sensory-lexicon' },
  'sca-cva': { title: 'SCA, Coffee Value Assessment', url: 'https://sca.coffee/value-assessment' },
  'sca-ferm': { title: 'SCA, The Fermentation Effect (25 Magazine Issue 10)', url: 'https://sca.coffee/sca-news/25-magazine/issue-10/english/the-fermentation-effect-25-magazine-issue-10-bw558' },
  'sca-identity': { title: 'SCA, Understanding Shifting Coffee Identity Standards', url: 'https://sca.coffee/sca-news/read/understanding-shifting-coffee-identity-standards-gttde' },
  'springer-cm': { title: 'Genetic diversity of the fungal community … after carbonic maceration and fermentation (3 Biotech, 2024)', url: 'https://link.springer.com/content/pdf/10.1007/s13205-024-04099-z.pdf' },
  'sca-knutsen': { title: 'SCA, Celebrating Erna Knutsen’s Specialty Coffee (25 Magazine Issue 6)', url: 'https://sca.coffee/sca-news/25-magazine/issue-6/english/celebrating-erna-knutsens-specialty-coffee-pcft5' },
  'coe-history': { title: 'Alliance for Coffee Excellence, Cup of Excellence History', url: 'https://allianceforcoffeeexcellence.org/cup-of-excellence-history/' },
  'sca-wbc': { title: 'SCA, Calling the Shots: 20 Years of WBC', url: 'https://sca.coffee/sca-news/25-magazine/issue-9/english/calling-the-shots-20-years-of-the-world-barista-championship-25-magazine-issue-9-wkzbr' },
  'sca-defn': { title: 'SCA, Towards A Definition of Specialty Coffee', url: 'https://sca.coffee/research-tabs/towards-a-definition-of-specialty-coffee-building-an-understanding-based-on-attributes' },
  'ajca-history': { title: '全日本コーヒー協会, 歴史', url: 'https://coffee.ajca.or.jp/column/4464/' },
  'scaj-overview': { title: 'SCAJ, 概要', url: 'https://scaj.org/about/overview' },
  'scaj-wbc2014': { title: 'SCAJ, 井崎バリスタが WBC2014 にて優勝', url: 'https://scaj.org/archives/7545' },
  'ci-sumatra': { title: 'Cafe Imports, Sumatra', url: 'https://www.cafeimports.com/north-america/sumatra' },
  'ci-bali': { title: 'Cafe Imports, Bali', url: 'https://www.cafeimports.com/australia/bali' },
  'ci-sulawesi': { title: 'Cafe Imports, Sulawesi', url: 'https://www.cafeimports.com/australia/sulawesi.php' },
  'ci-flores': { title: 'Cafe Imports, Flores', url: 'https://www.cafeimports.com/australia/flores' },
  'ci-png': { title: 'Cafe Imports, Papua New Guinea', url: 'https://www.cafeimports.com/north-america/papua-new-guinea' },
  'ci-india': { title: 'Cafe Imports, India', url: 'https://www.cafeimports.com/north-america/india' },
  'ci-ethiopia': { title: 'Cafe Imports, Ethiopia', url: 'https://www.cafeimports.com/australia/ethiopia' },
  'ci-kenya': { title: 'Cafe Imports, Kenya', url: 'https://www.cafeimports.com/australia/kenya' },
  'ci-rwanda': { title: 'Cafe Imports, Rwanda', url: 'https://www.cafeimports.com/europe/Rwanda' },
  'ci-burundi': { title: 'Cafe Imports, Burundi', url: 'https://www.cafeimports.com/europe/burundi' },
  'ci-colombia': { title: 'Cafe Imports, Colombia', url: 'https://www.cafeimports.com/europe/colombia' },
  'ci-brazil': { title: 'Cafe Imports, Brazil', url: 'https://www.cafeimports.com/australia/brazil' },
  'ci-panama': { title: 'Cafe Imports, Panama', url: 'https://www.cafeimports.com/europe/panama' },
  'ci-costarica': { title: 'Cafe Imports, Costa Rica', url: 'https://www.cafeimports.com/north-america/costa-rica' },
  'ci-guatemala': { title: 'Cafe Imports, Guatemala', url: 'https://www.cafeimports.com/north-america/guatemala/' },
  'ci-peru': { title: 'Cafe Imports, Peru', url: 'https://www.cafeimports.com/north-america/peru.php' },
  'th-moac': { title: 'タイ農業協同組合省 チェンライ県, ドイチャンGI資料', url: 'https://www.opsmoac.go.th/chiangrai-news-preview-462791791602' },
  'th-doichaang': { title: 'Doi Chaang Coffee, The Land', url: 'https://doichaangcoffee.co.th/en/about-us/the-land/' },
  'mm-origin': { title: 'Myanmar Coffee Association, Origin', url: 'https://www.coffee.org.mm/index.php/en/origin' },
  'cn-yunnan': { title: 'Characterization of sensory properties of Yunnan coffee (PMC)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9386398/' },
};

const T = 'tendency', F = 'fact', S = 'suggestion';
const P = 'pdf', E = 'editorial';

// ───────────── 産地 ─────────────
// regions: PDFの産地表（一般傾向）。roast は「編集上の目安」で優劣ではない。
const R = (name, varieties, process, altitude, flavor, roast) => ({ name, varieties, process, altitude, flavor, roast });

export const COUNTRIES = [
  {
    id: 'thailand', name: 'タイ', en: 'Thailand', aliases: ['タイ', 'thailand', 'thai', 'タイ王国'],
    summary: '北部の山岳地帯（チェンライ・ドイチャンなど）で知られる。カカオやナッツ、柑橘の印象に、近年は明るい果実味のロットも。',
    regions: [R('チェンライ・ドイチャン、ワウィー', 'Catimor、Catuai、Caturra、Typica、Bourbon', 'Washed、Natural、Honey、近年 Anaerobic', '1,000–1,700m', 'カカオ、ナッツ、柑橘、ストーンフルーツ、茶、スパイス。高品質ロットは明るい果実味も', '浅○／中深◎')],
    history: { body: 'タイ政府のチェンライ県資料では、ドイチャンGIの主要アラビカにカトゥーラ、カティモール、カトゥアイが挙げられ、標高は約1,000〜1,700m。Doi Chaang自身も同じ標高帯を示している。現在はウォッシュドだけでなくナチュラル、ハニー、発酵系のロットも見られる。', type: F, confidence: P },
    culture: { body: '北部の山岳地帯では、かつての換金作物に代わる作物としてコーヒー栽培が広められた経緯が知られる（王室系プロジェクトなど）。詳細な年代・経緯は未確認。', type: F, confidence: E },
    hint: 'タイを基準に「焙煎度だけ」「精製だけ」を動かして比べると、産地の味と焙煎の味の境目が見えやすい。',
    sources: ['pdf', 'th-moac', 'th-doichaang', 'editorial'],
    related: [['variety', 'catuai'], ['variety', 'catimor'], ['process', 'washed'], ['country', 'indonesia']],
  },
  {
    id: 'indonesia', name: 'インドネシア', en: 'Indonesia', aliases: ['インドネシア', 'indonesia', 'sumatra', 'スマトラ', 'java', 'ジャワ', 'sulawesi', 'スラウェシ', 'bali', 'バリ', 'flores', 'フローレス'],
    summary: 'スマトラ・ジャワ・バリ・スラウェシ・フローレスなど島ごとに個性が分かれる。スマトラ式（Wet-hulled）の重いボディとハーブ、スパイスが代表的。',
    regions: [
      R('スマトラ・アチェ／ガヨ、リントン', 'Bourbon、Catimor、Caturra、Tim Tim', 'Wet-hulled（スマトラ式）中心、Washed、Natural', '約1,100–1,600m', 'ハーブ、土、杉、スパイス、カカオ、重いボディ。クリーンなWashedは果実味が増す', '浅○／中深◎'),
      R('ジャワ', 'Typica系、S795、Catimorほか', 'Washed中心、Natural、Experimental', '約900–1,800m', 'チョコ、スパイス、柑橘、穏やかな果実、クリーンな甘さ', '両方◎'),
      R('バリ・キンタマーニ', 'Typica系、Catimor等', 'Washed、Natural、Anaerobic/CM', '約1,000–1,600m', '柑橘、トロピカルフルーツ、糖蜜、スパイス', '浅◎／中深○'),
      R('スラウェシ・トラジャ', 'Typica系、S795ほか', 'Wet-hulledに加えWashed', '約1,100–1,800m', 'スマトラより酸が明瞭なロットもあり、柑橘、果実、クリーミーな質感、スパイス', '両方◎'),
      R('フローレス・マンガライ', 'Kartika、Yellow Bourbon、Juria等', 'Wet-hulled、Washed、Natural', '一般に1,000–1,300m、高品質域は1,400m超も', 'カカオ、ナッツ、スパイス、熟した果実、丸い甘さ', '浅○／中深◎'),
    ],
    history: { body: '島ごとに品種・精製・気候が異なるため、「インドネシアの味」と一括りにせず島や地域で見るのが分かりやすい。', type: T, confidence: P },
    culture: { body: 'ジャワ島では植民地時代のオランダの下で栽培が広まった歴史があり、「Java」がコーヒーの別名として定着した。詳細な年代は未確認。', type: F, confidence: E },
    hint: '「アジア＝アーシーで重い」とは限らない。スラウェシのWashedやバリは、同じインドネシアでもクリーンな方向。',
    sources: ['pdf', 'ci-sumatra', 'ci-bali', 'ci-sulawesi', 'ci-flores', 'editorial'],
    related: [['process', 'wet-hulled'], ['country', 'thailand'], ['country', 'png']],
  },
  {
    id: 'png', name: 'パプアニューギニア', en: 'Papua New Guinea', aliases: ['パプアニューギニア', 'png', 'papua new guinea', 'papuanewguinea', 'パプア'],
    summary: '高地（Highlands）が中心。柑橘や紅茶、ブラウンシュガーのような透明感のある方向。',
    regions: [R('Eastern・Western Highlands、Chimbu', 'Arusha、Blue Mountain、Typica', 'Washed', '約1,200–2,000m', '柑橘、リンゴ、紅茶、トロピカルフルーツ、ブラウンシュガー', '浅◎／中深○')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    hint: 'Washedどうしで国を変える比較（タイ／PNG／ケニア）に向く。',
    sources: ['pdf', 'ci-png'], related: [['process', 'washed'], ['country', 'indonesia']],
  },
  {
    id: 'india', name: 'インド', en: 'India', aliases: ['インド', 'india'],
    summary: 'カルナータカ、タミル・ナードゥ、ケララなど南部。チョコ、スパイス、ナッツの印象が中心で、近年は果実・発酵系のマイクロロットも。',
    regions: [R('カルナータカ、タミル・ナードゥ、ケララ', 'Kent、S795系、Catuai、Cauvery、Typica', 'Washed、Natural、Monsooned', '約900–1,600m', 'チョコ、土、スパイス、ナッツ。近年のマイクロロットでは果実・発酵系も', '浅○／中深◎')],
    history: { body: '南インドにコーヒーを伝えたという伝承（聖者が種を持ち込んだ話）が知られるが、伝承であり史実としては未確認。', type: F, confidence: E },
    hint: 'カカオ・スパイス系を、東南アジアとの違いとして味わうのに向く。',
    sources: ['pdf', 'ci-india', 'editorial'], related: [['process', 'washed'], ['country', 'thailand']],
  },
  {
    id: 'myanmar', name: 'ミャンマー', en: 'Myanmar', aliases: ['ミャンマー', 'myanmar', 'burma', 'ビルマ'],
    summary: 'シャン州が中心。柑橘や茶、キャラメル、ナッツ。',
    regions: [R('シャン州・Ywangan、Hopong', 'Catuai、Caturra、SL28、Catimor等', 'Washed、Honey、Natural', '約1,100–1,600m', '柑橘、茶、キャラメル、ナッツ、スパイス、チョコ', '浅◎／中深○')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf', 'mm-origin'], related: [['process', 'washed']],
  },
  {
    id: 'china', name: '中国（雲南）', en: 'China (Yunnan)', aliases: ['中国', 'china', '雲南', 'yunnan'],
    summary: '雲南の普洱・保山・徳宏が中心。Catimor 7963が非常に重要で、標高と精製で味の幅が大きい。',
    regions: [R('雲南・普洱、保山、徳宏', 'Catimor 7963が非常に重要', 'Washed中心、Natural・発酵系も増加', '約900–1,800m', 'カカオ、ナッツ、柑橘、茶、熟した果実。標高と精製で幅大', '両方○〜◎')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf', 'cn-yunnan'], related: [['variety', 'catimor']],
  },
  {
    id: 'ethiopia', name: 'エチオピア', en: 'Ethiopia', aliases: ['エチオピア', 'ethiopia'],
    summary: '遺伝的多様性が非常に高く、「在来種」の一語では片づけられない。WashedとNaturalで印象が大きく変わる。',
    regions: [
      R('Gedeo・Yirgacheffe', 'Ethiopian landraces、JARC selections', 'Washed、Natural', '約1,700–2,200m', 'ジャスミン、ベルガモット、レモン、桃、杏、紅茶', '浅◎'),
      R('Sidama・Guji', 'Landraces、JARC selections', 'Washed、Natural、Honey、Anaerobic', '約1,700–2,300m', 'フローラル、ベリー、トロピカルフルーツ、柑橘、発酵由来の果実味', '浅◎'),
    ],
    history: { body: 'Cafe Importsが示すYirgacheffeの例でも、Adadoはストーンフルーツ＋柑橘＋花、Arichaはトロピカル＋花、Kongaは桃・杏＋柑橘など、同じ地域内でかなり振れる。', type: T, confidence: P },
    culture: { body: 'コーヒーの原産地とされ、山羊飼いが実を食べた山羊の様子から発見したという有名な逸話があるが、伝説の域を出ない。家庭で豆を煎って淹れるコーヒーセレモニーの文化も知られる。', type: F, confidence: E },
    hint: '同じ地域でWashedとNaturalを比べると、精製による差が読み取りやすい。',
    sources: ['pdf', 'ci-ethiopia', 'editorial'],
    related: [['variety', 'ethiopian-landraces'], ['process', 'washed'], ['process', 'natural'], ['variety', 'gesha']],
  },
  {
    id: 'kenya', name: 'ケニア', en: 'Kenya', aliases: ['ケニア', 'kenya'],
    summary: 'SL28・SL34などの系統とWashed。カシスや赤果実、グレープフルーツのような、酸の輪郭がはっきりした方向。',
    regions: [R('Nyeri、Kirinyaga、Embu', 'SL28、SL34、Batian、Ruiru 11', 'Washed、発酵後Soakを伴う方式', '約1,400–2,000m', 'カシス、赤果実、グレープフルーツ、トマト様、糖蜜、強い酸質', '浅◎／中深○')],
    history: { body: 'SL28・SL34は、ケニアでScott Agricultural Laboratoriesが選抜した系統。ケニアの伝統的スペシャルティに重要とされる。', type: F, confidence: P },
    culture: { body: '生産者の豆が入札（オークション）で取引される仕組みが知られる。現在の運用の詳細は未確認。', type: F, confidence: E },
    hint: 'エチオピアの花・茶・柑橘とは異なり、SL系は酸の輪郭そのものが主役になることがある。',
    sources: ['pdf', 'ci-kenya', 'editorial'], related: [['variety', 'sl28-sl34'], ['variety', 'batian'], ['process', 'kenya-style']],
  },
  {
    id: 'rwanda', name: 'ルワンダ', en: 'Rwanda', aliases: ['ルワンダ', 'rwanda'],
    summary: 'Bourbon系が中心。赤い果実、柑橘、キャラメル、紅茶。',
    regions: [R('西部 Lake Kivu、南部 Huye等', 'Bourbon系中心、Caturra、Catuai', 'Washed、Natural、Honey、Anaerobic', '約1,200–2,200m', '赤い果実、柑橘、キャラメル、紅茶、スパイス', '浅◎／中深○')],
    history: { body: '1994年の悲劇的な内戦・虐殺ののち、小規模農家の収入源としてコーヒー産業が再建され、スペシャルティの産地として知られるようになった、と語られることが多い。詳細は未確認。', type: F, confidence: E },
    sources: ['pdf', 'ci-rwanda', 'editorial'], related: [['variety', 'bourbon'], ['country', 'burundi']],
  },
  {
    id: 'burundi', name: 'ブルンジ', en: 'Burundi', aliases: ['ブルンジ', 'burundi'],
    summary: 'Bourbon系。柑橘、赤果実、イチジク、花、砂糖様の甘さ。',
    regions: [R('Kayanza、Ngozi', 'Bourbon系', 'Washed、Natural', '約1,500–2,000m', '柑橘、赤果実、イチジク、花、砂糖様の甘さ', '浅◎／中')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf', 'ci-burundi'], related: [['variety', 'bourbon'], ['country', 'rwanda']],
  },
  {
    id: 'tanzania', name: 'タンザニア', en: 'Tanzania', aliases: ['タンザニア', 'tanzania'],
    summary: 'キリマンジャロやムベヤ。柑橘、黒果実、カカオ、茶。',
    regions: [R('Kilimanjaro、Mbeya', 'Bourbon、Kent、Typica系ほか', 'Washed、Natural', '約1,200–2,000m', '柑橘、黒果実、カカオ、茶、スパイス', '浅◎／中深○')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'bourbon']],
  },
  {
    id: 'drc', name: 'コンゴ民主共和国', en: 'DR Congo', aliases: ['コンゴ', 'コンゴ民主共和国', 'drc', 'congo'],
    summary: 'Kivu地域。Bourbon系で、赤果実、柑橘、茶、チョコ。',
    regions: [R('Kivu', 'Bourbon系', 'Washed中心、Natural', '約1,400–2,000m', '赤果実、柑橘、茶、チョコ、スパイス', '浅◎／中深○')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'bourbon']],
  },
  {
    id: 'colombia', name: 'コロンビア', en: 'Colombia', aliases: ['コロンビア', 'colombia'],
    summary: '幅広い産地と精製。Huilaは極めて幅広く、Cauca・Nariñoは高い酸の質。',
    regions: [
      R('Huila', 'Caturra、Castillo、Colombia、Pink Bourbon等', 'Washed、Natural、Honey、発酵系', '約1,500–2,100m', '赤果実、柑橘、パネラ、花、チョコ。極めて幅広い', '両方◎'),
      R('Cauca、Nariño', 'Caturra、Castillo、Typica等', 'Washed中心、実験精製も', '約1,700–2,300m', '高い酸の質、花、柑橘、ストーンフルーツ、糖蜜', '浅◎／中深○'),
    ],
    history: { body: '小規模な家族経営の農家が多い産地として知られ、全国組織（コロンビアコーヒー生産者連合会）が品質や普及を支えてきたとされる。詳細は未確認。', type: F, confidence: E },
    sources: ['pdf', 'ci-colombia', 'editorial'], related: [['variety', 'caturra'], ['variety', 'pink-bourbon'], ['process', 'anaerobic']],
  },
  {
    id: 'brazil', name: 'ブラジル', en: 'Brazil', aliases: ['ブラジル', 'brazil', 'brasil'],
    summary: 'ナッツ、チョコ、キャラメルと丸い甘さ。Natural・Pulped Naturalが主流。',
    regions: [R('Sul de Minas、Cerrado Mineiro', 'Yellow/Red Bourbon、Catuai、Mundo Novo等', 'Natural、Pulped Natural、Washed少数', '約800–1,400m', 'ナッツ、チョコ、キャラメル、ドライフルーツ、丸い甘さ', '浅○／中深◎')],
    history: { body: '世界最大の生産国として知られ、コーヒー産業が国の歴史に深く関わってきた。年代・規模の詳細は未確認。', type: F, confidence: E },
    sources: ['pdf', 'ci-brazil', 'editorial'], related: [['variety', 'mundo-novo'], ['variety', 'catuai'], ['process', 'natural'], ['process', 'honey']],
  },
  {
    id: 'panama', name: 'パナマ', en: 'Panama', aliases: ['パナマ', 'panama'],
    summary: 'Boquete、Volcán。Geshaで知られ、ジャスミン、ベルガモット、茶、柑橘。',
    regions: [R('Boquete、Volcán', 'Gesha、Catuai、Caturra、Typica、Laurina等', 'Washed、Natural、Honey、精密発酵', '約1,000–1,650m', 'Geshaはジャスミン、ベルガモット、茶、柑橘、トロピカル', '浅◎')],
    history: { body: '2004年、Hacienda La EsmeraldaのPanama GeshaがBest of Panamaで大きな注目を集め、「品種」が高評価を生む象徴的な時代が始まった。', type: F, confidence: P },
    sources: ['pdf', 'ci-panama'], related: [['variety', 'gesha'], ['variety', 'laurina']],
  },
  {
    id: 'costa-rica', name: 'コスタリカ', en: 'Costa Rica', aliases: ['コスタリカ', 'costarica', 'costa rica'],
    summary: 'Tarrazú、West Valley。オレンジ、リンゴ、蜂蜜、キャラメル。Honey系も盛ん。',
    regions: [R('Tarrazú、West Valley', 'Caturra、Catuai、Villa Sarchi、Gesha、SL28等', 'Washed、Honey、Natural', '約1,200–1,900m', 'オレンジ、リンゴ、蜂蜜、キャラメル、赤果実', '両方◎')],
    history: { body: '小規模な精製施設（マイクロミル）が各種の精製に取り組む産地として知られる。詳細は未確認。', type: F, confidence: E },
    sources: ['pdf', 'ci-costarica', 'editorial'], related: [['process', 'honey'], ['variety', 'catuai']],
  },
  {
    id: 'guatemala', name: 'グアテマラ', en: 'Guatemala', aliases: ['グアテマラ', 'guatemala'],
    summary: 'Huehuetenango、Antigua・Atitlán。チョコやナッツに柑橘、果実が加わる方向。',
    regions: [
      R('Huehuetenango', 'Bourbon、Caturra、Catuai、Typica', 'Washed', '約1,500–2,000m', 'リンゴ酸、柑橘、果実、トフィー、しっかりしたボディ', '両方◎'),
      R('Antigua、Atitlán', 'Bourbon、Caturra、Catuai', 'Washed', '約1,300–1,800m', 'チョコ、ナッツ、キャラメル＋穏やかな柑橘・花', '浅○／中深◎'),
    ],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf', 'ci-guatemala'], related: [['variety', 'bourbon'], ['variety', 'caturra'], ['process', 'washed']],
  },
  {
    id: 'el-salvador', name: 'エルサルバドル', en: 'El Salvador', aliases: ['エルサルバドル', 'elsalvador', 'el salvador'],
    summary: 'Pacamaraが育成された国。チョコ、黄果実、オレンジ、ハチミツ。',
    regions: [R('Apaneca–Ilamatepec', 'Bourbon、Pacas、Pacamara', 'Washed、Honey、Natural', '約1,200–1,800m', 'チョコ、黄果実、オレンジ、ハチミツ、Pacamaraは香りが大きい', '両方◎')],
    history: { body: 'Pacamaraは、Pacas × Maragogipeをエルサルバドルで育成した品種。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'pacamara']],
  },
  {
    id: 'honduras', name: 'ホンジュラス', en: 'Honduras', aliases: ['ホンジュラス', 'honduras'],
    summary: 'Santa Bárbara、Copán。キャラメル、柑橘、黄果実、ナッツ、カカオ。',
    regions: [R('Santa Bárbara、Copán', 'Catuai、Caturra、IHCAFE系、Pacas', 'Washed中心、Natural/Honey', '約1,200–1,800m', 'キャラメル、柑橘、黄果実、ナッツ、カカオ', '両方◎')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'catuai'], ['process', 'washed']],
  },
  {
    id: 'peru', name: 'ペルー', en: 'Peru', aliases: ['ペルー', 'peru'],
    summary: 'Cajamarca、Cusco等。花、赤果実、柑橘、チョコ。高地は酸が明瞭。',
    regions: [R('Cajamarca、Cusco等', 'Bourbon、Typica、Caturra、Catuai、Pache', 'Washed中心', '約1,300–2,200m', '花、赤果実、柑橘、チョコ、蜂蜜。高地は明瞭な酸', '浅◎／中深○')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf', 'ci-peru'], related: [['variety', 'caturra'], ['variety', 'bourbon']],
  },
  {
    id: 'nicaragua', name: 'ニカラグア', en: 'Nicaragua', aliases: ['ニカラグア', 'nicaragua'],
    summary: 'Nueva Segovia。ナッツ、チョコ、リンゴ、オレンジ。',
    regions: [R('Nueva Segovia', 'Caturra、Catuai、Bourbon、Maracaturra', 'Washed、Natural', '約1,100–1,700m', 'ナッツ、チョコ、リンゴ、オレンジ、熟した果実', '両方◎')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'caturra']],
  },
  {
    id: 'mexico', name: 'メキシコ', en: 'Mexico', aliases: ['メキシコ', 'mexico'],
    summary: 'Chiapas、Oaxaca。カカオ、ナッツ、キャラメル、穏やかな果実。',
    regions: [R('Chiapas、Oaxaca', 'Typica、Bourbon、Caturra等', 'Washed中心', '約1,100–1,800m', 'カカオ、ナッツ、キャラメル、柑橘、穏やかな果実', '浅○／中深◎')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'typica']],
  },
  {
    id: 'yemen', name: 'イエメン', en: 'Yemen', aliases: ['イエメン', 'yemen'],
    summary: '古い地域集団・在来系。Natural中心で、ドライフルーツ、ワイン、スパイス、発酵香。',
    regions: [R('Haraz等', '古い地域集団・在来系', 'Natural', '約1,600–2,400m', 'ドライフルーツ、ワイン、カカオ、スパイス、発酵香', '浅○／中深◎')],
    history: { body: 'モカ港を通じた交易の歴史が知られ、コーヒーの交易・栽培の早い例とされる。詳細は未確認。', type: F, confidence: E },
    sources: ['pdf', 'editorial'], related: [['process', 'natural']],
  },
  {
    id: 'hawaii', name: 'ハワイ（米国）', en: 'Hawaii (USA)', aliases: ['ハワイ', 'hawaii', 'kona', 'コナ', '米国', 'usa'],
    summary: 'Kona。ナッツ、キャラメル、穏やかな果実、柔らかな酸。',
    regions: [R('Kona', 'Kona Typicaほか', 'Washed中心', '約200–900m', 'ナッツ、キャラメル、穏やかな果実、柔らかな酸', '中浅〜中煎り◎')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'typica']],
  },
  {
    id: 'jamaica', name: 'ジャマイカ', en: 'Jamaica', aliases: ['ジャマイカ', 'jamaica'],
    summary: 'Blue Mountain（Typica系）。穏やかな酸、ナッツ、チョコ、ハーブ、バランス。',
    regions: [R('Blue Mountain', 'Jamaica Blue Mountain（Typica系）', 'Washed', '約900–1,700m', '穏やかな酸、ナッツ、チョコ、ハーブ、バランス', '中煎り◎')],
    history: { body: 'この国の歴史・文化の記述は、元の事典に含まれていません（未収録）。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'typica']],
  },
  // 元の記録に登場するが事典に表がない国（詳しい解説は未収録）
  {
    id: 'east-timor', name: '東ティモール', en: 'Timor-Leste', aliases: ['東ティモール', 'timor', 'timor-leste', 'east timor', 'ティモール'],
    summary: 'この国の詳しい解説は、元の事典に含まれていません（未収録）。',
    regions: [], history: { body: '未収録です。分かった時点で追加します。', type: F, confidence: P },
    sources: ['pdf'], related: [['variety', 'catimor']], stub: true,
  },
  {
    id: 'vietnam', name: 'ベトナム', en: 'Vietnam', aliases: ['ベトナム', 'vietnam'],
    summary: 'この国の詳しい解説は、元の事典に含まれていません（未収録）。',
    regions: [], history: { body: '未収録です。分かった時点で追加します。', type: F, confidence: P },
    sources: ['pdf'], related: [['country', 'thailand']], stub: true,
  },
];

// ───────────── 品種 ─────────────
// lineage=系譜・由来 / agro=栽培上の特徴 / flavor=一般的な味の傾向 / compare=飲み比べのポイント
const V = (id, name, aliases, lineage, agro, flavor, compare, related = [], extra = {}) => ({ id, name, aliases, lineage, agro, flavor, compare, related, sources: ['pdf', 'wcr-var'], ...extra });

export const VARIETIES = [
  V('typica', 'Typica（ティピカ）', ['typica', 'ティピカ', 'ティピカ種'], 'アラビカの基幹的な古い遺伝系統の一つ', '背が高く、収量は低め、病害に弱い', 'クリーン、甘い、花、柑橘、上品な酸', 'Bourbonと同産地で比べる', [['variety', 'bourbon'], ['country', 'jamaica']]),
  V('bourbon', 'Bourbon（ブルボン）', ['bourbon', 'ブルボン', 'ブルボン種', 'イエローブルボン', 'yellowbourbon', 'レッドブルボン', 'redbourbon'], 'Typicaと並ぶ主要な基幹系統', '高品質ポテンシャル。高地で特に評価されるが病害に弱い', '甘さ、赤果実、キャラメル、丸い酸', 'Rwanda/Burundiと中南米で産地違い', [['variety', 'typica'], ['country', 'rwanda'], ['variety', 'pink-bourbon']], { note: 'Yellow Bourbonなど色名の付く系統もBourbonの仲間として扱っています（記録の元表記はそのまま残ります）。' }),
  V('caturra', 'Caturra（カトゥーラ）', ['caturra', 'カトゥーラ', 'カトゥーラ種', 'カトゥーラ種', 'レッドカトゥーラ', 'redcaturra', 'orangecaturra'], 'Bourbonの自然突然変異', '矮性で栽培しやすく、収量良好。ただしさび病に弱い', '柑橘、キャラメル、明るい酸、素直な甘さ', 'Colombia/Costa Ricaで探しやすい', [['variety', 'bourbon'], ['country', 'colombia']]),
  V('catuai', 'Catuai（カトゥアイ）', ['catuai', 'カトゥアイ', 'カトゥアイ種', 'レッドカトゥアイ', 'redcatuai', 'yellowcatuai'], 'Mundo Novo × Caturra', 'コンパクトで高収量。さび病には弱い', 'チョコ、ナッツ、果実、バランス型。土地と精製で大きく変化', '同じ品種で産地違い（例: Thailand vs Brazil/Costa Rica）', [['variety', 'caturra'], ['variety', 'mundo-novo'], ['country', 'thailand'], ['country', 'brazil']]),
  V('mundo-novo', 'Mundo Novo（ムンドノーボ）', ['mundonovo', 'mundo novo', 'ムンドノーボ'], 'Bourbon × Typicaの自然交雑由来', '強健・高収量でブラジルに重要', 'チョコ、ナッツ、甘さ、丸い果実', 'Brazil Naturalで中深煎り', [['variety', 'catuai'], ['country', 'brazil']]),
  V('gesha', 'Gesha / Geisha（ゲイシャ）', ['gesha', 'geisha', 'ゲイシャ', 'ゲシャ', 't2722'], 'エチオピア由来の遺伝資源が中米へ移動し、パナマで高品質性が顕在化（T2722系）', '高地で非常に高いカップ品質ポテンシャル。一方、収量等の課題も', 'ジャスミン、ベルガモット、茶、柑橘、桃', 'まずWashedを浅煎りで。Naturalは次段階', [['country', 'panama'], ['variety', 'ethiopian-landraces']]),
  V('pacamara', 'Pacamara（パカマラ）', ['pacamara', 'パカマラ'], 'Pacas × Maragogipe、エルサルバドル育成', '大粒。樹・ロット間のばらつきも大きい', 'トロピカル、柑橘、スパイス、クリーミー、大きな香り', 'El Salvadorを基準にする', [['variety', 'maragogipe'], ['country', 'el-salvador']]),
  V('sl28-sl34', 'SL28 / SL34', ['sl28', 'sl34', 'sl-28', 'sl-34', 'sl 28', 'sl 34'], 'ケニアでScott Agricultural Laboratoriesが選抜した系統', '高品質でケニアの伝統的スペシャルティに重要', 'カシス、ベリー、柑橘、ワイン様、強い酸', 'Kenya Washedで最初に理解しやすい', [['country', 'kenya'], ['variety', 'batian']]),
  V('ethiopian-landraces', 'Ethiopian landraces / 地域在来集団', ['heirloom', 'エアルーム', 'ethiopian landraces', 'ethiopianlandraces', 'landraces', 'landrace', '在来種', 'エチオピア在来種', 'jarcselections', 'jarc'], 'エチオピア各地の非常に多様な遺伝集団', '「一つの品種」ではない', '花、茶、柑橘、桃、ベリーなど極めて多様', 'Yirgacheffe WashedとNaturalを比較', [['country', 'ethiopia'], ['variety', 'gesha']], { note: '店や産地が「Heirloom」と書く場合も、特定の一品種を指すとは限りません。' }),
  V('catimor', 'Catimor系（カティモール）', ['catimor', 'カティモール', 'カチモール'], 'Caturra × Timor Hybrid系統', 'Timor Hybrid由来のC. canephora遺伝子を活用し病害抵抗性を狙う', '従来は品質面の先入観もあったが、高地・丁寧な精製ではクリーンな果実味も', 'Thailand、Yunnan、Sumatraで重要', [['variety', 'sarchimor'], ['country', 'thailand'], ['country', 'china']]),
  V('sarchimor', 'Sarchimor系', ['sarchimor', 'サルチモール'], 'Villa Sarchi × Timor Hybrid系統', 'さび病抵抗性と生産性を狙う', 'チョコ〜果実まで幅広い', '「耐病性品種＝低品質」という思い込みを外す', [['variety', 'catimor'], ['variety', 'centroamericano-h1']]),
  V('maragogipe', 'Maragogipe（マラゴジッペ）', ['maragogipe', 'マラゴジッペ', 'maragogype'], 'Typica系の大型果実突然変異', '大粒、収量低め', '繊細、フローラル、果実、軽やか', 'Pacamaraの親として理解', [['variety', 'pacamara']]),
  V('laurina', 'Laurina（ローリナ）', ['laurina', 'ローリナ', 'bourbonpointu'], 'Bourbon由来の突然変異として知られる', '小型で低カフェイン傾向、収量・栽培性に課題', '非常に繊細、甘い、花、茶、柑橘', 'Panama/Brazilの高品質ロット', [['country', 'panama']]),
  V('centroamericano-h1', 'Centroamericano H1', ['centroamericano', 'h1', 'centroamericanoh1'], 'F1 hybrid。Sarchimor系と高品質遺伝資源を組み合わせた系統', '高収量・さび病耐性、高地で高品質ポテンシャル', '花、果実、甘さ。条件次第で非常に高品質', 'Costa Ricaなどで探す', [['variety', 'sarchimor']]),
  V('batian', 'Batian（バティアン）', ['batian', 'バティアン'], 'ケニアで育成された耐病性品種', 'さび病耐性、Coffee Berry Disease抵抗性と品質を両立する目的', '明るい果実、柑橘、甘さ', 'SL28/34との比較が面白い', [['variety', 'sl28-sl34'], ['country', 'kenya']]),
  V('pink-bourbon', 'Pink Bourbon（ピンクブルボン）', ['pinkbourbon', 'ピンクブルボン', 'ピンクボルボン'], '流通名であり、遺伝学的な同定が名称と一致するとは限らない', '農園・ロットごとの開示情報を確認するのが安全', '一般傾向は断定しにくい', '名前より、農園・精製・開示情報を見る', [['variety', 'bourbon'], ['country', 'colombia']], { note: 'Sidra、Pink Bourbon、Chirosoなどは、流通名と遺伝学的同定が常にきれいに一致するとは限りません。「この名前だから必ずこの味」とは言えません。' }),
];

// ───────────── 精製 ─────────────
// steps=典型的な工程 / ferment=発酵・酸素の特徴 / flavor=一般的な味への影響 / risk=主なリスク・論点 / roast=比較に向く焙煎
const PR = (id, name, aliases, steps, ferment, flavor, risk, roast, related = [], extra = {}) => ({ id, name, aliases, steps, ferment, flavor, risk, roast, related, sources: ['pdf', 'sca-ferm'], ...extra });

export const PROCESSES = [
  PR('washed', 'Washed（ウォッシュド）', ['washed', 'ウォッシュド', 'フルウォッシュド', 'フリーウォッシュド', 'fullywashed', '水洗', '水洗式'], '果皮除去 → 発酵等でミューシレージ除去 → 洗浄 → 乾燥', '比較的コントロールしやすい', 'クリーン、酸の輪郭、産地・品種の差を読みやすい', '水使用量、発酵管理', '浅〜中', [['process', 'natural'], ['process', 'honey']]),
  PR('natural', 'Natural（ナチュラル）', ['natural', 'ナチュラル'], 'チェリーのまま乾燥 → 脱殻', '果肉と種子が長く接触', '果実感、甘さ、ボディ、ベリー、ワイン様', '過発酵、不均一乾燥、フェノール等', '浅〜中', [['process', 'washed'], ['process', 'honey']]),
  PR('honey', 'Honey / Pulped Natural（ハニー）', ['honey', 'ハニー', 'ホワイトハニー', 'イエローハニー', 'レッドハニー', 'ブラックハニー', 'pulpednatural', 'パルプドナチュラル', 'パルプドナチュラル'], '果皮除去後、ミューシレージを一部残して乾燥', 'WashedとNaturalの中間的', '蜂蜜様の甘さ、丸い質感、果実＋透明感', '乾燥管理が難しい', '浅〜中深', [['process', 'washed'], ['process', 'natural']], { note: 'ホワイト／イエロー／レッドなどの色名は、ミューシレージの残し方を表す呼び方として使われることがあります（業者により定義が異なる場合があります）。' }),
  PR('wet-hulled', 'Wet-hulled / Giling Basah（スマトラ式）', ['wet-hulled', 'wethulled', 'giling basah', 'ギリングバサ', 'スマトラ式'], 'パーチメント状態で部分乾燥 → 高水分の段階で脱殻 → 再乾燥', '湿潤環境に適応', 'ハーブ、土、スパイス、重いボディ、低めの明瞭度。近年はクリーンなロットも', '水分の高い豆を扱うため品質管理が難しい', '中〜中深', [['country', 'indonesia']], { extra: 'Cafe Importsは、豆をおよそ30〜50%水分の状態でパーチメントから脱殻し、その後11〜13%程度まで乾燥する工程を説明しており、雨・雲の多い気候で乾燥を速めるために発達したとしている。', extraSources: ['ci-sumatra'] }),
  PR('kenya-style', 'ケニア式（発酵＋再浸漬）', ['ケニア式', 'double washed', 'doublewashed', 'ダブルウォッシュド', 'ダブルウォッシュ', 'soak'], '果皮除去 → 発酵 → 洗浄 → 清水でSoak → 乾燥', '長めの発酵・洗浄工程', '非常にクリーン、鮮明な酸、果実', '「double washed」という呼称は業者により工程の指し方が多少違う', '浅', [['country', 'kenya'], ['process', 'washed']], { extra: 'ケニアでは、果皮除去後に24〜48時間程度の乾式発酵を行い、洗浄後さらに水に浸す工程をとる例がある。', extraSources: ['ci-kenya'] }),
  PR('anaerobic', 'Anaerobic（アナエロビック）', ['anaerobic', 'アナエロビック', 'アナエロビック', 'アナエロ', 'doubleanaerobic'], 'Whole cherryまたは果皮除去豆を密閉槽で発酵', '低酸素環境。ただし完全な「無酸素」を保証する語ではない', 'トロピカル、乳酸的、スパイス、酒様、キャンディ', '標準化された単一工程ではない。時間・圧力・温度・基質がロットごとに異なる', '浅〜中', [['process', 'carbonic'], ['process', 'natural']]),
  PR('carbonic', 'Carbonic Maceration（カーボニックマセレーション）', ['carbonic maceration', 'carbonicmaceration', 'カーボニックマセレーション', 'cm', 'carbonic'], 'Whole cherryを密閉槽へ、CO₂を利用する方式が典型', 'CO₂リッチな環境・果実内発酵を狙う', '強い果実、花、ワイン様、スパイス', 'ワインの用語を移植したため、コーヒーでは実装差が大きい', '浅', [['process', 'anaerobic']], { extra: 'Carbonic Macerationでは、CO₂を利用した低酸素環境が微生物群集と発酵経路を変えうることが研究されているが、名称だけで味を予測するのは危険である。', extraSources: ['springer-cm'] }),
  PR('yeast-starter', '酵母等のスターター発酵', ['starter', 'yeast', 'スターター', '酵母'], '特定微生物を接種し発酵', 'より再現性を狙う', '特定果実、花、乳酸感、香りの強調', '微生物株・温度・時間で結果が大きく変化', '浅〜中', [['process', 'co-ferment']]),
  PR('co-ferment', 'Co-ferment / Adjunct fermentation', ['co-ferment', 'coferment', 'コファーメント', 'adjunct'], 'コーヒーと果物、香辛料等を発酵時に併用', 'コーヒー由来以外の基質が加わる', 'シナモン、ストロベリー等が非常に明瞭になることも', '表示透明性・真正性・アレルゲン・競技公平性をめぐり論争', '浅〜中', [['process', 'infused']]),
  PR('infused', 'Infused / Flavor-added', ['infused', 'インフューズド', 'flavor-added', 'flavoradded'], '発酵中または後工程で外部香味源を加えるケース', '定義が統一されていない', '非常に強く特定的な香味', '「精製由来」か「添加香料」かの境界、表示方法が最大の論点', '比較目的なら独立カテゴリー扱い', [['process', 'co-ferment']], { extra: 'SCAは2020年の時点で、微生物スターター、発酵時の果物・ハーブ等のadjunct、後から加えるflavoring agentを区別して議論し、真正性、公正な表示、アレルゲン情報などを課題としていた。業界合意はまだないとされる。', extraSources: ['sca-ferm', 'sca-identity'] }),
  PR('thermal-shock', 'Thermal Shock等の複合精製', ['thermal shock', 'thermalshock', 'サーマルショック'], '温度を急変させる工程＋発酵・洗浄等を組み合わせる', '生産者固有レシピが多い', '高い香気、キャンディ、強い果実', '名称だけでは工程を再現できない。詳細開示が重要', '浅', [['process', 'anaerobic']], { note: '「Special Process」とだけ書かれている場合は、具体的な工程は分かりません。' }),
];

// ───────────── 比較テーマ（探求の広げ方） ─────────────
export const THEMES = [
  { id: 'one-variable', title: '一度に変える要素は一つ', body: '産地も品種も精製も焙煎も器具も同時に変えると、「なぜ違ったか」が分からなくなる。楽しく飲む日は自由に、比較実験をするときだけ条件を揃える。', type: S, kind: 'principle' },
  { id: 'same-roast', title: '同じ生豆で、焙煎度だけ違う', fixed: '産地、品種、精製', learn: '「産地の味」と「焙煎の味」の境界', body: '最初にやるとよい比較。「浅煎りは酸、中深煎りはチョコ」という二分法が崩れ、同じ豆からどこまで果実が残り、どこからロースト由来のカラメル・カカオ・苦甘さが増えるかが見える。', type: S },
  { id: 'process-diff', title: '同じ産地で、精製だけ違う', fixed: '国・地域、なるべく品種', learn: '発酵・乾燥由来の味', body: '例: Ethiopia の Washed と Natural。', type: S },
  { id: 'variety-origin', title: '同じ品種で、産地が違う', fixed: '品種、なるべくWashed', learn: '遺伝とテロワールの関係', body: '例: Catuai を Thailand と Brazil/Costa Rica で。', type: S },
  { id: 'origin-same-process', title: '同じ精製で、国が違う', fixed: 'Washedなどの精製', learn: '産地差を直接見る', body: '例: Thailand / PNG / Kenya の Washed。', type: S },
  { id: 'variety-same-origin', title: '同じ地域で、品種が違う', fixed: '農園・精製', learn: '品種の差', body: '例: Kenya SL28/34 と Batian。', type: S },
  { id: 'ferment-diff', title: '通常の精製と発酵系', fixed: '産地・品種', learn: '発酵による変化', body: '例: Colombia の Washed と Anaerobic。インフューズドなど添加の疑われるものは、別カテゴリーとして比べる。', type: S },
  {
    id: 'taste-map', title: '国より構造で覚える', body: '花・茶・高い香り → Ethiopia Yirgacheffe / Panama Gesha\n強くきれいな酸 → Kenya / Colombia Nariño\nカカオ＋丸い甘さ → Brazil / Guatemala / Thailand\nハーブ・スパイス・重量感 → Sumatra / India / Yemen\nアジアだが透明感が高い方向 → Sulawesi Washed / PNG / Myanmar Washed', type: T, kind: 'map',
  },
];

// ───────────── 一杯が届くまで ─────────────
export const JOURNEY = [
  {
    id: 'farm', title: '農園', lead: '品種を育てる土地と標高が、味の土台をつくる。',
    cards: [
      { title: '品種・標高・土地', type: T, body: '同じ品種でも標高・土壌・気象、成熟度、精製、乾燥、焙煎で大きく変わる。品種は味を決める唯一の変数ではない。ただし、同一精製・近い焙煎条件で比較すると、品種は非常に面白い探索軸になる。', conf: P },
      { title: '標高の目安', type: T, body: 'その地域のスペシャルティ・アラビカでよく見るおおよその帯域は、産地ページの表にある。農園単位では外れる。', conf: P },
      { title: '耐病性と気候', type: F, body: '品種の収量、樹形、病害抵抗性、品質ポテンシャルなどは、World Coffee Research の品種カタログで比較できる。', conf: P },
    ],
    links: [['dict', 'variety'], ['dict', 'country']],
    sources: ['pdf', 'wcr-var'],
  },
  {
    id: 'processing', title: '精製', lead: '収穫したチェリーから種子を取り出し、生豆に仕上げる工程。',
    cards: [
      { title: '精製とは', type: F, body: '収穫したコーヒーチェリーから種子を取り出し、輸出可能な生豆へ安定させる工程。発酵は副産物ではなく、微生物・時間・温度・酸素・粘液質の量などによって香味形成に影響する。', conf: P },
      { title: '名称だけでは味は決まらない', type: T, body: 'Anaerobic や Carbonic Maceration など、名称だけで味を予測するのは危険。時間・温度・槽などの条件がロットごとに異なる。', conf: P },
    ],
    links: [['dict', 'process']],
    sources: ['pdf', 'sca-ferm'],
  },
  {
    id: 'roasting', title: '焙煎', lead: '生豆に熱を加え、香味を引き出す工程。',
    cards: [
      { title: '焙煎度で何が変わるか', type: T, body: '焙煎が進むと、果実や花のような香りが後退し、ロースト由来のカラメル・カカオ・苦甘さが増える傾向がある。', conf: E },
      { title: '「浅煎り＝酸、深煎り＝チョコ」だけではない', type: S, body: '同じ生豆で焙煎度だけを変えて比べると、産地の味と焙煎の味の境界が見える。中深煎りは、苦味を増やす焙煎ではなく、カカオ・糖蜜・質感・余韻をどう設計するか、と見ることもできる。', conf: P },
      { title: 'お店の焙煎度表記', type: F, body: '店ごとに焙煎度の呼び方は違う。記録では、店の表現をそのまま残すのが安全。', conf: P },
    ],
    links: [['theme', 'same-roast']],
    sources: ['pdf', 'editorial'],
  },
  {
    id: 'brewing', title: '抽出', lead: '粉に湯を通し、味を取り出す工程。',
    cards: [
      { title: '比較実験の出発点', type: S, body: '以下は規格ではなく、比較実験用のスタート地点。\n豆量／湯量: 15g / 250g（1:16.7）→ 1:15〜1:17〜18 で濃度、甘さ、余韻、透明感を見る\n湯温: 92°C → 88 / 92 / 96°C で酸・甘さ・苦味・香りの出方を見る\n挽き目: 普段の基準から1〜2段階細かく／粗く\nドリッパー: 円錐 ↔ 平底 ↔ 浸漬 で明瞭度・甘さ・質感を見る', conf: P },
      { title: '味を見て調整する簡易診断', type: S, body: '酸っぱく、薄く、余韻が短い → 少し細かく／高温／接触を増やす。\n苦く、乾く、舌に渋みが残る → 少し粗く／低温／攪拌を減らす。\n香りは良いが重すぎる → 比率を薄める。\nきれいだが物足りない → 比率を濃くする。\n「浅煎りは必ず高温」「深煎りは必ず低温」というルールにはしない。', conf: P },
      { title: '器具より、同じ器具で条件を動かす', type: S, body: '器具を変えるより先に、同じ器具で条件を動かす。器具を増やすのは、味の基準線ができてからの方が有益。', conf: P },
    ],
    links: [['theme', 'one-variable']],
    sources: ['pdf'],
  },
];

// ───────────── 歩み（歴史） ─────────────
export const HISTORY = {
  id: 'history', title: 'スペシャルティコーヒーの歩み',
  lead: 'スペシャルティの歴史は「高級な豆が発見された歴史」というより、価値を何によって説明するかが変わった歴史と見ると理解しやすい。産地 → カップ点数 → 品種 → 精製 → 生産者 → 透明性、と視野が広がってきた。',
  world: [
    ['1974', 'Erna Knutsenが「specialty coffee」という表現を業界誌で用いたとされる。', '産地・ロット固有の優れた品質を区別する発想が言語化された'],
    ['1982', 'Specialty Coffee Association of America（SCAA）設立。', '教育、焙煎、カッピングの共通言語が形成'],
    ['1999', 'Cup of Excellence（COE）の原型がブラジルで始動。', '生産者別の高品質ロットを国際審査で価値化'],
    ['2000', '初のWorld Barista Championship（WBC）がモンテカルロで開催。', '抽出・プレゼン・産地ストーリーが国際競技化'],
    ['2002前後', 'Trish Rothgebが「Third Wave Coffee」という語を提示。', '豆の鮮度、産地、焙煎、抽出をクラフトとして捉える潮流'],
    ['2004', 'Hacienda La EsmeraldaのPanama GeshaがBest of Panamaで大きな注目を集める。', '「品種」が高評価を生む象徴的時代へ'],
    ['2016', 'SCA Coffee Taster’s Flavor WheelがWCR Sensory Lexiconを基盤に大改訂。Lexiconには110の感覚属性。', '「レモン」「ジャスミン」などの語彙を比較可能な言語に'],
    ['2017', 'SCAAとSCAEが統合して現在のSCAへ。', '米欧の協会体系が統合'],
    ['2021', 'SCAがスペシャルティの定義を再検討し、「属性」と「価値」の関係を重視する白書を発表。', '「80点以上＝スペシャルティ」という単純化から離れる'],
    ['2024', 'SCA-102、103、104のCVA規格が正式採用され、2004年の旧フォームを置き換える。', '味の記述と「好き／品質評価」を分離する方向へ'],
  ],
  japan: [
    ['1888', '東京・下谷で鄭永慶の「可否茶館」が開店したと全日本コーヒー協会は記録。', '日本の近代的な喫茶文化の早い例'],
    ['1980', '喫茶店が事業所統計上15万4,630軒でピーク。', '深煎り、ネル、サイフォン、ハンドドリップ等、多数の独自スタイル'],
    ['2003', '現在につながるSCAJを新規設立。', '生産からカップまでの体系的教育へ'],
    ['2007', '東京ビッグサイトでSCAJ2007とWBCを同時開催。WBCとして初めて東京開催。', '日本のバリスタ／ロースターが国際舞台と直接接続'],
    ['2014', '井崎英典がWorld Barista Championship優勝。', '日本人初のWBC王者として大きな転換点'],
  ],
  closing: '日本の深煎り／ネル文化と現代の浅煎りは対立物ではない。伝統的喫茶が追求してきた「焙煎」「熟成」「抽出」「余韻」「口当たり」への細かさと、スペシャルティ側の「生産地」「品種」「精製」「酸の質」「透明性」は、観察対象が違うだけで、どちらも一杯を分解して考える文化である。',
  note: '年表の各項目は元の事典の記述です。個別の数字や出来事の再確認は、下の出典から行ってください。',
  sources: ['pdf', 'sca-knutsen', 'coe-history', 'sca-wbc', 'sca-defn', 'sca-cva', 'wcr-lex', 'ajca-history', 'scaj-overview', 'scaj-wbc2014'],
};

// ───────────── 店（記録に登場しうる店の紹介。確認時点付き） ─────────────
export const STORES_CHECKED_AT = '2026-10-24';
export const STORES = [
  { id: 'lightup', name: 'LIGHT UP COFFEE', match: ['light up coffee', 'lightup'], area: '全国通販', body: '明るくクリーンなLight roast。定期便あり。', url: 'https://lightupcoffee.com/' },
  { id: 'lilo', name: 'LiLo Coffee Roasters', match: ['lilo'], area: '大阪・心斎橋', body: '2014年からロースターを展開。幅広い産地を扱う。', url: 'https://coffeeliloinveve.live/' },
  { id: 'mel', name: 'Mel Coffee Roasters', match: ['mel coffee'], area: '大阪市西区新町', body: 'LightからMedium/Dark寄りまで選択肢があり、希少ロットも豊富。サブスクあり。', url: 'https://mel-coffee.jp/' },
  { id: 'takamura', name: 'Takamura Wine & Coffee Roasters', match: ['takamura', 'タカムラ'], area: '大阪市西区江戸堀', body: 'Ethiopia/Kenya系浅煎りから深めの豆まで幅広い。同ロットの焙煎違いも確認できたとされる。', url: 'https://takamuranet.com/' },
  { id: 'kurasu', name: 'Kurasu', match: ['kurasu'], area: '京都市', body: 'Light、Medium-Light、Medium、Darkの表記があり、定期便も展開。', url: 'https://kurasu.kyoto/' },
  { id: 'weekenders', name: 'Weekenders Coffee', match: ['weekenders'], area: '京都市中京区', body: 'Light roastを軸に、酸だけでなく甘さ・余韻を重視。', url: 'https://www.weekenderscoffee.com/' },
  { id: 'unir', name: 'Unir', match: ['unir', 'ウニール'], area: '京都府長岡京市ほか', body: '高品質スペシャルティを長く扱う。中深煎りも確認されたとされる。', url: 'https://www.unir-coffee.com/' },
  { id: 'taoca', name: 'TAOCA COFFEE', match: ['taoca'], area: '神戸・西宮ほか', body: '日常的に飲みやすいスペシャルティ、複数店舗・定期便。', url: 'https://taocacoffee.jp/' },
  { id: 'glitch', name: 'GLITCH COFFEE & ROASTERS', match: ['glitch'], area: '全国通販', body: 'High-end Single Origin、Light roast中心。', url: 'https://glitchcoffee.com/' },
  { id: 'leaves', name: 'LEAVES COFFEE ROASTERS', match: ['leaves coffee'], area: '全国通販', body: 'Sweetnessとaromaと産地個性を重視。定期便あり。', url: 'https://leavescoffee.jp/' },
  { id: 'onibus', name: 'ONIBUS COFFEE', match: ['onibus'], area: '全国通販', body: 'Single Origin、透明性の高い調達、サブスク。', url: 'https://onibuscoffee.com/' },
  { id: 'coffeecounty', name: 'COFFEE COUNTY', match: ['coffee county'], area: '全国通販', body: '焙煎・精製の幅が広い。', url: 'https://coffeecounty.cc/' },
];
