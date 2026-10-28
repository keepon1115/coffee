// Excelの空欄日付だけを補う。感想や豆の説明を再取り込みしない。
import { parseDate, isBlank } from './model.js';
import { matchCountry } from './knowledge.js';

const textKey = (s) => String(s ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
const identity = (b) => JSON.stringify([textKey(b.store), matchCountry(b.country) || textKey(b.country), textKey(b.name)]);
const emptyDate = (d) => isBlank(d?.date) && isBlank(d?.raw);

export function buildDateRepairPlan(parsed, repo, { sheetName } = {}) {
  let month = '';
  const rows = parsed.rows.map((row) => {
    const c = row.cells;
    if (!isBlank(c.date)) month = parseDate(c.date).date.slice(0, 7);
    return { ...row, identity: identity(c), date: isBlank(c.date) && month >= '2025-09' ? `${month}-01` : '' };
  });
  const items = [], skipped = [];
  for (const row of rows.filter((r) => r.date)) {
    const sameRows = rows.filter((r) => r.identity === row.identity);
    const candidates = [...repo.beans.values()].filter((b) => identity(b) === row.identity);
    // 同じ商品が別の月にも登場する場合は、Excel由来の行情報が一致するときだけ使う。
    const fromRow = candidates.filter((b) => b.source?.type === 'xlsx' && b.source.row === row.rowNumber && b.source.sheet === sheetName);
    const matches = fromRow.length ? fromRow : sameRows.length === 1 && candidates.length === 1 ? candidates : [];
    if (matches.length !== 1) {
      skipped.push({ rowNumber: row.rowNumber, reason: candidates.length ? '同名の記録が複数あり特定できません' : '一致する既存の記録がありません' });
      continue;
    }
    const bean = matches[0];
    if (!emptyDate(bean.recordDate)) continue;
    items.push({ beanId: bean.id, rowNumber: row.rowNumber, date: row.date, store: bean.store, country: bean.country, name: bean.name });
  }
  // 複数のExcel行が同じ既存レコードを指す場合も自動的には決めない。
  const unique = items.filter((it) => {
    if (items.filter((x) => x.beanId === it.beanId).length === 1) return true;
    skipped.push({ rowNumber: it.rowNumber, reason: '複数の行が同じ記録に一致します' });
    return false;
  });
  return { items: unique, skipped, eligibleRows: rows.filter((r) => r.date).length };
}

export async function applyDateRepair(repo, plan) {
  const ops = [];
  let beans = 0, tastings = 0;
  for (const it of plan.items) {
    const b = repo.beans.get(it.beanId);
    if (!b || !emptyDate(b.recordDate) || identity(b) !== identity(it)) continue;
    ops.push(['put', 'beans', { ...b, recordDate: { ...b.recordDate, date: it.date, precision: 'day', raw: b.recordDate?.raw ?? '', inherited: true } }]);
    beans++;
    for (const t of repo.tastingsOf(b.id)) {
      // 後から追加した感想の「飲んだ日」は推測しない。元の取り込みの感想だけ補う。
      if (t.source?.type !== 'xlsx' || !b.source || t.source.key !== b.source.key || t.source.sourceId !== b.source.sourceId || t.source.row !== b.source.row || !emptyDate({ date: t.date, raw: t.rawDate })) continue;
      ops.push(['put', 'tastings', { ...t, date: it.date, precision: 'day', rawDate: t.rawDate ?? '' }]);
      tastings++;
    }
  }
  if (ops.length) await repo.commit(ops);
  return { beans, tastings };
}
