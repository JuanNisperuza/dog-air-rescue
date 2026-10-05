import { isMuted } from './Sfx.js';
import { musicVolume } from './settings.js';

// Música de fondo con un <audio> normal en vez del loader de Phaser: así va en
// streaming y no se decodifica la canción entera en memoria (~160 MB para 7 min).
// Hay una sola instancia para todo el juego, por eso no se corta al reiniciar.
const TRACK = 'assets/audio/dark-forest'; // .ogg o .mp3 según el navegador

let instance = null;

export function getMusic() {
    if (!instance) instance = new Music();
    return instance;
}

class Music {
    constructor() {
        this.audio = new Audio();
        // OGG pesa menos, pero Safari viejo no lo soporta
        const ogg = this.audio.canPlayType('audio/ogg; codecs="vorbis"');
        this.audio.src = import.meta.env.BASE_URL + TRACK + (ogg ? '.ogg' : '.mp3');
        this.audio.loop = true;
        this.audio.preload = 'auto';
        this.audio.volume = 0;

        this.targetVolume = musicVolume();
        this.muted = isMuted(); // recuerda si el jugador silenció el juego
        this.fadeFrame = null;
        this.waitingForInput = false;
    }

    // El navegador no deja sonar nada hasta que el usuario interactúa con la página,
    // así que si falla esperamos la primera tecla o clic
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

    // Volumen normal según Options; factor < 1 para bajarla (ej. al terminar la partida)
    restore(factor = 1, duration = 800) {
        this.fadeTo(musicVolume() * factor, duration);
    }

    setMuted(muted) {
        this.muted = muted;
        cancelAnimationFrame(this.fadeFrame);
        this.audio.volume = muted ? 0 : this.targetVolume;
    }
}
