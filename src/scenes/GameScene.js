import Phaser from 'phaser';
import { PLAYER, BULLET, ENEMY, ENEMY_BULLET, SOUND } from '../config/constants.js';
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import EnemyBullet from '../entities/EnemyBullet.js';
import Explosion from '../entities/Explosion.js';
import WaveManager from '../systems/WaveManager.js';
import Sfx from '../systems/Sfx.js';
import Effects from '../systems/Effects.js';
import { getMusic } from '../systems/Music.js';
import ParallaxBackground from '../systems/ParallaxBackground.js';
import { load, save } from '../systems/storage.js';

const EXPLOSION_POOL_SIZE = 20;

// El nivel jugable: crea todo, conecta las colisiones y le deja las oleadas al WaveManager.
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        const { width, height } = this.scale;

        // Fondo con parallax
        this.background = new ParallaxBackground(this);

        // Estado global que lee el HUD
        this.registry.set('score', 0);
        this.registry.set('hp', PLAYER.maxHp);

        // Sonido y efectos
        this.sfx = new Sfx(this);
        this.fx = new Effects(this, this.sfx);
        this.music = getMusic();
        this.music.play();
        this.music.fadeTo(SOUND.musicVolume, 800); // al reiniciar, vuelve a su volumen
        this.input.keyboard.on('keydown-M', () => {
            const muted = this.sfx.toggleMute();
            this.music.setMuted(muted);
        });

        // Pools
        this.bullets = this.physics.add.group({
            classType: Bullet,
            maxSize: BULLET.poolSize,
            runChildUpdate: true // llama update() de cada objeto activo
        });
        this.enemies = this.physics.add.group({
            classType: Enemy,
            maxSize: ENEMY.poolSize,
            runChildUpdate: true
        });
        this.enemyBullets = this.physics.add.group({
            classType: EnemyBullet,
            maxSize: ENEMY_BULLET.poolSize,
            runChildUpdate: true
        });
        this.explosions = this.add.group({
            classType: Explosion,
            maxSize: EXPLOSION_POOL_SIZE,
            runChildUpdate: true
        });

        // Crear todo de una vez al inicio para que no haya tirones a mitad de partida
        this.prewarm(this.bullets, 'bullet', BULLET.poolSize);
        this.prewarm(this.enemies, 'enemies', ENEMY.poolSize);
        this.prewarm(this.enemyBullets, 'enemy_bullet', ENEMY_BULLET.poolSize);
        this.prewarm(this.explosions, 'spark', EXPLOSION_POOL_SIZE);

        // Jugador
        this.player = new Player(this, 150, height / 2, this.bullets);
        this.player.on('died', this.gameOver, this);
        this.player.on('shoot', (x, y) => this.fx.playerShoot(x, y));

        // Colisiones (overlap: detecta el contacto sin empujar)
        this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitsEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.onEnemyHitsPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitsPlayer, null, this);

        // Oleadas
        this.waves = new WaveManager(this, this.enemies);

        // Hud y reinicio
        this.isGameOver = false;
        this.leaving = false; // la escena se reutiliza: hay que reiniciar este flag
        this.scene.launch('UIScene'); // corre EN PARALELO, encima del juego

        this.input.keyboard.on('keydown-R', () => {
            if (this.isGameOver) this.scene.restart();
        });
        this.input.keyboard.on('keydown-ESC', () => this.goToMenu());

        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    update(time, delta) {
        this.background.update(delta);

        const now = this.time.now;
        if (!this.isGameOver) {
            this.player.update(time);
            this.waves.update(now);
        }
        this.fx.update(now, delta);
    }

    prewarm(group, key, quantity) {
        group.createMultiple({ key, quantity, active: false, visible: false });
        group.getChildren().forEach((child) => child.kill());
    }

    // Api para los enemigos

    // En grados
    angleToPlayer(x, y) {
        if (!this.player.active) return 180;
        return Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y));
    }

    fireEnemyBullet(x, y, angle, speed) {
        const bullet = this.enemyBullets.get(x, y);
        if (bullet) {
            bullet.fire(x, y, angle, speed);
            this.fx.enemyShoot();
        }
    }

    // Colisiones

    onBulletHitsEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;

        bullet.kill();
        if (enemy.takeDamage(BULLET.damage)) {
            this.explode(enemy.x, enemy.y, enemy.stat('explosionSize') ?? 1);
            this.fx.enemyKilled(enemy);
            this.registry.inc('score', enemy.stat('points'));
            enemy.kill();
        } else {
            this.fx.enemyHit(bullet.x, bullet.y);
        }
    }

    onEnemyHitsPlayer(player, enemy) {
        if (!enemy.active) return;

        if (!player.hit()) return;
        this.fx.playerHit();

        if (enemy.stat('diesOnContact') !== false) {
            this.explode(enemy.x, enemy.y);
            this.fx.enemyKilled(enemy);
            enemy.kill();
        }
    }

    onEnemyBulletHitsPlayer(player, bullet) {
        if (!bullet.active) return;

        // Si el jugador es invulnerable, la bala lo atraviesa
        if (player.hit()) {
            bullet.kill();
            this.fx.playerHit();
        }
    }

    explode(x, y, size = 1) {
        const boom = this.explosions.get(x, y);
        if (boom) boom.play(x, y, 0xffa500, size); // si el pool está lleno, no se ve
    }

    goToMenu() {
        if (this.leaving) return;
        this.leaving = true;
        this.cameras.main.resetFX(); // un fade/flash en curso bloquearía el fadeOut
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
        });
    }

    gameOver() {
        this.isGameOver = true;
        this.explode(this.player.x, this.player.y, 2);
        this.fx.playerDied(this.player.x, this.player.y);
        this.music.fadeTo(SOUND.musicGameOver, 1200);
        this.physics.pause();

        const score = this.registry.get('score');
        const best = load('best', 0);
        const isNewBest = score > best;
        if (isNewBest) save('best', score);

        const { width, height } = this.scale;
        const font = 'Arial Black, Arial, sans-serif';

        const title = this.add.text(width / 2, height / 2 - 60, 'GAME OVER', {
            fontFamily: font, fontSize: '64px', color: '#ffffff', stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5).setDepth(20).setScale(0);

        const scoreLine = isNewBest ? `NEW BEST!  ${score}` : `SCORE ${score}   BEST ${best}`;
        const scoreText = this.add.text(width / 2, height / 2 + 10, scoreLine, {
            fontFamily: font, fontSize: '28px', color: isNewBest ? '#ffd54f' : '#ffffff', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(20).setAlpha(0);

        const hint = this.add.text(width / 2, height / 2 + 65, 'R  Retry      ESC  Menu', {
            fontFamily: font, fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(20).setAlpha(0);

        this.tweens.add({ targets: title, scale: 1, duration: 450, delay: 300, ease: 'Back.Out' });
        this.tweens.add({ targets: scoreText, alpha: 1, duration: 300, delay: 700 });
        this.tweens.add({ targets: hint, alpha: 1, duration: 300, delay: 1000 });
        if (isNewBest) {
            this.tweens.add({ targets: scoreText, scale: 1.12, duration: 400, yoyo: true, repeat: -1, delay: 1000 });
        }
    }
}
