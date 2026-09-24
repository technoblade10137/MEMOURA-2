import { saveStore } from './storage.js';

export function addRoutine(state, routine) {
  const entry = { id: `${Date.now()}`, ...routine };
  state.routines.push(entry);
  saveStore(state);
  return entry;
}

export function getRoutineForPatient(state, patientId) {
  return state.routines.filter((routine) => routine.patientId === patientId);
}
