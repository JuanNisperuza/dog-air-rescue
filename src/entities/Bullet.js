import Phaser from 'phaser';
import { BULLET } from '../config/constants.js';

// Bala del jugador: un hueso que gira. Sale de un pool: se reutiliza en vez de crearse y destruirse.
const MARGIN = 20; // px fuera de pantalla antes de devolverla al pool

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fx', 'fx_bone_0001');
    }

    // angle en grados: 0 = derecha, negativo = arriba, positivo = abajo
    fire(x, y, angle = 0) {
        this.enableBody(true, x, y, true, true); // reset, activa y muestra
        this.body.setSize(26, 12, true);          // hitbox más chica que el dibujo
        this.play('fx_bone', true);
        this.setAngle(angle);                    // que la bala apunte hacia donde va
        this.setScale(1.7, 0.6);                 // sale estirada y vuelve a su forma

        this.scene.physics.velocityFromAngle(angle, BULLET.speed, this.body.velocity);
    }

    kill() {
        this.stop();
        this.disableBody(true, true);
    }

    update() {
        if (this.scaleX > 1) this.setScale(Math.max(1, this.scaleX - 0.12), Math.min(1, this.scaleY + 0.08));

        const { width, height } = this.scene.scale;
        if (this.x > width + MARGIN || this.y < -MARGIN || this.y > height + MARGIN) {
            this.kill();
        }
    }
}
