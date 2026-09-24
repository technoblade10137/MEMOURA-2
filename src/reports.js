export function generateReport(state, patientId) {
  const patientSessions = state.sessions.filter((session) => session.patientId === patientId);
  const chart = [
    { label: 'Games', value: patientSessions.length || 1 },
    { label: 'Accuracy', value: patientSessions.length ? Math.round(patientSessions.reduce((acc, session) => acc + (session.accuracy || 0), 0) / patientSessions.length) : 0 },
    { label: 'Hints', value: patientSessions.reduce((acc, session) => acc + (session.hintsUsed || 0), 0) },
    { label: 'Routines', value: state.routines.filter((item) => item.patientId === patientId).length || 1 },
  ];
  return { chart, totals: { sessions: patientSessions.length, accuracy: chart[1].value, hints: chart[2].value } };
}

export function getAiInsights(state, patientId) {
  const patientSessions = state.sessions.filter((session) => session.patientId === patientId);
  if (!patientSessions.length) return ['Try a familiar food-based Memory Recall next.'];
  const avgAccuracy = Math.round(patientSessions.reduce((acc, item) => acc + (item.accuracy || 0), 0) / patientSessions.length);
  if (avgAccuracy >= 80) return ['Try a familiar food-based Memory Recall next.', 'Your recent activities look steady.'];
  return ['Consider a shorter Sequence Recall.', 'Try a simpler activity with more voice help.'];
}
