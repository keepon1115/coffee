// 細い線画のイラスト（装飾）。インラインSVGなので外部画像なし・オフラインでもそのまま表示される。
// 線は currentColor。色は CSS（.illust）で薄めている。意味を持たないので読み上げ対象から外す。
const SVG_NS = 'http://www.w3.org/2000/svg';

// 各図柄は 64×64 の座標。要素は path の d か [d, 追加属性]
const DRAWINGS = {
  cup: [
    'M14 28v10a16 16 0 0 0 32 0V28z', 'M46 32h3a6 6 0 0 1 0 12h-4', 'M9 57h42',
    'M24 21c-3-4 3-6 0-11', 'M32 21c-3-4 3-6 0-11', 'M40 21c-3-4 3-6 0-11',
  ],
  bean: [
    ['M20 32c0-10 6-17 12-17s12 7 12 17-6 17-12 17-12-7-12-17z', { transform: 'rotate(-35 32 32)' }],
    ['M32 16c-5 8 5 15 0 32', { transform: 'rotate(-35 32 32)' }],
  ],
  beans: [
    ['M8 34c0-8 5-13 10-13s10 5 10 13-5 13-10 13-10-5-10-13z', { transform: 'rotate(-30 18 34)' }],
    ['M18 22c-4 6 4 12 0 24', { transform: 'rotate(-30 18 34)' }],
    ['M34 38c0-8 5-13 10-13s10 5 10 13-5 13-10 13-10-5-10-13z', { transform: 'rotate(25 44 38)' }],
    ['M44 26c-4 6 4 12 0 24', { transform: 'rotate(25 44 38)' }],
  ],
  cherry: [
    'M32 8c0 9-3 15-11 23', 'M32 8c0 9 4 15 12 20', 'M32 10c6-6 14-4 18 0-6 4-14 4-18 0z',
    'M12 41a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M34 38a10 10 0 1 0 20 0a10 10 0 1 0-20 0',
  ],
  drying: [
    'M6 32h52v5H6z', 'M12 37v19', 'M52 37v19', 'M12 48h40',
    'M14 28a4 2.5 0 1 0 8 0a4 2.5 0 1 0-8 0', 'M28 28a4 2.5 0 1 0 8 0a4 2.5 0 1 0-8 0', 'M42 28a4 2.5 0 1 0 8 0a4 2.5 0 1 0-8 0',
    'M20 14c0 3 3 3 3 6', 'M40 12c0 3 3 3 3 6',
  ],
  roaster: [
    'M32 8c4 9 13 13 13 24a13 13 0 0 1-26 0c0-7 4-9 7-16 2 4 4 5 6-8z',
    'M26 38c0 3 3 6 6 6s6-3 6-6', 'M12 56h40',
  ],
  dripper: [
    'M12 12h40l-9 19H21z', 'M27 31v6h10v-6', 'M20 42h24v8a8 8 0 0 1-8 8h-8a8 8 0 0 1-8-8z', 'M32 38v3',
  ],
  map: [
    'M6 16l17-6 18 6 17-6v38l-17 6-18-6-17 6z', 'M23 10v38', 'M41 16v38', 'M47 26a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  ],
  notebook: [
    'M16 8h30a4 4 0 0 1 4 4v40a4 4 0 0 1-4 4H16z', 'M16 8v48', 'M24 20h18', 'M24 28h18', 'M24 36h10',
    'M44 46l10-10 4 4-10 10-5 1z',
  ],
};

export const ILLUST_NAMES = Object.keys(DRAWINGS);

/** 線画のSVG要素。size は px、cls は追加のクラス（illust-corner / illust-hero など） */
export function illust(name, { size = 48, cls = '' } = {}) {
  const parts = DRAWINGS[name];
  if (!parts) throw new Error(`未知のイラスト: ${name}`);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `illust ${cls}`.trim());
  svg.style.setProperty('--size', `${size}px`);
  for (const part of parts) {
    const [d, attrs] = typeof part === 'string' ? [part, null] : part;
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', d);
    if (attrs) for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
    svg.append(p);
  }
  return svg;
}
