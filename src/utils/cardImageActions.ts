import { toast } from 'sonner';

/**
 * 말씀카드 이미지 저장·공유. 보관함과 '만들고 바로 저장'(저장 완료 창)이 같은 동작을 하도록 한곳에 둔다.
 * (2026-11-13 사용자: 두 곳의 저장 방식을 맞춰 달라. 보관함 저장은 아이폰에서 파일 화면이 떴다.)
 *
 *  · 휴대폰: 공유 창을 연다 → '이미지 저장'으로 사진첩에 들어간다.
 *  · 컴퓨터: 파일로 내려받는다.
 *
 * 아이폰은 공유 창을 '누른 바로 그 순간'에만 열어 준다. 누른 뒤에 이미지를 받아 오면(await) 막힐 수 있어서,
 * 화면을 열 때 prepareCardFile 로 파일을 미리 만들어 두고, 버튼에서는 준비된 파일로 바로 연다.
 */

export function isPhone(): boolean {
  return typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/** 버튼 이름. 휴대폰은 사진첩에 들어가고, 컴퓨터는 파일로 내려받는다. */
export function saveImageLabel(): string {
  return isPhone() ? '사진첩 저장' : '이미지 저장';
}

function fileName(type: string, id?: string) {
  // 이미지는 JPEG 인데 이름이 .png 라 아이폰에서 '….png.jpeg' 로 저장되던 문제가 있었다.
  const ext = type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png';
  const tag = (id || String(Date.now())).replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
  return `하루은혜-말씀카드-${tag}.${ext}`;
}

/** data: 주소는 그 자리에서 바로 파일로 만든다(기다림 없음). */
function dataUrlToFile(dataUrl: string, id?: string): File | null {
  try {
    const [header, encoded] = dataUrl.split(',');
    const type = header.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/)?.[1];
    if (!type || !encoded) return null;
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    return new File([bytes], fileName(type, id), { type });
  } catch {
    return null;
  }
}

/** 화면을 열 때 불러 파일을 미리 만든다. data: 가 아니면(클라우드 주소 등) 받아 온다. */
export async function prepareCardFile(src: string | undefined, id?: string): Promise<File | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return dataUrlToFile(src, id);
  try {
    const blob = await (await fetch(src)).blob();
    const type = blob.type || 'image/png';
    return new File([blob], fileName(type, id), { type });
  } catch {
    return null;
  }
}

function canShareFile(file: File): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare?.({ files: [file] });
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 사진첩(휴대폰) 또는 파일(컴퓨터)로 저장한다. 버튼에서 준비된 파일로 바로 부른다. */
export function saveCardFile(file: File | null): void {
  if (!file) { toast.error('이미지를 준비하는 중이에요. 잠시 후 다시 눌러 주세요.'); return; }
  if (isPhone() && canShareFile(file)) {
    navigator.share({ files: [file], title: '말씀카드' }).catch((e) => {
      if (e instanceof Error && e.name === 'AbortError') return;
      // 공유 창이 막히면 파일로라도 내려받는다.
      download(file);
    });
    return;
  }
  download(file);
  toast.success('카드를 내려받았어요');
}

/** 공유 창을 연다. 공유를 못 쓰는 브라우저는 저장 방법을 알려 준다. */
export function shareCardFile(file: File | null): void {
  if (!file) { toast.error('이미지를 준비하는 중이에요. 잠시 후 다시 눌러 주세요.'); return; }
  if (!canShareFile(file)) {
    toast.info('이 브라우저는 이미지 공유를 지원하지 않아요', {
      description: "'이미지 저장'으로 내려받은 뒤 보내 주세요. 휴대폰에서는 공유가 바로 열려요.",
    });
    return;
  }
  navigator.share({ files: [file], title: '말씀카드' }).catch((e) => {
    if (e instanceof Error && e.name === 'AbortError') return;
    toast.error('공유 창을 열지 못했어요.');
  });
}
