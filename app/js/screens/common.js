// 画面共通のパーツ
import { h, link, extLink, safeUrl, toast, guarded } from '../ui.js';
import { sourceList, getCountry, getVariety, getProcess, KIND_LABEL, articleTitle, getArticle, SOURCES, matchStoreInfo, normKey } from '../knowledge.js';
import { beanTitle, formatDate, formatDateShort, tastingDate, dateSortKey, isBlank } from '../model.js';

export const PDF_CHECKED = '2026-10-24';

export const enc = encodeURIComponent;
export const kindHref = (kind, id) => (kind === 'bean' ? `#/bean/${enc(id)}` : kind === 'store' ? `#/store/${enc(id)}` : `#/a/${kind}/${enc(id)}`);

/** 情報の種類タグ。色だけでなく文字・罫線の形でも区別する */
export function infoTag(type, conf) {
  const label = type === 'fact' ? '事実' : type === 'tendency' ? '一般傾向' : type === 'suggestion' ? '提案' : '';
  return [
    label ? h('span', { class: `tag ${type}`, text: label }) : null,
    conf === 'editorial' ? h('span', { class: 'tag editorial', text: '編集メモ・要確認' }) : null,
  ];
}

export function sourceBlock(ids, { checkedAt = PDF_CHECKED } = {}) {
  const list = sourceList(ids);
  if (!list.length) return null;
  return h('section', { 'aria-label': '出典' },
    h('h2', { text: '出典' }),
    h('p', { class: 'small muted', text: `確認時点: ${checkedAt}（元の事典の記載による。このアプリで一次資料を再確認したものではありません）` }),
    h('ul', { class: 'list-plain small' }, list.map((s) => h('li', { style: 'margin:6px 0' }, s.url ? extLink(s.url, s.title) : h('span', { text: s.title })))));
}

export function latestTasting(repo, beanId) {
  const ts = sortTastings(repo.tastingsOf(beanId));
  return ts[0] || null;
}

export function sortTastings(ts) {
  return ts.slice().sort((a, b) => {
    const ka = dateSortKey(tastingDate(a)) + '|' + a.createdAt;
    const kb = dateSortKey(tastingDate(b)) + '|' + b.createdAt;
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  });
}

export function beanMeta(b) {
  const parts = [b.store, b.country, b.region].filter((x) => !isBlank(x));
  return parts.join(' ・ ');
}

export function beanCard(repo, b, { showTasting = true } = {}) {
  const t = showTasting ? latestTasting(repo, b.id) : null;
  const n = repo.tastingsOf(b.id).length;
  const d = t ? tastingDate(t) : b.recordDate;
  return h('a', { class: 'card', href: kindHref('bean', b.id) },
    h('h3', { text: beanTitle(b) }),
    h('div', { class: 'meta', text: [beanMeta(b), formatDateShort(d)].filter(Boolean).join('　') + (n > 1 ? `　感想${n}件` : '') }),
    t && !isBlank(t.text) ? h('div', { class: 'excerpt', text: t.text }) : null);
}

export function bookmarkButton(ctx, { kind, targetId, source, small = true }) {
  const { repo } = ctx;
  const btn = h('button', { class: 'btn btn-quiet' + (small ? ' btn-small' : ''), type: 'button' });
  const paint = () => {
    const bm = repo.findBookmark(kind, targetId);
    btn.textContent = bm ? '★ 気になるに保存済み' : '☆ 気になる';
    btn.setAttribute('aria-pressed', bm ? 'true' : 'false');
  };
  btn.addEventListener('click', () => guarded(async () => {
    const bm = repo.findBookmark(kind, targetId);
    if (bm) { await repo.removeBookmark(bm.id); toast('気になるから外しました'); }
    else {
      await repo.addBookmark({ kind, targetId, reason: source?.label ? `${source.label}から保存` : '', source });
      toast('気になるに保存しました');
    }
    paint();
  }, '保存できませんでした'));
  paint();
  return btn;
}

/** 記録のある産地・品種・精製の件数 */
export function usageCounts(repo) {
  const c = { country: new Map(), variety: new Map(), process: new Map() };
  const inc = (m, k) => m.set(k, (m.get(k) || 0) + 1);
  for (const b of repo.beans.values()) {
    const n = b.norm || {};
    if (n.countryId) inc(c.country, n.countryId);
    for (const v of n.varietyIds || []) inc(c.variety, v);
    for (const p of n.processIds || []) inc(c.process, p);
  }
  return c;
}

export function beansFor(repo, kind, id) {
  return [...repo.beans.values()].filter((b) => {
    const n = b.norm || {};
    return kind === 'country' ? n.countryId === id : kind === 'variety' ? (n.varietyIds || []).includes(id) : (n.processIds || []).includes(id);
  });
}

export function articleChip(kind, id, repo) {
  return h('a', { class: 'chip', href: kindHref(kind, id), text: articleTitle(kind, id) });
}

export const storeKey = (s) => normKey(s);

export function storeLink(store) {
  if (isBlank(store)) return null;
  return h('a', { href: kindHref('store', storeKey(store)), text: store });
}

export { link, extLink, safeUrl, formatDate, matchStoreInfo, getCountry, getVariety, getProcess, KIND_LABEL, articleTitle, getArticle, SOURCES, beanTitle };
