import test from 'node:test';
import assert from 'node:assert/strict';

import { t } from './i18n.js';

const moodResponseKeys = [
  'moodResponseHappy',
  'moodResponseSad',
  'moodResponseTired',
  'moodResponseAngry',
  'moodResponseDefault',
];

test('mood responses are translated for every supported language', () => {
  for (const language of ['en', 'as', 'ne', 'mni']) {
    for (const key of moodResponseKeys) {
      const response = t(key, { language });
      assert.notEqual(response, key, `${language} is missing ${key}`);
      assert.ok(response.length > 0, `${language} has an empty ${key}`);
    }
  }
});
