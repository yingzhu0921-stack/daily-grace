/**
 * 제너러티브 카드(T05) — 플로우 필드(flow field) 아트 배경 + 진짜 폰트 글자.
 *
 * 수천 개의 미세한 선이 Perlin 노이즈 벡터장을 따라 흐르며 비단/연기 같은 결을 만든다.
 * 위쪽에 흐름을 모으고 아래는 비워, 그 여백에 글자를 얹는다.
 *
 * 강의(W03 "규칙을 코드로"): AI 이미지 호출 0(토큰 0), AI 멈춰도 작동,
 * seed 고정→같은 기록 같은 카드(재현), 진짜 폰트→철자 정확, 색은 팔레트로 정확히 지정.
 */

export type GenerativeStyle = 'flow' | 'aura';

export interface GenerativePalette {
  name: string;
  bg: string;      // 배경
  ink: string;     // 글자색
  c1?: string;     // (flow) 흐름 그라데이션 시작
  c2?: string;     // (flow) 흐름 그라데이션 끝
  glows?: string[];// (aura) 부드러운 방사형 글로우 색
  accent?: string; // (aura) 강조 단어/주소 톤
  dark?: boolean;
  paper?: boolean; // (aura) 크림 페이퍼 질감
  flat?: boolean;  // (aura) 그라데이션 없이 단색 바탕
}

// 아우라 그레인 그라데이션 / 단색 팔레트 (T03) — 우아한 세리프 감성. 색 다양.
export const AURA_PALETTES: GenerativePalette[] = [
  // 단색(flat) — 잔잔한 종이 느낌
  { name: 'cream-navy',  bg: '#F1EBDC', ink: '#26406A', accent: '#2E63B8', flat: true, paper: true },
  { name: 'ivory-ink',   bg: '#EFEAE0', ink: '#1C1A16', accent: '#8A7A5E', flat: true, paper: true },
  { name: 'blush-rust',  bg: '#F3E6DE', ink: '#9C4A2E', accent: '#C56A3E', flat: true, paper: true },
  // 파스텔 그레인 아우라
  { name: 'blue-peach',  bg: '#DCE6EE', ink: '#D0653F', accent: '#E07A4A', glows: ['#BFD6E8', '#F0C9B4', '#CFE0DE'] },
  { name: 'sky-lilac',   bg: '#E6E6F2', ink: '#3B4E86', accent: '#7A6ED0', glows: ['#B9C6EE', '#D8C2E6', '#C9D6F0'] },
  { name: 'mint-cream',  bg: '#E7F0E6', ink: '#2C5540', accent: '#4E8A63', glows: ['#B9DEC6', '#E4E0BE', '#CDE6D2'] },
  { name: 'rose',        bg: '#F3E4E8', ink: '#8E3B58', accent: '#C25E7C', glows: ['#E8C2D0', '#F0D6C6', '#DEBFD6'] },
  // 진한 그레인 아우라 (밝은 글자)
  { name: 'deep-teal',   bg: '#125B54', ink: '#EDE7D6', accent: '#EAD08A', glows: ['#1E7A6E', '#3FA890', '#0E4A48'], dark: true },
  { name: 'blue-green',  bg: '#1E3A78', ink: '#EFEADC', accent: '#8FE0C0', glows: ['#2E56A8', '#4FC2A0', '#22346E'], dark: true },
  { name: 'warm-glow',   bg: '#C4632E', ink: '#FBF3E6', accent: '#FBD9A0', glows: ['#E08A44', '#EABF8A', '#B04C28'], dark: true },
  { name: 'indigo',      bg: '#241C40', ink: '#EDE6F2', accent: '#C6A4F2', glows: ['#3E2E74', '#6E5AB0', '#1E1636'], dark: true },
  { name: 'dusk-navy',   bg: '#182338', ink: '#EDE7DA', accent: '#E0A46A', glows: ['#2A3E64', '#40608E', '#141C2E'], dark: true },
];

// 큐레이션 그라데이션 팔레트 (밝은 바탕 + 은은한 색 흐름 / 어두운 바탕 + 빛나는 흐름)
export const GEN_PALETTES: GenerativePalette[] = [
  { name: 'mint-blue',   bg: '#F7F7F4', ink: '#20303A', c1: '#57C79A', c2: '#4A63C9' },
  { name: 'blue-violet', bg: '#F6F6FB', ink: '#241F3A', c1: '#4C7EF3', c2: '#9A57D6' },
  { name: 'rose-amber',  bg: '#FBF6F2', ink: '#3A241E', c1: '#F0897E', c2: '#E7B24A' },
  { name: 'teal-indigo', bg: '#F3F7F7', ink: '#17303A', c1: '#3FB6B0', c2: '#3B4F9E' },
  { name: 'violet-cyan', bg: '#F7F5FB', ink: '#26203A', c1: '#8C6BE0', c2: '#4FC2D6' },
  { name: 'coral-pink',  bg: '#FBF5F6', ink: '#3A1F2A', c1: '#F27A9A', c2: '#F0A65A' },
  { name: 'forest-lime', bg: '#F5F7F1', ink: '#1E3020', c1: '#3E9E6C', c2: '#A7CC4E' },
  { name: 'ink-glow',    bg: '#14161C', ink: '#EDE8DB', c1: '#5FA8E0', c2: '#B36FD6', dark: true },
  { name: 'noir-mint',   bg: '#101613', ink: '#E9E6DB', c1: '#4FD6A6', c2: '#4A86C9', dark: true },
  { name: 'noir-rose',   bg: '#1A1216', ink: '#EFE3DE', c1: '#E06B8C', c2: '#E0A15A', dark: true },
];

// 우아한 세리프 (나눔 제외). 송명조를 앞세워 고대비 디스플레이 세리프 느낌.
const SERIF_FONTS = ["'SongMyung', serif", "'Hahmlet', serif", "'GowunBatang', serif", "'RidiBatang', serif"];
const SANS_FONTS = ["'GowunDodum', sans-serif", "'SeoulHangang', sans-serif"];

const RATIO_DIMS: Record<string, { width: number; height: number }> = {
  '9:16': { width: 900, height: 1600 },
  '16:9': { width: 1600, height: 900 },
  '1:1': { width: 1200, height: 1200 },
  '4:3': { width: 1200, height: 900 },
  '4:5': { width: 1000, height: 1250 },
  '3:4': { width: 900, height: 1200 },
  '2:3': { width: 900, height: 1350 },
};

export function genDims(ratio: string) {
  return RATIO_DIMS[ratio] || RATIO_DIMS['4:5'];
}

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 시드 기반 Perlin 2D 노이즈
function makePerlin(seed: number) {
  const perm = Array.from({ length: 256 }, (_, i) => i);
  const rnd = mulberry32(seed);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  const grad = (h: number, x: number, y: number) => ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
  return (x: number, y: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
                lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
  };
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function mixColor(a: string, b: string, t: number) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `${r},${g},${bl}`;
}

function hexA(hex: string, a: number) {
  const c = hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// 가벼운 종이 그레인(노이즈)
function addGrain(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, amount: number) {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

export interface GenerativeSpec {
  seed: number;
  style: GenerativeStyle;
  palette: GenerativePalette;
  font: string;
  flowTop: boolean;   // (flow) 흐름을 위/아래에 모으고 반대편에 글자
  ring?: boolean;     // (aura) 글자 주위 얇은 타원 링
  accentKind?: 'sparkle' | 'line' | 'arc' | 'none'; // (aura) 미세 악센트
  refPill?: boolean;  // (aura) 주소를 오벌 알약 테두리로
}

export function pickGenerativeSpec(text: string, seedOverride?: number): GenerativeSpec {
  const seed = seedOverride ?? hashSeed(text || 'grace');
  const rnd = mulberry32(seed);
  const palette = GEN_PALETTES[Math.floor(rnd() * GEN_PALETTES.length)];
  const serif = rnd() < 0.62;
  const fonts = serif ? SERIF_FONTS : SANS_FONTS;
  const font = fonts[Math.floor(rnd() * fonts.length)];
  const flowTop = rnd() < 0.6;
  return { seed, style: 'flow', palette, font, flowTop };
}

// T03 아우라: 아우라 그라데이션 + 우아한 세리프
export function pickAuraSpec(text: string, seedOverride?: number): GenerativeSpec {
  const seed = seedOverride ?? hashSeed(text || 'grace');
  const rnd = mulberry32(seed);
  const palette = AURA_PALETTES[Math.floor(rnd() * AURA_PALETTES.length)];
  const font = SERIF_FONTS[Math.floor(rnd() * SERIF_FONTS.length)];
  const accents: Array<'sparkle' | 'line' | 'arc' | 'none'> = ['sparkle', 'line', 'arc', 'none', 'none'];
  const accentKind = accents[Math.floor(rnd() * accents.length)];
  const refPill = rnd() < 0.5;
  return { seed, style: 'aura', palette, font, flowTop: false, accentKind, refPill };
}

// 아우라 그레인 그라데이션(또는 단색) 그리기
function drawAura(ctx: CanvasRenderingContext2D, w: number, h: number, spec: GenerativeSpec) {
  const { palette: pal, seed } = spec;
  const rnd = mulberry32(seed);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
  if (!pal.flat) {
    const glows = pal.glows || ['#9AB0D0'];
    const count = 3 + Math.floor(rnd() * 2);
    for (let i = 0; i < count; i++) {
      const gx = w * (0.12 + rnd() * 0.76);
      const gy = h * (0.1 + rnd() * 0.8);
      const gr = Math.max(w, h) * (0.5 + rnd() * 0.5);
      const col = glows[i % glows.length];
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      g.addColorStop(0, hexA(col, pal.dark ? 0.92 : 0.8));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }
  // 그레인 (레퍼런스처럼 자글자글한 노이즈)
  addGrain(ctx, w, h, seed, pal.flat ? 14 : pal.dark ? 22 : 18);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const clauses = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const clause of clauses) {
    const units = clause.includes(' ') ? clause.split(' ') : Array.from(clause);
    let cur = '';
    for (const u of units) {
      const test = clause.includes(' ') ? (cur ? `${cur} ${u}` : u) : cur + u;
      if (ctx.measureText(test).width > maxW && cur) { out.push(cur); cur = u; }
      else cur = test;
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [text];
}

// 플로우 필드 그리기
function drawFlow(ctx: CanvasRenderingContext2D, w: number, h: number, spec: GenerativeSpec) {
  const { palette: pal, seed, flowTop } = spec;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);

  const noise = makePerlin(seed);
  const rnd = mulberry32(seed ^ 0x1234567);
  const scale = 1.5 / Math.max(w, h);       // 필드 주파수
  const steps = 70;
  const stepLen = Math.max(w, h) * 0.006;
  const count = Math.floor(w * 1.3);
  // 흐름을 한쪽(위/아래)에 모으기 위한 스폰 영역
  const spawnTop = flowTop ? 0 : h * 0.30;
  const spawnBot = flowTop ? h * 0.70 : h;

  ctx.lineWidth = Math.max(0.8, w * 0.0011);
  ctx.lineCap = 'round';

  for (let i = 0; i < count; i++) {
    let x = rnd() * w;
    let y = spawnTop + rnd() * (spawnBot - spawnTop);
    const tx = x / w; // 색 그라데이션 위치
    const color = mixColor(pal.c1, pal.c2, tx);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < steps; s++) {
      const a = noise(x * scale * 300, y * scale * 300) * Math.PI * 2.2;
      x += Math.cos(a) * stepLen;
      y += Math.sin(a) * stepLen;
      if (x < 0 || x > w || y < 0 || y > h) break;
      // 글자 영역(반대편)으로 갈수록 옅게 페이드
      const region = flowTop ? y / h : 1 - y / h; // 0(흐름쪽)~1(글자쪽)
      const fade = region > 0.55 ? Math.max(0, 1 - (region - 0.55) / 0.4) : 1;
      ctx.strokeStyle = `rgba(${color},${(pal.dark ? 0.09 : 0.07) * fade})`;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }
}

export interface RenderGenerativeOpts {
  text: string;
  reference?: string;
  ratio: string;
  spec: GenerativeSpec;
  heroFont?: string;
}

export function renderGenerativeCard(opts: RenderGenerativeOpts): string {
  const { text, reference, ratio, spec } = opts;
  const { width, height } = genDims(ratio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const pal = spec.palette;
  const isSerif = spec.font.includes('serif');
  const isAura = spec.style === 'aura';

  // 1) 배경
  if (isAura) drawAura(ctx, width, height, spec);
  else drawFlow(ctx, width, height, spec);

  // 2) 타이포
  const maxW = width * (isAura ? 0.76 : 0.80);
  const weight = isSerif ? 600 : 700;
  let fontPx = Math.round(width * (isAura ? 0.067 : 0.086));
  const fit = (px: number) => { ctx.font = `${weight} ${px}px ${spec.font}`; return wrapLines(ctx, text, maxW); };
  let lines = fit(fontPx);
  const tooWide = () => { ctx.font = `${weight} ${fontPx}px ${spec.font}`; return lines.some((l) => ctx.measureText(l).width > maxW); };
  while ((lines.length > 6 || tooWide()) && fontPx > width * 0.042) { fontPx -= Math.round(width * 0.004); lines = fit(fontPx); }
  ctx.font = `${weight} ${fontPx}px ${spec.font}`;
  const lineH = fontPx * (isSerif ? 1.5 : 1.42);
  const refPx = Math.round(fontPx * 0.36);

  const bodyH = lines.length * lineH;
  const refBlock = reference ? refPx * 2 : 0;
  const totalH = bodyH + refBlock;
  // 흐름이 위면 글자는 아래(0.66), 흐름이 아래면 글자는 위(0.34)
  const vAnchor = isAura ? [0.40, 0.49, 0.58][spec.seed % 3] : (spec.flowTop ? 0.66 : 0.34);
  const cx = width / 2;
  const cyTop = height * vAnchor - totalH / 2;
  const accent = pal.accent || pal.ink;

  // aura: 글자 주위 얇은 타원 링(옵션)
  if (isAura && spec.ring) {
    const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.save();
    ctx.translate(cx, cyTop + bodyH / 2);
    ctx.rotate(-0.12);
    ctx.strokeStyle = hexA(pal.ink, 0.5);
    ctx.lineWidth = Math.max(1.4, width * 0.0018);
    ctx.beginPath();
    ctx.ellipse(0, 0, maxLineW / 2 + width * 0.05, bodyH / 2 + fontPx * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (isAura && spec.accentKind === 'sparkle') {
    ctx.fillStyle = hexA(accent, 0.9);
    ctx.font = `400 ${Math.round(fontPx * 0.46)}px ${spec.font}`;
    ctx.fillText('✦   ✧   ✦', cx, cyTop - fontPx * 0.55);
    ctx.fillText('✦   ✧   ✦', cx, cyTop + totalH + fontPx * 1.0);
  } else if (isAura && spec.accentKind === 'line') {
    ctx.strokeStyle = hexA(accent, 0.8);
    ctx.lineWidth = Math.max(1.2, width * 0.0015);
    const ly = cyTop + totalH + fontPx * 0.5;
    ctx.beginPath(); ctx.moveTo(cx, ly); ctx.lineTo(cx, ly + height * 0.085); ctx.stroke();
  } else if (isAura && spec.accentKind === 'arc') {
    ctx.strokeStyle = hexA(accent, 0.5);
    ctx.lineWidth = Math.max(1, width * 0.0013);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.arc(width * 0.94, height * 0.06, width * (0.1 + k * 0.045), Math.PI * 0.5, Math.PI * 1.15); ctx.stroke();
      ctx.beginPath(); ctx.arc(width * 0.06, height * 0.94, width * (0.1 + k * 0.045), Math.PI * 1.5, Math.PI * 2.15); ctx.stroke();
    }
  }

  ctx.fillStyle = pal.ink;
  let y = cyTop + fontPx * 0.82;
  for (const l of lines) { ctx.fillText(l, cx, y); y += lineH; }

  if (reference) {
    ctx.font = `500 ${refPx}px ${spec.font}`;
    ctx.fillStyle = pal.ink;
    ctx.globalAlpha = 0.6;
    const spaced = reference.split('').join(' ');
    ctx.fillText(spaced, cx, cyTop + bodyH + refPx * 1.4);
    ctx.globalAlpha = 1;
  }

  return canvas.toDataURL('image/png');
}
