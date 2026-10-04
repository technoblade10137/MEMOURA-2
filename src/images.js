import { makeId, saveStore } from './storage.js';

export function addAlbumPhoto(state, patientId, fileData, title = 'Family photo', description = '') {
  const previousImages = [...state.images];
  const image = {
    id: makeId('album_photo'),
    patientId,
    title,
    src: fileData,
    createdAt: new Date().toISOString(),
    type: 'album',
    description,
  };
  state.images.unshift(image);
  try {
    saveStore(state);
  } catch (error) {
    state.images = previousImages;
    throw error;
  }
  return image;
}

export function updateAlbumPhotoDescription(state, imageId, description) {
  const image = state.images.find((entry) => entry.id === imageId && entry.type === 'album');
  if (!image) throw new Error('Album photo not found');
  const previousDescription = image.description;
  image.description = description;
  try {
    saveStore(state);
  } catch (error) {
    image.description = previousDescription;
    throw error;
  }
}

export function removeAlbumPhoto(state, imageId) {
  const previousImages = state.images;
  state.images = state.images.filter((image) => image.id !== imageId || image.type !== 'album');
  try {
    saveStore(state);
  } catch (error) {
    state.images = previousImages;
    throw error;
  }
}

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
