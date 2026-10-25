import type { DGUser } from './useAuth';

/**
 * 로그인 유도 창을 언제 띄울지 정한다.
 *
 * 예전에는 새 기록 화면에 들어가고 500ms 뒤에 무조건 띄웠다. 그래서
 *  - 글을 쓰는 도중에 떠서 입력을 막았고
 *  - 기록 종류마다 키가 달라(login_nudge_prayer_new 등) 새 기록마다 다시 떴고
 *  - sessionStorage 라 탭을 닫으면 "게스트로 계속" 선택을 잊었다.
 *
 * 지금은 **첫 저장을 마친 뒤 한 번만**, 기록 종류와 무관하게 한 번만 띄운다.
 * 선택은 localStorage 에 남겨 다음에 다시 묻지 않는다.
 */
const NUDGE_KEY = 'login_nudge_shown';

/** 게스트이고 아직 한 번도 안 띄웠으면 true */
export function shouldShowLoginNudge(user: DGUser | null): boolean {
  if (user) return false;
  try {
    return localStorage.getItem(NUDGE_KEY) !== '1';
  } catch {
    return false; // 저장소를 못 쓰면 괜히 반복해서 띄우지 않는다
  }
}

/** 띄웠다고 표시한다. 다음부터는 묻지 않는다 */
export function markLoginNudgeShown(): void {
  try {
    localStorage.setItem(NUDGE_KEY, '1');
  } catch {
    /* 저장 실패는 무시한다 */
  }
}

/**
 * 저장을 마친 직후에 부른다. 띄워야 하면 show() 를 부르고 true 를 돌려준다.
 * 입력 도중에는 절대 부르지 않는다.
 */
export function showLoginNudgeAfterSave(user: DGUser | null, show: () => void): boolean {
  if (!shouldShowLoginNudge(user)) return false;
  markLoginNudgeShown();
  show();
  return true;
}
