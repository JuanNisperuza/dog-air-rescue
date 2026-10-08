import Phaser from 'phaser';
import Sfx from '../systems/Sfx.js';

const CLOSE_TIME = 450;
const OPEN_TIME = 550;

export default class TransitionScene extends Phaser.Scene {
    constructor() {
        super('TransitionScene');
    }

    create() {
        const { width, height } = this.scale;
        this.sfx = new Sfx(this);
        this.maxRadius = Math.hypot(width, height);
        this.useMask = this.renderer.type === Phaser.WEBGL;

        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0).setVisible(false);

        if (this.useMask) {
            this.circle = this.make.graphics({ x: 0, y: 0 }, false);
            const mask = this.circle.createGeometryMask();
            mask.setInvertAlpha(true);
            this.overlay.setMask(mask);
        }
        this.radius = { value: 0 };
    }

    draw(x, y) {
        if (!this.useMask) {
            this.overlay.setAlpha(1 - this.radius.value / this.maxRadius);
            return;
        }
        this.circle.clear();
        this.circle.fillStyle(0xffffff);
        this.circle.fillCircle(x, y, Math.max(this.radius.value, 0.01));
    }

    close(x, y, onDone) {
        this.sfx.whoosh(false);
        this.scene.bringToTop();
        this.tweens.killTweensOf(this.radius);
        this.overlay.setVisible(true);
        this.radius.value = this.maxRadius;
        this.tweens.add({
            targets: this.radius,
            value: 0,
            duration: CLOSE_TIME,
            ease: 'Cubic.In',
            onUpdate: () => this.draw(x, y),
            onComplete: () => {
                this.draw(x, y);
                onDone?.();
            }
        });
    }

    open(x, y) {
        this.sfx.whoosh(true);
        this.scene.bringToTop();
        this.tweens.killTweensOf(this.radius);
        this.overlay.setVisible(true);
        this.radius.value = 0;
        this.draw(x, y);
        this.tweens.add({
            targets: this.radius,
            value: this.maxRadius,
            duration: OPEN_TIME,
            ease: 'Cubic.Out',
            onUpdate: () => this.draw(x, y),
            onComplete: () => this.overlay.setVisible(false)
        });
    }
}

export function irisOut(scene, x, y, onDone) {
    const transition = scene.scene.get('TransitionScene');
    if (transition?.overlay) transition.close(x, y, onDone);
    else onDone?.();
}

export function irisIn(scene, x, y) {
    const transition = scene.scene.get('TransitionScene');
    if (transition?.overlay) transition.open(x, y);
}
