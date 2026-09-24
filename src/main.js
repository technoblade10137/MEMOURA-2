import { loadStore, saveStore, getActivePatient, setCurrentUser } from './storage.js';
import { t, getGreeting } from './i18n.js';
import { registerPatient, registerCaregiver, loginCaregiver, loginPatient } from './auth.js';
import { addMood } from './profiles.js';
import { getAssistantReply, buildDailySummary } from './ai-assistant.js';
import { speakText } from './tts.js';
import { showToast, requestNotificationPermission } from './notifications.js';
import { addReminder, updateReminderStatus } from './reminders.js';
import { addRoutine } from './routines.js';
import { addJigsawImage } from './images.js';
import { toggleLocationSharing, addRoom } from './maps.js';
import { saveSession } from './sessions.js';
import { chooseDailyActivity, updateDifficulty } from './ai-difficulty.js';
import { getRecallQuestion, getDishChallenge, getSequencePattern } from './games.js';
import { generateReport, getAiInsights } from './reports.js';

let app = null;
let state = null;
let currentGame = null;
let activeQuestion = null;
let sequenceState = { pattern: [], currentStep: 0, completed: false };
let ludoState = { dice: 1, tokens: [0,0,0,0], ai: [0,0,0], turn: 'player' };

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
        <div class="hero">
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
    });
  });
}

function renderRoleForm(role) {
  const slot = document.getElementById('welcome-form-slot');
  if (role === 'patient') {
    slot.innerHTML = `
      <h3>${t('patientRegister', state)}</h3>
      <form id="patient-register-form" class="form-grid">
        <div class="field"><label>${t('name', state)}</label><input name="name" required /></div>
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
        <div class="field"><label>Caregiver name</label><input name="caregiverName" required /></div>
        <div class="field"><label>Caregiver phone</label><input name="caregiverPhone" required /></div>
        <div class="field"><label>Patient name</label><input name="patientName" required /></div>
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
        <div class="brand">MEMOURA</div>
        <div class="actions">
          <button class="small-btn" data-action="home">${t('home', state)}</button>
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
        <button class="card-button" data-game-select="Build the Dish">Build the Dish</button>
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
  app.innerHTML = `
    <div class="app-shell">
      <div class="topbar"><div class="brand">${t('map', state)}</div><button class="small-btn" data-action="home">${t('home', state)}</button></div>
      <div class="panel">
        <div class="summary-card">Location Sharing: <strong>${state.locationSharing ? 'ON' : 'OFF'}</strong> <button class="primary-btn" id="toggle-location">${state.locationSharing ? 'Turn OFF' : 'Turn ON'}</button></div>
        <div class="map-grid">
          ${state.rooms.map((room) => `<div class="room-card"><strong>${room.name}</strong><div>Room ${room.x}, ${room.y}</div></div>`).join('')}
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
        <div class="brand">MEMOURA Caregiver</div>
        <div class="actions">
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
              ${state.images.filter((image) => image.patientId === patient.id).map((image) => `<div class="summary-card"><img src="${image.src}" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:12px" /><p>${image.title}</p></div>`).join('') || '<p>No images yet.</p>'}
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

function openGameModal(name) {
  currentGame = name;
  if (name === 'Memory Recall') {
    activeQuestion = getRecallQuestion('Mixed');
    renderGameModal();
    return;
  }
  if (name === 'Sequence Recall') {
    sequenceState.pattern = getSequencePattern(4);
    sequenceState.currentStep = 0;
    sequenceState.completed = false;
    renderGameModal();
    return;
  }
  renderGameModal();
}

function renderGameModal() {
  const modal = document.createElement('div');
  modal.className = 'game-modal show';
  modal.id = 'game-modal';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="topbar">
        <h3>${currentGame}</h3>
        <button class="danger-btn" data-game-close="exit">${t('exit', state)}</button>
      </div>
      ${currentGame === 'Memory Recall' ? renderRecallGame() : ''}
      ${currentGame === 'Memory Jigsaw' ? renderJigsawGame() : ''}
      ${currentGame === 'Tea Leaf Sorting' ? renderTeaGame() : ''}
      ${currentGame === 'Build the Dish' ? renderDishGame() : ''}
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
    <div>
      <p>${question.q}</p>
      <div class="answer-btn-group">
        ${question.options.map((option) => `<button class="answer-btn" data-answer="${option}">${option}</button>`).join('')}
      </div>
    </div>
  `;
}

function renderJigsawGame() {
  const image = state.images[0];
  const gridSize = 2;
  const pieces = Array.from({ length: gridSize * gridSize }, (_, index) => index + 1);
  return `
    <div>
      <button class="ghost-btn" id="show-jigsaw-picture">${t('showPicture', state)}</button>
      <div class="grid-board" style="grid-template-columns: repeat(${gridSize}, minmax(0, 1fr));">
        ${pieces.map((piece) => `<div class="puzzle-slot" data-slot="${piece}"><div class="puzzle-piece" draggable="true" data-piece="${piece}" style="background-image:url('${image?.src || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'}')"></div></div>`).join('')}
      </div>
      <p id="jigsaw-status">Match the pieces in order.</p>
    </div>
  `;
}

function renderTeaGame() {
  return `
    <div>
      <div class="summary-grid">
        <div class="bowl" data-target="good">Good leaves</div>
        <div class="bowl" data-target="bad">Distractions</div>
      </div>
      <div class="ingredient-list">
        <div class="ingredient-item" draggable="true" data-item="leaf">Leaf</div>
        <div class="ingredient-item" draggable="true" data-item="stone">Stone</div>
        <div class="ingredient-item" draggable="true" data-item="bird">Bird</div>
        <div class="ingredient-item" draggable="true" data-item="tea">Tea leaf</div>
      </div>
    </div>
  `;
}

function renderDishGame() {
  const dish = getDishChallenge(state.gamePreferences.favoriteFoods || ['Khar', 'Pitha']);
  return `
    <div>
      <p>Build this dish from memory: ${dish.answer}</p>
      <div class="dish-choices">
        ${dish.ingredients.map((ingredient) => `<button class="ingredient-item" data-ingredient="${ingredient}">${ingredient}</button>`).join('')}
      </div>
      <button class="primary-btn" id="dish-done">DONE</button>
    </div>
  `;
}

function renderSequenceGame() {
  return `
    <div>
      <p>Watch the glowing tiles, then repeat them.</p>
      <div class="tile-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr));">
        ${Array.from({ length: 9 }, (_, index) => `<button class="tile" data-tile="${index + 1}">${index + 1}</button>`).join('')}
      </div>
      <button class="primary-btn" id="start-sequence">Start</button>
    </div>
  `;
}

function renderLudoGame() {
  return `
    <div>
      <button class="primary-btn" id="roll-dice">Roll Dice</button>
      <div class="ludo-board">
        ${Array.from({ length: 225 }, (_, index) => `<div class="ludo-cell ${index % 3 === 0 ? 'green' : ''}">${index + 1}</div>`).join('')}
      </div>
    </div>
  `;
}

function attachGameEvents() {
  document.querySelector('[data-game-close="exit"]')?.addEventListener('click', () => {
    const modal = document.getElementById('game-modal');
    modal.remove();
    currentGame = null;
  });

  if (currentGame === 'Memory Recall') {
    document.querySelectorAll('[data-answer]').forEach((button) => {
      button.addEventListener('click', () => {
        const selected = button.dataset.answer;
        const correct = activeQuestion.answer;
        const result = selected === correct ? 'Correct! You are doing wonderfully well! 👏' : 'Almost! Let\'s try another one.';
        if (selected === correct) {
          celebrateWin('Wonderful work! Keep going.');
        } else {
          showToast(result);
        }
        const session = {
          patientId: state.currentUserId,
          game: 'Memory Recall',
          difficulty: 'Medium',
          score: selected === correct ? 10 : 5,
          correct: selected === correct ? 1 : 0,
          incorrect: selected === correct ? 0 : 1,
          accuracy: selected === correct ? 100 : 50,
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
      });
    });
  }

  if (currentGame === 'Memory Jigsaw') {
    document.getElementById('show-jigsaw-picture')?.addEventListener('click', () => {
      alert('Picture hint is ready. Try matching the pieces in order.');
    });
    document.querySelectorAll('.puzzle-piece').forEach((piece) => {
      piece.addEventListener('dragstart', (evt) => {
        evt.dataTransfer.setData('text/plain', piece.dataset.piece);
      });
      piece.addEventListener('dragend', () => {
        const status = document.getElementById('jigsaw-status');
        status.textContent = 'Nice work!';
      });
    });
    document.querySelectorAll('.puzzle-slot').forEach((slot) => {
      slot.addEventListener('dragover', (evt) => evt.preventDefault());
      slot.addEventListener('drop', (evt) => {
        evt.preventDefault();
        const pieceId = evt.dataTransfer.getData('text/plain');
        const selected = document.querySelector(`[data-piece="${pieceId}"]`);
        if (selected && slot.dataset.slot === pieceId) {
          slot.appendChild(selected);
          selected.setAttribute('draggable', 'false');
          const status = document.getElementById('jigsaw-status');
          status.textContent = 'Piece locked in place!';
          celebrateWin('Nice job! You completed that one.');
          const session = {
            patientId: state.currentUserId,
            game: 'Memory Jigsaw',
            difficulty: 'Easy',
            score: 10,
            correct: 1,
            incorrect: 0,
            accuracy: 100,
            responseTime: 2,
            completionStatus: 'completed',
            hintsUsed: 0,
            retries: 0,
            abandonment: false,
            aiChosenDifficulty: 'Easy',
          };
          saveSession(state, session);
        }
      });
    });
  }

  if (currentGame === 'Tea Leaf Sorting') {
    document.querySelectorAll('.ingredient-item').forEach((item) => {
      item.addEventListener('dragstart', (evt) => {
        evt.dataTransfer.setData('text/plain', item.dataset.item);
      });
    });
    document.querySelectorAll('.bowl').forEach((bowl) => {
      bowl.addEventListener('dragover', (evt) => evt.preventDefault());
      bowl.addEventListener('drop', (evt) => {
        evt.preventDefault();
        const item = evt.dataTransfer.getData('text/plain');
        const correct = item === 'leaf' || item === 'tea';
        const bowlType = bowl.dataset.target;
        const isCorrect = (correct && bowlType === 'good') || (!correct && bowlType === 'bad');
        if (isCorrect) {
          celebrateWin('Well done! You sorted it correctly.');
        } else {
          showToast('Let’s try another one.');
        }
        const session = {
          patientId: state.currentUserId,
          game: 'Tea Leaf Sorting',
          difficulty: 'Easy',
          score: isCorrect ? 10 : 5,
          correct: isCorrect ? 1 : 0,
          incorrect: isCorrect ? 0 : 1,
          accuracy: isCorrect ? 100 : 50,
          responseTime: 4,
          completionStatus: 'completed',
          hintsUsed: 0,
          retries: 0,
          abandonment: false,
          aiChosenDifficulty: 'Easy',
        };
        saveSession(state, session);
      });
    });
  }

  if (currentGame === 'Build the Dish') {
    let selected = [];
    document.querySelectorAll('[data-ingredient]').forEach((button) => {
      button.addEventListener('click', () => {
        const ingredient = button.dataset.ingredient;
        selected.push(ingredient);
        button.textContent = `${ingredient} ✓`;
      });
    });
    document.getElementById('dish-done').addEventListener('click', () => {
      const dish = getDishChallenge(state.gamePreferences.favoriteFoods || ['Khar', 'Pitha']);
      const correct = selected.includes(dish.answer);
      if (correct) {
        celebrateWin('Excellent! You built it just right.');
      } else {
        showToast('Almost! Try the familiar food again.');
      }
      const session = {
        patientId: state.currentUserId,
        game: 'Build the Dish',
        difficulty: 'Medium',
        score: correct ? 10 : 5,
        correct: correct ? 1 : 0,
        incorrect: correct ? 0 : 1,
        accuracy: correct ? 100 : 60,
        responseTime: 6,
        completionStatus: 'completed',
        hintsUsed: 0,
        retries: 0,
        abandonment: false,
        aiChosenDifficulty: 'Medium',
      };
      saveSession(state, session);
      document.getElementById('game-modal').remove();
    });
  }

  if (currentGame === 'Sequence Recall') {
    document.getElementById('start-sequence').addEventListener('click', () => {
      sequenceState.pattern = getSequencePattern(4);
      sequenceState.currentStep = 0;
      sequenceState.completed = false;
      document.querySelectorAll('.tile').forEach((tile) => {
        tile.classList.remove('active');
      });
      const tiles = [...document.querySelectorAll('.tile')];
      tiles.forEach((tile) => tile.disabled = true);
      const showPattern = () => {
        sequenceState.pattern.forEach((index, i) => {
          setTimeout(() => {
            const tile = tiles[index - 1];
            if (tile) { tile.classList.add('active'); setTimeout(() => tile.classList.remove('active'), 400); }
          }, i * 500);
        });
        setTimeout(() => {
          tiles.forEach((tile) => tile.disabled = false);
        }, sequenceState.pattern.length * 600);
      };
      showPattern();
    });

    document.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const expected = sequenceState.pattern[sequenceState.currentStep];
        const actual = Number(tile.dataset.tile);
        if (actual === expected) {
          sequenceState.currentStep += 1;
          tile.classList.add('active');
          if (sequenceState.currentStep === sequenceState.pattern.length) {
            celebrateWin('Excellent! You remembered the sequence.');
            const session = {
              patientId: state.currentUserId,
              game: 'Sequence Recall',
              difficulty: 'Easy',
              score: 10,
              correct: 1,
              incorrect: 0,
              accuracy: 100,
              responseTime: 5,
              completionStatus: 'completed',
              hintsUsed: 0,
              retries: 0,
              abandonment: false,
              aiChosenDifficulty: 'Easy',
            };
            saveSession(state, session);
            document.getElementById('game-modal').remove();
          }
        } else {
          showToast('Almost! Let\'s try another one.');
        }
      });
    });
  }

  if (currentGame === 'Ludo') {
    document.getElementById('roll-dice').addEventListener('click', () => {
      const value = Math.floor(Math.random() * 6) + 1;
      ludoState.dice = value;
      const tokenStep = Math.min((ludoState.tokens[0] || 0) + value, 10);
      ludoState.tokens[0] = tokenStep;
      showToast(`Dice: ${value}`);
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
