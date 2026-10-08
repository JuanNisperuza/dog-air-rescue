import Phaser from 'phaser';
import { JUICE } from '../config/constants.js';
import { settings } from './settings.js';
import Corpse from '../entities/Corpse.js';

const POPUP_POOL = 12;
const POPUP_LIFE = 650;
const POPUP_RISE = 45;
const MUZZLE_TIME = 45;
const CORPSE_POOL = 16;
const HIT_POOL = 10;
const PUFFS = ['fx_puff_0001', 'fx_puff_0002', 'fx_puff_0003'];
const EMOTE_POOL = 6;
const EMOTE_LIFE = 700;
const COMIC_POOL = 5;
const COMIC_WORDS = {
    pop: ['POP!', 'PLOP!'],
    spin: ['BAM!', 'POW!', 'WHAM!'],
    chain: ['KABOOM!']
};

const POPUP_COLORS = ['#fff176', '#ffd54f', '#ffab40', '#ff7043', '#ff4081'];

export default class Effects {
    constructor(scene, sfx) {
        this.scene = scene;
        this.sfx = sfx;
        this.resumeAt = 0;

        this.smoke = scene.add.particles(0, 0, 'fx', {
            frame: PUFFS,
            speedX: { min: -160, max: -80 },
            speedY: { min: -25, max: 15 },
            lifespan: { min: 450, max: 700 },
            scale: { start: 0.25, end: 0.6 },
            rotate: { min: -40, max: 40 },
            alpha: { start: 0.75, end: 0 },
            tint: [0xe0e0e0, 0xbdbdbd, 0x9e9e9e],
            emitting: false
        });

        this.hits = [];
        for (let i = 0; i < HIT_POOL; i++) {
            const spark = scene.add.sprite(0, 0, 'fx', 'fx_spark_0001').setDepth(11).setVisible(false);
            spark.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spark.setVisible(false));
            this.hits.push(spark);
        }
        this.nextHit = 0;

        this.corpses = scene.add.group({ classType: Corpse, maxSize: CORPSE_POOL, runChildUpdate: true });
        this.corpses.createMultiple({ key: 'particle', quantity: CORPSE_POOL, active: false, visible: false });

        this.sparks = scene.add.particles(0, 0, 'particle', {
            speed: { min: 90, max: 240 },
            angle: { min: 120, max: 240 },
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

        this.confetti = scene.add.particles(0, 0, 'particle', {
            speed: { min: 140, max: 320 },
            lifespan: { min: 500, max: 900 },
            scaleX: { start: 1.2, end: 0.2 },
            scaleY: { start: 0.5, end: 0.1 },
            gravityY: 500,
            rotate: { min: 0, max: 360 },
            tint: [0xff9a5c, 0xffe0b2, 0xff7043, 0xfff3e0],
            emitting: false
        }).setDepth(11);

        const { width, height } = scene.scale;
        this.speedLines = scene.add.particles(0, 0, 'speedline', {
            x: width + 30,
            y: { min: 20, max: height - 20 },
            speedX: { min: -1500, max: -1000 },
            lifespan: 700,
            scaleX: { min: 0.6, max: 1.8 },
            alpha: { start: 0.45, end: 0 },
            frequency: 30,
            emitting: false
        });
        this.speedLinesOn = false;

        this.emotes = [];
        for (let i = 0; i < EMOTE_POOL; i++) {
            const text = scene.add.text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '30px', color: '#ffeb3b', stroke: '#2b1d14', strokeThickness: 6
            }).setOrigin(0.5, 1).setDepth(13).setVisible(false);
            this.emotes.push(text);
        }
        this.nextEmote = 0;

        this.comics = [];
        for (let i = 0; i < COMIC_POOL; i++) {
            const text = scene.add.text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '34px', color: '#ffeb3b', stroke: '#b71c1c', strokeThickness: 8
            }).setOrigin(0.5).setDepth(12).setVisible(false);
            this.comics.push(text);
        }
        this.nextComic = 0;

        this.muzzle = scene.add.image(0, 0, 'particle')
            .setTint(0xfff59d)
            .setBlendMode('ADD')
            .setDepth(9)
            .setVisible(false);
        this.muzzleUntil = 0;

        this.popups = [];
        for (let i = 0; i < POPUP_POOL; i++) {
            const text = scene.add.text(0, 0, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '20px',
                color: POPUP_COLORS[0],
                stroke: '#000000',
                strokeThickness: 5
            }).setOrigin(0.5).setDepth(12).setVisible(false);
            text.life = 0;
            text.startY = 0;
            text.baseScale = 1;
            this.popups.push(text);
        }
        this.nextPopup = 0;
    }

    attachEngineSmoke(player, offsetX, offsetY) {
        this.engine = this.scene.add.particles(0, 0, 'fx', {
            frame: PUFFS,
            speedX: { min: -170, max: -100 },
            speedY: { min: -18, max: 18 },
            lifespan: { min: 380, max: 560 },
            scale: { start: 0.12, end: 0.38 },
            rotate: { min: -60, max: 60 },
            alpha: { start: 0.85, end: 0 },
            tint: [0xb0b0b0, 0x9a9a9a, 0x808080],
            frequency: 45
        });
        this.engine.startFollow(player, offsetX, offsetY);
        this.scene.children.moveBelow(this.engine, player);
        return this.engine;
    }

    update(now, delta) {
        if (this.resumeAt && now >= this.resumeAt) {
            this.resumeAt = 0;
            if (!this.scene.isGameOver) this.scene.physics.world.resume();
        }

        if (this.muzzle.visible && now >= this.muzzleUntil) {
            this.muzzle.setVisible(false);
        }

        for (const emote of this.emotes) {
            if (!emote.visible) continue;
            emote.life += delta;
            const target = emote.target;
            if (emote.life >= EMOTE_LIFE || !target.active) {
                emote.setVisible(false);
                continue;
            }
            const top = target.y - target.displayHeight * target.originY;
            emote.setPosition(target.x, top - 4 + Math.sin(emote.life * 0.03) * 3);
        }

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
            const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.6 : 1.2 - (t - 0.15) * 0.25;
            text.setScale(pop * text.baseScale);
        }
    }

    hitStop(ms) {
        if (!JUICE.hitStop || ms <= 0 || this.scene.isGameOver) return;
        this.scene.physics.world.pause();
        this.resumeAt = Math.max(this.resumeAt, this.scene.now + ms);
    }

    shake(duration, intensity) {
        if (!JUICE.screenShake || !settings.shake) return;
        this.scene.cameras.main.shake(duration, intensity);
    }

    popup(x, y, value, multiplier = 1) {
        this.label(x, y, '+' + value, POPUP_COLORS[Math.min(multiplier, POPUP_COLORS.length) - 1], 1 + (multiplier - 1) * 0.15);
    }

    label(x, y, message, color = '#ffffff', scale = 1) {
        const text = this.popups[this.nextPopup];
        this.nextPopup = (this.nextPopup + 1) % POPUP_POOL;
        text.setText(message);
        text.setColor(color);
        text.baseScale = scale;
        text.setPosition(x, y).setAlpha(1).setScale(0.6 * text.baseScale).setVisible(true);
        text.startY = y;
        text.life = 0;
    }

    emote(target, text, color = '#ffeb3b', scale = 1) {
        const emote = this.emotes[this.nextEmote];
        this.nextEmote = (this.nextEmote + 1) % EMOTE_POOL;
        emote.setText(text).setColor(color).setVisible(true).setAlpha(1);
        emote.target = target;
        emote.life = 0;
        this.scene.tweens.killTweensOf(emote);
        emote.setScale(0).setAngle(-15);
        this.scene.tweens.add({ targets: emote, scale, angle: 0, duration: 250, ease: 'Back.Out' });
    }

    comic(x, y, word) {
        const text = this.comics[this.nextComic];
        this.nextComic = (this.nextComic + 1) % COMIC_POOL;
        this.scene.tweens.killTweensOf(text);
        const big = word.length > 5;
        text.setText(word).setPosition(x + Phaser.Math.Between(-20, 20), y - 50).setVisible(true).setAlpha(1)
            .setAngle(Phaser.Math.Between(-18, 18)).setScale(0)
            .setFontSize(big ? 52 : 34);
        this.scene.tweens.chain({
            targets: text,
            tweens: [
                { scale: 1.3, duration: 120, ease: 'Back.Out' },
                { scale: 1, duration: 120 },
                { alpha: 0, y: text.y - 30, scale: 0.8, duration: 300, delay: 250 }
            ],
            onComplete: () => text.setVisible(false)
        });
    }

    setSpeedLines(on) {
        if (on === this.speedLinesOn) return;
        this.speedLinesOn = on;
        if (on) this.speedLines.start();
        else this.speedLines.stop();
    }

    aberration(amount) {
        const found = this.scene.cameras.main.getPostPipeline('OldFilm');
        const pipeline = Array.isArray(found) ? found[0] : found;
        if (!pipeline) return;
        this.scene.tweens.killTweensOf(pipeline);
        pipeline.aberration = amount;
        this.scene.tweens.add({ targets: pipeline, aberration: 0, duration: 450, ease: 'Quad.Out' });
    }

    smokePuff(x, y) {
        this.smoke.emitParticleAt(x, y, 1);
    }

    smallBoom(x, y) {
        this.scene.explode(x, y, 1.3);
        this.debris.explode(8, x, y);
        this.sfx.explosion(false);
        this.shake(90, 0.005);
    }

    bigBoom(x, y) {
        this.scene.explode(x, y, 3);
        this.debris.explode(40, x, y);
        this.sfx.explosion(true);
        this.shake(320, 0.016);
        this.hitStop(90);
        this.scene.cameras.main.flash(140, 255, 240, 200);
        this.aberration(0.7);
        this.comic(x, y, Phaser.Utils.Array.GetRandom(COMIC_WORDS.chain));
    }

    playerShoot(x, y) {
        this.muzzle.setPosition(x, y).setScale(Phaser.Math.FloatBetween(2.2, 3)).setVisible(true);
        this.muzzleUntil = this.scene.now + MUZZLE_TIME;
        this.sfx.shoot();
    }

    enemyHit(x, y) {
        this.sparks.explode(3, x, y);
        const spark = this.hits[this.nextHit];
        this.nextHit = (this.nextHit + 1) % HIT_POOL;
        spark.setPosition(x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-8, 8))
            .setScale(Phaser.Math.FloatBetween(0.45, 0.65))
            .setAngle(Phaser.Math.Between(0, 360))
            .setVisible(true)
            .play('fx_spark');
        this.sfx.hit();
    }

    // points = 0 when it dies by crashing into the player
    enemyKilled(enemy, points = 0, multiplier = 1) {
        const { x, y } = enemy;
        const style = enemy.stat('death') ?? 'spin';

        if (points > 0) this.popup(x, y - 20, points, multiplier);

        const corpse = this.corpses.get(x, y);
        if (corpse) corpse.start(enemy, style, this);

        if (style === 'chain') {
            this.scene.explode(x, y, 1.2);
            this.sfx.explosion(false);
            this.shake(120, 0.006);
            this.hitStop(60);
            return;
        }

        this.scene.explode(x, y, 1);
        if (points > 0 && (Math.random() < 0.35 || enemy.stat('points') >= 25)) {
            this.comic(x, y, Phaser.Utils.Array.GetRandom(COMIC_WORDS[style] ?? COMIC_WORDS.spin));
        }
        if (style === 'pop') {
            this.confetti.explode(16, x, y - 25);
            this.sfx.pop();
        } else {
            this.debris.explode(12, x, y);
            this.sfx.explosion(false);
        }
        this.shake(70, 0.003);
        this.hitStop(22);
    }

    superBlast(x, y) {
        for (let i = 0; i < 2; i++) {
            const ring = this.scene.add.image(x, y, 'ring')
                .setTint(i ? 0xffffff : 0xffd54f).setBlendMode('ADD').setDepth(12).setScale(0.2);
            this.scene.tweens.add({
                targets: ring,
                scale: 16,
                alpha: 0,
                duration: 650,
                delay: i * 90,
                ease: 'Cubic.Out',
                onComplete: () => ring.destroy()
            });
        }
        this.sparks.explode(30, x, y);
        this.sfx.bark();
        this.shake(400, 0.02);
        this.scene.cameras.main.flash(220, 255, 245, 200);
        this.aberration(1);
    }

    superReady() {
        this.sfx.superReady();
    }

    bulletCleared(x, y) {
        this.sparks.emitParticleAt(x, y, 2);
    }

    rescued(x, y, healed) {
        this.confetti.explode(20, x, y);
        this.label(x, y - 30, healed ? 'RESCUED! +1 HP' : 'RESCUED!', '#80d8ff', 1.1);
        this.sfx.rescue();
    }

    poweredUp(x, y, kind) {
        this.sparks.explode(14, x, y);
        this.label(x, y - 30, kind.toUpperCase() + '!', '#ffd54f', 1.1);
        this.sfx.powerUp();
    }

    shieldBroken(x, y) {
        this.sparks.explode(20, x, y);
        this.shake(120, 0.006);
        this.sfx.shieldBreak();
    }

    bossHit(x, y) {
        this.enemyHit(x, y);
    }

    comboUp(level) {
        this.sfx.comboUp(level);
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
        this.aberration(1);
        this.sfx.playerHurt();
    }

    playerDied(x, y) {
        this.engine?.stop();
        this.setSpeedLines(false);
        this.debris.explode(45, x, y);
        this.shake(500, 0.022);
        this.scene.cameras.main.flash(300, 255, 255, 255);
        this.sfx.gameOver();
    }
}
