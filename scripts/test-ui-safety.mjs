import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

function load(path, bindings = {}) {
  const exports = {};
  vm.runInNewContext(compile(read(path)), {
    exports,
    require: name => name === './PrayingHandsIcon'
      ? load('src/components/ui/PrayingHandsIcon.tsx')
      // 상대경로는 scripts/ 기준으로 찾아서 못 읽는다. 저장소 안의 모듈은 여기서 짚어 준다.
      : name === './cardStyles'
        ? load('functions/api/_lib/cardStyles.ts')
        : name === './rateLimit'
          ? load('functions/api/_lib/rateLimit.ts', bindings)
          : require(name),
    ...bindings,
  });
  return exports;
}

for (const name of ['arrowRight', 'archive', 'bookOpen', 'prayingHands']) {
  test(`${name} renders an SVG icon`, () => {
    const { AppIcon } = load('src/components/ui/AppIcon.tsx');
    const markup = renderToStaticMarkup(React.createElement(AppIcon, { name }));
    assert.match(markup, /<svg/);
  });
}

test('record export skips booleans and blank values without losing text', () => {
  const source = read('src/pages/CustomRecordView.tsx');
  const ast = ts.createSourceFile('view.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'items') expression = node.initializer.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression);
  const context = { value: ['첫째', true, false, null, undefined, 12, {}, '', '  ', ' 둘째 '] };
  vm.runInNewContext(compile(`globalThis.result = ${expression};`), context);
  assert.deepEqual(Array.from(context.result), ['첫째', ' 둘째 ']);
});

test('category list still parses JSON and normalizes legacy colors', async () => {
  const api = load('src/utils/categoryStorage.ts', {
    fetch: async () => ({ ok: true, json: async () => [{ id: '5', color: '#4F8A5B', icon: 'bookOpen' }] }),
  });
  const categories = await api.list();
  assert.equal(categories[0].color, '#7DB87D');
  assert.equal(categories[0].icon, 'bookOpen');
});

test('category creation preserves its request and JSON response', async () => {
  const api = load('src/utils/categoryStorage.ts', {
    fetch: async (url, options) => {
      assert.equal(url, '/api/data/categories');
      assert.equal(options.method, 'POST');
      assert.equal(options.credentials, 'include');
      assert.equal(JSON.parse(options.body).name, '새 기록');
      return { ok: true, json: async () => ({ id: '5', name: '새 기록', color: '#4F8A5B' }) };
    },
  });
  const result = await api.create({ name: '새 기록', color: '#4F8A5B', fields: ['content'] });
  assert.equal(result.id, '5');
  assert.equal(result.color, '#7DB87D');
});

test('category deletion reports a failed server response', async () => {
  const api = load('src/utils/categoryStorage.ts', {
    fetch: async () => ({ ok: false }),
  });
  await assert.rejects(() => api.remove('category-1'), /카테고리 삭제 실패/);
});

test('save feedback distinguishes local persistence from pending cloud sync', () => {
  const { saveFeedback } = load('src/utils/saveFeedback.ts');
  assert.equal(saveFeedback(false), '기기에 저장했습니다.');
  assert.match(saveFeedback(true), /클라우드 동기화는 자동으로 진행/);
  assert.doesNotMatch(saveFeedback(true), /백업되었습니다/);
});

test('unused record analysis API is not exposed', () => {
  assert.equal(existsSync(new URL('../functions/api/analyze-records.ts', import.meta.url)), false);
});

test('private record and card state are not written with console.log', () => {
  for (const path of [
    'src/pages/CustomRecordNew.tsx',
    'src/pages/CustomRecordView.tsx',
    'src/pages/CardDesigner.tsx',
    'src/pages/CardsVault.tsx',
  ]) {
    assert.doesNotMatch(read(path), /console\.log\s*\(/);
  }
});

test('spreadsheet code is lazy-loaded and all export formats include custom records and cards', () => {
  const source = read('src/utils/dataExport.ts');
  assert.doesNotMatch(source, /^import .* from ['"]xlsx['"];?$/m);
  assert.match(source, /await import\(['"]xlsx['"]\)/);
  assert.match(source, /customRecords\.forEach/);
  assert.match(source, /verseCards\.forEach/);
  assert.match(source, /append_sheet\(wb, ws, '커스텀기록'\)/);
  assert.match(source, /append_sheet\(wb, ws, '말씀카드'\)/);
});

test('API JSON validation rejects malformed, oversized, and unsafe IDs', async () => {
  const api = load('functions/api/_lib/requestValidation.ts', { Response });
  const malformed = await api.readJsonObject(new Request('https://example.test', {
    method: 'POST',
    body: '{broken',
  }));
  assert.equal(malformed.response.status, 400);

  const oversized = await api.readJsonObject(new Request('https://example.test', {
    method: 'POST',
    body: JSON.stringify({ text: 'x'.repeat(50) }),
  }), 20);
  assert.equal(oversized.response.status, 413);
  assert.equal(api.validId('safe_uuid-123'), true);
  assert.equal(api.validId('../unsafe'), false);
});

test('manual backgrounds warn the image model about the edges the display ratio crops', () => {
  const { buildManualBackgroundPrompt, cropSafeNote } = load('functions/api/_lib/manualBackground.ts');
  // 9:16 은 2:3 으로 만들어 좌우를 각 8%씩 잘라 낸다. 안내가 없으면 인물이 양옆에서 잘렸다.
  assert.match(cropSafeNote('1024x1536', '9:16'), /LEFT and RIGHT ~8%.*central 84%/);
  assert.match(cropSafeNote('1024x1536', '4:5'), /TOP and BOTTOM ~8%/);
  assert.match(cropSafeNote('1536x1024', '4:3'), /LEFT and RIGHT ~6%/);
  assert.equal(cropSafeNote('1024x1024', '1:1'), '');
  assert.equal(cropSafeNote('1024x1536', '2:3'), '');
  assert.equal(cropSafeNote('1024x1024', undefined), '');
  const note = cropSafeNote('1024x1536', '9:16');
  assert.ok(buildManualBackgroundPrompt('scene', '심플 낙서', note).includes(note));
  assert.doesNotMatch(buildManualBackgroundPrompt('scene', '심플 낙서'), /CROP-SAFE/);
  // 인물이 한가운데라 가운데 글상자와 얼굴이 겹쳤다(2026-11-10 사용자 결정: 인물은 아래쪽, 위는 글씨 자리).
  assert.match(buildManualBackgroundPrompt('scene', '감성 사진'), /COMPOSITION: place the main subject, and any people, in the LOWER half/);
});

test('all manual styles preserve scene constraints and generate backgrounds only', () => {
  const { manualBackgroundStyles, buildManualBackgroundPrompt, backgroundExpansionInstructions } = load('functions/api/_lib/manualBackground.ts');
  for (const style of [...Object.keys(manualBackgroundStyles), undefined, 'unknown']) {
    const scene = 'Rain outside a window at night, cool blue tones, no people.';
    const prompt = buildManualBackgroundPrompt(scene, style);
    assert.ok(prompt.includes(scene));
    assert.match(prompt, /Explicit scene details take priority/);
    assert.match(prompt, /NO text, letters/);
    assert.doesNotMatch(prompt, /Overlay this text/);
    const expansion = backgroundExpansionInstructions(style);
    assert.match(expansion, /캐릭터를 강제로 추가하지/);
    // 성경 구절이 들어와도 문장 속 낱말을 소품으로 줍지 않게 하는 규칙은 모든 스타일에 있어야 한다.
    assert.match(expansion, /장면 묘사가 아니라 인용문/);

    // 1단계를 늘리는 말투는 매체마다 다르다. 사진 말투로 늘리면 평면 그림 기법과 충돌한다.
    // 스타일을 안 골랐거나 모르는 이름이면 지금까지처럼 사진 쪽이다.
    const medium = manualBackgroundStyles[style ?? '']?.medium ?? 'photo';
    if (medium === 'photo') {
      assert.match(expansion, /빛, 색감, 질감, 구도만/);
      assert.match(expansion, /깊이감을 살린다/);
      // 사진으로 성경 장면을 재현하면 교회 홍보물처럼 보인다.
      assert.match(expansion, /재현하지 마세요/);
    } else {
      assert.match(expansion, /색, 형태, 요소의 배치만/);
      assert.match(expansion, /사진이 아니라 그림입니다/);
      assert.doesNotMatch(expansion, /빛, 색감, 질감, 구도만/);
      assert.doesNotMatch(expansion, /깊이감을 살린다/);
      assert.match(expansion, /직접 그려도 됩니다/);
    }

    // 사람은 수채화·플랫 일러스트·심플 낙서에서 허용한다(2026-11-10 사용자 결정). 사진은 사람 없이.
    // 미니멀 감성은 2026-11-11 부터 '멀리 아주 작게'만 허용 — 성경 인물도 주인공 크기로 키우지 않는다.
    const peopleAllowed = ['맑은 수채화', '플랫 일러스트', '심플 낙서'].includes(style ?? '');
    if (style === '빈티지 필름') {
      // 2026-11-11: 거리 사진처럼 평범한 요즘 사람의 일상 순간만 허용. 성경 분장·연출은 금지, 그림체용 PEOPLE/BIBLE 규칙은 없음.
      assert.match(expansion, /평범한 요즘 사람/);
      assert.match(expansion, /분장이나 연출 장면은 절대/);
      assert.doesNotMatch(expansion, /1-1-2\./);
      assert.doesNotMatch(prompt, /PEOPLE:/);
      assert.doesNotMatch(prompt, /BIBLE SCENES/);
    } else if (style === '미니멀 감성') {
      assert.match(expansion, /멀리 아주 작게 한 명만/);
      assert.match(expansion, /1-1-2\. 그 순간이 성경 속 사건이고/);
      assert.doesNotMatch(expansion, /화면에서 한눈에 보이는 크기로/);
      assert.match(prompt, /PEOPLE:.*TINY/);
      assert.match(prompt, /BIBLE SCENES \(this style keeps people tiny\)/);
      assert.doesNotMatch(prompt, /never a distant speck/);
    } else if (peopleAllowed) {
      assert.match(expansion, /3-1\. 사람은 예외/);
      assert.match(prompt, /PEOPLE:/);
      // 성경 장면의 인물은 실제 모습대로, 주인공 크기로(2026-11-10 사용자 결정: 너무 간접적이었다).
      assert.match(expansion, /1-1-2\. 그 순간이 성경 속 사건이고/);
      assert.match(prompt, /BIBLE SCENES:/);
      assert.match(prompt, /never a distant speck/);
    } else {
      assert.doesNotMatch(expansion, /1-1-2\./);
      assert.doesNotMatch(prompt, /BIBLE SCENES:/);
      assert.doesNotMatch(expansion, /사람은 예외/);
      assert.match(expansion, /지정하지 않은 주인공, 인물/);
      assert.doesNotMatch(prompt, /PEOPLE:/);
      // 사람을 허용하지 않는 스타일의 규칙 4 는 원래 문장 그대로여야 한다.
      assert.match(expansion, /풍경을 선으로 표현하며 캐릭터를 강제로 추가하지 않습니다\./);
    }
  }
});

test('card text drops verse numbers only when they are clearly verse numbers', () => {
  const { stripVerseNumbers: strip } = load('src/utils/verseNumbers.ts');
  // 이어지는 절 번호는 뺀다. 출처는 남는다.
  assert.equal(strip('[히6:13-15] 13 하나님이 약속하실 때에 14 이르시되 15 그가 참아'), '[히6:13-15] 하나님이 약속하실 때에 이르시되 그가 참아');
  assert.equal(strip('13 하나님이\n14 이르시되\n15 그가\n히6:13-15'), '하나님이\n이르시되\n그가\n히6:13-15');
  // 한 절은 출처의 시작 절과 같을 때만.
  assert.equal(strip('[요3:16] 16 하나님이 세상을 이처럼'), '[요3:16] 하나님이 세상을 이처럼');
  assert.equal(strip('5 하나님은 사랑이시라'), '5 하나님은 사랑이시라');
  // 본문의 숫자는 남긴다.
  assert.equal(strip('오늘 3 가지 감사했어요'), '오늘 3 가지 감사했어요');
  assert.equal(strip('3 가지 감사 4 번째 기도'), '3 가지 감사 4 번째 기도');
  assert.equal(strip('[마5:3-4] 3 심령이 가난한 자는 4 애통하는 자는 12 제자'), '[마5:3-4] 심령이 가난한 자는 애통하는 자는 12 제자');
  // 진짜 성경 출처가 없으면 아무것도 빼지 않는다 — 기도제목 번호 목록, 날짜, 시간.
  for (const keep of [
    '7 그는 육체에 계실 때에 8 그가 아들이시면서도',
    '1 엄마 건강 2 아빠 직장 3 자녀 믿음',
    '[기도제목] 1 엄마 건강\n2 아빠 직장\n3 자녀 믿음',
    '16 기도제목\n오후 3:16 기도',
    '3 월의 목표 4 월의 기도',
    '필요 3:16 16 하나님이 17 그를',
    // 문장 중간·끝의 시간 표현은 출처가 아니다(전도서·시편·아가 약어와 모양이 같다).
    '16 기도제목\n기도 전 3:16 묵상',
    '16 오늘의 묵상\n아 3:16에 다시 읽자',
    '16 기도제목\n기도 전 3:16',
    // 앞의 분류 괄호는 출처가 아니다.
    '[묵상] 13 번째 기도\n히6:13',
  ]) assert.equal(strip(keep), keep);
  // 긴 줄표 범위와, 끝에 번역본까지 붙은 출처.
  assert.equal(strip('[히6:13–15] 13 하나님이 14 이르시되 15 그가'), '[히6:13–15] 하나님이 이르시되 그가');
  assert.equal(strip('13 하나님이\n14 이르시되\n15 그가\n(히 6:13-15 개역개정)'), '하나님이\n이르시되\n그가\n(히 6:13-15 개역개정)');
  // 이어지는 번호 사이에 다른 숫자가 끼면 손대지 않는다.
  const mixed = '[시23:1-3] 1 여호와는 나의 목자시니 2 그가 나를 푸른 풀밭에 5 개 3 내 영혼을';
  assert.equal(strip(mixed), mixed);
});

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('local records are isolated when switching accounts', () => {
  const localStorage = fakeStorage({
    dg_local_data_owner: 'user-a',
    prayers: JSON.stringify([{ id: 'private-a', content: 'A' }]),
    'dg_scoped:user-b:prayers': JSON.stringify([{ id: 'private-b', content: 'B' }]),
  });
  const sessionStorage = fakeStorage();
  const api = load('src/utils/localDataScope.ts', {
    localStorage,
    sessionStorage,
    Event,
    window: { dispatchEvent() {} },
  });
  api.switchLocalDataScope('user-b');
  assert.equal(JSON.parse(localStorage.getItem('prayers'))[0].id, 'private-b');
  assert.equal(JSON.parse(localStorage.getItem('dg_scoped:user-a:prayers'))[0].id, 'private-a');
});

test('guest records are claimed only by the account that logs in', () => {
  const localStorage = fakeStorage({
    dg_local_data_owner: 'guest',
    meditations: JSON.stringify([{ id: 'guest-note' }]),
    dg_deleted_records: JSON.stringify({ prayers: { 'guest-delete': 'now' } }),
    'dg_scoped:user-a:meditations': JSON.stringify([{ id: 'account-note' }]),
    'dg_scoped:user-a:dg_deleted_records': JSON.stringify({ prayers: { 'account-delete': 'before' } }),
  });
  const api = load('src/utils/localDataScope.ts', {
    localStorage,
    sessionStorage: fakeStorage(),
    Event,
    window: { dispatchEvent() {} },
  });
  api.switchLocalDataScope('user-a');
  assert.deepEqual(JSON.parse(localStorage.getItem('meditations')).map(item => item.id).sort(), ['account-note', 'guest-note']);
  assert.deepEqual(Object.keys(JSON.parse(localStorage.getItem('dg_deleted_records')).prayers), ['account-delete']);
  assert.equal(localStorage.getItem('dg_scoped:guest:meditations'), null);
});

test('failed record deletions remain queued until cloud confirmation', () => {
  const localStorage = fakeStorage();
  const api = load('src/utils/deletionQueue.ts', {
    localStorage,
    window: {},
  });
  api.markRecordDeleted('prayers', 'prayer-1');
  assert.deepEqual(Array.from(api.getDeletedRecordIds('prayers')), ['prayer-1']);
  api.clearRecordDeletion('prayers', 'prayer-1');
  assert.deepEqual(Array.from(api.getDeletedRecordIds('prayers')), []);
});

// 유료 AI 하루 한도(2026-11-10 사용자 결정: '넉넉하게'). rate_limits 테이블을 흉내 낸 가짜 DB로 센다.
function clock(start) {
  let now = start;
  class FakeDate extends Date { static now() { return now; } }
  return { Date: FakeDate, set: value => { now = value; } };
}

function fakeRateDb() {
  const rows = new Map();
  return {
    rows,
    prepare: () => ({
      bind: (bucket, key, windowStart) => ({
        first: async () => {
          const id = `${bucket}|${key}|${windowStart}`;
          rows.set(id, (rows.get(id) || 0) + 1);
          return { count: rows.get(id) };
        },
      }),
    }),
  };
}

test('AI calls stop at the per-account daily limit even when hourly limits reset', async () => {
  const time = clock(Date.UTC(2026, 10, 10, 1, 0, 0));
  const { checkAiLimits, AI_LIMITS } = load('functions/api/_lib/aiLimits.ts', { crypto, Date: time.Date });
  const db = fakeRateDb();
  {
    let allowed = 0;
    let lastScope = '';
    // 매시간 시간당 한도만큼 시도한다. 시간당 한도로는 막히지 않고, 하루 합계에서 막혀야 한다.
    for (let hour = 0; hour < 5; hour++) {
      time.set(Date.UTC(2026, 10, 10, 1 + hour, 0, 0));
      for (let i = 0; i < AI_LIMITS['generate-image'].perHour; i++) {
        const r = await checkAiLimits(db, 'user-a', 'generate-image');
        if (r.allowed) allowed++; else lastScope = r.scope;
      }
    }
    assert.equal(allowed, AI_LIMITS['generate-image'].perDay);
    assert.equal(lastScope, 'day');
    // 다른 계정은 영향을 받지 않는다.
    assert.equal((await checkAiLimits(db, 'user-b', 'generate-image')).allowed, true);
    // 하루는 한국 자정에 바뀐다. 한국 시간 11/10 오후 11시(UTC 14시)에는 아직 막히고,
    // 11/11 오전 0시 30분(UTC 11/10 15:30)에는 다시 된다. 전에는 UTC 자정(한국 오전 9시) 기준이었다.
    time.set(Date.UTC(2026, 10, 10, 14, 0, 0));
    assert.equal((await checkAiLimits(db, 'user-a', 'generate-image')).allowed, false);
    time.set(Date.UTC(2026, 10, 10, 15, 30, 0));
    assert.equal((await checkAiLimits(db, 'user-a', 'generate-image')).allowed, true);
  }
});

test('image-making AI calls share one service-wide daily cap; text calls do not count toward it', async () => {
  const time = clock(Date.UTC(2026, 10, 10, 3, 0, 0));
  const { checkAiLimits, GLOBAL_IMAGES_PER_DAY } = load('functions/api/_lib/aiLimits.ts', { crypto, Date: time.Date });
  const db = fakeRateDb();
  {
    let allowed = 0;
    let scope = '';
    // 계정을 많이 만들어 각자 조금씩 써도 서비스 전체 합계에서 막혀야 한다.
    for (let u = 0; u < 60 && !scope; u++) {
      for (let i = 0; i < 10; i++) {
        const r = await checkAiLimits(db, `user-${u}`, i % 2 ? 'auto-complete' : 'generate-image');
        if (r.allowed) allowed++; else { scope = r.scope; break; }
      }
    }
    assert.equal(allowed, GLOBAL_IMAGES_PER_DAY);
    assert.equal(scope, 'service');
    // 글만 다루는 호출은 서비스 전체 그림 한도와 무관하다.
    assert.equal((await checkAiLimits(db, 'user-x', 'condense')).allowed, true);
    assert.equal((await checkAiLimits(db, 'user-x', 'unknown-action')).allowed, true);
  }
});

// ── 카드 그림 업로드 (2026-11-10 점검 4·5번) ──
const webBindings = { atob, TextEncoder, Headers, Uint8Array, String };
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, ...Buffer.from('IHDR'), ...new Array(17).fill(1)];
const HEIC_BYTES = [0, 0, 0, 24, ...Buffer.from('ftypheic'), 0, 0, 0, 0, ...Buffer.from('mif1heic'), 0, 0, 0, 8, ...Buffer.from('meta')];
const dataUrl = (type, bytes) => `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;

test('card images are accepted by their real bytes, not by the type the upload claims', () => {
  const { decodeImageDataUrl, imageResponseHeaders } = load('functions/api/_lib/imageUpload.ts', webBindings);
  const png = decodeImageDataUrl(dataUrl('image/png', PNG_BYTES));
  assert.equal(png.ok, true);
  assert.equal(png.contentType, 'image/png');
  assert.equal(decodeImageDataUrl(dataUrl('image/jpeg', [0xff, 0xd8, 0xff, 0xe0, 1, 2])).contentType, 'image/jpeg');
  const WEBP = [...Buffer.from('RIFF'), 12, 0, 0, 0, ...Buffer.from('WEBPVP8 '), 0, 0, 0, 0];
  assert.equal(decodeImageDataUrl(dataUrl('image/webp', WEBP)).contentType, 'image/webp');
  // 일부 브라우저는 HEIC 사진을 형식 없이 읽는다. 내용이 그림이면 받는다.
  const heic = decodeImageDataUrl(dataUrl('application/octet-stream', HEIC_BYTES));
  assert.equal(heic.ok, true);
  assert.equal(heic.contentType, 'image/heic');
  // 그림이라고 적었지만 내용이 HTML 이면 거절한다. SVG 도 받지 않는다.
  assert.equal(decodeImageDataUrl(dataUrl('image/png', [...Buffer.from('<html><script>x</script>')])).reason, 'not-image');
  assert.equal(decodeImageDataUrl('data:image/svg+xml,%3Csvg%20onload%3D%22x%22%3E').reason, 'not-image');
  // 서명만 붙이고 첫 구조가 맞지 않는 단순 위장은 거절한다(Codex 검토). 모든 위장을 막는 것은 아니며, 남는 위험은 제공할 때 nosniff·sandbox 로 막는다.
  const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  assert.equal(decodeImageDataUrl(dataUrl('image/png', [...PNG_SIG, ...Buffer.from('<html><script>alert(1)</script></html>')])).reason, 'not-image');
  assert.equal(decodeImageDataUrl(dataUrl('image/jpeg', [0xff, 0xd8, 0xff, ...Buffer.from('<html>')])).reason, 'not-image');
  assert.equal(decodeImageDataUrl(dataUrl('image/webp', [...Buffer.from('RIFF'), 0xff, 0xff, 0, 0, ...Buffer.from('WEBP<html>')])).reason, 'not-image');
  assert.equal(decodeImageDataUrl(dataUrl('image/heic', [0, 0, 1, 0, ...Buffer.from('ftypheic<html>')])).reason, 'not-image');
  // 풀 수 없는 값은 서버 오류가 아니라 거절이다.
  assert.equal(decodeImageDataUrl('data:image/png;base64,@@@').reason, 'invalid');
  assert.equal(decodeImageDataUrl('data:image/png,%E0%A4%A').reason, 'invalid');
  assert.equal(decodeImageDataUrl('not a data url').reason, 'invalid');

  // 내려줄 때: 그림 형식만 그림으로, 그 밖(이전에 저장된 것)은 내려받기 전용으로.
  const ok = imageResponseHeaders('image/png');
  assert.equal(ok.get('Content-Type'), 'image/png');
  assert.equal(ok.get('X-Content-Type-Options'), 'nosniff');
  assert.match(ok.get('Content-Security-Policy'), /sandbox/);
  const old = imageResponseHeaders('text/html');
  assert.equal(old.get('Content-Type'), 'application/octet-stream');
  assert.equal(old.get('Content-Disposition'), 'attachment');
  assert.equal(imageResponseHeaders(undefined).get('Content-Type'), 'application/octet-stream');
});

function loadCardsHandler(time) {
  const r2 = new Map();
  const rate = fakeRateDb();
  const db = {
    prepare: sql => ({
      bind: (...args) => ({
        first: async () => (/rate_limits/.test(sql) ? rate.prepare(sql).bind(...args).first() : null),
        run: async () => ({ meta: { changes: 1 } }),
        all: async () => ({ results: [] }),
      }),
    }),
  };
  const env = { DB: db, CARDS: { put: async (key, bytes, opts) => { r2.set(key, opts.httpMetadata.contentType); }, delete: async () => {} } };
  const libs = {
    '../_lib/session': { getSessionUser: async () => ({ id: 'user-a' }) },
    '../_lib/requestValidation': load('functions/api/_lib/requestValidation.ts', { Response, JSON, Number }),
    '../_lib/imageUpload': load('functions/api/_lib/imageUpload.ts', webBindings),
    '../_lib/rateLimit': load('functions/api/_lib/rateLimit.ts', { crypto, Date: time.Date }),
  };
  const { onRequest } = load('functions/api/data/verse-cards.ts', {
    require: name => libs[name] || require(name),
    Response, Date: time.Date, JSON,
  });
  const save = body => onRequest({
    env,
    request: new Request('https://x/api/data/verse-cards', { method: 'POST', body: JSON.stringify({ id: 'card-1', ...body }) }),
  });
  return { save, r2 };
}

test('card saves store only real images and stop after the hourly limit', async () => {
  const time = clock(Date.UTC(2026, 10, 10, 1, 0, 0));
  const { save, r2 } = loadCardsHandler(time);

  const html = await save({ imageDataUrl: dataUrl('image/png', [...Buffer.from('<html>')]), bg: dataUrl('image/png', PNG_BYTES) });
  assert.equal(html.status, 400);
  assert.equal(r2.size, 0, '하나라도 그림이 아니면 배경도 저장하지 않는다');

  const okRes = await save({ imageDataUrl: dataUrl('image/png', PNG_BYTES), bg: dataUrl('', HEIC_BYTES) });
  assert.equal(okRes.status, 200);
  assert.equal(r2.get('img/user-a/card-1'), 'image/png');
  assert.equal(r2.get('bg/user-a/card-1'), 'image/heic');

  // 색상 배경은 그대로 통과한다.
  assert.equal((await save({ bg: '#FFFFFF' })).status, 200);

  let limited = null;
  for (let i = 0; i < 200 && !limited; i++) {
    const res = await save({ bg: '#FFFFFF' });
    if (res.status === 429) limited = { at: i + 4, res }; // 앞의 세 번(거절된 것 포함)도 횟수에 든다
  }
  assert.ok(limited, '시간당 한도에서 멈춰야 한다');
  assert.equal(limited.at, 121);
  assert.ok(Number(limited.res.headers.get('Retry-After')) > 0);
});

test('card saves also stop at the daily limit, which resets at Korean midnight', async () => {
  // 매시간 시간당 한도(120)를 다 쓰면 넷째 시간 중간에 하루 한도(400)에 걸린다.
  const time = clock(Date.UTC(2026, 10, 10, 1, 0, 0));
  const { save } = loadCardsHandler(time);
  let ok = 0;
  let lastError = '';
  for (let hour = 0; hour < 5; hour++) {
    time.set(Date.UTC(2026, 10, 10, 1 + hour, 0, 0));
    for (let i = 0; i < 120; i++) {
      const res = await save({ bg: '#FFFFFF' });
      if (res.status === 200) ok++; else lastError = String(res.status);
    }
  }
  assert.equal(ok, 400);
  assert.equal(lastError, '429');
  // 한국 11/10 오후 11시(UTC 14시)에는 아직 막히고, 11/11 0시 30분(UTC 15:30)에는 다시 된다.
  time.set(Date.UTC(2026, 10, 10, 14, 0, 0));
  assert.equal((await save({ bg: '#FFFFFF' })).status, 429);
  time.set(Date.UTC(2026, 10, 10, 15, 30, 0));
  assert.equal((await save({ bg: '#FFFFFF' })).status, 200);
});

test('tester accounts get their own larger AI limit but still count toward the service-wide cap', async () => {
  const time = clock(Date.UTC(2026, 10, 11, 1, 0, 0));
  const { checkAiLimits, isAiTester, TESTER_LIMIT, GLOBAL_IMAGES_PER_DAY } = load('functions/api/_lib/aiLimits.ts', { crypto, Date: time.Date });
  // 목록 비교는 대소문자·공백을 무시하고, 목록이 없거나 이메일이 없으면 테스터가 아니다.
  assert.equal(isAiTester('Tester@Example.com', ' other@x.com , tester@example.com'), true);
  assert.equal(isAiTester('someone@example.com', 'tester@example.com'), false);
  assert.equal(isAiTester('tester@example.com', undefined), false);
  assert.equal(isAiTester('', 'tester@example.com'), false);
  assert.equal(isAiTester('tester@example.com', ''), false);

  const db = fakeRateDb();
  let allowed = 0;
  let lastScope = '';
  for (let hour = 0; hour < 5; hour++) {
    time.set(Date.UTC(2026, 10, 11, 1 + hour, 0, 0));
    for (let i = 0; i < TESTER_LIMIT.perHour; i++) {
      const r = await checkAiLimits(db, 'tester', 'generate-image', true);
      if (r.allowed) allowed++; else lastScope = r.scope;
    }
  }
  assert.equal(allowed, TESTER_LIMIT.perDay);
  assert.equal(lastScope, 'day');
  // 같은 날 일반 계정은 여전히 30장에서 막힌다.
  let normal = 0;
  for (let i = 0; i < 40; i++) if ((await checkAiLimits(db, 'normal', 'generate-image')).allowed) normal++;
  assert.equal(normal, 20, '시간당 20장에서 먼저 막힌다(일반 한도 그대로)');
  // 테스터 사용분도 서비스 전체 합계에 들어간다: 테스터 200 + 일반 20 = 220장이 이미 쌓였다.
  const counted = [...db.rows].filter(([id]) => id.startsWith('ai-day:images|service|')).reduce((n, [, c]) => n + c, 0);
  assert.equal(counted, TESTER_LIMIT.perDay + 20);
  assert.ok(counted <= GLOBAL_IMAGES_PER_DAY);
});

// ── T02 진짜 폰트 굽기 (2026-11-11) ──
function fakeTextCtx() {
  // 글자 하나의 폭 = 글꼴 크기(한글 전각 근사). 띄어쓰기는 절반.
  return {
    font: '400 10px sans-serif',
    measureText(t) {
      const px = Number((/(\d+(?:\.\d+)?)px/.exec(this.font) || [])[1] || 10);
      let w = 0;
      for (const ch of Array.from(t)) w += ch === ' ' ? px * 0.5 : px;
      return { width: w };
    },
  };
}
const norm = (t) => t.replace(/\s+/g, '');

test('T02 splits intro, hero and reference without dropping any words', () => {
  const { splitT02Lines } = load('src/utils/t02Poster.ts');
  const lines = [
    { text: '강하고 담대하라', scale: 0.8 },
    { text: '네가 어디로 가든지', scale: 1.5 },
    { text: '너와 함께 하느니라', scale: 1.5 },
    { text: '수1:9', scale: 0.5 },
  ];
  const p = splitT02Lines(lines);
  assert.deepEqual(JSON.parse(JSON.stringify(p)), { intro: ['강하고 담대하라'], hero: ['네가 어디로 가든지', '너와 함께 하느니라'], ref: '수1:9' });
  // 강조 줄이 없으면 본문 전체가 큰 글씨, 주소는 글자 모양으로도 알아본다.
  const q = splitT02Lines([{ text: '주님은 나의 반석이시요', scale: 1 }, { text: '시 18:2', scale: 1 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(q)), { intro: [], hero: ['주님은 나의 반석이시요'], ref: '시 18:2' });
});

test('T02 layout keeps every character and fits long text inside the card', () => {
  const { layoutT02, splitT02Lines } = load('src/utils/t02Poster.ts');
  const W = 1000, H = 1250;
  const info = { key: 'field', zone: 'center', ink: '#fff', sub: '#eee', accent: '#000', seed: 0 };
  const box = { x: 80, y: 200, w: 840, h: 850 };
  const cases = [
    [{ text: '네가 어디로 가든지', scale: 1.5 }, { text: '네 하나님 여호와가 너와 함께 하느니라', scale: 1.5 }, { text: '수1:9', scale: 0.5 }],
    [{ text: '말씀 '.repeat(400).trim(), scale: 1 }],                     // 아주 긴 문구
    [{ text: '가'.repeat(300), scale: 1 }],                                // 띄어쓰기 없는 아주 긴 한 어절
  ];
  for (const lines of cases) {
    const parts = splitT02Lines(lines);
    const ctx = fakeTextCtx();
    const out = layoutT02(ctx, parts, info, box, W, H);
    const drawn = out.rows.map((r) => r.text).join('');
    const input = [...parts.intro, ...parts.hero, parts.ref].join('');
    assert.equal(norm(drawn), norm(input), '글자가 빠지거나 겹치면 안 된다');
    assert.ok(out.height <= H * 0.92 + 1, `카드 안에 들어가야 한다 (height ${Math.round(out.height)})`);
    for (const r of out.rows) { ctx.font = r.font; assert.ok(ctx.measureText(r.text).width <= out.box.w + 0.5, '폭을 넘는 줄이 없어야 한다'); }
  }
});

test('deep scene reading bans stock pictures and only takes over abstract editor input', () => {
  const { deepScenePrompt, parseDeepScene, pickRegister, FLAT_SUBJECT_DOMAINS, MINIMAL_SCENE_REGISTERS, SCENE_STOCK } = load('functions/api/_lib/sceneReading.ts');
  // 사용자가 지적한 반복 그림이 금지 목록에 있어야 한다(말씀이 그 낱말을 말할 때만 허용).
  for (const stock of ['summit', 'watering a plant', 'dove', 'open sea', 'meadow']) assert.ok(SCENE_STOCK.includes(stock), stock);
  const auto = deepScenePrompt({ cardBrief: 'b', register: 'r', outputShape: 's', flat: true });
  assert.match(auto, /unless the message's own words name it/);
  assert.match(auto, /JESUS FIRST CHECK/);
  assert.doesNotMatch(auto, /"kind"/);
  const editor = deepScenePrompt({ cardBrief: 'b', register: 'r', outputShape: 's', classify: true });
  assert.match(editor, /"kind"/);
  assert.doesNotMatch(editor, /JESUS FIRST CHECK/);
  // 보폭과 길이가 서로소면 연속된 카드가 모든 갈래를 한 번씩 돈다.
  assert.equal(new Set([0, 1, 2, 3, 4, 5].map((i) => pickRegister(MINIMAL_SCENE_REGISTERS, i, 5, 2))).size, 6);
  assert.equal(new Set([0, 1, 2, 3, 4, 5, 6].map((i) => pickRegister(FLAT_SUBJECT_DOMAINS, i, 3, 1))).size, 7);
  assert.deepEqual(JSON.parse(JSON.stringify(parseDeepScene('```json\n{"kind":"Abstract","scene":" a kettle "}\n```'))), { kind: 'abstract', scene: 'a kettle' });
  assert.equal(parseDeepScene('not json'), null);
});
