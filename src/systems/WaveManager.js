import Phaser from 'phaser';
import { WAVES, DEBUG } from '../config/constants.js';
import { WAVE_LIST } from '../config/waves.js';

// Genera las oleadas. Al empezar una, convierte sus grupos en una cola de apariciones
// ordenada por tiempo y en cada frame saca las que ya tocan. Cuando termina la última
// avisa con onComplete (ahí GameScene trae al jefe).
const SPAWN_MARGIN = 60; // px a la derecha de la pantalla donde aparecen

export default class WaveManager {
    constructor(scene, enemies, onComplete) {
        this.scene = scene;
        this.enemies = enemies;
        this.onComplete = onComplete;

        this.waveIndex = -1;
        this.total = WAVE_LIST.length;

        // Multiplicadores de dificultad, compartidos por todos los enemigos
        this.difficulty = { hp: 1, speed: 1, fireRate: 1 };

        this.queue = [];
        this.queueIndex = 0;

        this.state = 'break';
        this.nextWaveAt = scene.now + WAVES.firstDelay;
    }

    // Cuántas oleadas se terminaron, de 0 a 1 (para la barra de progreso)
    get progress() {
        const done = this.state === 'done' ? this.total : Math.max(0, this.waveIndex);
        return done / this.total;
    }

    update(now) {
        if (this.state === 'done') return;
        if (this.state === 'break') {
            if (now >= this.nextWaveAt) this.startNextWave(now);
            return;
        }

        while (this.queueIndex < this.queue.length && this.queue[this.queueIndex].at <= now) {
            this.spawn(this.queue[this.queueIndex]);
            this.queueIndex++;
        }

        // Terminó la oleada: ya salieron todos y no queda ninguno vivo
        if (this.queueIndex >= this.queue.length && this.enemies.countActive() === 0) {
            if (this.waveIndex >= this.total - 1) {
                this.state = 'done';
                this.onComplete?.();
                return;
            }
            this.state = 'break';
            this.nextWaveAt = now + WAVES.breakTime;
        }
    }

    startNextWave(now) {
        this.waveIndex++;
        const wave = WAVE_LIST[this.waveIndex];

        this.queue.length = 0;
        this.queueIndex = 0;
        for (const group of wave.groups) {
            this.expandFormation(group, now);
        }
        for (const rescue of wave.rescues ?? []) {
            this.queue.push({ at: now + rescue.at, puppy: true, y: rescue.y * this.scene.scale.height });
        }
        this.queue.sort((a, b) => a.at - b.at);

        this.state = 'running';

        // Las oleadas no se muestran al jugador; con DEBUG salen en consola
        if (DEBUG) console.log(`[Wave ${this.waveIndex + 1}/${this.total}] ${wave.name}`);
    }

    // Convierte un grupo (formación) en apariciones individuales
    expandFormation(group, now) {
        const { width, height } = this.scene.scale;
        const count = group.count ?? 1;
        const baseX = width + SPAWN_MARGIN;
        const baseY = (group.y ?? 0.5) * height;
        const start = now + (group.at ?? 0);
        const mid = (count - 1) / 2;

        for (let i = 0; i < count; i++) {
            let x = baseX;
            let y = baseY;
            let at = start;

            switch (group.formation) {
                case 'line':      // fila india: misma altura, uno tras otro
                    at = start + i * (group.interval ?? 350);
                    break;

                case 'column':    // todos a la vez, apilados
                    y = baseY + (i - mid) * (group.spacing ?? 80);
                    break;

                case 'v':         // V: el del medio va adelante
                    x = baseX + Math.abs(i - mid) * (group.gapX ?? 55);
                    y = baseY + (i - mid) * (group.gapY ?? 50);
                    break;

                case 'random':    // alturas al azar, uno tras otro
                    at = start + i * (group.interval ?? 400);
                    y = Phaser.Math.FloatBetween(0.12, 0.88) * height;
                    break;

                case 'single':
                default:
                    break;
            }

            y = Phaser.Math.Clamp(y, 40, height - 40);

            this.queue.push({ at, type: group.type, x, y, params: group });
        }
    }

    spawn(entry) {
        if (entry.puppy) {
            this.scene.spawnPuppy(entry.y);
            return;
        }
        const enemy = this.enemies.get(entry.x, entry.y);
        if (enemy) {
            enemy.spawn(entry.x, entry.y, entry.type, entry.params, this.difficulty);
        }
    }
}
