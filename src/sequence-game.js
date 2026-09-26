const CARD_SET = [
  { id: 'sun', label: '☀️', name: 'Sun' },
  { id: 'leaf', label: '🌿', name: 'Leaf' },
  { id: 'flower', label: '🌼', name: 'Flower' },
  { id: 'star', label: '⭐', name: 'Star' },
  { id: 'bell', label: '🔔', name: 'Bell' },
  { id: 'moon', label: '🌙', name: 'Moon' },
  { id: 'apple', label: '🍎', name: 'Apple' },
  { id: 'music', label: '🎵', name: 'Music' },
  { id: 'rocket', label: '🚀', name: 'Rocket' },
  { id: 'cup', label: '☕', name: 'Cup' },
  { id: 'ball', label: '⚽', name: 'Ball' },
  { id: 'tree', label: '🌳', name: 'Tree' },
  { id: 'cloud', label: '☁️', name: 'Cloud' },
  { id: 'gift', label: '🎁', name: 'Gift' },
  { id: 'book', label: '📘', name: 'Book' },
  { id: 'heart', label: '💛', name: 'Heart' },
];

export function getSequenceLevelConfig(level = 1) {
  const configMap = {
    1: { cards: 4, memorizeMs: 7000 },
    2: { cards: 5, memorizeMs: 6000 },
    3: { cards: 6, memorizeMs: 5000 },
    4: { cards: 7, memorizeMs: 4500 },
    5: { cards: 8, memorizeMs: 4000 },
  };

  return configMap[Math.min(5, Math.max(1, Number(level) || 1))] || configMap[1];
}

export function shuffleItems(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function createSequenceRound(level = 1) {
  const config = getSequenceLevelConfig(level);
  const roundCards = shuffleItems(CARD_SET).slice(0, config.cards).map((card) => ({
    ...card,
    key: `${card.id}-${Math.random().toString(16).slice(2, 8)}`,
  }));

  const pattern = shuffleItems(roundCards).map((card) => card.key);

  return {
    level,
    cards: roundCards,
    pattern,
    config,
    recallCards: shuffleItems(roundCards),
  };
}

export function evaluateSequence(pattern, selection, timeTaken = 0) {
  const maxLength = pattern.length || 1;
  let correct = 0;

  for (let index = 0; index < maxLength; index += 1) {
    if (selection[index] === pattern[index]) {
      correct += 1;
    }
  }

  const quickBonus = Math.max(0, Math.round((12 - Math.min(timeTaken, 12)) * 4));
  const score = correct * 25 + (correct === maxLength ? 30 : 0) + quickBonus;

  return {
    correct,
    isCorrect: correct === maxLength,
    score,
    accuracy: Math.round((correct / maxLength) * 100),
    quickBonus,
  };
}
