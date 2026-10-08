import Phaser from 'phaser';
import { SKINS } from '../config/skins.js';
import { PLAYER } from '../config/constants.js';
import { ENEMY_ATLAS } from '../config/enemyTypes.js';
import { createEnemyAnimations } from '../entities/Enemy.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.createLoadingBar();

        const skin = SKINS[PLAYER.skin];
        this.load.multiatlas(skin.atlas, `assets/atlas/${skin.atlas}.json`, 'assets/atlas');

        this.load.multiatlas(ENEMY_ATLAS, `assets/atlas/${ENEMY_ATLAS}.json`, 'assets/atlas');

        this.load.multiatlas('fx', 'assets/atlas/fx.json', 'assets/atlas');
        this.load.multiatlas('boss', 'assets/atlas/boss.json', 'assets/atlas');

        for (const key of ['bg_sky', 'bg_far', 'bg_mid', 'bg_near']) {
            this.load.image(key, `assets/bg/${key}.webp`);
        }
    }

    create() {
        this.createPlayerAnimations();
        createEnemyAnimations(this.anims);
        this.createFxAnimations();
        this.makeCloudTexture();
        this.makeSparkTexture();
        this.makeParticleTexture();
        this.makeHeartTextures();
        this.makeRingTexture();
        this.makeVignetteTexture();
        this.makeSpeedLineTexture();
        this.makeBirdTextures();
        this.makePropellerTexture();

        this.scene.launch('TransitionScene');
        this.scene.start('MenuScene');
    }

    createLoadingBar() {
        const { width, height } = this.scale;
        const barWidth = 360;
        this.cameras.main.setBackgroundColor('#1b1410');

        this.add.text(width / 2, height / 2 - 40, 'LOADING', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '28px', color: '#ffd54f'
        }).setOrigin(0.5);
        this.add.rectangle(width / 2, height / 2, barWidth + 8, 26).setStrokeStyle(3, 0xffd54f);
        const fill = this.add.rectangle(width / 2 - barWidth / 2, height / 2, 1, 18, 0xffd54f).setOrigin(0, 0.5);

        this.load.on('progress', (value) => fill.setSize(Math.max(1, barWidth * value), 18));
    }

    createFxAnimations() {
        const anim = (key, atlas, frames, frameRate, repeat = 0) => {
            this.anims.create({
                key,
                frames: frames.map((n) => ({ key: atlas, frame: `${key}_${String(n).padStart(4, '0')}` })),
                frameRate,
                repeat
            });
        };
        anim('fx_boom', 'fx', [1, 2, 3, 4, 5, 6, 7], 18);
        anim('fx_spark', 'fx', [1, 2, 3, 4], 30);
        anim('fx_puff', 'fx', [1, 2, 3], 12);
        anim('fx_bone', 'fx', [1, 3, 2, 4, 2, 3], 18, -1);
        anim('fx_yarn', 'fx', [1, 2, 3, 4], 10, -1);
        anim('pup_bubble', 'fx', [1, 2, 3, 4], 6, -1);
        anim('pup_happy', 'fx', [1, 2, 3, 4], 10, -1);
        anim('boss_idle', 'boss', [1, 2, 3, 4], 7, -1);
        anim('boss_attack', 'boss', [1, 2, 3, 4], 12);
        anim('boss_angry', 'boss', [1, 2, 3, 4], 8, -1);
        anim('boss_defeated', 'boss', [1, 2, 3, 4], 5);
    }

    createTexture(key, width, height, drawFn) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        drawFn(g);
        g.generateTexture(key, width, height);
        g.destroy();
    }

    createPlayerAnimations() {
        const LOOPING = ['idle_straight', 'idle_up', 'idle_down', 'ghost', 'happy'];
        const skin = SKINS[PLAYER.skin];

        for (const [anim, def] of Object.entries(skin.anims)) {
            const source = typeof def === 'number' ? anim : def.from;
            const numbers = typeof def === 'number' ? Array.from({ length: def }, (_, i) => i + 1) : def.frames;
            this.anims.create({
                key: `${PLAYER.skin}_${anim}`,
                frames: numbers.map((n) => ({
                    key: skin.atlas,
                    frame: `${skin.framePrefix}${source}_${String(n).padStart(4, '0')}`
                })),
                frameRate: def.fps ?? skin.fps,
                repeat: LOOPING.includes(anim) ? -1 : 0
            });
        }
    }

    makeCloudTexture() {
        this.createTexture('clouds', 512, 300, (g) => {
            g.fillStyle(0xffffff, 0.9);
            g.fillEllipse(90, 70, 140, 50);
            g.fillEllipse(130, 55, 90, 50);
            g.fillEllipse(360, 200, 180, 60);
            g.fillEllipse(400, 180, 100, 55);
            g.fillEllipse(250, 270, 120, 40);
        });
    }

    makeParticleTexture() {
        this.createTexture('particle', 10, 10, (g) => {
            g.fillStyle(0xffffff);
            g.fillCircle(5, 5, 5);
        });
    }

    makeHeartTextures() {
        const shape = (g, inset) => {
            const r = 9 - inset;
            g.fillCircle(9, 10, r);
            g.fillCircle(23, 10, r);
            g.fillTriangle(1 + inset * 1.2, 13, 31 - inset * 1.2, 13, 16, 28 - inset * 1.4);
        };
        this.createTexture('heart', 32, 30, (g) => {
            g.fillStyle(0x3e0d0d);
            shape(g, 0);
            g.fillStyle(0xe53935);
            shape(g, 2);
            g.fillStyle(0xff8a80);
            g.fillCircle(9, 8, 3);
        });
        this.createTexture('heart_empty', 32, 30, (g) => {
            g.fillStyle(0x3e0d0d, 0.9);
            shape(g, 0);
            g.fillStyle(0x5d4037, 0.55);
            shape(g, 2);
        });
    }

    makeRingTexture() {
        this.createTexture('ring', 128, 128, (g) => {
            g.lineStyle(10, 0xffffff);
            g.strokeCircle(64, 64, 58);
        });
    }

    makeVignetteTexture() {
        const { width, height } = this.scale;
        const texture = this.textures.createCanvas('vignette', width, height);
        const ctx = texture.getContext();
        const gradient = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.62);
        gradient.addColorStop(0, 'rgba(255,0,0,0)');
        gradient.addColorStop(1, 'rgba(200,0,0,0.85)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        texture.refresh();
    }

    makePropellerTexture() {
        this.createTexture('propblur', 16, 84, (g) => {
            g.fillStyle(0xffffff, 0.18);
            g.fillEllipse(8, 42, 14, 84);
            g.fillStyle(0xffffff, 0.35);
            g.fillEllipse(8, 42, 8, 70);
            g.fillStyle(0x6d4c41, 0.55);
            g.fillRect(6, 4, 4, 30);
            g.fillRect(6, 50, 4, 30);
        });
    }

    makeSpeedLineTexture() {
        this.createTexture('speedline', 40, 3, (g) => {
            g.fillStyle(0xffffff);
            g.fillRect(0, 0, 40, 3);
        });
    }

    makeBirdTextures() {
        this.createTexture('bird0', 26, 14, (g) => {
            g.lineStyle(3, 0x3e2723);
            g.beginPath(); g.moveTo(1, 2); g.lineTo(13, 10); g.lineTo(25, 2); g.strokePath();
        });
        this.createTexture('bird1', 26, 14, (g) => {
            g.lineStyle(3, 0x3e2723);
            g.beginPath(); g.moveTo(1, 9); g.lineTo(13, 6); g.lineTo(25, 9); g.strokePath();
        });
    }

    makeSparkTexture() {
        this.createTexture('spark', 32, 32, (g) => {
            g.fillStyle(0xffffff);
            g.fillCircle(16, 16, 16);
        });
    }
}
