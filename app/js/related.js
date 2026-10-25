// 関連候補と比較の根拠づくり。説明できるルールのみ（国・品種・精製の一致、感想に登場する語）。
// 好みの一致や味の原因の断定はしない。
import { tastingDate, dateSortKey, isBlank } from './model.js';
import { getVariety, getCountry, getProcess, normKey } from './knowledge.js';

export const FLAVOR_TERMS = [
  'ダークチョコレート', 'ミルクチョコレート', 'ダークチョコ', 'ミルクチョコ', 'チョコレート', 'チョコ', 'カカオ', 'ココア', 'キャラメル', 'ブラウンシュガー', 'ハチミツ', '蜂蜜', 'ナッツ', 'アーモンド', 'ヘーゼルナッツ', 'マカダミア', 'カシュー',
  'グレープフルーツ', 'オレンジ', 'レモン', 'ライム', 'マンダリン', 'ネーブル', '柑橘', 'ベルガモット',
  '赤りんご', 'りんご', 'リンゴ', '白ブドウ', 'ブドウ', 'ぶどう', 'グレープ', 'ベリー', 'ブルーベリー', 'ラズベリー', 'チェリー', 'さくらんぼ', '白桃', '黄桃', '桃', 'ピーチ', 'アプリコット', '杏', 'プラム', 'マンゴー', 'パイナップル', 'トロピカル', 'メロン', 'いちご', 'イチゴ',
  '紅茶', '緑茶', 'アールグレイ', 'ジャスミン', 'フローラル', '花の', 'ワイン', 'スパイス', 'シナモン', 'ハーブ',
];

const NEG = /^[^、。\n]{0,12}?(ない|なし|感じず|感じられ?な|苦手|いまいち|イマイチ|好きではな|好みではな|ありません)/;

/** 感想の原文に登場する語を拾う。否定が続く言い回しは除く。 */
export function findTerms(text) {
  const out = new Map();
  const s = String(text ?? '');
  for (const term of FLAVOR_TERMS) {
    let from = 0;
    while (true) {
      const i = s.indexOf(term, from);
      if (i < 0) break;
      from = i + term.length;
      // 長い語の一部（例: 「チョコ」が「ダークチョコ」内）は長い語で拾済みなので重ねない
      const covered = [...out.values()].some((o) => o.start <= i && i + term.length <= o.end && o.term !== term);
      if (covered) continue;
      if (NEG.test(s.slice(i + term.length))) continue;
      if (!out.has(term)) out.set(term, { term, start: i, end: i + term.length, snippet: snippet(s, i, term.length) });
    }
  }
  return [...out.values()];
}

function snippet(s, i, len) {
  const a = Math.max(0, i - 14), b = Math.min(s.length, i + len + 14);
  return (a > 0 ? '…' : '') + s.slice(a, b).replace(/\s+/g, ' ') + (b < s.length ? '…' : '');
}

/** 並べ替え用: 最新の日付（感想・記録）。日付不明の取り込みは後ろへ */
export function beanSortKey(bean, tastings) {
  let key = dateSortKey(bean.recordDate);
  for (const t of tastings) { const k = dateSortKey(tastingDate(t)); if (k > key) key = k; }
  if (!key) key = bean.source?.type === 'manual' ? bean.createdAt.slice(0, 10) : '0000';
  return `${key}|${bean.createdAt}`;
}

export function sortedBeans(repo) {
  const rows = [...repo.beans.values()].map((b) => ({ bean: b, key: beanSortKey(b, repo.tastingsOf(b.id)) }));
  rows.sort((x, y) => (x.key < y.key ? 1 : x.key > y.key ? -1 : 0));
  return rows.map((r) => r.bean);
}

const names = (kind, ids) => ids.map((id) => ((kind === 'variety' ? getVariety(id) : kind === 'country' ? getCountry(id) : getProcess(id))?.name || id).split('（')[0]);
const inter = (a, b) => a.filter((x) => b.includes(x));

/** この豆と比べる候補（理由つき）。優先度順 */
export function comparisonCandidates(bean, repo) {
  const out = [];
  const n = bean.norm || {};
  const myTerms = findTerms(repo.tastingsOf(bean.id).map((t) => t.text).join('\n'));
  for (const other of sortedBeans(repo)) {
    if (other.id === bean.id) continue;
    const o = other.norm || {};
    const sharedVar = inter(n.varietyIds || [], o.varietyIds || []);
    if (sharedVar.length && n.countryId !== o.countryId) {
      out.push({ other, rank: 1, themeId: 'variety-origin', reason: `同じ品種（${names('variety', sharedVar).join('、')}）で産地違い`, basis: '品種・国の記録から' });
    }
    if (n.countryId && n.countryId === o.countryId && (n.processIds || []).length && (o.processIds || []).length && inter(n.processIds, o.processIds).length === 0) {
      out.push({ other, rank: 2, themeId: 'process-diff', reason: `同じ産地（${names('country', [n.countryId])[0]}）で精製違い`, basis: '国・精製の記録から' });
    }
    const sharedProc = inter(n.processIds || [], o.processIds || []);
    if (sharedProc.length && n.countryId && o.countryId && n.countryId !== o.countryId) {
      out.push({ other, rank: 3, themeId: 'origin-same-process', reason: `同じ精製（${names('process', sharedProc).join('、')}）で国違い`, basis: '国・精製の記録から' });
    }
    if (myTerms.length) {
      const theirs = findTerms(repo.tastingsOf(other.id).map((t) => t.text).join('\n'));
      const common = myTerms.filter((m) => theirs.some((t) => t.term === m.term));
      if (common.length) out.push({ other, rank: 4, themeId: null, reason: `どちらの感想にも「${common[0].term}」が登場`, basis: '感想の語句の一致から（好みの一致ではありません）', term: common[0].term });
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  return out;
}

/** 提案のプール: 全部の豆から、比較の候補と事典への入口を集める（同じ組・同じ記事は1件） */
export function suggestionPool(repo) {
  const beans = sortedBeans(repo);
  const compare = [], article = [];
  const seenCmp = new Set(), seenArt = new Set();
  for (const bean of beans) {
    for (const cand of comparisonCandidates(bean, repo).slice(0, 3)) {
      const key = 'cmp:' + [bean.id, cand.other.id].sort().join('|');
      if (seenCmp.has(key)) continue;
      seenCmp.add(key);
      compare.push({ key, bean, type: 'compare', cand });
    }
    const n = bean.norm || {};
    const arts = [
      ...(n.varietyIds || []).map((id) => ({ kind: 'variety', id, text: '品種「' + names('variety', [id])[0] + '」の背景を読む', basis: '品種の記録から' })),
      ...(n.processIds || []).map((id) => ({ kind: 'process', id, text: '精製「' + names('process', [id])[0] + '」の工程を読む', basis: '精製の記録から' })),
      ...(n.countryId ? [{ kind: 'country', id: n.countryId, text: names('country', [n.countryId])[0] + 'の背景を読む', basis: '国の記録から' }] : []),
    ];
    for (const art of arts) {
      const key = 'art:' + art.kind + ':' + art.id;
      if (seenArt.has(key)) continue;
      seenArt.add(key);
      article.push({ key, bean, type: 'article', ...art });
    }
  }
  return { compare, article, beans };
}

/**
 * ノートの「この一杯から」1件。全部の豆からランダムに選ぶ（比較と事典を半々）。
 * exclude: 直前に出した提案のkey（候補が2件以上あれば除く）。rng: テスト用に差し替え可。
 */
export function homeSuggestion(repo, { rng = Math.random, exclude } = {}) {
  const { compare, article, beans } = suggestionPool(repo);
  if (!beans.length) return null;
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const all = [...compare, ...article];
  if (!all.length) {
    return { key: 'theme:same-roast', bean: beans[0], type: 'article', kind: 'theme', id: 'same-roast', text: '比べ方のヒントを読む', basis: '事典の一般的な比較テーマ（あなたの記録に基づく分析ではありません）' };
  }
  const usable = (list) => (all.length > 1 && exclude ? list.filter((x) => x.key !== exclude) : list);
  let c = usable(compare), a = usable(article);
  const wantCompare = c.length && (!a.length || rng() < 0.5);
  return pick(wantCompare ? c : a);
}

/** 2つの豆の共通点・違い（因果は述べない） */
export function compareBeans(a, b) {
  const rows = [];
  const common = [], diff = [], unknown = [];
  const push = (label, av, bv, same) => {
    rows.push({ label, a: av, b: bv, same });
    if (isBlank(av) || isBlank(bv)) unknown.push(label);
    else if (same) common.push(label);
    else diff.push(label);
  };
  const an = a.norm || {}, bn = b.norm || {};
  const eqIds = (x, y) => x.length && y.length && x.slice().sort().join() === y.slice().sort().join();
  push('国', a.country, b.country, an.countryId ? an.countryId === bn.countryId : normKey(a.country) === normKey(b.country));
  push('生産地', a.region, b.region, normKey(a.region) === normKey(b.region));
  push('品種', a.variety, b.variety, eqIds(an.varietyIds || [], bn.varietyIds || []) || normKey(a.variety) === normKey(b.variety));
  push('精製', a.process, b.process, eqIds(an.processIds || [], bn.processIds || []) || normKey(a.process) === normKey(b.process));
  push('焙煎度', a.roast, b.roast, normKey(a.roast) === normKey(b.roast));
  push('標高', a.altitude, b.altitude, normKey(a.altitude) === normKey(b.altitude));
  return { rows, common, diff, unknown };
}
