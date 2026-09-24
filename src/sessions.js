import { saveStore } from './storage.js';

export function saveSession(state, sessionData) {
  const session = {
    id: `${Date.now()}`,
    completionStatus: 'completed',
    ...sessionData,
    date: new Date().toISOString(),
  };
  state.sessions.unshift(session);
  saveStore(state);
  return session;
}

export function calculateSessionMetrics(correct, total) {
  const ratio = total ? (correct / total) * 100 : 0;
  return Math.round(ratio);
}
