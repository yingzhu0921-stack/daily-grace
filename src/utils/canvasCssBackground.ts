/**
 * CSS 배경값(단색 또는 linear-gradient)을 캔버스에 그대로 칠한다.
 *
 * 2026-11-13 직접 편집에서 그라데이션 배경(Graceful Sunset 등)을 고르고 저장하면 저장된 카드가 새까맸다.
 * 캔버스 fillStyle 은 'linear-gradient(...)' 문자열을 이해하지 못해 무시하고 기본 검정으로 칠했기 때문이다.
 * 화면(CSS)과 같은 각도·색 위치로 캔버스 그라데이션을 만든다.
 */

const SIDE_ANGLES: Record<string, number> = {
  'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270,
  'to top right': 45, 'to right top': 45, 'to bottom right': 135, 'to right bottom': 135,
  'to bottom left': 225, 'to left bottom': 225, 'to top left': 315, 'to left top': 315,
};

/** 괄호 안의 쉼표(rgba(…))는 건너뛰고 최상위 쉼표로만 나눈다. */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function fillCssBackground(ctx: CanvasRenderingContext2D, css: string | undefined, w: number, h: number): void {
  const value = (css || '').trim();
  const m = /^linear-gradient\((.*)\)$/i.exec(value);
  if (!m) {
    ctx.fillStyle = value || '#1F1F1F';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const parts = splitTopLevel(m[1]);
  let angle = 180; // CSS 기본값: 위에서 아래로
  const first = parts[0]?.toLowerCase() ?? '';
  if (/^-?[\d.]+deg$/.test(first)) { angle = parseFloat(first); parts.shift(); }
  else if (first in SIDE_ANGLES) { angle = SIDE_ANGLES[first]; parts.shift(); }

  const stops = parts.map((p, i) => {
    const sm = /^(.*?)(?:\s+(-?[\d.]+)%)?$/.exec(p.trim());
    const color = (sm?.[1] || p).trim();
    const pos = sm?.[2] != null ? parseFloat(sm[2]) / 100 : (parts.length > 1 ? i / (parts.length - 1) : 0);
    return { color, pos: Math.min(1, Math.max(0, pos)) };
  });
  if (!stops.length) { ctx.fillStyle = '#1F1F1F'; ctx.fillRect(0, 0, w, h); return; }

  // CSS 규칙: 0deg 는 위쪽, 시계 방향. 그라데이션 선 길이 = |w·sin| + |h·cos|.
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  for (const s of stops) {
    try { g.addColorStop(s.pos, s.color); } catch { /* 이해 못 하는 색은 건너뛴다 */ }
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
