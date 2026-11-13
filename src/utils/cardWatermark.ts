/**
 * 저장하는 말씀카드에 앱 표시(새싹잎 + '하루은혜')를 작게 넣는다.
 *
 * 2026-11-13 사용자 결정: 색 아이콘은 카드를 해쳐서, 글자와 같은 한 가지 색의 새싹잎 선택(수첩 모양은 작으면 뭉개짐).
 * 앱이 저작권을 주장하는 표시가 아니라 '어떤 앱으로 만들었는지'를 알리는 표시라 ⓒ 는 쓰지 않는다.
 * 글꼴은 넥슨 배찌체(2026-11-13 사용자 선택). 넥슨 서체 약관이 임베디드 폰트·번들을 허용하고, 파일 수정은 금지, 출처 표기 권장
 *   → 약관 페이지(Legal)에 출처를 적었다. 못 받으면 주아(OFL)로 그린다. 설정에서 끌 수 있다(기본 켜짐).
 */

const STORAGE_KEY = 'card_watermark_enabled';
const FONT = "'NexonBazzi', 'Jua', sans-serif";

export function isCardWatermarkEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setCardWatermarkEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'true' : 'false');
  } catch {
    /* 저장이 막힌 브라우저에서는 기본값(켜짐)으로 동작 */
  }
}

/** 표시가 놓일 자리의 평균 밝기와 얼마나 복잡한지(밝기 편차). */
function regionStats(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const data = ctx.getImageData(Math.max(0, Math.floor(x)), Math.max(0, Math.floor(y)), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h))).data;
  let sum = 0;
  let sq = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4 * 7) {
    const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    sum += l;
    sq += l * l;
    n++;
  }
  const mean = n ? sum / n : 0.5;
  return { mean, variance: n ? sq / n - mean * mean : 0 };
}

/** 끝이 둥근 떡잎 두 장과 살짝 기운 줄기. (x, y) 는 아이콘 상자의 왼쪽 위, s 는 한 변. */
function drawSprout(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const jx = x + s * 0.5;
  const jy = y + s * 0.52;
  ctx.save();
  // 왼쪽 떡잎(조금 작게, 위로)
  ctx.beginPath();
  ctx.ellipse(jx - s * 0.16, jy - s * 0.08, s * 0.18, s * 0.11, (25 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();
  // 오른쪽 떡잎(조금 크게)
  ctx.beginPath();
  ctx.ellipse(jx + s * 0.18, jy - s * 0.11, s * 0.21, s * 0.125, (-30 * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fill();
  // 줄기
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.068;
  ctx.beginPath();
  ctx.moveTo(jx, jy - s * 0.02);
  ctx.quadraticCurveTo(jx + s * 0.03, jy + s * 0.2, jx - s * 0.03, y + s * 0.92);
  ctx.stroke();
  ctx.restore();
}

/**
 * 캔버스에 표시를 그린다. 저장 직전(toDataURL 전)에 부른다.
 * 아래쪽 가운데·왼쪽·오른쪽 중 가장 덜 복잡한 자리를 고르고, 밝기에 따라 흰색/짙은 갈색을 쓴다.
 */
export async function drawCardWatermark(canvas: HTMLCanvasElement): Promise<void> {
  if (!isCardWatermarkEnabled()) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const base = Math.min(W, H);
  const textPx = Math.round(base * 0.026);
  try {
    await document.fonts?.load(`${textPx}px 'NexonBazzi'`, '하루은혜');
  } catch {
    /* 못 받아도 기본 글꼴로 그린다 — 표시라 철자만 맞으면 된다 */
  }
  ctx.save();
  ctx.font = `${textPx}px ${FONT}`;
  const text = '하루은혜';
  const tw = ctx.measureText(text).width;
  const icon = Math.round(base * 0.04);
  const gap = base * 0.004;
  const total = icon + gap + tw;
  const yc = H - Math.max(base * 0.045, icon);
  const margin = base * 0.06;
  const spots = [(W - total) / 2, margin, W - margin - total];
  let best = spots[0];
  let bestStats = regionStats(ctx, spots[0], yc - icon, total, icon * 2);
  for (const x of spots.slice(1)) {
    const st = regionStats(ctx, x, yc - icon, total, icon * 2);
    // 가운데를 조금 더 선호하고, 확실히 덜 복잡할 때만 옮긴다
    if (st.variance < bestStats.variance * 0.6) {
      best = x;
      bestStats = st;
    }
  }
  const light = bestStats.mean < 0.55;
  const colour = light ? 'rgba(255,255,255,0.8)' : 'rgba(46,42,38,0.7)';
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  // 그래도 복잡한 자리(그림이 꽉 찬 카드)면 아주 옅은 둥근 받침을 깐다
  if (bestStats.variance > 0.02) {
    ctx.save();
    ctx.fillStyle = light ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.55)';
    const padX = base * 0.014;
    const r = icon * 0.7;
    ctx.beginPath();
    ctx.roundRect(best - padX, yc - r, total + padX * 2, r * 2, r);
    ctx.fill();
    ctx.restore();
  }
  drawSprout(ctx, best, yc - icon * 0.62, icon);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, best + icon + gap, yc);
  ctx.restore();
}
