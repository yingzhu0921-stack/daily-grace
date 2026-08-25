import { getSessionUser } from './_lib/session';
import type { Env } from './_lib/db';

interface ExtendedEnv extends Env {
  OPENAI_API_KEY: string;
}

const NO_TEXT = 'IMPORTANT: NO text, letters, words, or writing of any kind in the image.';
const NO_FACES = 'NO human faces, portraits, or close-up characters.';
const CARD_BG = 'The image will be used as a card background — leave visual breathing room for text overlay. Keep the composition calm and uncluttered.';

const stylePrompts: Record<string, string> = {
  // ── 자동 완성 스타일 ──
  'minimal': `Clean minimalist card: \${input}. Large areas of negative space, muted neutral palette, soft light. Overlay this text beautifully on the image: "\${text}". Elegant readable typography, well-placed for readability. ${NO_FACES}`,
  'elegant': `Elegant refined card: \${input}. Soft gold and cream tones, delicate lighting, luxurious calm atmosphere. Overlay this text beautifully on the image: "\${text}". Graceful sophisticated typography. ${NO_FACES}`,
  'modern': `Modern artistic card: \${input}. Clean lines, bold but harmonious colors, contemporary aesthetic. Overlay this text beautifully on the image: "\${text}". Clean modern typography. ${NO_FACES}`,
  'classic': `Classic timeless card: \${input}. Warm earthy tones, painterly quality, soft natural light. Overlay this text beautifully on the image: "\${text}". Timeless elegant typography. ${NO_FACES}`,
  'vibrant': `Vibrant colorful card: \${input}. Rich saturated colors, dynamic yet peaceful composition. Overlay this text beautifully on the image: "\${text}". Bold readable typography. ${NO_FACES}`,
  'calm': `Calm tranquil card: \${input}. Soft cool tones, gentle misty atmosphere, still and meditative mood. Overlay this text beautifully on the image: "\${text}". Soft gentle typography. ${NO_FACES}`,
  // ── 직접 편집 스타일 ──
  '맑은 수채화': `Beautiful watercolor illustration of \${input}. Soft transparent watercolor washes. Gentle brush strokes. Warm natural lighting. Dreamy and peaceful atmosphere. Premium devotional aesthetic. Pastel color palette. Plenty of clean negative space. Elegant composition. Nature-focused scenery. No text. No letters. No people. No faces. No characters. ${CARD_BG}`,
  '따뜻한 동화': `Warm and playful storybook illustration of \${input}. Crayon and colored pencil drawing style. Soft hand-drawn textures. Simple shapes. Slightly imperfect lines. Childlike and charming. Cozy and heartwarming atmosphere. Gentle sunlight. Cute storybook feeling. Whimsical and cheerful mood. Soft pastel colors. Warm color palette. Simple composition. Looks like an illustration from a beloved children's picture book. Playful rather than realistic. Cute rather than elegant. No text. No typography. No realistic rendering. No dramatic lighting. ${CARD_BG}`,
  '감성 사진': `Professional lifestyle photography of \${input}. Soft natural light. Warm cinematic tones. Beautiful depth of field. Editorial photography style. Pinterest aesthetic. Calm and peaceful atmosphere. Premium visual storytelling. Large clean space for text overlay. No text. No logos. No people in foreground. ${CARD_BG}`,
  '심플 낙서': `Playful doodle sticker illustration of \${input}. Simple hand-drawn character design. Slightly awkward proportions. Messy sketch-like lines. Playful, quirky and expressive. Not perfectly cute. Slightly goofy and lovable. Korean doodle character aesthetic. Instagram sticker style. Indie sketchbook vibe. Minimal composition. Large white space. Mostly monochrome or muted neutral colors. Hand-drawn imperfections encouraged. Funny little interactions. Unexpected charming details. No text. No typography. No polished children's-book illustration. No realistic rendering. ${CARD_BG}`,
  '미니멀감성': `Minimal editorial illustration of \${input}. Warm beige background. Soft paper grain texture. Natural window light. Gentle shadows. Japanese minimal aesthetic. Kinfolk magazine style. Premium journaling atmosphere. Clean layout. Large negative space. Calm and contemplative mood. Muted natural colors. Elegant simplicity. Perfect for inspirational quote cards. No text. No typography. No logos. No people. No clutter. ${CARD_BG}`,
  '빈티지 필름': `Retro analog film photography of \${input}. Authentic 35mm film look. Subtle film grain. Warm faded colors. Soft natural sunlight. Light leaks. Vintage lens rendering. Nostalgic atmosphere. Timeless and peaceful mood. Editorial photography style. Large clean space for text overlay. Slight vignette. Soft contrast. Warm shadows. No text. No logos. ${CARD_BG}`,
};

const styleDescriptions: Record<string, string> = {
  '맑은 수채화': '부드러운 붓 터치와 투명한 워시 효과, 파스텔 컬러의 수채화 스타일',
  '따뜻한 동화': '손으로 그린 동화책 일러스트, 색연필 질감의 따뜻하고 포근한 스타일',
  '감성 사진': '부드러운 자연광과 따뜻한 색감의 감성적인 사진 스타일',
  '심플 낙서': '심플한 라인아트의 손그림 두들 스타일',
  '미니멀감성': '따뜻한 베이지 배경과 자연광의 미니멀 에디토리얼 스타일',
  '빈티지 필름': '빈티지 필름 특유의 그레인과 따뜻한 색감의 아날로그 스타일',
};

const ratioToSize: Record<string, string> = {
  '1:1': '1024x1024',
  '9:16': '1024x1536',
  '2:3': '1024x1536',
  '3:4': '1024x1536',
  '4:5': '1024x1536',
  '16:9': '1536x1024',
  '4:3': '1536x1024',
};

const ratioGuidance: Record<string, string> = {
  '1:1': 'Square composition (1:1). Keep the central 60% clean for typography.',
  '9:16': 'Vertical story composition (9:16). Keep the central vertical area clean for typography.',
  '2:3': 'Vertical poster composition (2:3). Keep the central 60% clean for typography.',
  '3:4': 'Vertical card composition (3:4). Keep the central 60% clean for typography.',
  '4:5': 'Vertical social card composition (4:5). Keep the central 60% clean for typography.',
  '16:9': 'Wide landscape composition (16:9). Keep the central horizontal band clean for typography.',
  '4:3': 'Landscape card composition (4:3). Keep the central horizontal area clean for typography.',
};

type TypoLine = { text: string; scale: number };

type AutoCardAnalysis = {
  // 타이포 레이아웃 (원문 전체를 줄 단위로, 각 줄 크기 배율 scale 포함)
  lines: TypoLine[];
  textAlign: 'left' | 'center';
  useBrush: boolean;
  mood: string;
  templates: string[];
  backgroundConcept?: string;
  visualMotifs?: string[];
  palette?: string;
  lighting?: string;
  composition?: string;
  typographyTone?: string;
  fontMood?: 'bold' | 'editorial' | 'lyrical' | 'quiet' | 'handwritten' | 'modern';
  avoidImagery?: string[];
  // 하위호환(과거 캐시) — 더 이상 직접 사용하지 않음
  mainPhrase?: string;
  secondaryPhrase?: string;
  reference?: string;
};

// 성경 출처 패턴 (대괄호/소괄호 유무, 한글 or 영어 책 약어 + 장:절 + 선택적 역본 태그).
// 예: [고후5:17] (시23:1) 마 5:14 요3:16 시편 23:1 [Mk 13:13, KJV] John 3:16 1 Cor 5:17 Psalm 126:5
const BIBLE_REF_ONE = /[\[\(]?\s*(?:[1-3]\s*)?[A-Za-z가-힣]{1,10}\.?\s*\d{1,3}\s*[:：]\s*\d{1,3}(?:\s*,?\s*(?:KJV|NIV|ESV|NASB|NLT|NKJV|개역개정|개역한글|새번역|공동번역|현대인의성경)\b)?\s*[\]\)]?/;
const BIBLE_REF_RE = new RegExp(BIBLE_REF_ONE.source, 'g');
// 본문 비교용: 출처·공백·문장부호 제거 후 비교 (출처 재포맷/부호 차이는 허용, 단어는 보존)
const bodyForCompare = (s: string) =>
  s.replace(BIBLE_REF_RE, '').replace(/[\s.,!?;:'"“”‘’()[\]·…~\-—]/g, '');

// 한 줄 전체가 성경 출처인지
const isRefLine = (s: string) => new RegExp(`^${BIBLE_REF_ONE.source}$`).test(s.trim());

// 본문을 포스터형 줄로 분할 (대략 11자 기준 그룹핑)
function splitBodyIntoLines(body: string): string[] {
  const words = body.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return words.length ? words : [];
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (cur && test.replace(/\s/g, '').length > 11) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// 성경 출처 표기 정리: 대괄호/소괄호 제거 + 책이름과 장:절 사이 공백. "[막16:15]"→"막 16:15"
function formatReference(s: string): string {
  return s
    .replace(/[\[\]()（）]/g, '')
    .replace(/\s*,?\s*(KJV|NIV|ESV|NASB|NLT|NKJV|개역개정|개역한글|새번역|공동번역|현대인의성경)\s*$/i, '')
    .replace(/([가-힣])\s*(\d)/, '$1 $2')
    .trim();
}

function semanticScoreLine(text: string): number {
  const compact = text.replace(/\s/g, '');
  let score = 0;
  if (/(우로나|좌로나|치우치지|치우치지말라|좌로나치우치지말라)/.test(compact)) score += 8;
  if (/(율법|다지켜|지켜행|기록된대로|묵상|평탄|형통)/.test(compact)) score += 4;
  if (/(말라그리하면|그리하면어디로|어디로가든지|말라그리|그리하면)/.test(compact)) score -= 8;
  if (/(그리하면|그러하면|그리고|그러나|또한|이에|하여|하며|하고|로다)$/.test(compact)) score -= 4;
  if (/^(그리하면|그러하면|그리고|그러나|또한|이에)/.test(compact)) score -= 4;
  const strongWords = [
    '하나님', '예수', '주님', '주의', '주께', '그리스도', '성령',
    '사랑', '은혜', '구원', '믿음', '소망', '평안', '회복', '새롭게',
    '찬송', '감사', '기도', '영광', '복음', '생명', '빛', '진리',
    '능력', '담대', '승리', '지워', '정직한영', '창조', '함께',
    '제사', '드리며', '서원', '갚으며', '헌신', '예배',
  ];
  for (const word of strongWords) {
    if (compact.includes(word)) score += word.length >= 3 ? 3 : 2;
  }
  if (/(주소서|하소서|하라|하리라|말라|두려워|찬송|전파|선포|감사|기도|믿으|사랑|드리|갚으|서원|제사)/.test(compact)) score += 3;
  if (/(그러므로|그런즉|그리고|그러나|이에|에게|에서|으로|하며|하고|므로)$/.test(compact)) score -= 2;
  if (compact.length >= 4 && compact.length <= 14) score += 1;
  if (compact.length > 22) score -= 1;
  return score;
}

function strongestContentIndex(lines: TypoLine[]): number {
  if (!lines.length) return 0;
  let bestIndex = 0;
  let bestScore = -Infinity;
  lines.forEach((line, index) => {
    // 아주 마지막 줄로 쉽게 쏠리지 않도록 동점이면 앞쪽 의미 단위를 우선한다.
    const positionPenalty = index === lines.length - 1 && lines.length > 1 ? 0.75 : 0;
    const score = semanticScoreLine(line.text) - positionPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function isBadEmphasisFragment(text: string): boolean {
  const compact = text.replace(/\s/g, '');
  return /(말라그리하면|그리하면어디로|그리하면|그러하면|그리고|그러나|또한)$/.test(compact)
    || /^(그리하면|그러하면|그리고|그러나|또한|이에)/.test(compact);
}

function repairEmphasisFragments(lines: TypoLine[]): TypoLine[] {
  if (lines.length < 2) return lines;
  return lines.map((line, index) => {
    if ((line.scale || 1) < 1.35 || !isBadEmphasisFragment(line.text)) return line;
    const replacementIndex = lines.findIndex((candidate) => {
      const compact = candidate.text.replace(/\s/g, '');
      return /(치우치지|다지켜|지켜행|기록된대로|묵상|평탄|형통)/.test(compact);
    });
    if (replacementIndex >= 0 && replacementIndex !== index) {
      return { ...line, scale: Math.min(line.scale, 1.0) };
    }
    return { ...line, scale: Math.min(line.scale, 1.05) };
  }).map((line, index, all) => {
    const largest = Math.max(...all.map((l) => l.scale || 1));
    if (largest > 1.2) return line;
    const replacementIndex = all.findIndex((candidate) => {
      const compact = candidate.text.replace(/\s/g, '');
      return /(치우치지|다지켜|지켜행|기록된대로|묵상|평탄|형통)/.test(compact);
    });
    return index === replacementIndex ? { ...line, scale: 1.55 } : line;
  });
}

// 위계 보정 + 출처는 대괄호 제거하고 맨 마지막(하단)에 작은 캡션으로 배치
function enforceHierarchy(lines: TypoLine[]): TypoLine[] {
  if (!lines.length) return lines;
  const refLines: TypoLine[] = [];
  const content: TypoLine[] = [];
  for (const l of lines) {
    if (isRefLine(l.text)) refLines.push({ text: formatReference(l.text), scale: Math.max(0.58, Math.min(l.scale || 0.62, 0.72)) });
    else content.push({ text: l.text, scale: l.scale });
  }
  const semanticHeroIndex = strongestContentIndex(content);
  // 본문이 평평하면 마지막 구절이 아니라 의미 점수가 가장 높은 구절 강조
  const scales = content.map((l) => l.scale);
  const flat = content.length > 0 && (Math.max(...scales) - Math.min(...scales) < 0.3);
  if (flat) {
    if (content.length === 1) content[0].scale = 1.6;
    else content.forEach((l, i) => { l.scale = i === semanticHeroIndex ? 1.7 : 0.95; });
  } else if (content.length > 1) {
    const largestIndex = content.reduce((best, line, index) => ((line.scale || 1) > (content[best].scale || 1) ? index : best), 0);
    const largestIsLast = largestIndex === content.length - 1;
    const semanticGap = semanticScoreLine(content[semanticHeroIndex].text) - semanticScoreLine(content[largestIndex].text);
    if (largestIsLast && semanticHeroIndex !== largestIndex && semanticGap >= 2) {
      const previousLargest = content[largestIndex].scale || 1;
      content[semanticHeroIndex].scale = Math.max(content[semanticHeroIndex].scale || 1, Math.min(previousLargest, 1.7));
      content[largestIndex].scale = Math.min(previousLargest, 1.05);
    }
  }
  // 출처는 맨 아래
  return [...repairEmphasisFragments(content), ...refLines];
}

// GPT가 만든 lines가 사용자 원문(본문)을 보존하는지 검증. 출처 재포맷은 허용. 아니면 위계 있는 폴백.
function buildSafeLines(verse: string, gptLines: TypoLine[] | undefined): TypoLine[] {
  const original = verse.trim();
  if (Array.isArray(gptLines) && gptLines.length) {
    const joined = gptLines.map((l) => l?.text ?? '').join('');
    if (bodyForCompare(joined) === bodyForCompare(original)) {
      const cleaned = gptLines.map((l) => ({
        text: String(l.text ?? ''),
        scale: Math.max(0.4, Math.min(2.4, Number(l.scale) || 1)),
      }));
      return enforceHierarchy(cleaned); // gpt가 평평하면 보정
    }
  }
  // 폴백: 출처를 분리해 작게, 본문은 구절 단위로 나눠 마지막을 강조
  let body = original;
  let refText = '';
  const startRef = original.match(new RegExp(`^\\s*${BIBLE_REF_ONE.source}`));
  if (startRef) { refText = startRef[0].trim(); body = original.slice(startRef[0].length).trim(); }
  const bodyLines = body ? splitBodyIntoLines(body) : [];
  const out: TypoLine[] = [];
  if (bodyLines.length) {
    const heroIndex = strongestContentIndex(bodyLines.map((text) => ({ text, scale: 1 })));
    bodyLines.forEach((t, i) => out.push({ text: t, scale: i === heroIndex ? 1.7 : 0.95 }));
  } else {
    out.push({ text: original, scale: 1.3 });
  }
  // 출처는 대괄호 제거하고 맨 아래 캡션으로
  if (refText) out.push({ text: formatReference(refText), scale: 0.62 });
  return out;
}

async function gpt(apiKey: string, messages: any[], maxTokens = 500, model = 'gpt-4o-mini'): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  });
  const data = await res.json<any>();
  if (!res.ok) throw new Error(data.error?.message || 'GPT error');
  return data.choices[0].message.content;
}

export const onRequestPost: PagesFunction<ExtendedEnv> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json<any>();
  const { action, prompt, style, ratio, text } = body;

  if (!env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  // ── auto-complete: 말씀 분석 + 템플릿 선택 + 배경 생성 ──
  if (action === 'auto-complete') {
    try {
    const { verse, templateIndex = 0, cachedAnalysis, templateId, regenerate, avoidFontMood, avoidAlign } = body;
    // 재생성 시 변주를 유도하는 힌트 (다양성 규칙)
    const varietyNote = regenerate
      ? `(Regeneration — produce a DISTINCTLY different art direction than before: different line breaks, alignment, scale hierarchy, fontMood, and background composition.${avoidFontMood ? ` Avoid fontMood "${avoidFontMood}".` : ''}${avoidAlign ? ` Prefer a textAlign other than "${avoidAlign}".` : ''})`
      : '';
    const requestedRatio = typeof ratio === 'string' && ratioToSize[ratio] ? ratio : '4:5';
    if (!verse?.trim() && !cachedAnalysis) return Response.json({ error: '말씀을 입력해주세요.' }, { status: 400 });

    // ── 4개 고정 스타일 (템플릿 = 스타일 1개, 다양성은 색상만) ──
    const TEMPLATE_CONFIGS: Record<string, { backgroundPrompt: string; styleLock: string; fonts: { primary: string; secondary: string } }> = {
      // T01 — 귀여운 손글씨 (파스텔 + doodle)
      'T01': {
        backgroundPrompt: 'Cute handwritten scripture card: soft pastel illustration or paper texture with playful childlike hand lettering. Use only a FEW tiny simple doodles (a small flower, leaf, or object) near the edges, crayon/marker/watercolor texture, and lots of calm empty space. Cozy, gentle, sweet, handmade, restrained. NO smiley faces, no cluttered stickers. NOT a brush-calligraphy poster.',
        styleLock: 'T01 = CUTE HANDWRITING (귀여운 손글씨): warm pastel devotional card, handwritten Korean lettering, small doodles, flowers/clouds/simple illustrated scenery, playful but clean. Gentle and cozy. NOT dramatic, NOT dark, NOT photo-realistic, NOT ink-brush calligraphy, NOT bold proclamation, NOT a church poster.',
        fonts: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
      },
      // T02 — 스트릿 워십 포스터 (힙한 Gen-Z 굿즈 감성, AI가 글자까지 그림. 세부 스타일은 아키타입이 결정)
      'T02': {
        backgroundPrompt: 'Hip modern Christian worship graphic poster (like trendy church event / worship-night designs). BOLD CONDENSED Korean display caps as the hero, often layered with a cursive script or hand-drawn accent word, on a grungy textured surface (vintage newsprint collage, riso-print solid color, or a high-contrast grainy duotone photo). Strong film/print grain, orange + black + cream palette energy; smaller supporting lines OF THE GIVEN TEXT may be set as small justified small-caps captions (never invent caption text). Editorial, designed, mature and cool. The exact style/background is specified separately below; follow it.',
        styleLock: 'T02 = HIP WORSHIP POSTER (힙한 감성): bold CONDENSED Korean display type (heavy, tight — NOT rounded bubble) layered with a script/hand-drawn accent, grungy print/collage/duotone-photo texture, orange+black+cream palette, small justified captions built only from the given text lines. Modern worship-design / merch aesthetic — editorial, textured, cool and MATURE. NOT cute, NOT pastel, NOT bubble, NOT vintage propaganda, NOT slanted italic. Korean text only.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      // T03 — 감성 타이포 (감성 사진 + 초대형 히어로 타이포 / 에디토리얼)
      'T03': {
        backgroundPrompt: 'Aesthetic ato-z / Pinterest scripture poster: a soft dreamy blurred FILM photograph (out-of-focus flowers, meadow, petals, soft light, film grain) as an atmospheric backdrop, with the Korean text rendered as a STRONG EDITORIAL TYPOGRAPHY composition on top — like a magazine cover. The photo sits quietly behind; the typography is the hero.',
        styleLock: 'T03 = EMOTIONAL TYPOGRAPHY (감성 타이포): dreamy aesthetic film photo + bold editorial typography. Take ONE key phrase/word and blow it up as a LARGE hero (like the words "joy!" or "Fight" filling much of the width), with the supporting lines set much smaller in an elegant italic/serif above or around it, plus a small stylized reference credit when the user actually typed a reference. Strong magazine-cover hierarchy and intentional mixed scale. The blurred photo stays soft and low-contrast behind the type. Refined, editorial, poster-quality — never a plain caption laid flat on a photo.',
        fonts: { primary: 'Hahmlet', secondary: 'SeoulHangang' },
      },
      // T04 — 감성 심플 (감성 사진 + 심플·깔끔 텍스트)
      'T04': {
        backgroundPrompt: 'A beautiful, calm aesthetic PHOTOGRAPH chosen from the verse meaning — e.g. a warm pastel sunset over the sea, misty snow mountains, a starry night sky over a mountain ridge, a quiet green forest, soft clouds, a still lake. Keep a large calm low-contrast negative-space area (usually the sky / upper-center) where simple centered text can sit and stay perfectly legible. Soft natural light, gentle film tone, restrained contrast. No text, no letters — background photo only.',
        styleLock: 'T04 = AESTHETIC SIMPLE (감성 심플): a lovely quiet photo where the SCENE is the mood and the text is placed very simply and cleanly — calm, centered, evenly-sized, quietly readable, generous breathing room (like devotional wallpaper). The typography stays understated and elegant; the photo carries the emotion. Never loud, never busy, never a big typographic headline.',
        fonts: { primary: 'PaperLight', secondary: 'SeoulHangang' },
      },
    };


    const GLOBAL_BG_PROMPT = '\n\nCreate a premium Christian typography card background. No text. No letters. No words. No typography. No logos. Large negative space for text overlay. Editorial design quality. Modern premium aesthetic. Clean composition. Soft cinematic lighting. High-end card design. Subtle texture. Text-safe layout. Important visual elements should not occupy the center typography area. Background only.';
    const GLOBAL_BG_PROMPT_T02 = '\n\nCreate a HIP modern worship poster BACKGROUND. No text. No letters. No words. No typography. No logos. Choose one: (a) a gritty vintage newspaper/magazine collage with halftone dots and a torn orange paint-swash, (b) a flat vintage-riso solid field (burnt orange, warm cream, muted sage, or deep teal) with heavy paper grain, fold lines and print noise, or (c) a high-contrast grainy duotone photo (mountains, pine forest, lake) under a film-grain overlay. Palette energy: orange + black + cream. Keep the entire CENTER large and low-contrast for text overlay; push texture and torn/collage edges toward the borders. NOT cute: no bubble shapes, no pastel candy colors, no hearts, no flowers, no smiley faces, no doodle stickers. Background only.';

    let analysis: AutoCardAnalysis;
    // 재생성일 땐 캐시를 무시하고 새로 분석해 매번 다른 아트디렉션을 만든다
    if (cachedAnalysis?.templates?.length && !regenerate) {
      analysis = cachedAnalysis;
    } else {
      const raw = await gpt(env.OPENAI_API_KEY, [
        {
          role: 'system',
          content: `You are an art director for "Daily Grace" faith cards. Work in this order: (1) analyze the message meaning, (2) detect any Bible reference, (3) decide the typography hierarchy, (4) plan the layout, (5) describe a background that ADAPTS to that typography and message. Typography and meaning drive the design; the background adapts to the text layout, never the other way around. The card's HERO is the user's text as poster typography. Return JSON only:
{"lines":[{"text":"","scale":1}],"textAlign":"center","useBrush":false,"mood":"","templates":["T01","T03","T04"],"backgroundConcept":"","visualMotifs":[""],"palette":"","lighting":"","composition":"","typographyTone":"","fontMood":"bold","avoidImagery":[""]}

ABSOLUTE TEXT RULE — rearrange the presentation freely, never modify the words:
- BEFORE describing the background, plan the typography: identify key phrases, the dominant idea, and supporting text, then build the hierarchy and layout.
- You MAY freely redesign line breaks, grouping, emphasis, per-line size, hierarchy, alignment, positioning, and composition to maximize impact and readability. Rearranging the PRESENTATION is encouraged.
- You may NOT change, summarize, paraphrase, translate, shorten, reorder, add, or remove any word. The words and their reading order stay identical.
- "lines" MUST reproduce the user's input EXACTLY in order. Concatenating every line's "text" (ignoring spaces) must equal the user's input (ignoring spaces). If unsure, put the whole input as one line.
- Do NOT add a Bible reference or any text the user did not type.
- BIBLE REFERENCE EXCEPTION: a Bible reference in ANY language or format (Korean OR English) is metadata, not the message — e.g. [고후5:17], (시23:1), 마 5:14, 요3:16, [Mk 13:13, KJV], John 3:16, Psalm 126:5, 1 Cor 5:17. It is the ONLY text you may reformat for visual quality. ALWAYS pull it OUT of the body into its OWN separate LAST line at the bottom, remove the surrounding brackets, and DROP any translation tag (KJV/NIV/ESV/개역개정 등): "[고후5:17]"→"고후 5:17", "[Mk 13:13, KJV]"→"Mk 13:13", "John 3:16"→"John 3:16". Give that reference line a small scale 0.25–0.50. NEVER leave the reference merged with the body, NEVER place it at the top, NEVER let it be the hero or headline. This applies even when the reference appears at the START of the input — move it to the end as a small caption.

TYPOGRAPHY (lines + scale) — text is the hero, make it feel designed, not merely placed:
- THE INPUT IS ARBITRARY: it may be a Bible verse, a worship-song lyric, a prayer, a gratitude note, a diary line, or any free message in Korean. These rules are GENERAL and apply to every input type — do not assume it is always scripture. Read THIS specific text and find its own meaning.
- EMPHASIS MUST COME FROM MEANING, NOT POSITION: do NOT automatically emphasize the final phrase. First identify the semantic/emotional core of THIS text — its main subject, its main action/command/promise, or its emotional peak (whatever the text is about). Emphasize the phrase carrying that core, even if it sits at the beginning or middle.
- Before choosing the largest line, ask: "If the reader could remember only ONE phrase from this exact text, which phrase carries it?" That phrase becomes the dominant line. The final line should be largest ONLY when it truly carries the core.
- LINE BREAKS ARE GRAMMATICAL (works for any Korean text): break at natural clause/phrase endings — connective/terminal endings such as ~요/~라/~니/~고/~며/~서/~데/~은/~는/~을 and particles — so every line reads as a coherent unit. This generalizes to lyrics, prayers, and any sentence, not only verses.
- Avoid the lazy pattern "supporting lines + huge final line." Vary emphasis across beginning/middle/end depending on the verse.
- NEVER emphasize broken connector fragments. Do not make phrases like "말라 그리하면", "그리하면 어디로", "그러므로/그리하면/그리고/그러나" large. Emphasis must be a complete meaningful command/promise/image. For Joshua 1 style text, keep "우로나 좌로나 치우치지 말라" together as a meaning unit, or emphasize "기록된 대로 다 지켜 행하라" / "치우치지 말라" / "형통하리라", not the connector words.
- LINE GROUPING BY MEANING (all templates): break lines at natural Korean clause/phrase boundaries (절·구 단위). NEVER merge the end of one clause with the start of the next clause into a single line, and especially never into the emphasized line. Each line — above all the emphasized one — must read as one coherent meaning unit on its own.
- KEEP COORDINATED PAIRS TOGETHER: never break a line right after a connective particle 와/과/및/이나/랑/하고. Items joined by these belong on the same line as one unit — e.g. "하나님과 사람에게" must stay together (never "…하나님과" on one line and "사람에게…" on the next). The same applies to a noun and its trailing particle/postposition.
- Example — "예수는 지혜와 키가 자라가며 하나님과 사람에게 더욱 사랑스러워 가시더라 [눅2:52]": group as "예수는 지혜와 키가"(1.0) / "자라가며"(0.9) / "하나님과 사람에게"(1.0) / "더욱 사랑스러워 가시더라"(1.6, emphasized) / "눅 2:52"(0.4). WRONG would be "자라가며 하나님과" on one line, orphaning "하나님과" from "사람에게".
- Worked example — "또 내게 말씀하시되 이루었도다 나는 알파와 오메가요 처음과 마지막이라 내가 생명수 샘물을 목마른 자에게 값없이 주리니 [계21:6]": group as "또 내게 말씀하시되"(0.9) / "이루었도다"(1.0) / "나는 알파와 오메가요"(1.0) / "처음과 마지막이라"(1.0) / "내가 생명수 샘물을"(1.7, emphasized — the core promise) / "목마른 자에게"(0.95) / "값없이 주리니"(1.4) / "계 21:6"(0.4). WRONG would be joining "마지막이라 내가 생명수" on one line or emphasizing that cross-clause fragment.
- Split the input into poster-style lines. Encourage dramatic line breaks, oversized keywords, asymmetric hierarchy, dynamic spacing, large negative space. Avoid centering everything, identical sizing, tiny text, or decorative typography without purpose.
- "scale" is each line's relative size: dominant headline ≈ 1.7–2.3, key phrase ≈ 1.4–1.7, normal/connective ≈ 0.85–1.0, Bible reference / caption ≈ 0.25–0.50.
- THINK IN VISUAL BLOCKS, NOT SENTENCES: do not just split text at sentence boundaries or wrap it. A dominant phrase may span multiple lines; a single important word may become its own line. Typography should feel designed, with rhythm and emphasis.
- INTERNAL HIERARCHY: even within one phrase, separate key words / dominant concepts from supporting words and size them differently. Typography should communicate meaning, not merely display text.
- MANDATORY HIERARCHY — never output all lines at the same scale: every card MUST have clear size contrast. Pick the 1–2 most meaningful phrases and make them clearly the largest; shrink connective/intro words and any reference. If you find yourself giving everything ~1.0, you are wrong — choose what matters most and enlarge it.
- THE ENLARGED (hero) PHRASE MUST BE A COMPLETE, MEANINGFUL UNIT — never a grammatically incomplete fragment. NEVER enlarge auxiliary/incomplete fragments like "할 수", "내가", "그 때에", a bare particle, or a verb stem cut from its ending.
- ATTRIBUTION / INTRO PHRASES ARE NOT THE MESSAGE — keep them SMALL (≈0.7). Speaker-attribution and quote-openers such as "예수께서 이르시되", "또 이르시되", "하나님이 이르시되", "여호와께서 말씀하시되", "이르시되", "가라사대", "말씀하시기를" merely introduce the quote. NEVER enlarge them; the emphasis belongs to the actual message that follows. Do NOT make the FIRST line biggest just because it is first.
- Worked example — "예수께서 이르시되 할 수 있거든이 무슨 말이나 믿는 자에게는 능히 하지 못할 일이 없느니라 하시니": group as "예수께서 이르시되"(0.7, small intro) / "할 수 있거든이 무슨 말이나"(0.9) / "믿는 자에게는"(1.0) / "능히 하지 못할 일이 없느니라"(1.7, the hero — the promise) / "하시니"(0.75). WRONG would be enlarging "예수께서" or "할 수", or merging "이르시되 할 수" on one line.
- Length adapts but hierarchy is ALWAYS required:
  · SHORT → one giant hero line.
  · MEDIUM → 1–2 big key lines, supporting lines smaller.
  · LONG → still enlarge the 1–2 most important phrases (≈1.5–1.9), keep connective lines smaller (≈0.85), and put any reference at ≈0.45. Break the text into meaningful phrase-groups, not even paragraph blocks.
- A Bible reference is METADATA (a caption/signature), never the main message — keep it visible at ≈0.58–0.72 like a poster credit, and never let it disappear or compete with the message.
- Example for a long verse "[고후5:17] 그런즉 누구든지 그리스도 안에 있으면 새로운 피조물이라 이전 것은 지나갔으니 보라 새 것이 되었도다": "그런즉 누구든지 그리스도 안에 있으면" scale 0.9, "새로운 피조물이라" scale 1.8, "이전 것은 지나갔으니" scale 0.9, "보라 새 것이 되었도다" scale 1.8, then the reference LAST as "고후 5:17" scale 0.45 (brackets removed, words otherwise unchanged, only grouped and resized).
- "textAlign": "left" for bold/declarative/asymmetric feel, "center" for calm/gentle verses.
- "useBrush": true selectively for short text with strong declaration/conviction/proclamation energy (e.g. 강하고 담대하라 / 나는 주님의 군대! / 두려워 말라). false for meditative or peaceful text. Use sparingly, not every time.

VARIETY (important): Do NOT default to one composition. For similar messages, vary the line breaks, alignment, scale relationships, hierarchy, font mood, and background structure so each card feels intentionally art-directed and distinct.

SCENE PRINCIPLE — VISUALIZE THE MEANING, NOT THE RELIGION:
- Do NOT visualize "Christianity". Visualize what THIS specific message means. Do not ask "what does Christianity look like?" — ask "what does this exact sentence mean?". The backgroundConcept must emerge from the user's message itself.
- MEANING BEFORE MOOD: first identify the symbols, imagery, metaphors, locations, actions, themes and emotional direction in the text; only then choose the scene. Do not reduce every message to generic positive emotions/atmosphere.
- SYMBOL PRESERVATION: when meaningful imagery exists in the text, preserve it and let strong symbols drive the scene — interpreted literally, symbolically, environmentally, or emotionally. Goal: meaningful visual translation, not literal illustration.
- FRESH INTERPRETATION: many valid images exist for one message — do not chase a single "correct" image; pick a fresh, specific interpretation and avoid reusing the same metaphor for similar messages.
- AVOID GENERIC CHRISTIAN DEFAULTS: never auto-default to flowers, butterflies, rivers, beaches, sunsets, mountains, clouds, or abstract sunlight unless they are genuinely connected to this message. These must NOT be your fallback solution.
- AVOID SIMPLISTIC SYMBOL SUBSTITUTION: do not replace a concept with the first obvious symbol (weak: renewal→butterfly, hope→sunrise, peace→flowers, faith→mountain). Prefer richer storytelling — environments, transitions, atmosphere, journeys, transformations, meaningful scenes — over obvious symbolic objects.
- The template only sets visual style / composition / atmosphere / lighting / rendering — it does NOT decide the scene. The same message may look different across templates while preserving its core meaning.

T03 EMOTIONAL SERIF ART DIRECTION:
- For T03, the backgroundConcept must be more than a mood. It must name a concrete visual scene tied to the verse's imagery or action.
- Preserve all user-entered words in "lines"; do not shorten a long verse to make the design prettier. Solve long text through smaller elegant typography, hierarchy, and negative space.
- Use editorial reference energy: quiet film photograph, muted blue/green/ivory, refined yellow or ivory text later, one symbolic subject, lots of breathing room.
- If the text mentions waters/rivers/overwhelm → choose sea, ocean, river, boat, sail, or deep teal water. If it mentions help/mountains/lifting eyes → mountains, forest, alpine distance, or a small cabin. If it mentions prayer/calling → open sky, cloud, branch, window light, or quiet room edge. If it mentions time/waiting → framed landscape, horizon, train/window, field in late light. If it mentions strength/stand/restoration → steady hill, grounded rock, calm horizon, or wind-softened field. If no concrete symbol exists, derive a subtle visual metaphor from the main verb.
- If the text mentions lips/mouth/voice/singing/praise/proclaim/preach/spread/send/go ("입술", "입", "찬송", "전파", "선포", "복음", "보내소서", "가라") → show a directional metaphor: wind moving through tall grass, a path or ridge leading outward, sound-like ripples in clouds/water, distant open valley, birds or small sails moving away, or light spreading across layered hills. The scene should imply a voice/message going outward, not merely a pretty sky.
- If the text mentions thanks/offering/sacrifice/vow/fulfillment ("감사", "제사", "드리", "서원", "갚으", "헌신", "예배") → do NOT default to sunset or generic landscape. Prefer a quiet offering/thanksgiving visual: hands placing a flower or note, a candle on a simple table, folded linen, bread/cup, an open window with morning light, a small still-life of devotion, or a humble altar-like table without church clichés. The scene should feel like giving thanks or fulfilling a vow.
- For declarative/proclamation verses inside T03, prefer stronger editorial hierarchy: one large decisive phrase, tighter grouping, slight asymmetry, and a more intentional poster layout. It can still be elegant, but not timid.
- T03 typography should feel like an emotional poster: cohesive serif typography, a clear but controlled hierarchy, a visible Bible-reference credit only when the input itself contains a reference, tasteful accent color when useful, and generous negative space. Do not always make one huge headline; sometimes use a smaller quiet block, asymmetric magazine layout, vertical reference, or medium stacked scripture layout. Do not mix a gothic/sans headline with a serif hero; use family cohesion and vary weight/scale instead.
- For T03, SMALLER IS MORE PREMIUM. Avoid huge Korean type. Favor refined poster typography that occupies roughly one quarter of the card, with large breathing room. A single word should almost never fill the width.
- For T03, vary the serif feeling across generations: thin literary serif, classic book myeongjo, modern magazine serif, soft calligraphic serif, restrained display serif, or old-book serif. Do not repeat the same heavy Korean serif every time.
- T03 must NOT use decorative divider lines, horizontal rules, stars, leaf ornaments, floral separators, quote marks, frames, or faux logo marks around the text. Those make the image feel like an AI template. Let the poster feel designed through typography, photo, color, and spacing only.
- Avoid generic flower/meadow/sky fallback unless it is specifically connected to the verse. The image should feel personally chosen for the words.

T01 CUTE HANDWRITING ART DIRECTION:
- T01 is not brush calligraphy. It is a cute pastel handwritten devotional card.
- Use broad hand-drawn illustration language: paper grain, crayon, marker, watercolor, memo paper, tape scraps, sticker shapes, pastel blocks, tiny objects, simple maps/signposts, cups/books/lamps/windows, hills/paths only when meaningful.
- Lettering should feel like a handmade note and MUST vary across generations: thick rounded marker, chunky crayon, sticker-like block letters, bubbly doodle letters, felt-tip poster letters, watercolor brush handwriting, or mixed cute lettering. Avoid making every font thin. Never use powerful ink strokes.
- Vary the design heavily across generations: blue speckled paper, pink border, yellow path illustration, cream marker note, big crayon shape, mint object scene, notebook memo, chunky cute word card, sticker collage, cozy desk doodle.
- Keep text modest and friendly, not huge. Lots of empty space is part of the style.
- A cute accent may be used ONLY on the single key word (a soft highlight or underline), sparingly and intentionally — never on ordinary words, never on every line, no smiley faces. For verses about paths/ways/turning, a small path, signpost, or road motif may fit.

- mood: one of 담대함/선포/믿음/승리/소망/회복/빛/예배/평안/은혜/쉼/QT/감사/일상/묵상/기도/고요함
- templates: exactly 3 IDs from T01,T02,T03,T04 best matching the message:
  · T01 = 귀여운 손글씨 (pastel doodle handwriting) → 따뜻함/일상/감사/부드러운 묵상
  · T02 = 힙한 포스터 (bold condensed caps + script overlay on grungy print texture) → strong, punchy, declarative, energetic messages
  · T03 = 감성 세리프 (elegant serif over soft film photo or muted flat color) → 묵상/평안/은혜/소망/예배/reflection
  · T04 = 미니멀 (clean, lots of space) → 쉼/고요/short quiet phrases
- fontMood: one of bold/editorial/lyrical/quiet/handwritten/modern (best emotional tone of the text)
- backgroundConcept: one sentence (English). The background may be symbolic, direct, abstract, or narrative depending on the message. Fresh editorial storytelling — avoid generic Christian poster clichés (no soldier+shield+flag, no cross+sunrise, no busy fantasy battle, no stock church graphics) and avoid repeating the same motif. Keep large typography-safe negative space. Goal: emotional/visual resonance, not literal illustration.
- visualMotifs: 3-5 subtle concrete motifs (English) from the meaning, varied across generations
- palette / lighting / composition / typographyTone: short English direction strings; composition must leave clear, calm, low-contrast space exactly where the typography will sit (match your chosen textAlign) and push focal interest away from the text
- avoidImagery: cliché visuals to avoid (crosses, church buildings, Bibles, doves, hands) unless explicitly in the user's text`,
        },
        { role: 'user', content: verse.trim() + (varietyNote ? `\n\n${varietyNote}` : '') },
      ], 900, 'gpt-4o');
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        return Response.json({ error: '말씀 분석에 실패했습니다.' }, { status: 500 });
      }
    }

    // 원문 보존 검증 후 안전한 lines 확정 (캐시된 분석엔 verse가 없을 수 있어 lines 그대로 사용)
    const safeLines = verse?.trim()
      ? buildSafeLines(verse, analysis.lines)
      : (Array.isArray(analysis.lines) && analysis.lines.length ? analysis.lines : []);

    const templates = analysis.templates?.length ? analysis.templates : ['T01', 'T03', 'T04'];
    const selectedTemplate = templateId || templates[templateIndex % templates.length];
    const config = TEMPLATE_CONFIGS[selectedTemplate] || TEMPLATE_CONFIGS['T01'];

    // T02(힙)는 사이즈 대비를 살리되(히어로 크게), 인용 도입부/출처만 작게 눌러 위치 편향만 교정.
    if (selectedTemplate === 'T02') {
      const INTRO_RE = /(이르시되|말씀하시되|말씀하시기를|가라사대|불러|대답하여|이르되)\s*$/;
      safeLines.forEach((l) => {
        if (isRefLine(l.text) || (l.scale || 1) <= 0.55) {
          l.scale = Math.min(l.scale || 0.5, 0.5);
        } else if (INTRO_RE.test(l.text.trim())) {
          l.scale = 0.7; // 인용 도입부는 항상 작게
        }
        // 그 외 본문 줄은 gpt-4o가 준 위계(히어로 대비) 유지
      });
    }
    const fontMood = analysis.fontMood || 'editorial';
    const fontMoodOffset: Record<string, number> = {
      editorial: 0,
      lyrical: 1,
      quiet: 2,
      handwritten: 3,
      modern: 4,
      bold: 5,
    };
    const fontPresetsByTemplate: Record<string, { primary: string; secondary: string }[]> = {
      T03: [
        { primary: 'Hahmlet', secondary: 'Hahmlet' },
        { primary: 'GowunBatang', secondary: 'GowunBatang' },
        { primary: 'NanumMyeongjo', secondary: 'NanumMyeongjo' },
        { primary: 'SongMyung', secondary: 'GowunBatang' },
        { primary: 'SerifKR', secondary: 'SerifKR' },
        { primary: 'RidiBatang', secondary: 'RidiBatang' },
      ],
      T04: [
        { primary: 'RidiBatang', secondary: 'RidiBatang' },
        { primary: 'GowunBatang', secondary: 'GowunBatang' },
        { primary: 'Hahmlet', secondary: 'Hahmlet' },
      ],
      T02: [
        { primary: 'Taenada', secondary: 'PaperBlack' },
        { primary: 'PaperBlack', secondary: 'PaperBlack' },
        { primary: 'GangwonTunTun', secondary: 'PaperBlack' },
      ],
    };
    const fontPresets = fontPresetsByTemplate[selectedTemplate];
    const selectedFonts = fontPresets?.length
      ? fontPresets[(Math.abs(templateIndex) + (fontMoodOffset[fontMood] ?? 0)) % fontPresets.length]
      : config.fonts;
    const templateVariations: Record<string, string[]> = {
      // T01 귀여운 손글씨 — 파스텔 낙서/수채화/크레용
      T01: [
        'Pastel blue paper card with tiny speckles and white/cream Korean handwritten lettering; use only a few tiny doodles.',
        'Soft pink illustrated border card with hand-drawn leaves/berries/daisies around the edges and a clean center.',
        'Warm butter-yellow childlike landscape card with a simple hill, path, cloud, sun, or tiny object related to the verse.',
        'Cream paper marker-note card with a couple of small tasteful marker accents (underline or circle) only on a key word.',
        'Off-white card with one large soft crayon blob, sticker shape, or hand-painted letter-shape behind the text.',
        'Light mint/sky-blue simple scene card with a tiny bike, path, window, table, cup, candle, book, or map motif related to the verse.',
        'Minimal notebook/memo card: warm paper, tape scraps, tiny check marks, pencil dots, and compact handwritten note typography.',
        'Playful chunky word card: mostly blank cream background, bold rounded key words, a soft pastel highlight behind ONE key word.',
        'Cute object card: one simple illustrated object such as a mug, loaf, lamp, envelope, small house, umbrella, or backpack, chosen from the verse meaning.',
        'Soft geometric doodle card: pastel blocks, rounded rectangles, sticker-like shapes, one or two tiny simple shapes only, no smileys.',
      ],
      // T02 힙한 포스터 — 볼드 콘덴스드 + 스크립트 오버레이 + 그런지 (오렌지·블랙·크림)
      T02: [
        'Vintage newsprint collage with halftone dots and a torn orange paint-swash; huge black bold condensed Korean caps mixing sizes; thin justified small-caps caption lines top and bottom.',
        'Flat burnt-orange riso field with heavy paper grain and fold lines; huge black bold condensed Korean caps with a cream cursive script accent word crossing them.',
        'High-contrast grainy duotone mountain photo; big cream bold condensed Korean caps layered with a flowing script accent and a small justified small-caps caption.',
        'Warm cream riso paper with print noise; huge black bold condensed Korean caps and a dark brown hand-drawn brush word with a loose scribbled oval stroke over part of the type.',
        'Torn-paper newsprint collage with a bold red paint-swash; cream bold condensed Korean caps in mixed sizes; connector dashes between small caption words.',
        'Muted sage-green riso field with grain; huge cream bold condensed Korean caps and a dark script overlay word; small justified caption near the bottom.',
        'Grainy duotone pine-forest photo in cream and orange; big cream bold condensed Korean caps with a script accent and a small vertical reference caption.',
        'Deep teal riso field with a small high-contrast photo cutout at the bottom; huge cream bold condensed Korean caps with a black script accent beneath.',
      ],
      // T03 감성 세리프 — 잔잔한 필름 사진 위주 + 무광 플랫 몇 개
      T03: [
        'T03 POSTER ARCHETYPE A — object photo poster: one verse-linked object or gesture (hands, flower, open window, sail, branch, fabric, candlelight, path detail) with a bold flat color field such as dusty blue, deep green, ivory, or muted yellow. Strong graphic poster feeling, not a generic landscape.',
        'T03 POSTER ARCHETYPE B — grass/field graphic poster: close or overhead view of grass, meadow texture, hill shadow, or one tiny symbolic subject in a large green field. Use punchy yellow/ivory serif typography. Avoid sunrise and generic scenic horizon.',
        'T03 POSTER ARCHETYPE C — sky/cloud poster: large blue sky or dramatic but clean cloud shape tied to the verse, halftone/film grain texture, compact typography placed inside the clean sky. Avoid decorative dividers.',
        'T03 POSTER ARCHETYPE D — color-and-flower/object poster: single flower, branch, cup, book edge, or small still-life subject against a saturated muted color background. More graphic and poster-like than cinematic.',
        'T03 POSTER ARCHETYPE E — minimal solid-color scripture poster: mostly flat muted blue/green/cream background with paper grain and very simple serif typography; maybe one small symbolic mark from the verse, but no ornamental lines.',
        'T03 POSTER ARCHETYPE F — cinematic landscape poster: only when the verse truly calls for landscape. Use a distinctive water, mountain, road, or horizon scene with small-to-medium typography and strong negative space; avoid repeating the same foggy forest/sunrise formula.',
      ],
      // T04 감성 심플 — 여백 큰 감성 사진 (텍스트는 심플 오버레이)
      T04: [
        'Warm pastel SUNSET over a calm sea, soft orange/peach sky filling the upper two-thirds with a large calm area for text, gentle reflection below. Dreamy and quiet.',
        'MISTY SNOW MOUNTAINS under a soft pale-grey sky, lots of calm foggy negative space in the upper-center for text, muted desaturated film tone.',
        'STARRY NIGHT SKY / milky way over a dark mountain ridge at the bottom, deep calm blue with a clean starfield area for text. Serene, not busy.',
        'Quiet green FOREST / pine hillside with a soft pale sky above, calm low-contrast upper area for text, gentle natural light, muted film tone.',
        'Soft pastel CLOUDS / open sky, dreamy gradient, large clean area for centered text, airy and peaceful.',
        'Still LAKE or calm water at soft dawn, gentle mist, muted reflective tones, wide calm band for text.',
      ],
    };
    const variations = templateVariations[selectedTemplate] || templateVariations.T02;
    const variationIndex = Math.abs(templateIndex) % variations.length;
    const variation = variations[variationIndex];
    const t01DesignArchetypes = [
      'T01 DESIGN A — blue paper poem card: dusty sky-blue paper texture, tiny speckles, white or cream small handwritten Korean text centered with lots of empty space; almost no illustration.',
      'T01 DESIGN B — pink illustrated border card: blush-pink background, hand-drawn leaves/berries/daisies around the edges, small centered Korean diary handwriting in the open middle.',
      'T01 DESIGN C — yellow path card: butter-yellow sky, soft hill/path/sun/cloud if meaning fits, cheerful but sparse, handwritten text floating in the sky.',
      'T01 DESIGN D — marker doodle note: warm cream paper, playful marker handwriting, a couple of tiny marker accents only on a key word.',
      'T01 DESIGN E — big crayon shape card: off-white background with one large soft pastel blob, sticker, or painted letter-shape; handwritten Korean text placed inside or beside it.',
      'T01 DESIGN F — tiny object scene card: mint or pale blue paper with one simple object from the verse meaning (bike/path/window/book/cup/candle/map/signpost), casual handwriting.',
      'T01 DESIGN G — notebook memo card: warm paper, tape scraps, pencil dots, a couple of small margin doodles, compact handwritten note typography, no flower/cloud default.',
      'T01 DESIGN H — chunky cute word card: mostly blank cream background, thick rounded hand-lettered key words, a soft pastel highlight behind ONE key word only.',
      'T01 DESIGN I — sticker collage card: a few simple sticker-like shapes, small label, soft blocks of color, and playful hand lettering; avoid floral border.',
      'T01 DESIGN J — cozy desk doodle card: tiny illustrated mug, lamp, open book, envelope, or candle in a corner with handwritten note text; calm and cute.',
    ];
    const t01TypographyStyles = [
      'FONT A: thick rounded Korean marker lettering, friendly and bold, medium-large strokes; not thin',
      'FONT B: chunky childlike crayon lettering with wax texture and uneven pressure; thick and playful',
      'FONT C: bold sticker-like Korean block handwriting, rounded corners, wide letter spacing, colorful key words',
      'FONT D: small diary pen handwriting, narrow and compact, used only for quiet memo-style cards',
      'FONT E: big bubbly doodle lettering for key words, smaller handwritten supporting text; intentionally uneven and cute',
      'FONT F: soft watercolor brush handwriting with thicker pooled edges, not too thin, gentle and organic',
      'FONT G: felt-tip pen note lettering, dark gray or navy, casual but weighty, like a handwritten classroom poster',
      'FONT H: pastel highlighter lettering with thick hand-drawn strokes and simple colored accents',
      'FONT I: pencil handwriting with slightly heavy sketch lines, imperfect but readable, not pale or too thin',
      'FONT J: mixed cute lettering: one chunky word, one small note line, and one colored accent line (all taken from the given text only)',
    ];
    const t01Layout = selectedTemplate === 'T01'
      ? t01DesignArchetypes[Math.abs(templateIndex) % t01DesignArchetypes.length]
      : '';
    const t01TypographyStyle = selectedTemplate === 'T01'
      ? t01TypographyStyles[Math.abs(templateIndex) % t01TypographyStyles.length]
      : '';
    const t03TypographyLayouts = [
      'T03 TYPOGRAPHY VARIANT A: CENTERED MAGAZINE COVER. Horizontally CENTERED text block in the vertical middle. The hero phrase is large and centered; small supporting lines sit centered directly above it; the small reference sits centered just below. Everything symmetrical and centered.',
      'T03 TYPOGRAPHY VARIANT B: CENTERED UPPER-THIRD. Horizontally CENTERED block placed in the upper third, hero phrase large and centered, supporting lines centered above, background subject lower. Never pushed to a side.',
      'T03 TYPOGRAPHY VARIANT C: CENTERED LOWER-THIRD. Horizontally CENTERED block placed in the lower third over a calm area, hero phrase large and centered, small supporting lines centered above, reference centered below.',
      'T03 TYPOGRAPHY VARIANT D: CENTERED STACKED HERO. Horizontally CENTERED. Stack the hero phrase across one or two centered lines as the dominant focal type, with the remaining lines much smaller and centered. Strong size contrast, fully centered column.',
      'T03 TYPOGRAPHY VARIANT E: CENTERED BIG WORDMARK. Horizontally CENTERED. One meaningful key phrase becomes a big centered wordmark in the middle, the other lines small and centered around it. Magazine-cover feeling, centered.',
      'T03 TYPOGRAPHY VARIANT F: CENTERED CLASSIC POSTER. Horizontally CENTERED, calm symmetrical hierarchy — hero phrase large in the center, supporting lines and reference centered. Timeless centered scripture poster.',
    ];
    const t03TypographyLayout = selectedTemplate === 'T03'
      ? t03TypographyLayouts[Math.abs(templateIndex) % t03TypographyLayouts.length]
      : '';
    const t03FontStyles = [
      'DISTINCT FONT STYLE A: very thin literary Korean serif with long elegant strokes, airy tracking, quiet book-poetry feeling',
      'DISTINCT FONT STYLE B: classic printed-book Korean myeongjo serif, modest contrast, compact leading, calm devotional tone',
      'DISTINCT FONT STYLE C: modern narrow editorial Korean serif, magazine-caption feeling, crisp and restrained',
      'DISTINCT FONT STYLE D: soft calligraphic Korean serif with gentle brush influence, organic stroke endings, still clean and readable',
      'DISTINCT FONT STYLE E: refined fashion-display Korean serif used sparingly, high contrast, paired with tiny understated serif captions',
      'DISTINCT FONT STYLE F: minimal old-book Korean serif, small scale, slightly aged ink texture, calm tracking, no flourishes',
    ];
    const t03FontStyle = selectedTemplate === 'T03'
      ? t03FontStyles[Math.abs(templateIndex) % t03FontStyles.length]
      : '';
    // T02 힙한 포스터 아키타입 — A(뉴스페이퍼 콜라주)/B(빈티지 리소 단색)/C(그런지 사진 레이어드).
    // 순서를 [A,B,C,A,B,C]로 배치해 templateIndex % 6 이 어떤 값이든 세 그런지 감성이 균등하게 나오게 함.
    const t02Archetypes = [
      // A1 — 뉴스페이퍼 콜라주 (GOD IS MORE THAN ABLE)
      'STYLE A — NEWSPAPER COLLAGE POSTER (hip modern worship graphic): BACKGROUND is a gritty COLLAGE of vintage newspaper/magazine scraps with halftone dots and a bold ORANGE torn paint-swash behind the type. Render the message in HUGE black BOLD CONDENSED Korean caps (heavy, tight, filling the frame), MIXING sizes for hierarchy (one word huge, others smaller). If (and only if) the given text has smaller supporting lines, set THOSE lines as thin JUSTIFIED small-caps Korean captions near the top/bottom with little dash/connector lines between the words; otherwise use bare dash/rule marks with NO words. Never write a caption the user did not type. High-contrast, grainy, editorial. Palette: black + orange + cream. Cool and edgy, NOT cute. Korean text only, absolutely NO English/Latin words.',
      // B1 — 빈티지 리소 단색 (SALT COMPANY)
      'STYLE B — VINTAGE RISO POSTER (hip, like a college worship night flyer): BACKGROUND is a FLAT textured vintage-riso solid color (muted sage green, burnt orange, or warm cream) with heavy paper grain, fold lines, and print noise. Render the message in HUGE slightly-WONKY hand-made bold cream Korean letters filling most of the frame — hand-cut and angular, NOT rounded bubble letters — then overlay a contrasting brown/dark HAND-DRAWN brush word (taken from the given text) plus a loose scribbled oval/halo stroke over part of the type. Any small handwritten line near the top or bottom must be one of the given supporting lines — if there is none, leave that area empty. Warm, worn, characterful, cool — NOT cute. Korean text only, NO English/Latin.',
      // C1 — 그런지 사진 레이어드 (FAITH CAN MOVE MOUNTAINS)
      'STYLE C — GRUNGY PHOTO POSTER (hip, layered): BACKGROUND is a high-contrast GRAINY duotone photo (mountain range, pine forest, or lake) with a film-grain overlay. Render the message in big cream BOLD CONDENSED Korean caps, layered with a flowing cursive SCRIPT Korean accent word crossing over them, plus a thin JUSTIFIED small-caps Korean caption made ONLY from the supporting lines of the given text (omit the caption entirely if there are none, and draw a reference only if one was given). Palette: cream + orange accent over a moody photo, grain. Cinematic, bold, cool — NOT cute. Korean text only, NO English/Latin.',
      // A2 — 콜라주 (다른 색)
      'STYLE A — NEWSPAPER COLLAGE POSTER (variant): BACKGROUND is a torn-paper/newsprint COLLAGE with halftone and a bold red or blue paint-swash. HUGE black or cream BOLD CONDENSED Korean caps mixing sizes; use the given supporting lines (if any) as justified small-caps captions top/bottom with connector dashes — never invented words. Gritty, editorial, cool — NOT cute. Korean only, NO English/Latin.',
      // B2 — 리소 단색 (WAIT ON THE LORD, 오렌지 필드 + 사진 컷)
      'STYLE B — BOLD RISO FIELD POSTER (variant, like WAIT ON THE LORD): BACKGROUND is a FLAT bold ORANGE (or deep teal) riso field with grain, optionally a small high-contrast mountain/photo cutout at the bottom. HUGE black BOLD CONDENSED Korean caps as the hero with a white cursive SCRIPT accent word beneath, plus a thin justified small-caps Korean caption drawn ONLY from the given supporting lines (and a reference only if one was given). Punchy, retro-modern, cool — NOT cute. Korean only, NO English/Latin.',
      // C2 — 그런지 사진 (다른 톤)
      'STYLE C — GRUNGY PHOTO POSTER (variant): BACKGROUND is a moody grainy duotone photo (misty mountains, dark forest, ocean) in cream+orange or blue tones. Big cream BOLD CONDENSED Korean caps layered with a cursive SCRIPT Korean accent word, a justified small-caps Korean caption taken only from the given supporting lines (omit it if there are none), film grain. Cinematic, layered, cool — NOT cute. Korean only, NO English/Latin.',
    ];
    const t02Archetype = selectedTemplate === 'T02'
      ? t02Archetypes[Math.abs(templateIndex) % t02Archetypes.length]
      : '';
    const moodHint = analysis.mood ? `Mood cue: ${analysis.mood}.` : '';
    const ratioPrompt = ratioGuidance[requestedRatio] || ratioGuidance['4:5'];

    // 파이프라인: 메시지 분석 → 타이포 위계 → 레이아웃 → (여기서) 배경이 그 레이아웃에 맞춰 적응
    const layoutAlign = analysis.textAlign === 'left' ? 'left' : 'center';
    const layoutTotalChars = safeLines.reduce((n, l) => n + (l.text?.length || 0), 0);
    const layoutMaxScale = Math.max(1, ...safeLines.map((l) => l.scale || 1));
    const layoutHeavy = layoutTotalChars <= 14 || layoutMaxScale >= 1.8;
    const clearRegion = layoutAlign === 'left' ? 'the left and center-left, plus the vertical middle' : 'the central column and the vertical middle';
    const interestRegion = layoutAlign === 'left' ? 'the right side and the upper/lower edges' : 'the edges — top, bottom, and corners';
    const layoutDirective = `TYPOGRAPHY LAYOUT TO ACCOMMODATE (background must adapt to it): the text is ${layoutAlign}-aligned, vertically centered, and ${layoutHeavy ? 'large and dominant, occupying roughly 50–70% of the card' : 'clearly readable, occupying roughly 40–55% of the card'}. Keep ${clearRegion} calm, clean and low-contrast so the typography stays perfectly legible; place focal visual interest toward ${interestRegion}, never directly behind the main text.`;
    // 메시지 맞춤 배경 — 세련된 에디토리얼 톤, 촌스러운 AI 교회포스터 금지
    const personalizedBrief = [
      selectedTemplate === 'T02'
        ? 'This is a HIP, TEXTURED, design-forward worship poster — contemporary graphic-design quality, deliberately grungy, layered and print-like. Bold and characterful rather than clean and restrained.'
        : 'This is a CLEAN, MODERN, design-forward poster — premium editorial / contemporary graphic-design quality (Pinterest design posters), tasteful and restrained.',
      analysis.backgroundConcept
        ? `Background matched to the message meaning: ${analysis.backgroundConcept}. Render it TASTEFULLY and modern. The scene must feel personally chosen for the user's words. It may be (a) simply a refined flat color or smooth gradient, OR (b) ONE elegant, meaningful object / subtle motif (editorial still-life or simple graphic), OR (c) a soft, refined atmospheric backdrop — choose whatever fits this message and VARY it across cards. Not every card needs a literal scene.`
        : '',
      Array.isArray(analysis.visualMotifs) && analysis.visualMotifs.length
        ? `Meaningful visual motifs to consider: ${analysis.visualMotifs.join(', ')}. Use only the motifs that strengthen the verse; do not decorate randomly.`
        : '',
      analysis.palette ? `Refined palette: ${analysis.palette}.` : '',
      analysis.lighting ? `Lighting direction: ${analysis.lighting}.` : '',
      analysis.composition ? `Composition direction: ${analysis.composition}.` : '',
      selectedTemplate === 'T03'
        ? 'T03 SPECIFIC: the background is a soft DREAMY BLURRED aesthetic film photo (out-of-focus flowers, petals, meadow, soft bokeh light, gentle film grain) kept low-contrast so the bold typography reads clearly on top. It should feel like a tasteful Pinterest/aesthetic scripture wallpaper. The typography is the hero; the photo is atmosphere. ABSOLUTELY NO decorative divider lines, horizontal rules, star symbols, leaf ornaments, floral separators, frame lines, quote marks, faux logo marks, or ornamental swashes.'
        : selectedTemplate === 'T04'
        ? 'T04 SPECIFIC: the background is a beautiful calm aesthetic PHOTO chosen from the verse meaning (warm sunset sea, misty mountains, starry night sky, quiet forest, soft clouds, still lake). Keep a large calm low-contrast negative-space band — usually the sky / vertical middle — clean enough that simple centered text stays perfectly legible. Soft natural light, gentle film tone. No decorative ornaments.'
        : '',
      selectedTemplate === 'T02'
        ? 'STRICTLY AVOID the cheesy AI-Christian-poster look: NO dramatic stormy skies, NO lone windblown tree, NO golden sunrise light rays, NO glowing gold-on-black, NO 3D extruded / beveled / drop-shadow letters, NO fake-epic landscape photos. Heavy print grain and grunge texture ARE wanted here — they are the style, not a flaw. The typography stays the hero.'
        : 'STRICTLY AVOID the cheesy AI-Christian-poster look: NO dramatic stormy skies, NO lone windblown tree, NO golden sunrise light rays, NO glowing gold-on-black, NO 3D extruded / beveled / drop-shadow letters, NO fake-epic landscape photos, NO heavy grunge texture, NO over-saturation. Keep it modern, refined and design-led; the typography stays the hero.',
    ].filter(Boolean).join('\n');
    // ── 글자 렌더링: T01/T02/T03은 AI가 직접 한 장의 포스터처럼 그림. 나머지는 폰트 오버레이 ──
    const aiText = body.aiText !== false && (selectedTemplate === 'T01' || selectedTemplate === 'T02' || selectedTemplate === 'T03');
    // 성경 출처 줄은 본문/히어로에서 제외 (하단 작은 캡션으로만)
    const refLine = safeLines.find((l) => isRefLine(l.text) || (l.scale || 1) <= 0.55);
    const heroCandidates = safeLines.filter((l) => l !== refLine);
    const heroLine = (heroCandidates.length ? heroCandidates : safeLines)
      .reduce((a, b) => ((b.scale || 1) > (a.scale || 1) ? b : a), (heroCandidates[0] || safeLines[0] || { text: '', scale: 1 }));
    const hierarchyHint = safeLines
      .map((l) => `"${l.text}"(${(l.scale || 1) >= 1.4 ? 'LARGE' : (l.scale || 1) <= 0.6 ? 'small caption' : 'medium'})`)
      .join(', ');
    // 템플릿마다 고정된 레터링 스타일 (한 템플릿 = 한 스타일, 일관성 유지)
    const letteringByTemplate: Record<string, string> = {
      T01: `cute Korean hand-lettering: ${t01TypographyStyle || 'small friendly handwritten note style'}, follow this exact font variant and do not default to the same rounded marker font, never brush calligraphy`,
      T02: 'hip worship poster lettering: HEAVY BOLD CONDENSED Korean display caps (tight, narrow, upright — never rounded, never bubble, never slanted italic), layered with ONE contrasting cursive script or hand-drawn brush accent word taken from the given text, plus thin justified small-caps treatment for the given smaller lines with small dash/connector lines, all over grungy print/collage/duotone grain — editorial, textured, mature and cool',
      T03: `emotional editorial magazine typography: ${t03FontStyle || 'a cohesive refined serif family'} with a bold oversized hero phrase and small elegant supporting lines, strong intentional size contrast, tasteful accent color when useful`,
      T04: 'clean minimal sans lettering, calm and simple with generous space',
    };
    const letteringStyle = letteringByTemplate[selectedTemplate] || letteringByTemplate.T02;
    const aiTextBlock = [
      'RENDER THE KOREAN TEXT AS THE HERO TYPOGRAPHY, beautifully integrated into the poster (not a plain overlay).',
      // 사용자가 입력하지 않은 문구/출처를 이미지 모델이 지어내지 못하게 하는 최상위 규칙
      `ABSOLUTE TEXT RULE (HIGHEST PRIORITY — overrides every style direction below): the ONLY text allowed anywhere in this image is exactly these ${safeLines.length} line(s), verbatim: ${safeLines.map((l) => `"${l.text}"`).join(' / ')}.`,
      'Do NOT add, invent, complete, continue, translate, or duplicate ANY other text. Specifically FORBIDDEN unless it appears verbatim in the lines above: extra scripture wording, a Bible reference (book name, chapter, verse numbers), a title, a subtitle, a caption, a tagline, a signature, a date, a watermark, a website, a logo wordmark, any English/Latin/number characters, and any decorative filler lettering. If a style direction below mentions a caption, a reference, a credit, or extra top/bottom lines, satisfy it ONLY by styling the lines listed above — or leave that element out entirely. Even ONE word the user did not type is a FAILURE.',
      `CRITICAL: spell every Korean character EXACTLY and legibly. Do NOT change, omit, add, or misspell any character. The full text is: "${safeLines.map((l) => l.text).join(' ')}".`,
      !refLine?.text
        ? 'NO REFERENCE IN THIS CARD: the user did not type any Bible reference. Ignore every mention of a reference / credit / source caption in the style directions below and draw NONE. Never guess or supply a book-chapter-verse citation.'
        : '',
      refLine?.text
        ? `BIBLE REFERENCE PLACEMENT (IMPORTANT): "${refLine.text}" is the source credit, NOT part of the message. Render it as a SMALL quiet caption at the BOTTOM of the composition. NEVER enlarge it, NEVER place it at the top, NEVER merge it into the main text, and NEVER make it the hero/headline.`
        : '',
      heroLine?.text
        ? selectedTemplate === 'T03'
          ? `HERO PHRASE (make it clearly larger, but MODERATE): "${heroLine.text}". It should be noticeably bigger than the supporting lines, but keep it elegant and restrained — do NOT blow it up to fill the whole card, and leave generous breathing room around it.`
          : selectedTemplate === 'T02'
            ? `T02 SIZING: build a strong SIZE CONTRAST like a magazine cover — set the hero phrase "${heroLine.text}" as HUGE bold condensed caps and the supporting lines clearly smaller around it. Any short speaker-intro/attribution phrase (e.g. "…불러 이르시되") stays smallest. Never a flat wall of same-size text.`
            : `Dominant headline (largest): "${heroLine.text}".`
        : '',
      selectedTemplate === 'T03'
        ? 'For T03, use clear but MODERATE editorial hierarchy: the hero phrase is noticeably larger than the small supporting lines, but tasteful and not oversized. Think refined magazine cover with lots of breathing room — never let the hero dominate or crowd the whole card.'
        : selectedTemplate === 'T02'
        ? 'For T02, emphasis comes from SIZE CONTRAST plus the script/hand-drawn word layered over the condensed caps — not from doodle stickers or decorative accents.'
        : 'The dominant headline above was selected by semantic meaning, not by line position. Do not make the last line biggest unless it is truly the core message.',
      `Size hierarchy by line: ${hierarchyHint}.`,
      selectedTemplate === 'T03'
        ? `Follow the T03 typography variant EXACTLY, including placement and alignment. Ignore the earlier analysis textAlign if it conflicts. Lettering style for this generation: ${letteringStyle}. The letterform must look noticeably different from other T03 generations.`
        : `Text alignment: ${layoutAlign}. Lettering style for this template: ${letteringStyle}. Make the typography beautiful and characterful, not a default font.`,
      selectedTemplate === 'T01'
        ? [
            'T01 CUTE HANDWRITING MODE: a sweet handmade pastel devotional card with cute Korean handwriting and lots of calm empty space.',
            t01Layout,
            `T01 FONT VARIANT: ${t01TypographyStyle}.`,
            `VARIATION SEED: ${templateIndex}. Vary the background color, doodle type, lettering weight/width, and composition from other T01 generations.`,
            'FONT DIVERSITY RULE: avoid thin lettering unless the variant says diary pen. Prefer stronger, more visible cute lettering.',
            'BACKGROUND DIVERSITY RULE: do not default to flowers and clouds; follow the selected design and verse meaning.',
            heroLine?.text
              ? `EMPHASIS RULE (IMPORTANT): apply a soft color highlight OR a colored underline to ONLY the single most important phrase "${heroLine.text}" (at most one additional truly key word). Do NOT underline, highlight, or circle ordinary/connective words, and do NOT mark every line — most lines must have NO decoration under them. Emphasis must land on the meaning, not random words.`
              : 'EMPHASIS RULE: emphasize at most one key word; most lines have no markers.',
            'DECORATION RULE (IMPORTANT): keep decorations minimal and tasteful — at most 2 or 3 tiny simple doodles TOTAL, placed near the edges/corners. NO smiley faces, NO scattered hearts, NO water splashes, NO sparkle/confetti clutter. Quiet, clean, restrained, with lots of empty pastel space.',
            'Use pastel crayon/marker/watercolor texture and modest handwriting. ABSOLUTELY NO brush calligraphy, no ink strokes, no dark dramatic background, no bold proclamation poster, no realistic photo.',
          ].filter(Boolean).join(' ')
        : '',
      selectedTemplate === 'T03'
        ? [
            'T03 EDITORIAL TYPOGRAPHY MODE: make this look like a designed magazine-cover scripture poster over a soft blurred aesthetic film photo. ONE key phrase is the hero, noticeably larger but MODERATE (not oversized, not filling the card); the supporting lines are small and elegant (italic serif works well); include a small stylized Bible-reference credit ONLY when a reference line is listed above — otherwise draw no credit at all. Keep generous breathing room. Tasteful accent color only when it improves the design. The full Korean text must remain present, correctly spelled, and readable.',
            t03TypographyLayout,
            `VARIATION SEED: ${templateIndex}. Vary which phrase becomes the hero, its placement, scale, color, reference placement, photo subject, crop, and composition from previous attempts. The layout should be immediately visually different at thumbnail size.`,
            'DECORATION BAN: do not draw horizontal lines, divider rules, stars, leaf dividers, floral separators, brackets, frames, quote marks, or tiny logo-like ornaments around the text. Use only typography, spacing, color, and the photo itself.',
          ].filter(Boolean).join(' ')
        : '',
      selectedTemplate === 'T02'
        ? [
            'T02 HIP WORSHIP MODE: a trendy modern Christian worship / merch poster (think church worship-night graphics). EDGY, editorial, bold, layered, MATURE and cool. It must NOT look CUTE, sweet, soft, pastel, childish, or bubbly (a different template owns that): NO rounded bubble letters, NO hearts, NO flowers, NO pastel candy colors, NO smiley faces. The energy comes from BOLD CONDENSED type + a script/hand-drawn overlay word + grungy print/collage/duotone texture + orange/black/cream palette + small connector lines, with small justified small-caps styling used ONLY on the user\'s own smaller lines.',
            `FOLLOW THIS EXACT STYLE FOR THIS GENERATION — ${t02Archetype} Commit fully to this style so it looks clearly different from other T02 cards.`,
            'Give everything a grungy/grainy/print-textured, hand-made, layered quality — never a clean sterile flat poster.',
            'EMPHASIS: use SIZE CONTRAST and the script/overlay layering for emphasis (one key word large, a cursive/brush word crossing it), NOT auto-circling a random word. Any speaker-intro phrase stays small.',
            refLine?.text
              ? `REFERENCE STYLE: place the small reference "${refLine.text}" CENTERED just BELOW the last text line (close to it, small gap — not floating far at the very bottom), clean bold small-caps in a matching color, simple and understated.`
              : '',
            `VARIATION SEED: ${templateIndex}.`,
            'FIT RULE (ABSOLUTE — most common failure): find the WIDEST line first, then size the WHOLE block so that widest line still leaves at least 10% empty space on BOTH the left and right. The final character of EVERY line (especially the last line) must be fully inside the frame with clear margin — a single cropped or edge-touching letter is a FAILURE. When in doubt, make the display text SMALLER. Every Korean character spelled correctly and fully visible.',
          ].filter(Boolean).join(' ')
        : '',
      selectedTemplate === 'T03'
        ? 'SIZE & SPACING FOR T03 (CRITICAL — READ CAREFULLY): the ENTIRE text block MUST be HORIZONTALLY CENTERED and fit inside the central 84% of the width — never pushed to a side, never touching the edges. Keep the hero phrase MODERATE: it is clearly larger than the supporting lines, but the whole text block (hero included) should occupy only about 40–55% of the card, with lots of empty breathing space around it. The hero must NOT fill the full width or dominate the whole card — if it looks huge, scale it down. Prefer refined restraint over maximum size. Leave at least 10% empty margin on every side. A given Bible reference stays small and centered; never add one that was not given. Any cropped or edge-touching letter is a FAILURE.'
        : selectedTemplate === 'T01'
          ? 'SIZE & SPACING FOR T01: keep the handwriting cute and modest, not huge. Most designs should use a text block around 18–34% of the card area with lots of empty pastel space. Only FONT E or FONT H may have one larger chunky key phrase. Long verses should become small diary handwriting, not oversized poster type. Cropped/cut-off letters are a failure.'
        : selectedTemplate === 'T02'
          ? 'SIZE & SPACING FOR T02: this hip style CAN use big, bold, frame-filling typography like a magazine cover — that is good here. Use strong SIZE CONTRAST (one word large, others smaller) and fill the composition with the design elements (script/hand-drawn overlay, grungy texture, justified small-caps caption, small connector lines). It must look DESIGNED and layered, never a plain cramped wall of same-size text. HOWEVER every Korean letter MUST stay fully inside the frame with a safe margin — nothing cropped or running off the edge. If a line is too wide to fit, break it or size it down. If a reference line was given, keep it tucked small as a caption; if none was given, do NOT add one.'
        : 'SIZE & SPACING: do NOT make the text gigantic. The whole text block should occupy about 55–65% of the card with clear empty margins all around. Use TIGHT line spacing (lines close together, not airy). Keep at least 8% empty margin on the left and right — the longest line must NOT touch or cross the edges; scale ALL the lettering down until the widest line fits with margin. Cropped/cut-off letters are a failure.',
      selectedTemplate === 'T02'
        ? 'Keep Korean spelling perfect. Do NOT add any words that are not in the text. The typography SHOULD fill the frame boldly — the only hard limit is that no letter may be cropped or touch the edge.'
        : 'Typography is the focal point and must dominate; integrate it cleanly with the background. Keep Korean spelling perfect. Do NOT add any words that are not in the text.',
    ].filter(Boolean).join('\n');
    const GLOBAL_WITH_TEXT = '\n\nClean, modern, design-forward faith poster (premium editorial / contemporary graphic design). Tasteful and restrained. STRICTLY AVOID a cheesy AI church-poster look — no dramatic stormy skies, no lone tree, no sunrise light rays, no gold-on-black glow, no 3D/beveled letters, no epic landscape photos, no decorative divider lines, no stars, no ornamental separators. The Korean typography is accurate, legible, and the clear focal point.';
    const T01_GLOBAL_WITH_TEXT = '\n\nCute handmade devotional card, pastel illustration quality, playful but polished. It should feel like a sweet hand-drawn encouragement card, not an editorial poster. Korean handwriting must be accurate, legible, and visibly hand-drawn. Use stronger cute lettering when appropriate; avoid overly thin pale text. Background variety matters: not always flowers/clouds.';
    const T02_GLOBAL_WITH_TEXT = '\n\nHip modern Christian worship poster (worship-night / merch graphic aesthetic), grungy, layered and print-textured — follow the specific STYLE archetype described above for letterform, color, texture and layering. Bold condensed Korean caps with a script/hand-drawn overlay word, orange + black + cream palette, small connector lines, and thin justified small-caps styling applied ONLY to the user\'s own smaller lines — no invented captions, no invented Bible reference. Mature, editorial and cool — ABSOLUTELY NOT cute: NO rounded bubble letters, NO pastel candy colors, NO hearts, NO flowers, NO smiley faces, NO doodle stickers. Also NO 3D/beveled letters, NO cheesy propaganda/sports look, NO slanted italic. The Korean typography is accurate, fully visible, correctly spelled, and the clear focal point.';

    const bgPromptFinal = [
      config.backgroundPrompt,
      config.styleLock,
      personalizedBrief,
      selectedTemplate === 'T02' ? '' : variation,
      moodHint,
      aiText ? aiTextBlock : layoutDirective,
      ratioPrompt,
      aiText
        ? (selectedTemplate === 'T01'
            ? T01_GLOBAL_WITH_TEXT
            : selectedTemplate === 'T02'
              ? T02_GLOBAL_WITH_TEXT
              : GLOBAL_WITH_TEXT)
        : (selectedTemplate === 'T02' ? GLOBAL_BG_PROMPT_T02 : GLOBAL_BG_PROMPT),
    ].filter(Boolean).join('\n\n');

    const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt: bgPromptFinal, size: ratioToSize[requestedRatio], n: 1 }),
    });
    const imgData = await imgRes.json<any>();
    if (!imgRes.ok) {
      if (imgRes.status === 429) return Response.json({ error: 'API 요청 한도를 초과했습니다.' }, { status: 429 });
      throw new Error(imgData.error?.message || '이미지 생성 실패');
    }
    const b64 = imgData.data?.[0]?.b64_json;
    if (!b64) return Response.json({ error: '이미지 생성 실패' }, { status: 500 });

    return Response.json({
      image: `data:image/png;base64,${b64}`,
      template: selectedTemplate,
      fonts: selectedFonts,
      lines: safeLines,
      aiText,
      textAlign: analysis.textAlign === 'left' ? 'left' : 'center',
      useBrush: !!analysis.useBrush,
      mood: analysis.mood,
      backgroundConcept: analysis.backgroundConcept,
      visualMotifs: analysis.visualMotifs,
      palette: analysis.palette,
      lighting: analysis.lighting,
      composition: analysis.composition,
      typographyTone: analysis.typographyTone,
      fontMood,
      avoidImagery: analysis.avoidImagery,
      ratio: requestedRatio,
      recommendedTemplates: templates,
    });
    } catch (err: any) {
      console.error('auto-complete error:', err);
      return Response.json({ error: err?.message || '카드 생성에 실패했습니다.' }, { status: 500 });
    }
  }

  // ── photo-text: 업로드된 사진에 AI로 텍스트 배치 ──
  if (action === 'photo-text') {
    const { imageBase64, text } = body;
    if (!imageBase64 || !text) return Response.json({ error: '이미지와 텍스트가 필요합니다.' }, { status: 400 });

    const base64Data = imageBase64.replace(/^data:image\/[a-z+]+;base64,/, '');
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const formData = new FormData();
    formData.append('image', new Blob([bytes], { type: 'image/png' }), 'photo.png');
    formData.append('model', 'gpt-image-2');
    formData.append('prompt',
      `Create a beautiful faith-based card by adding this text to the image: "${text}". ` +
      `First, analyze the photo's mood and atmosphere (bright/dark, warm/cool, minimal/rich, natural/urban). ` +
      `Then automatically choose everything to match that mood: ` +
      `1) Font style — serif for classic/warm moods, handwriting for soft/emotional, sans-serif for modern/clean, display for bold/dramatic. ` +
      `2) Font weight and size — prominent enough to read clearly but balanced with the composition. ` +
      `3) Text color — white with subtle shadow for dark backgrounds, dark for light backgrounds, or a harmonious accent color that suits the mood. ` +
      `4) Placement — find the natural breathing room in the composition and place text there elegantly. ` +
      `5) Line breaks — break long text into natural, visually balanced lines. ` +
      `6) Keep the original photo intact as background. ` +
      `The result should feel like a professionally designed inspirational card where the typography perfectly complements the photo.`
    );
    formData.append('n', '1');
    formData.append('size', '1024x1024');

    const editRes = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: formData,
    });

    const editData = await editRes.json<any>();
    if (!editRes.ok) {
      if (editRes.status === 429) return Response.json({ error: 'API 요청 한도를 초과했습니다.' }, { status: 429 });
      return Response.json({ error: editData.error?.message || '이미지 생성 실패' }, { status: 500 });
    }

    const b64 = editData.data?.[0]?.b64_json;
    if (!b64) return Response.json({ error: '이미지 생성 실패' }, { status: 500 });
    return Response.json({ image: `data:image/png;base64,${b64}` });
  }

  // ── expand-prompt ──
  if (action === 'expand-prompt') {
    const scene = prompt?.trim() || '평화로운 풍경';
    const styleDesc = style ? styleDescriptions[style] || '' : '';
    const expanded = await gpt(env.OPENAI_API_KEY, [
      {
        role: 'system',
        content: `당신은 Daily Grace 앱의 배경 이미지 디렉터입니다.

사용자는 다음 중 하나를 입력할 수 있습니다.
* 장면 키워드 (호수, 바다, 들꽃, 창가 등)
* 감정 키워드 (감사, 평안, 위로, 소망 등)
* 성경 말씀
* QT 기록
* 기도 제목
* 감사 일기
* 자유로운 메모

당신의 역할은 입력 내용을 분석하여 말씀카드 배경에 적합한 장면 설명으로 변환하는 것입니다.

---

규칙

1. 반드시 한국어
2. 80~150자 이내
3. 이미지 설명만 출력
4. 해설, 설명, 제목 금지
5. 텍스트가 올라갈 충분한 여백 포함
6. 인물 얼굴, 초상화, 글자, 간판, 로고 금지
7. 복잡하거나 요소가 많은 장면 금지
8. 선택한 스타일(${styleDesc})을 자연스럽게 반영
9. 조명, 색감, 분위기를 구체적으로 묘사

---

입력 해석 규칙

### 1. 장면 키워드
사용자가 장면을 입력한 경우 → 더욱 구체적이고 아름다운 장면으로 확장

### 2. 감정 키워드
사용자가 감정을 입력한 경우 감정을 상징하는 자연 풍경이나 사물 장면으로 변환
예: 감사 → 따뜻한 햇살이 비치는 들꽃 풍경 / 평안 → 잔잔한 호수와 고요한 물결 / 위로 → 노을빛이 스며드는 창가 / 소망 → 새벽빛이 비추는 먼 지평선

### 3. 성경 말씀
말씀의 핵심 의미와 정서를 현대적이고 감성적인 배경 장면으로 상징화
예: 여호와는 나의 목자시니 → 따뜻한 빛이 내려앉은 평화로운 초원 / 강하고 담대하라 → 새벽 햇살이 비추는 산길

### 4. QT, 기도, 감사 기록
가장 중요한 감정과 주제를 추출하고 이를 상징하는 장면으로 변환
예: "취업 때문에 불안하지만 하나님을 신뢰하고 싶다" → 새벽빛이 비추는 길게 이어진 산책길, 멀리 밝아오는 하늘과 차분한 소망의 분위기

---

---

스타일별 장면 생성 규칙

맑은 수채화
→ 풍경 중심. 자연 장면 중심. 넓은 배경과 여백 강조. 캐릭터 사용 금지.

따뜻한 동화
→ 그림책 한 장면처럼 구성. 아기자기한 요소 허용. 따뜻하고 포근한 분위기.

감성 사진
→ 실사 사진처럼 구성. 자연광과 공간감 강조. Pinterest 스타일.

심플 낙서
→ 풍경보다 캐릭터 중심. 의미를 상징하는 귀여운 캐릭터로 변환. 약간 엉뚱하고 장난스러운 표현 허용. 완벽하게 귀엽기보다 살짝 얼빵하고 사랑스러운 느낌. 넓은 여백 유지. 배경 요소 최소화.
예시: "여호와는 나의 목자시니" → 작은 양과 함께 걷는 엉뚱한 목자 캐릭터 / "감사" → 꽃다발을 들고 행복해하는 캐릭터 / "평안" → 구름 위에 누워 쉬는 캐릭터

미니멀 감성
→ 사물 중심. 창가, 책, 꽃, 빛 중심. 캐릭터 사용 금지. 베이지 톤, 종이 질감, 여백.

빈티지 필름
→ 추억 같은 실사 장면. 따뜻한 필름 감성. 풍경 또는 사물 중심.`,
      },
      { role: 'user', content: `입력 내용:\n"${scene}"\n\n선택 스타일:\n"${styleDesc}"\n\n이 입력을 말씀카드 배경용 장면 설명으로 변환해주세요.` },
    ], 300);
    return Response.json({ expandedPrompt: expanded });
  }

  // ── generate-image ──
  if (action === 'generate-image') {
    const translated = prompt?.trim()
      ? await gpt(env.OPENAI_API_KEY, [
          { role: 'system', content: 'Translate Korean image description to vivid English for image generation. Keep visual details.' },
          { role: 'user', content: prompt.trim() },
        ], 300)
      : 'beautiful peaceful scene';

    const styleTemplate = style ? stylePrompts[style] || '' : 'A beautiful scene: ${input}';
    const finalPrompt = styleTemplate.replace('${input}', translated).replace('${text}', text || '');
    const size = ratio ? ratioToSize[ratio] || '1024x1024' : '1024x1024';

    const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-2', prompt: finalPrompt, size, n: 1 }),
    });

    const imgData = await imgRes.json<any>();
    if (!imgRes.ok) {
      if (imgRes.status === 429) return Response.json({ error: 'API 요청 한도를 초과했습니다.' }, { status: 429 });
      throw new Error(imgData.error?.message || '이미지 생성 실패');
    }

    const b64 = imgData.data?.[0]?.b64_json;
    if (!b64) return Response.json({ error: 'No image generated' }, { status: 500 });

    return Response.json({ image: `data:image/png;base64,${b64}`, requestedRatio: ratio });
  }

  return Response.json({ error: '올바른 액션을 지정해주세요' }, { status: 400 });
};
