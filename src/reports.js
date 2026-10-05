function getPatientSessions(state, patientId) {
  return state.sessions.filter((session) => session.patientId === patientId);
}

function getMetricSessions(sessions) {
  return sessions.filter((session) => {
    if (typeof session.game !== 'string') return false;
    if (!Number.isFinite(session.accuracy) || session.accuracy < 0 || session.accuracy > 100) return false;
    if (session.game === 'Ludo' && session.performanceMetric !== 'completion') return false;
    return true;
  });
}

function getAverage(sessions) {
  if (!sessions.length) return 0;
  const totals = sessions.reduce((result, session) => {
    const hasCounts = Number.isFinite(session.correct) && Number.isFinite(session.incorrect);
    const weight = hasCounts ? Math.max(0, session.correct) + Math.max(0, session.incorrect) : 1;
    result.weightedScore += session.accuracy * weight;
    result.weight += weight;
    return result;
  }, { weightedScore: 0, weight: 0 });
  return totals.weight ? Math.round(totals.weightedScore / totals.weight) : 0;
}

export function generateReport(state, patientId) {
  const sessions = getMetricSessions(getPatientSessions(state, patientId));
  const analysis = getGameAnalysis(state, patientId);
  const accuracySessions = sessions.filter((session) => session.performanceMetric !== 'completion');
  const chart = analysis.games.map((game) => ({
    label: game.name,
    value: game.completionRate ?? game.averageAccuracy,
  }));
  return {
    chart,
    totals: {
      sessions: sessions.length,
      accuracy: getAverage(accuracySessions),
      hints: sessions.reduce((total, session) => total + (Number.isFinite(session.hintsUsed) ? session.hintsUsed : 0), 0),
    },
  };
}

export function getGameAnalysis(state, patientId) {
  const sessions = getMetricSessions(getPatientSessions(state, patientId));

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

  const games = Array.from(sessionsByGame, ([name, gameSessions]) => {
    const isCompletion = gameSessions.every((session) => session.performanceMetric === 'completion');
    const average = getAverage(gameSessions);
    return {
      name,
      sessions: gameSessions.length,
      ...(isCompletion ? { completionRate: average } : { averageAccuracy: average }),
    };
  }).sort((first, second) => second.sessions - first.sessions || first.name.localeCompare(second.name));

  const accuracyGames = games.filter((game) => Number.isFinite(game.averageAccuracy));
  const lowestAccuracyGame = accuracyGames.reduce((lowest, game) => (
    !lowest || game.averageAccuracy < lowest.averageAccuracy ? game : lowest
  ), null);
  const gameWord = lowestAccuracyGame?.sessions === 1 ? 'result' : 'results';

  return {
    summary: `${sessions.length} saved ${sessions.length === 1 ? 'game result' : 'game results'} across ${games.length} ${games.length === 1 ? 'game' : 'games'}.`,
    recommendation: lowestAccuracyGame
      ? `Offer ${lowestAccuracyGame.name} again at a comfortable pace; its average accuracy is ${lowestAccuracyGame.averageAccuracy}% across ${lowestAccuracyGame.sessions} ${gameWord}.`
      : 'Keep playing to build an accuracy history for the memory games.',
    games,
  };
}
