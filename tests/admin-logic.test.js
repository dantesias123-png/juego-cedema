const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildDefaultState,
  computeSummary,
  serializeStateToConfig,
  applyConfigToState,
  configObjectToFileText,
  parseConfigFileText
} = require('../admin-logic.js');

function makeBank() {
  return {
    "Eje A": [
      { q: 'A1', options: ['1', '2', '3', '4'], correct: 0 },
      { q: 'A2', options: ['1', '2', '3', '4'], correct: 1 }
    ],
    "Eje B": [
      { q: 'B1', options: ['1', '2', '3', '4'], correct: 2 }
    ]
  };
}

test('buildDefaultState enables every axis and every question', () => {
  const state = buildDefaultState(makeBank());
  assert.equal(state.axes['Eje A'].enabled, true);
  assert.deepEqual(state.axes['Eje A'].questions, [true, true]);
  assert.deepEqual(state.axes['Eje B'].questions, [true]);
});

test('computeSummary counts axes that are enabled and have at least one enabled question', () => {
  const bank = makeBank();
  const state = buildDefaultState(bank);
  assert.equal(computeSummary(bank, state).axesUsed, 2);
});

test('computeSummary excludes an axis whose questions are all disabled', () => {
  const bank = makeBank();
  const state = buildDefaultState(bank);
  state.axes['Eje B'].questions[0] = false;
  assert.equal(computeSummary(bank, state).axesUsed, 1);
});

test('serializeStateToConfig only lists disabled axes and questions', () => {
  const bank = makeBank();
  const state = buildDefaultState(bank);
  state.axes['Eje A'].questions[1] = false;
  state.axes['Eje B'].enabled = false;
  const config = serializeStateToConfig(state);
  assert.deepEqual(config.disabledAxes, ['Eje B']);
  assert.deepEqual(config.disabledQuestions, { 'Eje A': [1] });
});

test('applyConfigToState reproduces the state serializeStateToConfig produced', () => {
  const bank = makeBank();
  const original = buildDefaultState(bank);
  original.axes['Eje A'].questions[1] = false;
  original.axes['Eje B'].enabled = false;
  const config = serializeStateToConfig(original);
  const restored = applyConfigToState(bank, config);
  assert.deepEqual(restored, original);
});

test('configObjectToFileText produces a file parseConfigFileText can read back', () => {
  const config = { disabledAxes: ['Eje B'], disabledQuestions: { 'Eje A': [1] } };
  const fileText = configObjectToFileText(config);
  assert.deepEqual(parseConfigFileText(fileText), config);
});

test('parseConfigFileText rejects a file with bad syntax', () => {
  assert.throws(() => parseConfigFileText('const gameConfig = { oops'), /no es un config\.js válido/);
});

test('parseConfigFileText rejects a file missing the expected shape', () => {
  const badText = 'const gameConfig = { foo: 1 };\nif (typeof module !== "undefined") { module.exports = { gameConfig }; }';
  assert.throws(() => parseConfigFileText(badText), /formato esperado/);
});
