const test = require('node:test');
const assert = require('node:assert/strict');
const { shuffle, shuffleOptions, generateID, LETTERS } = require('../game-logic.js');

test('shuffle returns an array with the same elements', () => {
  const input = [1, 2, 3, 4, 5];
  const result = shuffle(input);
  assert.deepEqual([...result].sort(), [...input].sort());
});

test('shuffle does not mutate the original array', () => {
  const input = [1, 2, 3];
  const copy = [...input];
  shuffle(input);
  assert.deepEqual(input, copy);
});

test('shuffleOptions keeps the correct answer text aligned with the new correct index', () => {
  const q = { q: 'test', options: ['A', 'B', 'C', 'D'], correct: 2 };
  const { options, correct } = shuffleOptions(q);
  assert.equal(options[correct], 'C');
  assert.deepEqual([...options].sort(), ['A', 'B', 'C', 'D']);
});

test('generateID matches the CDM-XXXX-XXXX pattern with allowed characters', () => {
  const id = generateID();
  assert.match(id, /^CDM-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
});

test('LETTERS provides labels for up to 4 options', () => {
  assert.deepEqual(LETTERS, ['A', 'B', 'C', 'D']);
});

const { resolveGameAxes, buildGame } = require('../game-logic.js');

function makeBank() {
  return {
    "Eje A": [
      { q: 'A1', options: ['1', '2', '3', '4'], correct: 0 },
      { q: 'A2', options: ['1', '2', '3', '4'], correct: 1 }
    ],
    "Eje B": [
      { q: 'B1', options: ['1', '2', '3', '4'], correct: 2 }
    ],
    "Eje C": [
      { q: 'C1', options: ['1', '2', '3', '4'], correct: 3 },
      { q: 'C2', options: ['1', '2', '3', '4'], correct: 0 }
    ]
  };
}

test('resolveGameAxes returns all axes when config is empty', () => {
  const bank = makeBank();
  const axes = resolveGameAxes(bank, { disabledAxes: [], disabledQuestions: {} });
  assert.deepEqual(axes.sort(), ['Eje A', 'Eje B', 'Eje C']);
});

test('resolveGameAxes excludes disabled axes', () => {
  const bank = makeBank();
  const axes = resolveGameAxes(bank, { disabledAxes: ['Eje B'], disabledQuestions: {} });
  assert.deepEqual(axes.sort(), ['Eje A', 'Eje C']);
});

test('resolveGameAxes falls back to all axes when every axis is disabled', () => {
  const bank = makeBank();
  const axes = resolveGameAxes(bank, { disabledAxes: ['Eje A', 'Eje B', 'Eje C'], disabledQuestions: {} });
  assert.deepEqual(axes.sort(), ['Eje A', 'Eje B', 'Eje C']);
});

test('buildGame picks one question per enabled axis', () => {
  const bank = makeBank();
  const game = buildGame(bank, { disabledAxes: [], disabledQuestions: {} });
  assert.equal(game.length, 3);
  assert.deepEqual(game.map(item => item.axis).sort(), ['Eje A', 'Eje B', 'Eje C']);
});

test('buildGame never selects a disabled question index', () => {
  const bank = makeBank();
  const config = { disabledAxes: [], disabledQuestions: { "Eje A": [1] } };
  for (let i = 0; i < 20; i++) {
    const game = buildGame(bank, config);
    const picked = game.find(item => item.axis === 'Eje A');
    assert.equal(picked.q, 'A1');
  }
});

test('buildGame skips an axis whose questions are all disabled, reducing game length', () => {
  const bank = makeBank();
  const config = { disabledAxes: [], disabledQuestions: { "Eje B": [0] } };
  const game = buildGame(bank, config);
  assert.equal(game.length, 2);
  assert.ok(!game.some(item => item.axis === 'Eje B'));
});
