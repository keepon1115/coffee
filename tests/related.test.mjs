import test from 'node:test';
import assert from 'node:assert/strict';
import { Repo, createMemoryAdapter } from '../app/js/db.js';
import { makeBean, makeTasting, parseDate } from '../app/js/model.js';
import { findTerms, comparisonCandidates, homeSuggestion, compareBeans, sortedBeans } from '../app/js/related.js';
import { searchKnowledge, matchStoreInfo, COUNTRIES, VARIETIES, PROCESSES, SOURCES, getArticle } from '../app/js/knowledge.js';

const repoWith = async (specs) => {
  const repo = await new Repo(createMemoryAdapter()).load();
  const out = [];
  for (const [fields, text, date, source] of specs) {
    const b = makeBean(fields, { recordDate: parseDate(date || ''), source });
    await repo.saveBean(b);
    if (text) await repo.saveTasting(makeTasting(b.id, text, parseDate(date || '')));
    out.push(b);
  }
  return { repo, beans: out };
};

test('感想の語句: 登場は拾い、否定の言い回しは肯定的な嗜好にしない', () => {
  assert.ok(findTerms('カカオの味が広がります').some((t) => t.term === 'カカオ'));
  assert.equal(findTerms('チョコは感じない').length, 0);
  assert.equal(findTerms('カカオ感はない').length, 0);
  assert.equal(findTerms('ナッツは好きではない').length, 0);
  assert.ok(findTerms('ダークチョコがずっと続く').some((t) => t.term === 'ダークチョコ'), '「ずっと」を否定と誤認しない');
  assert.ok(findTerms('チョコの甘さが残り、クセがない').some((t) => t.term === 'チョコ'), '読点をまたぐ否定は無関係');
  // 「余韻」だけでは分類しない
  assert.equal(findTerms('余韻が長い').length, 0);
});

test('関連候補: 理由つき（品種・国・精製・語句）。同名でも自動統合しない', async () => {
  const { repo, beans } = await repoWith([
    [{ name: 'ブラジル豆', country: 'ブラジル', variety: 'Bourbon', process: 'Natural' }, 'ナッツの香ばしさ', '25/9'],
    [{ name: 'ケニア豆', country: 'KENYA', variety: 'SL28', process: 'Washed' }, 'カカオのよう', '26/1'],
    [{ name: 'ルワンダ豆', country: 'ルワンダ', variety: 'ブルボン', process: 'Washed' }, 'カカオを感じる', '26/10'],
    [{ name: 'ルワンダ豆', country: 'ルワンダ', variety: 'ブルボン', process: 'Washed' }, '', '26/2'],
  ]);
  const rw = beans[2];
  const c = comparisonCandidates(rw, repo);
  const reasons = c.map((x) => x.reason);
  assert.ok(reasons.some((r) => r.startsWith('同じ品種（Bourbon')), reasons.join('|'));
  assert.ok(reasons.some((r) => r.includes('同じ精製（Washed') && r.includes('国違い')));
  assert.ok(reasons.some((r) => r.includes('「カカオ」が登場')));
  assert.ok(!reasons.some((r) => /好み|原因|おすすめ/.test(r)));
  assert.equal(c.find((x) => x.reason.includes('登場')).basis.includes('好みの一致ではありません'), true);
  assert.equal(repo.beans.size, 4, '同名の豆が別々に存在する');
});

test('「この一杯から」: 候補が無ければ事典の入口、記録が無ければ null', async () => {
  const empty = await repoWith([]);
  assert.equal(homeSuggestion(empty.repo), null);
  const { repo } = await repoWith([[{ name: '単独', country: 'タイ', variety: 'Catuai', process: 'Washed' }, 'メモ', '26/10']]);
  const s = homeSuggestion(repo);
  assert.equal(s.type, 'article');
  assert.equal(s.kind, 'variety');
  assert.equal(s.id, 'catuai');
  const none = await repoWith([[{ name: '情報なし' }, 'メモ', '26/10']]);
  const g = homeSuggestion(none.repo);
  assert.equal(g.kind, 'theme');
  assert.ok(g.basis.includes('記録に基づく分析ではありません'));
});

test('並び順: 新しい日付が上、月だけは月内の日付つきより後ろ、不明は最後', async () => {
  const { repo } = await repoWith([
    [{ name: '不明' }, '', '', { type: 'xlsx' }],
    [{ name: '月のみ' }, '', '25/9'],
    [{ name: '日つき' }, '', '2026-10-25'],
  ]);
  assert.deepEqual(sortedBeans(repo).map((b) => b.name), ['日つき', '月のみ', '不明']);
});

test('比較: 共通と違いを分け、記録のない項目は「比べられない」', async () => {
  const { beans } = await repoWith([
    [{ name: 'A', country: 'KENYA', variety: 'SL28', process: 'Washed', roast: '' }, 'x', '26/1'],
    [{ name: 'B', country: 'ケニア', variety: 'Batian', process: 'Natural', roast: '浅煎り' }, 'y', '26/2'],
  ]);
  const r = compareBeans(beans[0], beans[1]);
  assert.ok(r.common.includes('国'));
  assert.ok(r.diff.includes('品種') && r.diff.includes('精製'));
  assert.ok(r.unknown.includes('焙煎度'));
});

test('事典: 全記事の関連リンクと出典が実在する', () => {
  const kinds = { country: COUNTRIES, variety: VARIETIES, process: PROCESSES };
  for (const [kind, list] of Object.entries(kinds)) {
    for (const a of list) {
      for (const s of a.sources) assert.ok(SOURCES[s], `${a.id}: 出典 ${s}`);
      for (const [k, id] of a.related || []) assert.ok(k === 'theme' || getArticle(k, id), `${kind}/${a.id} → ${k}/${id}`);
    }
  }
  const ids = new Set();
  for (const a of [...COUNTRIES, ...VARIETIES, ...PROCESSES]) { assert.ok(!ids.has(a.id), a.id); ids.add(a.id); }
});

test('事典検索と店の一致', () => {
  assert.ok(searchKnowledge('ケニア').some((r) => r.kind === 'country' && r.id === 'kenya'));
  assert.ok(searchKnowledge('ブルボン').some((r) => r.kind === 'variety' && r.id === 'bourbon'));
  assert.ok(searchKnowledge('スマトラ').some((r) => r.kind === 'process' && r.id === 'wet-hulled'));
  assert.equal(matchStoreInfo('LIGHT UP COFFEE').id, 'lightup');
  assert.equal(matchStoreInfo('雪人 (八尾)'), null);
});
