import test from 'node:test';
import assert from 'node:assert/strict';

// Node に DOM は無いので、append が受け取った引数を記録するだけの偽要素を用意する
const calls = [];
class FakeEl { append(...a) { calls.push(['append', a]); } prepend(...a) { calls.push(['prepend', a]); } replaceChildren(...a) { calls.push(['replace', a]); } }
globalThis.Element = FakeEl;
globalThis.DocumentFragment = class extends FakeEl {};
await import('../app/js/ui.js');

test('append / replaceChildren は配列を展開し、null と false を除く（配列がURL文字列にならない）', () => {
  const el = new Element();
  const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };
  el.append('h', [a, [b]], null, false, c, undefined);
  el.replaceChildren([a, b], null);
  el.prepend([[c]]);
  assert.deepEqual(calls[0][1], ['h', a, b, c]);
  assert.deepEqual(calls[1][1], [a, b]);
  assert.deepEqual(calls[2][1], [c]);
});
