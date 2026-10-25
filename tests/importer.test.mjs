import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readXlsx } from '../app/js/xlsx.js';
import { makeXlsx, SAMPLE_ROWS, HEADER } from '../tools/make-xlsx.mjs';
import { parseSheet, buildPlan, applyPlan, beanToRow } from '../app/js/importer.js';
import { Repo, createMemoryAdapter } from '../app/js/db.js';
import { COLUMNS } from '../app/js/model.js';

const newRepo = async () => new Repo(createMemoryAdapter()).load();

async function sampleParsed(rows = SAMPLE_ROWS) {
  const { rows: grid, sheetName } = await readXlsx(makeXlsx(rows));
  return { parsed: parseSheet(grid), sheetName };
}

test('XLSX: 合成ファイルを読める', async () => {
  const { rows, sheetName } = await readXlsx(makeXlsx(SAMPLE_ROWS));
  assert.equal(sheetName, 'シート1');
  assert.equal(rows.length, SAMPLE_ROWS.length);
  assert.deepEqual(rows[0], HEADER);
});

test('見出しが違うファイルは取り込みを拒否する', async () => {
  const { rows } = await readXlsx(makeXlsx([['a', 'b'], ['1', '2']]));
  assert.throws(() => parseSheet(rows), /見出し行/);
});

test('壊れたファイルは分かる言葉で失敗する', async () => {
  await assert.rejects(() => readXlsx(new Uint8Array([1, 2, 3, 4, 5])), /XLSX/);
});

test('取り込み計画: 14列・日付精度・感想の有無', async () => {
  const repo = await newRepo();
  const { parsed, sheetName } = await sampleParsed();
  const plan = buildPlan(parsed, repo, { fileName: 'sample.xlsx', sheetName });
  assert.equal(plan.summary.rows, 5);
  assert.equal(plan.summary.add, 5);
  assert.equal(plan.summary.tastings, 4, '感想が空の行から感想を作らない');
  const byRow = Object.fromEntries(plan.items.map((i) => [i.rowNumber, i]));
  assert.equal(byRow[4].bean.recordDate.precision, 'month');
  assert.equal(byRow[4].bean.recordDate.date, '2025-09');
  assert.equal(byRow[4].bean.recordDate.raw, '25/9');
  assert.equal(byRow[2].bean.recordDate.precision, 'unknown');
  assert.equal(byRow[2].bean.recordDate.date, '', '空の日付に当日などを補わない');
  assert.equal(byRow[5].tasting, null);
  assert.equal(byRow[2].bean.norm.countryId, 'kenya');
  assert.equal(byRow[3].bean.norm.countryId, 'kenya');
  assert.notEqual(byRow[2].bean.id, byRow[3].bean.id, '同じ店・同じ国でも自動統合しない');
});

test('取り込み前後で14列の内容が失われない', async () => {
  const repo = await newRepo();
  const { parsed, sheetName } = await sampleParsed();
  const plan = buildPlan(parsed, repo, { fileName: 'sample.xlsx', sheetName });
  await applyPlan(repo, plan);
  for (const it of plan.items) {
    const bean = repo.beans.get(it.bean.id);
    const t = repo.tastingsOf(bean.id)[0];
    const original = parsed.rows.find((r) => r.rowNumber === it.rowNumber).values;
    assert.deepEqual(beanToRow(bean, t), original, `row ${it.rowNumber}`);
  }
  assert.equal(COLUMNS.length, 14);
});

test('同じファイルの再取り込みで増えない（追加0・スキップ全件）', async () => {
  const repo = await newRepo();
  const { parsed, sheetName } = await sampleParsed();
  await applyPlan(repo, buildPlan(parsed, repo, { fileName: 'sample.xlsx', sheetName }));
  const before = [repo.beans.size, repo.tastings.size];
  const plan2 = buildPlan(parsed, repo, { fileName: 'sample.xlsx', sheetName });
  assert.equal(plan2.summary.add, 0);
  assert.equal(plan2.summary.skip, 5);
  const r = await applyPlan(repo, plan2);
  assert.deepEqual([repo.beans.size, repo.tastings.size], before);
  assert.equal(r.added, 0);
  // ファイル名が変わっても内容が同じなら重複しない
  assert.equal(buildPlan(parsed, repo, { fileName: 'renamed.xlsx', sheetName }).summary.add, 0);
});

test('同一内容の行が2つあっても2件として取り込み、再取り込みで増えない', async () => {
  const dup = [HEADER, ['', 'A店', 'ケニア', 'X', '', '', '', '', '', '', '', 'メモ', '', ''], ['', 'A店', 'ケニア', 'X', '', '', '', '', '', '', '', 'メモ', '', '']];
  const repo = await newRepo();
  const { parsed } = await sampleParsed(dup);
  await applyPlan(repo, buildPlan(parsed, repo, {}));
  assert.equal(repo.beans.size, 2);
  assert.equal(buildPlan(parsed, repo, {}).summary.add, 0);
});

test('Excel側で行が変わると「更新」候補になり、既定では反映されない', async () => {
  const repo = await newRepo();
  const first = await sampleParsed();
  await applyPlan(repo, buildPlan(first.parsed, repo, { fileName: 's.xlsx', sheetName: first.sheetName }));
  const edited = SAMPLE_ROWS.map((r) => r.slice());
  const originalText = edited[1][11];
  edited[1][11] = '書き換えた感想';
  const second = await sampleParsed(edited);
  const plan = buildPlan(second.parsed, repo, { fileName: 's.xlsx', sheetName: second.sheetName });
  assert.equal(plan.summary.update, 1);
  assert.equal(plan.summary.add, 0);
  await applyPlan(repo, plan);
  assert.ok([...repo.tastings.values()].some((t) => t.text === originalText), '既定では更新しない');
  await applyPlan(repo, buildPlan(second.parsed, repo, { fileName: 's.xlsx', sheetName: second.sheetName }), { applyUpdates: true });
  assert.ok([...repo.tastings.values()].some((t) => t.text === '書き換えた感想'));
  assert.equal(repo.beans.size, 5);
});

test('空日付の「直前の年月を引き継ぐ」は選んだときだけ', async () => {
  const rows = [HEADER, ['25/9', 'A', 'ケニア', 'a', '', '', '', '', '', '', '', 'x', '', ''], ['', 'B', 'ケニア', 'b', '', '', '', '', '', '', '', 'y', '', '']];
  const repo = await newRepo();
  const { parsed } = await sampleParsed(rows);
  const off = buildPlan(parsed, repo, {});
  assert.equal(off.items[1].bean.recordDate.date, '');
  const on = buildPlan(parsed, repo, { inheritDate: true });
  assert.equal(on.items[1].bean.recordDate.date, '2025-09');
  assert.equal(on.items[1].bean.recordDate.raw, '', '原文は空のまま');
  assert.equal(on.items[1].bean.recordDate.inherited, true);
});

// ───── 実ファイル（個人データ）が手元にある場合のみ実行 ─────
const REAL = process.env.COFFEE_XLSX || 'C:/Users/skawa/Downloads/コーヒー探究.xlsx';
test('実Excel: 全行・14列が失われず、再取り込みで倍増しない', { skip: !fs.existsSync(REAL) }, async () => {
  const { rows, sheetName } = await readXlsx(fs.readFileSync(REAL));
  const parsed = parseSheet(rows);
  assert.equal(parsed.rows.length, 72);
  const repo = await newRepo();
  const plan = buildPlan(parsed, repo, { fileName: 'コーヒー探究.xlsx', sheetName });
  await applyPlan(repo, plan);
  assert.equal(repo.beans.size, 72);
  const withText = parsed.rows.filter((r) => r.cells.tasting.trim()).length;
  assert.equal(repo.tastings.size, withText);
  for (const it of plan.items) {
    const bean = repo.beans.get(it.bean.id);
    const orig = parsed.rows.find((r) => r.rowNumber === it.rowNumber).values;
    assert.deepEqual(beanToRow(bean, repo.tastingsOf(bean.id)[0]), orig);
  }
  const again = buildPlan(parsed, repo, { fileName: 'コーヒー探究.xlsx', sheetName });
  assert.equal(again.summary.add, 0);
  assert.equal(again.summary.skip, 72);
  // 受け入れシナリオ1: サイアム ブルームーン（タイ）
  const siam = [...repo.beans.values()].find((b) => b.name.includes('ブルームーン'));
  assert.equal(siam.norm.countryId, 'thailand');
  assert.deepEqual(siam.norm.varietyIds, ['catuai', 'bourbon']);
  assert.equal(siam.recordDate.precision, 'unknown');
  assert.ok(repo.tastingsOf(siam.id)[0].text.includes('ダークチョコ'));
});
