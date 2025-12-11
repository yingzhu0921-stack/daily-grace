import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { records } = await req.json();
    
    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ error: '분석할 기록이 없습니다.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI 서비스 설정이 필요합니다.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 기록 내용 요약 (성능 최적화: 각 필드 200자로 제한)
    const recordsText = records.map((r: any) => {
      const parts = [];
      const truncate = (text: string, maxLen: number = 200) => 
        text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
      
      if (r.title) parts.push(`제목: ${truncate(r.title, 100)}`);
      if (r.passage) parts.push(`본문: ${truncate(r.passage)}`);
      if (r.content) parts.push(`내용: ${truncate(r.content)}`);
      if (r.application) parts.push(`적용: ${truncate(r.application)}`);
      if (r.items) parts.push(`감사: ${r.items.slice(0, 3).join(', ')}`);
      return parts.join('\n');
    }).join('\n\n---\n\n');

    console.log('Analyzing records:', recordsText.substring(0, 200));

    const systemPrompt = `당신은 감정과 은유를 시각화하는 예술가입니다. 주어진 신앙 기록의 감정적 핵심을 포착하여 시각적 은유로 변환하세요.

핵심 원칙:
1. **감정 분석**: 기록에서 동사와 감정 키워드를 파악하세요 (예: 붙들다→보호, 빛→희망, 목자→돌봄)
2. **은유 시각화**: 추상적 개념을 구체적 이미지로 변환하세요
   - "붙드신다" → 큰 손이 작은 손을 감싸는 클로즈업
   - "빛" → 어둠 속 따뜻한 등불
   - "목자" → 양떼와 푸른 초장
   - "강하게 하신다" → 깊은 뿌리를 가진 튼튼한 나무
3. **장면 구성**: 감정이 전달되도록 조명, 색감, 구도를 구체적으로 묘사하세요

절대 하지 말아야 할 것:
- 본문에 없는 교회, 십자가, 구름 같은 일반적 종교 이미지 사용
- "배경 이미지 프롬프트:" 같은 메타 텍스트
- 추상적이거나 모호한 표현

응답은 반드시 한국어로, 50자 이내의 구체적인 장면 묘사만 제공하세요.
예: "큰 손이 작은 손을 감싸 쥐는 클로즈업, 따뜻한 황금빛, 보호와 안정감"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `다음 신앙 기록들을 분석하여 배경 이미지 프롬프트를 생성해주세요:\n\n${recordsText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI 크레딧이 부족합니다. Lovable 워크스페이스에서 크레딧을 추가해주세요.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI 분석 중 오류가 발생했습니다.' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const prompt = data.choices?.[0]?.message?.content?.trim() || '';
    
    console.log('Generated prompt:', prompt);

    return new Response(
      JSON.stringify({ prompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-records function:', error);
    return new Response(
      JSON.stringify({ error: '기록 분석 중 오류가 발생했습니다.' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
