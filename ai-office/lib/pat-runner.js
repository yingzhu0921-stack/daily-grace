import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import {
  PROJECT_DIR,
  DISALLOWED_TOOLS,
  APPEND_SYSTEM_PROMPT,
} from './config.js';
import { toContentBlocks } from './uploads.js';

/** 도구 이름 -> 사용자에게 보여줄 작업 상태 */
function statusForTool(name, input = {}) {
  switch (name) {
    case 'Read':
    case 'Grep':
    case 'Glob':
    case 'NotebookRead':
      return '코드 확인 중';
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return '수정 중';
    case 'Bash': {
      const cmd = String(input.command || '');
      if (/codex_review\.sh/.test(cmd)) return '매트 검수 중';
      if (/(tsc|eslint|lint|vitest|jest|test|build)/.test(cmd)) return '테스트 중';
      return '코드 확인 중';
    }
    default:
      return '작업 중';
  }
}

/** 도구 호출 -> 사용자에게 보여줄 한 줄 설명 (터미널 로그 그대로 노출하지 않음) */
function stepLabel(name, input = {}) {
  const rel = (p) => String(p || '').replace(`${PROJECT_DIR}/`, '');
  switch (name) {
    case 'Read':
      return `파일 확인: ${rel(input.file_path)}`;
    case 'Grep':
      return `코드 검색: ${String(input.pattern || '').slice(0, 60)}`;
    case 'Glob':
      return `파일 탐색: ${String(input.pattern || '').slice(0, 60)}`;
    case 'Edit':
      return `파일 수정: ${rel(input.file_path)}`;
    case 'Write':
      return `파일 작성: ${rel(input.file_path)}`;
    case 'Bash':
      return `명령 실행: ${String(input.command || '').slice(0, 80)}`;
    default:
      return `${name} 실행`;
  }
}

/**
 * 패트(Claude Code CLI)를 비대화형으로 호출한다.
 * shell 을 쓰지 않고 인자 배열로 spawn 하므로 shell injection 위험이 없다.
 *
 * @param {object} opts
 * @param {string} opts.message 사용자 메시지
 * @param {Array} opts.attachments saveAttachments() 결과
 * @param {string|null} opts.resumeSessionId 이어서 대화할 세션 id
 * @param {(event:object)=>void} opts.onEvent UI 로 보낼 이벤트 콜백
 * @param {AbortSignal} [opts.signal] 사용자가 중단을 누르면 자식 프로세스를 종료한다
 * @returns {Promise<{sessionId:string|null, text:string, isError:boolean, aborted:boolean}>}
 */
export function runPat({ message, attachments = [], resumeSessionId = null, onEvent, signal }) {
  const args = [
    '-p',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--verbose',
    '--permission-mode', 'acceptEdits',
    '--append-system-prompt', APPEND_SYSTEM_PROMPT,
    '--disallowedTools', ...DISALLOWED_TOOLS,
  ];
  if (resumeSessionId) {
    args.push('--resume', resumeSessionId);
  } else {
    args.push('--session-id', crypto.randomUUID());
  }

  const child = spawn('claude', args, {
    cwd: PROJECT_DIR, // CLAUDE.md 규칙이 적용되도록 프로젝트 루트에서 실행
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env,
  });

  // 첨부(이미지)는 base64 content 블록으로 직접 전달한다.
  const content = [...toContentBlocks(attachments)];
  if (attachments.length > 0) {
    const names = attachments.map((a) => a.absPath).join('\n');
    content.push({
      type: 'text',
      text: `첨부 파일이 함께 전달되었습니다. 원본은 아래 경로에도 저장되어 있습니다.\n${names}`,
    });
  }
  content.push({ type: 'text', text: message });

  child.stdin.write(`${JSON.stringify({ type: 'user', message: { role: 'user', content } })}\n`);
  child.stdin.end();

  return new Promise((resolve) => {
    let sessionId = resumeSessionId;
    let finalText = '';
    let isError = false;
    let aborted = false;

    // 사용자가 중단을 누르면 CLI 프로세스를 정리한다.
    const onAbort = () => {
      aborted = true;
      try {
        child.kill('SIGTERM');
      } catch {
        /* 이미 종료된 경우 무시 */
      }
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    let buffer = '';
    let stderr = '';
    let lastStatus = '';

    const emitStatus = (value) => {
      if (value && value !== lastStatus) {
        lastStatus = value;
        onEvent({ type: 'status', value });
      }
    };

    const handleLine = (line) => {
      let evt;
      try {
        evt = JSON.parse(line);
      } catch {
        return; // 스트림이 아닌 잡음은 무시 (터미널 로그를 그대로 뿌리지 않는다)
      }

      if (evt.type === 'system' && evt.subtype === 'init') {
        if (evt.session_id) sessionId = evt.session_id;
        emitStatus('코드 확인 중');
        return;
      }

      if (evt.type === 'assistant' && evt.message?.content) {
        for (const block of evt.message.content) {
          if (block.type === 'tool_use') {
            emitStatus(statusForTool(block.name, block.input));
            onEvent({ type: 'step', text: stepLabel(block.name, block.input) });
          } else if (block.type === 'text' && block.text.trim()) {
            onEvent({ type: 'partial', text: block.text });
          }
        }
        return;
      }

      if (evt.type === 'result') {
        if (evt.session_id) sessionId = evt.session_id;
        isError = Boolean(evt.is_error);
        finalText = typeof evt.result === 'string' ? evt.result : '';
      }
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) handleLine(line);
      }
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      if (stderr.length > 20000) stderr = stderr.slice(-20000);
    });

    child.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort);
      resolve({ sessionId, text: `패트 실행 실패: ${err.message}`, isError: true, aborted });
    });

    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      if (buffer.trim()) handleLine(buffer.trim());
      if (aborted) {
        finalText = finalText || '사용자 요청으로 작업을 중단했습니다.';
      } else if (!finalText && code !== 0) {
        finalText = `패트 호출이 실패했습니다 (exit ${code}).${stderr ? `\n${stderr.slice(-500)}` : ''}`;
        isError = true;
      }
      resolve({ sessionId, text: finalText, isError, aborted });
    });
  });
}
