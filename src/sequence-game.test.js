import test from 'node:test';
import assert from 'node:assert/strict';

import { createSequenceRound, evaluateSequence, getSequenceLevelConfig } from './sequence-game.js';

test('level config expands from 4 cards to 8 cards', () => {
  assert.equal(getSequenceLevelConfig(1).cards, 4);
  assert.equal(getSequenceLevelConfig(3).cards, 6);
  assert.equal(getSequenceLevelConfig(5).cards, 8);
});

test('each round uses a clean random set of unique cards', () => {
  const round = createSequenceRound(3);
  assert.equal(round.cards.length, 6);
  assert.equal(new Set(round.cards.map((card) => card.key)).size, round.cards.length);
  assert.equal(round.pattern.length, round.cards.length);
  assert.ok(round.pattern.every((id) => round.cards.some((card) => card.key === id)));
});

test('sequence evaluation counts correctly remembered positions', () => {
  const exact = evaluateSequence(['a', 'b', 'c'], ['a', 'b', 'c']);
  assert.equal(exact.correct, 3);
  assert.equal(exact.isCorrect, true);

  const partial = evaluateSequence(['a', 'b', 'c'], ['a', 'x', 'c']);
  assert.equal(partial.correct, 2);
  assert.equal(partial.isCorrect, false);
});
