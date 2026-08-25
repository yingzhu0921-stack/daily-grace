import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, PORT, PROJECT_DIR, OFFICE_DIR, wantsReview } from './lib/config.js';
import { saveAttachments } from './lib/uploads.js';
import { runPat } from './lib/pat-runner.js';
import { runMatt, changedFiles } from './lib/matt-runner.js';
import { runDeploy, DEPLOY_STEPS } from './lib/deploy-runner.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const MAX_BODY_BYTES = 60 * 1024 * 1024; // 이미지 base64 여유분
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** 서버 세션 상태 (로컬 1인 사용 전제) */
const state = { sessionId: null };

/** DNS rebinding 방지: Host 헤더가 로컬인지 확인한다 */
function isLocalRequest(req) {
  const host = String(req.headers.host || '');
  const name = host.split(':')[0];
  return name === '127.0.0.1' || name === 'localhost' || name === '[::1]';
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('요청이 너무 큽니다.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (err) {
        reject(new Error('잘못된 요청 형식입니다.'));
      }
    });
    req.on('error', reject);
  });
}

function openSse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  return (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };
}

async function serveStatic(req, res) {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const abs = path.resolve(PUBLIC_DIR, rel);
  // public 폴더 바깥 접근 차단
  if (!abs.startsWith(path.resolve(PUBLIC_DIR) + path.sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const data = await fs.readFile(abs);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('not found');
  }
}

async function handleChat(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
    return;
  }

  const message = String(body.message || '').trim();
  const forceReview = Boolean(body.review);
  if (!message && (!body.attachments || body.attachments.length === 0)) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '보낼 내용이 없습니다.' }));
    return;
  }

  const send = openSse(res);
  // 브라우저가 연결을 끊으면(중단 버튼) 실행 중인 자식 프로세스를 종료한다.
  const controller = new AbortController();
  let closed = false;
  res.on('close', () => {
    closed = true;
    if (!res.writableEnded) controller.abort();
  });
  const emit = (event) => {
    if (!closed) send(event);
  };

  try {
    const attachments = await saveAttachments(body.attachments || []);
    if (attachments.length > 0) {
      emit({ type: 'step', text: `첨부 ${attachments.length}개를 패트에게 전달` });
    }

    const before = new Set(await changedFiles());
    emit({ type: 'status', value: '패트 작업 시작' });

    const result = await runPat({
      message,
      attachments,
      resumeSessionId: state.sessionId,
      onEvent: emit,
      signal: controller.signal,
    });
    if (result.sessionId) state.sessionId = result.sessionId;

    emit({ type: 'pat', text: result.text || '(응답 없음)', isError: result.isError });

    const after = await changedFiles();
    const touched = after.filter((f) => !before.has(f));
    emit({ type: 'files', total: after.length, touched });

    if (!result.aborted && !controller.signal.aborted && (forceReview || wantsReview(message))) {
      const matt = await runMatt({ targetFiles: touched, onEvent: emit, signal: controller.signal });
      emit({ type: 'matt', verdict: matt.verdict, text: matt.body });
    }

    emit({ type: 'status', value: result.aborted ? '중단됨' : '완료' });
    emit({ type: 'done' });
  } catch (err) {
    emit({ type: 'error', message: err.message });
    emit({ type: 'status', value: '대기' });
  } finally {
    if (!closed) res.end();
  }
}

async function handleReview(req, res) {
  const send = openSse(res);
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });
  try {
    const touched = await changedFiles();
    const matt = await runMatt({ targetFiles: touched, onEvent: send, signal: controller.signal });
    send({ type: 'matt', verdict: matt.verdict, text: matt.body });
    send({ type: 'status', value: '완료' });
    send({ type: 'done' });
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    res.end();
  }
}

/**
 * 배포. 사용자가 배포 버튼으로 명시적으로 승인한 경우에만 실행된다.
 * body.confirm === true 가 없으면 거부한다 (오폭 방지).
 * 패트는 이 경로를 쓸 수 없다 (배포 도구는 여전히 차단 상태).
 */
async function handleDeploy(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message }));
    return;
  }
  if (body?.confirm !== true) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '배포는 명시적 확인이 필요합니다.' }));
    return;
  }

  const send = openSse(res);
  const controller = new AbortController();
  let closed = false;
  res.on('close', () => {
    closed = true;
    if (!res.writableEnded) controller.abort();
  });
  const emit = (event) => {
    if (!closed) send(event);
  };

  try {
    emit({ type: 'step', text: `배포 단계: ${DEPLOY_STEPS.map((s) => s.label).join(' → ')}` });
    const result = await runDeploy({ onEvent: emit, signal: controller.signal });
    emit({
      type: 'deploy',
      ok: result.ok,
      aborted: result.aborted,
      text: result.message,
      urls: result.urls,
    });
    emit({ type: 'status', value: result.ok ? '배포 완료' : result.aborted ? '중단됨' : '배포 실패' });
    emit({ type: 'done' });
  } catch (err) {
    emit({ type: 'error', message: err.message });
    emit({ type: 'status', value: '대기' });
  } finally {
    if (!closed) res.end();
  }
}

async function handleStatus(req, res) {
  const files = await changedFiles();
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(
    JSON.stringify({
      project: PROJECT_DIR,
      office: OFFICE_DIR,
      changedCount: files.length,
      sessionActive: Boolean(state.sessionId),
    })
  );
}

const server = http.createServer(async (req, res) => {
  if (!isLocalRequest(req)) {
    res.writeHead(403).end('local only');
    return;
  }
  const { pathname } = new URL(req.url, 'http://localhost');

  try {
    if (req.method === 'POST' && pathname === '/api/chat') return await handleChat(req, res);
    if (req.method === 'POST' && pathname === '/api/review') return await handleReview(req, res);
    if (req.method === 'POST' && pathname === '/api/deploy') return await handleDeploy(req, res);
    if (req.method === 'GET' && pathname === '/api/status') return await handleStatus(req, res);
    if (req.method === 'POST' && pathname === '/api/reset') {
      state.sessionId = null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === 'GET') return await serveStatic(req, res);
    res.writeHead(405).end('method not allowed');
  } catch (err) {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, HOST, () => {
  console.log('Daily Grace AI OFFICE');
  console.log(`  주소     : http://${HOST}:${PORT}`);
  console.log(`  프로젝트 : ${PROJECT_DIR}`);
  console.log('  (127.0.0.1 에만 바인딩됩니다. Ctrl+C 로 종료)');
});
