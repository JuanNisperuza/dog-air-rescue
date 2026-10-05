import Phaser from 'phaser';

// Transición tipo "iris" de dibujo animado: un círculo que se cierra sobre un punto
// y se vuelve a abrir en la escena siguiente. Vive encima de todas las demás escenas.
const CLOSE_TIME = 450;
const OPEN_TIME = 550;

export default class TransitionScene extends Phaser.Scene {
    constructor() {
        super('TransitionScene');
    }

    create() {
        const { width, height } = this.scale;
        this.maxRadius = Math.hypot(width, height);
        this.useMask = this.renderer.type === Phaser.WEBGL;

        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0).setVisible(false);

        if (this.useMask) {
            // Máscara invertida: el círculo es el "agujero" por donde se ve el juego
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

    // Cierra el iris sobre (x, y) y llama a onDone cuando la pantalla queda negra
    close(x, y, onDone) {
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

    // Abre el iris desde (x, y)
    open(x, y) {
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

// Atajos para usar desde cualquier escena

export function irisOut(scene, x, y, onDone) {
    const transition = scene.scene.get('TransitionScene');
    if (transition?.overlay) transition.close(x, y, onDone);
    else onDone?.();
}

export function irisIn(scene, x, y) {
    const transition = scene.scene.get('TransitionScene');
    if (transition?.overlay) transition.open(x, y);
}
