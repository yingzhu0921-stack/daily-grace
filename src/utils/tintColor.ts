/**
 * 기록 종류 색을 메뉴 칸 바탕용으로 옅게 만든다(흰색과 섞기). 저장된 색은 바꾸지 않는다.
 * 2026-11-13 UI 개편: 기록 종류 색은 메뉴 칸에만 쓰고, 그 위 아이콘·글씨는 검정.
 */
export function tintColor(hex: string | undefined, white = 0.32): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return '#EFEAE0';
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * white);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
