/**
 * T02(강렬한 포스터) 글자 굽기.
 *
 * 2026-11-11 사용자: "폰트가 촌스럽게 보이게 하는 거 같아". AI 가 한글을 그리면 어느 스타일이든
 * 평범한 굵은 고딕이 되어서, T02 는 AI 가 배경만 만들고 글자는 여기서 진짜 폰트로 구워 넣는다.
 * T03 처럼 결과를 한 장의 이미지로 굽기 때문에 미리보기·저장·다운로드·클라우드는 따로 손댈 필요가 없다.
 *
 * 폰트는 사용자가 견본에서 고른 것만 쓴다(세리프·명조, 굵은 고딕, 개성 있는 고딕).
 * 에스코어 드림은 앱 임베딩 허용이 확인되지 않아 뺐다.
 * 사용자가 쓴 문구는 그대로 쓴다 — 줄을 나누고 크기만 바꾸며, 글자를 바꾸지 않는다.
 */

export type T02Zone = 'lower' | 'center' | 'left' | 'upper';
export type T02StyleKey = 'film' | 'field' | 'swiss' | 'riso' | 'serif' | 'duotone' | 'minimal' | 'flat';

export interface T02Info {
  key: T02StyleKey;
  zone: T02Zone;
  ink: string;
  sub: string;
  accent: string;
  seed: number;
}

export interface T02Line { text: string; scale?: number }

export interface FontChoice { family: string; weight: number }

const PRETENDARD: FontChoice = { family: "'Pretendard', sans-serif", weight: 900 };
const PRETENDARD_SUB: FontChoice = { family: "'Pretendard', sans-serif", weight: 600 };
const BLACK_HAN: FontChoice = { family: "'Black Han Sans', sans-serif", weight: 400 };
const PAPERLOGY: FontChoice = { family: "'PaperBlack', sans-serif", weight: 400 };
const GMARKET: FontChoice = { family: "'GmarketSans', sans-serif", weight: 700 };
const DO_HYEON: FontChoice = { family: "'Do Hyeon', sans-serif", weight: 400 };
const TAENADA: FontChoice = { family: "'Taenada', sans-serif", weight: 400 };
const HAHMLET: FontChoice = { family: "'Hahmlet', serif", weight: 900 };
const NOTO_SERIF: FontChoice = { family: "'Noto Serif KR', serif", weight: 900 };
const NOTO_SERIF_SUB: FontChoice = { family: "'Noto Serif KR', serif", weight: 600 };
const SONG_MYUNG: FontChoice = { family: "'Song Myung', serif", weight: 400 };
const MARUBURI: FontChoice = { family: "'MaruBuri', serif", weight: 400 };
const PRETENDARD_500: FontChoice = { family: "'Pretendard', sans-serif", weight: 500 };
const HAHMLET_400: FontChoice = { family: "'Hahmlet', serif", weight: 400 };
// T01(귀여운 그림) 손글씨. 구글 폰트(OFL)와 카페24 슈퍼매직(번들 허용) — 앱 임베딩 가능한 것만.
const GAEGU: FontChoice = { family: "'Gaegu', cursive", weight: 700 };
const GOWUN_DODUM: FontChoice = { family: "'Gowun Dodum', sans-serif", weight: 400 };
const SUPERMAGIC: FontChoice = { family: "'Cafe24SuperMagic', sans-serif", weight: 400 };

/** 스타일마다 어울리는 큰 글씨 폰트 후보. 카드마다 seed 로 하나를 고른다. */
export const HERO_FONTS: Record<T02StyleKey, FontChoice[]> = {
  film: [BLACK_HAN, PRETENDARD, DO_HYEON],
  field: [GMARKET, BLACK_HAN, PAPERLOGY],
  swiss: [PRETENDARD, PAPERLOGY],
  riso: [DO_HYEON, TAENADA, GMARKET],
  serif: [HAHMLET, SONG_MYUNG, NOTO_SERIF],
  duotone: [PAPERLOGY, TAENADA, BLACK_HAN],
  // 2026-11-11 T02 = 미니멀 감성. 사용자 선택: 마루부리·Pretendard 를 번갈아, 작게, 그림자 없이.
  // 2026-11-12 사용자 선택(견본 12종 중): 마루부리 + 함렛. 둘 다 OFL(웹·앱 임베딩 가능).
  minimal: [MARUBURI, HAHMLET_400],
  // 2026-11-12 T01 = 귀여운 그림. AI 손글씨가 학습지처럼 촌스러워서 진짜 손글씨 폰트로 작게 굽는다.
  // 하이멜로디는 가늘어서 색면 위에서 약해 보여 뺐다.
  flat: [GAEGU, GOWUN_DODUM, SUPERMAGIC],
};

const ALIGN: Record<T02StyleKey, 'left' | 'center'> = {
  film: 'left', field: 'left', swiss: 'left', riso: 'center', serif: 'center', duotone: 'center', minimal: 'center', flat: 'center',
};

/** 큰 글씨 최대 크기(카드 폭 대비). 색면 스타일은 글씨가 주인공이라 가장 크게 허용한다. */
export const MAX_HERO: Record<T02StyleKey, number> = {
  film: 0.15, field: 0.24, swiss: 0.14, riso: 0.17, serif: 0.14, duotone: 0.16, minimal: 0.04, flat: 0.07,
};

export function t02FontsFor(info: Pick<T02Info, 'key' | 'seed'>): { hero: FontChoice; sub: FontChoice } {
  const list = HERO_FONTS[info.key] || HERO_FONTS.field;
  const quiet = info.key === 'minimal' || info.key === 'flat';
  const hero = list[Math.abs(quiet ? info.seed : Math.floor(info.seed / 6)) % list.length];
  if (quiet) return { hero, sub: hero };
  const sub = info.key === 'serif' ? (hero === SONG_MYUNG ? SONG_MYUNG : NOTO_SERIF_SUB) : PRETENDARD_SUB;
  return { hero, sub };
}

const fontCss = (f: FontChoice, px: number) => `${f.weight} ${Math.round(px)}px ${f.family}`;

/** 성경 주소 같은 작은 출처 줄 (예: 수1:9, 요 3:16, 시편 23편) */
export function isT02RefLine(l: T02Line): boolean {
  const t = l.text.trim();
  if ((l.scale ?? 1) <= 0.55) return true;
  return /^[가-힣A-Za-z\s.]{1,12}\s?\d{1,3}\s?[:장]\s?\d{1,3}(\s?[-~]\s?\d{1,3})?\s?절?$/.test(t)
    || /^[가-힣]{1,6}\s?\d{1,3}편$/.test(t);
}

export interface T02Parts {
  intro: string[];
  hero: string[];
  ref: string;
  /** 원래 순서의 본문 줄과 강조 여부. 미니멀처럼 줄마다 강조를 고르는 스타일이 쓴다(강조 줄이 없으면 전부 big). */
  body: { text: string; big: boolean }[];
}

/** 줄을 '작은 도입부 / 큰 글씨 / 출처'로 나눈다. 강조 줄이 없으면 본문 전체가 큰 글씨다. */
export function splitT02Lines(lines: T02Line[]): T02Parts {
  const refLine = lines.find(isT02RefLine);
  const body = lines.filter((l) => l !== refLine && l.text.trim());
  const firstHero = body.findIndex((l) => (l.scale ?? 1) >= 1.2);
  const bodyLines = body.map((l) => ({ text: l.text.trim(), big: firstHero < 0 || (l.scale ?? 1) >= 1.2 }));
  if (firstHero < 0) return { intro: [], hero: body.map((l) => l.text.trim()), ref: refLine?.text.trim() || '', body: bodyLines };
  return {
    intro: body.slice(0, firstHero).map((l) => l.text.trim()),
    hero: body.slice(firstHero).map((l) => l.text.trim()),
    ref: refLine?.text.trim() || '',
    body: bodyLines,
  };
}

/** 띄어쓰기 단위로만 maxW 안에 감싼다. 한 어절이 너무 길면 그 어절만 글자 단위로 나눈다. */
export function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let w = word;
    while (ctx.measureText(w).width > maxW && Array.from(w).length > 1) {
      const chars = Array.from(w);
      let cut = 1;
      while (cut < chars.length && ctx.measureText(chars.slice(0, cut + 1).join('')).width <= maxW) cut++;
      if (cur) { out.push(cur); cur = ''; }
      out.push(chars.slice(0, cut).join(''));
      w = chars.slice(cut).join('');
    }
    const test = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(test).width > maxW) { out.push(cur); cur = w; } else cur = test;
  }
  if (cur) out.push(cur);
  return out;
}

/** 한 줄을 폭 안에 들어가는 가장 적은 줄 수로, 길이가 고르게 나눈다(어절 단위). */
export function wrapBalanced(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  if (ctx.measureText(text).width <= maxW) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  for (let n = 2; n <= words.length; n++) {
    // 단어를 n 묶음으로 나누는 경우 중 가장 넓은 줄이 가장 좁은 것을 고른다.
    let best: string[] | null = null;
    let bestW = Infinity;
    const walk = (start: number, left: number, acc: string[]) => {
      if (left === 1) {
        const line = words.slice(start).join(' ');
        const rows = [...acc, line];
        const w = Math.max(...rows.map((r) => ctx.measureText(r).width));
        if (w < bestW) { bestW = w; best = rows; }
        return;
      }
      for (let end = start + 1; end <= words.length - (left - 1); end++) {
        walk(end, left - 1, [...acc, words.slice(start, end).join(' ')]);
      }
    };
    if (words.length <= 12) walk(0, n, []);
    if (best && bestW <= maxW) return best;
    if (words.length > 12) break;
  }
  return wrapWords(ctx, text, maxW);
}

interface Box { x: number; y: number; w: number; h: number }

function zoneBox(zone: T02Zone, W: number, H: number): Box {
  const side = W * 0.08;
  switch (zone) {
    case 'lower': return { x: side, y: H * 0.5, w: W - side * 2, h: H * 0.42 };
    case 'upper': return { x: side, y: H * 0.07, w: W - side * 2, h: H * 0.43 };
    case 'left': return { x: side, y: H * 0.17, w: W * 0.6, h: H * 0.72 };
    default: return { x: side, y: H * 0.16, w: W - side * 2, h: H * 0.68 };
  }
}

interface Laid { text: string; font: string; size: number; color: string; gapBefore: number }

/** 한 크기로 줄을 배치해 본다. */
function buildRows(ctx: CanvasRenderingContext2D, parts: T02Parts, info: T02Info, w: number, W: number, size: number) {
  const { hero, sub } = t02FontsFor(info);
  // 작은 줄도 큰 글씨가 아주 작아지면 같이 줄인다(긴 문구가 카드 밖으로 넘치지 않게).
  // 미니멀은 글씨 전체가 작아서, 작은 줄을 큰 글씨의 비율로만 정한다(최소 크기에 걸려 큰 글씨와 같아지지 않게).
  const quiet = info.key === 'minimal' || info.key === 'flat';
  const subSize = quiet ? size * 0.72 : Math.max(Math.min(W * 0.034, size * 0.7), size * 0.28);
  const refSize = quiet ? size * 0.6 : Math.max(Math.min(W * 0.03, size * 0.6), subSize * 0.85);
  const rows: Laid[] = [];
  // 미니멀·플랫: 줄마다 강조를 따로 고를 수 있다(2026-11-12 사용자: "텍스트 강조 부분 수정을 못 하네").
  // 강조 줄은 큰 글씨, 나머지는 작은 글씨로, 원래 줄 순서를 그대로 지킨다.
  if (quiet && parts.body?.length) {
    let prevBig: boolean | null = null;
    for (const line of parts.body) {
      const sz = line.big ? size : subSize;
      ctx.font = fontCss(line.big ? hero : sub, sz);
      const wrapped = line.big ? wrapBalanced(ctx, line.text, w) : wrapWords(ctx, line.text, w);
      wrapped.forEach((r, i) => {
        // 2026-11-13 사용자: 미니멀 글씨가 조금 크고 행간이 좁다 → 최대 크기 0.045→0.04, 줄 사이를 글씨 크기의 0.1 만큼 넓혔다.
        const gap = !rows.length ? 0 : i > 0 ? sz * 0.18 : prevBig === line.big ? sz * 0.22 : sz * 0.45;
        rows.push({ text: r, font: ctx.font, size: sz, color: line.big ? info.ink : info.sub, gapBefore: gap });
      });
      prevBig = line.big;
    }
    if (parts.ref) {
      ctx.font = fontCss(sub, refSize);
      rows.push({ text: parts.ref, font: ctx.font, size: refSize, color: info.sub, gapBefore: Math.max(size * 0.45, refSize * 0.6) });
    }
    const height = rows.reduce((h, r) => h + r.gapBefore + r.size * 1.05, 0);
    const widest = rows.length ? Math.max(...rows.map((r) => { ctx.font = r.font; return ctx.measureText(r.text).width; })) : 0;
    return { rows, height, widest };
  }
  ctx.font = fontCss(sub, subSize);
  for (const t of parts.intro) {
    for (const r of wrapWords(ctx, t, w)) rows.push({ text: r, font: ctx.font, size: subSize, color: info.sub, gapBefore: rows.length ? subSize * 0.3 : 0 });
  }
  ctx.font = fontCss(hero, size);
  // 의미 단위(분석 단계가 나눈 줄)는 넘지 않는다. 한 줄이 폭을 넘으면 그 줄만 고르게 나눈다.
  // 전체를 이어 붙여 감싸면 '가든지 네 하나님'처럼 의미 중간에서 끊겼다. 단어는 바뀌지 않는다.
  const heroRows = parts.hero.flatMap((t) => wrapBalanced(ctx, t, w));
  heroRows.forEach((r, i) => rows.push({ text: r, font: ctx.font, size, color: info.ink, gapBefore: i === 0 ? (rows.length ? size * 0.35 : 0) : size * 0.08 }));
  if (parts.ref) {
    ctx.font = fontCss(sub, refSize);
    rows.push({ text: parts.ref, font: ctx.font, size: refSize, color: info.sub, gapBefore: Math.max(size * 0.45, refSize * 0.6) });
  }
  const height = rows.reduce((h, r) => h + r.gapBefore + r.size * 1.05, 0);
  const widest = rows.length ? Math.max(...rows.map((r) => { ctx.font = r.font; return ctx.measureText(r.text).width; })) : 0;
  return { rows, height, widest };
}

/**
 * 상자 안에 들어가는 가장 큰 크기로 배치를 정한다. 넘치면 작게 줄여 가며 맞추고,
 * 그래도 안 되면 카드 거의 전체로 넓혀 다시 맞춘다(Codex 검토: 긴 문구가 카드 밖으로 잘림).
 */
export function layoutT02(
  ctx: CanvasRenderingContext2D,
  parts: T02Parts,
  info: T02Info,
  box: Box,
  W: number,
  H: number,
): { rows: Laid[]; height: number; box: Box } {
  const full: Box = { x: W * 0.06, y: H * 0.04, w: W * 0.88, h: H * 0.92 };
  const minSize = W * 0.012;
  let last: { rows: Laid[]; height: number; widest: number } | null = null;
  for (const b of [box, full]) {
    for (let size = W * (MAX_HERO[info.key] ?? 0.13); size >= minSize; size *= 0.94) {
      last = buildRows(ctx, parts, info, b.w, W, size);
      if (last.height <= b.h && last.widest <= b.w + 0.5) return { rows: last.rows, height: last.height, box: b };
    }
  }
  // 여기까지 오는 건 수천 자짜리 문구뿐이다. 가장 작은 크기로 카드 전체에 그린다.
  const fallback = last ?? buildRows(ctx, parts, info, full.w, W, minSize);
  return { rows: fallback.rows, height: fallback.height, box: full };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 글자에 인쇄 느낌을 준다: 군데군데 잉크가 덜 묻은 점을 뚫는다. */
function printWear(layer: CanvasRenderingContext2D, W: number, H: number, seed: number, amount: number) {
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  layer.save();
  layer.globalCompositeOperation = 'destination-out';
  const n = Math.round(W * H * amount);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    layer.globalAlpha = 0.25 + rnd() * 0.5;
    const r = 0.6 + rnd() * 1.4;
    layer.fillRect(x, y, r, r);
  }
  layer.restore();
}

/** 상자 영역의 평균 밝기(0~1). 성기게 표본을 떠서 빠르게 본다. */
function averageLuma(ctx: CanvasRenderingContext2D, box: Box): number {
  const x = Math.max(0, Math.floor(box.x)), y = Math.max(0, Math.floor(box.y));
  const w = Math.max(1, Math.floor(box.w)), h = Math.max(1, Math.floor(box.h));
  const data = ctx.getImageData(x, y, w, h).data;
  let sum = 0, n = 0;
  for (let i = 0; i < data.length; i += 4 * 37) { sum += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255; n++; }
  return n ? sum / n : 0.5;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('배경 이미지를 읽지 못했습니다.'));
    img.src = src;
  });
}

/**
 * 폰트를 받아 온다. 받지 못했으면 오류를 던진다 — 기본 고딕으로 조용히 구워 버리면
 * 'T02 를 진짜 폰트로' 바꾼 의미가 사라진다(Codex 검토). 호출하는 쪽은 기존 오버레이 경로로 넘어간다.
 */
export async function preloadT02Fonts(info: T02Info, text: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const { hero, sub } = t02FontsFor(info);
  const sample = `${text} 0123456789:`;
  const loaded = await Promise.all([hero, sub].map((f) => document.fonts.load(fontCss(f, 64), sample).catch(() => [] as FontFace[])));
  if (loaded.some((faces) => faces.length === 0) || ![hero, sub].every((f) => document.fonts.check(fontCss(f, 64), sample))) {
    throw new Error('T02 폰트를 불러오지 못했습니다.');
  }
}

/** 배경 위에 글자를 구운 PNG data URL 을 돌려준다. */
export async function renderT02Poster(background: string, lines: T02Line[], infoIn: T02Info): Promise<string> {
  let info = infoIn;
  const img = await loadImage(background);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return background;
  ctx.drawImage(img, 0, 0, W, H);

  const parts = splitT02Lines(lines);
  await preloadT02Fonts(info, lines.map((l) => l.text).join(' '));
  // 글씨 색을 서버가 'auto' 로 넘기면(미니멀 감성), 글씨가 놓일 자리의 밝기를 보고 정한다.
  if (info.ink === 'auto' || info.sub === 'auto') {
    const zb = zoneBox(info.zone, W, H);
    const light = averageLuma(ctx, zb) > 0.6;
    info = { ...info, ink: light ? '#24302A' : '#F7F2E8', sub: light ? '#3B463F' : '#EDE6D8', accent: light ? '#24302A' : '#F7F2E8' };
  }

  const layer = document.createElement('canvas');
  layer.width = W; layer.height = H;
  const lc = layer.getContext('2d');
  if (!lc) return background;

  const { rows, height, box } = layoutT02(lc, parts, info, zoneBox(info.zone, W, H), W, H);
  const align = ALIGN[info.key] || 'left';
  // 아래 자리는 아래쪽에 붙이고, 나머지는 상자 가운데에 둔다.
  const startY = Math.max(box.y, info.zone === 'lower' ? box.y + box.h - height : box.y + (box.h - height) / 2);
  let y = startY;
  lc.textBaseline = 'top';
  lc.textAlign = align;
  // 사진 위에 얹는 스타일은 옅은 그림자로 글자를 띄운다(사진 밝기가 고르지 않다).
  if (info.key === 'film' || info.key === 'serif' || info.key === 'duotone') {
    lc.shadowColor = 'rgba(0,0,0,0.35)';
    lc.shadowBlur = W * 0.012;
    lc.shadowOffsetY = W * 0.002;
  }
  const x = align === 'center' ? W / 2 : box.x;
  for (const r of rows) {
    y += r.gapBefore;
    lc.font = r.font;
    lc.fillStyle = r.color;
    lc.fillText(r.text, x, y);
    y += r.size * 1.05;
  }

  lc.shadowColor = 'transparent';
  // 스위스 그리드: 큰 글씨 위에 굵은 가로줄 하나(같은 잉크). 문구는 더하지 않는다.
  if (info.key === 'swiss' && rows.length) {
    lc.fillStyle = info.ink;
    const top = startY - W * 0.03;
    lc.fillRect(box.x, top, box.w * 0.5, Math.max(4, W * 0.006));
  }

  printWear(lc, W, H, info.seed, info.key === 'riso' ? 0.008 : 0.006);

  // 리소도 그대로 얹는다. 곱하기로 섞으면 망점 그림 위에서 글자가 묻혀 읽히지 않았다.
  ctx.drawImage(layer, 0, 0);
  return canvas.toDataURL('image/png');
}
