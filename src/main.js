import { loadStore, saveStore, getActivePatient, setCurrentUser } from './storage.js';
import { t, getGreeting } from './i18n.js';
import { registerPatient, registerCaregiver, loginCaregiver, loginPatient } from './auth.js';
import { addMood } from './profiles.js';
import { getAssistantReply, buildDailySummary } from './ai-assistant.js';
import { speakText } from './tts.js';
import { showToast, requestNotificationPermission } from './notifications.js';
import { addReminder, updateReminderStatus } from './reminders.js';
import { addRoutine } from './routines.js';
import { addJigsawImage, addMemoryRecallImage } from './images.js';
import { toggleLocationSharing, addRoom } from './maps.js';
import { saveSession } from './sessions.js';
import { chooseDailyActivity, updateDifficulty } from './ai-difficulty.js';
import { getRecallQuestion, getDishChallenge, getSequencePattern } from './games.js';
import { createSequenceRound, evaluateSequence } from './sequence-game.js';
import { generateReport, getAiInsights } from './reports.js';

let app = null;
let state = null;
let currentGame = null;
let activeQuestion = null;
let currentRecallQuestions = [];
let currentRecallIndex = 0;
let sequenceState = {
  phase: 'intro',
  level: 1,
  cards: [],
  pattern: [],
  recallCards: [],
  selection: [],
  memorizeTime: 7000,
  countdown: 0,
  startedAt: 0,
  result: null,
  bestScore: 0,
  loopId: null,
};
let jigsawState = { placed: [], draggedPiece: null };
let burgerSelection = [];
let sandwichGameState = {
  difficulty: 'Easy',
  target: [],
  selection: [],
  feedback: 'Look carefully and remember the sandwich order.',
  previewing: true,
  viewingTime: 8000,
  hintsUsed: 0,
  maxHints: 3,
  hintedIngredient: null,
  score: 0,
  completed: false,
  consecutiveWins: 0,
  consecutiveMistakes: 0,
  round: 1,
};
let ludoState = {
  players: [
    { id: 'human', name: 'You', color: 'red', isHuman: true, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
    { id: 'ai-green', name: 'AI Green', color: 'green', isHuman: false, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
    { id: 'ai-yellow', name: 'AI Yellow', color: 'yellow', isHuman: false, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
    { id: 'ai-blue', name: 'AI Blue', color: 'blue', isHuman: false, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
  ],
  currentTurn: 0,
  dice: 1,
  lastRoll: null,
  legalMoves: [],
  soundOn: true,
  score: 0,
  turns: 0,
  gameOver: false,
  winner: null,
  message: 'Your turn. Roll the dice!',
  aiRunning: false,
  rolling: false,
};
let teaMusicSession = null;
const ingredientArt = {
  Bun: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  Patty: 'https://images.unsplash.com/photo-1550317138-10000687a72b?auto=format&fit=crop&w=600&q=80',
  Cheese: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80',
  Lettuce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  Tomato: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=600&q=80',
};

if (typeof document !== 'undefined') {
  app = document.getElementById('app');
  state = loadStore();
}

function refreshState() {
  state = loadStore();
}

function render() {
  if (!state.currentRole || !state.currentUserId) {
    renderWelcome();
    return;
  }
  const patient = state.patients.find((entry) => entry.id === state.currentUserId) || state.patients[0];
  if (state.currentRole === 'patient') {
    renderPatientDashboard(patient);
    return;
  }
  const caregiver = state.caregivers.find((entry) => entry.id === state.currentUserId) || state.caregivers[0];
  renderCaregiverDashboard(caregiver);
}

function renderWelcome() {
  app.innerHTML = `
    <div class="app-shell">
      <div class="screen">
        <div class="hero welcome-hero">
          <img src="logo.jpeg" alt="MEMOURA logo" class="brand-mark" />
          <h1>${t('appTitle', state)}</h1>
          <p>Memory • Routine • Care • Connection</p>
        </div>
        <div class="role-grid">
          <button class="role-card" data-role="patient">
            <h2>${t('patient', state)}</h2>
            <p>${t('welcome', state)}</p>
          </button>
          <button class="role-card" data-role="caregiver">
            <h2>${t('caregiver', state)}</h2>
            <p>${t('welcome', state)}</p>
          </button>
        </div>
        <div class="form-card">
          <div class="role-switch-panel">
            <button class="role-switch-btn active" data-role-switch="patient">Patient</button>
            <button class="role-switch-btn" data-role-switch="caregiver">Caregiver</button>
          </div>
          <div id="welcome-form-slot"></div>
        </div>
      </div>
    </div>
  `;
  attachWelcomeEvents();
}

function attachWelcomeEvents() {
  document.querySelectorAll('[data-role]').forEach((button) => {
    button.addEventListener('click', () => {
      const role = button.dataset.role;
      renderRoleForm(role);
      document.querySelectorAll('.role-switch-btn').forEach((item) => {
        item.classList.toggle('active', item.dataset.roleSwitch === role);
      });
    });
  });

  document.querySelectorAll('.role-switch-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const role = button.dataset.roleSwitch;
      document.querySelectorAll('.role-switch-btn').forEach((item) => item.classList.toggle('active', item === button));
      renderRoleForm(role);
    });
  });
}

function renderRoleForm(role) {
  const slot = document.getElementById('welcome-form-slot');
  if (role === 'patient') {
    slot.innerHTML = `
      <h3>${t('patientRegister', state)}</h3>
      <form id="patient-register-form" class="form-grid">
        <div class="field"><label>${t('name', state)}</label><input name="name" placeholder="Enter your name" required /></div>
        <div class="field"><label>${t('dob', state)}</label><input type="date" name="dob" required /></div>
        <div class="field"><label>${t('phone', state)}</label><input name="phone" required /></div>
        <div class="field"><label>${t('state', state)}</label>
          <select name="state">
            <option>Assam</option>
            <option>Arunachal Pradesh</option>
            <option>Manipur</option>
            <option>Sikkim</option>
          </select>
        </div>
        <div class="field full"><label>${t('stage', state)}</label><div class="stage-options">
          <button type="button" class="stage-option active" data-stage="Early">Early</button>
          <button type="button" class="stage-option" data-stage="Mild">Mild</button>
          <button type="button" class="stage-option" data-stage="Severe">Severe</button>
        </div><input type="hidden" name="stage" value="Early" /></div>
        <div class="field"><label>${t('language', state)}</label>
          <select name="language">
            <option value="en">English</option>
            <option value="as">Assamese</option>
            <option value="ne">Nepali</option>
            <option value="mni">Manipuri</option>
          </select>
        </div>
        <div class="field full"><button type="submit" class="primary-btn">${t('register', state)}</button></div>
      </form>
    `;
    attachStageSelector('patient-register-form');
    bindPatientForm();
  } else {
    slot.innerHTML = `
      <h3>${t('caregiverRegister', state)}</h3>
      <form id="caregiver-register-form" class="form-grid">
        <div class="field"><label>Caregiver name</label><input name="caregiverName" placeholder="Caregiver name" required /></div>
        <div class="field"><label>Caregiver phone</label><input name="caregiverPhone" required /></div>
        <div class="field"><label>Patient name</label><input name="patientName" placeholder="Patient name" required /></div>
        <div class="field"><label>Patient phone</label><input name="patientPhone" required /></div>
        <div class="field full"><label>${t('caregiverPassword', state)}</label><input type="password" name="password" required /></div>
        <div class="field full"><button type="submit" class="primary-btn">${t('register', state)}</button></div>
      </form>
    `;
    bindCaregiverForm();
  }
}

function attachStageSelector(formId) {
  const form = document.getElementById(formId);
  const hidden = form.querySelector('input[name="stage"]');
  form.querySelectorAll('.stage-option').forEach((button) => {
    button.addEventListener('click', () => {
      form.querySelectorAll('.stage-option').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      hidden.value = button.dataset.stage;
    });
  });
}

function bindPatientForm() {
  document.getElementById('patient-register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get('name'),
      dob: formData.get('dob'),
      phone: formData.get('phone'),
      stage: formData.get('stage'),
      state: formData.get('state'),
      language: formData.get('language') || 'en',
    };
    const patient = await registerPatient(state, payload);
    state.language = payload.language;
    setCurrentUser(state, 'patient', patient.id);
    saveStore(state);
    render();
  });
}

function getCurrentDisplayName() {
  const role = state.currentRole;
  if (role === 'patient') {
    const patient = state.patients.find((entry) => entry.id === state.currentUserId);
    return patient?.name || 'Patient';
  }
  if (role === 'caregiver') {
    const caregiver = state.caregivers.find((entry) => entry.id === state.currentUserId);
    return caregiver?.name || 'Caregiver';
  }
  return 'Patient';
}

function switchToRole(nextRole) {
  const targetRole = nextRole === 'caregiver' ? 'caregiver' : 'patient';
  const fallbackUser = targetRole === 'patient' ? state.patients[0]?.id : state.caregivers[0]?.id;
  if (!fallbackUser) return;
  state.currentRole = targetRole;
  state.currentUserId = fallbackUser;
  saveStore(state);
  render();
}

function openSettingsModal() {
  const existing = document.getElementById('settings-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'settings-modal';
  modal.className = 'settings-modal show';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="topbar">
        <h3>Settings</h3>
        <button class="danger-btn" data-settings-close="close">Close</button>
      </div>
      <div class="settings-list">
        <button class="small-btn ${state.currentRole === 'patient' ? 'active' : ''}" data-settings-role="patient">Patient view</button>
        <button class="small-btn ${state.currentRole === 'caregiver' ? 'active' : ''}" data-settings-role="caregiver">Caregiver view</button>
        <button class="small-btn ${state.settings.voiceOn ? 'active' : ''}" data-settings-voice="toggle">${state.settings.voiceOn ? 'Voice on' : 'Voice off'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('[data-settings-close]').addEventListener('click', () => modal.remove());
  modal.querySelectorAll('[data-settings-role]').forEach((button) => {
    button.addEventListener('click', () => {
      switchToRole(button.dataset.settingsRole);
      modal.remove();
    });
  });
  modal.querySelector('[data-settings-voice]').addEventListener('click', () => {
    state.settings.voiceOn = !state.settings.voiceOn;
    saveStore(state);
    render();
    modal.remove();
  });
}

function bindCaregiverForm() {
  document.getElementById('caregiver-register-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const patientName = formData.get('patientName');
    const patientPhone = formData.get('patientPhone');
    const matchedPatient = state.patients.find((patient) => patient.name === patientName && patient.phone === patientPhone);
    const patientId = matchedPatient ? matchedPatient.id : null;
    const caregiverPayload = {
      name: formData.get('caregiverName'),
      phone: formData.get('caregiverPhone'),
      patientName,
      patientPhone,
      patientId,
      password: formData.get('password'),
    };
    const caregiver = await registerCaregiver(state, caregiverPayload, caregiverPayload.password);
    if (!matchedPatient) {
      const patient = await registerPatient(state, {
        name: patientName,
        dob: '1960-01-01',
        phone: patientPhone,
        stage: 'Mild',
        state: 'Assam',
        language: 'en',
      });
      caregiver.patientId = patient.id;
    }
    state.language = matchedPatient?.language || 'en';
    setCurrentUser(state, 'caregiver', caregiver.id);
    saveStore(state);
    render();
  });
}

function renderPatientDashboard(patient) {
  const reminder = getTodaysReminder(patient.id);
  const activity = chooseDailyActivity(state, patient);
  const greeting = getGreeting(state, patient.name);
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand-wrap">
          <img src="logo.jpeg" alt="MEMOURA logo" class="brand-mark" />
          <div class="brand">MEMOURA</div>
        </div>
        <div class="actions">
          <button class="small-btn" data-action="home">${t('home', state)}</button>
          <button class="small-btn" data-action="settings">Settings</button>
          <button class="small-btn" data-action="voice-toggle">${state.settings.voiceOn ? t('voiceOn', state) : t('voiceOff', state)}</button>
          <button class="small-btn" data-action="repeat">${t('repeat', state)}</button>
        </div>
      </div>
      <div class="screen">
        <div class="hero">
          <h2>${greeting}</h2>
          <p>${t('moodPrompt', state)}</p>
          <div class="mood-options">
            ${[
              ['happy', '😊'],
              ['sad', '😟'],
              ['tired', '😴'],
              ['angry', '😠']
            ].map(([mood, emoji]) => `<button class="mood-option" data-mood="${mood}">${emoji} ${moodLabel(mood, state)}</button>`).join('')}
          </div>
        </div>
        <div class="window">
          <div class="panel">
            <h3>${t('todaysActivity', state)}</h3>
            <div class="summary-card">
              <h4>${activity}</h4>
              <button class="primary-btn" data-action="start-game" data-game="${activity}">${t('start', state)}</button>
            </div>
          </div>
          <div class="panel">
            <h3>${t('assistant', state)}</h3>
            <p>${getAssistantReply('hello', patient.name, state)}</p>
            <input id="assistant-input" placeholder="${t('ask', state)}" />
            <button class="primary-btn" id="assistant-send">${t('send', state)}</button>
          </div>
        </div>
        <div class="card-grid">
          <button class="card-button" data-action="open-game-hub">${t('games', state)}</button>
          <button class="card-button" data-action="open-routine">${t('routine', state)}</button>
          <button class="card-button" data-action="open-reminders">${t('reminders', state)}</button>
          <button class="card-button" data-action="open-map">${t('map', state)}</button>
          <button class="card-button" data-action="open-ai">${t('assistant', state)}</button>
          <button class="card-button" data-action="open-progress">${t('progress', state)}</button>
        </div>
        <div class="panel">
          <h3>${t('routineTitle', state)}</h3>
          <div class="timeline">
            ${state.routines.filter((item) => item.patientId === patient.id).map((routine) => `
              <div class="timeline-item"><span class="dot"></span><div><strong>${routine.title}</strong><div>${routine.time} • ${routine.days.join(', ')}</div></div></div>
            `).join('') || '<p>No routine yet.</p>'}
          </div>
        </div>
      </div>
    </div>
    <div class="reminder-modal ${reminder ? 'show' : ''}" id="reminder-modal">
      <div class="modal-card">
        <h3>${reminder?.title || t('reminderPopup', state)}</h3>
        <p>${reminder?.note || 'Please take a break and stay comfortable.'}</p>
        <div class="modal-actions">
          <button class="primary-btn" data-reminder-action="done" data-reminder-id="${reminder?.id || ''}">${t('done', state)}</button>
          <button class="ghost-btn" data-reminder-action="later" data-reminder-id="${reminder?.id || ''}">${t('remindLater', state)}</button>
        </div>
      </div>
    </div>
  `;
  attachPatientEvents(patient);
  if (reminder) {
    speakText(reminder.title || 'Time to move gently', state.language, state.settings.voiceOn);
  }
}

function moodLabel(mood, currentState) {
  const map = { happy: t('happy', currentState), sad: t('sad', currentState), tired: t('tired', currentState), angry: t('angry', currentState) };
  return map[mood] || mood;
}

function playWinSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const audioCtx = new AudioCtx();
  const sequence = [660, 820, 990];
  sequence.forEach((frequency, index) => {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = index % 2 === 0 ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.0001;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const start = audioCtx.currentTime + index * 0.12;
    gainNode.gain.exponentialRampToValueAtTime(0.08, start + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    oscillator.start(start);
    oscillator.stop(start + 0.22);
  });
  setTimeout(() => audioCtx.close(), 500);
}

function stopTeaSortingMusic() {
  if (!teaMusicSession) return;
  const { audioCtx, noiseSource, droneOscillator, masterGain, loopId } = teaMusicSession;

  if (loopId) {
    clearInterval(loopId);
  }
  if (noiseSource) noiseSource.stop();
  if (droneOscillator) droneOscillator.stop();
  if (masterGain) {
    masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.25);
  }
  setTimeout(() => {
    if (audioCtx.state !== 'closed') audioCtx.close();
    teaMusicSession = null;
  }, 350);
}

function playTeaSortingMusic() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (teaMusicSession && teaMusicSession.audioCtx && teaMusicSession.audioCtx.state !== 'closed') {
    return;
  }

  const audioCtx = new AudioCtx();
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.035;
  masterGain.connect(audioCtx.destination);

  const droneOscillator = audioCtx.createOscillator();
  droneOscillator.type = 'sine';
  droneOscillator.frequency.value = 196;
  const droneGain = audioCtx.createGain();
  droneGain.gain.value = 0.018;
  droneOscillator.connect(droneGain).connect(masterGain);
  droneOscillator.start();

  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseData.length; index += 1) {
    noiseData[index] = (Math.random() * 2 - 1) * 0.12;
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1100;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.015;
  noiseSource.connect(filter).connect(noiseGain).connect(masterGain);
  noiseSource.start();

  const notes = [261.63, 329.63, 392.0, 349.23, 293.66, 392.0];
  let noteStep = 0;
  const loopId = setInterval(() => {
    if (!teaMusicSession || !audioCtx || audioCtx.state === 'closed') return;
    const note = notes[noteStep % notes.length];
    const oscillator = audioCtx.createOscillator();
    const noteGain = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = note;
    noteGain.gain.value = 0.0001;
    oscillator.connect(noteGain).connect(masterGain);
    const start = audioCtx.currentTime;
    noteGain.gain.exponentialRampToValueAtTime(0.018, start + 0.18);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 1.3);
    oscillator.start(start);
    oscillator.stop(start + 1.4);
    noteStep += 1;
  }, 1600);

  teaMusicSession = { audioCtx, masterGain, noiseSource, droneOscillator, loopId };
}

function celebrateWin(message) {
  showToast(message);
  playWinSound();
  const text = message.replace(/\s+/g, ' ').trim();
  if (state?.language) {
    speakText(text, state.language, state.settings.voiceOn);
  }
}

function attachPatientEvents(patient) {
  document.querySelectorAll('[data-mood]').forEach((button) => {
    button.addEventListener('click', () => {
      const mood = button.dataset.mood;
      addMood(state, patient.id, mood);
      showToast('Mood saved');
      render();
    });
  });
  document.querySelector('[data-action="home"]').addEventListener('click', () => renderPatientDashboard(patient));
  document.querySelector('[data-action="settings"]').addEventListener('click', () => openSettingsModal());
  document.querySelector('[data-action="voice-toggle"]').addEventListener('click', () => {
    state.settings.voiceOn = !state.settings.voiceOn;
    saveStore(state);
    render();
  });
  document.querySelector('[data-action="repeat"]').addEventListener('click', () => {
    const text = `Good day, ${patient.name}. Please take a deep breath and start slowly.`;
    speakText(text, state.language, state.settings.voiceOn);
  });
  document.querySelector('[data-action="start-game"]').addEventListener('click', () => {
    openGameModal(document.querySelector('[data-action="start-game"]').dataset.game || 'Memory Recall');
  });
  document.querySelector('[data-action="open-game-hub"]').addEventListener('click', () => renderGameHub(patient));
  document.querySelector('[data-action="open-routine"]').addEventListener('click', () => renderRoutineView(patient));
  document.querySelector('[data-action="open-reminders"]').addEventListener('click', () => renderReminderView(patient));
  document.querySelector('[data-action="open-map"]').addEventListener('click', () => renderMapView(patient));
  document.querySelector('[data-action="open-ai"]').addEventListener('click', () => renderAssistantView(patient));
  document.querySelector('[data-action="open-progress"]').addEventListener('click', () => renderProgressView(patient));
  document.getElementById('assistant-send').addEventListener('click', () => {
    const input = document.getElementById('assistant-input');
    const msg = input.value.trim();
    if (!msg) return;
    const reply = getAssistantReply(msg, patient.name, state);
    showToast(reply);
    speakText(reply, state.language, state.settings.voiceOn);
    input.value = '';
  });
  document.querySelectorAll('[data-reminder-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const reminderId = button.dataset.reminderId;
      updateReminderStatus(state, reminderId, button.dataset.reminderAction === 'done' ? 'done' : 'postponed');
      document.getElementById('reminder-modal').classList.remove('show');
      render();
    });
  });
}

function renderGameHub(patient) {
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand">${t('gameHub', state)}</div>
        <button class="small-btn" data-action="home">${t('home', state)}</button>
      </div>
      <div class="card-grid">
        <button class="card-button" data-game-select="Memory Jigsaw">Memory Jigsaw</button>
        <button class="card-button" data-game-select="Memory Recall">Memory Recall</button>
        <button class="card-button" data-game-select="Tea Leaf Sorting">Tea Leaf Sorting</button>
        <button class="card-button" data-game-select="Make My Sandwich">Make My Sandwich</button>
        <button class="card-button" data-game-select="Sequence Recall">Sequence Recall</button>
        <button class="card-button" data-game-select="Ludo">Ludo</button>
      </div>
    </div>
  `;
  document.querySelector('[data-action="home"]').addEventListener('click', () => render());
  document.querySelectorAll('[data-game-select]').forEach((button) => {
    button.addEventListener('click', () => openGameModal(button.dataset.gameSelect));
  });
}

function renderRoutineView(patient) {
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar"><div class="brand">${t('routine', state)}</div><button class="small-btn" data-action="home">${t('home', state)}</button></div>
      <div class="panel">
        <h3>${t('routineTitle', state)}</h3>
        <div class="timeline">
          ${state.routines.filter((item) => item.patientId === patient.id).map((routine) => `<div class="timeline-item"><span class="dot"></span><div><strong>${routine.title}</strong><div>${routine.time} • ${routine.note || ''}</div></div></div>`).join('')}
        </div>
      </div>
    </div>
  `;
  document.querySelector('[data-action="home"]').addEventListener('click', () => render());
}

function renderReminderView(patient) {
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar"><div class="brand">${t('reminders', state)}</div><button class="small-btn" data-action="home">${t('home', state)}</button></div>
      <div class="panel">
        ${state.reminders.filter((item) => item.patientId === patient.id).map((item) => `<div class="summary-card"><strong>${item.title}</strong><div>${item.time} • ${item.status}</div></div>`).join('') || '<p>No reminders yet.</p>'}
      </div>
    </div>
  `;
  document.querySelector('[data-action="home"]').addEventListener('click', () => render());
}

function renderMapView(patient) {
  const trackedRoom = state.locationSharing
    ? (state.rooms.find((room) => /Kitchen|Living|Garden/i.test(room.name)) || state.rooms[0])
    : null;

  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar"><div class="brand">${t('map', state)}</div><button class="small-btn" data-action="home">${t('home', state)}</button></div>
      <div class="panel map-panel">
        <div class="summary-card location-status">
          <div>
            <strong>Home Tracking</strong>
            <div>${state.locationSharing ? 'Location sharing is ON' : 'Location sharing is OFF'}</div>
          </div>
          <button class="primary-btn" id="toggle-location">${state.locationSharing ? 'Turn OFF' : 'Turn ON'}</button>
        </div>
        <div class="home-map-board">
          ${state.rooms.map((room) => `
            <div class="home-room ${trackedRoom && trackedRoom.id === room.id ? 'tracked' : ''}" style="grid-column:${room.x}; grid-row:${room.y};">
              ${trackedRoom && trackedRoom.id === room.id ? '<span class="live-tag">Live</span>' : ''}
              <strong>${room.name}</strong>
              <span>${room.x}, ${room.y}</span>
            </div>
          `).join('')}
        </div>
        <div class="track-summary">
          <strong>Current location:</strong> ${trackedRoom ? trackedRoom.name : 'Tracking paused'}
        </div>
      </div>
    </div>
  `;
  document.getElementById('toggle-location').addEventListener('click', () => {
    toggleLocationSharing(state, !state.locationSharing);
    render();
  });
  document.querySelector('[data-action="home"]').addEventListener('click', () => render());
}

function renderAssistantView(patient) {
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar"><div class="brand">${t('assistant', state)}</div><button class="small-btn" data-action="home">${t('home', state)}</button></div>
      <div class="panel">
        <input id="assistant-question" placeholder="${t('ask', state)}" />
        <button class="primary-btn" id="assistant-answer">${t('send', state)}</button>
        <div class="summary-card" id="assistant-output">${getAssistantReply('help', patient.name, state)}</div>
      </div>
    </div>
  `;
  document.getElementById('assistant-answer').addEventListener('click', () => {
    const input = document.getElementById('assistant-question');
    const output = document.getElementById('assistant-output');
    output.textContent = getAssistantReply(input.value, patient.name, state);
    speakText(output.textContent, state.language, state.settings.voiceOn);
  });
  document.querySelector('[data-action="home"]').addEventListener('click', () => render());
}

function renderProgressView(patient) {
  const report = generateReport(state, patient.id);
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar"><div class="brand">${t('progress', state)}</div><button class="small-btn" data-action="home">${t('home', state)}</button></div>
      <div class="panel">
        <h3>${t('report', state)}</h3>
        <div class="chart">
          ${report.chart.map((item) => `<div class="bar" style="height:${Math.max(item.value, 10)}%">${item.label}</div>`).join('')}
        </div>
        <div class="summary-grid">
          <div class="summary-card"><h4>Sessions</h4><p>${report.totals.sessions}</p></div>
          <div class="summary-card"><h4>Accuracy</h4><p>${report.totals.accuracy}%</p></div>
        </div>
      </div>
    </div>
  `;
  document.querySelector('[data-action="home"]').addEventListener('click', () => render());
}

function renderCaregiverDashboard(caregiver) {
  const patient = state.patients.find((entry) => entry.id === caregiver.patientId) || state.patients[0];
  const patientSessions = state.sessions.filter((item) => item.patientId === patient.id);
  const report = generateReport(state, patient.id);
  const insights = getAiInsights(state, patient.id);
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar">
        <div class="brand-wrap">
          <img src="logo.jpeg" alt="MEMOURA logo" class="brand-mark" />
          <div class="brand">MEMOURA Caregiver</div>
        </div>
        <div class="actions">
          <button class="small-btn" data-action="open-map">Map</button>
          <button class="small-btn" data-action="settings">Settings</button>
          <button class="small-btn" data-action="logout">Logout</button>
        </div>
      </div>
      <div class="screen">
        <div class="hero">
          <h2>Hello, ${caregiver.name}</h2>
          <p>Linked patient: ${patient.name}</p>
        </div>
        <div class="window">
          <div class="panel">
            <h3>${t('careProfile', state)}</h3>
            <p>Name: ${patient.name}</p>
            <p>Age: ${calculateAge(patient.dob)}</p>
            <p>State: ${patient.state}</p>
            <p>Language: ${patient.language}</p>
            <p>Stage: ${patient.stage}</p>
            <p>Recent mood: ${getRecentMood(patient.id)}</p>
          </div>
          <div class="panel">
            <h3>${t('reminderAdder', state)}</h3>
            <form id="reminder-form" class="form-grid">
              <div class="field full"><input name="title" placeholder="Title" required /></div>
              <div class="field"><input type="date" name="date" required /></div>
              <div class="field"><input type="time" name="time" required /></div>
              <div class="field"><select name="repeat"><option>none</option><option>daily</option><option>weekly</option></select></div>
              <div class="field full"><textarea name="note" placeholder="Note"></textarea></div>
              <div class="field full"><button class="primary-btn" type="submit">Save</button></div>
            </form>
          </div>
        </div>
        <div class="window">
          <div class="panel">
            <h3>${t('routineAdder', state)}</h3>
            <form id="routine-form" class="form-grid">
              <div class="field full"><input name="title" placeholder="Activity" required /></div>
              <div class="field"><input type="time" name="time" required /></div>
              <div class="field"><input name="days" placeholder="Mon, Tue" /></div>
              <div class="field full"><textarea name="note" placeholder="Notes"></textarea></div>
              <div class="field full"><button class="primary-btn" type="submit">Save</button></div>
            </form>
          </div>
          <div class="panel">
            <h3>${t('gameManagement', state)}</h3>
            <form id="game-pref-form" class="form-grid">
              <div class="field"><input name="favoriteFood" placeholder="Favorite food" /></div>
              <div class="field"><input name="familiarPlace" placeholder="Familiar place" /></div>
              <div class="field full"><button class="primary-btn" type="submit">Save</button></div>
            </form>
          </div>
        </div>
        <div class="window">
          <div class="panel">
            <h3>Jigsaw Image Manager</h3>
            <form id="image-form" class="form-grid">
              <div class="field full"><input type="text" name="title" placeholder="Image title" /></div>
              <div class="field full"><input type="file" name="image" accept="image/*" /></div>
              <div class="field full"><button class="primary-btn" type="submit">Upload</button></div>
            </form>
            <div class="summary-grid">
              ${state.images.filter((image) => image.patientId === patient.id && image.type !== 'memory-recall').map((image) => `<div class="summary-card"><img src="${image.src}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:12px" /><p>${image.title}</p></div>`).join('') || '<p>No images yet.</p>'}
            </div>
          </div>
          <div class="panel">
            <h3>Memory Recall Scene Manager</h3>
            <form id="memory-recall-form" class="form-grid">
              <div class="field full"><input type="text" name="title" placeholder="Scene title" /></div>
              <div class="field full"><textarea name="question" placeholder="Ask what happened in this moment" required></textarea></div>
              <div class="field"><input type="text" name="answer" placeholder="Correct answer" required /></div>
              <div class="field"><input type="text" name="option2" placeholder="Wrong choice 1" required /></div>
              <div class="field"><input type="text" name="option3" placeholder="Wrong choice 2" required /></div>
              <div class="field"><input type="text" name="option4" placeholder="Wrong choice 3" required /></div>
              <div class="field full"><input type="file" name="image" accept="image/*" required /></div>
              <div class="field full"><button class="primary-btn" type="submit">Add memory scene</button></div>
            </form>
            <div class="summary-grid">
              ${state.images.filter((image) => image.patientId === patient.id && image.type === 'memory-recall').map((image) => `<div class="summary-card"><img src="${image.src}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:12px" /><p>${image.title}</p><small>${image.memoryRecallQuestion}</small></div>`).join('') || '<p>No memory scenes yet.</p>'}
            </div>
          </div>
          <div class="panel">
            <h3>${t('patientMap', state)}</h3>
            <form id="room-form" class="form-grid">
              <div class="field full"><input name="room" placeholder="Add room e.g. Garden" /></div>
              <div class="field full"><button class="primary-btn" type="submit">Add room</button></div>
            </form>
            <div class="map-grid">
              ${state.rooms.map((room) => `<div class="room-card">${room.name}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="window">
          <div class="panel">
            <h3>${t('moodHistory', state)}</h3>
            <div class="summary-grid">
              ${state.moods.filter((item) => item.patientId === patient.id).slice(0, 5).map((mood) => `<div class="summary-card"><strong>${mood.mood}</strong><div>${new Date(mood.at).toLocaleDateString()}</div></div>`).join('')}
            </div>
          </div>
          <div class="panel">
            <h3>Activity history</h3>
            <div class="summary-grid">
              ${patientSessions.slice(0, 5).map((session) => `<div class="summary-card"><strong>${session.game}</strong><div>${session.accuracy}% • ${session.completionStatus}</div></div>`).join('')}
            </div>
          </div>
        </div>
        <div class="window">
          <div class="panel">
            <h3>${t('report', state)}</h3>
            <div class="chart">
              ${report.chart.map((item) => `<div class="bar" style="height:${Math.max(item.value, 10)}%">${item.label}</div>`).join('')}
            </div>
          </div>
          <div class="panel">
            <h3>${t('insight', state)}</h3>
            <ul>
              ${insights.map((item) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
  bindCaregiverActions(caregiver, patient);
}

function bindCaregiverActions(caregiver, patient) {
  document.querySelector('[data-action="open-map"]').addEventListener('click', () => renderMapView(patient));
  document.querySelector('[data-action="settings"]').addEventListener('click', () => openSettingsModal());
  document.querySelector('[data-action="logout"]').addEventListener('click', () => {
    state.currentRole = null;
    state.currentUserId = null;
    saveStore(state);
    render();
  });

  document.getElementById('reminder-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    addReminder(state, {
      patientId: patient.id,
      title: formData.get('title'),
      date: formData.get('date'),
      time: formData.get('time'),
      repeat: formData.get('repeat'),
      note: formData.get('note'),
      status: 'pending',
    });
    render();
  });

  document.getElementById('routine-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    addRoutine(state, {
      patientId: patient.id,
      title: formData.get('title'),
      time: formData.get('time'),
      days: (formData.get('days') || 'Mon, Tue').split(',').map((day) => day.trim()),
      notes: formData.get('note'),
      repeat: 'weekly',
    });
    render();
  });

  document.getElementById('game-pref-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    state.gamePreferences.favoriteFoods = [...(state.gamePreferences.favoriteFoods || []), formData.get('favoriteFood')].filter(Boolean);
    state.gamePreferences.familiarContent = [...(state.gamePreferences.familiarContent || []), formData.get('familiarPlace')].filter(Boolean);
    saveStore(state);
    render();
  });

  document.getElementById('image-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('image');
    if (!file || !file.name) return;
    const reader = new FileReader();
    reader.onload = () => {
      addJigsawImage(state, patient.id, reader.result, formData.get('title') || 'Patient image');
      render();
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('memory-recall-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('image');
    if (!file || !file.name) return;
    const question = formData.get('question')?.toString().trim();
    const answer = formData.get('answer')?.toString().trim();
    const options = [
      formData.get('answer')?.toString().trim(),
      formData.get('option2')?.toString().trim(),
      formData.get('option3')?.toString().trim(),
      formData.get('option4')?.toString().trim(),
    ].filter(Boolean);
    if (!question || !answer || options.length < 4) {
      showToast('Please add the question and four answer choices.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      addMemoryRecallImage(state, patient.id, reader.result, {
        title: formData.get('title') || 'Memory scene',
        question,
        answer,
        options,
      });
      render();
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('room-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    addRoom(state, formData.get('room'));
    render();
  });
}

function getTodaysReminder(patientId) {
  const now = new Date();
  return state.reminders.find((item) => item.patientId === patientId && item.status === 'pending' && item.date === now.toISOString().slice(0, 10));
}

function calculateAge(dob) {
  if (!dob) return 'Unknown';
  const birth = new Date(dob);
  const diff = new Date() - birth;
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function getRecentMood(patientId) {
  const last = state.moods.filter((item) => item.patientId === patientId).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  if (!last) return 'No recent mood';
  return moodLabel(last.mood, state);
}

function buildMemoryRecallSceneList(patientId) {
  const uploaded = (state.images || []).filter((image) => image.patientId === patientId && image.type === 'memory-recall');
  const scenes = uploaded.length
    ? uploaded.map((image) => ({
        q: image.memoryRecallQuestion || 'What happened during this moment?',
        options: Array.isArray(image.memoryRecallOptions) && image.memoryRecallOptions.length ? image.memoryRecallOptions : [image.memoryRecallAnswer || 'Family time', 'Tea break', 'Garden walk', 'Quiet rest'],
        answer: image.memoryRecallAnswer || 'Family time',
        image: image.src,
      }))
    : [
        { q: 'What do you usually do at home in this moment?', options: ['Have tea with family', 'Go to work', 'Visit the market', 'Ride a bus'], answer: 'Have tea with family', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80' },
        { q: 'What do you enjoy doing in the garden?', options: ['Watering plants and sitting in the shade', 'Driving to the office', 'Buying groceries', 'Watching TV indoors'], answer: 'Watering plants and sitting in the shade', image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80' },
        { q: 'Who usually goes with you to the temple?', options: ['My family and friends', 'Only strangers', 'Only my teacher', 'No one'], answer: 'My family and friends', image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80' },
        { q: 'What do you usually do at this place with your family?', options: ['Share food and talk together', 'Run to the office', 'Take a long train ride', 'Work in a shop'], answer: 'Share food and talk together', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80' },
        { q: 'What happens here when you visit this place?', options: ['We spend time together and feel calm', 'We rush to catch a flight', 'We clean the whole town', 'We go to school'], answer: 'We spend time together and feel calm', image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80' }
      ];

  return scenes.slice(0, 5);
}

function getSandwichIngredientOptions() {
  return [
    { name: 'Bread', emoji: '🍞', color: '#d3a672', short: 'B' },
    { name: 'Lettuce', emoji: '🥬', color: '#94c76e', short: 'L' },
    { name: 'Tomato', emoji: '🍅', color: '#df6765', short: 'T' },
    { name: 'Cheese', emoji: '🧀', color: '#f1d170', short: 'C' },
    { name: 'Cucumber', emoji: '🥒', color: '#7bc69a', short: 'U' },
    { name: 'Egg', emoji: '🥚', color: '#f7d1a0', short: 'E' },
    { name: 'Turkey', emoji: '🍗', color: '#c98b5b', short: 'K' },
    { name: 'Jam', emoji: '🍓', color: '#d68ab4', short: 'J' },
  ];
}

function getSandwichDifficultyConfig(level = sandwichGameState.difficulty) {
  const configMap = {
    Easy: { ingredients: 3, viewingTime: 8500, hints: 3 },
    Medium: { ingredients: 4, viewingTime: 6500, hints: 2 },
    Hard: { ingredients: 5, viewingTime: 5000, hints: 1 },
  };
  return configMap[level] || configMap.Easy;
}

function buildTargetSandwich(level = sandwichGameState.difficulty) {
  const options = getSandwichIngredientOptions();
  const config = getSandwichDifficultyConfig(level);
  const chosen = [];
  const seen = new Set();

  while (chosen.length < config.ingredients) {
    const pick = options[Math.floor(Math.random() * options.length)];
    if (seen.has(pick.name)) continue;
    seen.add(pick.name);
    chosen.push(pick.name);
  }

  return chosen;
}

function openGameModal(name) {
  currentGame = name === 'Build the Dish' ? 'Make My Sandwich' : name;
  jigsawState = { placed: [], draggedPiece: null };
  burgerSelection = [];

  if (currentGame === 'Make My Sandwich') {
    sandwichGameState = {
      difficulty: 'Easy',
      target: buildTargetSandwich('Easy'),
      selection: [],
      feedback: 'Look closely and remember the sandwich order.',
      previewing: true,
      viewingTime: 8500,
      hintsUsed: 0,
      maxHints: 3,
      hintedIngredient: null,
      score: 0,
      completed: false,
      consecutiveWins: 0,
      consecutiveMistakes: 0,
      round: 1,
    };
    const config = getSandwichDifficultyConfig(sandwichGameState.difficulty);
    sandwichGameState.target = buildTargetSandwich(sandwichGameState.difficulty);
    sandwichGameState.viewingTime = config.viewingTime;
    sandwichGameState.maxHints = config.hints;
    renderGameModal();
    setTimeout(() => {
      if (currentGame === 'Make My Sandwich') {
        sandwichGameState.previewing = false;
        sandwichGameState.feedback = 'Now build it from memory.';
        renderGameModal();
      }
    }, sandwichGameState.viewingTime);
    return;
  }

  if (name === 'Memory Recall') {
    const patientId = state.currentUserId || state.patients[0]?.id;
    const questions = buildMemoryRecallSceneList(patientId);
    currentRecallQuestions = questions;
    currentRecallIndex = 0;
    activeQuestion = questions[0];
    renderGameModal();
    return;
  }
  if (name === 'Sequence Recall') {
    sequenceState = {
      ...sequenceState,
      phase: 'intro',
      level: Math.min(5, Math.max(1, sequenceState.level || 1)),
      cards: [],
      pattern: [],
      recallCards: [],
      selection: [],
      memorizeTime: 7000,
      countdown: 0,
      startedAt: 0,
      result: null,
      loopId: null,
    };
    renderGameModal();
    return;
  }
  if (name === 'Tea Leaf Sorting') {
    playTeaSortingMusic();
  }
  if (name === 'Ludo') {
    initializeLudoGame();
  }
  renderGameModal();
}

function renderGameModal() {
  const existing = document.getElementById('game-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = `game-modal show ${currentGame === 'Make My Sandwich' ? 'sandwich-game' : ''}`.trim();
  modal.id = 'game-modal';
  modal.innerHTML = `
    <div class="modal-card ${currentGame === 'Make My Sandwich' ? 'sandwich-modal-card' : ''}">
      <div class="topbar game-modal-header ${currentGame === 'Make My Sandwich' ? 'hidden' : ''}">
        <h3>${currentGame}</h3>
        <button class="danger-btn" data-game-close="exit">${t('exit', state)}</button>
      </div>
      ${currentGame === 'Memory Recall' ? renderRecallGame() : ''}
      ${currentGame === 'Memory Jigsaw' ? renderJigsawGame() : ''}
      ${currentGame === 'Tea Leaf Sorting' ? renderTeaGame() : ''}
      ${currentGame === 'Make My Sandwich' ? renderDishGame() : ''}
      ${currentGame === 'Sequence Recall' ? renderSequenceGame() : ''}
      ${currentGame === 'Ludo' ? renderLudoGame() : ''}
    </div>
  `;
  document.body.appendChild(modal);
  attachGameEvents();
}

function renderRecallGame() {
  const question = activeQuestion || getRecallQuestion('Mixed');
  return `
    <div class="game-panel">
      ${question.image ? `<div class="memory-recall-image"><img src="${question.image}" alt="Memory prompt" /></div>` : ''}
      <p class="prompt-text">${question.q}</p>
      <div class="answer-btn-group">
        ${question.options.map((option) => `<button class="answer-btn" data-answer="${option}">${option}</button>`).join('')}
      </div>
      <p class="mini-note">Question ${currentRecallIndex + 1} of ${currentRecallQuestions.length || 1}</p>
    </div>
  `;
}

function getJigsawPiecePosition(pieceId) {
  const positions = {
    1: '0% 0%',
    2: '50% 0%',
    3: '100% 0%',
    4: '0% 100%',
    5: '50% 100%',
    6: '100% 100%',
  };
  return positions[pieceId] || '0% 0%';
}

function renderJigsawGame() {
  const image = state.images[0]?.src || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80';
  const pieces = [1, 2, 3, 4, 5, 6];
  const shuffledPieces = [...pieces].sort(() => Math.random() - 0.5);
  const placed = jigsawState.placed || [];
  return `
    <div class="game-panel">
      <div class="jigsaw-preview">
        <strong>Reference image</strong>
        <img src="${image}" alt="Puzzle preview" />
      </div>
      <div class="jigsaw-board" style="grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0;">
        ${pieces.map((piece) => `
          <div class="puzzle-slot ${placed.includes(piece) ? 'filled' : ''} piece-${piece}" data-slot="${piece}">
            ${placed.includes(piece) ? `<div class="puzzle-piece piece-${piece} placed" data-piece="${piece}" style="background-image:url('${image}'); background-size:300% 200%; background-repeat:no-repeat; background-position:${getJigsawPiecePosition(piece)}"></div>` : `<span>Drop piece ${piece}</span>`}
          </div>
        `).join('')}
      </div>
      <div class="jigsaw-piece-bank" style="grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
        ${shuffledPieces.map((piece) => `
          <button
            class="jigsaw-piece-card ${placed.includes(piece) ? 'placed' : ''} piece-${piece}"
            draggable="${placed.includes(piece) ? 'false' : 'true'}"
            data-jigsaw-piece="${piece}"
            style="background-image:url('${image}'); background-size:300% 200%; background-repeat:no-repeat; background-position:${getJigsawPiecePosition(piece)}; border-radius: 10px;"
            ${placed.includes(piece) ? 'disabled' : ''}
          ></button>
        `).join('')}
      </div>
      <p id="jigsaw-status">Drag each piece into the matching frame to rebuild the picture.</p>
    </div>
  `;
}

function renderTeaGame() {
  const leaves = [
    { type: 'green', id: 'g1', rotation: -28, offsetX: '-46px', offsetY: '20px', size: 82 },
    { type: 'green', id: 'g2', rotation: 34, offsetX: '6px', offsetY: '-18px', size: 96 },
    { type: 'green', id: 'g3', rotation: -12, offsetX: '-18px', offsetY: '14px', size: 88 },
    { type: 'green', id: 'g4', rotation: 22, offsetX: '34px', offsetY: '28px', size: 90 },
    { type: 'green', id: 'g5', rotation: -36, offsetX: '22px', offsetY: '-12px', size: 84 },
    { type: 'green', id: 'g6', rotation: 18, offsetX: '-30px', offsetY: '-20px', size: 98 },
    { type: 'green', id: 'g7', rotation: -44, offsetX: '40px', offsetY: '-24px', size: 80 },
    { type: 'green', id: 'g8', rotation: 40, offsetX: '-8px', offsetY: '26px', size: 92 },
    { type: 'brown', id: 'b1', rotation: 26, offsetX: '24px', offsetY: '18px', size: 88 },
    { type: 'brown', id: 'b2', rotation: -18, offsetX: '-38px', offsetY: '-6px', size: 96 },
    { type: 'brown', id: 'b3', rotation: 44, offsetX: '18px', offsetY: '-14px', size: 84 },
    { type: 'brown', id: 'b4', rotation: -32, offsetX: '10px', offsetY: '32px', size: 90 },
    { type: 'brown', id: 'b5', rotation: 14, offsetX: '-24px', offsetY: '22px', size: 92 },
    { type: 'brown', id: 'b6', rotation: -40, offsetX: '42px', offsetY: '12px', size: 86 },
    { type: 'brown', id: 'b7', rotation: 30, offsetX: '-16px', offsetY: '-22px', size: 94 },
    { type: 'brown', id: 'b8', rotation: -16, offsetX: '36px', offsetY: '-18px', size: 82 },
  ];

  return `
    <div class="game-panel tea-sort-panel">
      <div class="leaf-sort-scene">
        <div class="leaf-baskets">
          <div class="leaf-basket good-zone" data-target="good">
            <div class="basket-handle"></div>
            <div class="basket-body">
              <span class="basket-label">Good</span>
            </div>
          </div>
          <div class="leaf-basket bad-zone" data-target="bad">
            <div class="basket-handle"></div>
            <div class="basket-body">
              <span class="basket-label">Bad</span>
            </div>
          </div>
        </div>

        <div class="leaf-sort-bank">
          ${leaves.map((leaf) => `
            <div
              class="leaf-token ${leaf.type === 'green' ? 'green-leaf' : 'brown-leaf'}"
              draggable="true"
              data-leaf-type="${leaf.type}"
              data-leaf-id="${leaf.id}"
              style="--rotation:${leaf.rotation}deg; --offset-x:${leaf.offsetX}; --offset-y:${leaf.offsetY}; --leaf-size:${leaf.size}px;"
              aria-label="${leaf.type === 'green' ? 'Green leaf' : 'Brown leaf'}"
            ></div>
          `).join('')}
        </div>
      </div>
      <p class="prompt-text">Drag the green leaves into the Good basket and the brown leaves into the Bad basket.</p>
    </div>
  `;
}

function renderSandwichStack(parts, includeLabel = false) {
  const stack = parts && parts.length ? parts : ['Bread'];
  const ingredientMap = Object.fromEntries(getSandwichIngredientOptions().map((ingredient) => [ingredient.name, ingredient]));

  return `
    <div class="sandwich-stack ${includeLabel ? 'target-stack' : 'player-stack'}">
      <div class="bread top-bread">🍞</div>
      ${stack.map((part) => {
        const item = ingredientMap[part] || { name: part, emoji: '🧩', color: '#d8d9df' };
        return `<div class="sandwich-layer" style="background:${item.color}">${item.emoji} ${part}</div>`;
      }).join('')}
      <div class="bread bottom-bread">🍞</div>
    </div>
  `;
}

function renderDishGame() {
  const ingredientOptions = getSandwichIngredientOptions();
  const selection = sandwichGameState.selection || [];
  const target = sandwichGameState.target || [];
  const previewing = Boolean(sandwichGameState.previewing);
  const score = sandwichGameState.score || 0;
  const hintCount = sandwichGameState.hintsUsed || 0;
  const availableHints = Math.max(0, (sandwichGameState.maxHints || 0) - hintCount);

  return `
    <div class="sandwich-scene">
      <div class="sandwich-topbar">
        <button class="sandwich-nav active" type="button" data-sandwich-action="games">GAMES</button>
        <button class="sandwich-nav" type="button" data-sandwich-action="hints">HINTS (${availableHints})</button>
        <button class="sandwich-nav" type="button" data-sandwich-action="routines">ROUTINES</button>
      </div>

      <div class="sandwich-status-row">
        <div class="status-pill">Score: ${score}</div>
        <div class="status-pill">${sandwichGameState.difficulty}</div>
        <div class="status-pill">Round ${sandwichGameState.round}</div>
      </div>

      <div class="sandwich-panel-grid">
        <div class="sandwich-panel ${previewing ? 'preview' : 'memory'}">
          <div class="panel-title">Target Sandwich</div>
          ${previewing ? renderSandwichStack(target, true) : '<div class="memory-veil">Remember the sandwich and build it.</div>'}
        </div>

        <div class="sandwich-panel assembly-panel">
          <div class="panel-title">Sandwich Assembly</div>
          ${renderSandwichStack(selection, false)}
        </div>
      </div>

      ${sandwichGameState.completed ? `
        <div class="sandwich-comparison">
          <div class="compare-box">
            <div class="panel-title">Original</div>
            ${renderSandwichStack(target, true)}
          </div>
          <div class="compare-box">
            <div class="panel-title">Your Sandwich</div>
            ${renderSandwichStack(selection, false)}
          </div>
        </div>
      ` : ''}

      <div class="sandwich-feedback ${sandwichGameState.feedback.includes('Great') ? 'success' : sandwichGameState.feedback.includes('Almost') ? 'warning' : ''}">
        ${sandwichGameState.feedback}
      </div>

      <div class="sandwich-controls">
        <button class="sandwich-action secondary" type="button" data-sandwich-action="clear">Clear</button>
        <button class="sandwich-action secondary" type="button" data-sandwich-action="remove">Remove</button>
        ${sandwichGameState.completed ? '<button class="sandwich-action primary" type="button" data-sandwich-action="next-round">Next Round</button>' : '<button class="sandwich-action primary" type="button" data-sandwich-action="check">Check</button>'}
      </div>

      <div class="ingredient-bank-hint">Swipe for more ingredients →</div>
      <div class="ingredient-bank">
        ${ingredientOptions.map((ingredient) => `
          <button class="ingredient-card ${sandwichGameState.hintedIngredient === ingredient.name ? 'hinted' : ''}" data-ingredient="${ingredient.name}" type="button" ${previewing ? 'disabled' : ''}>
            <span class="ingredient-emoji" style="background:${ingredient.color}">${ingredient.emoji}</span>
            <span>${ingredient.name}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function getSequenceCardById(cardId) {
  return sequenceState.cards.find((card) => card.key === cardId) || null;
}

function startSequenceRound() {
  const round = createSequenceRound(sequenceState.level);
  sequenceState.cards = round.cards;
  sequenceState.pattern = round.pattern;
  sequenceState.recallCards = round.recallCards;
  sequenceState.selection = [];
  sequenceState.phase = 'memorize';
  sequenceState.memorizeTime = round.config.memorizeMs;
  sequenceState.startedAt = Date.now();
  sequenceState.countdown = Math.ceil(round.config.memorizeMs / 1000);
  sequenceState.result = null;

  if (sequenceState.loopId) {
    clearInterval(sequenceState.loopId);
  }

  sequenceState.loopId = setInterval(() => {
    if (sequenceState.phase !== 'memorize') return;

    const elapsed = Date.now() - sequenceState.startedAt;
    const remaining = Math.max(0, sequenceState.memorizeTime - elapsed);
    const nextCountdown = Math.ceil(remaining / 1000);

    if (nextCountdown !== sequenceState.countdown) {
      sequenceState.countdown = nextCountdown;
      renderGameModal();
    }

    if (remaining <= 0) {
      sequenceState.phase = 'recall';
      sequenceState.countdown = 0;
      clearInterval(sequenceState.loopId);
      sequenceState.loopId = null;
      renderGameModal();
    }
  }, 200);

  renderGameModal();
}

function renderSequenceGame() {
  if (sequenceState.phase === 'intro') {
    return `
      <div class="game-panel sequence-panel">
        <div class="sequence-banner">
          <span class="sequence-badge">Memory game</span>
          <h3>Memory Sequence</h3>
        </div>
        <p class="prompt-text">Remember the cards in the exact order shown.</p>
        <div class="sequence-demo-grid">
          ${['☀️', '🌿', '⭐', '🔔'].slice(0, Math.min(4, sequenceState.level || 1)).map((symbol) => `<div class="sequence-demo-card">${symbol}</div>`).join('')}
        </div>
        <button class="primary-btn" id="start-sequence" type="button">Start Game</button>
      </div>
    `;
  }

  if (sequenceState.phase === 'memorize') {
    return `
      <div class="game-panel sequence-panel">
        <div class="sequence-header">
          <strong>Level ${sequenceState.level}</strong>
          <span class="countdown-pill">${sequenceState.countdown}s</span>
        </div>
        <p class="prompt-text">Watch carefully. Remember the cards in order.</p>
        <div class="sequence-card-row">
          ${sequenceState.cards.map((card) => `
            <div class="sequence-memory-card" type="button">
              <span class="sequence-card-icon">${card.label}</span>
              <small>${card.name}</small>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (sequenceState.phase === 'result') {
    const result = sequenceState.result || { score: 0, correct: 0, timeTaken: 0, accuracy: 0 };
    const playerSequence = sequenceState.selection.map((cardId) => getSequenceCardById(cardId)?.label || '?').join(' • ') || 'No cards selected';
    const correctSequence = sequenceState.pattern.map((cardId) => getSequenceCardById(cardId)?.label || '?').join(' • ');

    return `
      <div class="game-panel sequence-panel">
        <div class="sequence-banner">
          <span class="sequence-badge ${result.isCorrect ? 'success' : ''}">${result.isCorrect ? 'Excellent!' : 'Good try!'}</span>
          <h3>${result.isCorrect ? 'Excellent memory!' : 'Good try! Let’s try again.'}</h3>
        </div>
        <div class="sequence-result-grid">
          <div class="sequence-result-card">
            <strong>Score</strong>
            <div class="sequence-score-value">${result.score}</div>
          </div>
          <div class="sequence-result-card">
            <strong>Time</strong>
            <div class="sequence-score-value">${result.timeTaken.toFixed(1)}s</div>
          </div>
        </div>
        <div class="sequence-result-card">
          <strong>Your sequence</strong>
          <p>${playerSequence}</p>
        </div>
        <div class="sequence-result-card">
          <strong>Correct sequence</strong>
          <p>${correctSequence}</p>
        </div>
        <div class="sequence-result-card">
          <strong>Result</strong>
          <p>${result.correct} / ${sequenceState.pattern.length} correct • ${result.accuracy}% accuracy</p>
        </div>
        <div class="sequence-buttons">
          <button class="primary-btn" type="button" data-sequence-action="next-round">Next Round</button>
        </div>
      </div>
    `;
  }

  const canSubmit = sequenceState.selection.length === sequenceState.pattern.length;
  const selectedCards = sequenceState.selection.length
    ? sequenceState.selection.map((cardId, index) => {
        const card = getSequenceCardById(cardId);
        return `
          <div class="sequence-answer-item">
            <span class="sequence-answer-number">${index + 1}</span>
            <span>${card ? card.label : '?'}</span>
          </div>
        `;
      }).join('')
    : '<span class="sequence-empty">Your answer will show here</span>';

  return `
    <div class="game-panel sequence-panel">
      <div class="sequence-header">
        <strong>Level ${sequenceState.level}</strong>
        <span class="sequence-best">Best: ${sequenceState.bestScore}</span>
      </div>
      <p class="prompt-text">Select the cards in the same order you saw them.</p>
      <div class="sequence-answer-track">${selectedCards}</div>
      <div class="sequence-buttons">
        <button class="small-btn" type="button" data-sequence-action="undo">Undo</button>
        <button class="small-btn" type="button" data-sequence-action="reset">Reset</button>
        <button class="primary-btn" type="button" data-sequence-action="submit" ${canSubmit ? '' : 'disabled'}>Submit Answer</button>
      </div>
      <div class="sequence-card-grid">
        ${sequenceState.recallCards.map((card) => {
          const isSelected = sequenceState.selection.includes(card.key);
          return `
            <button class="sequence-choice-card ${isSelected ? 'selected' : ''}" type="button" data-sequence-card="${card.key}" ${isSelected ? 'disabled' : ''}>
              <span class="sequence-card-icon">${card.label}</span>
              <small>${card.name}</small>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

const LUDO_PATH = [
  [6, 1], [6, 2], [6, 3], [6, 4], [5, 4], [4, 4], [3, 4], [2, 4], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8],
  [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [6, 9], [6, 10], [6, 11], [6, 12], [7, 12], [8, 12], [9, 12], [10, 12],
  [10, 11], [10, 10], [10, 9], [10, 8], [11, 8], [12, 8], [13, 8], [13, 7], [13, 6], [13, 5], [13, 4], [12, 4],
  [11, 4], [10, 4], [10, 3], [10, 2], [10, 1], [9, 1], [8, 1], [7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8]
];
const LUDO_START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };
const LUDO_SAFE_POSITIONS = new Set([
  '6,1', '6,8', '6,12', '10,8', '13,8', '13,4', '10,4', '7,1', '7,8', '7,12', '7,4', '10,12', '1,4', '13,6'
]);
const LUDO_HOME_ZONES = {
  red: [[1, 1], [1, 2], [2, 1], [2, 2]],
  green: [[1, 12], [1, 13], [2, 12], [2, 13]],
  yellow: [[12, 1], [12, 2], [13, 1], [13, 2]],
  blue: [[12, 12], [12, 13], [13, 12], [13, 13]],
};
const LUDO_HOME_LANES = {
  red: [[6, 7], [6, 8], [6, 9], [6, 10], [6, 11], [6, 12]],
  green: [[7, 8], [8, 8], [9, 8], [10, 8], [11, 8], [12, 8]],
  yellow: [[8, 6], [8, 7], [8, 8], [8, 9], [8, 10], [8, 11]],
  blue: [[7, 6], [7, 7], [7, 8], [7, 9], [7, 10], [7, 11]],
};
const LUDO_CENTER = [7, 7];

function getLudoTokenKey(player, tokenIndex) {
  return `${player.color}-${tokenIndex}`;
}

function getLudoTokenPosition(player, tokenIndex) {
  const token = player.tokens[tokenIndex];
  const progress = token.progress;
  if (progress === -1) {
    return LUDO_HOME_ZONES[player.color][tokenIndex];
  }
  if (progress < 52) {
    const boardIndex = (LUDO_START_OFFSETS[player.color] + progress) % LUDO_PATH.length;
    return LUDO_PATH[boardIndex];
  }
  if (progress < 58) {
    return LUDO_HOME_LANES[player.color][progress - 52] || LUDO_CENTER;
  }
  return LUDO_CENTER;
}

function getLudoBoardKey(position) {
  return `${position[0]},${position[1]}`;
}

function getLudoPlayerByIndex(index) {
  return ludoState.players[index];
}

function getLudoReadablePlayerTurn() {
  const player = getLudoPlayerByIndex(ludoState.currentTurn);
  return player ? player.isHuman ? 'Your turn' : `${player.name}'s turn` : 'Game ready';
}

function cloneLudoState() {
  return JSON.parse(JSON.stringify(ludoState));
}

function getLudoLegalMoves(player, roll) {
  const moves = [];
  player.tokens.forEach((token, tokenIndex) => {
    if (token.progress >= 57) return;
    if (token.progress === -1) {
      if (roll === 1 || roll === 6) {
        moves.push({ tokenIndex, from: -1, to: 0, start: true });
      }
      return;
    }
    const nextProgress = token.progress + roll;
    if (nextProgress <= 57) {
      moves.push({ tokenIndex, from: token.progress, to: nextProgress, start: false });
    }
  });
  return moves;
}

function ludoPlaySound(type) {
  if (!ludoState.soundOn || typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const audioCtx = new AudioCtx();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type === 'capture' ? 'sawtooth' : type === 'win' ? 'triangle' : 'sine';
  const frequencyMap = { roll: 220, move: 330, capture: 480, win: 620, button: 170 };
  oscillator.frequency.value = frequencyMap[type] || 260;
  gain.gain.value = 0.04;
  oscillator.connect(gain).connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.18);
  setTimeout(() => audioCtx.close(), 220);
}

function ludoCheckWinner() {
  const winner = ludoState.players.find((player) => player.tokens.every((token) => token.progress >= 57));
  if (!winner) return null;
  ludoState.gameOver = true;
  ludoState.winner = winner;
  ludoState.message = winner.isHuman ? '🎉 YOU WIN! 🎉' : `${winner.name} wins!`;
  ludoState.score += winner.isHuman ? 300 : 0;
  ludoState.legalMoves = [];
  ludoPlaySound('win');
  if (winner.isHuman) {
    celebrateWin('Amazing! You won the game!');
  } else {
    showToast(`${winner.name} wins!`);
  }
  return winner;
}

function ludoApplyCapture(player, tokenIndex) {
  const playerInfo = ludoState.players[player];
  const token = playerInfo.tokens[tokenIndex];
  if (token.progress < 0 || token.progress >= 52) return 0;

  const landingKey = getLudoBoardKey(getLudoTokenPosition(playerInfo, tokenIndex));
  let captures = 0;
  ludoState.players.forEach((opponent, opponentIndex) => {
    if (opponentIndex === player) return;
    opponent.tokens.forEach((opponentToken, opponentTokenIndex) => {
      if (opponentToken.progress < 0 || opponentToken.progress >= 52) return;
      const opponentKey = getLudoBoardKey(getLudoTokenPosition(opponent, opponentTokenIndex));
      if (opponentKey === landingKey && !LUDO_SAFE_POSITIONS.has(landingKey)) {
        opponent.tokens[opponentTokenIndex].progress = -1;
        captures += 1;
        ludoState.score += 50;
        ludoPlaySound('capture');
      }
    });
  });
  return captures;
}

function executeLudoMove(playerIndex, tokenIndex, roll) {
  const player = ludoState.players[playerIndex];
  const token = player.tokens[tokenIndex];
  const previousProgress = token.progress;
  if (token.progress === -1) {
    token.progress = 0;
  } else {
    token.progress += roll;
  }

  if (token.progress > 57) {
    token.progress = 57;
  }

  const captures = ludoApplyCapture(playerIndex, tokenIndex);
  if (captures > 0) {
    ludoState.message = `${player.name} captured an opponent!`;
  } else if (previousProgress === -1) {
    ludoState.message = `${player.name} moved a token out of home.`;
  } else if (token.progress >= 57) {
    ludoState.message = `${player.name} brought a token home!`;
    ludoState.score += 100;
  } else {
    ludoState.message = `${player.name} moved a token.`;
    ludoState.score += 10;
  }
  ludoPlaySound(captures > 0 ? 'capture' : 'move');

  if (token.progress >= 57) {
    const completed = player.tokens.filter((entry) => entry.progress >= 57).length;
    if (completed === 4) {
      ludoCheckWinner();
      return true;
    }
  }

  return true;
}

function chooseLudoAiMove(player, legalMoves, roll) {
  const strategy = player.name.includes('Green') ? 'easy' : player.name.includes('Yellow') ? 'medium' : 'hard';
  if (strategy === 'easy') {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const captureMoves = legalMoves.filter((move) => {
    const testPlayer = JSON.parse(JSON.stringify(ludoState.players));
    const activePlayer = testPlayer[ludoState.currentTurn];
    const token = activePlayer.tokens[move.tokenIndex];
    const nextProgress = token.progress === -1 ? 0 : token.progress + roll;
    if (nextProgress >= 58) return false;
    const landingPosition = nextProgress < 52
      ? LUDO_PATH[(LUDO_START_OFFSETS[activePlayer.color] + nextProgress) % LUDO_PATH.length]
      : LUDO_HOME_LANES[activePlayer.color][nextProgress - 52] || LUDO_CENTER;
    const landingKey = getLudoBoardKey(landingPosition);
    return ludoState.players.some((opponent, index) => {
      if (index === ludoState.currentTurn) return false;
      return opponent.tokens.some((opponentToken) => {
        if (opponentToken.progress < 0 || opponentToken.progress >= 52) return false;
        const oppKey = getLudoBoardKey(getLudoTokenPosition(opponent, opponent.tokens.indexOf(opponentToken)));
        return oppKey === landingKey && !LUDO_SAFE_POSITIONS.has(landingKey);
      });
    });
  });

  if (strategy === 'medium' && captureMoves.length) {
    return captureMoves[0];
  }

  const progressed = legalMoves.slice().sort((a, b) => {
    const aToken = player.tokens[a.tokenIndex];
    const bToken = player.tokens[b.tokenIndex];
    const aProgress = aToken.progress === -1 ? 0 : aToken.progress + roll;
    const bProgress = bToken.progress === -1 ? 0 : bToken.progress + roll;
    return bProgress - aProgress;
  });

  if (strategy === 'hard') {
    return progressed[0];
  }

  return progressed[0] || legalMoves[0];
}

function getLudoBoardState() {
  const board = Array.from({ length: 15 }, () => Array.from({ length: 15 }, () => ({ type: 'empty', tokens: [] })));
  const tokenMap = new Map();

  ludoState.players.forEach((player) => {
    player.tokens.forEach((token, tokenIndex) => {
      const position = getLudoTokenPosition(player, tokenIndex);
      const key = getLudoBoardKey(position);
      if (!tokenMap.has(key)) tokenMap.set(key, []);
      tokenMap.get(key).push({ player, tokenIndex, token });
    });
  });

  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const key = `${row},${col}`;
      let cellType = 'empty';
      if (row >= 1 && row <= 5 && col >= 1 && col <= 5) cellType = 'red-home';
      if (row >= 1 && row <= 5 && col >= 9 && col <= 13) cellType = 'green-home';
      if (row >= 9 && row <= 13 && col >= 1 && col <= 5) cellType = 'yellow-home';
      if (row >= 9 && row <= 13 && col >= 9 && col <= 13) cellType = 'blue-home';
      if (key === '7,7') cellType = 'center';
      if (LUDO_PATH.some(([pathRow, pathCol]) => pathRow === row && pathCol === col)) cellType = 'path';
      board[row][col] = { type: cellType, tokens: tokenMap.get(key) || [] };
    }
  }

  return board;
}

function ludoAdvanceTurn() {
  if (ludoState.gameOver) return;
  ludoState.currentTurn = (ludoState.currentTurn + 1) % ludoState.players.length;
  ludoState.legalMoves = [];
  ludoState.message = ludoState.players[ludoState.currentTurn].isHuman
    ? 'Your turn. Roll the dice!'
    : `${ludoState.players[ludoState.currentTurn].name} is rolling...`;
  ludoState.aiRunning = false;
  ludoState.rolling = false;
  renderGameModal();
}

function initializeLudoGame() {
  ludoState = {
    players: [
      { id: 'human', name: 'You', color: 'red', isHuman: true, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
      { id: 'ai-green', name: 'AI Green', color: 'green', isHuman: false, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
      { id: 'ai-yellow', name: 'AI Yellow', color: 'yellow', isHuman: false, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
      { id: 'ai-blue', name: 'AI Blue', color: 'blue', isHuman: false, tokens: [{ progress: -1 }, { progress: -1 }, { progress: -1 }, { progress: -1 }] },
    ],
    currentTurn: 0,
    dice: 1,
    lastRoll: null,
    legalMoves: [],
    soundOn: true,
    score: 0,
    turns: 0,
    gameOver: false,
    winner: null,
    message: 'Your turn. Roll the dice!',
    aiRunning: false,
    rolling: false,
  };
}

function renderLudoGame() {
  const board = getLudoBoardState();
  const currentPlayer = ludoState.players[ludoState.currentTurn];
  const humanPlayer = ludoState.players[0];
  const humanCompleted = humanPlayer.tokens.filter((token) => token.progress >= 57).length;

  const scoreboard = ludoState.players.map((player) => {
    const completed = player.tokens.filter((token) => token.progress >= 57).length;
    const active = player.tokens.filter((token) => token.progress >= 0 && token.progress < 57).length;
    return `
      <div class="ludo-player-card ${ludoState.currentTurn === ludoState.players.indexOf(player) ? 'active' : ''} ${player.color}">
        <div class="ludo-player-header">
          <span class="ludo-player-dot" style="background:${player.color};"></span>
          <strong>${player.name}</strong>
        </div>
        <small>${completed}/4 home • ${active} active</small>
      </div>
    `;
  }).join('');

  return `
    <div class="game-panel ludo-panel traditional-ludo-panel">
      <div class="ludo-topbar">
        <div>
          <div class="ludo-title">Memory Ludo</div>
          <div class="ludo-turn">${currentPlayer.isHuman ? 'Your Turn' : `${currentPlayer.name}'s Turn`}</div>
        </div>
        <div class="ludo-score-box">Score: ${ludoState.score}</div>
      </div>

      <div class="ludo-main-layout">
        <div class="ludo-board-shell">
          <div class="ludo-board traditional-board">
            ${board.map((row, rowIndex) => row.map((cell, colIndex) => {
              const isPath = cell.type === 'path';
              const cellTokens = cell.tokens || [];
              const tokenMarkup = cellTokens.map(({ player, tokenIndex }) => {
                const isMovable = ludoState.legalMoves.includes(tokenIndex) && player.id === 'human' && ludoState.currentTurn === 0;
                const isCurrent = isMovable && !ludoState.gameOver;
                return `<button class="ludo-token token-${player.color} ${isCurrent ? 'movable' : ''}" data-player-index="${ludoState.players.indexOf(player)}" data-token-index="${tokenIndex}" type="button" ${isCurrent ? '' : 'disabled'}>${tokenIndex + 1}</button>`;
              }).join('');
              return `<div class="ludo-cell ${cell.type} ${isPath ? 'ludo-path' : ''}">${tokenMarkup}</div>`;
            }).join('')).join('')}
          </div>
        </div>

        <aside class="ludo-side-panel">
          <div class="ludo-status-box">${ludoState.message}</div>
          <div class="ludo-dice-box">Dice: ${ludoState.lastRoll || '—'}</div>

          <div class="ludo-dice-wrap">
            <button class="ludo-dice-button ${ludoState.rolling ? 'is-rolling' : ''}" id="roll-dice" type="button" ${!ludoState.gameOver && ludoState.currentTurn === 0 && !ludoState.rolling ? '' : 'disabled'}>
              <span class="ludo-die-face">${ludoState.lastRoll || '🎲'}</span>
              <span class="ludo-die-label">${ludoState.currentTurn === 0 ? 'Roll' : 'Wait'}</span>
            </button>
          </div>

          <div class="ludo-mini-controls">
            <button class="small-btn" id="ludo-sound-toggle" type="button">${ludoState.soundOn ? 'Sound On' : 'Sound Off'}</button>
            <button class="small-btn" id="ludo-restart" type="button">Restart</button>
          </div>

          <div class="ludo-player-strip">${scoreboard}</div>
          <div class="ludo-hud">Your tokens home: ${humanCompleted}/4</div>
        </aside>
      </div>
    </div>
  `;
}

function setupIngredientBankSwipe() {
  const bank = document.querySelector('.ingredient-bank');
  if (!bank) return;

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;

  bank.addEventListener('pointerdown', (event) => {
    isDragging = true;
    startX = event.clientX;
    startScrollLeft = bank.scrollLeft;
    bank.classList.add('dragging');
  });

  bank.addEventListener('pointermove', (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;
    bank.scrollLeft = startScrollLeft - delta;
  });

  const stopDragging = () => {
    isDragging = false;
    bank.classList.remove('dragging');
  };

  bank.addEventListener('pointerup', stopDragging);
  bank.addEventListener('pointerleave', stopDragging);
  bank.addEventListener('pointercancel', stopDragging);
}

function attachGameEvents() {
  document.querySelector('[data-game-close="exit"]')?.addEventListener('click', () => {
    const modal = document.getElementById('game-modal');
    modal.remove();
    currentGame = null;
    if (sequenceState.loopId) {
      clearInterval(sequenceState.loopId);
      sequenceState.loopId = null;
    }
    if (teaMusicSession) {
      stopTeaSortingMusic();
    }
  });

  if (currentGame === 'Memory Recall') {
    document.querySelectorAll('[data-answer]').forEach((button) => {
      button.addEventListener('click', () => {
        const selected = button.dataset.answer;
        const correct = activeQuestion.answer;
        const isCorrect = selected === correct;
        if (isCorrect) {
          currentRecallIndex += 1;
          if (currentRecallIndex < currentRecallQuestions.length) {
            activeQuestion = currentRecallQuestions[currentRecallIndex];
            renderGameModal();
            return;
          }
          celebrateWin(`Wonderful work! You answered all ${currentRecallQuestions.length} memory moments.`);
          const session = {
            patientId: state.currentUserId,
            game: 'Memory Recall',
            difficulty: 'Medium',
            score: currentRecallQuestions.length * 10,
            correct: currentRecallQuestions.length,
            incorrect: 0,
            accuracy: 100,
            responseTime: 4,
            completionStatus: 'completed',
            hintsUsed: 0,
            retries: 0,
            abandonment: false,
            aiChosenDifficulty: 'Medium',
          };
          saveSession(state, session);
          updateDifficulty(state, session.patientId, 'Memory Recall', session);
          document.getElementById('game-modal').remove();
          return;
        }
        showToast('Almost! Let\'s try another memory moment.');
      });
    });
  }

  if (currentGame === 'Memory Jigsaw') {
    document.querySelectorAll('.jigsaw-piece-card').forEach((piece) => {
      piece.addEventListener('dragstart', (event) => {
        const pieceId = Number(piece.dataset.jigsawPiece);
        if (jigsawState.placed.includes(pieceId)) {
          event.preventDefault();
          return;
        }
        jigsawState.draggedPiece = pieceId;
        event.dataTransfer?.setData('text/plain', String(pieceId));
        piece.classList.add('dragging');
      });

      piece.addEventListener('dragend', () => {
        piece.classList.remove('dragging');
        jigsawState.draggedPiece = null;
      });
    });

    document.querySelectorAll('.puzzle-slot').forEach((slot) => {
      slot.addEventListener('dragover', (event) => {
        event.preventDefault();
      });

      slot.addEventListener('drop', (event) => {
        event.preventDefault();
        const slotId = Number(slot.dataset.slot);
        const pieceId = Number(event.dataTransfer?.getData('text/plain') || jigsawState.draggedPiece || 0);
        if (!pieceId || jigsawState.placed.includes(pieceId)) return;

        if (pieceId !== slotId) {
          showToast('That piece belongs in a different spot. Try again.');
          return;
        }

        jigsawState.placed = [...(jigsawState.placed || []), pieceId];
        showToast('Great placement!');

        if (jigsawState.placed.length === 6) {
          celebrateWin('Excellent! You completed the picture.');
          const session = {
            patientId: state.currentUserId,
            game: 'Memory Jigsaw',
            difficulty: 'Easy',
            score: 10,
            correct: 1,
            incorrect: 0,
            accuracy: 100,
            responseTime: 3,
            completionStatus: 'completed',
            hintsUsed: 0,
            retries: 0,
            abandonment: false,
            aiChosenDifficulty: 'Easy',
          };
          saveSession(state, session);
          setTimeout(() => document.getElementById('game-modal')?.remove(), 500);
          return;
        }

        renderGameModal();
      });
    });
  }

  if (currentGame === 'Tea Leaf Sorting') {
    const leafBank = document.querySelector('.leaf-sort-bank');
    const allLeaves = document.querySelectorAll('.leaf-token');
    const baskets = document.querySelectorAll('.leaf-basket');

    allLeaves.forEach((leaf) => {
      leaf.addEventListener('dragstart', (event) => {
        if (leaf.classList.contains('sorted')) {
          event.preventDefault();
          return;
        }
        leaf.classList.add('dragging');
        event.dataTransfer?.setData('text/plain', leaf.dataset.leafId);
      });

      leaf.addEventListener('dragend', () => {
        leaf.classList.remove('dragging');
      });
    });

    baskets.forEach((basket) => {
      basket.addEventListener('dragover', (event) => {
        event.preventDefault();
      });

      basket.addEventListener('drop', (event) => {
        event.preventDefault();
        const leafId = event.dataTransfer?.getData('text/plain');
        const target = basket.dataset.target;
        const droppedLeaf = document.querySelector(`.leaf-token[data-leaf-id="${leafId}"]`);

        if (!droppedLeaf || droppedLeaf.classList.contains('sorted')) return;

        const leafType = droppedLeaf.dataset.leafType;
        const isCorrect = (leafType === 'green' && target === 'good') || (leafType === 'brown' && target === 'bad');
        if (isCorrect) {
          droppedLeaf.classList.add('sorted');
          droppedLeaf.setAttribute('draggable', 'false');
          basket.appendChild(droppedLeaf);
          basket.classList.add('correct');
          setTimeout(() => basket.classList.remove('correct'), 400);
          const remaining = document.querySelectorAll('.leaf-token:not(.sorted)').length;
          if (remaining === 0) {
            celebrateWin('Excellent! You sorted every leaf correctly.');
            const session = {
              patientId: state.currentUserId,
              game: 'Tea Leaf Sorting',
              difficulty: 'Easy',
              score: 10,
              correct: 1,
              incorrect: 0,
              accuracy: 100,
              responseTime: 4,
              completionStatus: 'completed',
              hintsUsed: 0,
              retries: 0,
              abandonment: false,
              aiChosenDifficulty: 'Easy',
            };
            saveSession(state, session);
            setTimeout(() => document.getElementById('game-modal')?.remove(), 500);
          }
          return;
        }

        basket.classList.add('wrong');
        setTimeout(() => basket.classList.remove('wrong'), 300);
        showToast('That leaf belongs in the other basket.');
      });
    });

    if (leafBank) {
      leafBank.addEventListener('dragover', (event) => {
        event.preventDefault();
      });
    }
  }

  if (currentGame === 'Make My Sandwich') {
    setupIngredientBankSwipe();

    document.querySelectorAll('[data-sandwich-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.sandwichAction;

        if (action === 'games') {
          renderGameHub(state.currentUserId ? state.patients.find((patient) => patient.id === state.currentUserId) || state.patients[0] : state.patients[0]);
          return;
        }

        if (action === 'routines') {
          const patient = state.patients.find((entry) => entry.id === state.currentUserId) || state.patients[0];
          renderRoutineView(patient);
          return;
        }

        if (action === 'hints') {
          const nextNeeded = sandwichGameState.target[sandwichGameState.selection.length];
          if (!nextNeeded) {
            showToast('You already completed this sandwich.');
            return;
          }
          if (sandwichGameState.hintsUsed >= (sandwichGameState.maxHints || 0)) {
            showToast('No hints left for this sandwich.');
            return;
          }
          sandwichGameState.hintsUsed += 1;
          sandwichGameState.hintedIngredient = nextNeeded;
          sandwichGameState.feedback = `Hint: the next ingredient is ${nextNeeded}.`;
          showToast(`Hint: ${nextNeeded}`);
          speakText(`Hint: the next ingredient is ${nextNeeded}`, state.language, state.settings.voiceOn);
          renderGameModal();
          return;
        }

        if (action === 'clear') {
          sandwichGameState.selection = [];
          sandwichGameState.feedback = 'Start again from the first ingredient.';
          renderGameModal();
          return;
        }

        if (action === 'remove') {
          sandwichGameState.selection = sandwichGameState.selection.slice(0, -1);
          sandwichGameState.feedback = 'One layer removed. Keep going.';
          renderGameModal();
          return;
        }

        if (action === 'next-round') {
          sandwichGameState.round += 1;
          sandwichGameState.completed = false;
          sandwichGameState.selection = [];
          sandwichGameState.hintedIngredient = null;
          sandwichGameState.feedback = 'Watch carefully and remember the next sandwich.';
          sandwichGameState.previewing = true;
          const nextDifficulty = sandwichGameState.consecutiveWins >= 2 ? 'Hard' : sandwichGameState.consecutiveMistakes >= 2 ? 'Easy' : sandwichGameState.difficulty;
          sandwichGameState.difficulty = nextDifficulty;
          const config = getSandwichDifficultyConfig(sandwichGameState.difficulty);
          sandwichGameState.target = buildTargetSandwich(sandwichGameState.difficulty);
          sandwichGameState.viewingTime = config.viewingTime;
          sandwichGameState.maxHints = config.hints;
          sandwichGameState.hintsUsed = 0;
          renderGameModal();
          setTimeout(() => {
            if (currentGame === 'Make My Sandwich') {
              sandwichGameState.previewing = false;
              sandwichGameState.feedback = 'Now build it from memory.';
              renderGameModal();
            }
          }, sandwichGameState.viewingTime);
          return;
        }

        if (action === 'check') {
          if (sandwichGameState.previewing) {
            showToast('Watch the sandwich first.');
            return;
          }
          const expected = sandwichGameState.target;
          if (sandwichGameState.selection.length < expected.length) {
            showToast('Finish the full sandwich first.');
            sandwichGameState.feedback = 'Finish the full sandwich first.';
            renderGameModal();
            return;
          }
          const isCorrect = sandwichGameState.selection.every((ingredient, index) => ingredient === expected[index]);
          if (isCorrect) {
            sandwichGameState.completed = true;
            sandwichGameState.consecutiveWins += 1;
            sandwichGameState.consecutiveMistakes = 0;
            const roundScore = 120 - (sandwichGameState.hintsUsed * 15) + (sandwichGameState.difficulty === 'Hard' ? 15 : 0);
            sandwichGameState.score += Math.max(30, roundScore);
            sandwichGameState.feedback = 'Great! That’s right!';
            celebrateWin('Fantastic! You made the sandwich perfectly!');
            const session = {
              patientId: state.currentUserId,
              game: 'Make My Sandwich',
              difficulty: sandwichGameState.difficulty,
              score: Math.max(30, roundScore),
              correct: sandwichGameState.target.length,
              incorrect: 0,
              accuracy: 100,
              responseTime: 6,
              completionStatus: 'completed',
              hintsUsed: sandwichGameState.hintsUsed,
              retries: 0,
              abandonment: false,
              aiChosenDifficulty: sandwichGameState.difficulty,
            };
            saveSession(state, session);
            renderGameModal();
            return;
          }

          sandwichGameState.consecutiveMistakes += 1;
          sandwichGameState.consecutiveWins = 0;
          sandwichGameState.feedback = 'Almost! Try again.';
          showToast('Almost! Try again.');
          speakText('Almost! Try again.', state.language, state.settings.voiceOn);
          renderGameModal();
        }
      });
    });

    document.querySelectorAll('.ingredient-card').forEach((button) => {
      button.addEventListener('click', () => {
        if (sandwichGameState.previewing) {
          showToast('Watch the target sandwich first.');
          return;
        }
        if (sandwichGameState.completed) {
          showToast('This round is complete. Press Next Round.');
          return;
        }

        const chosen = button.dataset.ingredient;
        sandwichGameState.selection.push(chosen);
        sandwichGameState.feedback = 'Keep going. Finish the sandwich and then tap Check.';
        renderGameModal();
      });
    });
  }

  if (currentGame === 'Sequence Recall') {
    document.getElementById('start-sequence')?.addEventListener('click', () => {
      startSequenceRound();
      showToast('Watch the cards and remember the order.');
    });

    document.querySelectorAll('[data-sequence-card]').forEach((button) => {
      button.addEventListener('click', () => {
        if (sequenceState.phase !== 'recall') return;

        const cardId = button.dataset.sequenceCard;
        if (!cardId || sequenceState.selection.includes(cardId)) return;
        if (sequenceState.selection.length >= sequenceState.pattern.length) return;

        sequenceState.selection.push(cardId);
        renderGameModal();
      });
    });

    document.querySelector('[data-sequence-action="undo"]')?.addEventListener('click', () => {
      sequenceState.selection = sequenceState.selection.slice(0, -1);
      renderGameModal();
    });

    document.querySelector('[data-sequence-action="reset"]')?.addEventListener('click', () => {
      sequenceState.selection = [];
      renderGameModal();
    });

    document.querySelector('[data-sequence-action="submit"]')?.addEventListener('click', () => {
      if (sequenceState.selection.length !== sequenceState.pattern.length) {
        showToast('Select all cards before submitting.');
        return;
      }

      const timeTaken = (Date.now() - sequenceState.startedAt) / 1000;
      const result = evaluateSequence(sequenceState.pattern, sequenceState.selection, timeTaken);
      const isCorrect = result.isCorrect;
      sequenceState.bestScore = Math.max(sequenceState.bestScore, result.score);
      sequenceState.result = {
        ...result,
        timeTaken,
        isCorrect,
      };
      sequenceState.phase = 'result';

      if (isCorrect) {
        sequenceState.level = Math.min(5, sequenceState.level + 1);
        celebrateWin('Excellent memory!');
      } else {
        showToast('Good try! Let’s try again.');
      }

      const session = {
        patientId: state.currentUserId,
        game: 'Sequence Recall',
        difficulty: `Level ${sequenceState.level}`,
        score: result.score,
        correct: result.correct,
        incorrect: sequenceState.pattern.length - result.correct,
        accuracy: result.accuracy,
        responseTime: Number(timeTaken.toFixed(1)),
        completionStatus: isCorrect ? 'completed' : 'attempted',
        hintsUsed: 0,
        retries: 0,
        abandonment: false,
        aiChosenDifficulty: `Level ${sequenceState.level}`,
      };
      saveSession(state, session);
      renderGameModal();
    });

    document.querySelector('[data-sequence-action="next-round"]')?.addEventListener('click', () => {
      if (sequenceState.result?.isCorrect) {
        sequenceState.level = Math.min(5, sequenceState.level + 1);
      }
      startSequenceRound();
    });
  }

  if (currentGame === 'Ludo') {
    const currentPlayer = ludoState.players[ludoState.currentTurn];

    if (!currentPlayer.isHuman && !ludoState.gameOver && !ludoState.aiRunning) {
      ludoState.aiRunning = true;
      ludoState.message = `${currentPlayer.name} is rolling...`;
      setTimeout(() => {
        const value = Math.floor(Math.random() * 6) + 1;
        ludoState.lastRoll = value;
        ludoState.dice = value;
        ludoPlaySound('roll');

        const legalMoves = getLudoLegalMoves(currentPlayer, value);
        if (!legalMoves.length) {
          ludoState.message = `${currentPlayer.name} had no legal move.`;
          setTimeout(() => {
            ludoState.aiRunning = false;
            ludoAdvanceTurn();
          }, 900);
          renderGameModal();
          return;
        }

        const chosenMove = chooseLudoAiMove(currentPlayer, legalMoves, value);
        executeLudoMove(ludoState.currentTurn, chosenMove.tokenIndex, value);
        ludoState.legalMoves = [];
        renderGameModal();

        setTimeout(() => {
          if (ludoState.gameOver) return;
          if (value === 6) {
            ludoState.message = `${currentPlayer.name} rolled a 6 and gets another turn.`;
            ludoState.aiRunning = false;
            renderGameModal();
            return;
          }
          ludoState.aiRunning = false;
          ludoAdvanceTurn();
        }, 900);
      }, 700);
    }

    const rollButton = document.getElementById('roll-dice');
    rollButton?.addEventListener('click', () => {
      if (!ludoState.players[0].isHuman || ludoState.currentTurn !== 0 || ludoState.rolling || ludoState.gameOver) return;
      ludoState.rolling = true;
      const value = Math.floor(Math.random() * 6) + 1;
      ludoState.lastRoll = value;
      ludoState.dice = value;
      ludoPlaySound('roll');
      const legalMoves = getLudoLegalMoves(ludoState.players[0], value);
      ludoState.legalMoves = legalMoves.map((entry) => entry.tokenIndex);

      if (!legalMoves.length) {
        ludoState.message = 'No legal moves. Turn passes.';
        ludoState.rolling = false;
        renderGameModal();
        setTimeout(() => {
          if (!ludoState.gameOver) {
            ludoAdvanceTurn();
          }
        }, 700);
        return;
      }

      ludoState.message = `You rolled ${value}. Choose a token to move.`;
      ludoState.rolling = false;
      renderGameModal();
    });

    document.getElementById('ludo-sound-toggle')?.addEventListener('click', () => {
      ludoState.soundOn = !ludoState.soundOn;
      renderGameModal();
    });

    document.getElementById('ludo-restart')?.addEventListener('click', () => {
      initializeLudoGame();
      renderGameModal();
    });

    document.querySelectorAll('.ludo-token.movable').forEach((tokenButton) => {
      tokenButton.addEventListener('click', () => {
        const playerIndex = Number(tokenButton.dataset.playerIndex);
        const tokenIndex = Number(tokenButton.dataset.tokenIndex);
        if (playerIndex !== 0 || ludoState.currentTurn !== 0 || ludoState.gameOver) return;
        const rollValue = ludoState.lastRoll || 1;
        const success = executeLudoMove(playerIndex, tokenIndex, rollValue);
        if (!success) return;

        if (ludoState.gameOver) {
          renderGameModal();
          return;
        }

        if (rollValue === 6) {
          ludoState.message = 'You rolled a 6! Take another turn.';
          ludoState.legalMoves = [];
          renderGameModal();
          return;
        }

        ludoState.legalMoves = [];
        const session = {
          patientId: state.currentUserId,
          game: 'Ludo',
          difficulty: 'Medium',
          score: ludoState.score,
          correct: ludoState.players[0].tokens.filter((token) => token.progress >= 57).length,
          incorrect: 0,
          accuracy: 100,
          responseTime: 6,
          completionStatus: ludoState.gameOver ? 'completed' : 'attempted',
          hintsUsed: 0,
          retries: 0,
          abandonment: false,
          aiChosenDifficulty: 'Medium',
        };
        saveSession(state, session);
        ludoAdvanceTurn();
      });
    });
  }
}

if (typeof document !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
  requestNotificationPermission();
  render();
}
