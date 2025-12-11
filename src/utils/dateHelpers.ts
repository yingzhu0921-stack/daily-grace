/**
 * 로컬 타임존 기준으로 날짜를 YYYY-MM-DD 문자열로 변환
 * (UTC가 아닌 현지 시간 기준)
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
