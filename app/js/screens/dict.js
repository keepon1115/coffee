// 事典: 産地・品種・精製・一杯が届くまで・比較テーマ・歩み・お店
import { h, extLink } from '../ui.js';
import {
  COUNTRIES, VARIETIES, PROCESSES, THEMES, JOURNEY, HISTORY, STORES, STORES_CHECKED_AT,
  getCountry, getVariety, getProcess, getTheme, getStoreInfo, getArticle, searchKnowledge, normKey, KIND_LABEL, articleTitle, matchStoreInfo,
} from '../knowledge.js';
import { beanTitle, isBlank, formatDateShort } from '../model.js';
import { sortedBeans } from '../related.js';
import { beanCard, bookmarkButton, kindHref, enc, infoTag, sourceBlock, usageCounts, beansFor, storeKey, PDF_CHECKED } from './common.js';
import { notFound } from './note.js';
import { illust } from '../illust.js';

const state = { onlyNew: false };
const STAGE_ART = { farm: 'cherry', processing: 'drying', roasting: 'roaster', brewing: 'dripper' };

const GROUPS = {
  country: [
    ['アジア・オセアニア', ['thailand', 'indonesia', 'png', 'india', 'myanmar', 'china', 'east-timor', 'vietnam']],
    ['アフリカ', ['ethiopia', 'kenya', 'rwanda', 'burundi', 'tanzania', 'drc']],
    ['中南米', ['colombia', 'brazil', 'panama', 'costa-rica', 'guatemala', 'el-salvador', 'honduras', 'peru', 'nicaragua', 'mexico', 'jamaica']],
    ['その他', ['yemen', 'hawaii']],
  ],
};

// ───────── 事典のトップ ─────────
export function dictHome(ctx) {
  const { repo } = ctx;
  const used = usageCounts(repo);
  const root = h('div');
  const results = h('div', { 'aria-live': 'polite' });
  const input = h('input', { type: 'search', placeholder: '産地・品種・精製・店で探す', 'aria-label': '事典を検索', autocomplete: 'off', enterkeyhint: 'search' });
  input.addEventListener('input', () => {
    results.replaceChildren();
    const q = input.value.trim();
    if (!q) return;
    const found = searchKnowledge(q);
    if (!found.length) { results.append(h('p', { class: 'muted', text: '見つかりませんでした。' })); return; }
    for (const r of found.slice(0, 30)) results.append(h('a', { class: 'card', href: kindHref(r.kind, r.id) }, h('h3', { text: r.title }), h('div', { class: 'meta' }, h('span', { class: 'tag', text: KIND_LABEL[r.kind] }), r.sub)));
  });
  root.append(input, results);

  const entry = (href, title, sub, art) => h('a', { class: 'card' + (art ? ' has-illust' : ''), href }, art ? illust(art, { size: 44, cls: 'illust-corner' }) : null, h('h3', { text: title }), h('div', { class: 'meta', text: sub }));
  root.append(
    h('h2', { text: '引いてみる' }),
    entry('#/dict/country', '産地', `${COUNTRIES.length}か国　記録のある国 ${used.country.size}`, 'map'),
    entry('#/dict/variety', '品種', `${VARIETIES.length}種類　記録のある品種 ${used.variety.size}`, 'cherry'),
    entry('#/dict/process', '精製', `${PROCESSES.length}種類　記録のある精製 ${used.process.size}`, 'drying'),
    entry('#/journey', '一杯が届くまで', '農園 → 精製 → 焙煎 → 抽出', 'dripper'),
    h('h2', { text: 'そのほか' }),
    entry('#/themes', '比べ方のテーマ', '一度に変えるのは一つだけ、など'),
    entry('#/history', 'スペシャルティコーヒーの歩み', '世界と日本の年表'),
    entry('#/stores', 'お店', '記録に登場した店と、紹介のある店'));
  return { title: '事典', tab: 'dict', node: root };
}

// ───────── 一覧 ─────────
export function dictList(ctx, { kind }) {
  const { repo } = ctx;
  const used = usageCounts(repo)[kind];
  const list = kind === 'country' ? COUNTRIES : kind === 'variety' ? VARIETIES : PROCESSES;
  if (!['country', 'variety', 'process'].includes(kind)) return notFound('ページが見つかりません。');
  const root = h('div');
  const body = h('div');
  const row = (a) => {
    const n = used.get(a.id) || 0;
    return h('a', { class: 'card', href: kindHref(kind, a.id) },
      h('h3', { text: a.name }),
      h('div', { class: 'meta' }, h('span', { class: 'tag', text: n ? `あなたの記録 ${n}件` : '記録にまだない' })),
      kind === 'country' ? h('div', { class: 'small muted', text: a.summary }) : h('div', { class: 'small muted', text: kind === 'variety' ? a.lineage : a.steps }));
  };
  const paint = () => {
    body.replaceChildren();
    const keep = (a) => !state.onlyNew || !(used.get(a.id) || 0);
    if (kind === 'country') {
      for (const [g, ids] of GROUPS.country) {
        const items = ids.map((id) => getCountry(id)).filter((a) => a && keep(a));
        if (items.length) body.append(h('h2', { text: g }), items.map(row));
      }
    } else body.append(list.filter(keep).map(row));
    if (!body.children.length) body.append(h('p', { class: 'empty', text: 'すべて記録があります。' }));
  };
  const toggle = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.onlyNew), onClick: () => { state.onlyNew = !state.onlyNew; toggle.setAttribute('aria-pressed', String(state.onlyNew)); toggle.textContent = state.onlyNew ? '✓ 記録にまだないものだけ' : '記録にまだないものだけ表示'; paint(); } }, state.onlyNew ? '✓ 記録にまだないものだけ' : '記録にまだないものだけ表示');
  root.append(h('div', { class: 'chips' }, toggle), body);
  paint();
  return { title: { country: '産地', variety: '品種', process: '精製' }[kind], tab: 'dict', back: '#/dict', node: root };
}

// ───────── 記事 ─────────
function sec(heading, type, conf, ...content) {
  return h('section', {}, h('h2', {}, heading, ' ', infoTag(type, conf)), ...content);
}

function myBeans(ctx, kind, id, label) {
  const beans = sortedBeans(ctx.repo).filter((b) => beansFor(ctx.repo, kind, id).includes(b));
  const box = h('section', {}, h('h2', { text: 'あなたの記録' }));
  if (!beans.length) {
    box.append(h('p', { class: 'muted', text: `${label}は、あなたの記録にまだありません。` }));
  } else {
    box.append(beans.map((b) => beanCard(ctx.repo, b)));
  }
  return box;
}

function relatedBlock(ctx, rel) {
  if (!rel?.length) return null;
  const used = usageCounts(ctx.repo);
  return h('section', {}, h('h2', { text: '関連' }), h('div', { class: 'chips' }, rel.map(([k, id]) => {
    const n = k === 'theme' ? 1 : (used[k]?.get(id) || 0);
    return h('a', { class: 'chip', href: kindHref(k, id), text: `${articleTitle(k, id)}${k !== 'theme' && !n ? '（記録にまだない）' : ''}` });
  })));
}

export function article(ctx, { kind, id }) {
  if (kind === 'theme') return themeArticle(ctx, id);
  const a = getArticle(kind, id);
  if (!a) return notFound('このページは事典にありません。');
  const root = h('div');
  root.append(h('h1', { text: a.name }), h('div', { class: 'row', style: 'margin-bottom:6px' }, bookmarkButton(ctx, { kind, targetId: id, source: { kind, id, label: `${KIND_LABEL[kind]}「${a.name}」のページ` } })));
  if (a.en && kind === 'country') root.append(h('p', { class: 'muted small', style: 'margin:0', text: a.en }));

  if (kind === 'country') {
    root.append(h('p', { text: a.summary }));
    if (a.stub) root.append(h('div', { class: 'banner', text: 'この国の詳しい解説は事典にまだありません（未収録）。記録の原文はそのまま残っています。' }));
    if (a.regions.length) {
      root.append(sec('産地の傾向', 'tendency', 'pdf',
        h('p', { class: 'small muted', text: '標高は「その地域のスペシャルティ・アラビカでよく見るおおよその帯域」で、農園単位では外れます。味は一般傾向で、個々のロットの味を保証するものではありません。' }),
        a.regions.map((r) => h('div', { class: 'card' }, h('h3', { text: r.name }), h('dl', { class: 'kv' },
          h('div', {}, h('dt', { text: '主な品種' }), h('dd', { text: r.varieties })),
          h('div', {}, h('dt', { text: '代表的精製' }), h('dd', { text: r.process })),
          h('div', {}, h('dt', { text: '標高の目安' }), h('dd', { text: r.altitude })),
          h('div', {}, h('dt', { text: '風味の傾向' }), h('dd', { text: r.flavor })),
          h('div', {}, h('dt', { text: '個性を追いやすい焙煎' }), h('dd', { text: `${r.roast}（編集上の目安。優劣ではありません）` })))))));
      root.append(h('p', { class: 'small muted', text: '農園単位の情報は事典にありません。所在地や物語を推測で補わず、分かる国・地域までを表示しています。' }));
    }
    root.append(sec('歴史・文化', a.history.type, a.history.conf || a.history.confidence, h('p', { class: 'pre', text: a.history.body })));
    if (a.culture) root.append(h('div', { class: 'card' }, infoTag(a.culture.type, a.culture.confidence), h('p', { class: 'pre', style: 'margin:6px 0 0', text: a.culture.body })));
    if (a.hint) root.append(sec('探索のヒント', 'suggestion', 'pdf', h('p', { text: a.hint })));
    root.append(myBeans(ctx, 'country', id, `${a.name}の豆`));
  } else if (kind === 'variety') {
    root.append(
      sec('系譜・由来', 'fact', 'pdf', h('p', { text: a.lineage })),
      sec('栽培上の特徴', 'fact', 'pdf', h('p', { text: a.agro })),
      sec('一般的な味の傾向', 'tendency', 'pdf', h('p', { text: a.flavor }), h('p', { class: 'small muted', text: '同じ品種でも、標高・土壌・気象、精製、焙煎で味は大きく変わります。品種だけで味は決まりません。' })),
      sec('飲み比べのポイント', 'suggestion', 'pdf', h('p', { text: a.compare })));
    if (a.note) root.append(h('div', { class: 'note-box' }, h('p', { style: 'margin:0', text: a.note })));
    root.append(myBeans(ctx, 'variety', id, `${a.name}の豆`));
  } else if (kind === 'process') {
    root.append(
      sec('典型的な工程', 'fact', 'pdf', h('p', { text: a.steps })),
      sec('発酵・酸素の特徴', 'fact', 'pdf', h('p', { text: a.ferment })),
      sec('一般的な味への影響', 'tendency', 'pdf', h('p', { text: a.flavor })),
      sec('主なリスク・論点', 'fact', 'pdf', h('p', { text: a.risk })),
      sec('比較に向く焙煎', 'suggestion', 'pdf', h('p', { text: a.roast })));
    if (a.extra) root.append(h('div', { class: 'card' }, infoTag('fact', 'pdf'), h('p', { style: 'margin:6px 0 0', text: a.extra })));
    if (a.note) root.append(h('div', { class: 'note-box' }, h('p', { style: 'margin:0', text: a.note })));
    root.append(myBeans(ctx, 'process', id, `${a.name}の豆`));
    root.append(h('p', {}, h('a', { href: '#/journey', text: '「一杯が届くまで」で工程の流れを見る' })));
  }
  root.append(relatedBlock(ctx, a.related));
  root.append(sourceBlock([...(a.sources || []), ...(a.extraSources || [])]));
  return { title: a.name, tab: 'dict', back: `#/dict/${kind}`, node: root };
}

function themeArticle(ctx, id) {
  const t = getTheme(id);
  if (!t) return notFound('このページは事典にありません。');
  const root = h('div');
  root.append(h('h1', { text: t.title }), h('div', { class: 'row' }, bookmarkButton(ctx, { kind: 'theme', targetId: id, source: { kind: 'theme', id, label: `比較テーマ「${t.title}」` } })));
  root.append(h('p', {}, infoTag(t.type, 'pdf')));
  if (t.fixed) root.append(h('dl', { class: 'kv' }, h('div', {}, h('dt', { text: '固定するもの' }), h('dd', { text: t.fixed })), h('div', {}, h('dt', { text: '分かること' }), h('dd', { text: t.learn }))));
  root.append(h('p', { class: 'pre', text: t.body }));
  root.append(h('p', { class: 'small muted', text: 'これは一般的な比べ方の提案です。あなたの記録に基づく分析ではありません。' }));
  root.append(sourceBlock(['pdf']));
  return { title: '比べ方のテーマ', tab: 'dict', back: '#/themes', node: root };
}

export function themes(ctx) {
  const root = h('div');
  root.append(h('p', { class: 'muted', text: '「次に何を買うか」を決めるための、一般的な比べ方です。' }));
  for (const t of THEMES) root.append(h('a', { class: 'card', href: kindHref('theme', t.id) }, h('h3', { text: t.title }), h('div', { class: 'meta', text: t.learn ? `分かること: ${t.learn}` : '' })));
  return { title: '比べ方のテーマ', tab: 'dict', back: '#/dict', node: root };
}

// ───────── 一杯が届くまで ─────────
export function journey(ctx, _p, query) {
  const { repo } = ctx;
  const bean = query.get('bean') ? repo.beans.get(query.get('bean')) : null;
  const root = h('div');
  root.append(h('h1', { text: '一杯が届くまで' }), h('p', { class: 'muted', text: '農園から抽出まで。各カードを開くと短く読めます。' }));

  const beans = sortedBeans(repo);
  if (beans.length) {
    const sel = h('select', { 'aria-label': '豆を選んで工程にあてはめる', onChange: (e) => ctx.go(e.target.value ? `#/journey?bean=${enc(e.target.value)}` : '#/journey', { replace: true }) },
      h('option', { value: '', text: '豆を選ぶと、その豆の情報を重ねて表示します' }),
      beans.slice(0, 200).map((b) => h('option', { value: b.id, selected: bean?.id === b.id, text: `${beanTitle(b)}${b.store ? `（${b.store}）` : ''}` })));
    root.append(h('label', { class: 'field' }, h('span', { class: 'lab', text: '記録した豆にあてはめる' }), sel));
  }

  const yours = (stage) => {
    if (!bean) return null;
    const n = bean.norm || {};
    const items = [];
    const add = (k, v) => { if (!isBlank(v)) items.push(h('div', {}, h('dt', { text: k }), h('dd', { text: v }))); };
    if (stage === 'farm') {
      add('生産地', bean.region); add('生産者', bean.producer); add('農園', bean.farm); add('標高', bean.altitude); add('品種（記録した表記）', bean.variety);
    } else if (stage === 'processing') add('精製方法（記録した表記）', bean.process);
    else if (stage === 'roasting') add('焙煎度', bean.roast);
    const links = [];
    if (stage === 'farm') {
      if (n.countryId) links.push(h('a', { class: 'chip', href: kindHref('country', n.countryId), text: getCountry(n.countryId).name }));
      for (const v of n.varietyIds || []) links.push(h('a', { class: 'chip', href: kindHref('variety', v), text: getVariety(v).name }));
    }
    if (stage === 'processing') for (const p of n.processIds || []) links.push(h('a', { class: 'chip', href: kindHref('process', p), text: getProcess(p).name }));
    return h('div', { class: 'mine-box your' },
      h('div', { class: 'when', text: `「${beanTitle(bean)}」の記録` }),
      items.length ? h('dl', { class: 'kv' }, items) : h('p', { class: 'muted', style: 'margin:4px 0', text: stage === 'brewing' ? '抽出条件は、このアプリでは記録していません。' : stage === 'roasting' ? '焙煎度は記録されていません。' : 'この工程に関する情報は記録されていません。' }),
      links.length ? h('div', { class: 'chips' }, links) : null);
  };

  const line = h('div', { class: 'journey' });
  for (const st of JOURNEY) {
    const stage = h('section', { class: 'stage' }, h('h2', {}, illust(STAGE_ART[st.id], { cls: 'illust-inline' }), st.title), h('p', { class: 'muted', style: 'margin-top:0', text: st.lead }));
    for (const c of st.cards) {
      stage.append(h('details', { class: 'card' }, h('summary', {}, c.title, ' ', infoTag(c.type, c.conf)), h('p', { class: 'pre', text: c.body })));
    }
    stage.append(yours(st.id));
    const lk = st.links.map(([k, id]) => k === 'dict' ? h('a', { class: 'chip', href: `#/dict/${id}`, text: `${KIND_LABEL[id] || id}の事典` }) : h('a', { class: 'chip', href: kindHref(k, id), text: articleTitle(k, id) }));
    stage.append(h('div', { class: 'chips' }, lk));
    line.append(stage);
  }
  root.append(line, sourceBlock(['pdf', 'wcr-var', 'sca-ferm', 'editorial']));
  return { title: '一杯が届くまで', tab: 'dict', back: bean ? `#/bean/${enc(bean.id)}` : '#/dict', node: root };
}

// ───────── 歩み ─────────
export function history(ctx) {
  const root = h('div');
  const table = (rows, cols) => h('div', {}, rows.map(([y, ev, mean]) => h('div', { class: 'card' }, h('div', { class: 'serif', style: 'font-size:1.1rem', text: y }), h('p', { style: 'margin:2px 0', text: ev }), h('p', { class: 'small muted', style: 'margin:0', text: `探求者にとっての意味: ${mean}` }))));
  root.append(h('h1', { text: HISTORY.title }), h('p', { text: HISTORY.lead }), h('p', { class: 'small muted', text: HISTORY.note }),
    h('h2', {}, '世界の動き ', infoTag('fact', 'pdf')), table(HISTORY.world),
    h('h2', {}, '日本への受け継がれ方 ', infoTag('fact', 'pdf')), table(HISTORY.japan),
    h('p', { text: HISTORY.closing }), sourceBlock(HISTORY.sources));
  return { title: '歩み', tab: 'dict', back: '#/dict', node: root };
}

// ───────── お店 ─────────
export function stores(ctx) {
  const { repo } = ctx;
  const groups = new Map();
  for (const b of repo.beans.values()) {
    if (isBlank(b.store)) continue;
    const k = storeKey(b.store);
    const g = groups.get(k) || { name: b.store, n: 0 };
    g.n++;
    groups.set(k, g);
  }
  const root = h('div');
  root.append(h('h2', { style: 'margin-top:0', text: '記録に登場した店' }), h('p', { class: 'small muted', text: '購入したか店を訪れたかは区別せず、「その店の豆の記録」を数えています。' }));
  const list = [...groups.entries()].sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name, 'ja'));
  if (!list.length) root.append(h('p', { class: 'muted', text: '店名の記録がまだありません。' }));
  for (const [k, g] of list) root.append(h('a', { class: 'card', href: kindHref('store', k) }, h('h3', { text: g.name }), h('div', { class: 'meta', text: `この店の豆の記録 ${g.n}件` })));
  root.append(h('h2', { text: '紹介のある店' }), h('p', { class: 'small muted', text: `事典の紹介です（確認時点 ${STORES_CHECKED_AT}）。在庫・営業時間・価格は変わります。` }));
  for (const s of STORES) root.append(h('a', { class: 'card', href: kindHref('store', `k:${s.id}`) }, h('h3', { text: s.name }), h('div', { class: 'meta', text: s.area })));
  return { title: 'お店', tab: 'dict', back: '#/dict', node: root };
}

export function storeDetail(ctx, { key }) {
  const { repo } = ctx;
  let info = null, display, beans = [];
  if (key.startsWith('k:')) {
    info = getStoreInfo(key.slice(2));
    if (!info) return notFound('このお店は見つかりません。');
    display = info.name;
    beans = sortedBeans(repo).filter((b) => matchStoreInfo(b.store)?.id === info.id);
  } else {
    beans = sortedBeans(repo).filter((b) => storeKey(b.store) === key);
    if (!beans.length) return notFound('この店の記録は見つかりません。');
    display = beans[0].store;
    info = matchStoreInfo(display);
  }
  const bmKey = info && key.startsWith('k:') ? key : key;
  const root = h('div');
  root.append(h('h1', { text: display }), h('p', { class: 'muted small', text: beans.length ? '記録に登場した店' : '紹介のある店（あなたの記録にはまだ登場していません）' }),
    h('div', { class: 'row' }, bookmarkButton(ctx, { kind: 'store', targetId: bmKey, source: { kind: 'store', id: bmKey, label: `店「${display}」のページ` } })));
  if (info) {
    root.append(h('div', { class: 'card' }, infoTag('fact', 'pdf'), h('p', { style: 'margin:6px 0 2px', text: `${info.area}` }), h('p', { style: 'margin:2px 0', text: info.body }),
      h('p', {}, '公式サイト: ', extLink(info.url)),
      h('p', { class: 'small muted', text: `確認時点: ${STORES_CHECKED_AT}（元の事典の記載。在庫・営業時間・価格は変わります。リンク先は再確認していません）` })));
  } else root.append(h('p', { class: 'small muted', text: 'この店の紹介は事典にありません。' }));
  if (beans.length) root.append(h('h2', { text: `この店の豆の記録（${beans.length}件）` }), h('p', { class: 'small muted', text: '購入したか店を訪れたかは区別していません。' }), beans.map((b) => beanCard(repo, b)));
  return { title: '店', tab: 'dict', back: '#/stores', node: root };
}
