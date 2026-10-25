// データモデル（Bean / Tasting）と日付の扱い。値は原文をそのまま保持する。
import { deriveNorm } from './knowledge.js';

export const SCHEMA_VERSION = 1;

/** Excelの14列 → Beanのどの項目へ行くか（日付と感想は Bean/Tasting に分かれる） */
export const COLUMNS = [
  { header: '日付', key: 'date' },
  { header: '店名/購入場所', key: 'store' },
  { header: '原産国', key: 'country' },
  { header: '名称', key: 'name' },
  { header: '生産地', key: 'region' },
  { header: '生産者', key: 'producer' },
  { header: '精製所/農園', key: 'farm' },
  { header: '標高', key: 'altitude' },
  { header: '精製方法', key: 'process' },
  { header: '品種', key: 'variety' },
  { header: 'フレーバーノート', key: 'shopNote' },
  { header: '感想', key: 'tasting' },
  { header: 'URL', key: 'url' },
  { header: 'AIメモ', key: 'aiMemo' },
];

export const BEAN_TEXT_KEYS = ['store', 'country', 'name', 'region', 'producer', 'farm', 'altitude', 'process', 'variety', 'shopNote', 'url', 'aiMemo', 'roast'];

let seq = 0;
export function uid(prefix) {
  const r = (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${(seq++).toString(36)}`).replace(/-/g, '').slice(0, 20);
  return `${prefix}_${r}`;
}

export const nowIso = () => new Date().toISOString();

export function todayLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ───── 日付: { date: 'YYYY-MM-DD' | 'YYYY-MM' | '', precision: 'day'|'month'|'unknown', raw } ─────
const pad = (n) => String(n).padStart(2, '0');

function validYM(y, m) { return y >= 1900 && y <= 2200 && m >= 1 && m <= 12; }
function validYMD(y, m, d) {
  if (!validYM(y, m) || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 原文から日付と精度を推定する。根拠のない日付は補わない（unknown）。 */
export function parseDate(rawInput) {
  const raw = rawInput == null ? '' : String(rawInput);
  const s = raw.normalize('NFKC').trim();
  const unknown = { date: '', precision: 'unknown', raw };
  if (!s) return unknown;
  let m;
  // 26/10, 25/9（年下2桁/月）。月として有効なときだけ年月とみなす
  if ((m = s.match(/^(\d{2})\s*[\/.\-]\s*(\d{1,2})$/))) {
    const y = 2000 + +m[1], mo = +m[2];
    if (validYM(y, mo)) return { date: `${y}-${pad(mo)}`, precision: 'month', raw };
    return unknown;
  }
  if ((m = s.match(/^(\d{4})\s*[\/.\-年]\s*(\d{1,2})\s*[\/.\-月]\s*(\d{1,2})\s*日?$/))) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return validYMD(y, mo, d) ? { date: `${y}-${pad(mo)}-${pad(d)}`, precision: 'day', raw } : unknown;
  }
  if ((m = s.match(/^(\d{4})\s*[\/.\-年]\s*(\d{1,2})\s*月?$/))) {
    const [y, mo] = [+m[1], +m[2]];
    return validYM(y, mo) ? { date: `${y}-${pad(mo)}`, precision: 'month', raw } : unknown;
  }
  return unknown;
}

/** フォーム入力（YYYY-MM-DD / YYYY-MM / 空）→ 日付オブジェクト。raw は編集前の原文があれば維持 */
export function dateFromInput(value, prev) {
  const v = String(value ?? '').trim();
  if (prev && v === (prev.date || '')) return { ...prev };
  const p = parseDate(v);
  return { date: p.date, precision: p.precision, raw: p.precision === 'unknown' ? v : v };
}

export function formatDate(d) {
  if (!d || !d.date) return d && d.raw ? `日付不明（元の表記: ${d.raw}）` : '日付不明';
  const [y, m, day] = d.date.split('-');
  return d.precision === 'month' || !day ? `${y}年${+m}月` : `${y}年${+m}月${+day}日`;
}

export function formatDateShort(d) {
  if (!d || !d.date) return '日付不明';
  const [y, m, day] = d.date.split('-');
  return d.precision === 'month' || !day ? `${y}/${+m}` : `${y}/${+m}/${+day}`;
}

/** 並べ替え用キー。月だけの日付はその月の末日扱い（日付があるものが先、不明は最後） */
export function dateSortKey(d) {
  if (!d || !d.date) return '';
  return d.date.length === 7 ? `${d.date}-99` : d.date;
}

// ───── Bean / Tasting ─────
export function emptyBean() {
  const b = {};
  for (const k of BEAN_TEXT_KEYS) b[k] = '';
  return b;
}

export function makeBean(fields, { id, recordDate, source, createdAt } = {}) {
  const t = createdAt || nowIso();
  const bean = {
    ...emptyBean(),
    ...pick(fields, BEAN_TEXT_KEYS),
    id: id || uid('bean'),
    recordDate: recordDate || { date: '', precision: 'unknown', raw: '' },
    source: source || { type: 'manual' },
    createdAt: t,
    updatedAt: t,
  };
  bean.norm = deriveNorm(bean);
  return bean;
}

export function makeTasting(beanId, text, date, { id, source, createdAt } = {}) {
  const t = createdAt || nowIso();
  return {
    id: id || uid('tast'),
    beanId,
    text: String(text ?? ''),
    date: date?.date || '',
    precision: date?.precision || 'unknown',
    rawDate: date?.raw ?? '',
    source: source || { type: 'manual' },
    createdAt: t,
    updatedAt: t,
  };
}

export const tastingDate = (t) => ({ date: t.date, precision: t.precision, raw: t.rawDate });

function pick(o, keys) {
  const r = {};
  for (const k of keys) if (o && o[k] != null) r[k] = String(o[k]);
  return r;
}

export const isBlank = (s) => !String(s ?? '').trim();

/** 豆の表示名: 名称 → 店名 → （無題） */
export function beanTitle(b) {
  if (!isBlank(b.name)) return b.name;
  if (!isBlank(b.store)) return `${b.store}の豆`;
  return '（名称なし）';
}

export function hasMinimum(fields) {
  return !isBlank(fields.name) || !isBlank(fields.store);
}

/** 豆の更新（原文を保ったまま項目を差し替え、正規化値を再計算） */
export function updateBean(bean, fields, recordDate) {
  const next = { ...bean, ...pick(fields, BEAN_TEXT_KEYS), updatedAt: nowIso() };
  if (recordDate) next.recordDate = recordDate;
  next.norm = deriveNorm(next);
  return next;
}

/** 検索用に一つの文字列へ（豆の項目と感想の原文） */
export function beanSearchText(bean, tastings) {
  return [bean.name, bean.store, bean.country, bean.region, bean.producer, bean.farm, bean.altitude, bean.process, bean.variety, bean.shopNote, bean.roast, ...(tastings || []).map((t) => t.text)]
    .filter(Boolean).join('\n');
}
