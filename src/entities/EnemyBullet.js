import Phaser from 'phaser';

// Bala enemiga. Igual que Bullet, pero en cualquier dirección y velocidad.
const MARGIN = 30;
const SIZE = 22;    // tamaño de la textura (BootScene)
const RADIUS = 8;   // hitbox un poco más chica que el dibujo: se siente justo

export default class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy_bullet');
    }

    // angle en grados (0 = derecha, 180 = izquierda), speed en px/s
    fire(x, y, angle, speed) {
        this.enableBody(true, x, y, true, true);
        if (!this.body.isCircle) this.body.setCircle(RADIUS, SIZE / 2 - RADIUS, SIZE / 2 - RADIUS);
        this.scene.physics.velocityFromAngle(angle, speed, this.body.velocity);
    }

    kill() {
        this.disableBody(true, true);
    }

    update() {
        const { width, height } = this.scene.scale;
        if (this.x < -MARGIN || this.x > width + MARGIN || this.y < -MARGIN || this.y > height + MARGIN) {
            this.kill();
        }
    }
}
