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

export function removeJigsawImage(state, imageId) {
  state.images = state.images.filter((image) => image.id !== imageId);
  saveStore(state);
}
