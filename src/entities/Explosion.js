import Phaser from 'phaser';

// Explosión en pool. Se anima a mano en update() para no crear un tween por explosión.
const DURATION = 300;   // ms
const START_SCALE = 0.5;
const END_SCALE = 3;

export default class Explosion extends Phaser.GameObjects.Image {
    constructor(scene, x, y) {
        super(scene, x, y, 'spark');
        this.elapsed = 0;
        this.size = 1;
        this.setDepth(10);       // por encima de aviones y enemigos
    }

    // size: multiplicador de tamaño
    play(x, y, tint = 0xffa500, size = 1) {
        this.size = size;
        this.setPosition(x, y);
        this.setTint(tint);
        this.setScale(START_SCALE * size);
        this.setAlpha(1);
        this.setActive(true).setVisible(true);
        this.elapsed = 0;
    }

    update(time, delta) {
        this.elapsed += delta;
        const t = Math.min(this.elapsed / DURATION, 1);

        this.setScale((START_SCALE + (END_SCALE - START_SCALE) * t) * this.size);
        this.setAlpha(1 - t);

        if (t >= 1) this.kill();
    }

    kill() {
        this.setActive(false).setVisible(false);
    }
}
