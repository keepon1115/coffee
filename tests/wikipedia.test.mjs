import test from 'node:test';
import assert from 'node:assert/strict';
import { wikipediaLink } from '../app/js/wikipedia.js';
import { COUNTRIES, VARIETIES, PROCESSES, JOURNEY } from '../app/js/knowledge-data.js';

test('ジャマイカと曖昧な産地名は日本語の該当記事へつなぐ', () => {
  for (const [id, title] of [['jamaica', 'ジャマイカ'], ['thailand', 'タイ王国'], ['china', '雲南省'], ['hawaii', 'ハワイ州']]) {
    const link = wikipediaLink('country', COUNTRIES.find((a) => a.id === id));
    assert.equal(decodeURIComponent(new URL(link.href).pathname), `/wiki/${title}`);
  }
});

test('ゲイシャはコーヒーの記事、その他の品種・精製は文脈付き検索へつなぐ', () => {
  const gesha = wikipediaLink('variety', VARIETIES.find((a) => a.id === 'gesha'));
  assert.equal(decodeURIComponent(new URL(gesha.href).pathname), '/wiki/ゲイシャ_(コーヒー)');
  for (const [kind, list] of [['variety', VARIETIES], ['process', PROCESSES]]) {
    for (const item of list.filter((a) => a.id !== 'gesha')) {
      const url = new URL(wikipediaLink(kind, item).href);
      assert.ok(url.searchParams.get('search').includes('コーヒー'));
      assert.equal(url.searchParams.get('title'), 'Special:Search');
    }
  }
});

test('事典の全産地・品種・精製・工程に安全な外部リンクがある', () => {
  for (const [kind, list] of [['country', COUNTRIES], ['variety', VARIETIES], ['process', PROCESSES], ['journey', JOURNEY]]) {
    for (const item of list) {
      const url = new URL(wikipediaLink(kind, item).href);
      assert.equal(url.origin, 'https://ja.wikipedia.org');
      assert.ok(!url.href.includes('undefined'));
    }
  }
  assert.equal(wikipediaLink('store', { name: '店' }), null);
});
