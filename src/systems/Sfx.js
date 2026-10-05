import { load, save } from './storage.js';
import { sfxVolume } from './settings.js';

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
        this.master.gain.value = this.muted ? 0 : sfxVolume();
        this.master.connect(this.ctx.destination);
        this.noise = getNoiseBuffer(this.ctx);
    }

    toggleMute() {
        this.muted = !this.muted;
        globalMuted = this.muted;
        save('muted', this.muted);
        if (this.enabled) this.master.gain.value = this.muted ? 0 : sfxVolume();
        return this.muted;
    }

    // minGap evita que el mismo sonido se apile muchas veces seguidas
    canPlay(name, minGap = 0) {
        if (!this.enabled || this.muted) return false;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.master.gain.value = sfxVolume(); // por si cambió en Options

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

    // Globo reventando
    pop() {
        if (!this.canPlay('pop', 40)) return;
        this.burst({ duration: 0.09, volume: 0.35, filterFreq: 7000, filterEnd: 2500 });
        this.tone({ type: 'square', freq: 950, freqEnd: 260, duration: 0.07, volume: 0.06 });
    }

    // Sube el multiplicador del combo: más agudo en cada nivel
    comboUp(level) {
        if (!this.canPlay('comboUp', 100)) return;
        const base = 440 * Math.pow(1.25, level);
        this.tone({ type: 'square', freq: base, duration: 0.07, volume: 0.06 });
        this.tone({ type: 'square', freq: base * 1.5, duration: 0.12, volume: 0.06, delay: 0.07 });
    }

    // Ladrido del súper: dos "guau" graves
    bark() {
        if (!this.canPlay('bark', 200)) return;
        [0, 0.16].forEach((delay) => {
            this.tone({ type: 'sawtooth', freq: 520, freqEnd: 160, duration: 0.14, volume: 0.2, delay });
            this.burst({ duration: 0.1, volume: 0.2, filterFreq: 1800, filterEnd: 300, delay });
        });
        this.burst({ duration: 0.9, volume: 0.4, filterFreq: 1200, filterEnd: 60, delay: 0.1 });
    }

    // El súper ya está listo
    superReady() {
        if (!this.canPlay('superReady', 300)) return;
        [660, 880, 1320].forEach((freq, i) => {
            this.tone({ type: 'triangle', freq, duration: 0.12, volume: 0.07, delay: i * 0.07 });
        });
    }

    // Perrito rescatado: arpegio alegre
    rescue() {
        if (!this.canPlay('rescue', 80)) return;
        [523, 659, 784, 1047].forEach((freq, i) => {
            this.tone({ type: 'square', freq, duration: 0.09, volume: 0.05, delay: i * 0.06 });
        });
    }

    powerUp() {
        if (!this.canPlay('powerUp', 80)) return;
        this.tone({ type: 'square', freq: 300, freqEnd: 1200, duration: 0.25, volume: 0.06 });
        this.tone({ type: 'triangle', freq: 600, freqEnd: 2400, duration: 0.25, volume: 0.05, delay: 0.05 });
    }

    shieldBreak() {
        if (!this.canPlay('shieldBreak', 100)) return;
        this.burst({ duration: 0.25, volume: 0.3, filterFreq: 8000, filterEnd: 1500 });
        this.tone({ type: 'triangle', freq: 1800, freqEnd: 400, duration: 0.3, volume: 0.08 });
    }

    // Alarma del aviso del jefe
    siren() {
        if (!this.canPlay('siren', 300)) return;
        this.tone({ type: 'sawtooth', freq: 440, freqEnd: 880, duration: 0.35, volume: 0.07 });
        this.tone({ type: 'sawtooth', freq: 880, freqEnd: 440, duration: 0.35, volume: 0.07, delay: 0.35 });
    }

    // Rugido (maullido grave) del jefe al cambiar de fase
    roar() {
        if (!this.canPlay('roar', 300)) return;
        this.tone({ type: 'sawtooth', freq: 180, freqEnd: 420, duration: 0.25, volume: 0.15 });
        this.tone({ type: 'sawtooth', freq: 420, freqEnd: 120, duration: 0.5, volume: 0.15, delay: 0.25 });
        this.burst({ duration: 0.6, volume: 0.2, filterFreq: 900, filterEnd: 100 });
    }

    fanfare() {
        if (!this.canPlay('fanfare')) return;
        [[523, 0], [659, 0.15], [784, 0.3], [1047, 0.45], [784, 0.62], [1047, 0.75]].forEach(([freq, delay], i) => {
            this.tone({ type: 'square', freq, duration: i === 5 ? 0.5 : 0.14, volume: 0.07, delay });
        });
    }

    // Conteo de la pantalla de resultados
    tick() {
        if (!this.canPlay('tick', 35)) return;
        this.tone({ type: 'square', freq: 1400, duration: 0.025, volume: 0.03 });
    }

    // La nota cae como un sello
    stamp() {
        if (!this.canPlay('stamp', 100)) return;
        this.burst({ duration: 0.35, volume: 0.45, filterFreq: 900, filterEnd: 80 });
        this.tone({ type: 'sine', freq: 120, freqEnd: 40, duration: 0.3, volume: 0.35 });
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
