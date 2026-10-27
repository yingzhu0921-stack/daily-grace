/**
 * 제너러티브 카드(T05) — 플로우 필드(flow field) 아트 배경 + 진짜 폰트 글자.
 *
 * 수천 개의 미세한 선이 Perlin 노이즈 벡터장을 따라 흐르며 비단/연기 같은 결을 만든다.
 * 위쪽에 흐름을 모으고 아래는 비워, 그 여백에 글자를 얹는다.
 *
 * 강의(W03 "규칙을 코드로"): AI 이미지 호출 0(토큰 0), AI 멈춰도 작동,
 * seed 고정→같은 기록 같은 카드(재현), 진짜 폰트→철자 정확, 색은 팔레트로 정확히 지정.
 */

export type GenerativeStyle = 'grain';

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
/**
 * 글자 수 대신 '보이는 폭'으로 센다. 한글은 한 글자가 네모 한 칸이지만
 * 영문은 그 절반쯤이라, 글자 수로 재면 같은 분량의 영어 구절이 두 배로 길게 잡힌다.
 */
function visualLen(text: string): number {
  let total = 0;
  for (const ch of text) total += /[\uAC00-\uD7A3\u3131-\u318E]/.test(ch) ? 1 : 0.5;
  return total;
}

const CLAUSE_END = /(아|어|여|고|며|니|매|므로|지만|나|되|면서|라도|거늘|거니와|새)$/;

/** 강조 구간. 어절 번호(둘 다 포함). 어절 중간에서는 절대 끊기지 않는다. */
export interface EmphasisSpan {
  from: number;
  to: number;
}

/** 사용자가 고른 강조. undefined 면 자동, 'none' 이면 강조 없이 같은 크기로만. */
export type EmphasisChoice = 'none' | EmphasisSpan;

/**
 * 본문을 어절로 나눈다. 사이 글자(공백)는 그대로 들고 있어 원문을 한 글자도 잃지 않는다.
 * 짝수 칸이 어절, 홀수 칸이 그 사이다(비어 있을 수 있다).
 *
 * 공백뿐 아니라 **쉼표·가운뎃점 뒤에서도 끊는다.** "기뻐하라,쉬지" 처럼 쉼표 뒤에
 * 공백이 없으면 두 어절이 한 덩어리가 돼, 쉼표를 경계로 한 강조를 고를 수 없다.
 * 구분 문자는 앞 조각에 붙여 둔다(splitSegments 와 같은 규칙).
 */
function tokenize(text: string): string[] {
  const out: string[] = [];
  const rough = text.split(/(\s+)/);          // [어절, 공백, 어절, 공백, …]
  for (let i = 0; i < rough.length; i += 2) {
    const gap = rough[i + 1] ?? '';
    const pieces = rough[i].split(/(?<=[,·])/).filter((piece) => piece !== '');
    if (!pieces.length) pieces.push(rough[i]);  // 빈 어절(맨 앞 공백 등)도 자리를 지킨다
    pieces.forEach((piece, k) => {
      out.push(piece);
      out.push(k === pieces.length - 1 ? gap : '');
    });
  }
  return out;
}

/** 화면에서 탭할 어절 목록. 번호가 EmphasisSpan 의 from/to 와 같다. */
export function emphasisWords(text: string): string[] {
  return tokenize(text).filter((_, i) => i % 2 === 0).filter(Boolean);
}

/** 어절 번호 → tokenize 배열의 칸 번호 */
function wordSlots(tokens: string[]): number[] {
  const slots: number[] = [];
  tokens.forEach((t, i) => { if (i % 2 === 0 && t) slots.push(i); });
  return slots;
}

/**
 * 혼자 서지 못하는 말. 강조를 이런 말로 **시작하면** "모든 / 것을" 처럼
 * 잘린 것처럼 읽힌다. 자동으로 고를 때만 피한다(직접 고르면 사용자 뜻대로).
 */
const BOUND_NOUN = /^(것|것을|것이|것은|것도|수|수가|때|때에|바|바를|줄|데|데에|뿐|뿐만|만큼|지|적|채|터|리|나름)$/;

/**
 * 자동으로 크게 쓸 구간을 정한다. **지금까지와 같은 자리**를 고른다.
 * 다만 혼자 못 서는 말로 시작하면 한 어절 앞으로 물린다.
 */
export function autoEmphasisSpan(text: string): EmphasisSpan | null {
  if (visualLen(text) > 90) return null;             // 아주 긴 본문은 크게 키울 수 없다
  const words = emphasisWords(text);
  const last = words.length - 1;
  if (last < 0) return null;

  const widen = (from: number): EmphasisSpan => {
    let f = from;
    while (f > 1 && BOUND_NOUN.test(words[f])) f -= 1;   // 앞 어절까지 끌어온다
    return { from: f, to: last };
  };

  // 1순위 — 쉼표·줄바꿈. 마지막 조각이 강조가 된다.
  const segs = splitSegments(text);
  if (segs.length >= 2) {
    const tailWords = segs[segs.length - 1].trim().split(/\s+/).filter(Boolean).length;
    if (tailWords > 0 && tailWords <= words.length) return widen(words.length - tailWords);
  }

  if (words.length < 5) return null;                 // 짧은 문장은 나눌 데가 없다

  // 2순위 — 끝에서부터 연결어미로 끝나는 어절을 찾아 그 뒤에서 끊는다
  for (let i = words.length - 2; i >= 2; i--) {
    const keyWords = words.slice(i + 1);
    const keyLen = visualLen(keyWords.join(' '));
    if (keyWords.length < 2 || keyLen < 6 || keyLen > 22) continue;
    if (CLAUSE_END.test(words[i])) return widen(i + 1);
  }

  // 끊을 자리를 못 찾으면 뒤 3분의 1을 핵심 구절로 본다
  const cut = Math.max(2, Math.floor(words.length * 0.66));
  if (words.length - cut < 2) return null;
  return widen(cut);
}

/** 이 글에 강조할 만한 자리가 있는지. 없으면 "강조 고르기"를 쓸 수 없다. */
export function canEmphasize(text: string): boolean {
  return emphasisWords(text).length >= 2;
}

export interface EmphasisParts {
  before: string;
  key: string;
  after: string;
}

/**
 * 고른 구간으로 본문을 앞 / 강조 / 뒤 세 토막으로 나눈다.
 * **자르는 자리는 언제나 어절 경계**이고, 원문 글자는 하나도 바뀌지 않는다.
 */
/**
 * 문구를 고쳐도 강조한 말이 그대로 남아 있으면, 바뀐 어절 번호로 옮겨 준다.
 * 찾지 못하면 undefined 를 돌려 자동 강조로 되돌린다 — 엉뚱한 자리를 크게 쓰는 것보다 낫다.
 */
export function remapEmphasis(
  oldText: string,
  newText: string,
  choice: EmphasisChoice | undefined,
): EmphasisChoice | undefined {
  if (!choice || choice === 'none') return choice;
  const oldWords = emphasisWords(oldText);
  const newWords = emphasisWords(newText);
  const target = oldWords.slice(choice.from, choice.to + 1);
  if (!target.length) return undefined;
  for (let i = 0; i + target.length <= newWords.length; i++) {
    if (target.every((w, k) => newWords[i + k] === w)) {
      return { from: i, to: i + target.length - 1 };
    }
  }
  return undefined;
}

export function emphasisParts(text: string, choice?: EmphasisChoice): EmphasisParts | null {
  if (choice === 'none') return null;
  const span = choice ?? autoEmphasisSpan(text);
  if (!span) return null;
  const tokens = tokenize(text);
  const slots = wordSlots(tokens);
  if (!slots.length) return null;
  const from = Math.max(0, Math.min(span.from, slots.length - 1));
  const to = Math.max(from, Math.min(span.to, slots.length - 1));
  const a = slots[from];
  const b = slots[to];
  return {
    before: tokens.slice(0, a).join(''),
    key: tokens.slice(a, b + 1).join(''),
    after: tokens.slice(b + 1).join(''),
  };
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
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function hexA(hex: string, a: number) {
  const c = hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// 가벼운 종이 그레인(노이즈)
export interface GenerativeSpec {
  seed: number;
  style: GenerativeStyle;
  palette: GenerativePalette;
  font: string;
  ring?: boolean;     // (aura) 글자 주위 얇은 타원 링
  accentKind?: 'sparkle' | 'line' | 'arc' | 'none'; // (aura) 미세 악센트
  refPill?: boolean;  // (aura) 주소를 오벌 알약 테두리로
  grainPal?: GrainPalette; // (grain) 28색 팔레트
  layout?: number;    // (grain) GRAIN_LAYOUTS 인덱스
  sparkle?: boolean;  // (grain) 사용 안 함 — 별 장식은 2026-10-24에 제거했다. 항상 false
  /**
   * (grain) 어디를 크게 쓸지.
   *  · undefined — 자동
   *  · {from,to} — 사용자가 탭으로 고른 어절 구간
   *  · 'none'    — 강조 없이 같은 크기로만
   */
  emphasis?: EmphasisChoice;
}

const GRAIN_BODY_FONTS = [
  "'Gowun Batang', serif",          // 명조 — 차분한 기본
  "'Gowun Dodum', sans-serif",      // 고딕 — 깔끔하고 현대적
  "'BusanDandiGothic', sans-serif", // 부산단디 — 또렷하고 자간이 넓다
  "'SeoulNamsan', sans-serif",      // 서울남산 — 가늘고 단정하다
  "'NoonnuBasicGothic', sans-serif",// 눈누기초 — 굵고 힘이 있다
  "'LeeSunSinDotum', sans-serif",   // 이순신돋움 — 중간 굵기, 살짝 각지다
];

/** 글꼴마다 같은 px 라도 보이는 크기가 조금씩 다르다. */
function fontScale(css: string): number {
  if (css.includes('Gowun Dodum')) return 0.97;
  if (css.includes('NoonnuBasic')) return 0.95;  // 굵어서 조금 작게
  return 1;
}

/**
 * 강조에 쓸 굵기. 굵은 자형이 없는 글꼴에 700 을 주면 억지로 굵게 그려져 지저분해진다.
 * 고운바탕만 700 을 들고 있다.
 */
function fontBoldWeight(css: string): number {
  // 굵은 자형을 실제로 들고 있는 글꼴에만 700 을 준다
  return css.includes('Gowun Batang') || css.includes('BusanDandi') ? 700 : 400;
}

export async function preloadGrainFonts(text = ''): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  // 구글 한글 웹폰트는 유니코드 구간별로 잘게 쪼개져 있다. 실제 글자를 함께 넘겨야
  // 그 글자가 든 구간을 받아온다. 안 넘기면 한글 구간이 빠져 글자마다 다른 글꼴이 섞인다.
  const sample = `${text} 가나다라마바사아자차카타파하 0123456789:` ;
  const families = [...GRAIN_BODY_FONTS, GRAIN_REF_FONT];
  await Promise.all(
    families.map((css) =>
      document.fonts.load(`400 64px ${css}`, sample).catch(() => undefined),
    ),
  );
  await document.fonts
    .load("700 64px 'Gowun Batang', serif", sample)
    .catch(() => undefined);
}

const GRAIN_REF_FONT = "'Gowun Dodum', sans-serif";

export function pickGrainSpec(text: string, seedOverride?: number): GenerativeSpec {
  const seed = seedOverride ?? hashSeed(text || 'grace');
  const rnd = mulberry32(seed);
  const grainPal = GRAIN_PALETTES[Math.floor(rnd() * GRAIN_PALETTES.length)];
  const font = GRAIN_BODY_FONTS[Math.floor(rnd() * GRAIN_BODY_FONTS.length)];
  // 조각이 하나뿐인 문장에는 hero 계열을 쓰지 않는다
  const layoutPool = autoEmphasisSpan(text) ? GRAIN_LAYOUTS.length : UNIFORM_LAYOUT_COUNT;
  const layout = Math.floor(rnd() * layoutPool);
  // 별(반짝이) 장식은 제거했다(2026-10-24 요청 4).
  // 난수 소비는 그대로 둔다 — 빼면 이후 난수가 밀려 같은 시드의 색·배치가 달라진다.
  rnd();
  return {
    seed,
    style: 'grain',
    font,
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

  // 색 덩어리는 가장자리가 서서히 사라지는 방사형 그라데이션으로 그린다.
  //
  // 전에는 원을 그리고 ctx.filter 로 흐리게 했는데, 캔버스 filter 는 사파리 17 미만에서
  // 지원되지 않는다. 지원되지 않으면 **조용히 무시돼** 테두리가 또렷한 원이 그대로
  // 남는다. 아이폰에서 "그라데이션이 아니라 또렷한 원 도형" 으로 보이던 원인이다.
  // 그라데이션은 어디서나 같게 그려진다.
  ctx.save();
  for (const b of blobs) {   // 어두운 덩어리가 마지막이라 글자 뒤에 얹힌다
    const cx = w * b.cx;
    const cy = h * b.cy;
    const r = w * b.r * 1.5;               // 흐려지는 만큼 더 넓게 퍼뜨린다
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, hexA(b.color, 1));
    g.addColorStop(0.45, hexA(b.color, 0.72));
    g.addColorStop(0.75, hexA(b.color, 0.28));
    g.addColorStop(1, hexA(b.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
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
export interface RenderGenerativeOpts {
  text: string;
  reference?: string;
  ratio: string;
  spec: GenerativeSpec;
  heroFont?: string;
}

/**
 * 사용자가 고른 강조에 맞춰 배치 번호를 옮긴다.
 * 배경은 팔레트·시드에서 나오므로 그대로 남고, 글 배치만 바뀐다.
 */
function resolveLayoutIndex(text: string, spec: GenerativeSpec): number {
  const base = spec.layout ?? 0;
  const heroCount = GRAIN_LAYOUTS.length - UNIFORM_LAYOUT_COUNT;
  if (spec.emphasis === 'none') {
    return base % UNIFORM_LAYOUT_COUNT;                       // 같은 크기로만
  }
  if (spec.emphasis && emphasisParts(text, spec.emphasis)) {
    if (base < UNIFORM_LAYOUT_COUNT) {
      return UNIFORM_LAYOUT_COUNT + (base % heroCount);       // 강조를 골랐으면 크게 쓰는 배치로
    }
  }
  return base;
}

export function renderGenerativeCard(opts: RenderGenerativeOpts): string {
  const { text, reference, ratio, spec } = opts;
  const { width, height } = genDims(ratio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  return renderGrainCard(canvas, ctx, width, height, text, reference, spec);
}


function fitLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  return forceWrap(ctx, text, maxW);
}

/**
 * 줄 길이를 고르게 나눈다. 들어가는 가장 적은 줄 수를 먼저 쓴다.
 * 탐욕적으로 채우면 마지막 줄에 짧은 어절 하나만 남는 일이 잦아서,
 * 강조를 고른 카드의 줄바꿈이 어색해 보였다.
 */
function balancedLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  for (let n = 1; n <= 6; n++) {
    const got = wrapKeepAll(ctx, text, maxW, n);
    if (got) return got;
  }
  return fitLines(ctx, text, maxW);
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
  const parts = emphasisParts(text, spec.emphasis);
  const key = parts?.key ?? text;
  // 강조가 문장 가운데일 수 있다. 앞·뒤를 따로 들고 원문 순서대로 그린다.
  // 쉼표·줄바꿈이 있으면 조각마다 줄을 나눈다(예전과 같은 읽기 리듬).
  const beforeSegs = parts ? splitSegments(parts.before) : [];
  const afterSegs = parts ? splitSegments(parts.after) : [];

  // 핵심 구절 크기: A 는 아주 크게, C 는 조금 크게. 길면 줄인다.
  const fs = fontScale(spec.font);
  const boldW = fontBoldWeight(spec.font);
  let keyPx = Math.round(width * (centered ? 0.072 : 0.100) * fs);
  const minKeyPx = Math.round(width * (centered ? 0.05 : 0.062) * fs);
  const hasLoneWord = (ls: string[]) => ls.length > 1 && ls.some((l) => l.trim().split(/\s+/).length === 1 && [...l.trim()].length <= 3);
  let keyLines: string[] = [];
  while (keyPx >= minKeyPx) {
    ctx.font = `${boldW} ${keyPx}px ${spec.font}`;
    keyLines = balancedLines(ctx, key, maxW);
    // 짧은 어절이 한 줄에 혼자 남으면 한 단계 줄여 다시 묶는다
    if (keyLines.length <= (centered ? 2 : 3) && !hasLoneWord(keyLines)) break;
    keyPx -= Math.max(1, Math.round(width * 0.004));
  }

  let restPx2 = Math.round(width * (centered ? 0.046 : 0.040) * fs);
  ctx.font = `400 ${restPx2}px ${spec.font}`;
  const beforeLines = beforeSegs.flatMap((r) => balancedLines(ctx, r, maxW));
  const afterLines = afterSegs.flatMap((r) => balancedLines(ctx, r, maxW));
  const restCount = beforeLines.length + afterLines.length;
  const gapCount = (beforeLines.length ? 1 : 0) + (afterLines.length ? 1 : 0);

  let keyLH = keyPx * 1.22;
  let restLH = restPx2 * 1.65;
  const refPx = Math.round(width * 0.027);
  const gap = width * 0.03;
  let totalH = keyLines.length * keyLH + restCount * restLH + gap * gapCount + refPx * 2.4;

  // 그래도 카드 높이를 넘으면 전체를 비례해 줄인다
  const avail = height * 0.84;
  if (totalH > avail) {
    const k = avail / totalH;
    keyPx = Math.max(12, Math.round(keyPx * k));
    restPx2 = Math.max(10, Math.round(restPx2 * k));
    keyLH = keyPx * 1.22;
    restLH = restPx2 * 1.65;
    totalH = keyLines.length * keyLH + restCount * restLH + gap * gapCount + refPx * 2.4;
  }

  let top = height * layout.bodyTop;
  const maxTop = height * 0.9 - totalH;
  if (top > maxTop) top = Math.max(height * 0.07, maxTop);

  ctx.textAlign = layout.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pal.ink;
  let y = top;

  const drawRest = (lines: string[]) => {
    if (!lines.length) return;
    ctx.font = `400 ${restPx2}px ${spec.font}`;
    ctx.globalAlpha = 0.78;
    for (const line of lines) { y += restLH; ctx.fillText(line, x, y); }
    ctx.globalAlpha = 1;
  };
  const drawKey = () => {
    ctx.font = `${boldW} ${keyPx}px ${spec.font}`;
    for (const line of keyLines) { y += keyLH; ctx.fillText(line, x, y); }
  };

  // 언제나 원문 순서대로 그린다. 강조가 가운데여도 앞 → 강조 → 뒤 순서다.
  // 순서를 바꾸면 사용자가 쓴 문장이 뒤집혀 읽힌다.
  drawRest(beforeLines);
  if (beforeLines.length) y += gap;
  drawKey();
  if (afterLines.length) y += gap;
  drawRest(afterLines);

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
  const layout = GRAIN_LAYOUTS[resolveLayoutIndex(text, spec)];
  if (layout.kind !== 'uniform') {
    drawHeroText(ctx, width, height, text, reference, spec, layout);
    return canvas.toDataURL('image/png');
  }
  const maxW = width * 0.78;          // 좌우 여백 11%씩
  const minPx = Math.round(width * 0.045 * fontScale(spec.font));
  const step = Math.max(1, Math.round(width * 0.003));
  const vFits = (px: number, count: number) =>
    count * px * 1.72 + (reference ? px * 0.6 * 1.9 : 0) <= height * 0.84;

  // 사용자가 Enter로 넣은 줄바꿈이 있으면 그 배치를 그대로 존중한다(편집 안내의 약속).
  // 줄바꿈이 없을 때만 스펙대로 1→4줄 균형 분할을 시도한다.
  const hasUserBreaks = text.includes('\n');
  let fontPx = Math.round(width * 0.065 * fontScale(spec.font));
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
