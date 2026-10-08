import Phaser from 'phaser';

const MARGIN = 30;
const RADIUS = 9;

export default class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fx', 'fx_yarn_0001');
    }

    fire(x, y, angle, speed) {
        this.enableBody(true, x, y, true, true);
        if (!this.body.isCircle) this.body.setCircle(RADIUS, this.width / 2 - RADIUS, this.height / 2 - RADIUS);
        this.play('fx_yarn', true);
        this.scene.physics.velocityFromAngle(angle, speed, this.body.velocity);
        this.born = this.scene.now;
        this.setScale(0.3);
    }

    kill() {
        this.stop();
        this.disableBody(true, true);
    }

    update() {
        const age = this.scene.now - this.born;
        const grow = Math.min(1, age / 120);
        this.setScale(grow * (1 + Math.sin(age * 0.02) * 0.08));
        this.angle += 6;

        const { width, height } = this.scene.scale;
        if (this.x < -MARGIN || this.x > width + MARGIN || this.y < -MARGIN || this.y > height + MARGIN) {
            this.kill();
        }
    }
}
