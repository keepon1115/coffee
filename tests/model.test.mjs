import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, formatDate, dateSortKey, dateFromInput } from '../app/js/model.js';
import { matchCountry, matchVarieties, matchProcesses, splitVarietyTokens } from '../app/js/knowledge.js';

test('日付: 年月だけは月精度、空は不明のまま、原文を保持', () => {
  assert.deepEqual(parseDate('26/10'), { date: '2026-10', precision: 'month', raw: '26/10' });
  assert.deepEqual(parseDate('25/9'), { date: '2025-09', precision: 'month', raw: '25/9' });
  assert.deepEqual(parseDate(''), { date: '', precision: 'unknown', raw: '' });
  assert.deepEqual(parseDate('2026-10-25'), { date: '2026-10-25', precision: 'day', raw: '2026-10-25' });
  assert.equal(parseDate('2026年3月').precision, 'month');
  assert.equal(parseDate('2026-02-30').precision, 'unknown');
  assert.equal(parseDate('先週').precision, 'unknown');
  assert.equal(parseDate('先週').raw, '先週');
});

test('日付: 表示と並べ替え', () => {
  assert.equal(formatDate(parseDate('26/10')), '2026年10月');
  assert.equal(formatDate(parseDate('2026-10-05')), '2026年10月5日');
  assert.ok(formatDate(parseDate('')).startsWith('日付不明'));
  assert.ok(dateSortKey(parseDate('26/10')) > dateSortKey(parseDate('2026-10-05')));
  assert.equal(dateSortKey(parseDate('')), '');
});

test('日付: 編集で値を変えなければ元の表記を保つ', () => {
  const prev = parseDate('25/9');
  assert.equal(dateFromInput('2025-09', prev).raw, '25/9');
  assert.equal(dateFromInput('2025-09-12', prev).precision, 'day');
  assert.equal(dateFromInput('', prev).precision, 'unknown');
});

test('国名の表記ゆれを同じ産地につなぐ', () => {
  for (const v of ['KENYA', 'Kenya', 'ケニア', ' kenya ']) assert.equal(matchCountry(v), 'kenya', v);
  for (const v of ['COSTA RICA', 'コスタリカ', 'Costa Rica']) assert.equal(matchCountry(v), 'costa-rica', v);
  for (const v of ['EL SALVADOR', 'El Salvador', 'エルサルバドル']) assert.equal(matchCountry(v), 'el-salvador', v);
  assert.equal(matchCountry('東ティモール'), 'east-timor');
  assert.equal(matchCountry('ブレンド'), null);
  assert.equal(matchCountry(''), null);
});

test('品種: 複数値・表記ゆれ・不明語を創作しない', () => {
  assert.deepEqual(matchVarieties('SL-28, SL-34, Batian, Ruiru 11'), ['sl28-sl34', 'batian']);
  assert.deepEqual(matchVarieties('不明 (SL28, SL34)'), ['sl28-sl34']);
  assert.deepEqual(matchVarieties('カトゥアイ・ブルボン'), ['catuai', 'bourbon']);
  assert.deepEqual(matchVarieties('イエローブルボン・カトゥーラ他'), ['bourbon', 'caturra']);
  assert.deepEqual(matchVarieties('Catuaí, Icatu, Gesha, Parainema, and Goaiba'), ['catuai', 'gesha']);
  assert.deepEqual(matchVarieties('Red Caturra, Orange Caturra'), ['caturra']);
  assert.deepEqual(matchVarieties('Heirloom'), ['ethiopian-landraces']);
  assert.deepEqual(matchVarieties('Pink Bourbon'), ['pink-bourbon']);
  assert.deepEqual(matchVarieties('N39,KP423'), []);
  assert.deepEqual(matchVarieties('不明'), []);
  assert.deepEqual(matchVarieties(''), []);
  assert.deepEqual(splitVarietyTokens('Kent/SL28'), ['Kent', 'SL28']);
});

test('精製: 複数値とパルプドナチュラルの扱い', () => {
  assert.deepEqual(matchProcesses('Washed'), ['washed']);
  assert.deepEqual(matchProcesses('ウォッシュド（水洗式）＋天日乾燥'), ['washed']);
  assert.deepEqual(matchProcesses('アナエロビック ナチュラル'), ['natural', 'anaerobic']);
  assert.deepEqual(matchProcesses('Double Anaerobic Honey'), ['honey', 'anaerobic']);
  assert.deepEqual(matchProcesses('パルプドナチュラル'), ['honey']);
  assert.deepEqual(matchProcesses('Pulped Natural'), ['honey']);
  assert.deepEqual(matchProcesses('ホワイトハニー'), ['honey']);
  assert.deepEqual(matchProcesses('Special Process'), []);
  assert.deepEqual(matchProcesses(''), []);
});
