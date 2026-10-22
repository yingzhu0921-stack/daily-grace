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
    assert.match(expansion, /빛, 색감, 질감, 구도만/);
    assert.match(expansion, /캐릭터를 강제로 추가하지/);
  }
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
