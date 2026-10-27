// 一杯の線画。保存データと独立した、終了可能な起動演出。
export const INTRO_KEY = 'tankyu-coffee:intro:lastShownDay:v1';
export const DURATION = { full: 5200, short: 1000 };
let seenDay = '';
let activeIntro = null;

export function japanDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function chooseIntro({ hash = '', reduced = false, lastDay = '', day = japanDay(), manual = false } = {}) {
  if (manual) return reduced ? 'still' : 'full';
  if (reduced || (hash && hash !== '#/' && !hash.startsWith('#/?'))) return null;
  return lastDay === day ? 'short' : 'full';
}

const clamp = (v) => Math.max(0, Math.min(1, v));
const progress = (t, a, b) => clamp((t - a) / (b - a));
const ease = (v) => v * v * (3 - 2 * v);
const tween = (t, a, b) => ease(progress(t, a, b));
const visible = (t, a, b, fade = 130) => Math.min(progress(t, a, a + fade), 1 - progress(t, b - fade, b));
const mix = (a, b, u) => a + (b - a) * u;

// 同じ時刻なら同じ絵になる。タイマーの積み重ねや端末のフレーム数に依存しない。
export function sceneAt(time, mode = 'full') {
  const t = mode === 'short' ? Math.min(time, 650) : time;
  const millX = mix(259, 180, tween(t, 1500, 1740));
  const scoop = tween(t, 860, 1240);
  const plunge = tween(t, 650, 850);
  const scoopX = t < 860 ? mix(178, 96, plunge) : mix(96, 250, scoop);
  const scoopY = t < 860 ? mix(85, 132, plunge) : 132 - 68 * Math.sin(scoop * Math.PI) - 12 * scoop;
  const crank = progress(t, 1680, 2550) * Math.PI * 4;
  const crankX = Math.cos(crank) * 37;
  const crankY = Math.sin(crank) * 10;
  const transfer = tween(t, 2630, 2880);
  return {
    t, millX, scoopX, scoopY, crankX, crankY,
    bag: mode === 'short' ? 1 : 1 - tween(t, 1460, 1690),
    flap: tween(t, 140, 350), aroma: visible(t, 240, 1450, 230),
    spoon: visible(t, 650, 1570), spoonTilt: 35 * tween(t, 1220, 1390),
    mill: visible(t, 1000, 2820), hand: visible(t, 1610, 2620),
    grounds: tween(t, 1870, 2520), receiver: visible(t, 2550, 3130),
    receiverX: mix(180, 220, transfer), receiverY: mix(213, 111, transfer),
    receiverTilt: 115 * tween(t, 2810, 2980),
    dripper: visible(t, 2710, 4330), cup: progress(t, 2760, 2940),
    cupX: mix(247, 180, tween(t, 4260, 4510)),
    kettle: visible(t, 3100, 4160), pour: visible(t, 3330, 4020, 120),
    bloom: tween(t, 3430, 3760), steam: visible(t, 4190, 4900, 200),
    caption: visible(t, 4290, 4950, 180), rule: tween(t, 4720, 5070),
    opacity: mode === 'short' ? 1 - tween(time, 650, 1000) : 1 - tween(t, 4820, 5200),
  };
}

const bean = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse rx="4" ry="6" fill="#856047" stroke-width="1.3"/><path d="M0-5C-3-1 3 1 0 5" stroke="#E9DECC" stroke-width="1"/></g>`;

function artwork() {
  return `<svg class="coffee-intro-art" viewBox="0 0 360 300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g data-part="bag">
      <path d="M64 135 57 218Q56 225 65 226H135Q144 225 141 217L132 135" fill="#E9DECC"/>
      <path d="M65 144Q97 154 132 144M64 217Q98 222 139 217M65 149 61 212M132 149 138 212" stroke-width="1.2"/>
      <ellipse cx="98" cy="137" rx="34" ry="9" fill="#F7F3EB"/>
      <g data-part="flap"><path d="M64 137 68 120Q98 115 130 120L132 137Q98 131 64 137Z" fill="#E9DECC"/><path d="M72 124Q98 121 126 124" stroke-width="1"/></g>
      <g transform="translate(98 184) rotate(-22)"><ellipse rx="10" ry="14"/><path d="M0-12C-6-4 6 3 0 12"/></g>
    </g>
    <g data-part="aroma" stroke="#C59658" stroke-width="1.7"><path d="M83 120C68 100 99 96 84 72"/><path d="M100 116C115 94 89 86 105 59"/><path d="M118 121C135 103 111 92 127 78"/></g>
    <g data-part="mill"><g data-part="mill-body">
      <path d="M-25 133H25L21 205H-21Z" fill="#F7F3EB"/><ellipse cy="133" rx="25" ry="7" fill="#E9DECC"/>
      <path d="M-20 148H20M-21 201H21M-14 152V193M14 152V193" stroke-width="1.2"/>
      <g data-part="mill-drawer"><path d="M-21 205H21L19 229H-19Z" fill="#E9DECC"/><path d="M-5 216H5"/><g data-part="mill-grounds" fill="#856047" stroke="none"><path d="M-16 224Q-9 213 0 217Q10 209 16 224Z"/></g></g>
      <path d="M0 130V112"/><path data-part="crank-arm" d="M0 112H37"/><ellipse data-part="crank-knob" cx="37" cy="108" rx="8" ry="5" fill="#E9DECC"/>
    </g></g>
    <g data-part="spoon"><path d="M12-3 72-11Q80-11 80-7L15 4" fill="#F7F3EB"/><ellipse rx="17" ry="7" fill="#E9DECC"/><g data-part="scoop-beans">${bean(-8,-3,-30)}${bean(0,-6,20)}${bean(8,-3,45)}</g></g>
    <g data-part="falling-beans">${[0,1,2].map(i=>`<g data-bean="${i}">${bean(0,0,i*35-30)}</g>`).join('')}</g>
    <g data-part="hand"><path d="M17-29 10-18Q8-14 4-15L-2-17Q-8-19-11-14L-16-6Q-18-2-14 1L-10-3-13 5Q-13 9-8 9L-3 1Q-1-1 2 1L7 4Q12 6 16 0L26-13 34-19" fill="#F7F3EB"/><path d="M-10-3-4-10Q-1-13 3-10L8-6M17-29 34-19"/></g>
    <g data-part="cup"><path d="M-27 202H26L23 232Q22 247 0 248Q-23 247-24 232Z" fill="#F7F3EB"/><path d="M27 207H33Q47 207 43 221Q40 231 25 230M-35 254Q0 263 37 254"/><path data-part="coffee-surface" d="M-22 223Q0 231 22 223" stroke="#B8893F"/>
      <g data-part="steam" stroke="#C59658" stroke-width="1.7"><path d="M-9 190C-22 176 1 167-10 151"/><path d="M9 188C23 172 1 163 15 144"/></g>
    </g>
    <g data-part="dripper"><path d="M208 133H286L267 180H227Z" fill="#F7F3EB"/><path d="M220 143 234 175M233 145 240 177M275 143 261 175M261 145 254 177" stroke-width="1.2"/><path d="M203 182H291M240 182V190H254V182"/><ellipse cx="247" cy="134" rx="38" ry="6" fill="#F7F3EB"/><path data-part="bloom" d="M217 134Q247 127 277 134Q247 142 217 134Z" fill="#B8893F" fill-opacity=".25" stroke="#856047" stroke-width="1.2"/></g>
    <g data-part="receiver"><path d="M-21-8H21L19 16Q0 22-19 16Z" fill="#E9DECC"/><path d="M-4 5H4"/></g>
    <g data-part="powder" fill="#856047" stroke="none">${Array.from({length:10},(_,i)=>`<circle data-grain="${i}" r="${i%3===0?1.6:1.1}"/>`).join('')}</g>
    <g data-part="kettle"><path d="M106 78Q101 52 122 46H149Q168 50 169 78L167 105Q137 114 107 104Z" fill="#F7F3EB"/><path d="M109 65C75 39 76 110 107 94M121 45V40H149V45M130 39Q135 32 140 39M168 79Q190 91 211 75L223 70Q207 100 169 99" fill="#F7F3EB"/><path d="M113 101Q137 107 162 101" stroke-width="1.2"/></g>
    <path data-part="water" d="M224 78Q245 92 247 130" stroke="#C59658" stroke-width="1.6"/>
    <path data-part="drop" d="M0-4Q-5 2 0 4Q5 2 0-4Z" fill="#B8893F" stroke="none"/>
    <path data-part="rule" d="M56 276H304" stroke="#DED5C8" stroke-width="1"/>
  </svg>`;
}

export function paintScene(root, time, mode = 'full') {
  const s = sceneAt(time, mode);
  const p = (name) => root.querySelector(`[data-part="${name}"]`);
  const alpha = (name, value) => p(name).setAttribute('opacity', String(value));
  const transform = (name, value) => p(name).setAttribute('transform', value);
  root.style.opacity = String(s.opacity);
  alpha('bag', s.bag); transform('flap', `translate(0 ${-15*s.flap}) rotate(${-8*s.flap} 98 137)`);
  alpha('aroma', s.aroma); transform('aroma', `translate(${Math.sin(time/220)*2} ${-18*tween(s.t,240,1100)})`);
  alpha('mill', s.mill); transform('mill', `translate(${s.millX} 0)`);
  alpha('mill-drawer', 1-tween(s.t,2550,2660)); alpha('mill-grounds', s.grounds);
  p('crank-arm').setAttribute('d', `M0 112L${s.crankX} ${112+s.crankY}`);
  p('crank-knob').setAttribute('cx', s.crankX); p('crank-knob').setAttribute('cy', 108+s.crankY);
  alpha('hand', s.hand); transform('hand', `translate(${s.millX+s.crankX} ${106+s.crankY})`);
  alpha('spoon', s.spoon); transform('spoon', `translate(${s.scoopX} ${s.scoopY}) rotate(${s.spoonTilt})`);
  alpha('scoop-beans', 1-tween(s.t,1240,1300));
  root.querySelectorAll('[data-bean]').forEach((el,i)=>{
    const u=progress(s.t,1260+i*50,1460+i*50);
    el.setAttribute('opacity', u>0 && u<1 ? '1':'0');
    el.setAttribute('transform',`translate(${250+(i-1)*6} ${mix(116,139,u*u)}) rotate(${u*80})`);
  });
  alpha('receiver', s.receiver); transform('receiver', `translate(${s.receiverX} ${s.receiverY}) rotate(${s.receiverTilt})`);
  root.querySelectorAll('[data-grain]').forEach((el,i)=>{
    const u=progress(s.t,2870+i*12,3030+i*12);
    el.setAttribute('opacity',u>0 && u<1?'1':'0');
    el.setAttribute('cx',mix(237,247+(i%4-1.5)*7,u)); el.setAttribute('cy',mix(101,134,u*u));
  });
  alpha('dripper',s.dripper); alpha('bloom',progress(s.t,2930,3070));
  transform('bloom',`translate(247 134) scale(1 ${1+s.bloom*.8}) translate(-247 -134)`);
  alpha('cup',s.cup); transform('cup',`translate(${s.cupX} 0)`);
  alpha('coffee-surface',progress(s.t,3670,4140));
  alpha('kettle',s.kettle); transform('kettle',`rotate(${8*tween(s.t,3170,3400)} 224 78)`);
  alpha('water',s.pour);
  const dropU=((s.t-3620)%290)/290;
  alpha('drop',s.t>=3620 && s.t<4180?1:0); transform('drop',`translate(247 ${mix(191,225,dropU*dropU)})`);
  alpha('steam',s.steam); transform('steam',`translate(0 ${-8*tween(s.t,4200,4800)})`);
  alpha('rule',s.rule); transform('rule',`translate(180 276) scale(${s.rule} 1) translate(-180 -276)`);
  root.querySelector('.coffee-intro-caption').style.opacity = s.caption;
}

export function isIntroActive() { return activeIntro !== null; }
export function finishIntro(reason = 'external') { activeIntro?.finish(reason); }

export function showIntro({ manual = false } = {}) {
  if (activeIntro || document.hidden) return null;
  const day = japanDay();
  let lastDay = seenDay;
  try { lastDay = localStorage.getItem(INTRO_KEY) || lastDay; } catch { /* 頻度保存が使えなくても通常起動 */ }
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mode = chooseIntro({ hash: location.hash, reduced: motion.matches, lastDay, day, manual });
  if (!mode) return null;
  if (!manual) {
    seenDay = day;
    try { localStorage.setItem(INTRO_KEY, day); } catch { /* メモリの表示日を使用 */ }
  }
  const app = document.getElementById('app');
  const previousFocus = document.activeElement;
  const previousInert = app.inert;
  const previousOverflow = document.body.style.overflow;
  const scroll = { x: window.scrollX, y: window.scrollY };
  const layer = document.createElement('div');
  layer.className = 'coffee-intro';
  layer.setAttribute('role','dialog'); layer.setAttribute('aria-modal','true');
  layer.setAttribute('aria-label','コーヒーの準備のアニメーション');
  layer.innerHTML = `<button class="coffee-intro-skip" type="button">${mode==='still'?'閉じる':'スキップ'}</button><div class="coffee-intro-center">${artwork()}<p class="coffee-intro-caption">今日の一杯を、ひとこと。</p></div>`;
  const button = layer.querySelector('button');
  let frame = 0, endTimer = 0, safetyTimer = 0, finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame); clearTimeout(endTimer); clearTimeout(safetyTimer);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('hashchange', onRoute);
    window.removeEventListener('pagehide', onHidden);
    motion.removeEventListener('change', onMotion);
    layer.remove(); app.inert = previousInert; document.body.style.overflow = previousOverflow;
    activeIntro = null;
    const target = manual && previousFocus?.isConnected ? previousFocus : document.getElementById('main');
    target?.focus({ preventScroll: true });
    window.scrollTo(scroll.x, scroll.y);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); finish(); }
    if (event.key === 'Tab') { event.preventDefault(); button.focus(); }
  };
  const onHidden = (event) => { if (event.type==='pagehide' || document.hidden) finish(); };
  const onRoute = () => finish();
  const onMotion = () => { if (motion.matches) finish(); };
  try {
    // DOMの配置完了前に例外が出ても、finishは元の状態へ戻せる。
    activeIntro = { finish, mode };
    document.body.append(layer); app.inert = true; document.body.style.overflow = 'hidden';
    if (getComputedStyle(layer).position !== 'fixed') throw new Error('起動演出のスタイルが未読込です');
    layer.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); finish(); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('hashchange', onRoute);
    window.addEventListener('pagehide', onHidden);
    motion.addEventListener('change', onMotion);
    button.focus({ preventScroll: true });
    if (mode === 'still') {
      paintScene(layer,4500); layer.style.opacity='1';
      return { finish, mode };
    }
    const started = performance.now();
    const tick = (now) => {
      if (finished) return;
      try {
        const elapsed = now-started;
        if (elapsed>=DURATION[mode]) { finish(); return; }
        paintScene(layer,elapsed,mode);
        frame=requestAnimationFrame(tick);
      } catch (error) { console.warn('起動演出を終了しました',error); finish(); }
    };
    paintScene(layer,0,mode);
    frame=requestAnimationFrame(tick);
    endTimer=setTimeout(finish,DURATION[mode]);
    safetyTimer=setTimeout(finish,6500);
    return { finish, mode };
  } catch (error) { finish(); throw error; }
}
