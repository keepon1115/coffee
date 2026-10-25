// app/ 配下のファイル一覧と内容ハッシュから sw.js の ASSETS / VERSION を更新する。
// 配布前に必ず実行: node tools/build-sw.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

export function listAssets() {
  return walk(root)
    .map((p) => path.relative(root, p).split(path.sep).join('/'))
    .filter((p) => p !== 'sw.js')
    .sort();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const files = listAssets();
  const h = crypto.createHash('sha256');
  for (const f of files) { h.update(f); h.update(fs.readFileSync(path.join(root, f))); }
  const version = h.digest('hex').slice(0, 10);
  const assets = ['./', ...files.map((f) => `./${f}`)];
  const swPath = path.join(root, 'sw.js');
  let sw = fs.readFileSync(swPath, 'utf8');
  sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`).replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = ${JSON.stringify(assets, null, 2)};`);
  fs.writeFileSync(swPath, sw);
  console.log(`sw.js updated: version ${version}, ${assets.length} assets`);
}
