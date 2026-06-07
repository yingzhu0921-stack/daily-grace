import { getSessionUser } from './_lib/session';
import type { Env } from './_lib/db';

interface ExtendedEnv extends Env {
  OPENAI_API_KEY: string;
}

export const onRequestPost: PagesFunction<ExtendedEnv> = async ({ request, env }) => {
  const user = await getSessionUser(env.DB, request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { records } = await request.json<any>();
  if (!records?.length) return Response.json({ error: '분석할 기록이 없습니다.' }, { status: 400 });
  if (!env.OPENAI_API_KEY) return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });

  const truncate = (text: string, max = 200) => text?.length > max ? text.substring(0, max) + '...' : text;
  const recordsText = records.map((r: any) => {
    const parts = [];
    if (r.title) parts.push(`제목: ${truncate(r.title, 100)}`);
    if (r.passage) parts.push(`본문: ${truncate(r.passage)}`);
    if (r.content) parts.push(`내용: ${truncate(r.content)}`);
    if (r.application) parts.push(`적용: ${truncate(r.application)}`);
    if (r.items) parts.push(`감사: ${r.items.slice(0, 3).join(', ')}`);
    return parts.join('\n');
  }).join('\n\n---\n\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `당신은 감정과 은유를 시각화하는 예술가입니다. 신앙 기록의 감정적 핵심을 포착하여 말씀카드 배경 이미지에 어울리는 장면 설명을 한국어로 작성하세요.
핵심 원칙:
1. 기록에서 감정 키워드를 파악하세요 (예: 붙들다→보호, 빛→희망, 목자→돌봄)
2. 추상적 개념을 구체적 이미지로 변환하세요
3. 조명, 색감, 구도를 구체적으로 묘사하세요
4. 100자 이내로 간결하게 작성하세요
5. 교회, 십자가 같은 일반적 종교 이미지는 사용하지 마세요`,
        },
        { role: 'user', content: `다음 기록을 분석하여 배경 이미지 장면 설명을 작성해주세요:\n\n${recordsText}` },
      ],
      max_tokens: 300,
    }),
  });

  const data = await res.json<any>();
  if (!res.ok) return Response.json({ error: data.error?.message || 'AI 분석 실패' }, { status: res.status });

  const prompt = data.choices?.[0]?.message?.content?.trim();
  if (!prompt) return Response.json({ error: '분석 결과를 가져올 수 없습니다.' }, { status: 500 });

  return Response.json({ prompt });
};
