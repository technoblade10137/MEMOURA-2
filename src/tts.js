const speechSupported = () => !!window.speechSynthesis;

const unlockSpeechOnInteraction = () => {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.resume();
  } catch (error) {
    // Ignore mobile browser autoplay restrictions.
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', unlockSpeechOnInteraction, { once: true, passive: true });
  document.addEventListener('touchstart', unlockSpeechOnInteraction, { once: true, passive: true });
}

export function speakText(text, language = 'en', voiceOn = true) {
  if (!voiceOn || !speechSupported()) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const langMap = { en: 'en-US', as: 'as-IN', ne: 'ne-NP', mni: 'mni-IN' };
  utterance.lang = langMap[language] || 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.1;

  const synthesis = window.speechSynthesis;
  if (synthesis.speaking || synthesis.pending) {
    synthesis.cancel();
    setTimeout(() => {
      unlockSpeechOnInteraction();
      synthesis.speak(utterance);
    }, 0);
  } else {
    unlockSpeechOnInteraction();
    window.speechSynthesis.speak(utterance);
  }
}

export function speakGreeting(name, state) {
  const hour = new Date().getHours();
  let prefix = 'Good Morning';
  if (hour >= 12 && hour < 17) prefix = 'Good Afternoon';
  if (hour >= 17) prefix = 'Good Evening';
  const text = `${prefix}, ${name}!`;
  speakText(text, state?.language || 'en', state?.settings?.voiceOn ?? true);
}
