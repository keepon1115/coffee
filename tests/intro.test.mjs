import test from 'node:test';
import assert from 'node:assert/strict';
import { japanDay, chooseIntro, sceneAt, DURATION, SCENE_MS } from '../app/js/intro.js';

test('日本時間の午前0時に表示日が切り替わる', () => {
  assert.equal(japanDay(new Date('2026-10-27T14:59:59Z')), '2026-10-27');
  assert.equal(japanDay(new Date('2026-10-27T15:00:00Z')), '2026-10-28');
});
test('ホーム初回は全編、同日再起動は短縮、詳細は省略する', () => {
  const day='2026-10-27';
  assert.equal(chooseIntro({ day }), 'full');
  assert.equal(chooseIntro({ day,lastDay:day,hash:'#/' }), 'short');
  assert.equal(chooseIntro({ day,lastDay:'2026-10-26' }), 'full');
  for (const hash of ['#/bean/a', '#/new', '#/settings', '#/dict']) assert.equal(chooseIntro({day,hash}),null);
});
test('動きを減らす設定と手動の静止画', () => {
  assert.equal(chooseIntro({ reduced:true }),null);
  assert.equal(chooseIntro({ reduced:true, manual:true, hash:'#/settings' }), 'still');
  assert.equal(chooseIntro({ manual:true, hash:'#/settings' }), 'full');
});
test('手の位置を与えるノブが2回転して同じ軸位置に戻る', () => {
  const first=sceneAt(1680), half=sceneAt(1680+870/4), last=sceneAt(2550);
  assert.equal(first.crankX,37);
  assert.ok(Math.abs(half.crankX+37)<1e-9);
  assert.ok(Math.abs(last.crankX-37)<1e-9);
  assert.equal(sceneAt(2450).millX,180);
});
test('初回10秒・2回目以降5秒で、どちらも同じ台本を最後まで流す', () => {
  assert.equal(DURATION.full,10000);
  assert.equal(DURATION.short,5000);
  assert.equal(sceneAt(SCENE_MS).opacity,0);
  assert.ok(sceneAt(SCENE_MS*0.9).caption>0);
});
test('終端で消え、豆から粉への受け渡しが連続する', () => {
  assert.ok(sceneAt(2950).receiver>0 && sceneAt(2950).dripper>0);
  assert.ok(sceneAt(3500).pour>0);
  assert.ok(sceneAt(4500).caption>0);
});
