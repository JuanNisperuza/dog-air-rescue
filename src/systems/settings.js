import { SOUND } from '../config/constants.js';
import { load, save } from './storage.js';

// Opciones del jugador (menú Options). Se guardan entre sesiones.
const DEFAULTS = {
    music: 7,       // 0 a 10
    sfx: 7,         // 0 a 10
    film: true,     // filtro de película vieja
    shake: true     // temblor de cámara
};

export const settings = { ...DEFAULTS, ...load('settings', {}) };

export function saveSettings() {
    save('settings', settings);
}

export function musicVolume() {
    return (settings.music / 10) * SOUND.musicMax;
}

export function sfxVolume() {
    return (settings.sfx / 10) * SOUND.sfxMax;
}
