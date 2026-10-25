// 保存層。IndexedDB（本番）とメモリ（テスト）を同じ形で扱う。
// 複数の書き込みは1つのトランザクションにまとめ、途中で失敗したら全体を取り消す。
import { SCHEMA_VERSION, nowIso } from './model.js';
import { deriveNorm, NORM_VERSION } from './knowledge.js';

export const STORE_NAMES = ['beans', 'tastings', 'bookmarks', 'comparisons', 'meta'];
const KEY_PATH = { beans: 'id', tastings: 'id', bookmarks: 'id', comparisons: 'id', meta: 'key' };

/** ───── メモリアダプタ（テスト用。tx は作業コピーに書き、成功時のみ反映） ───── */
export function createMemoryAdapter(initial) {
  let data = clone(initial || Object.fromEntries(STORE_NAMES.map((n) => [n, {}])));
  return {
    kind: 'memory',
    async tx(names, mode, fn) {
      const work = mode === 'readwrite' ? clone(data) : data;
      const t = {
        async getAll(s) { return Object.values(work[s]).map(clone); },
        async get(s, k) { return work[s][k] ? clone(work[s][k]) : undefined; },
        async put(s, v) { work[s][v[KEY_PATH[s]]] = clone(v); },
        async delete(s, k) { delete work[s][k]; },
        async clear(s) { work[s] = {}; },
      };
      const result = await fn(t);
      if (mode === 'readwrite') data = work;
      return result;
    },
    async close() {},
  };
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/** ───── IndexedDB アダプタ ───── */
export function createIdbAdapter(name = 'tankyu-coffee') {
  let dbp;
  const open = () => dbp || (dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const n of STORE_NAMES) if (!db.objectStoreNames.contains(n)) {
        const os = db.createObjectStore(n, { keyPath: KEY_PATH[n] });
        if (n === 'tastings') os.createIndex('beanId', 'beanId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDBを開けません'));
    req.onblocked = () => reject(new Error('他のタブがデータベースを使用中です'));
  }));
  const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
  return {
    kind: 'idb',
    async tx(names, mode, fn) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const t = db.transaction(names, mode);
        let result;
        t.oncomplete = () => resolve(result);
        t.onabort = () => reject(t.error || new Error('保存が中断されました'));
        t.onerror = () => {};
        const api = {
          getAll: (s) => wrap(t.objectStore(s).getAll()),
          get: (s, k) => wrap(t.objectStore(s).get(k)),
          put: (s, v) => wrap(t.objectStore(s).put(v)),
          delete: (s, k) => wrap(t.objectStore(s).delete(k)),
          clear: (s) => wrap(t.objectStore(s).clear()),
        };
        Promise.resolve().then(() => fn(api)).then((r) => { result = r; }, (e) => { try { t.abort(); } catch { /* 済 */ } reject(e); });
      });
    },
    async close() { if (dbp) (await dbp).close(); },
  };
}

/** ───── Repo: 画面が読む同期キャッシュ + 書き込み ───── */
export class Repo {
  constructor(adapter) {
    this.adapter = adapter;
    this.beans = new Map();
    this.tastings = new Map();
    this.bookmarks = new Map();
    this.comparisons = new Map();
    this.settings = { key: 'settings', schemaVersion: SCHEMA_VERSION, imports: [], lastBackupAt: '' };
    this.listeners = new Set();
  }

  async load() {
    const [beans, tastings, bookmarks, comparisons, meta] = await this.adapter.tx(STORE_NAMES, 'readonly', async (t) => [
      await t.getAll('beans'), await t.getAll('tastings'), await t.getAll('bookmarks'), await t.getAll('comparisons'), await t.get('meta', 'settings'),
    ]);
    this.beans = new Map(beans.map((x) => [x.id, x]));
    this.tastings = new Map(tastings.map((x) => [x.id, x]));
    this.bookmarks = new Map(bookmarks.map((x) => [x.id, x]));
    this.comparisons = new Map(comparisons.map((x) => [x.id, x]));
    if (meta) this.settings = { imports: [], lastBackupAt: '', ...meta };
    await this.migrateNorm();
    return this;
  }

  /** 正規化テーブルが更新されたときに導出値を作り直す（原文には触れない） */
  async migrateNorm() {
    const stale = [...this.beans.values()].filter((b) => !b.norm || b.norm.v !== NORM_VERSION);
    if (!stale.length) return;
    const next = stale.map((b) => ({ ...b, norm: deriveNorm(b) }));
    await this.adapter.tx(['beans'], 'readwrite', async (t) => { for (const b of next) await t.put('beans', b); });
    for (const b of next) this.beans.set(b.id, b);
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(); }

  tastingsOf(beanId) {
    return [...this.tastings.values()].filter((t) => t.beanId === beanId);
  }

  /** ops: [['put', store, obj] | ['delete', store, id]] を一括で保存。失敗時はキャッシュも保存も変えない */
  async commit(ops) {
    const names = [...new Set(ops.map((o) => o[1]))];
    await this.adapter.tx(names, 'readwrite', async (t) => {
      for (const [op, store, v] of ops) {
        if (op === 'put') await t.put(store, v);
        else if (op === 'delete') await t.delete(store, v);
      }
    });
    const cache = { beans: this.beans, tastings: this.tastings, bookmarks: this.bookmarks, comparisons: this.comparisons };
    for (const [op, store, v] of ops) {
      if (store === 'meta') { if (op === 'put') this.settings = v; continue; }
      if (op === 'put') cache[store].set(v.id, v); else cache[store].delete(v);
    }
    this.emit();
  }

  async saveBean(bean) { await this.commit([['put', 'beans', bean]]); return bean; }
  async saveTasting(t) { await this.commit([['put', 'tastings', t]]); return t; }
  async saveBeanWithTasting(bean, tasting) {
    await this.commit([['put', 'beans', bean], ['put', 'tastings', tasting]]);
  }
  async deleteTasting(id) { await this.commit([['delete', 'tastings', id]]); }

  /** 豆の削除: 感想・その豆のしおり・その豆を含む比較も一緒に削除 */
  async deleteBean(id) {
    const ops = [['delete', 'beans', id]];
    for (const t of this.tastingsOf(id)) ops.push(['delete', 'tastings', t.id]);
    for (const b of this.bookmarks.values()) if (b.kind === 'bean' && b.targetId === id) ops.push(['delete', 'bookmarks', b.id]);
    for (const c of this.comparisons.values()) if (c.beanIds.includes(id)) {
      ops.push(['delete', 'comparisons', c.id]);
      for (const b of this.bookmarks.values()) if (b.kind === 'comparison' && b.targetId === c.id) ops.push(['delete', 'bookmarks', b.id]);
    }
    await this.commit(ops);
  }

  async saveSettings(patch) {
    const next = { ...this.settings, ...patch, key: 'settings', schemaVersion: SCHEMA_VERSION };
    await this.commit([['put', 'meta', next]]);
  }

  /** 全置換（JSON復元）。1トランザクションで、失敗すれば既存データはそのまま */
  async replaceAll({ beans, tastings, bookmarks, comparisons, settings }) {
    await this.adapter.tx(STORE_NAMES, 'readwrite', async (t) => {
      for (const s of STORE_NAMES) await t.clear(s);
      for (const x of beans) await t.put('beans', x);
      for (const x of tastings) await t.put('tastings', x);
      for (const x of bookmarks) await t.put('bookmarks', x);
      for (const x of comparisons) await t.put('comparisons', x);
      await t.put('meta', { ...settings, key: 'settings', schemaVersion: SCHEMA_VERSION });
    });
    await this.load();
    this.emit();
  }

  // しおり
  findBookmark(kind, targetId) {
    return [...this.bookmarks.values()].find((b) => b.kind === kind && b.targetId === targetId) || null;
  }
  async addBookmark({ kind, targetId, reason, source, memo }) {
    const existing = this.findBookmark(kind, targetId);
    if (existing) return existing;
    const bm = { id: `bm_${kind}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, kind, targetId, reason: reason || '', source: source || null, memo: memo || '', createdAt: nowIso() };
    await this.commit([['put', 'bookmarks', bm]]);
    return bm;
  }
  async removeBookmark(id) { await this.commit([['delete', 'bookmarks', id]]); }

  // 比較（同じ2つの豆の組は1件に上書き）
  findComparison(a, b) {
    return [...this.comparisons.values()].find((c) => c.beanIds.includes(a) && c.beanIds.includes(b)) || null;
  }
  async saveComparison({ beanIds, tastingIds, theme, note }) {
    const ex = this.findComparison(beanIds[0], beanIds[1]);
    const t = nowIso();
    const cmp = { id: ex?.id || `cmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, beanIds, tastingIds: tastingIds || [null, null], theme: theme || '', note: note || '', createdAt: ex?.createdAt || t, updatedAt: t };
    await this.commit([['put', 'comparisons', cmp]]);
    return cmp;
  }
  async deleteComparison(id) {
    const ops = [['delete', 'comparisons', id]];
    for (const b of this.bookmarks.values()) if (b.kind === 'comparison' && b.targetId === id) ops.push(['delete', 'bookmarks', b.id]);
    await this.commit(ops);
  }
}
