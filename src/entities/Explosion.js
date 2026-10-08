import Phaser from 'phaser';

const BASE_SCALE = 0.8;

export default class Explosion extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fx', 'fx_boom_0001');
        this.setDepth(10);
        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.kill());
    }

    boom(x, y, size = 1) {
        this.setPosition(x, y);
        this.setScale(BASE_SCALE * size * Phaser.Math.FloatBetween(0.9, 1.1));
        this.setAngle(Phaser.Math.Between(-30, 30));
        this.setActive(true).setVisible(true);
        this.play('fx_boom');
    }

    kill() {
        this.stop();
        this.setActive(false).setVisible(false);
    }
}
