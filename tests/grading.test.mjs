import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect, answerText, responseText, checkNumber } from '../js/grading.js';

const mcq = { format: 'mcq', options: ['a', 'b', 'c'], answer: 1 };
const multi = { format: 'multi', options: ['a', 'b', 'c', 'd'], answers: [0, 2] };
const num = { format: 'number', value: 15.25, unit: 'cm' };

test('multiple choice', () => {
  assert.equal(isCorrect(mcq, 1), true);
  assert.equal(isCorrect(mcq, 0), false);
  assert.equal(isCorrect(mcq, null), false);
});

test('select all: exactly the right set', () => {
  assert.equal(isCorrect(multi, [2, 0]), true);
  assert.equal(isCorrect(multi, new Set([0, 2])), true);
  assert.equal(isCorrect(multi, [0]), false);
  assert.equal(isCorrect(multi, [0, 1, 2]), false);
  assert.equal(isCorrect(multi, []), false);
});

test('numbers: decimal comma, units and tolerance', () => {
  assert.equal(isCorrect(num, '15.25'), true);
  assert.equal(isCorrect(num, '15,25'), true);
  assert.equal(isCorrect(num, 15.25), true);
  assert.equal(isCorrect(num, '15.2'), false);
  assert.equal(isCorrect(num, ''), false);
  assert.equal(checkNumber({ value: 2.7, tolerance: 0.05 }, '2.74'), true);
  assert.equal(checkNumber({ value: 2.7, accept: [2.70] }, '2.70'), true);
});

test('answer and response text', () => {
  assert.equal(answerText(multi), 'a; c');
  assert.equal(answerText(num), '15.25 cm');
  assert.equal(responseText(multi, [2, 0]), 'a; c');
  assert.equal(responseText(multi, []), 'No answer');
  assert.equal(responseText(mcq, null), 'No answer');
  assert.equal(responseText(num, '16'), '16 cm');
});

import { expandCard } from '../js/grading.js';

test('true/false cards become fixed True/False options', () => {
  const t = expandCard({ format: 'tf', q: 'x', answer: false });
  assert.deepEqual(t.options, ['True', 'False']);
  assert.equal(t.answer, 1);
  assert.equal(t.shuffle, false);
  assert.equal(isCorrect(t, 1), true);
  assert.equal(answerText(t), 'False');
});

test('decision cards: singles and doubles options and answers', () => {
  const s = expandCard({ format: 'call', match: 'singles', answer: 'X' });
  assert.deepEqual(s.options, ['Point to A', 'Point to X', 'Let', 'No action']);
  assert.equal(answerText(s), 'Point to X');
  assert.equal(s.matchLabel, 'Singles: A v X');
  const d = expandCard({ format: 'call', match: 'doubles', answer: 'none' });
  assert.equal(answerText(d), 'No action');
  assert.equal(isCorrect(d, 3), true);
  assert.equal(expandCard({ format: 'call', match: 'doubles', answer: 'AB' }).answer, 0);
});
