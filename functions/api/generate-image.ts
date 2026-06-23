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

// 위계 보정 + 출처는 대괄호 제거하고 맨 마지막(하단)에 작은 캡션으로 배치
function enforceHierarchy(lines: TypoLine[]): TypoLine[] {
  if (!lines.length) return lines;
  const refLines: TypoLine[] = [];
  const content: TypoLine[] = [];
  for (const l of lines) {
    if (isRefLine(l.text)) refLines.push({ text: formatReference(l.text), scale: Math.min(l.scale, 0.45) });
    else content.push({ text: l.text, scale: l.scale });
  }
  // 본문이 평평하면 마지막 구절 강조
  const scales = content.map((l) => l.scale);
  const flat = content.length > 0 && (Math.max(...scales) - Math.min(...scales) < 0.3);
  if (flat) {
    if (content.length === 1) content[0].scale = 1.6;
    else content.forEach((l, i) => { l.scale = i === content.length - 1 ? 1.7 : 0.95; });
  }
  // 출처는 맨 아래
  return [...content, ...refLines];
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
    bodyLines.forEach((t, i) => out.push({ text: t, scale: i === bodyLines.length - 1 ? 1.7 : 0.95 }));
  } else {
    out.push({ text: original, scale: 1.3 });
  }
  // 출처는 대괄호 제거하고 맨 아래 캡션으로
  if (refText) out.push({ text: formatReference(refText), scale: 0.42 });
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

    // ── 5개 고정 스타일 (템플릿 = 스타일 1개, 다양성은 색상만) ──
    const TEMPLATE_CONFIGS: Record<string, { backgroundPrompt: string; styleLock: string; fonts: { primary: string; secondary: string } }> = {
      // T01 — 붓글씨 선포
      'T01': {
        backgroundPrompt: 'Bold Korean brush-calligraphy faith poster. The energetic ink-brush lettering is the hero on a rich, deep solid background with subtle texture. Powerful, declarative, dynamic ink strokes. Minimal supporting graphics.',
        styleLock: 'T01 = BRUSH DECLARATION: powerful Korean brush calligraphy (ink strokes) on a rich deep background. Bold, energetic, declarative. NOT gentle, NOT pastel, NOT a photo scene.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      // T02 — 레트로 포스터
      'T02': {
        backgroundPrompt: 'Retro / vintage display-typography poster. The lettering fills the frame on a FLAT vintage color (or lightly textured) background with tasteful grain. Confident, characterful, premium retro poster. Minimal extra graphics — type-driven.',
        styleLock: 'T02 = RETRO POSTER: vintage display typography on a flat retro color with grain. Bold condensed display mixed with a cursive script accent word. Type-driven and clean — no busy scenery, no photo.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      // T03 — 에디토리얼 세리프
      'T03': {
        backgroundPrompt: 'Elegant editorial poster: refined high-contrast SERIF typography on a muted, refined FLAT color background with a subtle paper texture. Magazine quality, calm and sophisticated, generous negative space. No photograph.',
        styleLock: 'T03 = EDITORIAL SERIF: elegant high-contrast serif on a muted refined FLAT palette, magazine sophistication. Calm and premium, never loud, never neon, never a dramatic photo.',
        fonts: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
      },
      // T04 — 미니멀
      'T04': {
        backgroundPrompt: 'Minimal poster: clean simple lettering with generous negative space on a soft cream / off-white / light solid background. At most one small quiet graphic element. Calm, refined, breathable.',
        styleLock: 'T04 = MINIMAL: lots of negative space, clean simple type, soft light palette, at most one tiny accent. Quiet and refined — never busy, never dark, never loud.',
        fonts: { primary: 'PaperLight', secondary: 'SeoulHangang' },
      },
      // T05 — 모던 워십
      'T05': {
        backgroundPrompt: 'Modern worship poster: bold confident clean lettering on a smooth LUMINOUS GRADIENT with soft glow (no photograph). Hopeful, spacious, emotionally uplifting, contemporary and refined.',
        styleLock: 'T05 = MODERN WORSHIP: a smooth luminous color gradient with soft glow, bold clean modern lettering, hopeful uplifting mood. NOT a dramatic photo, NOT grunge, NOT neon, NOT a church poster.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
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
{"lines":[{"text":"","scale":1}],"textAlign":"center","useBrush":false,"mood":"","templates":["T01","T03","T05"],"backgroundConcept":"","visualMotifs":[""],"palette":"","lighting":"","composition":"","typographyTone":"","fontMood":"bold","avoidImagery":[""]}

ABSOLUTE TEXT RULE — rearrange the presentation freely, never modify the words:
- BEFORE describing the background, plan the typography: identify key phrases, the dominant idea, and supporting text, then build the hierarchy and layout.
- You MAY freely redesign line breaks, grouping, emphasis, per-line size, hierarchy, alignment, positioning, and composition to maximize impact and readability. Rearranging the PRESENTATION is encouraged.
- You may NOT change, summarize, paraphrase, translate, shorten, reorder, add, or remove any word. The words and their reading order stay identical.
- "lines" MUST reproduce the user's input EXACTLY in order. Concatenating every line's "text" (ignoring spaces) must equal the user's input (ignoring spaces). If unsure, put the whole input as one line.
- Do NOT add a Bible reference or any text the user did not type.
- BIBLE REFERENCE EXCEPTION: a Bible reference (e.g. [고후5:17], (시23:1), 마 5:14, 요3:16) is metadata, not the message — it is the ONLY text you may reformat for visual quality. ALWAYS remove the brackets and add a space: "[고후5:17]"→"고후 5:17", "[시23:1]"→"시편 23:1", "요3:16"→"요 3:16". Put it as the LAST line (bottom), a small caption/signature at scale 0.25–0.50 — never at the top, never competing with the message.

TYPOGRAPHY (lines + scale) — text is the hero, make it feel designed, not merely placed:
- Split the input into poster-style lines. Encourage dramatic line breaks, oversized keywords, asymmetric hierarchy, dynamic spacing, large negative space. Avoid centering everything, identical sizing, tiny text, or decorative typography without purpose.
- "scale" is each line's relative size: dominant headline ≈ 1.7–2.3, key phrase ≈ 1.4–1.7, normal/connective ≈ 0.85–1.0, Bible reference / caption ≈ 0.25–0.50.
- THINK IN VISUAL BLOCKS, NOT SENTENCES: do not just split text at sentence boundaries or wrap it. A dominant phrase may span multiple lines; a single important word may become its own line. Typography should feel designed, with rhythm and emphasis.
- INTERNAL HIERARCHY: even within one phrase, separate key words / dominant concepts from supporting words and size them differently. Typography should communicate meaning, not merely display text.
- MANDATORY HIERARCHY — never output all lines at the same scale: every card MUST have clear size contrast. Pick the 1–2 most meaningful phrases and make them clearly the largest; shrink connective/intro words and any reference. If you find yourself giving everything ~1.0, you are wrong — choose what matters most and enlarge it.
- Length adapts but hierarchy is ALWAYS required:
  · SHORT → one giant hero line.
  · MEDIUM → 1–2 big key lines, supporting lines smaller.
  · LONG → still enlarge the 1–2 most important phrases (≈1.5–1.9), keep connective lines smaller (≈0.85), and put any reference at ≈0.45. Break the text into meaningful phrase-groups, not even paragraph blocks.
- A Bible reference is METADATA (a caption/signature), never the main message — keep it at ≈0.35–0.55 and never let it compete with the message.
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

- mood: one of 담대함/선포/믿음/승리/소망/회복/빛/예배/평안/은혜/쉼/QT/감사/일상/묵상/기도/고요함
- templates: exactly 3 IDs from T01,T02,T03,T04,T05 best matching the message:
  · T01 = 붓글씨 선포 (brush calligraphy, bold declaration) → 담대/선포/승리/믿음
  · T02 = 레트로 포스터 (bold vintage display) → strong, punchy, energetic messages
  · T03 = 에디토리얼 세리프 (elegant serif) → 묵상/평안/은혜/reflection
  · T04 = 미니멀 (clean, lots of space) → 쉼/고요/short quiet phrases
  · T05 = 모던 워십 (atmospheric light) → 소망/예배/빛/회복
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

    const templates = analysis.templates?.length ? analysis.templates : ['T01', 'T03', 'T05'];
    const selectedTemplate = templateId || templates[templateIndex % templates.length];
    const config = TEMPLATE_CONFIGS[selectedTemplate] || TEMPLATE_CONFIGS['T01'];
    const fontMood = analysis.fontMood || 'editorial';
    const selectedFonts = config.fonts;
    const templateVariations: Record<string, string[]> = {
      // T01 붓글씨 선포 — 진한 배경 + 밝은 붓글씨
      T01: [
        'Antique-gold ink-brush lettering on a deep ink-navy (#16233a) background.',
        'Cream ink-brush lettering on a deep charcoal (#1f1f24) background.',
        'Cream ink-brush lettering on a deep wine-burgundy (#4a1f2a) background.',
        'Warm-gold ink-brush lettering on a deep oxblood-brown (#2a1813) background.',
        'Pale-gold ink-brush lettering on a near-black (#141414) background.',
        'Cream ink-brush lettering on a deep teal-charcoal (#143230) background.',
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
      // T03 에디토리얼 세리프 — 차분한 플랫 단색
      T03: [
        'Muted ivory (#efe9dd) flat background, elegant serif, subtle paper texture, magazine sophistication.',
        'Soft muted-stone (#cfc7b8) flat editorial background, calm and refined.',
        'Warm taupe (#b8a892) flat editorial background, restrained elegance.',
        'Muted sage-gray (#a7ad9f) flat editorial background, sophisticated stillness.',
        'Deep muted plum (#5a4658) flat editorial background with ivory serif.',
        'Dusty rose (#cbb0ad) flat editorial background, soft and refined.',
      ],
      // T04 미니멀 — 밝은 여백
      T04: [
        'Soft cream (#efe9dd) background, minimal with generous space.',
        'Warm off-white (#f3efe6) background with one tiny accent element.',
        'Pale sand (#e6dcc8) minimal background.',
        'Soft greige (#e0ddd6) minimal background.',
        'Light blush-ivory (#f0e7e2) minimal background.',
      ],
      // T05 모던 워십 — 매끈한 빛 그라데이션 (사진 X)
      T05: [
        'Smooth luminous indigo-to-warm-white gradient with a soft glow, spacious.',
        'Smooth soft violet-to-silver gradient, hazy and hopeful.',
        'Smooth deep-blue gradient with a gentle radiant center glow, uplifting.',
        'Smooth warm peach-to-cream gradient with soft light, gentle and modern.',
        'Smooth teal-to-soft-white gradient, calm and luminous.',
      ],
    };
    const variations = templateVariations[selectedTemplate] || templateVariations.T02;
    const variation = variations[Math.abs(templateIndex) % variations.length];
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
    // 깔끔한 모던 플랫 디자인 강제 + 촌스러운 AI 교회포스터 금지
    const personalizedBrief = [
      'This is a CLEAN, MODERN, DESIGN-FORWARD typography poster — premium editorial / contemporary graphic-design quality (think Pinterest design posters), NOT a photographic scene and NOT a church poster.',
      'STRICTLY AVOID the cheesy AI-Christian-poster look: NO dramatic stormy skies, NO lone windblown tree, NO golden sunrise light rays, NO glowing gold-on-black, NO 3D extruded / beveled / drop-shadow letters, NO fake-epic landscape photos, NO heavy grunge texture.',
      'Keep the background a CLEAN flat color or a very subtle gradient/texture as defined by the template. Let the beautiful typography be the whole design — modern, tasteful, restrained, premium.',
      analysis.palette ? `Optional palette inspiration (keep it refined): ${analysis.palette}.` : '',
    ].filter(Boolean).join('\n');
    // ── AI가 글자까지 그리는 모드 (기본 ON) ──
    const aiText = body.aiText !== false;
    const heroLine = safeLines.reduce((a, b) => ((b.scale || 1) > (a.scale || 1) ? b : a), safeLines[0] || { text: '', scale: 1 });
    const hierarchyHint = safeLines
      .map((l) => `"${l.text}"(${(l.scale || 1) >= 1.4 ? 'LARGE' : (l.scale || 1) <= 0.6 ? 'small caption' : 'medium'})`)
      .join(', ');
    // 템플릿마다 고정된 레터링 스타일 (한 템플릿 = 한 스타일, 일관성 유지)
    const letteringByTemplate: Record<string, string> = {
      T01: 'expressive Korean brush-calligraphy lettering with energetic, powerful ink strokes',
      T02: 'retro display lettering: a bold condensed display style for the main lines mixed with a flowing cursive SCRIPT for ONE key word, vintage character with tasteful grain',
      T03: 'elegant high-contrast SERIF lettering, refined magazine-editorial quality with an occasional italic word',
      T04: 'clean minimal sans lettering, calm and simple with generous space',
      T05: 'bold modern sans lettering, confident and luminous',
    };
    const letteringStyle = letteringByTemplate[selectedTemplate] || letteringByTemplate.T02;
    const aiTextBlock = [
      'RENDER THE KOREAN TEXT AS THE HERO TYPOGRAPHY, beautifully integrated into the poster (not a plain overlay).',
      `CRITICAL: spell every Korean character EXACTLY and legibly. Do NOT change, omit, add, or misspell any character. The full text is: "${safeLines.map((l) => l.text).join(' ')}".`,
      heroLine?.text ? `Dominant headline (largest): "${heroLine.text}".` : '',
      `Size hierarchy by line: ${hierarchyHint}.`,
      `Text alignment: ${layoutAlign}. Lettering style for this template: ${letteringStyle}. Make the typography beautiful and characterful, not a default font.`,
      'CRITICAL FIT: every line of text must stay fully INSIDE the frame with at least 8% empty margin on the left and right edges. The longest line must NOT touch or cross the edges — if needed, scale ALL the lettering down until the widest line fits comfortably with margin. Cropped/cut-off letters are a failure.',
      'Typography is the focal point and must dominate; integrate it cleanly with the background. Keep Korean spelling perfect. Do NOT add any words that are not in the text.',
    ].filter(Boolean).join('\n');
    const GLOBAL_WITH_TEXT = '\n\nClean, modern, design-forward faith poster (premium editorial / contemporary graphic design). Tasteful and restrained. STRICTLY AVOID a cheesy AI church-poster look — no dramatic stormy skies, no lone tree, no sunrise light rays, no gold-on-black glow, no 3D/beveled letters, no epic landscape photos. The Korean typography is accurate, legible, and the clear focal point.';

    const bgPromptFinal = [
      config.backgroundPrompt,
      config.styleLock,
      personalizedBrief,
      variation,
      moodHint,
      aiText ? aiTextBlock : layoutDirective,
      ratioPrompt,
      aiText ? GLOBAL_WITH_TEXT : GLOBAL_BG_PROMPT,
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
