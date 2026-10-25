import test from 'node:test';
import assert from 'node:assert/strict';
import { readXlsx } from '../app/js/xlsx.js';
import { makeXlsx, SAMPLE_ROWS } from '../tools/make-xlsx.mjs';
import { parseSheet, buildPlan, applyPlan } from '../app/js/importer.js';
import { Repo, createMemoryAdapter } from '../app/js/db.js';
import { makeTasting, makeBean, parseDate } from '../app/js/model.js';
import { buildBackup, planMerge, applyMerge } from '../app/js/backup.js';

const newRepo = async () => new Repo(createMemoryAdapter()).load();
async function importSample(repo) {
  const { rows, sheetName } = await readXlsx(makeXlsx(SAMPLE_ROWS));
  await applyPlan(repo, buildPlan(parseSheet(rows), repo, { fileName: 'sample.xlsx', sheetName }));
}
const roundtrip = (repo) => JSON.parse(JSON.stringify(buildBackup(repo)));
const merge = async (repo, other) => { const p = planMerge(repo, roundtrip(other)); await applyMerge(repo, p); return p; };

test('PCとスマホが別々に同じExcelを取り込んでいても、統合で豆が重複しない', async () => {
  const pc = await newRepo(), phone = await newRepo();
  await importSample(pc); await importSample(phone);
  assert.notEqual([...pc.beans.keys()][0], [...phone.beans.keys()][0], '別々に取り込むとidは違う');
  const p = await merge(pc, phone);
  assert.equal(pc.beans.size, 5);
  assert.equal(pc.tastings.size, 4);
  assert.equal(p.changes, 0, '足すものなし');
});

test('スマホで追加した豆・感想・気になる・比較がPCに入り、2回目の統合では変化なし', async () => {
  const pc = await newRepo(); await importSample(pc);
  const phone = await newRepo();
  await merge(phone, pc); // スマホにPCの記録を移す（空のスマホへ統合）
  assert.equal(phone.beans.size, 5);
  // スマホで記録
  const nb = makeBean({ name: 'スマホで記録した豆', store: '店', country: 'エチオピア' }, { recordDate: parseDate('2026-10-26') });
  await phone.saveBean(nb);
  await phone.saveTasting(makeTasting(nb.id, 'スマホの感想', parseDate('2026-10-26')));
  const existing = [...phone.beans.values()].find((b) => b.name === 'サンプル 青い月');
  await phone.saveTasting(makeTasting(existing.id, 'Excel由来の豆への2回目', parseDate('2026-10-27')));
  await phone.addBookmark({ kind: 'country', targetId: 'ethiopia', reason: 'r' });
  await phone.addBookmark({ kind: 'bean', targetId: nb.id, reason: 'r' });
  await phone.saveComparison({ beanIds: [nb.id, existing.id], tastingIds: [null, null], theme: 't', note: 'n' });

  const p = await merge(pc, phone);
  assert.equal(p.summary.beansAdded, 1);
  assert.equal(p.summary.tastingsAdded, 2);
  assert.equal(pc.beans.size, 6);
  assert.equal(pc.tastings.size, 6);
  assert.equal(pc.bookmarks.size, 2);
  assert.equal(pc.comparisons.size, 1);
  const pcExisting = [...pc.beans.values()].find((b) => b.name === 'サンプル 青い月');
  assert.equal(pc.tastingsOf(pcExisting.id).length, 1, 'Excel由来の豆に2回目の感想が付く');
  assert.ok(pc.tastingsOf(pcExisting.id).some((t) => t.text.startsWith('Excel由来')));
  assert.deepEqual(pc.comparisons.values().next().value.beanIds.sort(), [nb.id, pcExisting.id].sort());
  // もう一度統合しても増えない
  const again = await merge(pc, phone);
  assert.equal(again.changes, 0);
  assert.equal(pc.beans.size, 6); assert.equal(pc.tastings.size, 6);
});

test('同じ記録は新しい方が残り、いまの記録は消えない', async () => {
  const a = await newRepo(); await importSample(a);
  const b = await newRepo(); await merge(b, a);
  const bean = [...a.beans.values()].find((x) => x.name === 'サンプル・ナチュラル');
  const t = a.tastingsOf(bean.id)[0];
  // PC側で後から修正
  await a.saveTasting({ ...t, text: 'PCで直した', updatedAt: '2099-01-01T00:00:00.000Z' });
  await merge(b, a);
  assert.equal([...b.tastings.values()].find((x) => x.id === t.id).text, 'PCで直した');
  // 古い版では上書きされない
  const stale = roundtrip(a);
  stale.data.tastings.find((x) => x.id === t.id).text = '古い版';
  stale.data.tastings.find((x) => x.id === t.id).updatedAt = '2000-01-01T00:00:00.000Z';
  const p = planMerge(b, stale); await applyMerge(b, p);
  assert.equal([...b.tastings.values()].find((x) => x.id === t.id).text, 'PCで直した');
  assert.equal(b.beans.size, a.beans.size);
});

test('不正なファイルは統合できず、記録は変わらない', async () => {
  const a = await newRepo(); await importSample(a);
  const before = JSON.stringify(buildBackup(a, new Date(0)).data);
  for (const bad of [{ app: 'x' }, null, { ...roundtrip(a), data: { beans: [], tastings: [{ id: 't', beanId: 'none', text: '' }], bookmarks: [], comparisons: [] } }]) {
    assert.throws(() => planMerge(a, bad));
  }
  assert.equal(JSON.stringify(buildBackup(a, new Date(0)).data), before);
});

test('保存に失敗したら統合は全体が取り消される', async () => {
  const pc = await newRepo(); await importSample(pc);
  const phone = await newRepo(); await merge(phone, pc);
  const nb = makeBean({ name: '新' }, { recordDate: parseDate('2026-10-26') });
  await phone.saveBean(nb); await phone.saveTasting(makeTasting(nb.id, 'x', parseDate('2026-10-26')));
  const plan = planMerge(pc, roundtrip(phone));
  const real = pc.adapter.tx.bind(pc.adapter);
  pc.adapter.tx = (n, m, fn) => real(n, m, (t) => fn({ ...t, put: async (s, v) => { if (s === 'tastings') throw new Error('失敗'); return t.put(s, v); } }));
  await assert.rejects(() => applyMerge(pc, plan), /失敗/);
  pc.adapter.tx = real;
  await pc.load();
  assert.equal(pc.beans.size, 5, '豆だけ先に入ることはない');
});
