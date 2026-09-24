import { saveStore } from './storage.js';

export function addReminder(state, reminder) {
  const item = { id: `${Date.now()}`, status: 'pending', ...reminder };
  state.reminders.push(item);
  saveStore(state);
  return item;
}

export function updateReminderStatus(state, reminderId, status) {
  const reminder = state.reminders.find((entry) => entry.id === reminderId);
  if (!reminder) return null;
  reminder.status = status;
  saveStore(state);
  return reminder;
}

export function getPendingReminders(state, patientId) {
  return state.reminders.filter((reminder) => reminder.patientId === patientId && reminder.status === 'pending');
}
