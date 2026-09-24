const speechSupported = () => !!window.speechSynthesis;

export function speakText(text, language = 'en', voiceOn = true) {
  if (!voiceOn || !speechSupported()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  const langMap = { en: 'en-US', as: 'as-IN', ne: 'ne-NP', mni: 'mni-IN' };
  utterance.lang = langMap[language] || 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function speakGreeting(name, state) {
  const hour = new Date().getHours();
  let prefix = 'Good Morning';
  if (hour >= 12 && hour < 17) prefix = 'Good Afternoon';
  if (hour >= 17) prefix = 'Good Evening';
  const text = `${prefix}, ${name}!`;
  speakText(text, state?.language || 'en', state?.settings?.voiceOn ?? true);
}
