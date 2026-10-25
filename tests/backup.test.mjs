import test from 'node:test';
import assert from 'node:assert/strict';
import { Repo, createMemoryAdapter } from '../app/js/db.js';
import { makeBean, makeTasting, parseDate } from '../app/js/model.js';
import { buildBackup, validateBackup, restoreBackup, buildCsv, csvCell, CSV_HEADERS, parseBackupText } from '../app/js/backup.js';

async function seeded() {
  const repo = await new Repo(createMemoryAdapter()).load();
  const a = makeBean({ name: '豆A', store: '店', country: 'ケニア', variety: 'SL28, SL34', process: 'Washed' }, { recordDate: parseDate('26/10') });
  const b = makeBean({ name: '豆B "引用" ,カンマ', store: '店2', country: 'KENYA', shopNote: '=SUM(A1)', url: 'https://example.com' }, { recordDate: parseDate('') });
  const c = makeBean({ name: '豆A', store: '店' }, { recordDate: parseDate('2026-10-25') }); // 同名の別豆
  await repo.commit([['put', 'beans', a], ['put', 'beans', b], ['put', 'beans', c]]);
  await repo.saveTasting(makeTasting(a.id, '1回目\n改行あり', parseDate('26/10')));
  await repo.saveTasting(makeTasting(a.id, '2回目の感想', parseDate('2026-10-25')));
  await repo.saveTasting(makeTasting(b.id, '長い感想'.repeat(300), parseDate('')));
  await repo.addBookmark({ kind: 'country', targetId: 'ethiopia', reason: '記録にまだない産地' });
  await repo.addBookmark({ kind: 'bean', targetId: a.id, reason: '再訪' });
  await repo.saveComparison({ beanIds: [a.id, b.id], tastingIds: [null, null], theme: '同じ産地', note: '一言' });
  await repo.saveSettings({ imports: [{ id: 'i1', fileName: 'x.xlsx' }] });
  return { repo, a, b, c };
}

const snapshot = (repo) => JSON.stringify(buildBackup(repo, new Date(0)).data);

test('JSON往復: ID・原文・履歴・しおり・比較が一致する', async () => {
  const { repo } = await seeded();
  const json = JSON.stringify(buildBackup(repo));
  const other = await new Repo(createMemoryAdapter()).load(); // 別の空の保存領域
  const counts = await restoreBackup(other, parseBackupText(json));
  assert.deepEqual(counts, { beans: 3, tastings: 3, bookmarks: 2, comparisons: 1 });
  assert.equal(snapshot(other), snapshot(repo));
  assert.equal(other.settings.imports.length, 1);
  // 復元後に再読込しても同じ
  await other.load();
  assert.equal(snapshot(other), snapshot(repo));
});

test('不正なバックアップは拒否し、既存データを変えない', async () => {
  const { repo } = await seeded();
  const before = snapshot(repo);
  const good = buildBackup(repo);
  const cases = [
    ['配列でない', { ...good, data: { ...good.data, beans: {} } }],
    ['別アプリ', { ...good, app: 'other' }],
    ['新しすぎる版', { ...good, schemaVersion: 99 }],
    ['孤立した感想', { ...good, data: { ...good.data, tastings: [...good.data.tastings, { id: 'x', beanId: 'nope', text: 't' }] } }],
    ['id重複', { ...good, data: { ...good.data, beans: [good.data.beans[0], good.data.beans[0]] } }],
    ['比較が不正', { ...good, data: { ...good.data, comparisons: [{ id: 'c', beanIds: ['zzz', 'yyy'] }] } }],
    ['null', null],
    ['文字列', 'abc'],
  ];
  for (const [name, bad] of cases) {
    assert.equal(validateBackup(bad).ok, false, name);
    await assert.rejects(() => restoreBackup(repo, bad), undefined, name);
    assert.equal(snapshot(repo), before, `${name}: 既存データが変わった`);
  }
  assert.throws(() => parseBackupText('{壊れた'), /JSON/);
});

test('復元の保存中に失敗しても既存データが残る（トランザクション全体を取り消す）', async () => {
  const { repo } = await seeded();
  const before = snapshot(repo);
  const real = repo.adapter.tx.bind(repo.adapter);
  repo.adapter.tx = (names, mode, fn) => real(names, mode, async (t) => {
    const wrapped = { ...t, put: async (s, v) => { if (s === 'tastings') throw new Error('保存失敗'); return t.put(s, v); } };
    return fn(wrapped);
  });
  const other = await new Repo(createMemoryAdapter()).load();
  const backup = buildBackup(other);
  backup.data.beans = [makeBean({ name: '新' })];
  backup.data.tastings = [makeTasting(backup.data.beans[0].id, 'x', parseDate(''))];
  await assert.rejects(() => restoreBackup(repo, backup), /保存失敗/);
  repo.adapter.tx = real;
  await repo.load();
  assert.equal(snapshot(repo), before);
});

test('豆の削除で感想・しおり・比較も一緒に消え、他は残る', async () => {
  const { repo, a, b, c } = await seeded();
  await repo.deleteBean(a.id);
  assert.equal(repo.beans.size, 2);
  assert.equal(repo.tastingsOf(a.id).length, 0);
  assert.equal(repo.tastingsOf(b.id).length, 1);
  assert.equal(repo.comparisons.size, 0);
  assert.equal([...repo.bookmarks.values()].filter((x) => x.kind === 'bean').length, 0);
  assert.ok(repo.beans.has(c.id));
});

test('感想の追記は既存の感想を上書きしない', async () => {
  const { repo, a } = await seeded();
  const before = repo.tastingsOf(a.id).map((t) => t.text);
  await repo.saveTasting(makeTasting(a.id, '3回目', parseDate('2026-10-26')));
  const after = repo.tastingsOf(a.id).map((t) => t.text);
  assert.equal(after.length, before.length + 1);
  for (const t of before) assert.ok(after.includes(t));
});

test('CSV: BOM・引用符・改行・数式対策・1感想1行・感想なしの豆も1行', async () => {
  const { repo } = await seeded();
  const csv = buildCsv(repo);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  // 簡易パーサで往復確認
  const rows = parseCsv(csv.slice(1));
  assert.deepEqual(rows[0], CSV_HEADERS);
  assert.equal(rows.length - 1, 4, '豆A(感想2) + 豆B(感想1) + 豆C(感想0) = 4行');
  const idx = (h) => CSV_HEADERS.indexOf(h);
  const bRow = rows.find((r) => r[idx('名称')].startsWith('豆B'));
  assert.equal(bRow[idx('名称')], '豆B "引用" ,カンマ');
  assert.equal(bRow[idx('フレーバーノート(お店)')], "'=SUM(A1)", '数式として実行されないよう前置');
  const aRows = rows.filter((r) => r[idx('名称')] === '豆A' && r[idx('感想')]);
  assert.ok(aRows.some((r) => r[idx('感想')] === '1回目\n改行あり'));
  assert.ok(aRows.every((r) => r[0] && r[1]), 'beanId と tastingId を含む');
  assert.equal(aRows.find((r) => r[idx('感想')].startsWith('1回目'))[idx('日付精度')], 'month');
  const cRow = rows.find((r) => r[0] && !r[1]);
  assert.ok(cRow, '感想のない豆の行');
  assert.equal(csv.endsWith('\r\n'), true);
});

test('csvCell: 危険な先頭文字', () => {
  for (const s of ['=1+1', '+1', '-1', '@x', '\tx']) assert.ok(csvCell(s).startsWith(`"'`), s);
  assert.equal(csvCell('普通'), '"普通"');
  assert.equal(csvCell(null), '""');
});

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\r') { /* skip */ }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
