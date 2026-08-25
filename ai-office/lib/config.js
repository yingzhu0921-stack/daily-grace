import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** ai-office 폴더 */
export const OFFICE_DIR = path.resolve(here, '..');
/** dailygrace-main 프로젝트 루트 (패트의 작업 디렉터리) */
export const PROJECT_DIR = path.resolve(OFFICE_DIR, '..');
/** 업로드 임시 폴더 */
export const UPLOADS_DIR = path.join(OFFICE_DIR, 'uploads');
/** 매트 검수 스크립트 */
export const REVIEW_SCRIPT = path.join(PROJECT_DIR, 'codex_review.sh');
/** 매트 검수 결과 파일 */
export const REVIEW_RESULT = path.join(PROJECT_DIR, 'codex_review_result.md');

export const HOST = '127.0.0.1';
export const PORT = Number(process.env.AI_OFFICE_PORT || 4477);

/** 패트가 자동으로 실행하면 안 되는 도구 (배포 / 삭제 / 외부 업로드) */
export const DISALLOWED_TOOLS = [
  'Bash(rm *)',
  'Bash(rmdir *)',
  'Bash(git push *)',
  'Bash(git commit *)',
  'Bash(wrangler *)',
  'Bash(npx wrangler *)',
  'Bash(vercel *)',
  'Bash(npm publish *)',
  'Bash(curl *)',
  'Bash(scp *)',
  'Bash(ssh *)',
  'WebFetch',
  'WebSearch',
];

/** 패트에게 덧붙이는 AI OFFICE 전용 규칙 */
export const APPEND_SYSTEM_PROMPT = [
  '너는 Daily Grace AI OFFICE의 개발 담당 "패트"다.',
  '프로젝트 루트의 CLAUDE.md 규칙을 그대로 따른다.',
  `작업 범위는 ${PROJECT_DIR} 내부로 한정한다. 프로젝트 바깥 경로는 읽거나 쓰지 않는다.`,
  '배포, 파일 삭제, 외부 업로드, git commit/push 는 자동으로 실행하지 않는다. 필요하면 사용자 승인을 요청하는 문장으로 답한다.',
  '.env, API 키, 토큰, 비밀번호 등 민감정보는 출력하지 않는다.',
  '사용자는 브라우저 채팅창으로 보고 있다. 터미널 로그를 그대로 나열하지 말고, 무엇을 왜 바꿨는지 간결한 한국어로 보고한다.',
  '자기 자신을 Claude 가 아니라 "패트"라고 부른다.',
].join('\n');

/** 사용자가 매트 검수를 요청했다고 볼 키워드 */
export const REVIEW_KEYWORDS = ['검수해줘', '검수 해줘', '매트에게 검수', '매트 검수', '검수까지', '검수 부탁'];

export function wantsReview(text = '') {
  return REVIEW_KEYWORDS.some((k) => text.includes(k));
}
