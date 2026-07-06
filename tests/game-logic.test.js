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
