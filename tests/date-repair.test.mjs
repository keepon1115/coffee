import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COLUMNS, makeTasting } from '../app/js/model.js';
import { Repo, createMemoryAdapter } from '../app/js/db.js';
import { parseSheet, buildPlan, applyPlan } from '../app/js/importer.js';
import { buildDateRepairPlan, applyDateRepair } from '../app/js/date-repair.js';
import { readXlsx } from '../app/js/xlsx.js';

async function setup(cells) {
  const parsed = parseSheet([COLUMNS.map((c) => c.header), ...cells.map((r) => COLUMNS.map((c) => r[c.key] || ''))]);
  const repo = await new Repo(createMemoryAdapter()).load();
  await applyPlan(repo, buildPlan(parsed, repo, { fileName: 'old.xlsx', sheetName: 'シート1' }));
  return { repo, parsed };
}
const opts = { sheetName: 'シート1' };
const byRow = (repo, row) => [...repo.beans.values()].find((b) => b.source.row === row);

test('日付だけ補完: 9月より前・既知の日付・感想の追記・再実行を保持', async () => {
  const { repo, parsed } = await setup([
    { store: '不明店', tasting: '昔の感想' },
    { date: '25/9', store: '月の目印' },
    { store: '誠', country: 'コロンビア', tasting: '元の感想' },
    { date: '25/10', store: '月の目印2' },
    { store: 'SOT COFFEE ROASTER', country: 'ブレンド', name: 'Oshiro' },
  ]);
  const bean = byRow(repo, 4), t = repo.tastingsOf(bean.id)[0];
  await repo.saveBean({ ...bean, aiMemo: 'アプリで追記', shopNote: '変更済み' });
  await repo.saveTasting({ ...t, text: '編集した感想\nさらに追記', updatedAt: '2026-10-28T00:00:00Z' });
  const manual = makeTasting(bean.id, '後から追加', { date: '', precision: 'unknown', raw: '' });
  await repo.saveTasting(manual);
  const beforeBeans = structuredClone([...repo.beans.values()]);
  const beforeTastings = structuredClone([...repo.tastings.values()]);
  const beforeSettings = structuredClone(repo.settings);
  const plan = buildDateRepairPlan(parsed, repo, opts);
  assert.equal(plan.items.length, 2);
  assert.deepEqual(await applyDateRepair(repo, plan), { beans: 2, tastings: 1 });
  assert.equal(repo.beans.get(bean.id).recordDate.date, '2025-09-01');
  assert.equal(byRow(repo, 6).recordDate.date, '2025-10-01');
  for (const b of beforeBeans) {
    const current = { ...repo.beans.get(b.id), recordDate: b.recordDate };
    assert.deepEqual(current, b, '豆の日付以外は一切変えない');
    if (![4, 6].includes(b.source.row)) assert.deepEqual(repo.beans.get(b.id), b);
  }
  for (const old of beforeTastings) {
    const current = repo.tastings.get(old.id);
    if (old.id !== t.id) assert.deepEqual(current, old);
    else assert.deepEqual({ ...current, date: old.date, precision: old.precision, rawDate: old.rawDate }, old);
  }
  assert.deepEqual(repo.settings, beforeSettings);
  assert.deepEqual(await applyDateRepair(repo, plan), { beans: 0, tastings: 0 });
});

test('同名の別月は行情報で区別し、行情報なしの曖昧な一致は見送る', async () => {
  const { repo, parsed } = await setup([
    { date: '25/12', store: '店', country: 'KENYA', name: 'GATHAITHI' },
    { date: '26/8', store: '月の目印' },
    { store: '店', country: 'KENYA', name: 'GATHAITHI' },
  ]);
  const plan = buildDateRepairPlan(parsed, repo, opts);
  assert.equal(plan.items[0].beanId, byRow(repo, 4).id);
  assert.equal(plan.items[0].date, '2026-08-01');
  for (const b of repo.beans.values()) b.source = { type: 'manual' };
  assert.equal(buildDateRepairPlan(parsed, repo, opts).items.length, 0);
});

test('ファイル名・感想が変わっても三項目で照合し、既存日付と解釈不能の原文は保持', async () => {
  const { repo, parsed } = await setup([
    { date: '25/9', store: '目印' },
    { store: ' 店 ', country: 'KENYA', name: '豆', tasting: '古い感想' },
    { date: '解釈不能', store: '中断' },
    { store: '未確定' },
  ]);
  const b = byRow(repo, 3);
  b.country = 'ケニア';
  b.name = '豆';
  parsed.rows[1].cells.tasting = 'Excelで変更';
  assert.equal(buildDateRepairPlan(parsed, repo, opts).items.length, 1);
  b.recordDate = { date: '', raw: '要確認', precision: 'unknown' };
  assert.equal(buildDateRepairPlan(parsed, repo, opts).items.length, 0);
  b.recordDate = { date: '2025-09-14', raw: '2025-09-14', precision: 'day' };
  assert.equal(buildDateRepairPlan(parsed, repo, opts).items.length, 0);
});

test('保存失敗時は豆も感想も変わらない', async () => {
  const { repo, parsed } = await setup([{ date: '25/9', store: '目印' }, { store: '店', tasting: '感想' }]);
  const plan = buildDateRepairPlan(parsed, repo, opts);
  const before = structuredClone([...repo.beans.values(), ...repo.tastings.values()]);
  repo.adapter.tx = async () => { throw Error('保存失敗'); };
  await assert.rejects(applyDateRepair(repo, plan), /保存失敗/);
  assert.deepEqual([...repo.beans.values(), ...repo.tastings.values()], before);
});

const realPath = 'C:/Users/skawa/Downloads/コーヒー探究 (1).xlsx';
test('実Excel: 空欄24件だけを補完し、9月以前31件と全追記を保持', { skip: !fs.existsSync(realPath) }, async () => {
  const sheet = await readXlsx(fs.readFileSync(realPath));
  const parsed = parseSheet(sheet.rows);
  const repo = await new Repo(createMemoryAdapter()).load();
  await applyPlan(repo, buildPlan(parsed, repo, { fileName: 'コーヒー探究.xlsx', sheetName: sheet.sheetName }));
  const plan = buildDateRepairPlan(parsed, repo, { sheetName: sheet.sheetName });
  assert.equal(plan.items.length, 24);
  assert.equal(plan.skipped.length, 0);
  const before = structuredClone([...repo.beans.values()]);
  await applyDateRepair(repo, plan);
  assert.equal(byRow(repo, 35).recordDate.date, '2025-09-01');
  assert.equal(byRow(repo, 41).recordDate.date, '2025-10-01');
  assert.equal(byRow(repo, 68).recordDate.date, '2026-08-01');
  assert.equal([...repo.beans.values()].filter((b) => !b.recordDate.date).length, 31);
  for (const b of before) assert.deepEqual({ ...repo.beans.get(b.id), recordDate: b.recordDate }, b);
});
