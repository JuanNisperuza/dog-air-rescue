import Phaser from 'phaser';
import { RESCUE } from '../config/constants.js';

// Cosas que se recogen al tocarlas: perritos en burbuja y power-ups.
// Flotan hacia la izquierda subiendo y bajando. Salen de un pool, como las balas.
const POWERUP_SPEED = 110;
const BOB_AMPLITUDE = 18;
const BOB_FREQUENCY = 0.003;
const MARGIN = 60;
const MAGNET_RADIUS = 140;   // px: más cerca que esto, vuela hacia el jugador
const MAGNET_SPEED = 420;
const PUPPY_SCALE = 1.35;
const POWERUP_SCALE = 0.85;

export default class Pickup extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'fx', 'pup_bubble_0001');
    }

    // kind: 'puppy' | 'spread' | 'rapid' | 'shield'
    spawn(x, y, kind) {
        this.kind = kind;
        this.enableBody(true, x, y, true, true);
        this.setDepth(8);

        // Perrito: burbuja animada pidiendo ayuda. Power-up: insignia quieta
        const isPuppy = kind === 'puppy';
        if (isPuppy) {
            this.play('pup_bubble');
        } else {
            this.stop();
            this.setTexture('fx', `pu_${kind}`);
        }
        this.baseScale = isPuppy ? PUPPY_SCALE : POWERUP_SCALE;
        const r = Math.min(this.width, this.height) * 0.42;
        this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
        this.setVelocity(-(isPuppy ? RESCUE.speed : POWERUP_SPEED), 0);

        this.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.born = this.scene.now;

        // Aparece con un "pop"
        this.setScale(0);
        this.scene.tweens.add({ targets: this, scale: this.baseScale, duration: 300, ease: 'Back.Out' });
    }

    update() {
        if (!this.active) return;
        const t = this.scene.now - this.born;
        this.setVelocityY(Math.cos(t * BOB_FREQUENCY + this.phase) * BOB_AMPLITUDE * BOB_FREQUENCY * 1000);

        // Imán: si el jugador pasa cerca, lo atrae
        const player = this.scene.player;
        if (player?.active && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < MAGNET_RADIUS) {
            this.scene.physics.moveToObject(this, player, MAGNET_SPEED);
        }

        // Como de gelatina (cuando terminó de aparecer)
        if (t > 300) {
            const jelly = Math.sin(t * 0.01) * 0.06;
            this.setScale(this.baseScale * (1 + jelly), this.baseScale * (1 - jelly));
        }

        // Se balancea un poco, como pidiendo ayuda
        this.angle = Math.sin(t * 0.006) * 8;

        if (this.x < -MARGIN) this.kill();
    }

    kill() {
        this.stop();
        this.disableBody(true, true);
    }
}
