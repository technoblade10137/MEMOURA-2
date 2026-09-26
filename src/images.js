import { saveStore } from './storage.js';

export function addJigsawImage(state, patientId, fileData, title = 'New image') {
  const image = {
    id: `${Date.now()}`,
    patientId,
    title,
    src: fileData,
    createdAt: new Date().toISOString(),
  };
  state.images.unshift(image);
  saveStore(state);
  return image;
}

export function addMemoryRecallImage(state, patientId, fileData, scene = {}) {
  const answer = scene.answer || 'Family time';
  const distractors = (scene.options || []).filter(Boolean);
  const choices = Array.from(new Set([answer, ...distractors])).slice(0, 4);
  const fallbackAnswers = ['Family time', 'Tea break', 'Garden walk', 'Quiet rest'];

  while (choices.length < 4) {
    const candidate = fallbackAnswers[choices.length % fallbackAnswers.length];
    if (!choices.includes(candidate)) {
      choices.push(candidate);
    } else {
      choices.push(`Option ${choices.length + 1}`);
    }
  }

  const image = {
    id: `${Date.now()}`,
    patientId,
    title: scene.title || 'Memory scene',
    src: fileData,
    createdAt: new Date().toISOString(),
    type: 'memory-recall',
    memoryRecallQuestion: scene.question || 'What happened during this moment?',
    memoryRecallAnswer: answer,
    memoryRecallOptions: choices,
  };

  state.images.unshift(image);
  saveStore(state);
  return image;
}

export function removeJigsawImage(state, imageId) {
  state.images = state.images.filter((image) => image.id !== imageId);
  saveStore(state);
}
