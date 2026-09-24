import { hashString, saveStore, makeId } from './storage.js';

export async function registerPatient(state, patientData) {
  const patient = {
    id: makeId('patient'),
    ...patientData,
    createdAt: new Date().toISOString(),
  };
  state.patients.push(patient);
  state.currentRole = 'patient';
  state.currentUserId = patient.id;
  saveStore(state);
  return patient;
}

export async function registerCaregiver(state, caregiverData, passwordPlain) {
  const passwordHash = await hashString(passwordPlain || caregiverData.password || '');
  const caregiver = {
    id: makeId('caregiver'),
    ...caregiverData,
    passwordHash,
    patientId: caregiverData.patientId,
    patientName: caregiverData.patientName,
    patientPhone: caregiverData.patientPhone,
  };
  state.caregivers.push(caregiver);
  state.currentRole = 'caregiver';
  state.currentUserId = caregiver.id;
  saveStore(state);
  return caregiver;
}

export async function loginCaregiver(state, phone, passwordPlain) {
  const caregiver = state.caregivers.find((entry) => entry.phone === phone);
  if (!caregiver) return null;
  const enteredHash = await hashString(passwordPlain || '');
  if (caregiver.passwordHash !== enteredHash) return null;
  state.currentRole = 'caregiver';
  state.currentUserId = caregiver.id;
  saveStore(state);
  return caregiver;
}

export function loginPatient(state, phone) {
  const patient = state.patients.find((entry) => entry.phone === phone);
  if (!patient) return null;
  state.currentRole = 'patient';
  state.currentUserId = patient.id;
  saveStore(state);
  return patient;
}
