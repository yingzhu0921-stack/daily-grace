import { spawn } from 'node:child_process';
import { PROJECT_DIR } from './config.js';

/** Cloudflare 계정 식별자 (비밀값 아님). 환경변수가 있으면 그쪽을 쓴다. */
const CF_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID || '115ba31fc14cf5a52b29132dc8026ac8';
const CF_PAGES_PROJECT = process.env.CF_PAGES_PROJECT || 'daily-grace';

/**
 * 배포 단계 정의.
 * shell 문자열이 아니라 (명령, 인자배열) 로만 정의한다.
 * 배포 대상을 바꾸려면 여기만 수정하면 된다.
 */
export const DEPLOY_STEPS = [
  { label: '빌드', cmd: 'npm', args: ['run', 'build'] },
  {
    label: '배포',
    cmd: 'npx',
    args: ['wrangler', 'pages', 'deploy', 'dist', `--project-name=${CF_PAGES_PROJECT}`],
    env: { CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID },
  },
];

const URL_RE = /https:\/\/[a-z0-9.-]+\.(?:pages\.dev|workers\.dev)[^\s]*/gi;

/** 한 단계를 실행하고 (exitCode, 출력 꼬리) 를 돌려준다 */
function runStep(step, { onEvent, signal }) {
  return new Promise((resolve) => {
    const child = spawn(step.cmd, step.args, {
      cwd: PROJECT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      // 단계별 추가 환경변수 (예: CLOUDFLARE_ACCOUNT_ID)
      env: { ...process.env, ...(step.env || {}) },
    });

    let aborted = false;
    const onAbort = () => {
      aborted = true;
      try {
        child.kill('SIGTERM');
      } catch {
        /* 이미 종료됨 */
      }
    };
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    let out = '';
    const collect = (chunk) => {
      out += chunk;
      if (out.length > 40000) out = out.slice(-40000);
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', collect);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', collect);

    child.on('error', (err) => {
      signal?.removeEventListener('abort', onAbort);
      resolve({ code: 1, out: `${step.cmd} 실행 실패: ${err.message}`, aborted });
    });
    child.on('close', (code) => {
      signal?.removeEventListener('abort', onAbort);
      resolve({ code: code ?? 1, out, aborted });
    });
  });
}

/**
 * 빌드 → 배포를 순서대로 실행한다.
 * 사용자가 배포 버튼을 눌러 명시적으로 승인한 경우에만 호출되어야 한다.
 */
export async function runDeploy({ onEvent = () => {}, signal } = {}) {
  const urls = new Set();

  for (const step of DEPLOY_STEPS) {
    if (signal?.aborted) {
      return { ok: false, aborted: true, message: '배포를 중단했습니다.', urls: [...urls] };
    }
    onEvent({ type: 'status', value: `${step.label} 중` });
    onEvent({ type: 'step', text: `${step.label} 시작: ${step.cmd} ${step.args.join(' ')}` });

    const { code, out, aborted } = await runStep(step, { onEvent, signal });
    for (const m of out.match(URL_RE) || []) urls.add(m);

    if (aborted) {
      return { ok: false, aborted: true, message: `${step.label} 단계에서 중단했습니다.`, urls: [...urls] };
    }
    if (code !== 0) {
      // 터미널 로그 전체가 아니라 마지막 부분만 보여준다
      const tail = out.trim().split('\n').slice(-12).join('\n');
      return {
        ok: false,
        aborted: false,
        message: `${step.label} 단계에서 실패했습니다 (exit ${code}).\n\n${tail}`,
        urls: [...urls],
      };
    }
    onEvent({ type: 'step', text: `${step.label} 완료` });
  }

  const list = [...urls];
  return {
    ok: true,
    aborted: false,
    message: list.length > 0 ? `배포 완료\n${list.join('\n')}` : '배포 완료',
    urls: list,
  };
}
