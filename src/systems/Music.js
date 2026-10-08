import { isMuted } from './Sfx.js';
import { musicVolume } from './settings.js';

const TRACK = 'assets/audio/dark-forest';

let instance = null;

export function getMusic() {
    if (!instance) instance = new Music();
    return instance;
}

class Music {
    constructor() {
        this.audio = new Audio();
        // OGG is smaller, but older Safari does not support it
        const ogg = this.audio.canPlayType('audio/ogg; codecs="vorbis"');
        this.audio.src = import.meta.env.BASE_URL + TRACK + (ogg ? '.ogg' : '.mp3');
        this.audio.loop = true;
        this.audio.preload = 'auto';
        this.audio.volume = 0;

        this.targetVolume = musicVolume();
        this.muted = isMuted();
        this.fadeFrame = null;
        this.waitingForInput = false;
    }

    // Browsers block audio until the user interacts with the page,
    // so if playback fails we wait for the first key press or click
    play() {
        this.audio.play().catch(() => {
            if (this.waitingForInput) return;
            this.waitingForInput = true;
            const unlock = () => {
                this.waitingForInput = false;
                window.removeEventListener('keydown', unlock);
                window.removeEventListener('pointerdown', unlock);
                this.audio.play().catch(() => {});
            };
            window.addEventListener('keydown', unlock);
            window.addEventListener('pointerdown', unlock);
        });
    }

    fadeTo(volume, duration = 600) {
        this.targetVolume = volume;
        if (this.muted) return;

        cancelAnimationFrame(this.fadeFrame);
        const from = this.audio.volume;
        const start = performance.now();

        const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            this.audio.volume = from + (volume - from) * t;
            if (t < 1) this.fadeFrame = requestAnimationFrame(step);
        };
        this.fadeFrame = requestAnimationFrame(step);
    }

    restore(factor = 1, duration = 800) {
        this.fadeTo(musicVolume() * factor, duration);
    }

    setMuted(muted) {
        this.muted = muted;
        cancelAnimationFrame(this.fadeFrame);
        this.audio.volume = muted ? 0 : this.targetVolume;
    }
}
