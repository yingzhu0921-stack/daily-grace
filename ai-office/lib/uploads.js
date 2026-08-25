import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { UPLOADS_DIR } from './config.js';

/**
 * 첨부 종류별 핸들러.
 * 지금은 image 만 실제 동작한다. PDF/TXT/MD 는 여기에 항목만 켜면 된다.
 */
export const ATTACHMENT_KINDS = {
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxBytes: 8 * 1024 * 1024,
    enabled: true,
    /** Claude CLI 로 보낼 content 블록 생성 */
    toContentBlock(saved) {
      return {
        type: 'image',
        source: { type: 'base64', media_type: saved.mime, data: saved.base64 },
      };
    },
  },
  // 확장 예정 (enabled: false 인 동안에는 업로드가 거부된다)
  document: {
    mimes: ['application/pdf', 'text/plain', 'text/markdown'],
    extensions: ['.pdf', '.txt', '.md'],
    maxBytes: 8 * 1024 * 1024,
    enabled: false,
    toContentBlock(saved) {
      return { type: 'text', text: `첨부 문서 경로: ${saved.absPath}` };
    },
  },
};

export const MAX_ATTACHMENTS = 6;

function kindForMime(mime) {
  for (const [name, def] of Object.entries(ATTACHMENT_KINDS)) {
    if (def.mimes.includes(mime)) return { name, def };
  }
  return null;
}

/** 파일명에서 경로 요소와 위험 문자를 제거한다 */
export function sanitizeFilename(raw = '') {
  const base = path.basename(String(raw));
  const cleaned = base
    .replace(/[^A-Za-z0-9가-힣._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 80);
  return cleaned || 'file';
}

/** 저장 경로가 uploads 폴더 안인지 확인한다 */
function assertInsideUploads(absPath) {
  const resolved = path.resolve(absPath);
  const root = path.resolve(UPLOADS_DIR) + path.sep;
  if (!resolved.startsWith(root)) throw new Error('업로드 경로가 uploads 폴더를 벗어났습니다.');
  return resolved;
}

/**
 * 브라우저에서 받은 첨부를 검증하고 uploads 폴더에 저장한다.
 * @param {{name:string, mime:string, data:string}[]} attachments base64 데이터
 */
export async function saveAttachments(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`첨부는 최대 ${MAX_ATTACHMENTS}개까지 가능합니다.`);
  }
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const saved = [];
  for (const item of attachments) {
    const mime = String(item?.mime || '');
    const match = kindForMime(mime);
    if (!match) throw new Error(`지원하지 않는 형식입니다: ${mime || '알 수 없음'}`);
    if (!match.def.enabled) throw new Error(`아직 지원하지 않는 첨부 종류입니다: ${match.name}`);

    const buf = Buffer.from(String(item?.data || ''), 'base64');
    if (buf.length === 0) throw new Error('빈 파일은 첨부할 수 없습니다.');
    if (buf.length > match.def.maxBytes) {
      throw new Error(`파일이 너무 큽니다 (최대 ${Math.floor(match.def.maxBytes / 1024 / 1024)}MB).`);
    }

    const safeName = sanitizeFilename(item?.name);
    const ext = path.extname(safeName).toLowerCase();
    if (ext && !match.def.extensions.includes(ext)) {
      throw new Error(`확장자와 형식이 맞지 않습니다: ${safeName}`);
    }
    const stamped = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`;
    const absPath = assertInsideUploads(path.join(UPLOADS_DIR, stamped));
    await fs.writeFile(absPath, buf, { mode: 0o600 });

    saved.push({
      kind: match.name,
      originalName: safeName,
      storedName: stamped,
      absPath,
      mime,
      bytes: buf.length,
      base64: buf.toString('base64'),
    });
  }
  return saved;
}

/** 저장된 첨부를 Claude CLI content 블록 배열로 변환한다 */
export function toContentBlocks(savedList = []) {
  return savedList.map((s) => ATTACHMENT_KINDS[s.kind].toContentBlock(s));
}
