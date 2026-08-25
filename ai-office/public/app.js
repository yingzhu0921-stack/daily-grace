const chat = document.getElementById('chat');
const form = document.getElementById('composer');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const thumbs = document.getElementById('thumbs');
const workStatus = document.getElementById('workStatus');
const fileStatus = document.getElementById('fileStatus');
const patStatus = document.getElementById('patStatus');
const mattStatus = document.getElementById('mattStatus');
const projectPath = document.getElementById('projectPath');
const deployBtn = document.getElementById('deployBtn');

/** 첨부 대기열 */
let pending = [];
let busy = false;
let forceReview = false;
let controller = null;

const MAX_FILES = 6;
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function scrollDown() {
  chat.scrollTop = chat.scrollHeight;
}

function addMessage(kind, who, text, extra) {
  const node = el('div', `msg ${kind}`);
  if (who) node.appendChild(el('span', 'who', who));
  if (extra) node.appendChild(extra);
  node.appendChild(el('p', null, text));
  chat.appendChild(node);
  scrollDown();
  return node;
}

/** 진행 단계는 하나의 박스에 접어서 보여준다 (터미널 로그 전체를 뿌리지 않음) */
function stepBox() {
  const box = el('div', 'msg steps');
  box.appendChild(el('span', 'who', '진행 상황'));
  const list = el('ul');
  box.appendChild(list);
  chat.appendChild(box);
  scrollDown();
  return {
    add(text) {
      list.appendChild(el('li', null, text));
      scrollDown();
    },
  };
}

function setStatus(value) {
  workStatus.textContent = value;
  workStatus.classList.toggle('busy', value !== '대기' && value !== '완료' && value !== '매트 검수 중');
  workStatus.classList.toggle('matt', value === '매트 검수 중');
  patStatus.textContent = `패트 · ${value === '매트 검수 중' ? '대기' : value}`;
  patStatus.classList.toggle('active', busy && value !== '매트 검수 중');
  mattStatus.textContent = `매트 · ${value === '매트 검수 중' ? '검수 중' : '대기'}`;
  mattStatus.classList.toggle('active', value === '매트 검수 중');
}

function renderThumbs() {
  thumbs.innerHTML = '';
  thumbs.hidden = pending.length === 0;
  pending.forEach((item, idx) => {
    const box = el('div', 'thumb');
    const img = document.createElement('img');
    img.src = item.preview;
    img.alt = item.name;
    const del = el('button', null, '×');
    del.type = 'button';
    del.title = '첨부 취소';
    del.addEventListener('click', () => {
      URL.revokeObjectURL(item.preview);
      pending.splice(idx, 1);
      renderThumbs();
    });
    box.append(img, del);
    thumbs.appendChild(box);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

/** 파일 선택 / 붙여넣기 공용 첨부 추가 */
function addFiles(files, { quiet = false } = {}) {
  let added = 0;
  for (const file of files) {
    if (!OK_TYPES.includes(file.type)) {
      if (!quiet) addMessage('error', null, `지원하지 않는 형식입니다: ${file.name || file.type}`);
      continue;
    }
    if (pending.length >= MAX_FILES) {
      addMessage('error', null, `첨부는 최대 ${MAX_FILES}개까지 가능합니다.`);
      break;
    }
    const name = file.name || `pasted-${Date.now()}.${(file.type.split('/')[1] || 'png')}`;
    pending.push({ file, name, preview: URL.createObjectURL(file) });
    added += 1;
  }
  if (added > 0) renderThumbs();
  return added;
}

fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
  renderThumbs();
});

/** 이미지 붙여넣기 (Cmd/Ctrl+V) */
function handlePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  const images = [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) images.push(file);
    }
  }
  if (images.length === 0) return; // 일반 텍스트 붙여넣기는 그대로 둔다
  e.preventDefault();
  addFiles(images, { quiet: true });
}

input.addEventListener('paste', handlePaste);
document.addEventListener('paste', (e) => {
  if (e.target === input) return; // 중복 처리 방지
  handlePaste(e);
});

document.getElementById('quick').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-q]');
  if (!btn) return;
  forceReview = btn.dataset.review === '1';
  input.value = btn.dataset.q;
  input.focus();
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    form.requestSubmit();
  }
});

function verdictNode(verdict) {
  const cls = verdict === 'PASS' ? 'pass' : verdict === 'REVISION_REQUIRED' ? 'revision' : 'other';
  return el('span', `verdict ${cls}`, verdict);
}

async function send(message, files) {
  const payload = { message, review: forceReview, attachments: [] };
  for (const item of files) {
    payload.attachments.push({
      name: item.name,
      mime: item.file.type,
      data: await fileToBase64(item.file),
    });
  }

  await streamSse('/api/chat', payload);
}

/** SSE 응답을 읽어 이벤트로 흘려보낸다 (채팅 / 배포 공용) */
async function streamSse(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({ error: '요청 실패' }));
    throw new Error(err.error || '요청 실패');
  }

  const steps = stepBox();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() || '';
    for (const part of parts) {
      const line = part.replace(/^data: /, '').trim();
      if (!line) continue;
      let evt;
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }
      handleEvent(evt, steps);
    }
  }
}

function handleEvent(evt, steps) {
  switch (evt.type) {
    case 'status':
      setStatus(evt.value);
      break;
    case 'step':
      steps.add(evt.text);
      break;
    case 'pat':
      addMessage(evt.isError ? 'error' : 'pat', evt.isError ? null : '패트', evt.text);
      break;
    case 'matt':
      addMessage('matt', '매트 (검수)', evt.text, verdictNode(evt.verdict));
      break;
    case 'deploy':
      if (evt.ok) {
        addMessage('deploy-ok', '배포', evt.text);
      } else if (evt.aborted) {
        addMessage('system', '배포', evt.text);
      } else {
        addMessage('error', '배포', evt.text);
      }
      break;
    case 'files':
      fileStatus.textContent =
        `변경 파일 ${evt.total}개` + (evt.touched?.length ? ` · 이번 작업 ${evt.touched.length}개` : '');
      break;
    case 'error':
      addMessage('error', null, evt.message);
      break;
    default:
      break;
  }
}

/** 실행 중에는 전송 버튼이 중단 버튼으로 바뀐다 */
function setBusy(on) {
  busy = on;
  sendBtn.textContent = on ? '중단' : '전송';
  sendBtn.classList.toggle('stop', on);
  sendBtn.disabled = false;
  deployBtn.disabled = on;
}

/**
 * 배포. 사용자가 버튼을 누르고 확인해야만 실행된다.
 * 패트는 이 경로를 쓸 수 없다 (배포 도구는 계속 차단 상태).
 */
deployBtn.addEventListener('click', async () => {
  if (busy) return;
  const ok = window.confirm(
    '지금 빌드 후 실제 배포를 진행합니다.\n\n' +
      '  1) npm run build\n' +
      '  2) npx wrangler pages deploy dist\n\n' +
      '운영 사이트가 갱신됩니다. 계속할까요?'
  );
  if (!ok) return;

  addMessage('user', '나', '배포 실행 (버튼 승인)');
  controller = new AbortController();
  setBusy(true);
  setStatus('배포 준비 중');

  try {
    await streamSse('/api/deploy', { confirm: true });
  } catch (err) {
    if (err.name === 'AbortError') addMessage('system', null, '배포를 중단했습니다.');
    else addMessage('error', null, err.message);
  } finally {
    setBusy(false);
    controller = null;
    refreshStatus();
  }
});

/** 진행 중인 작업 중단 (서버가 CLI 프로세스를 종료한다) */
function stopRun() {
  if (!busy || !controller) return;
  controller.abort();
  setStatus('중단 요청됨');
}

sendBtn.addEventListener('click', (e) => {
  if (busy) {
    e.preventDefault();
    stopRun();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && busy) stopRun();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (busy) return;
  const message = input.value.trim();
  if (!message && pending.length === 0) return;

  const files = pending;
  const note = files.length ? el('p', 'attachnote', `이미지 ${files.length}장 첨부`) : null;
  addMessage('user', '나', message || '(이미지만 전송)', note);

  pending = [];
  renderThumbs();
  input.value = '';
  input.style.height = 'auto';

  controller = new AbortController();
  setBusy(true);
  setStatus('요청 전달 중');

  try {
    await send(message, files);
  } catch (err) {
    if (err.name === 'AbortError') {
      addMessage('system', null, '작업을 중단했습니다.');
    } else {
      addMessage('error', null, err.message);
    }
  } finally {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setBusy(false);
    forceReview = false;
    controller = null;
    setStatus('대기');
    refreshStatus();
  }
});

async function refreshStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    projectPath.textContent = data.project;
    fileStatus.textContent = `변경 파일 ${data.changedCount}개`;
  } catch {
    projectPath.textContent = '서버에 연결하지 못했습니다.';
  }
}

setStatus('대기');
refreshStatus();
