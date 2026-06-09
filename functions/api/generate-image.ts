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

type AutoCardAnalysis = {
  mainPhrase: string;
  secondaryPhrase: string;
  reference: string;
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
};

async function gpt(apiKey: string, messages: any[], maxTokens = 500): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens }),
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
    const { verse, templateIndex = 0, cachedAnalysis, templateId } = body;
    const requestedRatio = typeof ratio === 'string' && ratioToSize[ratio] ? ratio : '4:5';
    if (!verse?.trim() && !cachedAnalysis) return Response.json({ error: '말씀을 입력해주세요.' }, { status: 400 });

    const TEMPLATE_CONFIGS: Record<string, { backgroundPrompt: string; styleLock: string; fonts: { primary: string; secondary: string } }> = {
      'T01': {
        backgroundPrompt: 'Bold editorial poster aesthetic. Strong graphic composition. High contrast. Museum-quality print design. Heavy paper grain texture. Large typography-safe area. Powerful and confident visual energy.',
        styleLock: 'T01 ABSOLUTE RULE: bold poster energy, strong contrast, graphic confidence, premium print quality. Soft pastel or gentle devotional aesthetics = template failure.',
        fonts: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      'T03': {
        backgroundPrompt: 'IVORY AND WARM CREAM TONES ONLY. Soft off-white to light beige palette. Luxury editorial magazine aesthetic. Premium ivory paper with delicate photographic shadows. Elegant natural lighting. High-end fashion magazine atmosphere. NO strong colors. NO dark backgrounds. NO gradients. Sophisticated and quiet.',
        styleLock: 'T03 ABSOLUTE RULE: ivory/cream only, photographic soft shadow quality, magazine luxury, no bold colors, no dark backgrounds. Must feel like an expensive editorial print.',
        fonts: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
      },
      'T09': {
        backgroundPrompt: 'BOLD COLOR GRADIENT REQUIRED. Deep purple transitioning to soft pink and blue. Luminous glow effects. Contemporary worship album cover energy. Rich saturated colors. Soft light bloom. Cinematic color atmosphere. Modern Christian creative direction. NO paper textures. NO beige. NO black and white. Must be visually vibrant and colorful.',
        styleLock: 'T09 ABSOLUTE RULE: must have rich color gradient (purple/pink/blue), glowing atmosphere, album-cover energy. Beige or paper textures = template failure.',
        fonts: { primary: 'Taenada', secondary: 'PaperLight' },
      },
      'T13': {
        backgroundPrompt: 'WARM GOLDEN MORNING LIGHT. Soft cream and golden yellow tones. Cozy notebook or journal paper texture with visible grain. Gentle morning sunlight from the side. Handcrafted devotional atmosphere. Warm amber and honey tones. Intimate and personal feeling. Large empty space. NO cool tones. NO dark colors. NO bold graphics.',
        styleLock: 'T13 ABSOLUTE RULE: warm golden/cream morning light, tactile journal paper texture, cozy intimate mood. Cool tones or dark backgrounds = template failure.',
        fonts: { primary: 'Hyunok', secondary: 'SeoulHangang' },
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
      T01: {
        bold: { primary: 'PaperBlack', secondary: 'PaperLight' },
        editorial: { primary: 'PaperBlack', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Taenada', secondary: 'PaperLight' },
        quiet: { primary: 'GangwonTunTun', secondary: 'PaperLight' },
        handwritten: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
        modern: { primary: 'PaperBlack', secondary: 'PaperLight' },
      },
      T03: {
        bold: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        editorial: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'SeoulHangang', secondary: 'PaperLight' },
        handwritten: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
        modern: { primary: 'JeonnamBarun', secondary: 'SeoulHangang' },
      },
      T09: {
        bold: { primary: 'Taenada', secondary: 'PaperLight' },
        editorial: { primary: 'PaperBlack', secondary: 'PaperLight' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'PaperLight', secondary: 'SeoulHangang' },
        handwritten: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
        modern: { primary: 'Taenada', secondary: 'PaperLight' },
      },
      T13: {
        bold: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        editorial: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'SeoulHangang', secondary: 'PaperLight' },
        handwritten: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
        modern: { primary: 'JeonnamBarun', secondary: 'SeoulHangang' },
      },
      T17: {
        bold: { primary: 'PaperBlack', secondary: 'PaperLight' },
        editorial: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'PaperLight', secondary: 'SeoulHangang' },
        handwritten: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
        modern: { primary: 'JeonnamBarun', secondary: 'SeoulHangang' },
      },
      T20: {
        bold: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        editorial: { primary: 'RidiBatang', secondary: 'SeoulHangang' },
        lyrical: { primary: 'Hyunok', secondary: 'SeoulHangang' },
        quiet: { primary: 'SeoulHangang', secondary: 'PaperLight' },
        handwritten: { primary: 'Kkubullim', secondary: 'SeoulHangang' },
        modern: { primary: 'JeonnamBarun', secondary: 'SeoulHangang' },
      },
    };

    const GLOBAL_BG_PROMPT = '\n\nCreate a premium Christian typography card background. No text. No letters. No words. No typography. No logos. Large negative space for text overlay. Editorial design quality. Modern premium aesthetic. Clean composition. Soft cinematic lighting. High-end card design. Subtle texture. Text-safe layout. Important visual elements should not occupy the center typography area. Background only.';

    let analysis: AutoCardAnalysis;
    if (cachedAnalysis?.templates?.length) {
      analysis = cachedAnalysis;
    } else {
      const raw = await gpt(env.OPENAI_API_KEY, [
        {
          role: 'system',
          content: `You analyze user-provided Korean faith text for card design. Return JSON only:
{"mainPhrase":"","secondaryPhrase":"","reference":"","mood":"","templates":["T01","T03","T17"],"backgroundConcept":"","visualMotifs":[""],"palette":"","lighting":"","composition":"","typographyTone":"","fontMood":"bold","avoidImagery":[""]}
CRITICAL: Extract only from the user's input. Never invent, complete, or add Bible text that is not in the input.
- mainPhrase: 2-6 word key phrase extracted directly from the user's input (most impactful part)
- secondaryPhrase: remaining supporting phrase extracted from the user's input, or empty string if nothing left to extract
- reference: Bible reference if explicitly present in the input (e.g. "시편 23:1"), otherwise empty string
- mood: one of 담대함/선포/믿음/승리/소망/회복/빛/예배/평안/은혜/쉼/QT/감사/일상/묵상/기도/고요함
- templates: exactly 3 IDs from T01,T03,T09,T13,T17,T20 best matching the mood
- backgroundConcept: one sentence in English describing a beautiful personalized background scene inspired by the meaning, not a generic church card
- visualMotifs: 3-5 concrete but subtle visual motifs in English, inferred from the text's meaning
- palette: refined color direction in English, personalized to the text
- lighting: lighting direction in English
- composition: composition direction in English, including where important objects should sit so the center remains readable
- typographyTone: English typography direction matching the emotional tone
- fontMood: one of bold/editorial/lyrical/quiet/handwritten/modern
- avoidImagery: generic or cliché imagery to avoid. Avoid obvious crosses, church buildings, Bibles, doves, and hands unless the user's text explicitly mentions them.
Design should feel premium, poetic, and personally connected to the user's words while remaining beautiful and uncluttered.`,
        },
        { role: 'user', content: verse.trim() },
      ], 700);
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
      } catch {
        return Response.json({ error: '말씀 분석에 실패했습니다.' }, { status: 500 });
      }
    }

    const templates = analysis.templates?.length ? analysis.templates : ['T01', 'T03', 'T09'];
    const selectedTemplate = templateId || templates[templateIndex % templates.length];
    const config = TEMPLATE_CONFIGS[selectedTemplate] || TEMPLATE_CONFIGS['T01'];
    const fontMood = analysis.fontMood && TEMPLATE_FONT_OPTIONS[selectedTemplate]?.[analysis.fontMood]
      ? analysis.fontMood
      : 'editorial';
    const selectedFonts = TEMPLATE_FONT_OPTIONS[selectedTemplate]?.[fontMood] || config.fonts;
    const templateVariations: Record<string, string[]> = {
      T01: [
        'COLOR: Deep navy blue (#1a2744) dominant background. Off-white negative space. Strong navy and white contrast. Bold editorial navy poster.',
        'COLOR: Deep forest green (#1c3a2a) dominant background. Cream and gold accents. Rich dark green editorial poster quality.',
        'COLOR: Dark charcoal (#2a2a2a) with warm gold (#c9a84c) accent highlights. Charcoal and gold premium poster aesthetic.',
      ],
      T03: [
        'Soft ivory editorial spread, delicate fabric-like shadow, high-end devotional magazine mood.',
        'Warm natural shadow on premium paper, understated luxury, quiet negative space.',
        'Elegant cream surface with subtle depth, refined print design, serene visual balance.',
      ],
      T09: [
        'Deep worship gradient with soft light bloom, cinematic but uncluttered, center-safe.',
        'Modern worship album-cover atmosphere, luminous color field, subtle depth and glow.',
        'Contemporary praise-night palette, gentle radiant haze, clean typography-safe center.',
      ],
      T13: [
        'Quiet journaling paper, soft notebook texture, warm morning light, handcrafted devotional mood.',
        'Cream journal page with gentle imperfections, cozy reflection atmosphere, lots of empty space.',
        'Soft paper grain and faint desk-light shadow, intimate daily grace journaling feeling.',
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
    const personalizedBrief = [
      `Personalized content brief based on the user's Korean text: "${verse?.trim() || analysis.mainPhrase}".`,
      analysis.backgroundConcept ? `Core background concept: ${analysis.backgroundConcept}` : '',
      analysis.visualMotifs?.length ? `Subtle visual motifs to weave in: ${analysis.visualMotifs.join(', ')}.` : '',
      analysis.palette ? `Personalized palette: ${analysis.palette}.` : '',
      analysis.lighting ? `Lighting: ${analysis.lighting}.` : '',
      analysis.composition ? `Composition: ${analysis.composition}.` : '',
      analysis.typographyTone ? `Typography mood to support later overlay: ${analysis.typographyTone}.` : '',
      analysis.avoidImagery?.length ? `Avoid these generic/cliche visuals unless essential: ${analysis.avoidImagery.join(', ')}.` : '',
      'The background must feel meaningfully connected to the specific words, not interchangeable.',
      'Use metaphorical, atmospheric, or symbolic imagery rather than literal religious stock imagery.',
    ].filter(Boolean).join('\n');
    const bgPromptFinal = [
      config.backgroundPrompt,
      config.styleLock,
      personalizedBrief,
      variation,
      moodHint,
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
      mainPhrase: analysis.mainPhrase,
      secondaryPhrase: analysis.secondaryPhrase,
      reference: analysis.reference,
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
