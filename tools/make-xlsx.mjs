// 最小のXLSXを組み立てる（テスト・サンプル用。外部ライブラリなし）。
import zlib from 'node:zlib';

const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function zip(files) {
  const parts = [], central = [];
  let off = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameB = Buffer.from(name);
    const raw = Buffer.from(content);
    const comp = zlib.deflateRawSync(raw);
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nameB.length, 26);
    parts.push(lh, nameB, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nameB.length, 28); ch.writeUInt32LE(off, 42);
    central.push(ch, nameB);
    off += lh.length + nameB.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colName = (i) => String.fromCharCode(65 + i);

/** rows: string[][]（1行目が見出し）。共有文字列で保存する。 */
export function makeXlsx(rows, sheetName = 'シート1') {
  const sst = [];
  const idx = new Map();
  const sid = (s) => { if (!idx.has(s)) { idx.set(s, sst.length); sst.push(s); } return idx.get(s); };
  const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => (v === '' || v == null ? '' : `<c r="${colName(ci)}${ri + 1}" t="s"><v>${sid(String(v))}</v></c>`)).join('') + '</row>').join('');
  return zip({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
    'xl/workbook.xml': `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml': `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sst.map((s) => `<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  });
}

export const HEADER = ['日付', '店名/購入場所', '原産国', '名称', '生産地', '生産者', '精製所/農園', '標高', '精製方法', '品種', 'フレーバーノート', '感想', 'URL', 'AIメモ'];

/** サンプル（実データとは無関係の架空の記録） */
export const SAMPLE_ROWS = [
  HEADER,
  ['', 'サンプル珈琲店', 'ケニア', '', 'ニエリ', '', 'サンプルWS', '1,700m', 'Washed', 'SL28, SL34', 'カシス, オレンジ', '赤い果実の酸が印象的。', '', ''],
  ['', 'サンプル珈琲店', 'KENYA', 'テスト ケニアAA', '', '', '', '', 'ウォッシュド', 'SL-28', '', '2回目。やはり酸が明るい。', 'https://example.com/kenya', ''],
  ['25/9', 'テストロースター', 'ブラジル', 'サンプル・ナチュラル', 'ミナス', '', '', '1,100m', 'ナチュラル', 'イエローブルボン・カトゥアイ', 'ナッツ, チョコ', 'ナッツの香ばしさ。チョコは感じない。', '', 'AIメモ例'],
  ['26/10', 'テストロースター', 'タイ', 'サンプル 青い月', 'チェンライ', '', '', '1000〜1300m', 'Washed', 'カトゥアイ・ブルボン', '', '', '', ''],
  ['', '架空ストア', 'Colombia', '', '', '', '', '', 'アナエロビック ナチュラル', 'Pink Bourbon', 'ベリー', '=1+1 で始まる感想', '', ''],
];
