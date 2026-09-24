import { saveStore } from './storage.js';

export function addMood(state, patientId, mood) {
  const moodEntry = { id: `${Date.now()}`, patientId, mood, at: new Date().toISOString() };
  state.moods.unshift(moodEntry);
  saveStore(state);
  return moodEntry;
}

export function getRecentMood(state, patientId) {
  const moods = state.moods.filter((item) => item.patientId === patientId).sort((a, b) => new Date(b.at) - new Date(a.at));
  return moods[0]?.mood || 'happy';
}

export function updateProfile(state, patientId, updates) {
  const patient = state.patients.find((entry) => entry.id === patientId);
  if (!patient) return null;
  Object.assign(patient, updates);
  saveStore(state);
  return patient;
}

export function updateCaregiverPreferences(state, caregiverId, updates) {
  const caregiver = state.caregivers.find((entry) => entry.id === caregiverId);
  if (!caregiver) return null;
  Object.assign(caregiver, updates);
  saveStore(state);
  return caregiver;
}
