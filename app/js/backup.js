// 完全バックアップ（JSON）と Excel 向け CSV。
import { SCHEMA_VERSION, formatDate, tastingDate, dateSortKey } from './model.js';

export const BACKUP_APP = 'tankyu-coffee';

export function buildBackup(repo, now = new Date()) {
  const arr = (m) => [...m.values()];
  return {
    app: BACKUP_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    counts: { beans: repo.beans.size, tastings: repo.tastings.size, bookmarks: repo.bookmarks.size, comparisons: repo.comparisons.size },
    data: {
      beans: arr(repo.beans),
      tastings: arr(repo.tastings),
      bookmarks: arr(repo.bookmarks),
      comparisons: arr(repo.comparisons),
    },
    settings: { imports: repo.settings.imports || [], lastBackupAt: repo.settings.lastBackupAt || '' },
  };
}

export const backupFileName = (now = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `tankyu-coffee-backup-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.json`;
};

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';

/** 取り込み前の検証。1件でも問題があれば ok:false（既存データには触れない） */
export function validateBackup(obj) {
  const errors = [];
  if (!isObj(obj)) return { ok: false, errors: ['バックアップファイルの形式ではありません（JSONオブジェクトではありません）'] };
  if (obj.app !== BACKUP_APP) errors.push('この探究コーヒーのバックアップではありません');
  if (typeof obj.schemaVersion !== 'number') errors.push('schemaVersion がありません');
  else if (obj.schemaVersion > SCHEMA_VERSION) errors.push(`新しい版のバックアップです（schemaVersion ${obj.schemaVersion}）。アプリを更新してください`);
  const d = obj.data;
  if (!isObj(d)) errors.push('data がありません');
  else {
    for (const k of ['beans', 'tastings', 'bookmarks', 'comparisons']) if (!Array.isArray(d[k])) errors.push(`data.${k} が配列ではありません`);
  }
  if (errors.length) return { ok: false, errors };

  const ids = (list, label) => {
    const seen = new Set();
    list.forEach((x, i) => {
      if (!isObj(x) || !isStr(x.id) || !x.id) errors.push(`${label}[${i}] に id がありません`);
      else if (seen.has(x.id)) errors.push(`${label} の id が重複しています: ${x.id}`);
      else seen.add(x.id);
    });
    return seen;
  };
  const beanIds = ids(d.beans, 'beans');
  ids(d.tastings, 'tastings');
  ids(d.bookmarks, 'bookmarks');
  ids(d.comparisons, 'comparisons');
  if (errors.length) return { ok: false, errors: errors.slice(0, 10) };

  d.beans.forEach((b, i) => {
    for (const k of ['name', 'store', 'country', 'region', 'producer', 'farm', 'altitude', 'process', 'variety', 'shopNote', 'url', 'aiMemo']) {
      if (b[k] != null && !isStr(b[k])) errors.push(`beans[${i}].${k} が文字列ではありません`);
    }
    if (!isObj(b.recordDate)) errors.push(`beans[${i}].recordDate がありません`);
  });
  d.tastings.forEach((t, i) => {
    if (!beanIds.has(t.beanId)) errors.push(`tastings[${i}] の beanId が存在しません: ${t.beanId}`);
    if (!isStr(t.text)) errors.push(`tastings[${i}].text が文字列ではありません`);
  });
  d.bookmarks.forEach((b, i) => { if (!isStr(b.kind) || !isStr(b.targetId)) errors.push(`bookmarks[${i}] の kind/targetId が不正です`); });
  d.comparisons.forEach((c, i) => {
    if (!Array.isArray(c.beanIds) || c.beanIds.length !== 2 || !c.beanIds.every((x) => beanIds.has(x))) errors.push(`comparisons[${i}] の beanIds が不正です`);
  });
  if (errors.length) return { ok: false, errors: errors.slice(0, 10) };

  return {
    ok: true, errors: [],
    counts: { beans: d.beans.length, tastings: d.tastings.length, bookmarks: d.bookmarks.length, comparisons: d.comparisons.length },
    exportedAt: obj.exportedAt || '',
  };
}

/** 検証済みバックアップで全置換。読み込み・検証に失敗したら何も変えない */
export async function restoreBackup(repo, obj) {
  const v = validateBackup(obj);
  if (!v.ok) throw new Error(v.errors.join('\n'));
  await repo.replaceAll({
    beans: obj.data.beans, tastings: obj.data.tastings, bookmarks: obj.data.bookmarks, comparisons: obj.data.comparisons,
    settings: { ...(obj.settings || {}), imports: obj.settings?.imports || [], lastBackupAt: obj.settings?.lastBackupAt || '' },
  });
  return v.counts;
}

export function parseBackupText(text) {
  try { return JSON.parse(text.replace(/^﻿/, '')); } catch { throw new Error('JSONとして読めませんでした。バックアップのJSONファイルを選んでください'); }
}

// ───── CSV ─────
export const CSV_HEADERS = ['beanId', 'tastingId', '日付', '日付(正規化)', '日付精度', '元の日付表記', '店名/購入場所', '原産国', '名称', '生産地', '生産者', '精製所/農園', '標高', '精製方法', '品種', 'フレーバーノート(お店)', '感想', 'URL', 'AIメモ', '焙煎度'];

/** セルをCSV用に。先頭が数式として実行され得る文字なら ' を前置する */
export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsv(repo) {
  const rows = [CSV_HEADERS];
  const beans = [...repo.beans.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  for (const b of beans) {
    const ts = repo.tastingsOf(b.id).sort((x, y) => (dateSortKey(tastingDate(x)) + x.createdAt < dateSortKey(tastingDate(y)) + y.createdAt ? -1 : 1));
    const common = [b.store, b.country, b.name, b.region, b.producer, b.farm, b.altitude, b.process, b.variety, b.shopNote];
    const tail = [b.url, b.aiMemo, b.roast];
    if (!ts.length) {
      const d = b.recordDate || {};
      rows.push([b.id, '', formatDate(d).replace(/^日付不明.*/, ''), d.date || '', d.precision || 'unknown', d.raw ?? '', ...common, '', ...tail]);
    } else {
      for (const t of ts) {
        const d = tastingDate(t);
        rows.push([b.id, t.id, formatDate(d).replace(/^日付不明.*/, ''), d.date || '', d.precision || 'unknown', d.raw ?? '', ...common, t.text, ...tail]);
      }
    }
  }
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
