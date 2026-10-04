import test from 'node:test';
import assert from 'node:assert/strict';

import { getRoutineDateKey, isRoutineComplete, toggleRoutineCompletion } from './routines.js';

test('routine completion can be toggled and saved for a specific day', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const savedValues = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      setItem(key, value) {
        savedValues.set(key, value);
      },
    },
  });

  try {
    const state = { routines: [{ id: 'routine-1', completedDates: [] }] };
    assert.equal(toggleRoutineCompletion(state, 'routine-1', '2026-10-04'), true);
    assert.equal(isRoutineComplete(state.routines[0], '2026-10-04'), true);
    assert.deepEqual(JSON.parse(savedValues.get('memoura-state-v1')).routines[0].completedDates, ['2026-10-04']);

    assert.equal(toggleRoutineCompletion(state, 'routine-1', '2026-10-04'), false);
    assert.equal(isRoutineComplete(state.routines[0], '2026-10-04'), false);
  } finally {
    if (originalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test('routine date keys use the local calendar date', () => {
  assert.equal(getRoutineDateKey(new Date(2026, 9, 4, 12)), '2026-10-04');
});

test('completing an unknown routine reports the error', () => {
  assert.throws(() => toggleRoutineCompletion({ routines: [] }, 'missing'), /Routine not found/);
});
