export function getAssistantReply(question, patientName, state) {
  const q = (question || '').toLowerCase();
  if (q.includes('hello') || q.includes('hi')) return 'Hello! I am here to help you feel calm and easy.';
  if (q.includes('game') || q.includes('play')) return 'We can play a short memory game together. Pick a game you enjoy and we can start gently.';
  if (q.includes('routine') || q.includes('schedule')) return 'Your routine is simple and gentle. We can start with tea, a walk, or a short rest.';
  if (q.includes('reminder') || q.includes('time')) return 'I can remind you when it is time to walk, drink water, or rest.';
  if (q.includes('map') || q.includes('home')) return 'Your home map keeps rooms easy to find. We can look at the bedroom, kitchen, and garden.';
  if (q.includes('food') || q.includes('eat')) return 'A familiar food can make activity easier. Try a simple food memory game today.';
  if (q.includes('thanks') || q.includes('thank')) return 'You are welcome. We can take it slowly and enjoy the activity.';
  if (q.includes('help')) return 'I can explain the game, repeat the steps, and help you feel calm.';
  return `Let’s take a gentle step, ${patientName}. We can try a simple activity together.`;
}

export function buildDailySummary(state, patient) {
  const sessions = state.sessions.filter((entry) => entry.patientId === patient.id);
  const score = sessions.length ? Math.round((sessions.reduce((sum, item) => sum + (item.accuracy || 0), 0) / sessions.length)) : 0;
  return {
    title: 'Activity-based observation, not a medical diagnosis.',
    body: `You completed ${sessions.length} activities today. Your activity score is ${score}% today.`,
  };
}
