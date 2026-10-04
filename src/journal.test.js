import test from 'node:test';
import assert from 'node:assert/strict';

import { addJournalEntry, getJournalDateKey, getJournalEntriesForPatient } from './journal.js';

test('journal entries save trimmed notes, mood, and local date for each day', () => {
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
    const state = { journals: [] };
    const at = new Date(2026, 9, 4, 9, 30);
    const entry = addJournalEntry(state, 'patient-1', 'happy', '  Had tea with my sister.  ', at);

    assert.equal(entry.text, 'Had tea with my sister.');
    assert.equal(entry.mood, 'happy');
    assert.equal(entry.date, '2026-10-04');
    assert.equal(getJournalEntriesForPatient(state, 'patient-1').length, 1);
    assert.equal(JSON.parse(savedValues.get('memoura-state-v1')).journals[0].text, 'Had tea with my sister.');
  } finally {
    if (originalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
});

test('journal entries are returned newest first and scoped to one patient', () => {
  const state = {
    journals: [
      { patientId: 'patient-1', at: '2026-10-03T10:00:00.000Z', text: 'Yesterday' },
      { patientId: 'patient-2', at: '2026-10-04T10:00:00.000Z', text: 'Private entry' },
      { patientId: 'patient-1', at: '2026-10-04T10:00:00.000Z', text: 'Today' },
    ],
  };

  assert.deepEqual(
    getJournalEntriesForPatient(state, 'patient-1').map((entry) => entry.text),
    ['Today', 'Yesterday']
  );
});

test('journal date keys use the local calendar date', () => {
  assert.equal(getJournalDateKey(new Date(2026, 9, 4, 23, 59)), '2026-10-04');
});
