// 比較・気になる・設定（バックアップ）・Excel取り込み
import { h, toast, guarded, confirmDialog, saveFile, extLink } from '../ui.js';
import { beanTitle, formatDate, tastingDate, isBlank, formatDateShort } from '../model.js';
import { KIND_LABEL, articleTitle, getTheme, normKey } from '../knowledge.js';
import { KNOWLEDGE_VERSION as KV } from '../knowledge-data.js';
import { comparisonCandidates, compareBeans, sortedBeans, findTerms } from '../related.js';
import { sortTastings, kindHref, enc, beanMeta, infoTag } from './common.js';
import { buildBackup, backupFileName, validateBackup, restoreBackup, parseBackupText, buildCsv } from '../backup.js';
import { readXlsx } from '../xlsx.js';
import { parseSheet, buildPlan, applyPlan } from '../importer.js';
import { notFound } from './note.js';

// ───────── 比較 ─────────
export function compare(ctx, _p, query) {
  const { repo } = ctx;
  const a = repo.beans.get(query.get('a') || '');
  if (!a) return notFound('比較する豆が見つかりません。豆の詳細ページの「比べる」から開いてください。');
  const b = repo.beans.get(query.get('b') || '');
  if (!b) return comparePicker(ctx, a);

  const reason = query.get('reason') || '';
  const themeId = query.get('theme') || '';
  const theme = getTheme(themeId);
  const saved = repo.findComparison(a.id, b.id);
  const sum = compareBeans(a, b);
  const root = h('div');
  root.append(h('h1', { text: '2つの豆を並べて読む' }));
  if (reason) root.append(h('p', {}, h('span', { class: 'tag', text: '比べる理由' }), reason));
  else if (saved?.theme) root.append(h('p', {}, h('span', { class: 'tag', text: '比べる理由' }), saved.theme));
  if (theme) root.append(h('p', { class: 'small' }, '参考: ', h('a', { href: kindHref('theme', theme.id), text: theme.title })));

  root.append(h('div', { class: 'card' },
    h('h3', { text: '共通と違い（記録された項目だけ）' }),
    h('p', { style: 'margin:4px 0', text: sum.common.length ? `共通: ${sum.common.join('、')}` : '共通: 記録からは見つかりませんでした' }),
    h('p', { style: 'margin:4px 0', text: sum.diff.length ? `違い: ${sum.diff.join('、')}` : '違い: 記録からは見つかりませんでした' }),
    sum.unknown.length ? h('p', { class: 'small muted', style: 'margin:4px 0', text: `比べられない（どちらかが未記録）: ${sum.unknown.join('、')}` }) : null,
    h('p', { class: 'small muted', style: 'margin:8px 0 0', text: '2つの豆には多くの条件の違いがあります。この違いの原因が品種や精製だとは言えません。' })));

  const picks = [null, null];
  const col = (bean, i) => {
    const ts = sortTastings(repo.tastingsOf(bean.id));
    const sel = ts.length > 1 ? h('select', { 'aria-label': `${beanTitle(bean)}の感想の日付`, onChange: (e) => { picks[i] = e.target.value; paintText(); } },
      ts.map((t) => h('option', { value: t.id, text: formatDate(tastingDate(t)) }))) : null;
    const wantId = saved?.tastingIds?.[i];
    if (sel && wantId && ts.some((t) => t.id === wantId)) sel.value = wantId;
    picks[i] = sel ? sel.value : ts[0]?.id || null;
    const textBox = h('div', { class: 'mine-box' });
    const paintText = () => {
      const t = ts.find((x) => x.id === picks[i]);
      textBox.replaceChildren(
        h('div', { class: 'when', text: t ? formatDate(tastingDate(t)) : '' }),
        t ? (isBlank(t.text) ? h('p', { class: 'muted', text: '（本文なし）' }) : h('p', { class: 'pre', style: 'margin:4px 0', text: t.text })) : h('p', { class: 'muted', style: 'margin:4px 0', text: 'この豆には感想がまだありません。' }));
      if (t && !isBlank(t.text)) {
        const terms = findTerms(t.text).map((x) => x.term);
        if (terms.length) textBox.append(h('p', { class: 'small muted', style: 'margin:4px 0 0', text: `感想に登場する語: ${terms.slice(0, 6).join('、')}` }));
      }
    };
    paintText();
    const tbl = h('table', {}, h('tbody', {}, sum.rows.map((r) => {
      const v = i === 0 ? r.a : r.b;
      return h('tr', { class: r.same ? 'same' : '' }, h('th', { scope: 'row', text: r.label }), h('td', { text: isBlank(v) ? '—（未記録）' : v }));
    })));
    return h('div', { class: 'col' },
      h('h3', {}, h('a', { href: kindHref('bean', bean.id), text: beanTitle(bean) })),
      h('p', { class: 'small muted', style: 'margin:0 0 6px', text: beanMeta(bean) }),
      tbl,
      isBlank(bean.shopNote) ? null : h('div', { class: 'note-box' }, h('div', { class: 'lab', text: 'お店のフレーバーノート' }), h('p', { style: 'margin:2px 0', text: bean.shopNote })),
      h('div', { class: 'lab small muted', style: 'margin-top:8px;font-weight:700', text: '自分の感想' }), sel, textBox);
  };
  root.append(h('div', { class: 'cmp' }, col(a, 0), col(b, 1)));

  const note = h('textarea', { rows: 3, placeholder: '比べて思ったこと（書かなくても保存できます）' });
  note.value = saved?.note || '';
  const status = h('p', { class: 'small muted', text: saved ? '保存済みの比較です。' : '' });
  root.append(h('h2', { text: '比較を残す' }), h('label', { class: 'field' }, h('span', { class: 'lab', text: '一言（任意）' }), note),
    h('button', { class: 'btn btn-primary btn-block', type: 'button', text: saved ? '比較の保存を更新' : '比較を保存', onClick: () => guarded(async () => {
      await repo.saveComparison({ beanIds: [a.id, b.id], tastingIds: [picks[0], picks[1]], theme: reason || saved?.theme || '', note: note.value });
      toast('比較を保存しました（「気になる」で見返せます）');
      status.textContent = '保存済みの比較です。';
    }) }), status);
  return { title: '比較', tab: 'note', back: `#/bean/${enc(a.id)}`, node: root };
}

function comparePicker(ctx, a) {
  const { repo } = ctx;
  const root = h('div');
  root.append(h('h1', { text: `「${beanTitle(a)}」と比べる豆を選ぶ` }));
  const cands = comparisonCandidates(a, repo);
  const seen = new Set();
  const top = cands.filter((c) => (seen.has(c.other.id) ? false : (seen.add(c.other.id), true))).slice(0, 8);
  const href = (c) => `#/compare?a=${enc(a.id)}&b=${enc(c.other.id)}&reason=${enc(c.reason)}&theme=${enc(c.themeId || '')}`;
  if (top.length) {
    root.append(h('h2', { text: '比べる理由のある豆' }));
    for (const c of top) root.append(h('a', { class: 'card', href: href(c) }, h('h3', { text: beanTitle(c.other) }), h('div', { class: 'meta', text: `${c.reason}（${c.basis}）` })));
  }
  root.append(h('h2', { text: 'すべての豆から選ぶ' }));
  const box = h('div');
  const input = h('input', { type: 'search', placeholder: '豆名・店・国で探す', 'aria-label': '比較する豆を検索', autocomplete: 'off' });
  const paint = () => {
    box.replaceChildren();
    const q = normKey(input.value);
    const list = sortedBeans(repo).filter((x) => x.id !== a.id && (!q || normKey([x.name, x.store, x.country, x.variety].join(' ')).includes(q)));
    for (const x of list.slice(0, 50)) box.append(h('a', { class: 'card', href: `#/compare?a=${enc(a.id)}&b=${enc(x.id)}` }, h('h3', { text: beanTitle(x) }), h('div', { class: 'meta', text: beanMeta(x) })));
    if (!list.length) box.append(h('p', { class: 'muted', text: '該当する豆がありません。' }));
    if (list.length > 50) box.append(h('p', { class: 'small muted', text: '先頭50件を表示しています。検索で絞り込めます。' }));
  };
  input.addEventListener('input', paint);
  paint();
  root.append(input, box);
  return { title: '比べる豆を選ぶ', tab: 'note', back: `#/bean/${enc(a.id)}`, node: root };
}

// ───────── 気になる ─────────
export function saved(ctx) {
  const { repo } = ctx;
  const root = h('div');
  root.append(h('p', { class: 'muted', text: '次に読みたい産地・品種・精製、気になる店や豆のしおりです。' }));
  const all = [...repo.bookmarks.values()];
  const cmps = [...repo.comparisons.values()];
  if (!all.length && !cmps.length) {
    root.append(h('div', { class: 'empty' }, h('p', { text: 'まだ何も保存していません。' }), h('p', { class: 'small', text: '事典や豆のページの「☆ 気になる」を押すと、ここに残ります。' }), h('a', { class: 'btn', href: '#/dict', text: '事典を開く' })));
    return { title: '気になる', tab: 'saved', node: root };
  }
  const order = ['country', 'variety', 'process', 'store', 'bean', 'theme'];
  for (const kind of order) {
    const items = all.filter((x) => x.kind === kind).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (!items.length) continue;
    root.append(h('h2', { text: { country: '産地', variety: '品種', process: '精製', store: '店', bean: '豆', theme: '比較テーマ' }[kind] }));
    for (const bm of items) root.append(bookmarkRow(ctx, bm, () => ctx.rerender()));
  }
  if (cmps.length) {
    root.append(h('h2', { text: '保存した比較' }));
    for (const c of cmps.sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1))) {
      const [x, y] = c.beanIds.map((id) => repo.beans.get(id));
      if (!x || !y) continue;
      root.append(h('div', { class: 'card' },
        h('h3', {}, h('a', { href: `#/compare?a=${enc(x.id)}&b=${enc(y.id)}`, text: `${beanTitle(x)} × ${beanTitle(y)}` })),
        c.theme ? h('div', { class: 'meta', text: `比べる理由: ${c.theme}` }) : null,
        c.note ? h('p', { class: 'pre', style: 'margin:6px 0 0', text: c.note }) : null,
        h('div', { class: 'row', style: 'margin-top:6px' }, h('button', { class: 'btn btn-quiet btn-small', type: 'button', text: '比較を削除', onClick: () => guarded(async () => {
          if (await confirmDialog({ title: '保存した比較を削除しますか？', body: '2つの豆の記録は残ります。', ok: '削除する', danger: true })) { await repo.deleteComparison(c.id); ctx.rerender(); }
        }) }))));
    }
  }
  return { title: '気になる', tab: 'saved', node: root };
}

function bookmarkRow(ctx, bm, done) {
  const { repo } = ctx;
  let title, href, missing = false;
  if (bm.kind === 'bean') { const b = repo.beans.get(bm.targetId); if (b) { title = beanTitle(b); } else { title = '（削除された豆）'; missing = true; } href = kindHref('bean', bm.targetId); }
  else if (bm.kind === 'store') { const key = bm.targetId; const b = [...repo.beans.values()].find((x) => normKey(x.store) === key); title = key.startsWith('k:') ? articleTitle('store', key.slice(2)) : b ? b.store : key; href = kindHref('store', key); }
  else { title = articleTitle(bm.kind, bm.targetId); href = kindHref(bm.kind, bm.targetId); }
  return h('div', { class: 'card' },
    h('h3', {}, missing ? title : h('a', { href, text: title })),
    h('div', { class: 'meta' }, bm.reason ? `理由: ${bm.reason}` : '理由: （なし）', bm.source ? `　保存元: ${bm.source.label || ''}` : ''),
    bm.kind === 'country' && !usedCountry(repo, bm.targetId) ? h('div', { class: 'small muted', text: '記録にまだない産地です。' }) : null,
    h('div', { class: 'row', style: 'margin-top:6px' },
      h('button', { class: 'btn btn-quiet btn-small', type: 'button', text: '理由を編集', onClick: () => editReason(ctx, bm, done) }),
      h('button', { class: 'btn btn-quiet btn-small', type: 'button', text: '解除', onClick: () => guarded(async () => { await repo.removeBookmark(bm.id); toast('外しました'); done(); }) })));
}
const usedCountry = (repo, id) => [...repo.beans.values()].some((b) => b.norm?.countryId === id);

function editReason(ctx, bm, done) {
  const input = h('input', { type: 'text', value: bm.reason || '', 'aria-label': '保存の理由' });
  const body = h('div', {}, h('p', { class: 'small muted', text: '保存元から自動で入った理由です。自由に書き換えられます。' }), input);
  confirmDialog({ title: '保存の理由', body, ok: '保存' }).then((ok) => {
    if (ok) guarded(async () => { await ctx.repo.commit([['put', 'bookmarks', { ...bm, reason: input.value }]]); done(); });
  });
  setTimeout(() => input.focus(), 50);
}

// ───────── 設定・データ管理 ─────────
export function settings(ctx) {
  const { repo } = ctx;
  const root = h('div');
  const last = repo.settings.lastBackupAt;
  root.append(
    h('h2', { style: 'margin-top:0', text: 'この端末の記録' }),
    h('dl', { class: 'kv' },
      h('div', {}, h('dt', { text: '豆' }), h('dd', { text: `${repo.beans.size}件` })),
      h('div', {}, h('dt', { text: '感想' }), h('dd', { text: `${repo.tastings.size}件` })),
      h('div', {}, h('dt', { text: '気になる' }), h('dd', { text: `${repo.bookmarks.size}件` })),
      h('div', {}, h('dt', { text: '比較' }), h('dd', { text: `${repo.comparisons.size}件` })),
      h('div', {}, h('dt', { text: '最終バックアップ' }), h('dd', { text: last ? new Date(last).toLocaleString('ja-JP') : 'まだありません' }))),
    h('p', { class: 'small muted', text: '記録はこの端末のブラウザ内にだけ保存されます（サーバーには送られません）。ブラウザのデータ消去や端末の変更で失われることがあるため、ときどきJSONで書き出しておくと安心です。' }));
  const persist = h('p', { class: 'small muted', text: '' });
  navigator.storage?.persisted?.().then((p) => { persist.textContent = p ? '保存領域: 自動削除されにくい設定になっています。' : '保存領域: ブラウザの判断で消去される可能性があります。ホーム画面に追加すると保護されやすくなります。'; }).catch(() => {});
  if (ctx.storageMode === 'memory') root.append(h('div', { class: 'banner error', role: 'alert', text: 'この環境では端末内保存を使えません。記録はこのタブを閉じると消えます。通常のブラウザウィンドウで開き直してください。' }));
  root.append(persist);

  // バックアップ
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) restoreFlow(ctx, f); } });
  root.append(
    h('h2', { text: 'バックアップ' }),
    h('button', { class: 'btn btn-primary btn-block', type: 'button', text: '完全バックアップを書き出す（JSON）', onClick: () => guarded(async () => {
      const now = new Date();
      const data = buildBackup(repo, now);
      const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
      const r = await saveFile(backupFileName(now), blob);
      if (r !== 'cancel') { await repo.saveSettings({ lastBackupAt: now.toISOString() }); toast('バックアップを書き出しました'); ctx.rerender(); }
    }, '書き出せませんでした') }),
    h('p', { class: 'small muted', text: '豆・感想・気になる・比較をすべて含みます。復元はこのJSONで行います。' }),
    h('button', { class: 'btn btn-block', type: 'button', text: 'JSONバックアップから復元…', onClick: () => fileIn.click() }), fileIn,
    h('p', { class: 'small muted', text: '復元すると、いまの記録は読み込む内容で置き換わります。実行前に件数を確認できます。' }),
    h('button', { class: 'btn btn-block', type: 'button', text: 'Excel向けにCSVで書き出す', onClick: () => guarded(async () => {
      await saveFile(`tankyu-coffee-${new Date().toISOString().slice(0, 10)}.csv`, new Blob([buildCsv(repo)], { type: 'text/csv;charset=utf-8' }));
    }, '書き出せませんでした') }),
    h('p', { class: 'small muted', text: 'Excelで読むための書き出しです。1感想1行で、感想のない豆も1行残ります。CSVからの復元はできません（完全な復元はJSONを使います）。' }));

  // 取り込み
  root.append(h('h2', { text: 'Excelから取り込む' }), h('a', { class: 'btn btn-block', href: '#/import', text: 'コーヒー探究.xlsx を取り込む' }));
  const imps = repo.settings.imports || [];
  if (imps.length) root.append(h('h3', { text: '取り込み履歴' }), h('ul', { class: 'small list-plain' }, imps.slice().reverse().slice(0, 5).map((i) => h('li', { text: `${new Date(i.importedAt).toLocaleString('ja-JP')}　${i.fileName}　追加${i.added}・更新${i.updated}・スキップ${i.skipped}` }))));

  root.append(
    h('h2', { text: 'スマホのホーム画面に置く' }),
    h('ul', { class: 'small' },
      h('li', { text: 'iPhone（Safari）: 共有ボタン →「ホーム画面に追加」' }),
      h('li', { text: 'Android（Chrome）: メニュー →「アプリをインストール」または「ホーム画面に追加」' }),
      h('li', { text: '一度開いたあとは、通信がなくても記録・事典・検索を使えます（初回は通信が必要です）。' })),
    h('h2', { text: 'このアプリについて' }),
    h('p', { class: 'small muted', text: `事典データ版: ${KV}　保存形式: schemaVersion 1　点数・ランキング・SNS・クラウド同期はありません。事典の内容は元の資料の記載を編集したもので、出典と確認時点を各ページに示しています。` }));
  return { title: '設定とデータ', tab: null, back: '#/', node: root };
}

async function restoreFlow(ctx, file) {
  const { repo } = ctx;
  await guarded(async () => {
    const text = await file.text();
    const obj = parseBackupText(text);
    const v = validateBackup(obj);
    if (!v.ok) {
      await confirmDialog({ title: '復元できません', body: `${v.errors.join('\n')}\n\nいまの記録は変更していません。`, ok: '閉じる', cancel: '' });
      return;
    }
    const c = v.counts;
    const ok = await confirmDialog({
      title: '復元しますか？',
      body: `ファイル「${file.name}」${v.exportedAt ? `（${new Date(v.exportedAt).toLocaleString('ja-JP')} 書き出し）` : ''}\n\n読み込む内容: 豆${c.beans}・感想${c.tastings}・気になる${c.bookmarks}・比較${c.comparisons}\nいまの記録: 豆${repo.beans.size}・感想${repo.tastings.size}・気になる${repo.bookmarks.size}・比較${repo.comparisons.size}\n\nいまの記録は、読み込む内容で置き換わります。`,
      ok: '置き換えて復元', danger: true,
    });
    if (!ok) return;
    await restoreBackup(repo, obj);
    toast('復元しました');
    ctx.go('#/', { replace: true });
  }, '復元できませんでした（いまの記録は変更していません）');
}

// ───────── Excel取り込み ─────────
export function importScreen(ctx) {
  const { repo } = ctx;
  const root = h('div');
  const out = h('div');
  let parsed = null, meta = null, inherit = false, applyUpdates = false;

  const fileIn = h('input', { type: 'file', accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', onChange: (e) => { const f = e.target.files[0]; if (f) load(f); } });
  root.append(
    h('p', { text: 'コーヒー探究.xlsx（14列）を読み込み、内容を確認してから取り込みます。ファイルはこの端末で読むだけで、元のファイルは変更されず、どこにも送信されません。' }),
    h('label', { class: 'field' }, h('span', { class: 'lab', text: 'Excelファイル（.xlsx）を選ぶ' }), fileIn),
    out);

  async function load(file) {
    out.replaceChildren(h('p', { class: 'muted', text: '読み込み中…' }));
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const { rows, sheetName } = await readXlsx(buf);
      parsed = parseSheet(rows);
      meta = { fileName: file.name, sheetName };
      paint();
    } catch (e) {
      parsed = null;
      out.replaceChildren(h('div', { class: 'banner error', role: 'alert', text: `取り込めません: ${e.message}` }));
    }
  }

  function paint() {
    const plan = buildPlan(parsed, repo, { ...meta, inheritDate: inherit });
    const s = plan.summary;
    const sample = plan.items.filter((i) => i.action !== 'skip').slice(0, 6);
    out.replaceChildren(
      h('h2', { text: '取り込みプレビュー' }),
      h('dl', { class: 'kv' },
        h('div', {}, h('dt', { text: 'ファイル' }), h('dd', { text: `${meta.fileName}（シート「${meta.sheetName}」）` })),
        h('div', {}, h('dt', { text: '対象の行' }), h('dd', { text: `${s.rows}行（14列すべて保持）` })),
        h('div', {}, h('dt', { text: '新しく追加' }), h('dd', { text: `${s.add}件（うち感想あり ${s.tastings}件）` })),
        h('div', {}, h('dt', { text: '取り込み済み' }), h('dd', { text: `${s.skip}件（スキップ）` })),
        h('div', {}, h('dt', { text: '内容が変わった' }), h('dd', { text: `${s.update}件` })),
        h('div', {}, h('dt', { text: '日付' }), h('dd', { text: `年月のみ ${s.monthDates}件・日付不明 ${s.blankDates}件${s.inheritedDates ? `・直前の年月を引き継ぎ ${s.inheritedDates}件` : ''}` }))),
      plan.extraColumns.length ? h('p', { class: 'small muted', text: `14列以外の列（取り込まれません）: ${plan.extraColumns.join('、')}` }) : null,
      h('label', { class: 'field', style: 'display:flex;gap:10px;align-items:flex-start' },
        h('input', { type: 'checkbox', style: 'width:24px;height:24px;margin-top:4px', checked: inherit, onChange: (e) => { inherit = e.target.checked; paint(); } }),
        h('span', {}, h('span', { class: 'lab', text: '日付が空の行は、直前の行の年月を引き継ぐ' }), h('span', { class: 'hint', text: '初期値はオフ（日付不明のまま）。元の表記は空のまま必ず残ります。' }))),
      s.update ? h('label', { class: 'field', style: 'display:flex;gap:10px;align-items:flex-start' },
        h('input', { type: 'checkbox', style: 'width:24px;height:24px;margin-top:4px', checked: applyUpdates, onChange: (e) => { applyUpdates = e.target.checked; } }),
        h('span', {}, h('span', { class: 'lab', text: `内容が変わった${s.update}件をExcelの内容で更新する` }), h('span', { class: 'hint', text: 'アプリ側で編集した内容は上書きされます。初期値はオフです。' }))) : null,
      s.warnings ? h('div', { class: 'banner' }, h('strong', { text: `確認が必要な行（${s.warnings}）` }), h('ul', { class: 'small' }, plan.items.filter((i) => i.warnings.length).slice(0, 6).map((i) => h('li', { text: `${i.rowNumber}行目: ${i.warnings.join(' / ')}` })))) : null,
      sample.length ? h('details', { class: 'section' }, h('summary', { text: `内容の例（${sample.length}件）` }), sample.map((i) => h('div', { class: 'card' },
        h('div', { class: 'meta', text: `${i.rowNumber}行目 → ${i.action === 'add' ? '追加' : '更新'}` }),
        h('strong', { text: i.summary.name || i.summary.store || '（名称なし）' }),
        h('div', { class: 'small muted', text: [i.summary.store, i.summary.country].filter(Boolean).join(' ・ ') }),
        h('div', { class: 'small muted', text: `日付: ${i.date.date ? formatDateShort(i.date) : '不明'}${i.inherited ? '（引き継ぎ）' : ''}　感想: ${i.hasTasting ? 'あり' : 'なし'}` })))) : null,
      h('button', { class: 'btn btn-primary btn-block', type: 'button', disabled: !(s.add || (s.update && applyUpdates)), text: s.add || s.update ? '取り込む' : '取り込む内容はありません', onClick: () => guarded(async () => {
        const r = await applyPlan(repo, plan, { applyUpdates });
        out.replaceChildren(h('div', { class: 'banner' }, h('strong', { text: '取り込みました' }), h('p', { text: `追加 ${r.added}件・更新 ${r.updated}件・スキップ ${r.skipped}件` }), h('a', { class: 'btn btn-primary btn-block', href: '#/', text: 'ノートを見る' })));
        toast('取り込みました');
      }, '取り込めませんでした') }));
  }
  return { title: 'Excelから取り込む', tab: null, back: '#/settings', node: root };
}
