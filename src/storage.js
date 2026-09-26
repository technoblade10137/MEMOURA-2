export const STORAGE_KEY = 'memoura-state-v1';

const defaultStageOptions = ['Early', 'Mild', 'Severe'];
const defaultStateOptions = ['Assam', 'Arunachal Pradesh', 'Manipur', 'Sikkim'];

export function makeId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function hashString(value) {
  if (!value) return '';
  if (window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    return window.crypto.subtle.digest('SHA-256', data).then((buffer) => {
      let hex = '';
      new Uint8Array(buffer).forEach((b) => {
        hex += b.toString(16).padStart(2, '0');
      });
      return hex;
    });
  }
  return Promise.resolve(value.split('').reduce((acc, ch) => ((acc * 31 + ch.charCodeAt(0)) >>> 0).toString(16), '0'));
}

export function getDefaultState() {
  return {
    language: 'en',
    currentRole: null,
    currentUserId: null,
    patients: [
      {
        id: 'patient_demo',
        name: 'Rina',
        dob: '1962-03-14',
        phone: '9876543210',
        stage: 'Mild',
        state: 'Assam',
        language: 'en',
        createdAt: new Date().toISOString(),
      }
    ],
    caregivers: [
      {
        id: 'caregiver_demo',
        name: 'Mita',
        phone: '9123456780',
        patientId: 'patient_demo',
        patientName: 'Rina',
        patientPhone: '9876543210',
        passwordHash: 'demo_hash',
      }
    ],
    routines: [
      { id: 'routine_1', patientId: 'patient_demo', title: 'Morning tea', time: '08:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], notes: 'Warm tea and slow breathing', repeat: 'weekly' },
      { id: 'routine_2', patientId: 'patient_demo', title: 'Easy walk', time: '14:30', days: ['Mon', 'Wed', 'Fri'], notes: 'Garden walk', repeat: 'weekly' }
    ],
    reminders: [
      { id: 'reminder_1', patientId: 'patient_demo', title: 'It\'s time for your walk', date: new Date().toISOString().slice(0,10), time: '09:00', repeat: 'once', note: 'Gentle walk', status: 'done' },
      { id: 'reminder_2', patientId: 'patient_demo', title: 'Water break', date: new Date().toISOString().slice(0,10), time: '18:00', repeat: 'none', note: 'Drink water', status: 'pending' }
    ],
    moods: [
      { id: 'mood_1', patientId: 'patient_demo', mood: 'happy', at: new Date(Date.now() - 86400000).toISOString() },
      { id: 'mood_2', patientId: 'patient_demo', mood: 'happy', at: new Date().toISOString() }
    ],
    sessions: [
      { id: 'session_1', patientId: 'patient_demo', game: 'Memory Recall', difficulty: 'Medium', score: 8, correct: 7, incorrect: 1, accuracy: 87, responseTime: 4.8, completionStatus: 'completed', hintsUsed: 1, retries: 1, abandonment: false, date: new Date(Date.now() - 86400000).toISOString(), aiChosenDifficulty: 'Medium' },
      { id: 'session_2', patientId: 'patient_demo', game: 'Sequence Recall', difficulty: 'Easy', score: 6, correct: 5, incorrect: 1, accuracy: 83, responseTime: 5.5, completionStatus: 'completed', hintsUsed: 2, retries: 0, abandonment: false, date: new Date().toISOString(), aiChosenDifficulty: 'Easy' }
    ],
    images: [
      { id: 'image_1', patientId: 'patient_demo', title: 'Family smile', src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80' }
    ],
    rooms: [
      { id: 'room_1', name: 'Bedroom', x: 1, y: 1 },
      { id: 'room_2', name: 'Living Room', x: 1, y: 2 },
      { id: 'room_3', name: 'Kitchen', x: 2, y: 1 },
      { id: 'room_4', name: 'Bathroom', x: 2, y: 2 },
      { id: 'room_5', name: 'Garden', x: 3, y: 1 },
      { id: 'room_6', name: 'Main Door', x: 3, y: 2 }
    ],
    locationSharing: false,
    languageMap: { Assam: 'as', 'Arunachal Pradesh': 'en', Manipur: 'mni', Sikkim: 'ne' },
    settings: {
      voiceOn: true,
      showReminder: true,
      aiMode: 'gentle'
    },
    stageOptions: defaultStageOptions,
    stateOptions: defaultStateOptions,
    allGames: ['Memory Jigsaw', 'Memory Recall', 'Tea Leaf Sorting', 'Make My Sandwich', 'Sequence Recall', 'Ludo'],
    gamePreferences: {
      meal: 'Khar',
      place: 'River path',
      favoriteFoods: ['Khar', 'Pitha'],
      familiarContent: ['Family photo', 'Tea time', 'Garden walk']
    },
    appStatus: {
      lastAlert: null
    }
  };
}

function sanitizeStoredState(parsed) {
  const defaults = getDefaultState();
  const safe = { ...defaults, ...parsed };
  const defaultPatient = defaults.patients[0];
  const defaultCaregiver = defaults.caregivers[0];

  const testNamePatterns = ['test user', 'testuser', 'demo user', 'guest'];
  const isTestUser = (value) => typeof value === 'string' && testNamePatterns.some((pattern) => value.toLowerCase().includes(pattern));

  const cleanedPatients = Array.isArray(parsed?.patients) && parsed.patients.length ? parsed.patients : defaults.patients;
  const cleanedCaregivers = Array.isArray(parsed?.caregivers) && parsed.caregivers.length ? parsed.caregivers : defaults.caregivers;

  safe.patients = cleanedPatients.filter((patient) => patient && patient.name && !isTestUser(patient.name));
  safe.caregivers = cleanedCaregivers.filter((caregiver) => caregiver && caregiver.name && !isTestUser(caregiver.name));

  if (!safe.patients.length) safe.patients = defaults.patients;
  if (!safe.caregivers.length) safe.caregivers = defaults.caregivers;

  const currentPatientExists = safe.patients.some((patient) => patient.id === safe.currentUserId);
  const currentCaregiverExists = safe.caregivers.some((caregiver) => caregiver.id === safe.currentUserId);

  if (!safe.currentUserId || (!currentPatientExists && !currentCaregiverExists)) {
    safe.currentRole = 'patient';
    safe.currentUserId = defaultPatient.id;
  }

  if (safe.currentRole === 'patient' && !safe.patients.some((patient) => patient.id === safe.currentUserId)) {
    safe.currentUserId = defaultPatient.id;
  }

  if (safe.currentRole === 'caregiver' && !safe.caregivers.some((caregiver) => caregiver.id === safe.currentUserId)) {
    safe.currentUserId = defaultCaregiver.id;
  }

  return safe;
}

export function loadStore() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = getDefaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(saved);
    const safeState = sanitizeStoredState(parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
    return safeState;
  } catch (error) {
    console.error('Failed to load state', error);
    const initial = getDefaultState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

export function saveStore(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getActivePatient(state) {
  if (!state.currentUserId) return state.patients[0] || null;
  return state.patients.find((patient) => patient.id === state.currentUserId) || state.patients[0] || null;
}

export function getCaregiverForPatient(state, patientId) {
  return state.caregivers.find((caregiver) => caregiver.patientId === patientId) || null;
}

export function setCurrentUser(state, role, userId) {
  state.currentRole = role;
  state.currentUserId = userId;
  saveStore(state);
}
