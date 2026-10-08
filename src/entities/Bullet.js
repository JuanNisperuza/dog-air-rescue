import Phaser from 'phaser';
import { BULLET } from '../config/constants.js';

const MARGIN = 20;

export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fx', 'fx_bone_0001');
    }

    fire(x, y, angle = 0) {
        this.enableBody(true, x, y, true, true);
        this.body.setSize(26, 12, true);
        this.play('fx_bone', true);
        this.setAngle(angle);
        this.setScale(1.7, 0.6);

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
