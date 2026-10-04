import test from 'node:test';
import assert from 'node:assert/strict';

import { addAlbumPhoto, removeAlbumPhoto, updateAlbumPhotoDescription } from './images.js';

function withLocalStorage(run) {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const savedValues = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      setItem(key, value) {
        savedValues.set(key, value);
      },
    },
  });

  try {
    run(savedValues);
  } finally {
    if (originalStorage) {
      Object.defineProperty(globalThis, 'localStorage', originalStorage);
    } else {
      delete globalThis.localStorage;
    }
  }
}

test('album photos save their caption and description', () => {
  withLocalStorage((savedValues) => {
    const state = { images: [] };
    const photo = addAlbumPhoto(state, 'patient-1', 'data:image/png;base64,AA==', 'Family picnic', 'We shared lunch outside. Everyone had a lovely afternoon.');

    assert.equal(photo.description, 'We shared lunch outside. Everyone had a lovely afternoon.');
    assert.equal(JSON.parse(savedValues.get('memoura-state-v1')).images[0].description, photo.description);
  });
});

test('album descriptions can be updated and removed without affecting other images', () => {
  withLocalStorage((savedValues) => {
    const albumPhoto = { id: 'album-1', type: 'album', description: '' };
    const gamePhoto = { id: 'game-1', type: 'jigsaw' };
    const state = { images: [albumPhoto, gamePhoto] };

    updateAlbumPhotoDescription(state, 'album-1', 'We are at the garden. The flowers are bright.');
    assert.equal(state.images[0].description, 'We are at the garden. The flowers are bright.');

    removeAlbumPhoto(state, 'album-1');
    assert.deepEqual(state.images, [gamePhoto]);
    assert.deepEqual(JSON.parse(savedValues.get('memoura-state-v1')).images, [gamePhoto]);
  });
});

test('failed album description saves restore the previous description', () => {
  withLocalStorage(() => {
    const photo = { id: 'album-1', type: 'album', description: 'Original sentence. Another original sentence.' };
    const state = { images: [photo] };
    globalThis.localStorage.setItem = () => {
      throw new Error('Storage unavailable');
    };

    assert.throws(() => updateAlbumPhotoDescription(state, 'album-1', 'Updated sentence. Second sentence.'), /Storage unavailable/);
    assert.equal(photo.description, 'Original sentence. Another original sentence.');
  });
});
