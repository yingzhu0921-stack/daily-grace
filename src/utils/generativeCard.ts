/**
 * 제너러티브 카드(T05) — 플로우 필드(flow field) 아트 배경 + 진짜 폰트 글자.
 *
 * 수천 개의 미세한 선이 Perlin 노이즈 벡터장을 따라 흐르며 비단/연기 같은 결을 만든다.
 * 위쪽에 흐름을 모으고 아래는 비워, 그 여백에 글자를 얹는다.
 *
 * 강의(W03 "규칙을 코드로"): AI 이미지 호출 0(토큰 0), AI 멈춰도 작동,
 * seed 고정→같은 기록 같은 카드(재현), 진짜 폰트→철자 정확, 색은 팔레트로 정확히 지정.
 */

export type GenerativeStyle = 'flow' | 'aura' | 'grain';

// 그레인 그라데이션(T03) 팔레트 — 배경 1 + 크게 번진 색 덩어리 3 + 글자색.
// mid=true(M)는 글자가 밝은 색이라 덩어리 배치에 제약이 있다(아래 drawGrain 참고).
export interface GrainPalette {
  id: string;
  name: string;
  bg: string;
  blobs: [string, string, string]; // M은 밝음 → 중간 → 어두움 순
  ink: string;
  mid: boolean;
}

export const GRAIN_PALETTES: GrainPalette[] = [
  // 연한 톤 L01–L16 (글자 어두운 색)
  { id: 'L01', name: '새벽 블루',   bg: '#eef0f4', blobs: ['#b7c7e6', '#d9c7e3', '#f1dccc'], ink: '#2f3446', mid: false },
  { id: 'L02', name: '노을',       bg: '#f6efe4', blobs: ['#eaa98d', '#f3cf9e', '#f6e3c8'], ink: '#4a3328', mid: false },
  { id: 'L03', name: '세이지',      bg: '#e9efe6', blobs: ['#c4d8bf', '#e6e1b9', '#b9d3cf'], ink: '#2f3d33', mid: false },
  { id: 'L04', name: '더스티 로즈', bg: '#f7eeee', blobs: ['#ecc3c6', '#e8d3e8', '#f4e0cf'], ink: '#4a2f36', mid: false },
  { id: 'L05', name: '민트 블루',   bg: '#eef1f2', blobs: ['#bcd6dc', '#d8e3c9', '#c9cde6'], ink: '#2b3c44', mid: false },
  { id: 'L06', name: '샌드 베이지', bg: '#f5efe6', blobs: ['#e3c7a6', '#e9d6c9', '#efe5c8'], ink: '#43352a', mid: false },
  { id: 'L07', name: '라벤더',      bg: '#f1eef6', blobs: ['#cfc4ea', '#e6d5ee', '#d6e0f2'], ink: '#352f4a', mid: false },
  { id: 'L08', name: '피치',       bg: '#fbf0ea', blobs: ['#f6c5b0', '#f9dccb', '#f3e6c4'], ink: '#4d3027', mid: false },
  { id: 'L09', name: '레몬 크림',   bg: '#f8f5e6', blobs: ['#efe3a6', '#f3eccb', '#d9e6c4'], ink: '#3f3a22', mid: false },
  { id: 'L10', name: '스카이',      bg: '#eef4f8', blobs: ['#b9d7ee', '#d3e6f2', '#e8eef0'], ink: '#24394a', mid: false },
  { id: 'L11', name: '아이리스 핑크', bg: '#f4eef4', blobs: ['#d9c3e3', '#f1cbd6', '#cdd3ee'], ink: '#3e2e45', mid: false },
  { id: 'L12', name: '코랄 라일락', bg: '#f8eeee', blobs: ['#f2b9b1', '#d9c6e8', '#f5dcc7'], ink: '#47302f', mid: false },
  { id: 'L13', name: '올리브 크림', bg: '#f2f1e6', blobs: ['#d3d6ae', '#e8dcc0', '#c7d4c1'], ink: '#353826', mid: false },
  { id: 'L14', name: '하늘 복숭아', bg: '#f4f1f0', blobs: ['#c4d3ec', '#f4cdbd', '#ece3d8'], ink: '#33384a', mid: false },
  { id: 'L15', name: '아쿠아',      bg: '#ecf4f2', blobs: ['#aedbd4', '#cfe5e0', '#d9dcef'], ink: '#21403c', mid: false },
  { id: 'L16', name: '모브',       bg: '#f2ebec', blobs: ['#d6b9c2', '#e5d2cf', '#c9c3d9'], ink: '#3f2c33', mid: false },
  // 중간 톤 M01–M12 (글자 밝은 색)
  { id: 'M01', name: '새벽 네이비', bg: '#7c8a9f', blobs: ['#f1e4cc', '#9da6b3', '#69788d'], ink: '#f3e7d2', mid: true },
  { id: 'M02', name: '코발트',     bg: '#6f87b2', blobs: ['#e9e6df', '#729fdc', '#5d7196'], ink: '#ffffff', mid: true },
  { id: 'M03', name: '플럼 밤',    bg: '#716e7f', blobs: ['#f0d9c6', '#a998cc', '#7c7494'], ink: '#efe6f6', mid: true },
  { id: 'M04', name: '딥 로즈',    bg: '#9c838b', blobs: ['#efd6cc', '#c2969b', '#806c75'], ink: '#f7e9e2', mid: true },
  { id: 'M05', name: '테라코타',   bg: '#c39585', blobs: ['#f4dcc2', '#e7b192', '#9f7469'], ink: '#fff4e8', mid: true },
  { id: 'M06', name: '포레스트',   bg: '#71837b', blobs: ['#e8e2c8', '#adc7b3', '#5e7169'], ink: '#eef1e4', mid: true },
  { id: 'M07', name: '딥 틸',      bg: '#6a888e', blobs: ['#e7dccb', '#92bec0', '#577279'], ink: '#eef5f2', mid: true },
  { id: 'M08', name: '버건디',     bg: '#906f76', blobs: ['#f0d8c4', '#dea99f', '#745b62'], ink: '#f8e8e2', mid: true },
  { id: 'M09', name: '미드나잇',   bg: '#666a77', blobs: ['#d8c9e6', '#7584b5', '#555864'], ink: '#e8e9f6', mid: true },
  { id: 'M10', name: '카멜',       bg: '#af9982', blobs: ['#e9d2ae', '#cca982', '#8b7969'], ink: '#fbf1e2', mid: true },
  { id: 'M11', name: '올리브 골드', bg: '#9d997b', blobs: ['#f3ecd0', '#decc8b', '#7e7c65'], ink: '#faf5e2', mid: true },
  { id: 'M12', name: '딥 바이올렛', bg: '#7b7394', blobs: ['#f2c9c4', '#b5aae4', '#655f7a'], ink: '#f2ecfb', mid: true },
];

// 글씨 배치. bodyTop 은 본문 상단의 카드 높이 대비 위치.
//  uniform    — 전 줄 같은 크기 (스펙 5장의 네 가지)
//  hero       — 핵심 구절만 아주 크게, 나머지 작게, 왼쪽 정렬 (시안 A)
//  centerHero — 가운데 정렬, 핵심 구절만 조금 크게, 가는 십자 장식 (시안 C)
// hero 계열은 본문이 두 조각 이상으로 나뉠 때만 쓴다. 한 덩어리 문장은 키울 데가 없다.
const GRAIN_LAYOUTS = [
  { bodyTop: 0.62, align: 'left' as const, kind: 'uniform' as const },
  { bodyTop: 0.40, align: 'center' as const, kind: 'uniform' as const },
  { bodyTop: 0.14, align: 'left' as const, kind: 'uniform' as const },
  { bodyTop: 0.16, align: 'center' as const, kind: 'uniform' as const },
  { bodyTop: 0.70, align: 'center' as const, kind: 'uniform' as const },
  { bodyTop: 0.22, align: 'right' as const, kind: 'uniform' as const },
  { bodyTop: 0.58, align: 'right' as const, kind: 'uniform' as const },
  // 강조 배치는 본문이 나뉠 때만 쓴다. 기본 배치보다 수를 많이 둬 자주 나오게 한다.
  { bodyTop: 0.46, align: 'left' as const, kind: 'hero' as const },
  { bodyTop: 0.22, align: 'left' as const, kind: 'hero' as const },
  { bodyTop: 0.56, align: 'left' as const, kind: 'hero' as const },
  { bodyTop: 0.50, align: 'right' as const, kind: 'hero' as const },
  { bodyTop: 0.26, align: 'right' as const, kind: 'hero' as const },
  { bodyTop: 0.34, align: 'center' as const, kind: 'centerHero' as const, mark: true },
  { bodyTop: 0.52, align: 'center' as const, kind: 'centerHero' as const, mark: false },
  { bodyTop: 0.20, align: 'center' as const, kind: 'centerHero' as const, mark: true },
];
const UNIFORM_LAYOUT_COUNT = 7;

/**
 * 본문을 의미 조각으로 나눈다. 줄바꿈·쉼표·가운뎃점이 기준이다.
 * 단어는 건드리지 않는다 — 어디서 줄을 바꿀지만 정한다.
 */
function splitSegments(text: string): string[] {
  // 구분 문자(쉼표·가운뎃점)는 앞 조각에 붙여 둔다. 사용자가 쓴 글자를 지우지 않는다.
  return text
    .split('\n')
    .flatMap((line) => line.split(/(?<=[,·])/))
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * 크게 보여 줄 핵심 구절과 그 앞부분을 나눈다.
 *
 * 1순위는 쉼표·줄바꿈이다. 사용자가 Enter 로 줄을 나누면 **마지막 줄이 핵심 구절**이 된다.
 *    (의도한 자리를 직접 정하는 가장 확실한 방법이다)
 * 2순위는 어절이다. 개역개정 구절은 대개 쉼표가 없어서, 연결어미로 끝나는 어절
 *    (…말미암아 / …하시니 / …하고) 뒤에서 끊는다. 거기가 문장이 쉬어 가는 자리다.
 *
 * 의미를 이해하고 고르는 것이 아니므로 틀릴 수 있다. T03 은 다시 뽑기가 공짜다.
 */
const CLAUSE_END = /(아|어|여|고|며|니|매|므로|지만|나|되|면서|라도|거늘|거니와|새)$/;

function splitForEmphasis(text: string): { key: string; rest: string[] } | null {
  if ([...text].length > 90) return null;
  const byPunct = splitSegments(text);
  if (byPunct.length >= 2) {
    return { key: byPunct[byPunct.length - 1], rest: byPunct.slice(0, -1) };
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 5) return null;                 // 짧은 문장은 나눌 데가 없다
  if ([...text].length > 90) return null;            // 아주 긴 본문은 크게 키울 수 없다

  // 끝에서부터 연결어미로 끝나는 어절을 찾아 그 뒤에서 끊는다
  for (let i = words.length - 2; i >= 2; i--) {
    const keyWords = words.slice(i + 1);
    const keyLen = [...keyWords.join(' ')].length;
    if (keyWords.length < 2 || keyLen < 6 || keyLen > 22) continue;
    if (CLAUSE_END.test(words[i])) {
      return { key: keyWords.join(' '), rest: [words.slice(0, i + 1).join(' ')] };
    }
  }
  // 끊을 자리를 못 찾으면 뒤 3분의 1을 핵심 구절로 본다
  const cut = Math.max(2, Math.floor(words.length * 0.66));
  const keyWords = words.slice(cut);
  if (keyWords.length < 2) return null;
  return { key: keyWords.join(' '), rest: [words.slice(0, cut).join(' ')] };
}

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
  grainPal?: GrainPalette; // (grain) 28색 팔레트
  layout?: number;    // (grain) GRAIN_LAYOUTS 인덱스
  sparkle?: boolean;  // (grain) 사용 안 함 — 별 장식은 2026-10-24에 제거했다. 항상 false
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

// T03 그레인 그라데이션 — 스펙 본문 폰트는 명조.
// 스펙에는 Nanum Myeongjo가 있으나 "나눔은 쓰지 않는다"는 사용자 결정에 따라 제외했다.
// 주의: 캔버스에는 CSS에 등록된 실제 family 이름(공백 포함)을 써야 한다.
// 'GowunBatang' 같은 건 앱 내부 키일 뿐이라 캔버스에서는 기본 serif로 떨어진다.
// 앱이 이미 불러오는 글꼴 중 차분한 명조 계열만. 나눔은 쓰지 않는다(사용자 방침).
const GRAIN_BODY_FONTS = [
  "'Gowun Batang', serif",
  "'Song Myung', serif",
  "'Hahmlet', serif",
  "'Noto Serif KR', serif",
  "'RidiBatang', serif",
];
const GRAIN_REF_FONT = "'Gowun Dodum', sans-serif";

export function pickGrainSpec(text: string, seedOverride?: number): GenerativeSpec {
  const seed = seedOverride ?? hashSeed(text || 'grace');
  const rnd = mulberry32(seed);
  const grainPal = GRAIN_PALETTES[Math.floor(rnd() * GRAIN_PALETTES.length)];
  const font = GRAIN_BODY_FONTS[Math.floor(rnd() * GRAIN_BODY_FONTS.length)];
  // 조각이 하나뿐인 문장에는 hero 계열을 쓰지 않는다
  const layoutPool = splitForEmphasis(text) ? GRAIN_LAYOUTS.length : UNIFORM_LAYOUT_COUNT;
  const layout = Math.floor(rnd() * layoutPool);
  // 별(반짝이) 장식은 제거했다(2026-10-24 요청 4).
  // 난수 소비는 그대로 둔다 — 빼면 이후 난수가 밀려 같은 시드의 색·배치가 달라진다.
  rnd();
  return {
    seed,
    style: 'grain',
    font,
    flowTop: false,
    palette: { name: grainPal.name, bg: grainPal.bg, ink: grainPal.ink },
    grainPal,
    layout,
    sparkle: false,
  };
}

// 그레인 세기. 스펙 기본값(0.35 / 0.10)은 실제 화면에서 너무 거칠어 사용자가 이 값을 골랐다.
// 미리보기는 작아서 더 거칠어 보이므로 저장 해상도 기준으로 맞춘다.
export const GRAIN_STRENGTH = { overlay: 0.12, multiply: 0.035 };

// feTurbulence + feComponentTransfer(slope 2.2, intercept -0.6) 에 해당하는 노이즈 판
function grainTile(w: number, h: number, seed: number): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(w, h);
  const d = img.data;
  const rnd = mulberry32(seed ^ 0x5bf03635);
  for (let i = 0; i < d.length; i += 4) {
    let v = rnd() * 2.2 - 0.6;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    const p = (v * 255) | 0;
    d[i] = p; d[i + 1] = p; d[i + 2] = p; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// 배경색 + 크게 번진 색 덩어리 3개 + 그레인 두 겹
function drawGrain(ctx: CanvasRenderingContext2D, w: number, h: number, spec: GenerativeSpec) {
  const pal = spec.grainPal!;
  const rnd = mulberry32(spec.seed ^ 0x27d4eb2d);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);

  // M 팔레트는 글자가 밝은 색이라, 가장 어두운 덩어리를 글자 뒤에 두어 대비를 확보한다.
  const layout = GRAIN_LAYOUTS[spec.layout ?? 0];
  const textY = Math.min(0.85, layout.bodyTop + 0.1);
  const loose = () => ({ cx: -0.1 + rnd() * 1.2, r: 0.4 + rnd() * 0.15 });
  const blobs = pal.mid
    ? [
        { color: pal.blobs[0], cy: 1 - textY, ...loose() },
        { color: pal.blobs[1], cy: 0.15 + rnd() * 0.7, ...loose() },
        // 가장 어두운 덩어리는 세로뿐 아니라 가로도 글자 쪽에 맞추고 크게 그린다.
        // 세로만 맞추면 블러가 커서 글자 띠를 못 덮고 대비가 무너진다.
        { color: pal.blobs[2], cy: textY, cx: 0.5 + (rnd() - 0.5) * 0.2, r: 0.58 + rnd() * 0.12 },
      ]
    : pal.blobs.map((color) => ({ color, cy: 0.1 + rnd() * 0.8, ...loose() }));

  ctx.save();
  ctx.filter = `blur(${(w * 0.185).toFixed(1)}px)`;
  for (const b of blobs) {   // 어두운 덩어리가 마지막이라 글자 뒤에 얹힌다
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(w * b.cx, h * b.cy, w * b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const tile = grainTile(w, h, spec.seed);
  if (tile) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = GRAIN_STRENGTH.overlay;
    ctx.drawImage(tile, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = GRAIN_STRENGTH.multiply;
    ctx.drawImage(tile, 0, 0);
    ctx.restore();
  }
}

// 어떤 경우에도 maxW를 넘지 않게. 한 어절이 통째로 너무 길면 그 어절만 글자 단위로 쪼갠다.
function forceWrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const seg of text.split('\n')) {
    let cur = '';
    for (const word of seg.split(/\s+/).filter(Boolean)) {
      let w = word;
      // 어절 하나가 maxW보다 길면 글자 단위로 잘라 내보낸다.
      // 서로게이트 페어(이모지)가 쪼개지지 않도록 코드포인트 단위로 센다.
      while (ctx.measureText(w).width > maxW) {
        const chars = Array.from(w);
        if (chars.length <= 1) break;   // 글자 하나가 maxW보다 넓으면 더 나눌 수 없다
        let cut = 1;
        while (cut < chars.length && ctx.measureText(chars.slice(0, cut + 1).join('')).width <= maxW) cut++;
        if (cur) { out.push(cur); cur = ''; }
        out.push(chars.slice(0, cut).join(''));
        w = chars.slice(cut).join('');
      }
      const test = cur ? `${cur} ${w}` : w;
      if (cur && ctx.measureText(test).width > maxW) { out.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [text];
}

// 어절(띄어쓰기) 단위로만 n줄 균형 분할. 들어가지 않으면 null.
function wrapKeepAll(ctx: CanvasRenderingContext2D, text: string, maxW: number, n: number): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length || words.length < n) return null;
  if (n === 1) {
    const one = words.join(' ');
    return ctx.measureText(one).width <= maxW ? [one] : null;
  }
  const target = ctx.measureText(words.join(' ')).width / n;
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && n - lines.length > 1 && ctx.measureText(test).width > target * 1.06) {
      lines.push(cur); cur = word;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  if (lines.length !== n) return null;
  // 마지막 줄에 한 어절만 남지 않게 보정
  const lastWords = lines[n - 1].split(' ');
  const prevWords = lines[n - 2].split(' ');
  if (lastWords.length === 1 && prevWords.length > 1) {
    lines[n - 1] = `${prevWords.pop()} ${lines[n - 1]}`;
    lines[n - 2] = prevWords.join(' ');
  }
  return lines.every((l) => ctx.measureText(l).width <= maxW) ? lines : null;
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

  if (spec.style === 'grain') return renderGrainCard(canvas, ctx, width, height, text, reference, spec);

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

// T03 그레인 그라데이션 카드. 본문은 사용자가 입력한 글자 그대로 쓴다(요약·생략 없음).
/** 글자 폭에 맞춰 maxW 안에서 줄을 나눈다. 어절 우선, 안 되면 글자 단위. */
function fitLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  return forceWrap(ctx, text, maxW);
}

/**
 * 핵심 구절을 크게 쓰는 배치(시안 A·C).
 * 본문 단어는 바꾸지 않는다. 어디서 줄을 바꾸고 무엇을 크게 쓸지만 정한다.
 */
function drawHeroText(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  reference: string | undefined,
  spec: GenerativeSpec,
  layout: (typeof GRAIN_LAYOUTS)[number],
): void {
  const pal = spec.grainPal!;
  const centered = layout.align === 'center';
  const maxW = width * 0.78;
  const x = centered ? width / 2 : layout.align === 'right' ? width * 0.89 : width * 0.11;
  const split = splitForEmphasis(text);
  const key = split?.key ?? text;
  const rest = split?.rest ?? [];

  // 핵심 구절 크기: A 는 아주 크게, C 는 조금 크게. 길면 줄인다.
  let keyPx = Math.round(width * (centered ? 0.072 : 0.100));
  const minKeyPx = Math.round(width * (centered ? 0.05 : 0.062));
  const hasLoneWord = (ls: string[]) => ls.length > 1 && ls.some((l) => l.trim().split(/\s+/).length === 1 && [...l.trim()].length <= 3);
  let keyLines: string[] = [];
  while (keyPx >= minKeyPx) {
    ctx.font = `${centered ? 600 : 700} ${keyPx}px ${spec.font}`;
    keyLines = fitLines(ctx, key, maxW);
    // 짧은 어절이 한 줄에 혼자 남으면 한 단계 줄여 다시 묶는다
    if (keyLines.length <= (centered ? 2 : 3) && !hasLoneWord(keyLines)) break;
    keyPx -= Math.max(1, Math.round(width * 0.004));
  }

  let restPx2 = Math.round(width * (centered ? 0.046 : 0.040));
  ctx.font = `400 ${restPx2}px ${spec.font}`;
  const restLines = rest.flatMap((r) => fitLines(ctx, r, maxW));

  let keyLH = keyPx * 1.22;
  let restLH = restPx2 * 1.65;
  const refPx = Math.round(width * 0.027);
  const gap = width * 0.03;
  // C 는 나머지를 위에, A 는 아래에 둔다
  let totalH = keyLines.length * keyLH + restLines.length * restLH + gap + refPx * 2.4;

  // 그래도 카드 높이를 넘으면 전체를 비례해 줄인다
  const avail = height * 0.84;
  if (totalH > avail) {
    const k = avail / totalH;
    keyPx = Math.max(12, Math.round(keyPx * k));
    restPx2 = Math.max(10, Math.round(restPx2 * k));
    keyLH = keyPx * 1.22;
    restLH = restPx2 * 1.65;
    totalH = keyLines.length * keyLH + restLines.length * restLH + gap + refPx * 2.4;
  }

  let top = height * layout.bodyTop;
  const maxTop = height * 0.9 - totalH;
  if (top > maxTop) top = Math.max(height * 0.07, maxTop);

  ctx.textAlign = layout.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pal.ink;
  let y = top;

  const drawRest = () => {
    ctx.font = `400 ${restPx2}px ${spec.font}`;
    ctx.globalAlpha = 0.78;
    for (const line of restLines) { y += restLH; ctx.fillText(line, x, y); }
    ctx.globalAlpha = 1;
  };
  const drawKey = () => {
    ctx.font = `${centered ? 600 : 700} ${keyPx}px ${spec.font}`;
    for (const line of keyLines) { y += keyLH; ctx.fillText(line, x, y); }
  };

  // 두 배치 모두 원문 순서를 지킨다. 핵심 구절(마지막 조각)을 위로 올리면
  // 결론을 먼저 읽게 돼 문장이 뒤집힌다.
  drawRest();
  y += gap;
  drawKey();

  // C 는 핵심 구절 아래에 가는 십자 표시를 둔다 (일부 변형은 없이)
  if (centered && (layout as { mark?: boolean }).mark !== false) {
    y += gap;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = Math.max(1, width * 0.0016);
    const arm = width * 0.055;
    ctx.beginPath(); ctx.moveTo(x - arm, y); ctx.lineTo(x + arm, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - width * 0.016); ctx.lineTo(x, y + width * 0.016); ctx.stroke();
    ctx.restore();
  }

  if (reference) {
    const anyCtx = ctx as unknown as { letterSpacing?: string };
    const hasLS = 'letterSpacing' in anyCtx;
    ctx.font = `400 ${refPx}px ${GRAIN_REF_FONT}`;
    ctx.fillStyle = pal.ink;
    ctx.globalAlpha = 0.68;
    if (hasLS) anyCtx.letterSpacing = `${(refPx * 0.12).toFixed(1)}px`;
    ctx.fillText(reference, x, y + refPx * 2.2);
    if (hasLS) anyCtx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }
}

function renderGrainCard(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  reference: string | undefined,
  spec: GenerativeSpec,
): string {
  drawGrain(ctx, width, height, spec);

  const pal = spec.grainPal!;
  const layout = GRAIN_LAYOUTS[spec.layout ?? 0];
  if (layout.kind !== 'uniform') {
    drawHeroText(ctx, width, height, text, reference, spec, layout);
    return canvas.toDataURL('image/png');
  }
  const maxW = width * 0.78;          // 좌우 여백 11%씩
  const minPx = Math.round(width * 0.045);
  const step = Math.max(1, Math.round(width * 0.003));
  const vFits = (px: number, count: number) =>
    count * px * 1.72 + (reference ? px * 0.6 * 1.9 : 0) <= height * 0.84;

  // 사용자가 Enter로 넣은 줄바꿈이 있으면 그 배치를 그대로 존중한다(편집 안내의 약속).
  // 줄바꿈이 없을 때만 스펙대로 1→4줄 균형 분할을 시도한다.
  const hasUserBreaks = text.includes('\n');
  let fontPx = Math.round(width * 0.065);
  let lines: string[] | null = null;
  while (fontPx >= minPx && !lines) {
    ctx.font = `400 ${fontPx}px ${spec.font}`;
    if (hasUserBreaks) {
      const got = forceWrap(ctx, text, maxW);
      // 쪼개지지 않고 사용자 줄 그대로 들어갈 때만 채택
      if (got.length === text.split('\n').filter((s) => s.trim()).length && vFits(fontPx, got.length)) lines = got;
    } else {
      for (let n = 1; n <= 4; n++) {
        const got = wrapKeepAll(ctx, text, maxW, n);
        if (got && vFits(fontPx, got.length)) { lines = got; break; }
      }
    }
    if (!lines) fontPx -= step;
  }
  // 최소 크기로도 안 들어가면 줄 수를 늘린다. 글자를 빼거나 줄이지는 않는다.
  if (!lines) {
    fontPx = minPx;
    ctx.font = `400 ${fontPx}px ${spec.font}`;
    if (!hasUserBreaks) for (let n = 5; n <= 12 && !lines; n++) lines = wrapKeepAll(ctx, text, maxW, n);
    if (!lines) lines = forceWrap(ctx, text, maxW);
    // 줄 수가 아주 많아도 카드 밖으로 나가지 않도록 끝까지 줄인다(원문 보존 우선).
    while (!vFits(fontPx, lines.length) && fontPx > width * 0.014) {
      fontPx -= step;
      ctx.font = `400 ${fontPx}px ${spec.font}`;
      lines = forceWrap(ctx, text, maxW);
    }
  }

  ctx.font = `400 ${fontPx}px ${spec.font}`;
  const lineH = fontPx * 1.72;
  // 주소도 카드 밖으로 나가지 않게 맞춘다
  let refPx = Math.round(fontPx * 0.6);
  if (reference) {
    // 실제 렌더에 자간 0.12em이 붙으므로 그만큼을 더해서 잰다
    const refW = () => ctx.measureText(reference).width + refPx * 0.12 * Math.max(0, Array.from(reference).length - 1);
    ctx.font = `400 ${refPx}px ${GRAIN_REF_FONT}`;
    while (refPx > 6 && refW() > maxW) {
      refPx -= 1;
      ctx.font = `400 ${refPx}px ${GRAIN_REF_FONT}`;
    }
    ctx.font = `400 ${fontPx}px ${spec.font}`;
  }
  const bodyH = lines.length * lineH;
  const totalH = bodyH + (reference ? refPx * 1.9 : 0);

  let top = height * layout.bodyTop;
  const maxTop = height * 0.93 - totalH;
  if (top > maxTop) top = Math.max(height * 0.06, maxTop);

  const x = layout.align === 'left' ? width * 0.11 : layout.align === 'right' ? width * 0.89 : width / 2;
  ctx.textAlign = layout.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pal.ink;
  let y = top + fontPx * 0.95;
  for (const l of lines) { ctx.fillText(l, x, y); y += lineH; }

  if (reference) {
    const anyCtx = ctx as unknown as { letterSpacing?: string };
    const hasLS = 'letterSpacing' in anyCtx;
    ctx.font = `400 ${refPx}px ${GRAIN_REF_FONT}`;
    ctx.fillStyle = pal.ink;
    ctx.globalAlpha = 0.75;
    if (hasLS) anyCtx.letterSpacing = `${(refPx * 0.12).toFixed(1)}px`;
    ctx.fillText(reference, x, top + bodyH + refPx * 1.35);
    if (hasLS) anyCtx.letterSpacing = '0px';
    ctx.globalAlpha = 1;
  }

  return canvas.toDataURL('image/png');
}
