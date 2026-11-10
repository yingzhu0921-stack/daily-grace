import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { previousRoute } from '@/utils/routeHistory';

/**
 * 새 기록을 저장한 뒤 들어온 곳으로 돌려보낸다(2026-11-10 사용자 결정).
 *
 * 전에는 방금 쓴 글의 상세 화면으로 보냈다. 홈에서 큐티를 쓴 사람은 상세 → 목록 → 홈,
 * 두 번 뒤로 가야 처음 자리로 돌아왔다. 이제는 들어온 곳(대개 홈)으로 돌아가고,
 * 방금 쓴 글은 알림의 '보기'로 연다.
 *
 * 바로 앞 화면이 없거나(주소로 바로 열었거나 새로고침), 로그인 화면이었거나, 같은 작성 화면이면
 * 뒤로 가기가 엉뚱한 곳으로 가므로 홈으로 보낸다. 로그인을 거쳐 돌아온 경우 뒤로 가면 같은
 * 작성 화면이 다시 나왔다.
 */
export function useReturnAfterSave() {
  const navigate = useNavigate();
  const location = useLocation();

  /** 저장 알림. viewPath 가 있으면 '보기' 버튼을 단다. 화면을 옮겨도 알림은 남는다. */
  const notifySaved = useCallback((message: string, viewPath?: string) => {
    toast.success(message, viewPath
      ? { duration: 5000, action: { label: '보기', onClick: () => navigate(viewPath) } }
      : undefined);
  }, [navigate]);

  const returnToOrigin = useCallback(() => {
    const prev = previousRoute();
    const here = location.pathname + location.search;
    // 직전 화면이 같은 작성 화면이면(주소 뒤 ?… 만 달랐던 경우 포함) 뒤로 가도 작성 화면이다.
    const samePage = !!prev && prev.split('?')[0] === location.pathname;
    const canGoBack = location.key !== 'default' && !!prev && prev !== here && !samePage && !prev.startsWith('/auth');
    if (canGoBack) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate, location.key, location.pathname, location.search]);

  return { notifySaved, returnToOrigin };
}
