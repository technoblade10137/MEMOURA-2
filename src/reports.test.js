import test from 'node:test';
import assert from 'node:assert/strict';

import { getGameAnalysis } from './reports.js';

test('game analysis summarizes saved accuracy by game for the requested patient', () => {
  const state = {
    sessions: [
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: 80 },
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: 60 },
      { patientId: 'patient-1', game: 'Ludo', accuracy: 100 },
      { patientId: 'patient-2', game: 'Ludo', accuracy: 10 },
    ],
  };

  const analysis = getGameAnalysis(state, 'patient-1');

  assert.equal(analysis.summary, '3 saved game results across 2 games.');
  assert.deepEqual(analysis.games, [
    { name: 'Memory Recall', sessions: 2, averageAccuracy: 70 },
    { name: 'Ludo', sessions: 1, averageAccuracy: 100 },
  ]);
  assert.match(analysis.recommendation, /Memory Recall/);
  assert.match(analysis.recommendation, /70%/);
});

test('game analysis explains when there are no recorded game results', () => {
  const analysis = getGameAnalysis({ sessions: [] }, 'patient-1');

  assert.deepEqual(analysis.games, []);
  assert.match(analysis.summary, /no game results/i);
  assert.match(analysis.recommendation, /once a game has been played/i);
});

test('game analysis ignores sessions without numeric accuracy', () => {
  const analysis = getGameAnalysis({
    sessions: [
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: '80' },
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: null },
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: 80 },
    ],
  }, 'patient-1');

  assert.equal(analysis.games.length, 1);
  assert.deepEqual(analysis.games[0], { name: 'Memory Recall', sessions: 1, averageAccuracy: 80 });
});
