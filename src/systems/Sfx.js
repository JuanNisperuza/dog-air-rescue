import { SOUND } from '../config/constants.js';
import { load, save } from './storage.js';

// Efectos de sonido sintetizados con Web Audio (osciladores y ruido), sin archivos de audio.

// El buffer de ruido se crea una sola vez
let noiseBuffer = null;

// El mute es global (menú y juego) y se guarda entre sesiones
let globalMuted = load('muted', false);

export function isMuted() {
    return globalMuted;
}

function getNoiseBuffer(ctx) {
    if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
    const length = ctx.sampleRate; // 1 segundo
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
}

export default class Sfx {
    constructor(scene) {
        this.ctx = scene.sound.context || null;
        this.enabled = !!this.ctx;
        this.muted = globalMuted;
        this.lastPlayed = {}; // para no apilar el mismo sonido muchas veces seguidas

        if (!this.enabled) return;

        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : SOUND.volume;
        this.master.connect(this.ctx.destination);
        this.noise = getNoiseBuffer(this.ctx);
    }

    toggleMute() {
        this.muted = !this.muted;
        globalMuted = this.muted;
        save('muted', this.muted);
        if (this.enabled) this.master.gain.value = this.muted ? 0 : SOUND.volume;
        return this.muted;
    }

    // minGap evita que el mismo sonido se apile muchas veces seguidas
    canPlay(name, minGap = 0) {
        if (!this.enabled || this.muted) return false;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const now = this.ctx.currentTime * 1000;
        if (minGap > 0 && now - (this.lastPlayed[name] ?? -Infinity) < minGap) return false;
        this.lastPlayed[name] = now;
        return true;
    }

    // Piezas básicas

    // Tono con barrido de frecuencia
    tone({ type = 'square', freq, freqEnd = freq, duration, volume, delay = 0 }) {
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + duration);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        osc.connect(gain).connect(this.master);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    // Ruido filtrado, para explosiones e impactos
    burst({ duration, volume, filterFreq = 2000, filterEnd = 200, delay = 0 }) {
        const t = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        src.buffer = this.noise;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, t);
        filter.frequency.exponentialRampToValueAtTime(Math.max(filterEnd, 20), t + duration);

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

        src.connect(filter).connect(gain).connect(this.master);
        src.start(t, Math.random() * 0.5); // cada explosión empieza en otro punto del ruido
        src.stop(t + duration + 0.02);
    }

    // Sonidos del juego

    shoot() {
        if (!this.canPlay('shoot')) return;
        const pitch = 1 + (Math.random() - 0.5) * 0.15; // variación: no suena robótico
        this.tone({ type: 'square', freq: 900 * pitch, freqEnd: 420 * pitch, duration: 0.06, volume: 0.045 });
    }

    enemyShoot() {
        if (!this.canPlay('enemyShoot', 45)) return;
        this.tone({ type: 'triangle', freq: 560, freqEnd: 240, duration: 0.14, volume: 0.09 });
    }

    hit() {
        if (!this.canPlay('hit', 30)) return;
        this.tone({ type: 'square', freq: 1500, freqEnd: 900, duration: 0.03, volume: 0.03 });
    }

    explosion(big = false) {
        if (!this.canPlay(big ? 'bigExplosion' : 'explosion', 40)) return;
        if (big) {
            this.burst({ duration: 0.8, volume: 0.5, filterFreq: 1600, filterEnd: 80 });
            this.tone({ type: 'sine', freq: 90, freqEnd: 28, duration: 0.7, volume: 0.45 });
        } else {
            this.burst({ duration: 0.28, volume: 0.28, filterFreq: 2400, filterEnd: 250 });
            this.tone({ type: 'sine', freq: 140, freqEnd: 45, duration: 0.2, volume: 0.22 });
        }
    }

    playerHurt() {
        if (!this.canPlay('playerHurt', 100)) return;
        this.tone({ type: 'sawtooth', freq: 320, freqEnd: 70, duration: 0.35, volume: 0.16 });
        this.burst({ duration: 0.15, volume: 0.2, filterFreq: 3000, filterEnd: 600 });
    }

    // Aviso del kamikaze antes de lanzarse
    windup() {
        if (!this.canPlay('windup', 80)) return;
        this.tone({ type: 'sine', freq: 300, freqEnd: 1100, duration: 0.45, volume: 0.07 });
    }

    // Menú

    uiMove() {
        if (!this.canPlay('uiMove', 40)) return;
        this.tone({ type: 'square', freq: 660, freqEnd: 700, duration: 0.05, volume: 0.04 });
    }

    uiSelect() {
        if (!this.canPlay('uiSelect', 80)) return;
        this.tone({ type: 'square', freq: 523, duration: 0.08, volume: 0.06 });
        this.tone({ type: 'square', freq: 784, duration: 0.14, volume: 0.06, delay: 0.07 });
    }

    gameOver() {
        if (!this.canPlay('gameOver')) return;
        this.burst({ duration: 1.0, volume: 0.5, filterFreq: 1400, filterEnd: 60 });
        // Tres notas descendentes
        [440, 349, 262].forEach((freq, i) => {
            this.tone({ type: 'square', freq, freqEnd: freq * 0.97, duration: 0.28, volume: 0.07, delay: 0.5 + i * 0.3 });
        });
    }
}
