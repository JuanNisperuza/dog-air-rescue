import Phaser from 'phaser';
import { BULLET } from '../config/constants.js';

// Bala del jugador. Sale de un pool: se reutiliza en vez de crearse y destruirse.
const MARGIN = 20; // px fuera de pantalla antes de devolverla al pool

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');
    }

    // angle en grados: 0 = derecha, negativo = arriba, positivo = abajo
    fire(x, y, angle = 0) {
        this.enableBody(true, x, y, true, true); // reset, activa y muestra
        this.setAngle(angle);                    // que la bala apunte hacia donde va

        this.scene.physics.velocityFromAngle(angle, BULLET.speed, this.body.velocity);
    }

    kill() {
        this.disableBody(true, true);
    }

    update() {
        const { width, height } = this.scene.scale;
        if (this.x > width + MARGIN || this.y < -MARGIN || this.y > height + MARGIN) {
            this.kill();
        }
    }
}
