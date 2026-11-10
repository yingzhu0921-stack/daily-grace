/**
 * 바로 앞에 있던 화면의 경로를 기억한다. 새 기록을 저장한 뒤 "들어온 곳으로" 돌아갈 때,
 * 뒤로 가기(navigate(-1))가 정말 그 화면으로 가는지 판단하는 데 쓴다.
 *
 * history 의 key 만 보면 "첫 화면이 아니다"까지만 알 수 있다. 주소로 /diary/new 를 연 뒤
 * 로그인을 거쳐 돌아오면(/new → /auth → replace /new) 뒤로 가기가 같은 작성 화면으로 간다.
 * 메모리에만 두므로 새로고침하면 비고, 그때는 홈으로 보낸다.
 */
let current: string | null = null;
let previous: string | null = null;

/** url = pathname + search */
export function recordRoute(url: string): void {
  if (url === current) return;
  previous = current;
  current = url;
}

export function previousRoute(): string | null {
  return previous;
}
