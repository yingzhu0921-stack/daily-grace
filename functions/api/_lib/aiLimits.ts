import { consumeRateLimit } from './rateLimit';

/**
 * 유료 AI 호출 한도.
 *
 * 전에는 계정당 '시간당' 한도만 있어서, 한 사람이 하루에 그림을 수백 장 만들 수 있었고,
 * 이메일만 있으면 계정을 쉽게 여러 개 만들 수 있어 서비스 전체 비용에 상한이 없었다(2026-11-10 점검).
 * 계정당 하루 한도와, 그림을 만드는 호출에 서비스 전체 하루 한도를 더한다(사용자 결정: '넉넉하게').
 *
 * 하루는 한국 시간 자정에 초기화한다. 전에는 UTC 자정(한국 오전 9시)이라, 새벽에 막힌 사람에게
 * '내일 다시'라고 안내하면 실제로는 그날 아침에 풀려 안내가 틀렸다(Codex 검토).
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const KST_OFFSET = 9 * HOUR;

export const AI_LIMITS: Record<string, { perHour: number; perDay: number; makesImage: boolean }> = {
  condense: { perHour: 30, perDay: 60, makesImage: false },
  'expand-prompt': { perHour: 20, perDay: 60, makesImage: false },
  'auto-complete': { perHour: 20, perDay: 30, makesImage: true },
  'generate-image': { perHour: 20, perDay: 30, makesImage: true },
  'photo-text': { perHour: 10, perDay: 20, makesImage: true },
};

/** 그림을 만드는 호출(배경 생성·자동완성·사진 글씨)의 서비스 전체 하루 합계 */
export const GLOBAL_IMAGES_PER_DAY = 500;

export type AiLimitResult =
  | { allowed: true }
  | { allowed: false; scope: 'hour' | 'day' | 'service'; retryAfterSeconds: number };

/**
 * 시간당 → 하루 → 서비스 전체 순서로 센다. 앞 단계에서 막히면 뒤 단계는 세지 않는다.
 * 목록에 없는 action 은 여기서 막지 않는다(호출하는 쪽이 알 수 없는 action 을 따로 거절한다).
 */
export async function checkAiLimits(db: D1Database, userId: string, action: string): Promise<AiLimitResult> {
  const limit = AI_LIMITS[action];
  if (!limit) return { allowed: true };

  const hourly = await consumeRateLimit(db, `generate-image:${action}`, userId, limit.perHour, HOUR);
  if (!hourly.allowed) return { allowed: false, scope: 'hour', retryAfterSeconds: hourly.retryAfterSeconds };

  const daily = await consumeRateLimit(db, `ai-day:${action}`, userId, limit.perDay, DAY, KST_OFFSET);
  if (!daily.allowed) return { allowed: false, scope: 'day', retryAfterSeconds: daily.retryAfterSeconds };

  if (limit.makesImage) {
    const service = await consumeRateLimit(db, 'ai-day:images', 'service', GLOBAL_IMAGES_PER_DAY, DAY, KST_OFFSET);
    if (!service.allowed) return { allowed: false, scope: 'service', retryAfterSeconds: service.retryAfterSeconds };
  }
  return { allowed: true };
}

/** 사용자에게 보여 줄 문구. '무료' 같은 말은 쓰지 않는다. */
export function aiLimitMessage(scope: 'hour' | 'day' | 'service'): string {
  if (scope === 'hour') return '사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요.';
  if (scope === 'day') return '오늘 사용할 수 있는 횟수를 모두 썼어요. 내일 다시 시도해주세요.';
  return '오늘은 사용하는 분이 많아 잠시 쉬어 가요. 내일 다시 시도해주세요.';
}
