import en from './translations/en.js';
import assam from './translations/assam.js';
import ne from './translations/ne.js';
import mni from './translations/mni.js';

const translations = { en, as: assam, ne, mni };

export function getLanguageMap() {
  return { en: 'en', as: 'as', ne: 'ne', mni: 'mni' };
}

export function t(key, state, values = {}) {
  const lang = (state && state.language) || 'en';
  const dict = translations[lang] || translations.en;
  const text = dict[key] || translations.en[key] || key;
  return Object.entries(values).reduce((result, [target, value]) => result.replace(`{${target}}`, value), text);
}

export function getGreeting(state, name) {
  const hour = new Date().getHours();
  const lang = (state && state.language) || 'en';
  const map = {
    en: { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening' },
    as: { morning: 'সুপ্রভাত', afternoon: 'শুভ বিকাল', evening: 'শুভ সন্ধ্যা' },
    ne: { morning: 'शुभ प्रभात', afternoon: 'शुभ दिउँसो', evening: 'शुभ साँझ' },
    mni: { morning: 'ꯍꯟꯅ ꯀꯨꯟꯁꯨ', afternoon: 'ꯚꯤꯛꯍꯥꯢ', evening: 'ꯁꯦꯟꯗꯥ' }
  };
  const block = map[lang] || map.en;
  let label = block.morning;
  if (hour >= 12 && hour < 17) label = block.afternoon;
  if (hour >= 17) label = block.evening;
  return `${label}, ${name}`;
}

export function getStateLanguage(state) {
  const stateName = state?.patients?.[0]?.state || 'Assam';
  const map = { Assam: 'as', 'Arunachal Pradesh': 'en', Manipur: 'mni', Sikkim: 'ne' };
  return map[stateName] || 'en';
}
