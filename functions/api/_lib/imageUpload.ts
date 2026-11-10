/**
 * 카드 이미지 업로드 검사.
 *
 * 전에는 data URL 의 형식 표기("data:text/html;base64,...")를 그대로 믿고 R2 에 저장한 뒤
 * 같은 형식으로 내려줬다. 그림이 아닌 것(HTML·SVG 등)도 저장·제공될 수 있었다(2026-11-10 점검 4번).
 *
 * 이제 표기는 무시하고 실제 바이트의 앞부분(파일 서명)으로 형식을 판정한다.
 * - 표기가 비어 있는 경우(일부 브라우저가 HEIC 사진을 형식 없이 읽음)도 실제 그림이면 받는다.
 * - 표기가 그림이어도 내용이 그림이 아니면 거절한다.
 * SVG 는 안에 스크립트를 넣을 수 있어 받지 않는다. 앱은 SVG 를 만들지 않는다.
 */

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/heif'] as const;

const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) =>
  bytes.length >= offset + sig.length && sig.every((b, i) => bytes[offset + i] === b);

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.subarray(start, end));

const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3];
const u32le = (b: Uint8Array, o: number) => b[o] + (b[o + 1] << 8) + (b[o + 2] << 16) + ((b[o + 3] << 24) >>> 0);

/**
 * 파일 서명과 첫 구조로 그림 형식을 판정한다. 허용 목록에 없는 것은 null.
 *
 * 서명 몇 바이트만 보면 "PNG 서명 + HTML" 같은 위장 파일도 통과한다(Codex 검토). 그래서 각 형식의
 * 첫 구조까지 확인한다: PNG 는 첫 청크가 IHDR, JPEG 는 서명 뒤가 표식(marker), GIF 는 화면 정보 길이,
 * WEBP 는 RIFF 길이와 첫 청크 이름, HEIF/AVIF 는 ftyp 상자 길이.
 * 전체를 해독하지는 않는다(Workers 에 이미지 해독기가 없다). 정상 사진을 잘못 거절하지 않는 선에서 멈췄고,
 * 남는 위험은 제공할 때 nosniff·sandbox 로 막는다(imageResponseHeaders).
 */
export function detectImageType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return bytes.length >= 33 && u32be(bytes, 8) === 13 && ascii(bytes, 12, 16) === 'IHDR' ? 'image/png' : null;
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return bytes.length >= 4 && bytes[3] >= 0xc0 && bytes[3] !== 0xff ? 'image/jpeg' : null;
  }
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a')) {
    return bytes.length >= 13 ? 'image/gif' : null;
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    const riffSize = u32le(bytes, 4);
    const chunk = bytes.length >= 16 ? ascii(bytes, 12, 16) : '';
    return riffSize >= 12 && riffSize + 8 <= bytes.length && ['VP8 ', 'VP8L', 'VP8X'].includes(chunk) ? 'image/webp' : null;
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp') {
    const boxSize = u32be(bytes, 0);
    if (boxSize < 16 || boxSize > bytes.length || boxSize % 4 !== 0) return null;
    const brand = ascii(bytes, 8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'].includes(brand)) return 'image/heic';
    if (brand === 'mif1' || brand === 'msf1') return 'image/heif';
  }
  return null;
}

/**
 * data URL 을 바이트로 풀고 실제 그림인지 확인한다.
 * - 'invalid': data URL 이 아니거나 풀 수 없음(잘못된 base64·퍼센트 인코딩 포함 — 전에는 여기서 500 이 났다)
 * - 'not-image': 풀었지만 허용된 그림 형식이 아님
 */
export function decodeImageDataUrl(dataUrl: string):
  | { ok: true; bytes: Uint8Array; contentType: string }
  | { ok: false; reason: 'invalid' | 'not-image' } {
  const m = /^data:([^;,]*)((?:;[^;,]*)*?)(;base64)?,(.*)$/s.exec(dataUrl || '');
  if (!m) return { ok: false, reason: 'invalid' };
  const raw = m[4] || '';
  let bytes: Uint8Array;
  try {
    if (m[3]) {
      const bin = atob(raw);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } else {
      bytes = new TextEncoder().encode(decodeURIComponent(raw));
    }
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const contentType = detectImageType(bytes);
  if (!contentType) return { ok: false, reason: 'not-image' };
  return { ok: true, bytes, contentType };
}

/**
 * R2 에서 꺼낸 카드 그림을 내려줄 때 붙이는 헤더.
 * 이번 변경 전에 저장된 것은 형식이 무엇이든 그대로 남아 있으므로, 허용 목록에 없는 형식은
 * 그림으로 내려주지 않고 내려받기 전용(octet-stream)으로 바꾼다.
 * sandbox CSP 는 주소를 직접 열었을 때도 안의 스크립트가 이 사이트 권한으로 돌지 못하게 한다.
 */
export function imageResponseHeaders(storedContentType: string | undefined): Headers {
  const headers = new Headers();
  const type = (storedContentType || '').toLowerCase();
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)) {
    headers.set('Content-Type', type);
  } else {
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', 'attachment');
  }
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
  return headers;
}
