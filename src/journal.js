import { makeId, saveStore } from './storage.js';

export function getJournalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addJournalEntry(state, patientId, mood, text, at = new Date()) {
  const entry = {
    id: makeId('journal'),
    patientId,
    mood,
    text: text.trim(),
    at: at.toISOString(),
    date: getJournalDateKey(at),
  };
  state.journals.push(entry);
  saveStore(state);
  return entry;
}

export function getJournalEntriesForPatient(state, patientId) {
  return state.journals
    .filter((entry) => entry.patientId === patientId)
    .slice()
    .sort((first, second) => new Date(second.at) - new Date(first.at));
}
