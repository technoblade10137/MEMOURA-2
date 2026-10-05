import test from 'node:test';
import assert from 'node:assert/strict';

import { generateReport, getGameAnalysis } from './reports.js';

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

  assert.equal(analysis.summary, '2 saved game results across 1 game.');
  assert.deepEqual(analysis.games, [
    { name: 'Memory Recall', sessions: 2, averageAccuracy: 70 },
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

test('progress accuracy is weighted by actual correct and incorrect responses', () => {
  const state = {
    sessions: [
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: 75, correct: 3, incorrect: 1 },
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: 25, correct: 1, incorrect: 3 },
      { patientId: 'patient-2', game: 'Memory Recall', accuracy: 100, correct: 8, incorrect: 0 },
    ],
    routines: [{ patientId: 'patient-1' }],
  };

  const report = generateReport(state, 'patient-1');
  const analysis = getGameAnalysis(state, 'patient-1');

  assert.equal(report.totals.sessions, 2);
  assert.equal(report.totals.accuracy, 50);
  assert.deepEqual(report.chart, [{ label: 'Memory Recall', value: 50 }]);
  assert.deepEqual(analysis.games, [{ name: 'Memory Recall', sessions: 2, averageAccuracy: 50 }]);
});

test('Ludo progress is reported as token completion, not answer accuracy', () => {
  const state = {
    sessions: [
      { patientId: 'patient-1', game: 'Ludo', accuracy: 50, correct: 2, incorrect: 2, performanceMetric: 'completion' },
      { patientId: 'patient-1', game: 'Memory Recall', accuracy: 80, correct: 4, incorrect: 1 },
    ],
  };

  const report = generateReport(state, 'patient-1');
  const analysis = getGameAnalysis(state, 'patient-1');

  assert.equal(report.totals.accuracy, 80);
  assert.deepEqual(analysis.games, [
    { name: 'Ludo', sessions: 1, completionRate: 50 },
    { name: 'Memory Recall', sessions: 1, averageAccuracy: 80 },
  ]);
});
