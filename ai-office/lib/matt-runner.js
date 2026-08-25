import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { PROJECT_DIR, REVIEW_SCRIPT, REVIEW_RESULT } from './config.js';

const execFileAsync = promisify(execFile);

/** git status --porcelain 으로 변경 파일 목록을 얻는다 */
export async function changedFiles() {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: PROJECT_DIR });
    return stdout
      .split('\n')
      .map((l) => l.slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 매트(codex_review.sh) 를 실행한다.
 * CLAUDE.md 규칙 13/14 에 따라 이번 요청에서 실제로 바뀐 파일만 판정 대상으로 지정한다.
 *
 * @param {object} opts
 * @param {string[]} opts.targetFiles 이번 요청에서 패트가 바꾼 파일
 * @param {(event:object)=>void} opts.onEvent
 * @param {AbortSignal} [opts.signal] 중단 요청 시 검수 프로세스를 종료한다
 * @returns {Promise<{verdict:string, body:string, exitCode:number}>}
 */
export async function runMatt({ targetFiles = [], onEvent = () => {}, signal }) {
  if (signal?.aborted) {
    return { verdict: 'ABORTED', body: '사용자 요청으로 검수를 시작하지 않았습니다.', exitCode: 1 };
  }
  try {
    await fs.access(REVIEW_SCRIPT);
  } catch {
    return { verdict: 'ERROR', body: 'codex_review.sh 를 찾을 수 없습니다.', exitCode: 1 };
  }

  const note =
    targetFiles.length > 0
      ? [
          '이번 요청에서 패트가 실제로 수정한 파일은 아래뿐이다:',
          targetFiles.map((f) => `- ${f}`).join('\n'),
          '판정(PASS/REVISION_REQUIRED)은 이 파일들의 변경만을 대상으로 내려라.',
          '워킹트리의 나머지 기존 변경사항은 판정 대상에서 제외하고, 필요하면 개선 권고에만 참고로 적어라.',
        ].join('\n')
      : '이번 요청에서 패트가 수정한 파일이 없다. 워킹트리 상태만 참고로 확인하고 판정하라.';

  onEvent({ type: 'status', value: '매트 검수 중' });
  onEvent({ type: 'step', text: `매트 검수 시작 (대상 ${targetFiles.length}개 파일)` });

  // shell 문자열 조합 없이 인자 배열로 실행한다.
  const child = spawn(REVIEW_SCRIPT, ['--note', note], {
    cwd: PROJECT_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  return new Promise((resolve) => {
    let stderr = '';
    let aborted = false;
    const onAbort = () => {
      aborted = true;
      try {
        child.kill('SIGTERM');
      } catch {
        /* 이미 종료된 경우 무시 */
      }
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', () => {}); // 터미널 로그는 사용자에게 그대로 노출하지 않는다
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (c) => {
      stderr += c;
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });

    child.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort);
      resolve({ verdict: 'ERROR', body: `매트 실행 실패: ${err.message}`, exitCode: 1 });
    });

    child.on('close', async (code) => {
      signal?.removeEventListener('abort', onAbort);
      if (aborted) {
        resolve({ verdict: 'ABORTED', body: '사용자 요청으로 검수를 중단했습니다.', exitCode: code ?? 1 });
        return;
      }
      let body = '';
      try {
        body = await fs.readFile(REVIEW_RESULT, 'utf8');
      } catch {
        body = '';
      }
      const hasReport = body.includes('검수 결론');
      let verdict = 'UNKNOWN';
      if (code === 0 && hasReport) verdict = 'PASS';
      else if (code === 0) verdict = 'NO_CHANGES';
      else if (code === 2) verdict = 'REVISION_REQUIRED';
      else verdict = 'ERROR';
      if (verdict === 'NO_CHANGES' && !body) body = '검수할 변경사항이 없습니다.';

      if (!body) {
        body = stderr.slice(-1000) || '검수 결과 파일을 읽지 못했습니다.';
      }
      resolve({ verdict, body, exitCode: code ?? 1 });
    });
  });
}
