import { getSessionUser } from './_lib/session';
import type { Env } from './_lib/db';

interface ExtendedEnv extends Env {
  OPENAI_API_KEY: string;
}

const NO_TEXT = 'IMPORTANT: NO text, letters, words, or writing of any kind in the image.';
const NO_FACES = 'NO human faces, portraits, or close-up characters.';
const CARD_BG = 'The image will be used as a card background — leave visual breathing room for text overlay. Keep the composition calm and uncluttered.';

const stylePrompts: Record<string, string> = {
  '맑은 수채화': `Peaceful watercolor landscape: \${input}. Soft transparent washes, gentle brush strokes, pastel colors, dreamy atmosphere. Pure nature scene only — NO people, NO animals, NO characters, NO faces. ${NO_TEXT} ${CARD_BG}`,
  '따스한 동화': `Hand-drawn children's book illustration of \${input}. Colored pencil texture on paper, warm soft palette, whimsical cozy atmosphere. Scene-only — NO human faces or portraits, soft character shapes allowed only if small and non-dominant. ${NO_TEXT} ${CARD_BG}`,
  '감성 사진': `Soft aesthetic photograph of \${input}. Gentle natural light, dreamy bokeh, pastel tones, airy and peaceful mood. NO people in foreground. ${NO_TEXT} ${NO_FACES} ${CARD_BG}`,
  '심플 낙서': `Minimalist black ink line drawing of \${input} on a clean white background. Simple whimsical doodle style, no shading, no fill color, essential lines only. ${NO_TEXT} NO letters, NO numbers, NO symbols. ${CARD_BG}`,
  '말랑 3D': `Cute 3D claymation render of \${input}. Soft clay/felt textures, rounded shapes, pastel colors, clean simple background. ${NO_TEXT} ${NO_FACES} ${CARD_BG}`,
  '빈티지 필름': `Retro analog film photo of \${input}. Film grain, light leaks, warm washed-out tones, nostalgic 90s feel, soft vignette. ${NO_TEXT} ${NO_FACES} ${CARD_BG}`,
};

const styleDescriptions: Record<string, string> = {
  '맑은 수채화': '부드러운 붓 터치와 투명한 워시 효과, 파스텔 컬러의 수채화 스타일',
  '따스한 동화': '손으로 그린 동화책 일러스트, 색연필 질감의 따뜻하고 포근한 스타일',
  '감성 사진': '부드러운 자연광과 따뜻한 색감의 감성적인 사진 스타일',
  '심플 낙서': '심플한 라인아트의 손그림 두들 스타일',
  '말랑 3D': '부드럽고 귀여운 3D 렌더링 스타일',
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
  const { action, prompt, style, ratio } = body;

  if (!env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

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
      `This is a faith-based card. Add the following text beautifully and naturally to this image: "${text}". ` +
      `Requirements: 1) Place the text where it's most readable and aesthetically harmonious with the composition. ` +
      `2) Choose a text color that contrasts well with the background (white or dark depending on the image). ` +
      `3) Use elegant, clean typography. ` +
      `4) If the text is long, break it into natural lines. ` +
      `5) Keep the original photo as the background without major alterations. ` +
      `6) The result should look like a beautiful inspirational card.`
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
        content: `당신은 말씀카드 배경 이미지를 위한 장면 설명 전문가입니다.
다음 규칙을 반드시 지켜 150자 이내 한국어로 작성하세요:
1. 배경 이미지이므로 위에 텍스트가 올라갑니다 — 여백이 충분하고 시각적으로 차분한 구도
2. 인물 얼굴, 초상화, 텍스트/글자는 절대 포함하지 마세요
3. 조명, 색감, 분위기를 구체적으로 묘사하세요
4. 신앙적 감성(평온, 소망, 위로, 감사)이 느껴지는 자연 또는 추상적 장면
5. 너무 복잡하거나 바쁜 구도는 피하세요`,
      },
      { role: 'user', content: `장면 키워드: "${scene}"\n스타일: ${styleDesc}\n\n이 키워드를 말씀카드 배경에 적합한 구체적인 장면 설명으로 확장해주세요.` },
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
    const finalPrompt = styleTemplate.replace('${input}', translated);
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
