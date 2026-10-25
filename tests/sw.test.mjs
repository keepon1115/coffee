import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listAssets } from '../tools/build-sw.mjs';

const appDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const swSource = fs.readFileSync(path.join(appDir, 'sw.js'), 'utf8');

test('sw.js の ASSETS は app/ の全ファイルを含み、実在する（ビルド漏れ検知）', () => {
  const listed = JSON.parse(swSource.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);
  const expected = ['./', ...listAssets().map((f) => `./${f}`)];
  assert.deepEqual(listed, expected, 'tools/build-sw.mjs を実行して sw.js を更新してください');
  for (const a of listed) if (a !== './') assert.ok(fs.existsSync(path.join(appDir, a)), a);
  assert.match(swSource, /const VERSION = '[0-9a-f]{10}'/);
});

test('Service Worker: install で全ファイルを保存し、通信なしでも応答できる', async () => {
  const stores = new Map();
  const listeners = {};
  let online = true;
  const net = (url) => { if (!online) throw new TypeError('offline'); return { url, fromNet: true }; };
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const m = stores.get(name);
      return {
        async addAll(reqs) { for (const r of reqs) m.set(new URL(r.url, 'http://x.test/').pathname, { url: r.url, fromCache: true }); },
        async match(req) { const u = new URL(typeof req === 'string' ? req : req.url, 'http://x.test/sw.js'); return m.get(u.pathname); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(k) { return stores.delete(k); },
  };
  class Request { constructor(u, o) { this.url = new URL(u, 'http://x.test/sw.js').href; this.method = 'GET'; Object.assign(this, o); } }
  const self = { addEventListener: (t, f) => { listeners[t] = f; }, location: { origin: 'http://x.test' }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  vm.runInNewContext(swSource, { self, caches, Request, URL, fetch: async (r) => net(r.url), Promise });
  stores.set('tankyu-coffee-old', new Map());
  const wait = async (ev) => { let p; ev.waitUntil = (x) => { p = x; }; return p; };
  const inst = { waitUntil(p) { this.p = p; } }; listeners.install(inst); await inst.p;
  const act = { waitUntil(p) { this.p = p; } }; listeners.activate(act); await act.p;
  assert.ok(![...stores.keys()].includes('tankyu-coffee-old'), '古いキャッシュを消す');
  assert.equal(stores.size, 1);
  online = false;
  const respond = async (url, mode = 'cors') => { let p; listeners.fetch({ request: { url, method: 'GET', mode }, respondWith: (x) => { p = x; } }); return p; };
  assert.equal((await respond('http://x.test/js/app.js')).fromCache, true);
  assert.equal((await respond('http://x.test/index.html?x=1')).fromCache, true);
  const nav = await respond('http://x.test/anything', 'navigate');
  assert.ok(nav.url.endsWith('index.html'), '未知のURLへのナビゲーションもアプリ本体を返す');
  assert.equal(await respond('http://other.test/x'), undefined, '他オリジンには介入しない');
});
