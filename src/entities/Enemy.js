import Phaser from 'phaser';
import { ENEMY_TYPES, ENEMY_ATLAS } from '../config/enemyTypes.js';
import { BEHAVIORS } from './enemyBehaviors.js';

const FLASH_TIME = 60;
const OFFSCREEN_MARGIN = 140;
const LOOPING = ['fly', 'dash'];

export function createEnemyAnimations(anims) {
    for (const type of Object.values(ENEMY_TYPES)) {
        const { prefix, fps } = type.sprite;
        for (const [name, frameCount] of Object.entries(type.sprite.anims)) {
            anims.create({
                key: prefix + name,
                frames: anims.generateFrameNames(ENEMY_ATLAS, {
                    prefix: `${prefix}${name}_`, start: 1, end: frameCount, zeroPad: 4
                }),
                frameRate: fps,
                repeat: LOOPING.includes(name) ? -1 : 0
            });
        }
    }
}

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, ENEMY_ATLAS, 'cat_flyer_fly_0001');
        this.hp = 0;
        this.flashUntil = 0;
        this.flashing = false;
    }

    spawn(x, y, typeKey, params, difficulty) {
        this.type = ENEMY_TYPES[typeKey];
        this.params = params;
        this.difficulty = difficulty;
        this.behavior = BEHAVIORS[this.type.behavior];

        const sprite = this.type.sprite;
        this.setTexture(ENEMY_ATLAS, `${sprite.prefix}fly_0001`);
        this.enableBody(true, x, y, true, true);
        this.setAngle(0);
        this.clearFlash();

        const { x: cx, y: cy } = sprite.center;
        this.setOrigin(cx / this.width, cy / this.height);

        const r = this.stat('radius');
        this.body.setCircle(r, cx - r, cy - r);

        this.playAnim('fly');

        this.breathPhase = Math.random() * Math.PI * 2;
        this.punch = 0;
        this.setScale(1);

        this.hp = this.stat('hp') * difficulty.hp;
        this.speed = this.stat('speed') * difficulty.speed;
        this.state = null;
        this.spawnTime = this.scene.now;

        this.behavior.spawn(this, this.spawnTime);
    }

    playAnim(name) {
        if (!this.type.sprite.anims[name]) return;
        this.anims.chain();
        this.play(this.type.sprite.prefix + name);
    }

    playOnce(name) {
        if (!this.type.sprite.anims[name]) return;
        this.anims.chain();
        this.play(this.type.sprite.prefix + name);
        this.anims.chain(this.type.sprite.prefix + 'fly');
    }

    get frameTime() {
        return 1000 / this.type.sprite.fps;
    }

    get muzzleX() { return this.x + (this.type.sprite.muzzle?.x ?? -this.width / 2); }
    get muzzleY() { return this.y + (this.type.sprite.muzzle?.y ?? 0); }

    stat(name) {
        const value = this.params[name];
        return value !== undefined ? value : this.type[name];
    }

    update(time, delta) {
        const now = this.scene.now;
        if (!this.scene.isGameOver) {
            this.behavior.update(this, now, delta);
        }

        if (this.flashing && now >= this.flashUntil) {
            this.clearFlash();
        }

        this.punch = Math.max(0, this.punch - delta / 140);
        const breathe = Math.sin(now * 0.009 + this.breathPhase) * 0.035;
        this.setScale(1 + breathe + this.punch * 0.22, 1 - breathe - this.punch * 0.16);

        // Not off the right edge, since that is where they spawn
        const { height } = this.scene.scale;
        if (this.x < -OFFSCREEN_MARGIN || this.y < -OFFSCREEN_MARGIN || this.y > height + OFFSCREEN_MARGIN) {
            this.kill();
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.punch = 1;

        this.setTintFill(0xffffff);
        this.flashing = true;
        this.flashUntil = this.scene.now + FLASH_TIME;

        return this.hp <= 0;
    }

    clearFlash() {
        this.flashing = false;
        this.clearTint();
    }

    kill() {
        this.disableBody(true, true);
    }
}
