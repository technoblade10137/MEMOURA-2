import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRecallOptions, getRecallQuestion } from './games.js';

test('recall question options stay valid after shuffling', () => {
  const positions = new Set();

  for (let index = 0; index < 30; index += 1) {
    const question = getRecallQuestion('Food');
    assert.ok(question.options.includes(question.answer));
    assert.equal(new Set(question.options).size, question.options.length);
    positions.add(question.options.indexOf(question.answer));
  }

  assert.ok(positions.size > 1, 'answer should not always remain in the same option slot');
});

test('buildRecallOptions preserves the answer and randomizes the rest', () => {
  const options = buildRecallOptions('Khar', ['Khar', 'Pasta', 'Burger', 'Curry']);

  assert.ok(options.includes('Khar'));
  assert.equal(options.length, 4);
  assert.deepEqual([...new Set(options)].sort(), ['Burger', 'Curry', 'Khar', 'Pasta'].sort());
});
