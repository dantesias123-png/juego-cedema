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

const { computePrizeTier, getResultMessage } = require('../game-logic.js');

test('computePrizeTier returns none below 60%', () => {
  assert.equal(computePrizeTier(5, 10).tier, 'none');
});

test('computePrizeTier returns quarter between 60% and 79%', () => {
  assert.equal(computePrizeTier(6, 10).tier, 'quarter');
  assert.equal(computePrizeTier(7, 10).tier, 'quarter');
});

test('computePrizeTier returns half between 80% and 99%', () => {
  assert.equal(computePrizeTier(8, 10).tier, 'half');
  assert.equal(computePrizeTier(9, 10).tier, 'half');
});

test('computePrizeTier returns complete at 100%', () => {
  assert.equal(computePrizeTier(10, 10).tier, 'complete');
});

test('computePrizeTier scales correctly for a shorter game', () => {
  assert.equal(computePrizeTier(4, 6).tier, 'quarter'); // 4/6 = 67%
});

test('getResultMessage matches the original score-bucket copy', () => {
  assert.equal(getResultMessage(0, 10).title, 'Buen primer paso');
  assert.equal(getResultMessage(3, 10).title, 'Vas por buen camino');
  assert.equal(getResultMessage(5, 10).title, 'Conocimiento en construcción');
  assert.equal(getResultMessage(7, 10).title, '¡Muy buen desempeño!');
  assert.equal(getResultMessage(9, 10).title, '¡Excelente resultado!');
  assert.equal(getResultMessage(10, 10).title, '¡Resultado perfecto! 🏆');
});

const { buildRegistryPayload } = require('../game-logic.js');

test('buildRegistryPayload shapes the exact fields the Sheet expects', () => {
  const prizeTier = { pct: 80, tier: 'half', label: 'BECA DEL 50%' };
  const payload = buildRegistryPayload('CDM-AB12-CD34', 8, 10, prizeTier);
  assert.deepEqual(Object.keys(payload).sort(), ['code', 'label', 'pct', 'score', 'tier', 'timestamp', 'total'].sort());
  assert.equal(payload.code, 'CDM-AB12-CD34');
  assert.equal(payload.score, 8);
  assert.equal(payload.total, 10);
  assert.equal(payload.pct, 80);
  assert.equal(payload.tier, 'half');
  assert.equal(payload.label, 'BECA DEL 50%');
});

test('buildRegistryPayload timestamp is a valid ISO 8601 string close to now', () => {
  const before = Date.now();
  const payload = buildRegistryPayload('CDM-AB12-CD34', 10, 10, { pct: 100, tier: 'complete', label: 'BECA COMPLETA (100%)' });
  const parsed = Date.parse(payload.timestamp);
  assert.ok(!Number.isNaN(parsed), 'timestamp should be parseable');
  assert.ok(parsed >= before && parsed <= Date.now(), 'timestamp should be current');
});

test('buildRegistryPayload passes through a null label unchanged', () => {
  const payload = buildRegistryPayload('CDM-AB12-CD34', 5, 10, { pct: 50, tier: 'none', label: null });
  assert.equal(payload.label, null);
  assert.equal(payload.tier, 'none');
});
