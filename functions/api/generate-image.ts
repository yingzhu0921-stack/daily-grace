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

// 성경 출처 패턴 (대괄호/소괄호 유무, 책 약어 + 장:절). 예: [고후5:17] (시23:1) 마 5:14 요3:16 시편 23:1
const BIBLE_REF_RE = /[\[\(]?\s*[가-힣]{1,5}\s*\d{1,3}\s*[:：]\s*\d{1,3}\s*[\]\)]?/g;
const BIBLE_REF_ONE = /[\[\(]?\s*[가-힣]{1,5}\s*\d{1,3}\s*[:：]\s*\d{1,3}\s*[\]\)]?/;
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
  return s.replace(/[\[\]()（）]/g, '').replace(/([가-힣])\s*(\d)/, '$1 $2').trim();
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
      // T02 — 레트로 포스터
      'T02': {
        backgroundPrompt: 'Retro / vintage display-typography poster. The lettering fills the frame on a FLAT vintage color (or lightly textured) background with tasteful grain. Confident, characterful, premium retro poster. Minimal extra graphics — type-driven.',
        styleLock: 'T02 = RETRO POSTER: vintage display typography on a flat retro color with grain. Bold condensed display mixed with a cursive script accent word. Type-driven and clean — no busy scenery, no photo.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      // T03 — 감성 세리프 (필름 사진/무드 배경 + 우아한 세리프) ※ 세리프+워십 통합
      'T03': {
        backgroundPrompt: 'Emotional editorial scripture poster: a soft atmospheric FILM photograph chosen from the exact meaning of the verse, integrated with refined Korean serif typography as a finished poster. Prefer a calm graphic photo composition with one scripture-connected subject or landscape and a large low-contrast negative-space area for typography. Fine film grain, muted vintage blue/green/ivory tones, soft natural light, restrained contrast.',
        styleLock: 'T03 = EMOTIONAL SERIF (감성 세리프): refined editorial faith poster, like modern Christian poster references. The scene MUST connect to the verse meaning, not generic pretty nature. Keep the photo beautiful but quiet; typography must remain important but not always oversized. Avoid busy water spray, high-detail texture, strong highlights directly behind text, postcard-like scenic landscapes, and close-up scenery that competes with typography. Muted blue/green/ivory palette, subtle film grain. NEVER epic or dramatic.',
        fonts: { primary: 'Hahmlet', secondary: 'SeoulHangang' },
      },
      // T04 — 미니멀
      'T04': {
        backgroundPrompt: 'Minimal poster: clean simple lettering with generous negative space on a soft cream / off-white / light solid background. At most one small quiet graphic element. Calm, refined, breathable.',
        styleLock: 'T04 = MINIMAL: lots of negative space, clean simple type, soft light palette, at most one tiny accent. Quiet and refined — never busy, never dark, never loud.',
        fonts: { primary: 'PaperLight', secondary: 'SeoulHangang' },
      },
    };


    const GLOBAL_BG_PROMPT = '\n\nCreate a premium Christian typography card background. No text. No letters. No words. No typography. No logos. Large negative space for text overlay. Editorial design quality. Modern premium aesthetic. Clean composition. Soft cinematic lighting. High-end card design. Subtle texture. Text-safe layout. Important visual elements should not occupy the center typography area. Background only.';

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
- BIBLE REFERENCE EXCEPTION: a Bible reference (e.g. [고후5:17], (시23:1), 마 5:14, 요3:16) is metadata, not the message — it is the ONLY text you may reformat for visual quality. ALWAYS remove the brackets and add a space: "[고후5:17]"→"고후 5:17", "[시23:1]"→"시편 23:1", "요3:16"→"요 3:16". Put it as the LAST line (bottom), a small caption/signature at scale 0.25–0.50 — never at the top, never competing with the message.

TYPOGRAPHY (lines + scale) — text is the hero, make it feel designed, not merely placed:
- THE INPUT IS ARBITRARY: it may be a Bible verse, a worship-song lyric, a prayer, a gratitude note, a diary line, or any free message in Korean. These rules are GENERAL and apply to every input type — do not assume it is always scripture. Read THIS specific text and find its own meaning.
- EMPHASIS MUST COME FROM MEANING, NOT POSITION: do NOT automatically emphasize the final phrase. First identify the semantic/emotional core of THIS text — its main subject, its main action/command/promise, or its emotional peak (whatever the text is about). Emphasize the phrase carrying that core, even if it sits at the beginning or middle.
- Before choosing the largest line, ask: "If the reader could remember only ONE phrase from this exact text, which phrase carries it?" That phrase becomes the dominant line. The final line should be largest ONLY when it truly carries the core.
- LINE BREAKS ARE GRAMMATICAL (works for any Korean text): break at natural clause/phrase endings — connective/terminal endings such as ~요/~라/~니/~고/~며/~서/~데/~은/~는/~을 and particles — so every line reads as a coherent unit. This generalizes to lyrics, prayers, and any sentence, not only verses.
- Avoid the lazy pattern "supporting lines + huge final line." Vary emphasis across beginning/middle/end depending on the verse.
- NEVER emphasize broken connector fragments. Do not make phrases like "말라 그리하면", "그리하면 어디로", "그러므로/그리하면/그리고/그러나" large. Emphasis must be a complete meaningful command/promise/image. For Joshua 1 style text, keep "우로나 좌로나 치우치지 말라" together as a meaning unit, or emphasize "기록된 대로 다 지켜 행하라" / "치우치지 말라" / "형통하리라", not the connector words.
- LINE GROUPING BY MEANING (all templates): break lines at natural Korean clause/phrase boundaries (절·구 단위). NEVER merge the end of one clause with the start of the next clause into a single line, and especially never into the emphasized line. Each line — above all the emphasized one — must read as one coherent meaning unit on its own.
- Worked example — "또 내게 말씀하시되 이루었도다 나는 알파와 오메가요 처음과 마지막이라 내가 생명수 샘물을 목마른 자에게 값없이 주리니 [계21:6]": group as "또 내게 말씀하시되"(0.9) / "이루었도다"(1.0) / "나는 알파와 오메가요"(1.0) / "처음과 마지막이라"(1.0) / "내가 생명수 샘물을"(1.7, emphasized — the core promise) / "목마른 자에게"(0.95) / "값없이 주리니"(1.4) / "계 21:6"(0.4). WRONG would be joining "마지막이라 내가 생명수" on one line or emphasizing that cross-clause fragment.
- Split the input into poster-style lines. Encourage dramatic line breaks, oversized keywords, asymmetric hierarchy, dynamic spacing, large negative space. Avoid centering everything, identical sizing, tiny text, or decorative typography without purpose.
- "scale" is each line's relative size: dominant headline ≈ 1.7–2.3, key phrase ≈ 1.4–1.7, normal/connective ≈ 0.85–1.0, Bible reference / caption ≈ 0.25–0.50.
- THINK IN VISUAL BLOCKS, NOT SENTENCES: do not just split text at sentence boundaries or wrap it. A dominant phrase may span multiple lines; a single important word may become its own line. Typography should feel designed, with rhythm and emphasis.
- INTERNAL HIERARCHY: even within one phrase, separate key words / dominant concepts from supporting words and size them differently. Typography should communicate meaning, not merely display text.
- MANDATORY HIERARCHY — never output all lines at the same scale: every card MUST have clear size contrast. Pick the 1–2 most meaningful phrases and make them clearly the largest; shrink connective/intro words and any reference. If you find yourself giving everything ~1.0, you are wrong — choose what matters most and enlarge it.
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
- T03 typography should feel like an emotional poster: cohesive serif typography, a clear but controlled hierarchy, a visible Bible-reference credit, tasteful accent color when useful, and generous negative space. Do not always make one huge headline; sometimes use a smaller quiet block, asymmetric magazine layout, vertical reference, or medium stacked scripture layout. Do not mix a gothic/sans headline with a serif hero; use family cohesion and vary weight/scale instead.
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
  · T02 = 레트로 포스터 (bold vintage display) → strong, punchy, energetic messages
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
        { primary: 'PaperLight', secondary: 'SeoulHangang' },
        { primary: 'GowunDodum', secondary: 'SeoulHangang' },
        { primary: 'SeoulHangang', secondary: 'GowunBatang' },
      ],
      T02: [
        { primary: 'PaperBlack', secondary: 'PaperLight' },
        { primary: 'Taenada', secondary: 'PaperLight' },
        { primary: 'GangwonTunTun', secondary: 'PaperLight' },
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
      // T02 레트로 포스터 — 빈티지 플랫 컬러
      T02: [
        'Warm cream lettering on a deep warm-brown (#3a2418) background, retro condensed display poster.',
        'Deep cobalt-blue (#27408b) lettering on warm off-white paper (#f2ede2), clean editorial poster.',
        'Cream lettering on a rich editorial red (#b5342f) background, clean two-tone poster.',
        'Cream and brick-red lettering on a muted teal (#2f7d78) background, calm vintage poster.',
        'Soft black lettering on a dusty plum (#5b4a82) background with subtle gold accents.',
        'Chunky cream lettering on a terracotta (#b4592e) background, warm risograph poster.',
        'Deep navy lettering on a muted mustard (#cda94a) background, punchy mid-century poster.',
        'Cream lettering on a deep wine-burgundy (#5e2a36) background, premium poster.',
        'Soft black lettering on a warm sand (#dcc9a8) background, clean minimal poster.',
        'Ivory lettering on a deep charcoal-navy (#1f2633) background, refined premium poster.',
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
      // T04 미니멀 — 밝은 여백
      T04: [
        'Soft cream (#efe9dd) background, minimal with generous space.',
        'Warm off-white (#f3efe6) background with one tiny accent element.',
        'Pale sand (#e6dcc8) minimal background.',
        'Soft greige (#e0ddd6) minimal background.',
        'Light blush-ivory (#f0e7e2) minimal background.',
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
      'FONT J: mixed cute lettering: one chunky word, one small note line, and one colored reference line',
    ];
    const t01Layout = selectedTemplate === 'T01'
      ? t01DesignArchetypes[Math.abs(templateIndex) % t01DesignArchetypes.length]
      : '';
    const t01TypographyStyle = selectedTemplate === 'T01'
      ? t01TypographyStyles[Math.abs(templateIndex) % t01TypographyStyles.length]
      : '';
    const t03TypographyLayouts = [
      'T03 TYPOGRAPHY VARIANT A: TOP-CENTER poster. Place the entire text block near the upper third, centered, small and calm. Background subject sits lower. Do NOT place text in the left middle. No lines, no divider, no star.',
      'T03 TYPOGRAPHY VARIANT B: LOWER-RIGHT editorial poster. Place a compact right-aligned text block in the lower-right quadrant, leaving the left side mostly empty. Reference sits just under the block. No centered or left-column layout.',
      'T03 TYPOGRAPHY VARIANT C: BOTTOM-CENTER caption poster. Place the text as a refined small caption block near the bottom center, over a clean color/sky/field area. Emphasis is subtle. No left paragraph layout.',
      'T03 TYPOGRAPHY VARIANT D: RIGHT-SIDE magazine layout. Place the text in the upper-right or middle-right third, right-aligned or centered within that right column. Optional vertical Bible reference on far right. No left-side text block.',
      'T03 TYPOGRAPHY VARIANT E: TINY FLOATING TYPOGRAPHY. Use very small premium typography, almost like an art-photo caption, placed in a quiet empty area. Let the photograph dominate. No large headline, no left manuscript block.',
      'T03 TYPOGRAPHY VARIANT F: FULL POSTER WORDMARK LAYOUT. Use a short meaningful phrase as a modest graphic wordmark across the middle or lower third, with remaining lines much smaller around it. This should feel like a modern Christian poster, not a scripture paragraph.',
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
      'This is a CLEAN, MODERN, design-forward poster — premium editorial / contemporary graphic-design quality (Pinterest design posters), tasteful and restrained.',
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
        ? 'T03 SPECIFIC: create a reference-worthy emotional serif poster background. The background must be chosen from the verse meaning, not from generic devotional scenery. Prefer graphic poster variety: object close-up, hands/gesture, single flower, grass texture, bold blue sky, cloud shape, flat color field, water/boat/path only when meaning fits. For thanks/offering/vow verses, prefer quiet still-life/devotion objects or hands offering something, not sunset landscapes. Avoid generic meadow/flower/sky unless the verse itself points there. ABSOLUTELY NO decorative divider lines, horizontal rules, star symbols, leaf ornaments, floral separators, frame lines, quote marks, faux logo marks, or ornamental swashes.'
        : '',
      'STRICTLY AVOID the cheesy AI-Christian-poster look: NO dramatic stormy skies, NO lone windblown tree, NO golden sunrise light rays, NO glowing gold-on-black, NO 3D extruded / beveled / drop-shadow letters, NO fake-epic landscape photos, NO heavy grunge texture, NO over-saturation. Keep it modern, refined and design-led; the typography stays the hero.',
    ].filter(Boolean).join('\n');
    // ── 글자 렌더링: T01/T02/T03은 AI가 직접 한 장의 포스터처럼 그림. 나머지는 폰트 오버레이 ──
    const aiText = body.aiText !== false && (selectedTemplate === 'T01' || selectedTemplate === 'T02' || selectedTemplate === 'T03');
    const heroLine = safeLines.reduce((a, b) => ((b.scale || 1) > (a.scale || 1) ? b : a), safeLines[0] || { text: '', scale: 1 });
    const hierarchyHint = safeLines
      .map((l) => `"${l.text}"(${(l.scale || 1) >= 1.4 ? 'LARGE' : (l.scale || 1) <= 0.6 ? 'small caption' : 'medium'})`)
      .join(', ');
    // 템플릿마다 고정된 레터링 스타일 (한 템플릿 = 한 스타일, 일관성 유지)
    const letteringByTemplate: Record<string, string> = {
      T01: `cute Korean hand-lettering: ${t01TypographyStyle || 'small friendly handwritten note style'}, follow this exact font variant and do not default to the same rounded marker font, never brush calligraphy`,
      T02: 'retro display lettering: a bold condensed display style for the main lines mixed with a flowing cursive SCRIPT for ONE key word, vintage character with tasteful grain',
      T03: `emotional Korean serif poster typography: ${t03FontStyle || 'cohesive refined serif family'}, controlled small-scale hierarchy, tasteful accent color when useful, no default gothic/sans mixing`,
      T04: 'clean minimal sans lettering, calm and simple with generous space',
    };
    const letteringStyle = letteringByTemplate[selectedTemplate] || letteringByTemplate.T02;
    const aiTextBlock = [
      'RENDER THE KOREAN TEXT AS THE HERO TYPOGRAPHY, beautifully integrated into the poster (not a plain overlay).',
      `CRITICAL: spell every Korean character EXACTLY and legibly. Do NOT change, omit, add, or misspell any character. The full text is: "${safeLines.map((l) => l.text).join(' ')}".`,
      heroLine?.text
        ? selectedTemplate === 'T03'
          ? `Meaningful emphasis phrase: "${heroLine.text}". Keep it only slightly larger, not gigantic.`
          : `Dominant headline (largest): "${heroLine.text}".`
        : '',
      selectedTemplate === 'T03'
        ? 'For T03, avoid loud headline scale. The emphasis should feel like refined editorial hierarchy, not a title slide.'
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
            'T03 DIRECT POSTER MODE: make this look like a complete emotional Korean scripture poster, not a generated background with plain text laid on top. Use one cohesive serif family, a visible Bible reference credit, tasteful accent color only when it improves the design, and composition similar to refined Christian editorial poster references. The full Korean text must remain present and readable.',
            t03TypographyLayout,
            `VARIATION SEED: ${templateIndex}. This generation must not reuse a left-middle scripture paragraph layout. Vary placement, scale, color, reference placement, photo subject, crop, and background archetype from previous attempts. The layout should be immediately visually different at thumbnail size.`,
            'DECORATION BAN: do not draw horizontal lines, divider rules, stars, leaf dividers, floral separators, brackets, frames, quote marks, or tiny logo-like ornaments around the text. Use only typography, spacing, color, and the photo itself.',
          ].filter(Boolean).join(' ')
        : '',
      selectedTemplate === 'T03'
        ? 'SIZE & SPACING FOR T03: make the typography MUCH SMALLER and more premium. The whole text block should usually occupy only about 16–28% of the card area; for long verses up to 32% maximum. No single Korean word should dominate the card. Keep at least 14% empty margin on all sides. Prefer refined poster/caption scale over loud title scale. The Bible reference must be readable but modest. Cropped/cut-off letters are a failure.'
        : selectedTemplate === 'T01'
          ? 'SIZE & SPACING FOR T01: keep the handwriting cute and modest, not huge. Most designs should use a text block around 18–34% of the card area with lots of empty pastel space. Only FONT E or FONT H may have one larger chunky key phrase. Long verses should become small diary handwriting, not oversized poster type. Cropped/cut-off letters are a failure.'
        : 'SIZE & SPACING: do NOT make the text gigantic. The whole text block should occupy about 55–65% of the card with clear empty margins all around. Use TIGHT line spacing (lines close together, not airy). Keep at least 8% empty margin on the left and right — the longest line must NOT touch or cross the edges; scale ALL the lettering down until the widest line fits with margin. Cropped/cut-off letters are a failure.',
      'Typography is the focal point and must dominate; integrate it cleanly with the background. Keep Korean spelling perfect. Do NOT add any words that are not in the text.',
    ].filter(Boolean).join('\n');
    const GLOBAL_WITH_TEXT = '\n\nClean, modern, design-forward faith poster (premium editorial / contemporary graphic design). Tasteful and restrained. STRICTLY AVOID a cheesy AI church-poster look — no dramatic stormy skies, no lone tree, no sunrise light rays, no gold-on-black glow, no 3D/beveled letters, no epic landscape photos, no decorative divider lines, no stars, no ornamental separators. The Korean typography is accurate, legible, and the clear focal point.';
    const T01_GLOBAL_WITH_TEXT = '\n\nCute handmade devotional card, pastel illustration quality, playful but polished. It should feel like a sweet hand-drawn encouragement card, not an editorial poster. Korean handwriting must be accurate, legible, and visibly hand-drawn. Use stronger cute lettering when appropriate; avoid overly thin pale text. Background variety matters: not always flowers/clouds.';

    const bgPromptFinal = [
      config.backgroundPrompt,
      config.styleLock,
      personalizedBrief,
      variation,
      moodHint,
      aiText ? aiTextBlock : layoutDirective,
      ratioPrompt,
      aiText ? (selectedTemplate === 'T01' ? T01_GLOBAL_WITH_TEXT : GLOBAL_WITH_TEXT) : GLOBAL_BG_PROMPT,
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
