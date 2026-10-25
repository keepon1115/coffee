// 知識データの索引と、入力原文 → 正規化値（国・品種・精製）への対応づけ。
// 原文は書き換えず、検索・リンク用の別の値として導出する。
import { COUNTRIES, VARIETIES, PROCESSES, THEMES, JOURNEY, HISTORY, STORES, STORES_CHECKED_AT, SOURCES } from './knowledge-data.js';

export { COUNTRIES, VARIETIES, PROCESSES, THEMES, JOURNEY, HISTORY, STORES, STORES_CHECKED_AT, SOURCES };

export const NORM_VERSION = 1;

/** 照合用キー: 全角半角・大小文字・アクセント・空白と記号を無視 */
export function normKey(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[\s\-_.・･'’`]/g, '');
}

function aliasMap(list, extra = (a) => a.aliases) {
  const m = new Map();
  for (const a of list) {
    for (const k of [a.name, a.en, a.id, ...(extra(a) || [])]) {
      if (!k) continue;
      const key = normKey(k);
      if (key && !m.has(key)) m.set(key, a.id);
    }
  }
  return m;
}

const countryMap = aliasMap(COUNTRIES);
const varietyMap = aliasMap(VARIETIES);

export function matchCountry(raw) {
  const key = normKey(raw);
  if (!key) return null;
  return countryMap.get(key) || null;
}

const NOISE = /^(など|他|etc|不明|unknown|-|—|\?|？)$/i;

export function splitVarietyTokens(raw) {
  return String(raw ?? '')
    .normalize('NFKC')
    .replace(/[()（）[\]【】]/g, ',')
    .split(/[,、，/／＋+&;；\n・]|\band\b|および|及び/i)
    .map((t) => t.trim().replace(/^(and|&)\s+/i, '').replace(/(他|など|etc\.?)$/i, '').trim())
    .filter((t) => t && !NOISE.test(t));
}

export function matchVarieties(raw) {
  const ids = [];
  for (const tok of splitVarietyTokens(raw)) {
    let key = normKey(tok).replace(/(種|系)$/, '');
    let id = varietyMap.get(key);
    if (!id) {
      const m = key.match(/^(red|orange|yellow|レッド|オレンジ|イエロー)(.+)$/);
      if (m) id = varietyMap.get(m[2]);
    }
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

// 精製は「語句が含まれるか」で複数値を取る。パルプドナチュラルはハニーとして扱い、ナチュラルとは重ねない。
const PROCESS_PATTERNS = [
  ['washed', /washed|ウォッシュ|水洗/i],
  ['natural', /natural|ナチュラル/i],
  ['honey', /honey|ハニー/i],
  ['wet-hulled', /wet.?hulled|giling|スマトラ式|ギリング/i],
  ['kenya-style', /ケニア式|double.?washed|ダブルウォッシュ/i],
  ['anaerobic', /anaerobic|アナエロ/i],
  ['carbonic', /carbonic|カーボニック/i],
  ['yeast-starter', /スターター|starter|yeast|酵母/i],
  ['co-ferment', /co.?ferment|コファーメント/i],
  ['infused', /infused|インフューズド/i],
  ['thermal-shock', /thermal.?shock|サーマルショック/i],
];

export function matchProcesses(raw) {
  let s = String(raw ?? '').normalize('NFKC');
  const ids = [];
  if (/pulped\s*natural|パルプド/i.test(s)) {
    ids.push('honey');
    s = s.replace(/pulped\s*natural|パルプドナチュラル|パルプド/gi, ' ');
  }
  if (/double.?washed|ダブルウォッシュ/i.test(s)) s = s.replace(/double.?washed|ダブルウォッシュド?/gi, ' KENYA_STYLE ');
  for (const [id, re] of PROCESS_PATTERNS) {
    if (id === 'kenya-style') { if (s.includes('KENYA_STYLE') || /ケニア式/.test(s)) ids.push(id); continue; }
    if (re.test(s) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Beanから検索・絞り込み用の正規化値を導出（原文は変更しない） */
export function deriveNorm(bean) {
  return {
    v: NORM_VERSION,
    countryId: matchCountry(bean.country),
    varietyIds: matchVarieties(bean.variety),
    processIds: matchProcesses(bean.process),
  };
}

const KIND_LIST = { country: COUNTRIES, variety: VARIETIES, process: PROCESSES };
const byId = Object.fromEntries(Object.entries(KIND_LIST).map(([k, l]) => [k, new Map(l.map((a) => [a.id, a]))]));
const themeMap = new Map(THEMES.map((t) => [t.id, t]));
const storeMap = new Map(STORES.map((s) => [s.id, s]));

export const getCountry = (id) => byId.country.get(id) || null;
export const getVariety = (id) => byId.variety.get(id) || null;
export const getProcess = (id) => byId.process.get(id) || null;
export const getTheme = (id) => themeMap.get(id) || null;
export const getStoreInfo = (id) => storeMap.get(id) || null;
export const getArticle = (kind, id) => (byId[kind] ? byId[kind].get(id) : null) || null;

export function articleTitle(kind, id) {
  if (kind === 'theme') return getTheme(id)?.title || id;
  if (kind === 'store') return getStoreInfo(id)?.name || id;
  return getArticle(kind, id)?.name || id;
}

export const KIND_LABEL = { country: '産地', variety: '品種', process: '精製', theme: '比較テーマ', store: '店', bean: '豆', comparison: '比較' };

/** 記録の店名から、紹介のある店を探す（無ければ null）。店名の完全な同一視はしない。 */
export function matchStoreInfo(storeText) {
  const k = normKey(storeText);
  if (!k) return null;
  return STORES.find((s) => s.match.some((m) => k.includes(normKey(m)))) || null;
}

/** 事典の文字検索 */
export function searchKnowledge(q) {
  const k = normKey(q);
  if (!k) return [];
  const out = [];
  const test = (...vals) => vals.some((v) => v && normKey(v).includes(k));
  for (const c of COUNTRIES) if (test(c.name, c.en, ...(c.aliases || []), c.summary, ...c.regions.map((r) => r.name))) out.push({ kind: 'country', id: c.id, title: c.name, sub: c.summary });
  for (const v of VARIETIES) if (test(v.name, ...(v.aliases || []), v.lineage, v.flavor)) out.push({ kind: 'variety', id: v.id, title: v.name, sub: v.lineage });
  for (const p of PROCESSES) if (test(p.name, ...(p.aliases || []), p.steps, p.flavor)) out.push({ kind: 'process', id: p.id, title: p.name, sub: p.steps });
  for (const t of THEMES) if (test(t.title, t.body)) out.push({ kind: 'theme', id: t.id, title: t.title, sub: t.learn || '' });
  for (const s of STORES) if (test(s.name, s.area, s.body)) out.push({ kind: 'store', id: s.id, title: s.name, sub: s.area });
  return out;
}

export function sourceList(ids) {
  return (ids || []).map((id) => ({ id, ...(SOURCES[id] || { title: id, url: null }) }));
}
