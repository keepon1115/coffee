// 起動・ルーター・外枠（ヘッダーと下部タブ）
import { h, toast } from './ui.js';
import { Repo, createIdbAdapter, createMemoryAdapter } from './db.js';
import { home, beanDetail, beanForm, tastingForm, notFound } from './screens/note.js';
import { dictHome, dictList, article, journey, themes, history, stores, storeDetail } from './screens/dict.js';
import { compare, saved, settings, importScreen } from './screens/more.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
function icon(paths) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) { const p = document.createElementNS(SVG_NS, 'path'); p.setAttribute('d', d); svg.append(p); }
  return svg;
}
const ICONS = {
  note: ['M6 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z', 'M6 3v18', 'M10 8h5', 'M10 12h5'],
  dict: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 19V5', 'M9 8h6'],
  saved: ['M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z'],
  back: ['M15 5l-7 7 7 7'],
  gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
};

const ROUTES = [
  [/^\/$/, home, []],
  [/^\/new$/, beanForm, []],
  [/^\/bean\/([^/]+)$/, beanDetail, ['id']],
  [/^\/bean\/([^/]+)\/edit$/, beanForm, ['id']],
  [/^\/bean\/([^/]+)\/taste$/, tastingForm, ['id']],
  [/^\/bean\/([^/]+)\/taste\/([^/]+)$/, tastingForm, ['id', 'tid']],
  [/^\/dict$/, dictHome, []],
  [/^\/dict\/(country|variety|process)$/, dictList, ['kind']],
  [/^\/a\/(country|variety|process|theme)\/([^/]+)$/, article, ['kind', 'id']],
  [/^\/journey$/, journey, []],
  [/^\/themes$/, themes, []],
  [/^\/history$/, history, []],
  [/^\/stores$/, stores, []],
  [/^\/store\/(.+)$/, storeDetail, ['key']],
  [/^\/compare$/, compare, []],
  [/^\/saved$/, saved, []],
  [/^\/settings$/, settings, []],
  [/^\/import$/, importScreen, []],
];

const TABS = [['note', '#/', 'ノート'], ['dict', '#/dict', '事典'], ['saved', '#/saved', '気になる']];

const app = document.getElementById('app');
let introModule;
let bootFailed = false;
// 任意の演出の読込に失敗しても、データ読込と通常起動を続ける。
const introReady = import('./intro.js').then((module) => {
  introModule = module;
  if (!bootFailed) module.showIntro();
  return module;
}).catch((error) => { console.warn('起動演出を読み込めませんでした', error); return null; });
const scrollMap = new Map();
let ctx;
let currentHash = '';

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(qs), hash: location.hash || '#/' };
}

function render() {
  const { path, query, hash } = parseHash();
  scrollMap.set(currentHash, window.scrollY);
  currentHash = hash;
  let res;
  try {
    let matched = false;
    for (const [re, fn, names] of ROUTES) {
      const m = path.match(re);
      if (!m) continue;
      const params = {};
      names.forEach((n, i) => { try { params[n] = decodeURIComponent(m[i + 1]); } catch { params[n] = m[i + 1]; } });
      res = fn(ctx, params, query);
      matched = true;
      break;
    }
    if (!matched) res = notFound('ページが見つかりません。');
  } catch (e) {
    console.error(e);
    res = { title: 'エラー', tab: null, back: '#/', node: h('div', { class: 'banner error', role: 'alert' }, h('strong', { text: '画面を表示できませんでした' }), h('p', { text: String(e?.message || e) }), h('a', { class: 'btn', href: '#/', text: 'ノートへ戻る' })) };
  }
  shell(res);
  document.title = `${res.title} - 探究コーヒー`;
  if (!introModule?.isIntroActive()) {
    if (res.focus) res.focus.focus(); else document.getElementById('main')?.focus({ preventScroll: true });
  }
  window.scrollTo(0, path === '/' || path.startsWith('/dict') ? scrollMap.get(hash) || 0 : 0);
}

function shell(res) {
  document.body.classList.toggle('form-open', !!res.form);
  const back = res.back == null ? null : typeof res.back === 'function'
    ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': '戻る', onClick: res.back }, icon(ICONS.back))
    : h('a', { class: 'icon-btn', href: res.back, 'aria-label': '戻る' }, icon(ICONS.back));
  const right = res.topRight || h('a', { class: 'icon-btn', href: '#/settings', 'aria-label': '設定とデータ管理' }, icon(ICONS.gear));
  const header = h('header', { class: 'topbar' }, back, h('h1', { class: 'title', text: res.title }), right);
  const main = h('main', { id: 'main', tabindex: '-1', class: res.actionbar ? 'has-actionbar' : '' }, res.node);
  const tabs = h('nav', { class: 'tabbar', 'aria-label': 'メインメニュー' }, TABS.map(([id, href, label]) =>
    h('a', { href, ...(res.tab === id ? { 'aria-current': 'page' } : {}) }, icon(ICONS[id]), h('span', { text: label }))));
  app.replaceChildren(...[header, main, res.actionbar, tabs].filter(Boolean));
}

async function boot() {
  let storageMode = 'idb';
  let repo;
  try {
    repo = await new Repo(createIdbAdapter()).load();
  } catch (e) {
    console.error(e);
    storageMode = 'memory';
    repo = await new Repo(createMemoryAdapter()).load();
  }
  ctx = {
    repo, storageMode,
    async replayIntro() {
      try { (await introReady)?.showIntro({ manual: true }); }
      catch (error) { console.warn(error); toast('アニメーションを表示できませんでした', { error: true }); }
    },
    go(hash, { replace = false } = {}) {
      if (location.hash === hash) { render(); return; }
      if (replace) location.replace(hash); else location.hash = hash;
    },
    rerender: () => render(),
  };
  window.addEventListener('hashchange', render);
  render();
  if (storageMode === 'memory') toast('この環境では記録を端末に保存できません', { error: true });
  // 永続化の依頼は最初の保存後に一度だけ（起動時の許可確認を避ける）
  const stop = repo.onChange(() => { stop(); try { navigator.storage?.persist?.(); } catch { /* 任意 */ } });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('service worker', e));
  }
  window.__app = ctx; // 検証用
}

boot().catch((e) => {
  bootFailed = true;
  introModule?.finishIntro('boot-error');
  console.error(e);
  app.replaceChildren(h('main', {}, h('div', { class: 'banner error', role: 'alert' }, h('strong', { text: '起動できませんでした' }), h('p', { text: String(e?.message || e) }))));
});
