import Phaser from 'phaser';
import { PLAYER, BULLET, ENEMY, ENEMY_BULLET, SOUND, WAVES, SUPER, POWERUPS, RESCUE, BOSS, PARALLAX } from '../config/constants.js';
import Player from '../entities/Player.js';
import Bullet from '../entities/Bullet.js';
import Enemy from '../entities/Enemy.js';
import EnemyBullet from '../entities/EnemyBullet.js';
import Explosion from '../entities/Explosion.js';
import Pickup from '../entities/Pickup.js';
import Boss from '../entities/Boss.js';
import WaveManager from '../systems/WaveManager.js';
import Sfx from '../systems/Sfx.js';
import Effects from '../systems/Effects.js';
import { getMusic } from '../systems/Music.js';
import ParallaxBackground from '../systems/ParallaxBackground.js';
import { load, save } from '../systems/storage.js';
import Combo from '../systems/Combo.js';
import { applyFilm } from '../systems/OldFilmPipeline.js';
import { irisIn, irisOut } from './TransitionScene.js';

const EXPLOSION_POOL_SIZE = 20;
const PICKUP_POOL_SIZE = 8;
const NO_DIFFICULTY = { hp: 1, speed: 1, fireRate: 1 };

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        const { height } = this.scale;

        // Own clock: unlike time.now, it does not advance while the game is paused
        this.now = 0;
        const tick = (time, delta) => { this.now += delta; };
        this.events.on('preupdate', tick);

        this.scene.stop('PauseScene');
        this.scene.stop('ResultsScene');

        this.background = new ParallaxBackground(this);
        applyFilm(this);

        const m = PARALLAX.margin;
        this.cameras.main.setBounds(-m, -m, this.scale.width + m * 2, this.scale.height + m * 2);
        this.registry.set('cinema', false);

        this.registry.set('score', 0);
        this.registry.set('hp', PLAYER.maxHp);
        this.registry.set('super', 0);
        this.registry.set('power', null);
        this.registry.set('shield', false);
        this.registry.set('bossHp', -1);
        this.registry.set('playing', true);
        // HUD events: these keys must exist beforehand, because the first time a key
        // is created the registry emits 'setdata' instead of 'changedata'
        for (const key of ['banner', 'titleCard', 'collect']) this.registry.set(key, null);

        this.stats = { kills: 0, rescued: 0, puppies: 0, supers: 0 };

        this.sfx = new Sfx(this);
        this.fx = new Effects(this, this.sfx);
        this.music = getMusic();
        this.music.play();
        this.music.restore();
        this.input.keyboard.on('keydown-M', () => {
            const muted = this.sfx.toggleMute();
            this.music.setMuted(muted);
        });

        this.bullets = this.physics.add.group({
            classType: Bullet,
            maxSize: BULLET.poolSize,
            runChildUpdate: true
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
        this.pickups = this.physics.add.group({
            classType: Pickup,
            maxSize: PICKUP_POOL_SIZE,
            runChildUpdate: true
        });

        this.prewarm(this.bullets, 'fx', BULLET.poolSize);
        this.prewarm(this.enemies, 'enemies', ENEMY.poolSize);
        this.prewarm(this.enemyBullets, 'fx', ENEMY_BULLET.poolSize);
        this.prewarm(this.explosions, 'fx', EXPLOSION_POOL_SIZE);
        this.prewarm(this.pickups, 'fx', PICKUP_POOL_SIZE);

        this.player = new Player(this, 150, height / 2, this.bullets);
        this.player.on('died', this.gameOver, this);
        this.player.on('shoot', (x, y) => this.fx.playerShoot(x, y));
        this.player.on('super', this.useSuper, this);
        const { exhaust } = this.player.skin;
        this.player.smoke = this.fx.attachEngineSmoke(this.player, exhaust.x * PLAYER.scale, exhaust.y * PLAYER.scale);

        this.combo = new Combo(this);
        this.superMeter = 0;
        this.boss = null;

        this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitsEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.onEnemyHitsPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitsPlayer, null, this);
        this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this);

        this.waves = new WaveManager(this, this.enemies, () => {
            this.time.delayedCall(WAVES.bossDelay, () => this.startBoss());
        });

        this.isGameOver = false;
        this.won = false;
        this.bossIncoming = false;
        this.leaving = false; // the scene is reused, so this flag must be reset
        this.scene.launch('UIScene');

        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.input.keyboard.on('keydown-P', () => this.pauseGame());
        const onBlur = () => this.pauseGame();
        this.game.events.on('blur', onBlur);

        this.sfx.engineOn();

        const onResume = () => {
            this.music.restore(1, 300);
            this.sfx.engineOn();
        };
        this.events.on('resume', onResume);

        // Scene events survive a restart and must be removed by hand
        this.events.once('shutdown', () => {
            this.game.events.off('blur', onBlur);
            this.events.off('preupdate', tick);
            this.events.off('resume', onResume);
            this.sfx.engineOff();
        });

        irisIn(this, this.player.x, this.player.y);
        this.time.delayedCall(450, () => { this.banner('READY?', '#ffd54f'); this.sfx.ready(); });
        this.time.delayedCall(1500, () => { this.banner('FLY!', '#ffffff'); this.sfx.go(); });
    }

    update(time, delta) {
        this.background.update(delta);

        if (!this.isGameOver) {
            this.player.update(time, delta);
            this.waves.update(this.now);
            this.combo.update();
        }
        this.boss?.update();
        this.fx.update(this.now, delta);
        this.updateSun();
    }

    updateSun() {
        const sun = this.background.sun;
        sun.lookAt(this.player.x, this.player.y);

        let mood = 'happy';
        if (this.won) mood = 'cheer';
        else if (this.isGameOver) mood = 'sad';
        else if (this.bossIncoming) mood = 'scared';
        else if (this.player.hp === 1) mood = 'worried';
        sun.setMood(mood);
    }

    prewarm(group, key, quantity) {
        group.createMultiple({ key, quantity, active: false, visible: false });
        group.getChildren().forEach((child) => child.kill());
    }

    banner(text, color) {
        this.registry.set('banner', { text, color, id: Math.random() });
    }

    angleToPlayer(x, y) {
        if (!this.player.active) return 180;
        return Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y));
    }

    fireEnemyBullet(x, y, angle, speed) {
        if (this.isGameOver || this.won) return;
        const bullet = this.enemyBullets.get(x, y);
        if (bullet) {
            bullet.fire(x, y, angle, speed);
            this.fx.enemyShoot();
        }
    }

    spawnMinion(type, y) {
        const x = this.scale.width + 60;
        const enemy = this.enemies.get(x, y);
        if (enemy) enemy.spawn(x, y, type, {}, NO_DIFFICULTY);
    }

    spawnPuppy(y) {
        const x = this.scale.width + 50;
        const puppy = this.pickups.get(x, y);
        if (!puppy) return;
        puppy.spawn(x, y, 'puppy');
        this.sfx.squeak();
        this.stats.puppies++;
    }

    spawnPowerUp(x, y) {
        const pickup = this.pickups.get(x, y);
        if (pickup) pickup.spawn(x, y, Phaser.Utils.Array.GetRandom(POWERUPS.kinds));
    }

    onBulletHitsEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;

        bullet.kill();
        this.chargeSuper(SUPER.perHit);
        if (enemy.takeDamage(BULLET.damage)) {
            this.killEnemy(enemy);
        } else {
            this.fx.enemyHit(bullet.x, bullet.y);
        }
    }

    onBulletHitsBoss(boss, bullet) {
        if (!bullet.active) return;
        bullet.kill();
        if (boss.damage(BULLET.damage)) {
            this.chargeSuper(SUPER.perHit);
            this.fx.bossHit(bullet.x, bullet.y);
        }
    }

    killEnemy(enemy) {
        const before = this.combo.multiplier;
        const multiplier = this.combo.kill();
        if (multiplier > before) this.fx.comboUp(multiplier);

        const points = enemy.stat('points') * multiplier;
        this.fx.enemyKilled(enemy, points, multiplier);
        this.registry.inc('score', points);
        this.stats.kills++;
        this.chargeSuper(SUPER.perKill);

        if (Math.random() < (enemy.stat('drop') ?? 0)) this.spawnPowerUp(enemy.x, enemy.y);
        enemy.kill();
    }

    onEnemyHitsPlayer(player, enemy) {
        if (!enemy.active) return;
        if (!this.hurtPlayer()) return;

        if (enemy.stat('diesOnContact') !== false) {
            this.fx.enemyKilled(enemy);
            enemy.kill();
        }
    }

    onEnemyBulletHitsPlayer(player, bullet) {
        if (!bullet.active) return;
        if (this.hurtPlayer()) bullet.kill();
    }

    onBossHitsPlayer() {
        if (this.boss.state !== 'dying') this.hurtPlayer();
    }

    hurtPlayer() {
        const result = this.player.hit();
        if (result === 'hurt') {
            this.fx.playerHit();
            this.combo.break();
        } else if (result === 'shield') {
            this.fx.shieldBroken(this.player.x, this.player.y);
        }
        return !!result;
    }

    onPickup(player, pickup) {
        if (!pickup.active || !player.active) return;
        const { x, y, kind } = pickup;
        pickup.kill();

        const camera = this.cameras.main;
        this.registry.set('collect', {
            kind,
            x: (x - camera.worldView.x) * camera.zoom,
            y: (y - camera.worldView.y) * camera.zoom,
            id: Math.random()
        });

        if (kind === 'puppy') {
            const healed = player.heal();
            this.stats.rescued++;
            this.registry.inc('score', RESCUE.points);
            this.fx.rescued(x, y, healed);
        } else if (kind === 'super') {
            this.chargeSuper(1);
            this.fx.poweredUp(x, y, kind);
        } else {
            player.givePowerUp(kind);
            this.fx.poweredUp(x, y, kind);
        }
    }

    chargeSuper(amount) {
        if (this.superMeter >= 1) return;
        this.superMeter = Math.min(1, this.superMeter + amount);
        this.registry.set('super', this.superMeter);
        if (this.superMeter >= 1) this.fx.superReady();
    }

    useSuper() {
        if (this.superMeter < 1 || this.isGameOver || this.won || !this.player.active) return;
        this.superMeter = 0;
        this.registry.set('super', 0);
        this.stats.supers++;

        const { x, y } = this.player;
        this.player.protect(SUPER.invulnerable);
        this.player.playAction('super');
        this.fx.superBlast(x, y);

        this.time.delayedCall(150, () => {
            this.clearEnemyBullets();
            for (const enemy of this.enemies.getMatching('active', true)) {
                if (enemy.takeDamage(SUPER.damage)) this.killEnemy(enemy);
            }
            this.boss?.damage(SUPER.bossDamage);
        });
    }

    clearEnemyBullets() {
        for (const bullet of this.enemyBullets.getMatching('active', true)) {
            this.fx.bulletCleared(bullet.x, bullet.y);
            bullet.kill();
        }
    }

    startBoss() {
        if (this.isGameOver) return;
        this.bossIncoming = true;
        this.banner('WARNING!', '#ff5252');
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 700, () => this.sfx.siren());

        this.time.delayedCall(1800, () => {
            if (this.isGameOver) return;
            this.boss = new Boss(this);
            this.bossIntro();
            this.registry.set('bossName', BOSS.name);
            this.physics.add.overlap(this.boss, this.bullets, this.onBulletHitsBoss, null, this);
            this.physics.add.overlap(this.player, this.boss, this.onBossHitsPlayer, null, this);

            this.boss.on('phase', () => {
                this.sfx.roar();
                this.clearEnemyBullets();
                this.fx.shake(500, 0.012);
                this.spawnPuppy(Phaser.Math.FloatBetween(0.25, 0.75) * this.scale.height);
            });
            this.boss.on('dying', () => {
                this.player.celebrate();
                this.slowMotion(0.25, 1400);
                this.won = true;
                this.player.invulnerable = true;
                this.clearEnemyBullets();
                for (const enemy of this.enemies.getMatching('active', true)) {
                    this.fx.enemyKilled(enemy);
                    enemy.kill();
                }
            });
            this.boss.on('defeated', () => {
                this.registry.inc('score', BOSS.points);
                this.fx.popup(this.boss.x, this.boss.y - 60, BOSS.points, 5);
                this.time.delayedCall(800, () => this.registry.set('bossHp', -1));
                this.time.delayedCall(900, () => {
                    this.banner('KNOCKOUT!', '#ffd54f');
                    this.sfx.fanfare();
                });
                this.time.delayedCall(3200, () => this.finish(true));
            });
        });
    }

    bossIntro() {
        const camera = this.cameras.main;
        const { width, height } = this.scale;
        const INTRO_TIME = 6000;

        this.player.protect(INTRO_TIME, false);
        this.player.locked = true;
        this.tweens.add({ targets: this.player, x: 170, y: height / 2, duration: 1200, ease: 'Sine.easeInOut' });
        this.registry.set('cinema', true);
        camera.zoomTo(1.25, 1400, 'Sine.easeInOut');
        camera.pan(this.boss.homeX, height / 2, 1400, 'Sine.easeInOut');

        this.boss.once('arrived', () => {
            this.sfx.roar();
            this.fx.shake(350, 0.012);
            this.registry.set('titleCard', { name: BOSS.name, subtitle: BOSS.subtitle, id: Math.random() });

            this.time.delayedCall(2000, () => {
                camera.zoomTo(1, 700, 'Sine.easeInOut');
                camera.pan(width / 2, height / 2, 700, 'Sine.easeInOut');
                this.registry.set('cinema', false);
                this.time.delayedCall(500, () => {
                    this.player.locked = false;
                    this.player.protect(600, false);
                    this.boss.startFight();
                });
            });
        });
    }

    slowMotion(scale, realMs) {
        const camera = this.cameras.main;
        const { width, height } = this.scale;

        this.sfx.slowMo();
        this.time.timeScale = scale;
        this.tweens.timeScale = scale;
        this.physics.world.timeScale = 1 / scale;
        this.registry.set('cinema', true);
        camera.zoomTo(1.3, 300, 'Quad.easeOut');
        camera.pan(this.boss.x, this.boss.y, 300, 'Quad.easeOut');

        // The scene clock runs slow, so compensate
        this.time.delayedCall(realMs * scale, () => {
            this.time.timeScale = 1;
            this.tweens.timeScale = 1;
            this.physics.world.timeScale = 1;
            this.registry.set('cinema', false);
            camera.zoomTo(1, 800, 'Sine.easeInOut');
            camera.pan(width / 2, height / 2, 800, 'Sine.easeInOut');
        });
    }

    pauseGame() {
        if (this.isGameOver || this.won || this.leaving || !this.scene.isActive()) return;
        this.music.restore(0.4, 200);
        this.sfx.engineOff();
        this.scene.pause();
        this.scene.launch('PauseScene');
    }

    leave(onClosed) {
        if (this.leaving) return;
        this.leaving = true;
        irisOut(this, this.player.x, this.player.y, onClosed);
    }

    restartLevel() {
        this.leave(() => this.scene.restart());
    }

    quitToMenu() {
        this.leave(() => {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
        });
    }

    gameOver() {
        this.isGameOver = true;
        this.combo.break();
        this.sfx.engineOff();
        this.explode(this.player.x, this.player.y, 2);
        this.fx.playerDied(this.player.x, this.player.y);
        this.music.restore(SOUND.gameOverDuck, 1200);
        this.physics.pause();
        this.time.delayedCall(1800, () => this.finish(false));
    }

    finish(win) {
        this.registry.set('playing', false);
        const score = this.registry.get('score');
        const best = load('best', 0);
        const isNewBest = score > best;
        if (isNewBest) save('best', score);

        const bossProgress = this.boss ? 1 - Math.max(0, this.registry.get('bossHp')) : 0;
        const progress = win ? 1 : this.waves.progress * 0.7 + bossProgress * 0.3;

        this.scene.launch('ResultsScene', {
            win,
            score,
            best: Math.max(best, score),
            isNewBest,
            time: this.now / 1000,
            hp: this.player.hp,
            maxHp: PLAYER.maxHp,
            rescued: this.stats.rescued,
            puppies: this.stats.puppies,
            bestCombo: this.combo.best,
            kills: this.stats.kills,
            supers: this.stats.supers,
            progress
        });
    }

    explode(x, y, size = 1) {
        const boom = this.explosions.get(x, y);
        if (boom) boom.boom(x, y, size);
    }
}
