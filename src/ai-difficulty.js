const difficultyOrder = ['Easy', 'Medium', 'Hard'];

export function getLevelIndex(level) {
  return difficultyOrder.indexOf(level) >= 0 ? difficultyOrder.indexOf(level) : 1;
}

export function updateDifficulty(state, patientId, game, result) {
  const recent = state.sessions.filter((session) => session.patientId === patientId && session.game === game).slice(-5);
  const currentLevel = recent.at(-1)?.difficulty || 'Medium';
  const index = getLevelIndex(currentLevel);
  const averageAccuracy = recent.length ? recent.reduce((sum, item) => sum + (item.accuracy || 0), 0) / recent.length : 50;
  const exits = recent.filter((item) => item.abandonment).length;
  let nextIndex = index;

  if (averageAccuracy >= 85 && exits === 0) nextIndex = Math.min(difficultyOrder.length - 1, index + 1);
  else if (averageAccuracy <= 55 || exits >= 2) nextIndex = Math.max(0, index - 1);

  const nextDifficulty = difficultyOrder[nextIndex];
  state.gamePreferences = state.gamePreferences || {};
  state.gamePreferences[game] = nextDifficulty;
  return nextDifficulty;
}

export function chooseDailyActivity(state, patient) {
  const available = ['Memory Recall', 'Tea Leaf Sorting', 'Sequence Recall', 'Memory Jigsaw', 'Build the Dish'];
  const recent = state.sessions.filter((item) => item.patientId === patient.id).slice(-4);
  const preferences = state.gamePreferences || {};
  if (recent.length && recent.some((item) => item.accuracy >= 80)) return 'Memory Recall';
  if (preferences.favoriteFoods && preferences.favoriteFoods.length) return 'Build the Dish';
  return available[Math.floor(Math.random() * available.length)];
}
