import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual component callbacks without paid generation or a browser.
const source = readFileSync(new URL('../src/pages/CardDesigner.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('CardDesigner.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function callback(name, bindings) {
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration, `${name} exists`);
  const code = ts.transpileModule(`const ${declaration.getText(ast)}; globalThis.callback = ${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const context = { ...bindings };
  vm.runInNewContext(code, context);
  return context.callback;
}

function fixture(overrides = {}) {
  const state = { t: { content: '기존 문구' }, verse: '', step: 'record', prompt: '', expanded: '기존 배경 설명' };
  const bindings = {
    isGenerating: false, isExpandingPrompt: false, isSaving: false,
    activeTrack: 'auto', selectedTemplateId: '', recordPickerTarget: 'auto',
    setVerseInput: value => { state.verse = value; },
    setT: updater => { state.t = updater(state.t); },
    setFlowStep: value => { state.step = value; },
    setSelectedTemplateId: value => { state.template = value; },
    setIsPanelCollapsed: value => { state.collapsed = value; },
    setRecordSelectorOpen: value => { state.selector = value; },
    setBgPrompt: value => { state.prompt = value; },
    setExpandedPrompt: value => { state.expanded = value; },
    setIsEditing: value => { state.editing = value; },
    setPhotoText: value => { state.photo = value; },
    toast: { success() {} }, ...overrides,
  };
  bindings.continueWithText = callback('continueWithText', bindings);
  return { state, bindings };
}

test('automatic content confirmation proceeds to style with a valid default', () => {
  const { state, bindings } = fixture();
  bindings.continueWithText('확정 문구');
  assert.equal(state.step, 'auto-template');
  assert.equal(state.template, 'T01');
  assert.equal(state.verse, '확정 문구');
  assert.equal(state.t.content, '확정 문구');
});

test('manual content confirmation stays in manual editing', () => {
  const { state, bindings } = fixture({ activeTrack: 'manual' });
  bindings.continueWithText('직접 편집할 문구');
  assert.equal(state.step, 'edit');
  assert.equal(state.collapsed, false);
  assert.equal(state.template, undefined);
});

test('chosen style survives content editing', () => {
  const { state, bindings } = fixture({ selectedTemplateId: 'T03' });
  bindings.continueWithText('수정한 문구');
  assert.equal(state.template, undefined);
});

test('legacy invalid template is replaced', () => {
  const { state, bindings } = fixture({ selectedTemplateId: 'T13' });
  bindings.continueWithText('문구');
  assert.equal(state.template, 'T01');
});

test('record confirmation uses edited phrase exactly, without another recommendation', () => {
  const { state, bindings } = fixture();
  callback('useSelectedRecordText', bindings)({}, '  내가 수정한 문구\n둘째 줄  ');
  assert.equal(state.t.content, '내가 수정한 문구\n둘째 줄');
  assert.equal(state.step, 'auto-template');
  assert.equal(state.selector, false);
});

test('record confirmation preserves the manual route', () => {
  const { state, bindings } = fixture({ activeTrack: 'manual' });
  callback('useSelectedRecordText', bindings)({}, '선택한 원문');
  assert.equal(state.step, 'edit');
});

test('background record import never overwrites card text', () => {
  const { state, bindings } = fixture({ recordPickerTarget: 'manual-bg' });
  callback('useSelectedRecordText', bindings)({}, '배경 참고 기록');
  assert.equal(state.t.content, '기존 문구');
  assert.equal(state.prompt, '배경 참고 기록');
  assert.equal(state.expanded, '');
});

test('text import replaces text without changing the current screen', () => {
  const { state, bindings } = fixture({ recordPickerTarget: 'manual-text' });
  callback('useSelectedRecordText', bindings)({}, '새 글씨');
  assert.equal(state.t.content, '새 글씨');
  assert.equal(state.step, 'record');
  assert.equal(state.prompt, '');
});

test('empty confirmation has no effects', () => {
  const { state, bindings } = fixture();
  callback('useSelectedRecordText', bindings)({}, '  ');
  assert.equal(state.selector, undefined);
  assert.equal(state.t.content, '기존 문구');
});

test('in-place text editing updates the text later saved as card metadata', () => {
  const state = { verse: '기존 문구', text: '기존 문구', result: null, draft: '새 문구' };
  const bindings = {
    autoResult: { template: 'T05', ratio: '4:5', genSeed: 7 },
    textEditDraft: '새 문구',
    meta: { ratio: '4:5' },
    extractReference: value => ({ body: value, reference: '' }),
    buildGenerativeResult: raw => ({ template: 'T05', simpleLines: [raw] }),
    buildT03Result() { assert.fail('wrong template builder'); },
    setAutoResult: value => { state.result = value; },
    setVerseInput: value => { state.verse = value; },
    setT: updater => { state.text = updater({ content: state.text }).content; },
    setTextEditDraft: value => { state.draft = value; },
  };
  callback('applyTextEdit', bindings)();
  assert.equal(state.verse, '새 문구');
  assert.equal(state.text, '새 문구');
  assert.equal(state.result.simpleLines[0], '새 문구');
  assert.equal(state.draft, null);
});

test('back from manual editing returns to entry without changing text', () => {
  const { state, bindings } = fixture({ activeTrack: 'manual', flowStep: 'edit', t: { content: '편집기에서 수정' } });
  callback('goBack', bindings)();
  assert.equal(state.step, 'entry');
  assert.equal(state.t.content, '기존 문구');
});

test('manual entry opens editor without requiring a phrase or record', () => {
  const { state, bindings } = fixture({
    requireAuth: cb => cb(), setActiveTrack() {}, window: { location: { pathname: '/cards/designer' } },
  });
  callback('startCardFlow', bindings)('manual');
  assert.equal(state.step, 'edit');
  assert.equal(state.verse, '');
  assert.equal(state.collapsed, false);
});

test('login and save dialogs are mounted in both render branches', () => {
  assert.equal(source.match(/\{renderLoginModal\(\)\}/g)?.length, 2);
  assert.equal(source.match(/\{renderSaveSuccessModal\(\)\}/g)?.length, 2);
  assert.equal(source.includes('renderRecordUseModal'), false);
});

for (const generateAfter of [false, true]) {
  test(`background description ${generateAfter ? 'chains directly into generation' : 'can be reviewed without generating'}`, async () => {
    const generated = [];
    let expanded;
    const expand = callback('expandPrompt', {
      isGenerating: false, isExpandingPrompt: false, lastGenerateTime: 0,
      user: {}, bgPrompt: '참고 내용', selectedStyle: 'film',
      setLastGenerateTime() {}, setIsExpandingPrompt() {}, startGenerationProgress() {}, stopGenerationProgress() {},
      setExpandedPrompt: value => { expanded = value; },
      fetch: async () => ({ ok: true, status: 200, json: async () => ({ expandedPrompt: '분석한 자연 풍경' }) }),
      generateBackground: async value => { generated.push(value); },
      toast: { success() {}, error(message) { assert.fail(message); } },
    });
    await expand(generateAfter);
    assert.equal(expanded, '분석한 자연 풍경');
    assert.deepEqual(generated, generateAfter ? ['분석한 자연 풍경'] : []);
  });
}

test('failed description request does not start image generation', async () => {
  let failed = false;
  let stopped = false;
  const expand = callback('expandPrompt', {
    isGenerating: false, isExpandingPrompt: false, lastGenerateTime: 0,
    user: {}, bgPrompt: '기록', selectedStyle: 'film',
    setLastGenerateTime() {}, setIsExpandingPrompt() {}, startGenerationProgress() {},
    stopGenerationProgress() { stopped = true; },
    fetch: async () => ({ ok: false, status: 500, json: async () => ({ error: '실패' }) }),
    generateBackground() { assert.fail('must not generate after failed analysis'); },
    toast: { error() { failed = true; } },
  });
  await expand(true);
  assert.ok(failed);
  assert.ok(stopped);
});
