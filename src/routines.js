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

export function getRoutineDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isRoutineComplete(routine, date = getRoutineDateKey()) {
  return Array.isArray(routine.completedDates) && routine.completedDates.includes(date);
}

export function toggleRoutineCompletion(state, routineId, date = getRoutineDateKey()) {
  const routine = state.routines.find((entry) => entry.id === routineId);
  if (!routine) {
    throw new Error(`Routine not found: ${routineId}`);
  }

  const completedDates = Array.isArray(routine.completedDates) ? routine.completedDates : [];
  if (completedDates.includes(date)) {
    routine.completedDates = completedDates.filter((completedDate) => completedDate !== date);
  } else {
    routine.completedDates = [...completedDates, date];
  }

  saveStore(state);
  return isRoutineComplete(routine, date);
}
