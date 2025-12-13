import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Retry helper function with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.ok || response.status !== 429) {
      return response;
    }

    // If rate limited and not last attempt, wait and retry
    if (i < maxRetries - 1) {
      const waitTime = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s (더 빠름)
      console.log(`Rate limited (attempt ${i + 1}/${maxRetries}), retrying in ${waitTime / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  return fetch(url, options); // Return final attempt
}

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 10;
const rateLimit = new Map<string, { count: number; resetAt: number }>();

serve(async (req) => {
  // Handle CORS preflight requests - CRITICAL
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // 인증 확인 (optional)
    const authHeader = req.headers.get('Authorization');
    let userId = null;

    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    }

    // Rate limiting (only if authenticated)
    if (userId) {
      const now = Date.now();
      const userLimit = rateLimit.get(userId);

      if (userLimit) {
        if (now < userLimit.resetAt) {
          if (userLimit.count >= MAX_REQUESTS_PER_HOUR) {
            return new Response(
              JSON.stringify({ error: '시간당 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          userLimit.count++;
        } else {
          rateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        }
      } else {
        rateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
      }
    }

    const { action, prompt, style, ratio } = await req.json();

    // 입력 검증
    if (!action || (action !== 'expand-prompt' && action !== 'generate-image')) {
      return new Response(
        JSON.stringify({ error: '올바른 액션을 지정해주세요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if ((!prompt || typeof prompt !== 'string') && (!style || typeof style !== 'string')) {
      return new Response(
        JSON.stringify({ error: '프롬프트나 스타일을 선택해주세요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (prompt && prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: '프롬프트는 2000자 이하로 입력해주세요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');

    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 스타일별 설명
    const styleDescriptions: Record<string, string> = {
      '맑은 수채화': '부드러운 붓 터치와 투명한 워시 효과, 파스텔 컬러가 자연스럽게 블렌딩되는 수채화 스타일',
      '따스한 동화': '손으로 그린 듯한 동화책 일러스트, 색연필 특유의 부드러운 질감과 스트로크, 따뜻하고 포근한 색감',
      '감성 사진': '부드러운 자연광과 따뜻한 대지색이 어우러진 감성적인 사진, 필름 그레인과 부드러운 포커스가 있는 아날로그 감성',
      '심플 낙서': '심플하고 장난스러운 라인아트의 손그림 두들 스타일, 미니멀한 흑백 스케치',
      '말랑 3D': '부드럽고 귀여운 3D 렌더링 스타일, 파스텔 톤의 밝고 경쾌한 분위기',
      '빈티지 필름': '빈티지 필름 특유의 그레인과 따뜻한 색감, 부드러운 비네팅이 있는 아날로그 사진 스타일'
    };

    // 프롬프트 확장 액션
    if (action === 'expand-prompt') {
      const userScene = prompt?.trim() || '평화로운 풍경';
      const styleDesc = style ? styleDescriptions[style] || '아름답고 평화로운 스타일' : '아름답고 평화로운 스타일';

      console.log('Expanding prompt for scene:', userScene, 'with style:', styleDesc);

      const expandResponse = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `"${userScene}" 장면을 ${styleDesc} 스타일로 상세히 묘사해주세요. 조명, 색감, 분위기를 포함하여 200자 이내로 작성하세요. 설명만 작성하고 다른 말은 하지 마세요.`
              }]
            }],
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 512,
            }
          }),
        }
      );

      if (!expandResponse.ok) {
        const errorText = await expandResponse.text();
        console.error('Expand prompt error:', expandResponse.status, errorText);

        if (expandResponse.status === 429) {
          return new Response(
            JSON.stringify({ error: 'API 요청 한도를 초과했습니다. 잠시 후(1-2분) 다시 시도해주세요.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: `프롬프트 확장 실패: ${expandResponse.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const expandData = await expandResponse.json();
      console.log('Expand response:', JSON.stringify(expandData, null, 2));

      const expandedText = expandData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!expandedText) {
        console.error('No content in expand response:', expandData);
        return new Response(
          JSON.stringify({ error: '프롬프트를 확장할 수 없습니다' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully expanded prompt:', expandedText);

      return new Response(
        JSON.stringify({ expandedPrompt: expandedText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 이미지 생성 액션
    if (action === 'generate-image') {
      // 스타일 기본 프롬프트 (상세한 스타일 정의)
      const stylePrompts: Record<string, string> = {
        '맑은 수채화': 'A serene watercolor painting of ${input}, featuring soft brush strokes with transparent wash effects, delicate color blending, and gentle gradients. Natural landscape or botanical study style with realistic proportions, pastel color palette, subtle paper texture. Peaceful and calming atmosphere, traditional watercolor technique on white paper background. MUST be a pure landscape or nature scene - absolutely NO characters, NO faces, NO cartoons, NO animals with faces, NO chibi style, NO kawaii elements. Realistic watercolor art style only.',
        '따스한 동화': 'Heartwarming hand-drawn illustration of ${input}, style of a children\'s picture book, rich texture of crayon and oil pastel on rough paper, warm and cozy colors, cute and round character design, soft lighting, analog fairytale atmosphere, no harsh outlines.',
        '감성 사진': 'A soft and airy aesthetic photograph of ${input}. Bathed in gentle natural light, creating a fresh, dreamy and ethereal atmosphere. High resolution, clean composition, pastel color tones, soft bokeh background, peaceful and pure mood. Modern lifestyle photography style, very clean and sharp focus on the subject.',
        '심플 낙서': 'A charming minimalist black ink line drawing of ${input}. The style is simple, whimsical, and friendly, using essential but slightly rounded lines to capture the shape with a touch of cuteness. Isolated completely on a clean, solid white background with absolutely no color washes or textures. Hand-drawn ink feel, no shading, pure black on pure white. IMPORTANT: No text, no words, no letters, no writing of any kind.',
        '말랑 3D': 'Cute 3D cartoon character illustration of ${input}, claymation and soft toy style, rounded shapes, big head and small body (chibi proportions), friendly and warm expression, soft textures like felt and clay, gentle studio lighting, pastel colors, clean background, high quality render, like a Pixar character.',
        '빈티지 필름': 'A retro lo-fi analog film photo of ${input}. Nostalgic 90s style, heavy film grain, light leaks, chromatic aberration, washed-out colors, and slight vignette. The image looks like a memory from an old photo album. Imperfect, textured, and sentimental. Disposable camera aesthetic.'
      };

      // 공통 Negative Prompt (모든 스타일에 기본 적용)
      const commonNegative = 'text, writing, letters, signature, watermark, typography, alphabet, logo, subtitle, blurred, distorted, extra limbs, ugly, messy, crowded, complex background, mutated hands, disfigured';

      // 스타일별 추가 Negative Prompt
      const negativePrompts: Record<string, string> = {
        '맑은 수채화': `${commonNegative}, cartoon characters, cute faces, chibi, anime, manga, people, animals with faces, emoji, kawaii, children's book style, character illustration, fantasy creatures, anthropomorphic, dark colors, gloomy, sharp lines, thick outlines, scary`,
        '따스한 동화': `${commonNegative}, photorealistic, 3d render, shiny, digital art, vector, sharp lines, dark atmosphere, horror, geometric, sleek`,
        '말랑 3D': `${commonNegative}, photorealistic, realistic, 2d, flat, sketch, painting, anime, sharp edges, scary, deformed, harsh lighting`,
        '심플 낙서': `${commonNegative}, realistic, detailed, shading, color, grayscale, complex, busy, colored background, textured paper, off-white background, gradient background, overly polished, sparkling eyes, blush, text, words, handwriting, calligraphy, labels, captions`,
        '감성 사진': `${commonNegative}, film grain, noise, dust, scratches, analog film, retro, vintage, dark, gloomy, high contrast, harsh shadows, neon colors, intense saturation, grunge, blurry`,
        '빈티지 필름': `${commonNegative}, digital, hd, 4k, sharp focus`
      };

      // 비율에 맞는 aspect ratio 설명
      const ratioDescriptions: Record<string, string> = {
        '9:16': 'vertical 9:16 portrait format',
        '16:9': 'horizontal 16:9 landscape format',
        '1:1': 'square 1:1 format',
        '4:3': 'horizontal 4:3 format',
        '4:5': 'vertical 4:5 portrait format',
        '3:4': 'vertical 3:4 portrait format',
        '2:3': 'vertical 2:3 tall portrait format'
      };

      // 한국어 프롬프트를 영어로 번역
      let translatedPrompt = '';
      if (prompt && prompt.trim()) {
        console.log('Translating Korean prompt to English:', prompt);

        const translateResponse = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `You are a professional translator. Translate the Korean image description to natural, vivid English. Focus on visual details, mood, lighting, and composition. Keep it detailed and descriptive for image generation.\n\nTranslate this Korean image description to English, preserving all visual details:\n\n${prompt}`
                }]
              }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 512,
              }
            }),
          }
        );

        if (!translateResponse.ok) {
          const errorText = await translateResponse.text();
          console.error('Translation error:', translateResponse.status, errorText);

          if (translateResponse.status === 429) {
            return new Response(
              JSON.stringify({ error: 'API 요청 한도를 초과했습니다. 잠시 후(1-2분) 다시 시도해주세요.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({ error: `번역 실패: ${translateResponse.status}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const translateData = await translateResponse.json();
        translatedPrompt = translateData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('Translated prompt:', translatedPrompt);
      }

      const ratioInstruction = ratio ? ratioDescriptions[ratio as string] || '' : 'vertical 9:16 portrait format';
      const negativePrompt = style ? negativePrompts[style] || '' : '';

      // styleInstruction에 translatedPrompt를 ${input} 자리에 대입
      const styleTemplate = style ? stylePrompts[style] || '' : '';
      const finalStyleInstruction = styleTemplate.replace('${input}', translatedPrompt || 'beautiful scene');

      // 최종 프롬프트 구조: [스타일 with 내용] + [비율] + [금지 사항을 강력하게 명시]
      let finalPrompt = `${finalStyleInstruction} ${ratioInstruction}.`;

      // Negative prompt를 AVOID/EXCLUDE 형식으로 강력하게 명시
      if (negativePrompt) {
        finalPrompt += ` IMPORTANT: Strictly AVOID and EXCLUDE the following elements: ${negativePrompt}. These elements must NOT appear in the image under any circumstances.`;
      }

      console.log('Generating image with ratio:', ratio, 'Final English prompt:', finalPrompt);

      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: finalPrompt
              }]
            }],
            generationConfig: {
              temperature: 1.0,
              responseMimeType: 'image/png',
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);

        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'API 요청 한도를 초과했습니다. 잠시 후(1-2분) 다시 시도해주세요.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ error: `이미지 생성 실패: ${response.status}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();

      // Gemini API 응답 구조에서 이미지 추출
      const imageData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!imageData) {
        console.error('No image found in response. Full data:', JSON.stringify(data, null, 2));
        return new Response(
          JSON.stringify({ error: 'No image generated' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Base64 이미지를 data URL로 변환
      const imageUrl = `data:image/png;base64,${imageData}`;

      // Log success without the massive base64 data
      console.log('Image generated successfully:', {
        hasImage: !!imageUrl,
        imageSize: `${Math.round(imageData.length / 1024)}KB`,
        finishReason: data.candidates?.[0]?.finishReason
      });

      return new Response(
        JSON.stringify({ image: imageUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: '올바르지 않은 액션입니다' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
