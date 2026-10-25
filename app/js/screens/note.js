// ノート: 一覧・検索・豆の詳細・豆の入力・感想の追記
import { h, extLink, safeUrl, confirmDialog, actionSheet, toast, guarded } from '../ui.js';
import {
  beanTitle, formatDate, tastingDate, todayLocal, dateFromInput, makeBean, makeTasting, updateBean, hasMinimum, isBlank,
  beanSearchText, parseDate, formatDateShort,
} from '../model.js';
import { COUNTRIES, VARIETIES, PROCESSES, getCountry, getVariety, getProcess, normKey, articleTitle } from '../knowledge.js';
import { sortedBeans, comparisonCandidates, homeSuggestion } from '../related.js';
import { illust } from '../illust.js';
import { beanCard, bookmarkButton, kindHref, enc, sortTastings, usageCounts, storeLink, infoTag } from './common.js';

const session = { q: '', country: '', variety: '', process: '', limit: 40 };

// ───────── ホーム ─────────
export function home(ctx) {
  const { repo } = ctx;
  const root = h('div');
  const listBox = h('div', { 'aria-live': 'polite' });

  const head = h('div', { class: 'stack' },
    h('a', { class: 'btn btn-primary btn-block', href: '#/new', text: '＋ 豆を記録' }));
  root.append(head);

  if (repo.beans.size === 0) {
    root.append(h('div', { class: 'card', style: 'margin-top:16px' },
      h('div', { class: 'illust-row' }, illust('cup', { size: 96, cls: 'illust-hero' }), illust('beans', { size: 56 })),
      h('h2', { style: 'margin-top:0', text: 'ここから始めます' }),
      h('p', { text: 'まだ記録がありません。飲んだ豆をひとつ記録するか、これまでのExcelを取り込めます。' }),
      h('a', { class: 'btn btn-block', href: '#/import', text: 'Excel（コーヒー探究.xlsx）から取り込む' }),
      h('a', { class: 'btn btn-quiet btn-block', href: '#/settings', text: 'バックアップから復元する' })));
    return { title: 'ノート', tab: 'note', node: root };
  }

  const sgBox = h('div');
  const showSuggestion = (reroll) => {
    const prev = readLastSuggestion();
    const sg = homeSuggestion(repo, { exclude: prev });
    sgBox.replaceChildren();
    if (!sg) return;
    saveLastSuggestion(sg.key);
    sgBox.append(suggestionCard(ctx, sg, () => showSuggestion(true)));
    if (reroll) sgBox.querySelector('.suggest')?.focus();
  };
  showSuggestion(false);
  root.append(sgBox);

  // 検索と絞り込み
  const input = h('input', { type: 'search', id: 'q', placeholder: '豆名・店・国・感想で探す', value: session.q, 'aria-label': '検索', enterkeyhint: 'search', autocomplete: 'off' });
  const used = usageCounts(repo);
  const sel = (key, label, kind, ids) => h('label', { class: 'field' }, h('span', { class: 'lab', text: label }),
    h('select', { onChange: (e) => { session[key] = e.target.value; session.limit = 40; paint(); } },
      h('option', { value: '', text: 'すべて' }),
      ids.map((id) => h('option', { value: id, selected: session[key] === id, text: `${articleTitle(kind, id)}（${used[kind].get(id)}）` }))));
  const filters = h('details', { class: 'section', open: !!(session.country || session.variety || session.process) },
    h('summary', { text: '国・品種・精製で絞る' }),
    sel('country', '国', 'country', [...used.country.keys()].sort((a, b) => articleTitle('country', a).localeCompare(articleTitle('country', b), 'ja'))),
    sel('variety', '品種', 'variety', [...used.variety.keys()].sort((a, b) => articleTitle('variety', a).localeCompare(articleTitle('variety', b), 'ja'))),
    sel('process', '精製', 'process', [...used.process.keys()].sort((a, b) => articleTitle('process', a).localeCompare(articleTitle('process', b), 'ja'))));
  root.append(h('div', { style: 'margin-top:14px' }, input, filters), listBox);

  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { session.q = input.value; session.limit = 40; paint(); }, 150); });

  function matches(b) {
    const n = b.norm || {};
    if (session.country && n.countryId !== session.country) return false;
    if (session.variety && !(n.varietyIds || []).includes(session.variety)) return false;
    if (session.process && !(n.processIds || []).includes(session.process)) return false;
    const q = normKey(session.q);
    if (!q) return true;
    const extra = [getCountry(n.countryId)?.name, ...(n.varietyIds || []).map((v) => getVariety(v)?.name), ...(n.processIds || []).map((p) => getProcess(p)?.name)].join(' ');
    return normKey(beanSearchText(b, repo.tastingsOf(b.id)) + ' ' + extra).includes(q);
  }

  function paint() {
    const all = sortedBeans(repo).filter(matches);
    listBox.replaceChildren();
    const filtered = session.q || session.country || session.variety || session.process;
    listBox.append(h('p', { class: 'small muted', style: 'margin:12px 0 0', text: filtered ? `${all.length}件が見つかりました（全${repo.beans.size}件）` : `記録した豆 ${repo.beans.size}件` }));
    if (!all.length) listBox.append(h('div', { class: 'empty', text: '該当する記録がありません。' }));
    for (const b of all.slice(0, session.limit)) listBox.append(beanCard(repo, b));
    if (all.length > session.limit) listBox.append(h('div', { class: 'pager' }, h('button', { class: 'btn btn-quiet', type: 'button', text: `さらに表示（残り${all.length - session.limit}件）`, onClick: () => { session.limit += 40; paint(); } })));
  }
  paint();
  return { title: 'ノート', tab: 'note', node: root };
}

const LAST_KEY = 'tankyu:lastSuggestion';
function readLastSuggestion() { try { return sessionStorage.getItem(LAST_KEY) || undefined; } catch { return undefined; } }
function saveLastSuggestion(key) { try { sessionStorage.setItem(LAST_KEY, key); } catch { /* 任意 */ } }

function suggestionCard(ctx, sg, onReroll) {
  const title = beanTitle(sg.bean);
  const box = h('div', { class: 'suggest has-illust', tabindex: '-1' }, illust('bean', { size: 44, cls: 'illust-corner' }), h('div', { class: 'lab', text: 'この一杯から' }));
  const taste = (bean, label) => h('a', { class: 'small', style: 'display:inline-block;min-height:44px;line-height:44px', href: `#/bean/${enc(bean.id)}/taste`, text: label });
  if (sg.type === 'compare') {
    const c = sg.cand;
    box.append(
      h('p', { style: 'margin:4px 0' }, `「${title}」と「${beanTitle(c.other)}」を比べてみる`),
      h('p', { class: 'small muted', style: 'margin:0', text: `理由: ${c.reason}（${c.basis}）` }),
      h('a', { class: 'btn btn-block', href: `#/compare?a=${enc(sg.bean.id)}&b=${enc(c.other.id)}&reason=${enc(c.reason)}&theme=${enc(c.themeId || '')}`, text: '2つを並べて読む' }),
      h('div', { class: 'row' }, taste(sg.bean, `「${title}」に感想を追記`), taste(c.other, `「${beanTitle(c.other)}」に感想を追記`)));
  } else {
    box.append(
      h('p', { style: 'margin:4px 0' }, `「${title}」から: ${sg.text}`),
      h('p', { class: 'small muted', style: 'margin:0', text: `理由: ${sg.basis}` }),
      h('a', { class: 'btn btn-block', href: kindHref(sg.kind, sg.id), text: sg.kind === 'theme' ? '事典で読む' : '事典で読む' }),
      sg.kind === 'theme' ? null : h('div', { class: 'row' }, taste(sg.bean, `「${title}」に感想を追記`)));
  }
  box.append(h('button', { class: 'btn btn-quiet btn-small', type: 'button', style: 'margin-top:4px', text: '↻ ほかの提案', onClick: onReroll }));
  return box;
}

// ───────── 豆の詳細 ─────────
export function beanDetail(ctx, { id }) {
  const { repo } = ctx;
  const b = repo.beans.get(id);
  if (!b) return notFound('この豆の記録が見つかりません。削除されたかもしれません。');
  const n = b.norm || {};
  const tastings = sortTastings(repo.tastingsOf(b.id));

  const root = h('div');
  root.append(h('h1', { text: beanTitle(b) }));
  const sub = [];
  if (!isBlank(b.store)) sub.push(h('span', {}, '店: ', storeLink(b.store)));
  root.append(h('p', { class: 'muted', style: 'margin:0' }, sub));

  // 国・品種・精製（事典へのリンク。原文はそのまま下に残す）
  const chips = h('div', { class: 'chips' });
  if (n.countryId) chips.append(h('a', { class: 'chip', href: kindHref('country', n.countryId), text: `産地: ${getCountry(n.countryId).name}` }));
  for (const v of n.varietyIds || []) chips.append(h('a', { class: 'chip', href: kindHref('variety', v), text: `品種: ${getVariety(v).name}` }));
  for (const p of n.processIds || []) chips.append(h('a', { class: 'chip', href: kindHref('process', p), text: `精製: ${getProcess(p).name}` }));
  if (chips.children.length) root.append(chips);

  root.append(h('div', { class: 'row', style: 'margin:8px 0' },
    bookmarkButton(ctx, { kind: 'bean', targetId: b.id, source: { kind: 'bean', id: b.id, label: `豆「${beanTitle(b)}」のページ` } }),
    h('a', { class: 'btn btn-quiet btn-small', href: `#/compare?a=${enc(b.id)}`, text: '比べる' }),
    h('a', { class: 'btn btn-quiet btn-small', href: `#/bean/${enc(b.id)}/edit`, text: '編集' }),
    h('button', { class: 'btn btn-quiet btn-small', type: 'button', 'aria-haspopup': 'dialog', text: '⋯ 操作', onClick: () => guarded(async () => {
      const act = await actionSheet(beanTitle(b), [{ id: 'delete', label: 'この豆の記録を削除…', danger: true }]);
      if (act === 'delete') {
        const ok = await confirmDialog({ title: '削除しますか？', body: `「${beanTitle(b)}」と、その感想${tastings.length}件${repo.bookmarks.size ? '（気になる・比較も含む）' : ''}を削除します。元に戻せません。バックアップがあるか確認してください。`, ok: '削除する', danger: true });
        if (ok) { await repo.deleteBean(b.id); toast('削除しました'); ctx.go('#/', { replace: true }); }
      }
    }) })));

  // 感想の履歴
  root.append(h('h2', { text: `自分の感想（${tastings.length}件）` }));
  if (!tastings.length) root.append(h('p', { class: 'muted' }, illust('cup', { size: 36, cls: 'illust-inline' }), 'まだ感想はありません。感想がなくてもこの記録は有効です。'));
  for (const t of tastings) {
    root.append(h('div', { class: 'mine-box' },
      h('div', { class: 'when' }, formatDate(tastingDate(t)), t.source?.type === 'xlsx' ? '　（Excelから）' : ''),
      isBlank(t.text) ? h('p', { class: 'muted', text: '（本文なし）' }) : h('p', { class: 'pre', style: 'margin:4px 0', text: t.text }),
      h('a', { class: 'small', href: `#/bean/${enc(b.id)}/taste/${enc(t.id)}`, text: '修正・削除' })));
  }

  // お店のノート（本人の感想とは別枠）
  if (!isBlank(b.shopNote)) root.append(h('div', { class: 'note-box' }, h('div', { class: 'lab', text: 'お店のフレーバーノート' }), h('p', { style: 'margin:2px 0', text: b.shopNote })));

  // 豆の詳しい情報
  const rows = [['生産地', b.region], ['生産者', b.producer], ['精製所/農園', b.farm], ['標高', b.altitude], ['原産国（記録した表記）', b.country], ['品種（記録した表記）', b.variety], ['精製方法（記録した表記）', b.process], ['焙煎度', b.roast]].filter(([, v]) => !isBlank(v));
  const info = h('details', { class: 'section' },
    h('summary', { text: '豆の詳しい情報' }),
    rows.length ? h('dl', { class: 'kv' }, rows.map(([k, v]) => h('div', {}, h('dt', { text: k }), h('dd', { text: v })))) : h('p', { class: 'muted', text: '詳しい情報は記録されていません。編集から追加できます。' }));
  if (!isBlank(b.url)) info.append(h('p', {}, 'リンク: ', extLink(b.url, safeUrl(b.url) ? b.url : undefined), safeUrl(b.url) ? '' : h('span', { class: 'small muted', text: '（http/https以外のため開きません）' })));
  if (!isBlank(b.aiMemo)) info.append(h('div', { class: 'note-box' }, h('div', { class: 'lab', text: 'AIメモ（記録時に貼ったもの）' }), h('p', { class: 'pre', style: 'margin:2px 0', text: b.aiMemo })));
  info.append(h('p', { class: 'small muted', text: `記録日: ${formatDate(b.recordDate)}${b.source?.type === 'xlsx' ? `　取り込み元: ${b.source.fileName} の${b.source.row}行目` : ''}` }));
  root.append(info);

  // 関連
  const rel = h('section', {}, h('h2', { text: 'ここから広げる' }));
  const links = [];
  if (n.countryId) links.push(h('li', {}, h('a', { href: kindHref('country', n.countryId), text: `${getCountry(n.countryId).name}の背景・歴史・文化` })));
  for (const v of n.varietyIds || []) links.push(h('li', {}, h('a', { href: kindHref('variety', v), text: `${getVariety(v).name}の系譜と一般的な傾向` })));
  for (const p of n.processIds || []) links.push(h('li', {}, h('a', { href: kindHref('process', p), text: `${getProcess(p).name}の工程` })));
  links.push(h('li', {}, h('a', { href: `#/journey?bean=${enc(b.id)}`, text: 'この豆を「一杯が届くまで」にあてはめて読む' })));
  rel.append(h('ul', { class: 'list-plain' }, links.map((li) => { li.style.margin = '8px 0'; return li; })));
  const cands = comparisonCandidates(b, repo);
  const seen = new Set();
  const top = cands.filter((c) => (seen.has(c.other.id) ? false : (seen.add(c.other.id), true))).slice(0, 3);
  if (top.length) {
    rel.append(h('h3', { text: '過去の豆と比べる' }));
    for (const c of top) {
      rel.append(h('a', { class: 'card', href: `#/compare?a=${enc(b.id)}&b=${enc(c.other.id)}&reason=${enc(c.reason)}&theme=${enc(c.themeId || '')}` },
        h('h3', { text: beanTitle(c.other) }),
        h('div', { class: 'meta', text: `${c.reason}　（${c.basis}）` })));
    }
  }
  root.append(rel);

  const bar = h('div', { class: 'actionbar' }, h('a', { class: 'btn btn-primary', href: `#/bean/${enc(b.id)}/taste`, text: '＋ 感想を追記' }));
  return { title: '豆の記録', tab: 'note', back: '#/', node: root, actionbar: bar };
}

function notFound(msg) {
  return { title: '見つかりません', tab: 'note', back: '#/', node: h('div', { class: 'empty' }, illust('beans', { size: 72, cls: 'illust-hero' }), h('p', { text: msg }), h('a', { class: 'btn', href: '#/', text: 'ノートへ戻る' })) };
}

// ───────── 日付入力 ─────────
function dateField(label, initial, { hint } = {}) {
  const useText = initial && initial.precision === 'month';
  const val = initial ? initial.date : todayLocal();
  const input = h('input', { type: useText ? 'text' : 'date', id: 'f-date', value: val || '', ...(useText ? { inputmode: 'numeric', placeholder: '2026-10' } : {}), autocomplete: 'off' });
  const wrap = h('label', { class: 'field' }, h('span', { class: 'lab', text: label }), input,
    h('span', { class: 'hint', text: hint || (useText ? '年月だけで記録されています（例 2026-10）。日付まで分かれば 2026-10-25 の形で入力できます。' : '空にすると「日付不明」になります。') }));
  return { node: wrap, get: () => input.value, input };
}

// ───────── 豆の入力・編集 ─────────
const FIELD_DEFS = {
  store: ['店名 / 購入場所', '例: ○○珈琲（八尾）、通販'],
  country: ['原産国', '例: ケニア、Kenya（書いた通りに残ります）'],
  name: ['名称（豆の名前）', ''],
  variety: ['品種', '複数ならカンマで区切って入力できます'],
  process: ['精製方法', '例: Washed、ナチュラル'],
  region: ['生産地', ''],
  producer: ['生産者', ''],
  farm: ['精製所 / 農園', ''],
  altitude: ['標高', '例: 1,700m'],
  roast: ['焙煎度（任意）', '店の表記のまま。例: 浅煎り、Medium'],
  shopNote: ['お店のフレーバーノート', '商品ページや袋に書かれている説明。自分の感想は別に書きます。'],
  url: ['URL', 'http:// か https:// で始まるリンク'],
  aiMemo: ['AIメモ', 'AIに聞いた内容などを貼る欄'],
};

export function beanForm(ctx, { id }) {
  const { repo } = ctx;
  const editing = !!id;
  const b = editing ? repo.beans.get(id) : null;
  if (editing && !b) return notFound('この豆の記録が見つかりません。');

  const inputs = {};
  const field = (key, { area = false, list } = {}) => {
    const [lab, hint] = FIELD_DEFS[key];
    const el = area ? h('textarea', { id: `f-${key}`, rows: key === 'shopNote' ? 3 : 3 }) : h('input', { type: key === 'url' ? 'url' : 'text', id: `f-${key}`, autocomplete: 'off', ...(list ? { list } : {}), ...(key === 'url' ? { inputmode: 'url' } : {}) });
    el.value = b ? b[key] || '' : '';
    inputs[key] = el;
    return h('label', { class: 'field' }, h('span', { class: 'lab', text: lab }), el, hint ? h('span', { class: 'hint', text: hint }) : null);
  };

  const dlist = (id, names) => h('datalist', { id }, names.map((n) => h('option', { value: n })));
  const date = dateField(editing ? '記録日' : '日付', b ? b.recordDate : null, editing ? { hint: 'この豆を記録した日。感想の日付は感想ごとに変えられます。' } : undefined);
  const tastingArea = h('textarea', { id: 'f-tasting', rows: 6, placeholder: '飲んだ感想を、そのまま。空でも登録できます。' });

  const errBox = h('div', { class: 'banner error', role: 'alert', hidden: true });
  const hasContent = (keys) => b && keys.some((k) => !isBlank(b[k]));

  const form = h('form', { novalidate: true, autocomplete: 'off', onSubmit: (e) => { e.preventDefault(); save(); } },
    errBox,
    h('p', { class: 'small muted', text: '豆名か店名のどちらかがあれば登録できます。ほかは空欄でかまいません。' }),
    date.node,
    field('store'), field('name'), field('country', { list: 'dl-country' }), field('variety', { list: 'dl-variety' }), field('process', { list: 'dl-process' }),
    dlist('dl-country', COUNTRIES.filter((c) => !c.stub).map((c) => c.name)),
    dlist('dl-variety', VARIETIES.map((v) => v.name.split('（')[0])),
    dlist('dl-process', PROCESSES.map((p) => p.name.split('（')[0])),
    editing ? null : h('label', { class: 'field' }, h('span', { class: 'lab', text: '感想' }), tastingArea, h('span', { class: 'hint', text: '後から「感想を追記」で何度でも足せます。' })),
    h('details', { class: 'section', open: hasContent(['region', 'producer', 'farm', 'altitude', 'roast']) }, h('summary', { text: '産地の詳細' }),
      field('region'), field('producer'), field('farm'), field('altitude'), field('roast')),
    h('details', { class: 'section', open: hasContent(['shopNote', 'url', 'aiMemo']) }, h('summary', { text: 'お店の説明・リンク' }),
      field('shopNote', { area: true }), field('url'), field('aiMemo', { area: true })),
    h('div', { style: 'height:24px' }),
    h('button', { class: 'btn btn-primary btn-block', type: 'submit', text: '保存する' }));

  const snapshot = () => JSON.stringify([date.get(), tastingArea.value, ...Object.keys(inputs).map((k) => inputs[k].value)]);
  const initial = snapshot();

  async function save() {
    errBox.hidden = true;
    const fields = {};
    for (const k of Object.keys(inputs)) fields[k] = inputs[k].value;
    if (!hasMinimum(fields)) {
      errBox.textContent = '豆名か店名のどちらかを入力してください。';
      errBox.hidden = false;
      inputs.store.focus();
      return;
    }
    const url = fields.url.trim();
    if (url && !safeUrl(url)) { errBox.textContent = 'URLは http:// か https:// で始まる形式で入力してください（空欄でも保存できます）。'; errBox.hidden = false; inputs.url.focus(); return; }
    await guarded(async () => {
      const recordDate = dateFromInput(date.get(), b ? b.recordDate : undefined);
      if (editing) {
        await repo.saveBean(updateBean(b, fields, recordDate));
        toast('保存しました');
        ctx.go(`#/bean/${enc(b.id)}`, { replace: true });
      } else {
        const bean = makeBean(fields, { recordDate });
        if (!isBlank(tastingArea.value)) {
          await repo.saveBeanWithTasting(bean, makeTasting(bean.id, tastingArea.value, recordDate));
        } else await repo.saveBean(bean);
        toast('記録しました');
        ctx.go(`#/bean/${enc(bean.id)}`, { replace: true });
      }
    });
  }

  const cancel = async () => {
    if (snapshot() !== initial && !(await confirmDialog({ title: '入力を破棄しますか？', body: '保存されていない入力があります。', ok: '破棄する', cancel: '入力に戻る', danger: true }))) return;
    ctx.go(editing ? `#/bean/${enc(b.id)}` : '#/', { replace: true });
  };

  return {
    title: editing ? '豆を編集' : '豆を記録', tab: 'note', form: true, node: form,
    back: cancel,
    topRight: h('button', { class: 'icon-btn', type: 'button', onClick: () => form.requestSubmit(), text: '保存', style: 'font-weight:700;color:var(--accent)' }),
  };
}

// ───────── 感想の追記・修正 ─────────
export function tastingForm(ctx, { id, tid }) {
  const { repo } = ctx;
  const b = repo.beans.get(id);
  if (!b) return notFound('この豆の記録が見つかりません。');
  const t = tid ? repo.tastings.get(tid) : null;
  if (tid && !t) return notFound('この感想が見つかりません。');

  const date = dateField('飲んだ日', t ? tastingDate(t) : null);
  const area = h('textarea', { id: 'f-text', rows: 8, placeholder: '飲んだ感想を、そのまま。' });
  area.value = t ? t.text : '';
  const prior = sortTastings(repo.tastingsOf(b.id)).filter((x) => x.id !== tid)[0];
  const form = h('form', { novalidate: true, onSubmit: (e) => { e.preventDefault(); save(); } },
    h('p', { class: 'muted', style: 'margin:0', text: `「${beanTitle(b)}」${t ? 'の感想を修正' : 'に感想を追記'}` }),
    t ? h('p', { class: 'small muted', text: '修正すると元の文は置き換わります。新しい感想を足す場合は、戻って「感想を追記」を使ってください。' }) : (repo.tastingsOf(b.id).length ? h('p', { class: 'small muted', text: '前の感想は残ります。新しい記録として追加されます。' }) : null),
    h('label', { class: 'field' }, h('span', { class: 'lab', text: '感想' }), area),
    date.node,
    prior && !t ? h('details', { class: 'section' }, h('summary', { text: '前回の感想を見る' }), h('div', { class: 'mine-box' }, h('div', { class: 'when', text: formatDate(tastingDate(prior)) }), h('p', { class: 'pre', style: 'margin:4px 0', text: prior.text }))) : null,
    h('button', { class: 'btn btn-primary btn-block', type: 'submit', text: '保存する' }),
    t ? h('button', { class: 'btn btn-danger-quiet btn-block', type: 'button', text: 'この感想を削除…', onClick: () => guarded(async () => {
      if (await confirmDialog({ title: '感想を削除しますか？', body: '元に戻せません。', ok: '削除する', danger: true })) { await repo.deleteTasting(t.id); toast('削除しました'); ctx.go(`#/bean/${enc(b.id)}`, { replace: true }); }
    }) }) : null);

  const initial = JSON.stringify([area.value, date.get()]);
  async function save() {
    await guarded(async () => {
      const d = dateFromInput(date.get(), t ? tastingDate(t) : undefined);
      if (t) {
        await repo.saveTasting({ ...t, text: area.value, date: d.date, precision: d.precision, rawDate: d.raw, updatedAt: new Date().toISOString() });
      } else {
        if (isBlank(area.value)) { toast('感想を入力してください', { error: true }); area.focus(); return; }
        await repo.saveTasting(makeTasting(b.id, area.value, d));
      }
      toast('保存しました');
      ctx.go(`#/bean/${enc(b.id)}`, { replace: true });
    });
  }
  const cancel = async () => {
    if (JSON.stringify([area.value, date.get()]) !== initial && !(await confirmDialog({ title: '入力を破棄しますか？', body: '保存されていない入力があります。', ok: '破棄する', cancel: '入力に戻る', danger: true }))) return;
    ctx.go(`#/bean/${enc(b.id)}`, { replace: true });
  };
  return {
    title: t ? '感想を修正' : '感想を追記', tab: 'note', form: true, node: form, back: cancel,
    topRight: h('button', { class: 'icon-btn', type: 'button', onClick: () => form.requestSubmit(), text: '保存', style: 'font-weight:700;color:var(--accent)' }),
    focus: area,
  };
}

export { notFound };
