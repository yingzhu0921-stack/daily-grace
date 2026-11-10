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

    // 사람은 수채화·플랫 일러스트·심플 낙서에서만 허용한다(2026-11-10 사용자 결정). 미니멀·사진은 사람 없이.
    const peopleAllowed = ['맑은 수채화', '플랫 일러스트', '심플 낙서'].includes(style ?? '');
    if (peopleAllowed) {
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
