// 画面共通の部品。ユーザー入力はすべて textContent / 属性で挿入し、innerHTML は使わない。

/** DOM生成。children は文字列（テキストとして挿入）・Node・配列・null */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'open' || k === 'required' || k === 'hidden') { if (v) el[k] = true; }
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

/** http / https のURLだけを返す。それ以外（javascript:, data: 等）は null */
export function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}

export function extLink(url, label) {
  const href = safeUrl(url);
  if (!href) return h('span', { class: 'muted', text: label || String(url ?? '') });
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: 'ext' }, label || href, h('span', { class: 'sr-only', text: '（外部サイトを開きます）' }));
}

export const link = (href, ...kids) => h('a', { href }, ...kids);

// ───── トースト ─────
let toastTimer;
export function toast(msg, { error = false } = {}) {
  let el = document.getElementById('toast');
  if (!el) { el = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.textContent = msg;
  el.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, error ? 6000 : 2600);
}

// ───── 確認ダイアログ ─────
export function confirmDialog({ title, body, ok = 'OK', cancel = 'キャンセル', danger = false }) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    const okBtn = h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), type: 'button', onClick: () => close(true), text: ok });
    const overlay = h('div', { class: 'overlay', onClick: (e) => { if (e.target === overlay) close(false); } },
      h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h2', { text: title }),
        body ? (body instanceof Node ? body : h('p', { class: 'pre', text: body })) : null,
        h('div', { class: 'dialog-actions' },
          cancel ? h('button', { class: 'btn btn-quiet', type: 'button', onClick: () => close(false), text: cancel }) : null,
          okBtn)));
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    okBtn.focus();
  });
}

/** 操作メニュー（下から出るシート） */
export function actionSheet(title, items) {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    const close = (v) => { overlay.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') close(null); };
    const overlay = h('div', { class: 'overlay sheet', onClick: (e) => { if (e.target === overlay) close(null); } },
      h('div', { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
        h('h2', { text: title }),
        items.map((it) => h('button', { class: 'btn btn-block ' + (it.danger ? 'btn-danger-quiet' : 'btn-quiet'), type: 'button', onClick: () => close(it.id), text: it.label })),
        h('button', { class: 'btn btn-block btn-quiet', type: 'button', onClick: () => close(null), text: '閉じる' })));
    document.body.append(overlay);
    document.addEventListener('keydown', onKey);
    overlay.querySelector('button')?.focus();
  });
}

/** 保存などの失敗を握りつぶさずに表示する */
export async function guarded(fn, failMsg = '保存できませんでした') {
  try { return await fn(); } catch (e) {
    console.error(e);
    toast(`${failMsg}：${e?.message || e}`, { error: true });
    return undefined;
  }
}

// ───── ダウンロード ─────
export async function saveFile(name, blob) {
  // 共有シートが使えて、ファイル共有に対応していれば優先（スマホで保存先を選びやすい）
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: name }); return 'share'; } catch (e) { if (e?.name === 'AbortError') return 'cancel'; }
  }
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'download';
}

export const KIND_ORDER = ['country', 'variety', 'process', 'store', 'bean', 'theme', 'comparison'];

// append / replaceChildren に null・false を渡しても「null」という文字を出さない（省略可能な部品を並べやすくする）
for (const name of ['append', 'prepend', 'replaceChildren']) {
  for (const proto of [Element.prototype, DocumentFragment.prototype]) {
    const orig = proto[name];
    proto[name] = function (...args) { return orig.apply(this, args.filter((a) => a != null && a !== false)); };
  }
}
