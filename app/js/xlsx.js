// 最小限のXLSX読み取り（依存なし）。ZIP(deflate) + SpreadsheetML を正規表現で解釈する。
// ブラウザ・Nodeの両方で動く（DecompressionStream を使用）。元ファイルは読むだけ。

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('XLSXファイルとして読めません（ZIP構造が見つかりません）');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder('utf-8');
  const files = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('ZIPの目次が壊れています');
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const elen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + elen + clen;
    const lnlen = dv.getUint16(lho + 26, true);
    const lelen = dv.getUint16(lho + 28, true);
    const start = lho + 30 + lnlen + lelen;
    files[name] = { method, data: u8.subarray(start, start + csize) };
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name];
      if (!f) return null;
      const raw = f.method === 0 ? f.data : f.method === 8 ? await inflateRaw(f.data) : null;
      if (!raw) throw new Error('未対応のZIP圧縮方式です');
      return dec.decode(raw);
    },
  };
}

function unescapeXml(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[e];
  });
}

// <si> や <is> 内の <t> を連結（ルビ <rPh> は除外）
function textOf(xml) {
  const cleaned = xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '').replace(/<phoneticPr[^>]*\/>/g, '');
  let out = '';
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\s*\/>/g;
  let m;
  while ((m = re.exec(cleaned))) out += m[1] ? unescapeXml(m[1]) : '';
  return out;
}

function colIndex(ref) {
  const letters = ref.match(/^[A-Z]+/)[0];
  let n = 0;
  for (const c of letters) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

// 戻り値: { sheetName, rows: string[][] }  すべて文字列（空セルは ''）
// 数値セルは Excel の表示に近い文字列にする（日付形式は後述の serial 変換）。
export async function readXlsx(buf) {
  const zip = await readZip(buf);
  const wb = (await zip.text('xl/workbook.xml')) || '';
  const sheetMatch = wb.match(/<sheet\b[^>]*name="([^"]*)"[^>]*r:id="([^"]*)"/);
  const sheetName = sheetMatch ? unescapeXml(sheetMatch[1]) : 'シート1';
  let target = 'xl/worksheets/sheet1.xml';
  if (sheetMatch) {
    const rels = (await zip.text('xl/_rels/workbook.xml.rels')) || '';
    const rm = rels.match(new RegExp(`<Relationship\\b[^>]*Id="${sheetMatch[2]}"[^>]*>`));
    const tm = rm && rm[0].match(/Target="([^"]*)"/);
    if (tm) target = tm[1].startsWith('/') ? tm[1].slice(1) : 'xl/' + tm[1];
  }
  const sheet = await zip.text(target);
  if (!sheet) throw new Error('シートが見つかりません');

  const sst = [];
  const sstXml = await zip.text('xl/sharedStrings.xml');
  if (sstXml) {
    const re = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\s*\/>/g;
    let m;
    while ((m = re.exec(sstXml))) sst.push(m[1] ? textOf(m[1]) : '');
  }

  // 日付書式のセルID（styles.xml）
  const dateStyles = new Set();
  const styles = await zip.text('xl/styles.xml');
  if (styles) {
    const custom = {};
    for (const m of styles.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) custom[m[1]] = m[2];
    const xfs = (styles.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/) || [''])[0];
    let i = 0;
    for (const m of xfs.matchAll(/<xf\b[^>]*numFmtId="(\d+)"/g)) {
      const id = +m[1];
      const code = custom[id] || '';
      if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47) || (/[ymd]/i.test(code) && !/General|\[Red\]/.test(code) && !/^[#0.,]+$/.test(code))) dateStyles.add(i);
      i++;
    }
  }

  const rows = [];
  const rowRe = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g;
  let rm;
  while ((rm = rowRe.exec(sheet))) {
    const attrs = rm[0].match(/^<row\b[^>]*/)[0];
    const rn = +(attrs.match(/\br="(\d+)"/) || [0, rows.length + 1])[1];
    const row = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(rm[1] || ''))) {
      const a = cm[1];
      const ref = (a.match(/\br="([A-Z]+\d+)"/) || [])[1];
      if (!ref) continue;
      const t = (a.match(/\bt="(\w+)"/) || [])[1];
      const s = +((a.match(/\bs="(\d+)"/) || [0, 0])[1]);
      const inner = cm[2] || '';
      let val = '';
      if (t === 's') { const v = inner.match(/<v>([\s\S]*?)<\/v>/); val = v ? sst[+v[1]] ?? '' : ''; }
      else if (t === 'inlineStr') { val = textOf(inner); }
      else if (t === 'str' || t === 'e') { const v = inner.match(/<v>([\s\S]*?)<\/v>/); val = v ? unescapeXml(v[1]) : ''; }
      else if (t === 'b') { const v = inner.match(/<v>([\s\S]*?)<\/v>/); val = v && v[1] === '1' ? 'TRUE' : 'FALSE'; }
      else {
        const v = inner.match(/<v>([\s\S]*?)<\/v>/);
        if (v) {
          if (dateStyles.has(s)) val = serialToIso(+v[1]);
          else val = v[1];
        }
      }
      row[colIndex(ref)] = val;
    }
    for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = '';
    rows[rn - 1] = row;
  }
  for (let i = 0; i < rows.length; i++) if (!rows[i]) rows[i] = [];
  return { sheetName, rows };
}

function serialToIso(n) {
  if (!isFinite(n)) return String(n);
  const d = new Date(Math.round((n - 25569) * 86400000));
  return d.toISOString().slice(0, 10);
}
