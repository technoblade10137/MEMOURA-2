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

export function getGameAnalysis(state, patientId) {
  const sessions = state.sessions.filter((session) => (
    session.patientId === patientId
    && typeof session.game === 'string'
    && Number.isFinite(session.accuracy)
  ));

  if (!sessions.length) {
    return {
      summary: 'There are no game results to review yet.',
      recommendation: 'Once a game has been played, its saved results will appear here.',
      games: [],
    };
  }

  const sessionsByGame = new Map();
  sessions.forEach((session) => {
    const gameSessions = sessionsByGame.get(session.game) || [];
    gameSessions.push(session);
    sessionsByGame.set(session.game, gameSessions);
  });

  const games = Array.from(sessionsByGame, ([name, gameSessions]) => ({
    name,
    sessions: gameSessions.length,
    averageAccuracy: Math.round(gameSessions.reduce((total, session) => total + session.accuracy, 0) / gameSessions.length),
  })).sort((first, second) => second.sessions - first.sessions || first.name.localeCompare(second.name));

  const lowestAccuracyGame = games.reduce((lowest, game) => (
    game.averageAccuracy < lowest.averageAccuracy ? game : lowest
  ));
  const gameWord = lowestAccuracyGame.sessions === 1 ? 'result' : 'results';

  return {
    summary: `${sessions.length} saved ${sessions.length === 1 ? 'game result' : 'game results'} across ${games.length} ${games.length === 1 ? 'game' : 'games'}.`,
    recommendation: `Offer ${lowestAccuracyGame.name} again at a comfortable pace; its average accuracy is ${lowestAccuracyGame.averageAccuracy}% across ${lowestAccuracyGame.sessions} ${gameWord}.`,
    games,
  };
}
