import { COMBO } from '../config/constants.js';

// Combo: matar enemigos seguidos (sin dejar pasar más de COMBO.window ms)
// sube un multiplicador de puntos. Recibir daño lo corta.
// Publica 'combo' y 'comboExpires' en el registry para que el HUD lo muestre.
export default class Combo {
    constructor(scene) {
        this.scene = scene;
        this.count = 0;
        this.best = 0;          // mejor combo de la partida (para los resultados)
        this.expiresAt = 0;
        this.publish();
    }

    get now() {
        return this.scene.now;
    }

    get multiplier() {
        return Math.min(COMBO.maxMultiplier, 1 + Math.floor(this.count / COMBO.killsPerLevel));
    }

    // Registra una muerte y devuelve el multiplicador a aplicar
    kill() {
        this.count = this.now <= this.expiresAt ? this.count + 1 : 1;
        this.expiresAt = this.now + COMBO.window;
        this.best = Math.max(this.best, this.count);
        this.publish();
        return this.multiplier;
    }

    break() {
        if (this.count === 0) return;
        this.count = 0;
        this.publish();
    }

    update() {
        if (this.count > 0 && this.now > this.expiresAt) this.break();
    }

    publish() {
        this.scene.registry.set('comboExpires', this.expiresAt);
        this.scene.registry.set('combo', this.count);
    }
}
