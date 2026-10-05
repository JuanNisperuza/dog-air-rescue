import Phaser from 'phaser';
import { SKINS } from '../config/skins.js';
import { PLAYER } from '../config/constants.js';
import { ENEMY_ATLAS } from '../config/enemyTypes.js';
import { createEnemyAnimations } from '../entities/Enemy.js';

// Carga los assets, crea las animaciones y dibuja las texturas que todavía no tienen arte.
export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Atlas generados con npm run slice + npm run atlas (están en /public).
        // Del jugador solo se carga el skin en uso.
        const skin = SKINS[PLAYER.skin];
        this.load.multiatlas(skin.atlas, `assets/atlas/${skin.atlas}.json`, 'assets/atlas');

        this.load.multiatlas(ENEMY_ATLAS, `assets/atlas/${ENEMY_ATLAS}.json`, 'assets/atlas');

        // Capas del fondo (npm run parallax)
        for (const key of ['bg_sky', 'bg_far', 'bg_mid', 'bg_near']) {
            this.load.image(key, `assets/bg/${key}.webp`);
        }
    }

    create() {
        this.createPlayerAnimations();
        createEnemyAnimations(this.anims);
        this.makeBulletTexture();
        this.makeEnemyBulletTexture();
        this.makeCloudTexture();
        this.makeSparkTexture();
        this.makeParticleTexture();

        this.scene.start('MenuScene');
    }

    // Dibuja con Graphics y lo guarda como textura
    createTexture(key, width, height, drawFn) {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        drawFn(g);
        g.generateTexture(key, width, height);
        g.destroy();
    }

    createPlayerAnimations() {
        // Claves tipo "dog_idle_up"; frames tipo "dog_plane_idle_up_0001"
        const LOOPING = ['idle_straight', 'idle_up', 'idle_down', 'ghost'];
        const skin = SKINS[PLAYER.skin];

        for (const [anim, frameCount] of Object.entries(skin.anims)) {
            this.anims.create({
                key: `${PLAYER.skin}_${anim}`,
                frames: this.anims.generateFrameNames(skin.atlas, {
                    prefix: `${skin.framePrefix}${anim}_`,
                    start: 1,
                    end: frameCount,
                    zeroPad: 4      // 1 → "0001"
                }),
                frameRate: skin.fps,
                repeat: LOOPING.includes(anim) ? -1 : 0  // -1 = bucle
            });
        }
    }

    makeBulletTexture() {
        this.createTexture('bullet', 18, 8, (g) => {
            g.fillStyle(0xfff176);
            g.fillEllipse(9, 4, 18, 8);
        });
    }

    // El borde oscuro la hace visible tanto sobre el cielo como sobre las nubes
    makeEnemyBulletTexture() {
        this.createTexture('enemy_bullet', 22, 22, (g) => {
            g.fillStyle(0x6a0032);
            g.fillCircle(11, 11, 11);
            g.fillStyle(0xff2e88);
            g.fillCircle(11, 11, 9);
            g.fillStyle(0xffb3d1);
            g.fillCircle(11, 11, 5);
            g.fillStyle(0xffffff);
            g.fillCircle(10, 10, 2.5);
        });
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

    // Partícula pequeña (chispas, escombros, destello del arma)
    makeParticleTexture() {
        this.createTexture('particle', 10, 10, (g) => {
            g.fillStyle(0xffffff);
            g.fillCircle(5, 5, 5);
        });
    }

    makeSparkTexture() {
        this.createTexture('spark', 32, 32, (g) => {
            g.fillStyle(0xffffff);
            g.fillCircle(16, 16, 16);
        });
    }
}
