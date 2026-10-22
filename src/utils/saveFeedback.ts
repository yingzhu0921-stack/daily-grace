export function saveFeedback(isSignedIn: boolean): string {
  return isSignedIn
    ? '기기에 저장했습니다. 클라우드 동기화는 자동으로 진행됩니다.'
    : '기기에 저장했습니다.';
}
