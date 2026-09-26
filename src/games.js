export const GAME_LIBRARY = {
  jigsaw: {
    name: 'Memory Jigsaw',
    difficulty: ['Easy', 'Medium', 'Hard'],
  },
  recall: {
    name: 'Memory Recall',
    category: ['Places', 'Food', 'Locations', 'Mixed'],
  },
  tea: { name: 'Tea Leaf Sorting', difficulty: ['Easy', 'Medium', 'Hard'] },
  dish: { name: 'Make My Sandwich', difficulty: ['Easy', 'Medium', 'Hard'] },
  sequence: { name: 'Sequence Recall', difficulty: ['Easy', 'Medium', 'Hard'] },
  ludo: { name: 'Ludo', difficulty: ['Easy', 'Medium', 'Hard'] },
};

export function getRecallQuestion(category = 'Mixed') {
  const questions = {
    Places: [
      { q: 'Where do we usually sit for tea?', options: ['Bedroom', 'Garden', 'Kitchen', 'Bathroom'], answer: 'Garden' },
      { q: 'Where is the rice kept?', options: ['Kitchen', 'Bathroom', 'Main Door', 'Bedroom'], answer: 'Kitchen' },
    ],
    Food: [
      { q: 'Which is a common Assamese food?', options: ['Khar', 'Pasta', 'Burger', 'Curry'], answer: 'Khar' },
      { q: 'Which food is usually warm and soft?', options: ['Pitha', 'Sandwich', 'Soda', 'Coffee'], answer: 'Pitha' },
    ],
    Locations: [
      { q: 'Where do we keep the clothes?', options: ['Bedroom', 'Garden', 'Kitchen', 'Main Door'], answer: 'Bedroom' },
      { q: 'Where do we enter the house?', options: ['Main Door', 'Garden', 'Bathroom', 'Kitchen'], answer: 'Main Door' },
    ],
    Mixed: [
      { q: 'Which item is part of a meal?', options: ['Rice', 'Shoe', 'Brush', 'Soap'], answer: 'Rice' },
      { q: 'What do we use to go outside?', options: ['Shoes', 'Cup', 'Bowl', 'Blanket'], answer: 'Shoes' },
    ],
  };
  const list = questions[category] || questions.Mixed;
  return list[Math.floor(Math.random() * list.length)];
}

export function getDishChallenge(favoriteFoods = []) {
  const dishMap = {
    Assam: ['Khar', 'Pitha', 'Masor Tenga'],
    'Arunachal Pradesh': ['Thukpa', 'Momos', 'Zan'],
    Manipur: ['Eromba'],
    Sikkim: ['Thukpa', 'Momos'],
  };
  const defaultList = ['Khar', 'Pitha'];
  const choices = favoriteFoods.length ? favoriteFoods : defaultList;
  return {
    title: 'Make My Sandwich',
    ingredients: choices,
    answer: choices[0],
  };
}

export function getSequencePattern(size = 4) {
  const pattern = Array.from({ length: size }, (_, index) => index + 1);
  return pattern.slice(0, Math.min(size, 5));
}

export function buildLudoBoard() {
  return Array.from({ length: 15 * 15 }, (_, index) => ({ index, type: (index % 7 === 0) ? 'safe' : 'normal' }));
}
