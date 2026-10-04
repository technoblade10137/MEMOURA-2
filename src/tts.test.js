import test from 'node:test';
import assert from 'node:assert/strict';

import { speakText } from './tts.js';

async function withSpeechSynthesis(synthesis, run) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');

  globalThis.window = { speechSynthesis: synthesis };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };

  try {
    return await run();
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, 'window', previousWindow);
    } else {
      delete globalThis.window;
    }
    if (previousUtterance) {
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', previousUtterance);
    } else {
      delete globalThis.SpeechSynthesisUtterance;
    }
  }
}

test('speaks immediately without canceling an idle speech engine', async () => {
  const spoken = [];
  let canceled = false;

  await withSpeechSynthesis({
    speaking: false,
    pending: false,
    resume() {},
    cancel() {
      canceled = true;
    },
    speak(utterance) {
      spoken.push(utterance);
    },
  }, () => speakText('Hello', 'en'));

  assert.equal(canceled, false);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, 'Hello');
  assert.equal(spoken[0].lang, 'en-US');
});

test('replaces active speech with the latest message', async () => {
  const spoken = [];
  let canceled = false;

  await withSpeechSynthesis({
    speaking: true,
    pending: false,
    resume() {},
    cancel() {
      canceled = true;
    },
    speak(utterance) {
      spoken.push(utterance);
    },
  }, async () => {
    speakText('Updated message', 'ne');
    assert.equal(canceled, true);
    assert.equal(spoken.length, 0);
    await new Promise((resolve) => setTimeout(resolve, 5));
  });

  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, 'Updated message');
  assert.equal(spoken[0].lang, 'ne-NP');
});
