const test = require('node:test');
const assert = require('node:assert/strict');
const { questionBank } = require('../questions.js');

test('questionBank has exactly 10 thematic axes', () => {
  assert.equal(Object.keys(questionBank).length, 10);
});

test('each axis has exactly 10 questions', () => {
  for (const axis of Object.keys(questionBank)) {
    assert.equal(questionBank[axis].length, 10, `axis "${axis}" should have 10 questions`);
  }
});

test('every question has 4 options and a valid correct index', () => {
  for (const axis of Object.keys(questionBank)) {
    for (const question of questionBank[axis]) {
      assert.equal(question.options.length, 4);
      assert.ok(question.correct >= 0 && question.correct <= 3);
      assert.equal(typeof question.q, 'string');
    }
  }
});
