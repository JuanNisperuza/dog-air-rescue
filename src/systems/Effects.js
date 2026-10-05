import Phaser from 'phaser';
import { JUICE } from '../config/constants.js';

// Efectos de impacto: partículas, popups de puntaje, destello del arma, hit-stop
// y temblor de cámara. GameScene avisa qué pasó y aquí se decide cómo se ve.
const POPUP_POOL = 12;
const POPUP_LIFE = 650;     // ms
const POPUP_RISE = 45;      // px que sube
const MUZZLE_TIME = 45;     // ms

export default class Effects {
    constructor(scene, sfx) {
        this.scene = scene;
        this.sfx = sfx;
        this.resumeAt = 0;

        // Partículas
        this.sparks = scene.add.particles(0, 0, 'particle', {
            speed: { min: 90, max: 240 },
            angle: { min: 120, max: 240 },   // hacia atrás (hacia la derecha no, de ahí vienen las balas)
            lifespan: 220,
            scale: { start: 0.9, end: 0 },
            tint: [0xffffff, 0xfff59d, 0xffe082],
            blendMode: 'ADD',
            emitting: false
        }).setDepth(11);

        this.debris = scene.add.particles(0, 0, 'particle', {
            speed: { min: 120, max: 400 },
            lifespan: { min: 350, max: 750 },
            scale: { start: 1.3, end: 0 },
            gravityY: 600,
            rotate: { min: 0, max: 360 },
            tint: [0xffa500, 0xff5722, 0xffeb3b, 0x6d4c41],
            emitting: false
        }).setDepth(11);

        // Destello del arma
        this.muzzle = scene.add.image(0, 0, 'particle')
            .setTint(0xfff59d)
            .setBlendMode('ADD')
            .setDepth(9)
            .setVisible(false);
        this.muzzleUntil = 0;

        // Popups de puntaje (pool)
        this.popups = [];
        for (let i = 0; i < POPUP_POOL; i++) {
            const text = scene.add.text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '20px',
                color: '#fff176',
                stroke: '#000000',
                strokeThickness: 5
            }).setOrigin(0.5).setDepth(12).setVisible(false);
            text.life = 0;
            text.startY = 0;
            this.popups.push(text);
        }
        this.nextPopup = 0;
    }

    update(now, delta) {
        if (this.resumeAt && now >= this.resumeAt) {
            this.resumeAt = 0;
            if (!this.scene.isGameOver) this.scene.physics.world.resume();
        }

        if (this.muzzle.visible && now >= this.muzzleUntil) {
            this.muzzle.setVisible(false);
        }

        // Popups animados a mano (sin tweens)
        for (const text of this.popups) {
            if (!text.visible) continue;
            text.life += delta;
            const t = text.life / POPUP_LIFE;
            if (t >= 1) {
                text.setVisible(false);
                continue;
            }
            text.y = text.startY - POPUP_RISE * t;
            text.setAlpha(1 - t * t);
            text.setScale(t < 0.15 ? 0.6 + (t / 0.15) * 0.6 : 1.2 - (t - 0.15) * 0.25); // "pop" al aparecer
        }
    }

    // Utilidades

    // Congela la física unos ms para que los golpes se sientan
    hitStop(ms) {
        if (!JUICE.hitStop || ms <= 0 || this.scene.isGameOver) return;
        this.scene.physics.world.pause();
        this.resumeAt = Math.max(this.resumeAt, this.scene.time.now + ms);
    }

    shake(duration, intensity) {
        if (!JUICE.screenShake) return;
        this.scene.cameras.main.shake(duration, intensity);
    }

    popup(x, y, value) {
        const text = this.popups[this.nextPopup];
        this.nextPopup = (this.nextPopup + 1) % POPUP_POOL; // round-robin: el más viejo se reutiliza
        text.setText('+' + value);
        text.setPosition(x, y).setAlpha(1).setScale(0.6).setVisible(true);
        text.startY = y;
        text.life = 0;
    }

    // Eventos del juego

    playerShoot(x, y) {
        this.muzzle.setPosition(x, y).setScale(Phaser.Math.FloatBetween(2.2, 3)).setVisible(true);
        this.muzzleUntil = this.scene.time.now + MUZZLE_TIME;
        this.sfx.shoot();
    }

    enemyHit(x, y) {
        this.sparks.explode(4, x, y);
        this.sfx.hit();
    }

    enemyKilled(enemy) {
        const size = enemy.stat('explosionSize') ?? 1;
        const big = size > 1;

        this.debris.explode(big ? 36 : 12, enemy.x, enemy.y);
        this.popup(enemy.x, enemy.y - 20, enemy.stat('points'));
        this.sfx.explosion(big);

        if (big) {
            this.shake(280, 0.014);
            this.hitStop(110);
            this.scene.cameras.main.flash(120, 255, 240, 200);
        } else {
            this.shake(70, 0.003);
            this.hitStop(22);
        }
    }

    enemyShoot() {
        this.sfx.enemyShoot();
    }

    enemyTelegraph() {
        this.sfx.windup();
    }

    playerHit() {
        this.shake(220, 0.014);
        this.hitStop(80);
        this.scene.cameras.main.flash(160, 255, 60, 60);
        this.sfx.playerHurt();
    }

    playerDied(x, y) {
        this.debris.explode(45, x, y);
        this.shake(500, 0.022);
        this.scene.cameras.main.flash(300, 255, 255, 255);
        this.sfx.gameOver();
    }
}
