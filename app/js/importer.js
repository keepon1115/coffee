// Excel（14列）からの取り込み。プレビュー用の計画を作り、確認後に反映する。
// 各行をまず独立した豆として取り込み、同名の豆を自動統合しない。感想が空の行から空の感想を作らない。
import { COLUMNS, parseDate, makeBean, makeTasting, isBlank } from './model.js';

/** 内容ハッシュ（重複検出用。暗号用途ではない） */
export function hashRow(cells) {
  const s = cells.join('\u0001');
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** シートの2次元配列 → 行データ。見出しを確認し、列の位置は見出し名で解決する */
export function parseSheet(rows) {
  if (!rows || !rows.length) throw new Error('シートが空です');
  const header = (rows[0] || []).map((c) => String(c ?? '').trim());
  const idx = COLUMNS.map((c) => header.indexOf(c.header));
  const missing = COLUMNS.filter((c, i) => idx[i] < 0).map((c) => c.header);
  if (missing.length) throw new Error(`見出し行に次の列が見つかりません: ${missing.join('、')}（期待する14列: ${COLUMNS.map((c) => c.header).join('／')}）`);
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const cells = {};
    COLUMNS.forEach((c, i) => { cells[c.key] = row[idx[i]] == null ? '' : String(row[idx[i]]); });
    const values = COLUMNS.map((c) => cells[c.key]);
    if (values.every(isBlank)) continue; // 完全な空行
    out.push({ rowNumber: r + 1, cells, values });
  }
  return { rows: out, extraColumns: header.filter((h, i) => h && !idx.includes(i)) };
}

/**
 * 取り込み計画を作る。
 * existing: { beans: Map } 既存の豆。
 * opts: { fileName, sheetName, inheritDate: boolean, importedAt }
 */
export function buildPlan(parsed, existing, opts = {}) {
  const { fileName = 'import.xlsx', sheetName = 'シート1', inheritDate = false } = opts;
  const sourceId = `xlsx:${fileName}:${sheetName}`;
  const importedAt = opts.importedAt || new Date().toISOString();
  const base = Date.parse(importedAt);

  const byKey = new Map();
  const byRow = new Map();
  for (const b of existing.beans.values()) {
    if (b.source?.type === 'xlsx') {
      byKey.set(b.source.key, b);
      if (b.source.sourceId === sourceId) byRow.set(b.source.row, b);
    }
  }

  const occ = new Map();
  const keysInFile = new Set();
  const prepared = parsed.rows.map((row) => {
    const h = hashRow(row.values);
    const n = (occ.get(h) || 0) + 1;
    occ.set(h, n);
    const key = `${h}#${n}`;
    keysInFile.add(key);
    return { ...row, key };
  });

  let lastMonth = null;
  const items = [];
  prepared.forEach((row, i) => {
    const c = row.cells;
    let date = parseDate(c.date);
    let inherited = false;
    if (isBlank(c.date)) {
      if (inheritDate && lastMonth) { date = { date: lastMonth, precision: 'month', raw: c.date }; inherited = true; }
    } else if (date.date) lastMonth = date.date.slice(0, 7);

    const createdAt = new Date(base + i).toISOString();
    const source = { type: 'xlsx', sourceId, fileName, sheet: sheetName, row: row.rowNumber, key: row.key };
    const warnings = [];
    if (isBlank(c.name) && isBlank(c.store)) warnings.push('名称も店名もありません（そのまま取り込みます）');
    if (!isBlank(c.date) && !date.date) warnings.push(`日付の形式を解釈できませんでした（元の表記を残します）: ${c.date}`);

    const item = { rowNumber: row.rowNumber, key: row.key, date, inherited, warnings, summary: { name: c.name, store: c.store, country: c.country }, hasTasting: !isBlank(c.tasting) };

    const sameKey = byKey.get(row.key);
    if (sameKey) { items.push({ ...item, action: 'skip', reason: '同じ内容が取り込み済み', beanId: sameKey.id }); return; }

    const sameRow = byRow.get(row.rowNumber);
    const fields = {
      store: c.store, country: c.country, name: c.name, region: c.region, producer: c.producer, farm: c.farm,
      altitude: c.altitude, process: c.process, variety: c.variety, shopNote: c.shopNote, url: c.url, aiMemo: c.aiMemo,
    };
    if (sameRow && !keysInFile.has(sameRow.source.key)) {
      items.push({ ...item, action: 'update', reason: `${row.rowNumber}行目の内容がExcelで変わっています`, beanId: sameRow.id, fields, tastingText: c.tasting, source, importedDate: date });
      return;
    }
    const bean = makeBean(fields, { recordDate: { date: date.date, precision: date.precision, raw: c.date, ...(inherited ? { inherited: true } : {}) }, source, createdAt });
    let tasting = null;
    if (!isBlank(c.tasting)) {
      tasting = makeTasting(bean.id, c.tasting, { date: date.date, precision: date.precision, raw: c.date }, { source, createdAt });
    }
    items.push({ ...item, action: 'add', reason: '新しい記録として追加', bean, tasting });
  });

  const count = (a) => items.filter((x) => x.action === a).length;
  return {
    sourceId, fileName, sheetName, importedAt, inheritDate, items,
    summary: {
      rows: items.length,
      add: count('add'), update: count('update'), skip: count('skip'),
      tastings: items.filter((x) => x.action === 'add' && x.tasting).length,
      blankDates: items.filter((x) => x.date.precision === 'unknown' && !x.inherited).length,
      monthDates: items.filter((x) => x.date.precision === 'month' && !x.inherited).length,
      inheritedDates: items.filter((x) => x.inherited).length,
      warnings: items.reduce((n, x) => n + x.warnings.length, 0),
    },
    extraColumns: parsed.extraColumns || [],
  };
}

/**
 * 計画を保存する。applyUpdates=true のとき update 行も反映（Excel側の内容で14列を上書き）。
 * 追加・更新・取り込み履歴を1つのトランザクションで保存する。
 */
export async function applyPlan(repo, plan, { applyUpdates = false } = {}) {
  const ops = [];
  let added = 0, updated = 0, skipped = 0;
  for (const it of plan.items) {
    if (it.action === 'add') {
      ops.push(['put', 'beans', it.bean]);
      if (it.tasting) ops.push(['put', 'tastings', it.tasting]);
      added++;
    } else if (it.action === 'update' && applyUpdates) {
      const bean = repo.beans.get(it.beanId);
      if (!bean) continue;
      const next = makeBean({ ...bean, ...it.fields, roast: bean.roast }, { id: bean.id, recordDate: it.importedDate ? { date: it.importedDate.date, precision: it.importedDate.precision, raw: it.importedDate.raw } : bean.recordDate, source: it.source, createdAt: bean.createdAt });
      next.updatedAt = new Date().toISOString();
      ops.push(['put', 'beans', next]);
      // 取り込み由来で、手で編集していない感想だけ更新する
      const imported = repo.tastingsOf(bean.id).find((t) => t.source?.type === 'xlsx' && t.createdAt === t.updatedAt);
      if (imported && !isBlank(it.tastingText)) ops.push(['put', 'tastings', { ...imported, text: it.tastingText, source: it.source, date: next.recordDate.date, precision: next.recordDate.precision, rawDate: next.recordDate.raw }]);
      else if (!imported && !isBlank(it.tastingText) && repo.tastingsOf(bean.id).length === 0) {
        ops.push(['put', 'tastings', makeTasting(bean.id, it.tastingText, next.recordDate, { source: it.source })]);
      }
      updated++;
    } else skipped++;
  }
  const history = [...(repo.settings.imports || []), { id: `imp_${Date.now().toString(36)}`, fileName: plan.fileName, sourceId: plan.sourceId, importedAt: plan.importedAt, rows: plan.summary.rows, added, updated, skipped, inheritDate: plan.inheritDate }];
  ops.push(['put', 'meta', { ...repo.settings, key: 'settings', imports: history }]);
  await repo.commit(ops);
  return { added, updated, skipped };
}

/** 豆の記録から元の14列の値へ戻す（取り込みの損失確認・CSV検証用） */
export function beanToRow(bean, tasting) {
  return COLUMNS.map((c) => {
    if (c.key === 'date') return bean.recordDate?.raw ?? '';
    if (c.key === 'tasting') return tasting ? tasting.text : '';
    return bean[c.key] ?? '';
  });
}
