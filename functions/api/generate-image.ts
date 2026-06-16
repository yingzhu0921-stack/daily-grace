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

// 공백을 무시하고 같은 문자열인지 (원문 보존 검증용)
const normalizeForCompare = (s: string) => s.replace(/\s+/g, '');

// GPT가 만든 lines가 사용자 원문을 그대로 보존하는지 검증. 아니면 안전한 폴백 레이아웃 생성.
function buildSafeLines(verse: string, gptLines: TypoLine[] | undefined): TypoLine[] {
  const original = verse.trim();
  if (Array.isArray(gptLines) && gptLines.length) {
    const joined = gptLines.map((l) => l?.text ?? '').join('');
    if (normalizeForCompare(joined) === normalizeForCompare(original)) {
      // 원문 보존됨 — scale 정규화 (0.4~2.4 범위로 클램프)
      return gptLines.map((l) => ({
        text: String(l.text ?? ''),
        scale: Math.max(0.4, Math.min(2.4, Number(l.scale) || 1)),
      }));
    }
  }
  // 폴백: 사용자가 입력한 줄바꿈 기준, 없으면 통짜 한 줄
  const fallback = original.split('\n').map((t) => t.trim()).filter(Boolean);
  const arr = fallback.length ? fallback : [original];
  return arr.map((text) => ({ text, scale: 1 }));
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

    const TEMPLATE_CONFIGS: Record<string, { backgroundPrompt: string; styleLock: string; fonts: { primary: string; secondary: string } }> = {
      'T01': {
        backgroundPrompt: 'Bold editorial poster aesthetic. Strong graphic composition, high contrast, museum-quality print design, powerful visual hierarchy, premium poster craftsmanship, confident visual energy. The background VISUALIZES the message itself — transformation looks like transformation, victory like victory, calling like calling, faith like action — purposeful, not decorative. Large typography-safe areas. Allow stronger contrast, deeper tones and dramatic lighting; avoid soft pastel dominance and weak visual energy.',
        styleLock: 'T01 ABSOLUTE RULE: the card must feel like a bold poster — strong, confident, declarative, memorable, with typography dominating. Must NOT feel like gentle devotional wallpaper, scrapbook, greeting card, or a generic inspirational / Christian background image (if it does, the template has failed). The background supports and reinforces the message; avoid decorative imagery and generic devotional aesthetics (flowers, butterflies, peaceful streams, decorative nature scenes) unless the message specifically requires them.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      'T03': {
        backgroundPrompt: 'Premium editorial photography with luxury magazine visual language. Sophisticated composition, intentional storytelling, elegant atmosphere, museum-quality art direction — feels like a high-end editorial feature or magazine cover, elevated visual storytelling (not a simple background, not minimal symbolism). Meaningful landscapes, symbolic environments, dramatic natural settings with a strong cinematic focal point. Rich but restrained palette: warm ivory, stone, sand, deep charcoal, muted earth tones — elegant rather than colorful. Large typography-safe negative space.',
        styleLock: 'T03 ABSOLUTE RULE: must feel like luxury editorial photography / premium magazine cover / sophisticated visual storytelling with thoughtful composition. Must NOT feel like stock devotional imagery, casual lifestyle photography, worship-concert artwork, scrapbook aesthetics, or simple wallpaper. The scene must originate from the user text\'s meaning — keep important symbols, imagery, locations and objects recognizable; do NOT reduce the message to abstract symbols or replace meaningful imagery with generic scenery (no generic sunsets, flower fields, beaches, clouds, or abstract light). Maintain a clear focal point occupying a meaningful portion of the frame, avoid clutter and decorative elements, keep generous space for typography — image and typography stay balanced, neither overpowering the other.',
        fonts: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
      },
      'T09': {
        backgroundPrompt: 'Contemporary worship aesthetic — light-driven atmosphere, NOT scenery. Volumetric light, soft haze, atmospheric depth, subtle glow, premium cinematic lighting. Spacious, hopeful, emotionally uplifting; emotion before scenery — quiet but powerful, minimal but immersive. Use color as atmosphere, not decoration: deep indigo, midnight blue, soft violet, warm white, silver light, with sparing rose glow or muted lavender. Large typography-safe negative space.',
        styleLock: 'T09 ABSOLUTE RULE: must feel like modern worship creative / premium album artwork / cinematic atmosphere of light and presence — communicate emotion through atmosphere, not decoration. Must NOT feel like wallpaper, floral background, stock nature image, Instagram quote background, or church event poster. The scene comes from the text\'s meaning; the template only controls lighting, atmosphere, color and rendering. Avoid making every image a sunset / purple sky / ocean / flowers; avoid rainbow gradients, candy colors, oversaturated pinks, neon, and repeated motifs. Focus on atmosphere, not objects.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      'T13': {
        backgroundPrompt: 'Warm and intimate atmosphere — a small moment of grace within an ordinary day. Soft morning light, gentle natural colors (warm cream, soft beige, honey gold, warm white, muted earth tones), subtle textures. Personal and relatable, comforting and familiar; quiet beauty found in everyday life. Large typography-safe negative space. Feel personal, not grand.',
        styleLock: 'T13 ABSOLUTE RULE: must feel like gratitude / warmth / comfort / closeness / everyday grace — personal and relatable, beautifully ordinary. Must NOT feel like a luxury magazine (T03), worship album artwork (T09), an inspirational poster, stock devotional wallpaper, or dramatic scenery. The scene comes from the user text\'s meaning, preferring the more personal/intimate/relatable interpretation (literal, symbolic, emotional, or experiential). LAYOUT DIVERSITY: avoid always using beaches, flower fields, sunsets, mountains, or identical indoor scenes; vary environments, seasons, textures and lighting — no single visual solution dominates. Avoid epic landscapes, fantasy, dramatic symbolism, heroic imagery, worship-concert looks, luxury editorial styling, poster compositions, excessive effects, and generic inspirational wallpapers.',
        fonts: { primary: 'PaperLight', secondary: 'SeoulHangang' },
      },
      'T17': {
        backgroundPrompt: 'PURE BEIGE. Flat warm beige or sand background. Extremely minimal. Japanese wabi-sabi aesthetic. Almost no objects — only the faintest suggestion of texture or shadow. Maximum negative space. Neutral muted tones only. Clean and sparse. NO dramatic lighting. NO strong shadows. NO objects. NO color. Near-empty composition.',
        styleLock: 'T17 ABSOLUTE RULE: pure beige/sand, near-empty, extreme minimalism. Any dramatic element or strong color = template failure.',
        fonts: { primary: 'PaperLight', secondary: 'SeoulHangang' },
      },
      'T20': {
        backgroundPrompt: 'STRONG WINDOW LIGHT AND SHADOWS. Dramatic natural sunlight streaming through a window. Clear shadow patterns cast on a surface — organic, geometric, or plant-shadow. Warm golden hour light. High contrast between light and shadow areas. Photographic realism. Contemplative quiet room. NO flat backgrounds. NO gradients. Must have visible, beautiful shadow patterns.',
        styleLock: 'T20 ABSOLUTE RULE: must have actual window light with clear shadow patterns, photographic realism, cinematic contrast. Flat or gradient backgrounds = template failure.',
        fonts: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
      },
    };

    const TEMPLATE_FONT_OPTIONS: Record<string, Record<string, { primary: string; secondary: string }>> = {
      // T01 Bold Poster — Primary: KBLJump·GangwonTunTun·PaperBlack / Secondary: Taenada·Cafe24SuperMagic
      T01: {
        bold: { primary: 'KBLJump', secondary: 'PaperLight' },
        editorial: { primary: 'PaperBlack', secondary: 'PaperLight' },
        lyrical: { primary: 'Taenada', secondary: 'PaperLight' },
        quiet: { primary: 'GangwonTunTun', secondary: 'PaperLight' },
        handwritten: { primary: 'Cafe24SuperMagic', secondary: 'PaperLight' },
        modern: { primary: 'GangwonTunTun', secondary: 'PaperLight' },
      },
      // T03 Editorial Magazine — Primary: RidiBatang·PaperLight / Secondary: SeoulHangang (Limelight=영문 전용)
      T03: {
        bold: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        editorial: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        lyrical: { primary: 'PaperLight', secondary: 'SeoulHangang' },
        quiet: { primary: 'PaperLight', secondary: 'SeoulHangang' },
        handwritten: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        modern: { primary: 'PaperLight', secondary: 'SeoulHangang' },
      },
      // T09 Light & Presence — Primary: PaperBlack·Taenada / Secondary: RidiBatang·PaperLight
      T09: {
        bold: { primary: 'PaperBlack', secondary: 'PaperLight' },
        editorial: { primary: 'PaperBlack', secondary: 'PaperLight' },
        lyrical: { primary: 'Taenada', secondary: 'PaperLight' },
        quiet: { primary: 'RidiBatang', secondary: 'PaperLight' },
        handwritten: { primary: 'Taenada', secondary: 'PaperLight' },
        modern: { primary: 'Taenada', secondary: 'PaperLight' },
      },
      // T13 Daily Grace — Primary: PaperLight·SeoulHangang·JeonnamBarun / Secondary: Hyunok·RidiBatang
      T13: {
        bold: { primary: 'JeonnamBarun', secondary: 'SeoulHangang' },
        editorial: { primary: 'PaperLight', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'RidiBatang', secondary: 'PaperLight' },
        handwritten: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        modern: { primary: 'JeonnamBarun', secondary: 'SeoulHangang' },
      },
      // T17 Beige Minimal — 깔끔한 고딕 미니멀
      T17: {
        bold: { primary: 'PaperBlack', secondary: 'PaperLight' },
        editorial: { primary: 'JeonnamBarun', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'PaperLight', secondary: 'SeoulHangang' },
        handwritten: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
        modern: { primary: 'GangwonModoo', secondary: 'PaperLight' },
      },
      // T20 Light & Shadow — 세리프/명조 + 손글씨 잔잔
      T20: {
        bold: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        editorial: { primary: 'Keris', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'SeoulHangang', secondary: 'PaperLight' },
        handwritten: { primary: 'Incheon', secondary: 'SeoulHangang' },
        modern: { primary: 'Keris', secondary: 'SeoulHangang' },
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
          content: `You are an art director for "Daily Grace" faith cards. Work in this order: (1) analyze the message meaning, (2) decide the typography hierarchy, (3) plan the layout, (4) describe a background that ADAPTS to that typography and message. Typography and meaning drive the design; the background adapts to the text layout, never the other way around. The card's HERO is the user's text as poster typography. Return JSON only:
{"lines":[{"text":"","scale":1}],"textAlign":"center","useBrush":false,"mood":"","templates":["T01","T03","T17"],"backgroundConcept":"","visualMotifs":[""],"palette":"","lighting":"","composition":"","typographyTone":"","fontMood":"bold","avoidImagery":[""]}

ABSOLUTE TEXT RULE — rearrange the presentation freely, never modify the words:
- BEFORE describing the background, plan the typography: identify key phrases, the dominant idea, and supporting text, then build the hierarchy and layout.
- You MAY freely redesign line breaks, grouping, emphasis, per-line size, hierarchy, alignment, positioning, and composition to maximize impact and readability. Rearranging the PRESENTATION is encouraged.
- You may NOT change, summarize, paraphrase, translate, shorten, reorder, add, or remove any word. The words and their reading order stay identical.
- "lines" MUST reproduce the user's input EXACTLY in order. Concatenating every line's "text" (ignoring spaces) must equal the user's input (ignoring spaces). If unsure, put the whole input as one line.
- Do NOT add a Bible reference or any text the user did not type.

TYPOGRAPHY (lines + scale) — text is the hero, make it feel designed, not merely placed:
- Split the input into poster-style lines. Encourage dramatic line breaks, oversized keywords, asymmetric hierarchy, dynamic spacing, large negative space. Avoid centering everything, identical sizing, tiny text, or decorative typography without purpose.
- "scale" is each line's relative size: dominant headline ≈ 1.7–2.3, key phrase ≈ 1.4–1.7, normal/connective ≈ 0.85–1.0, Bible reference / caption ≈ 0.35–0.55.
- THINK IN VISUAL BLOCKS, NOT SENTENCES: do not just split text at sentence boundaries or wrap it. A dominant phrase may span multiple lines; a single important word may become its own line. Typography should feel designed, with rhythm and emphasis.
- INTERNAL HIERARCHY: even within one phrase, separate key words / dominant concepts from supporting words and size them differently. Typography should communicate meaning, not merely display text.
- MANDATORY HIERARCHY — never output all lines at the same scale: every card MUST have clear size contrast. Pick the 1–2 most meaningful phrases and make them clearly the largest; shrink connective/intro words and any reference. If you find yourself giving everything ~1.0, you are wrong — choose what matters most and enlarge it.
- Length adapts but hierarchy is ALWAYS required:
  · SHORT → one giant hero line.
  · MEDIUM → 1–2 big key lines, supporting lines smaller.
  · LONG → still enlarge the 1–2 most important phrases (≈1.5–1.9), keep connective lines smaller (≈0.85), and put any reference at ≈0.45. Break the text into meaningful phrase-groups, not even paragraph blocks.
- A Bible reference is METADATA (a caption/signature), never the main message — keep it at ≈0.35–0.55 and never let it compete with the message.
- Example for a long verse "[고후5:17] 그런즉 누구든지 그리스도 안에 있으면 새로운 피조물이라 이전 것은 지나갔으니 보라 새 것이 되었도다": reference "[고후5:17]" scale 0.45, "그런즉 누구든지 그리스도 안에 있으면" scale 0.9, "새로운 피조물이라" scale 1.8, "이전 것은 지나갔으니" scale 0.9, "보라 새 것이 되었도다" scale 1.8 (exact words unchanged, only grouped and resized).
- "textAlign": "left" for bold/declarative/asymmetric feel, "center" for calm/gentle verses.
- "useBrush": true selectively for short text with strong declaration/conviction/proclamation energy (e.g. 강하고 담대하라 / 나는 주님의 군대! / 두려워 말라). false for meditative or peaceful text. Use sparingly, not every time.

VARIETY (important): Do NOT default to one composition. For similar messages, vary the line breaks, alignment, scale relationships, hierarchy, font mood, and background structure so each card feels intentionally art-directed and distinct.

SCENE PRINCIPLE — VISUALIZE THE MEANING, NOT THE RELIGION:
- Do NOT visualize "Christianity". Visualize what THIS specific message means. Do not ask "what does Christianity look like?" — ask "what does this exact sentence mean?". The backgroundConcept must emerge from the user's message itself.
- MEANING BEFORE MOOD: first identify the symbols, imagery, metaphors, locations, actions, themes and emotional direction in the text; only then choose the scene. Do not reduce every message to generic positive emotions/atmosphere.
- SYMBOL PRESERVATION: when meaningful imagery exists in the text, preserve it and let strong symbols drive the scene — interpreted literally, symbolically, environmentally, or emotionally. Goal: meaningful visual translation, not literal illustration.
- FRESH INTERPRETATION: many valid images exist for one message — do not chase a single "correct" image; pick a fresh, specific interpretation and avoid reusing the same metaphor for similar messages.
- AVOID GENERIC CHRISTIAN DEFAULTS: never auto-default to flowers, butterflies, rivers, beaches, sunsets, mountains, clouds, or abstract sunlight unless they are genuinely connected to this message. These must NOT be your fallback solution.
- The template only sets visual style / composition / atmosphere / lighting / rendering — it does NOT decide the scene. The same message may look different across templates while preserving its core meaning.

- mood: one of 담대함/선포/믿음/승리/소망/회복/빛/예배/평안/은혜/쉼/QT/감사/일상/묵상/기도/고요함
- templates: exactly 3 IDs from T01,T03,T09,T13,T17,T20 best matching the mood
- fontMood: one of bold/editorial/lyrical/quiet/handwritten/modern. Choose by emotional tone, message intent, text length and composition — never randomly, and avoid always using the same mood for similar messages:
  · Strong / declaration → bold (PaperBlack/KBLJump/GangwonTunTun)
  · Grace / peace / reflection → editorial or quiet (RidiBatang/PaperLight/SeoulHangang)
  · Joy / worship / gratitude → lyrical (Taenada/Hyunok/Kkubullim)
  · Daily journal / QT → modern (JeonnamBarun/PaperLight/SeoulHangang)
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

    const templates = analysis.templates?.length ? analysis.templates : ['T01', 'T03', 'T09'];
    const selectedTemplate = templateId || templates[templateIndex % templates.length];
    const config = TEMPLATE_CONFIGS[selectedTemplate] || TEMPLATE_CONFIGS['T01'];
    const fontMood = analysis.fontMood && TEMPLATE_FONT_OPTIONS[selectedTemplate]?.[analysis.fontMood]
      ? analysis.fontMood
      : 'editorial';
    const selectedFonts = TEMPLATE_FONT_OPTIONS[selectedTemplate]?.[fontMood] || config.fonts;
    const templateVariations: Record<string, string[]> = {
      T01: [
        'COLOR: Deep navy (#1b2a4a) background with warm ivory (#efe6d2) negative space. Editorial navy poster, strong calm contrast.',
        'COLOR: Charcoal (#2b2b2e) background with muted gold (#b9975b) accents. Premium charcoal and gold poster.',
        'COLOR: Deep forest green (#1f3a2c) background with cream (#efe7d6). Rich dark-green editorial poster.',
        'COLOR: Black ink (#161513) on aged paper (#e7dcc4) texture. Inky letterpress poster mood.',
        'COLOR: Dark brown (#2e241c) background with warm beige (#e3d4bd). Earthy premium editorial poster.',
      ],
      T03: [
        'Editorial wide shot with a single strong focal subject and cinematic framing, warm ivory and stone, magazine-cover sophistication.',
        'Dramatic natural setting rendered as a premium editorial feature, muted earth tones, intentional composition and depth.',
        'Symbolic environment with refined art direction and a clear focal point, deep charcoal accents over sand tones, elegant restraint.',
        'Cinematic landscape framed like a luxury magazine spread, soft directional light, rich but restrained palette, generous negative space.',
        'Atmospheric editorial scene with strong visual hierarchy and a meaningful focal element, stone and warm ivory, sophisticated stillness.',
      ],
      T09: [
        'Volumetric light beams cutting through soft haze, deep indigo into warm white, spacious and luminous, large empty center.',
        'Atmospheric depth with faint floating light particles, midnight blue with a quiet silver glow, immersive stillness.',
        'Soft diffused glow across an open dark space, muted lavender and warm white, hopeful and weightless.',
        'Cinematic side light through gentle mist, deep indigo with a faint rose glow, emotional and uplifting.',
        'Luminous light blooming in fog, silver and soft violet, minimal and powerful negative space.',
      ],
      T13: [
        'A small everyday moment in soft morning light on a simple home surface, warm cream tones, intimate and quiet.',
        'Gentle daylight across an ordinary desk or kitchen corner, honey-gold warmth on humble objects, relatable and comforting.',
        'A quiet seasonal detail of daily life, soft texture and warm white light, personal and unhurried.',
        'Warm muted earth tones in a familiar indoor nook, gentle shadows, beautifully ordinary stillness.',
        'Soft natural light on a humble everyday scene, comforting beige palette, generous space for text.',
      ],
      T17: [
        'Minimal beige editorial scene, restrained natural shadow, clean premium simplicity.',
        'Warm neutral paper field, Japanese minimal balance, soft tactile grain.',
        'Calm beige composition with subtle tonal variation, very sparse and contemplative.',
      ],
      T20: [
        'Sunlight through a window casting quiet organic shadows, contemplative room atmosphere.',
        'Soft side light and gentle shadow pattern, warm stillness, meditative negative space.',
        'Window-lit surface with nuanced shadow, quiet prayer-room mood, uncluttered center.',
      ],
    };
    const variations = templateVariations[selectedTemplate] || templateVariations.T13;
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
    const personalizedBrief = [
      `Personalized content brief based on the user's Korean text: "${verse?.trim() || safeLines.map((l) => l.text).join(' ')}".`,
      analysis.backgroundConcept ? `Core background concept: ${analysis.backgroundConcept}` : '',
      analysis.visualMotifs?.length ? `Subtle visual motifs to weave in: ${analysis.visualMotifs.join(', ')}.` : '',
      analysis.palette ? `Personalized palette: ${analysis.palette}.` : '',
      analysis.lighting ? `Lighting: ${analysis.lighting}.` : '',
      analysis.composition ? `Composition: ${analysis.composition}.` : '',
      analysis.typographyTone ? `Typography mood to support later overlay: ${analysis.typographyTone}.` : '',
      analysis.avoidImagery?.length ? `Avoid these generic/cliche visuals unless essential: ${analysis.avoidImagery.join(', ')}.` : '',
      'The background must feel meaningfully connected to the specific words, not interchangeable.',
      'Visualize the specific MEANING of these words, not generic Christianity. Do NOT default to flowers, butterflies, rivers, beaches, sunsets, mountains, clouds, or abstract sunlight unless this exact message truly calls for them.',
      'Use metaphorical, atmospheric, or symbolic imagery rather than literal religious stock imagery.',
    ].filter(Boolean).join('\n');
    const bgPromptFinal = [
      config.backgroundPrompt,
      config.styleLock,
      personalizedBrief,
      variation,
      moodHint,
      layoutDirective,
      ratioPrompt,
      GLOBAL_BG_PROMPT,
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
