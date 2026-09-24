import { saveStore } from './storage.js';

export function toggleLocationSharing(state, value) {
  state.locationSharing = Boolean(value);
  saveStore(state);
  return state.locationSharing;
}

export function addRoom(state, roomName) {
  const room = {
    id: `${Date.now()}`,
    name: roomName,
    x: Math.floor(Math.random() * 3) + 1,
    y: Math.floor(Math.random() * 2) + 1,
  };
  state.rooms.push(room);
  saveStore(state);
  return room;
}

export function getIndoorMap(state) {
  return state.rooms || [];
}
