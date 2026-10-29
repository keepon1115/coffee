// 記事の対応が明確なものは直接開き、それ以外は文脈を添えて検索する。
// 外部APIは使わず、オフラインでも事典の表示を妨げない。
export function wikipediaLink(kind, item) {
  let title;
  let query;
  if (kind === 'country') {
    title = ({ thailand: 'タイ王国', china: '雲南省', hawaii: 'ハワイ州' })[item.id] || item.name;
  } else if (kind === 'variety') {
    if (item.id === 'gesha') title = 'ゲイシャ_(コーヒー)';
    const term = item.aliases?.find((s) => /[ァ-ヶ一-龠]/.test(s)) || item.name;
    query = `${term} コーヒー`;
  } else if (kind === 'process') {
    const term = item.aliases?.find((s) => /[ァ-ヶ一-龠]/.test(s)) || item.name;
    query = `${term} コーヒー 精製`;
  } else if (kind === 'journey') {
    title = ({ farm: 'コーヒー豆', processing: 'コーヒー豆', roasting: '焙煎' })[item.id];
    query = 'コーヒー 抽出';
  } else return null;

  return {
    href: title
      ? `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`
      : `https://ja.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}&title=Special%3ASearch`,
    label: title ? 'Wikipediaで詳しく見る' : 'Wikipediaで調べる',
  };
}
