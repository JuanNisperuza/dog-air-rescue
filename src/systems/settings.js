import { SOUND } from '../config/constants.js';
import { load, save } from './storage.js';

const DEFAULTS = {
    music: 7,
    sfx: 7,
    film: true,
    shake: true
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
