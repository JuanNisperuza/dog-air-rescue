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

// El nivel jugable: crea todo, conecta las colisiones, le deja las oleadas al
// WaveManager y al final trae al jefe. Al ganar o perder abre ResultsScene.
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        const { height } = this.scale;

        // Reloj propio: a diferencia de time.now, no avanza mientras el juego está en pausa
        this.now = 0;
        const tick = (time, delta) => { this.now += delta; };
        this.events.on('preupdate', tick);

        // Por si venimos de un reinicio
        this.scene.stop('PauseScene');
        this.scene.stop('ResultsScene');

        // Fondo con parallax y filtro de película vieja
        this.background = new ParallaxBackground(this);
        applyFilm(this);

        // La cámara no puede salirse del fondo (importa en los zooms de cine)
        const m = PARALLAX.margin;
        this.cameras.main.setBounds(-m, -m, this.scale.width + m * 2, this.scale.height + m * 2);
        this.registry.set('cinema', false);

        // Estado global que lee el HUD
        this.registry.set('score', 0);
        this.registry.set('hp', PLAYER.maxHp);
        this.registry.set('super', 0);
        this.registry.set('power', null);
        this.registry.set('shield', false);
        this.registry.set('bossHp', -1);     // -1 = no hay jefe
        this.registry.set('playing', true);
        // Eventos para el HUD: tienen que existir antes, porque la primera vez que se
        // crea una clave el registry emite 'setdata' y no 'changedata'
        for (const key of ['banner', 'titleCard', 'collect']) this.registry.set(key, null);

        // Datos para la pantalla de resultados
        this.stats = { kills: 0, rescued: 0, puppies: 0, supers: 0 };

        // Sonido y efectos
        this.sfx = new Sfx(this);
        this.fx = new Effects(this, this.sfx);
        this.music = getMusic();
        this.music.play();
        this.music.restore(); // al reiniciar, vuelve a su volumen
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
        this.pickups = this.physics.add.group({
            classType: Pickup,
            maxSize: PICKUP_POOL_SIZE,
            runChildUpdate: true
        });

        // Crear todo de una vez al inicio para que no haya tirones a mitad de partida
        this.prewarm(this.bullets, 'fx', BULLET.poolSize);
        this.prewarm(this.enemies, 'enemies', ENEMY.poolSize);
        this.prewarm(this.enemyBullets, 'fx', ENEMY_BULLET.poolSize);
        this.prewarm(this.explosions, 'fx', EXPLOSION_POOL_SIZE);
        this.prewarm(this.pickups, 'fx', PICKUP_POOL_SIZE);

        // Jugador
        this.player = new Player(this, 150, height / 2, this.bullets);
        this.player.on('died', this.gameOver, this);
        this.player.on('shoot', (x, y) => this.fx.playerShoot(x, y));
        this.player.on('super', this.useSuper, this);
        const { exhaust } = this.player.skin;
        this.player.smoke = this.fx.attachEngineSmoke(this.player, exhaust.x * PLAYER.scale, exhaust.y * PLAYER.scale);

        this.combo = new Combo(this);
        this.superMeter = 0;
        this.boss = null;

        // Colisiones (overlap: detecta el contacto sin empujar)
        this.physics.add.overlap(this.bullets, this.enemies, this.onBulletHitsEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.onEnemyHitsPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.onEnemyBulletHitsPlayer, null, this);
        this.physics.add.overlap(this.player, this.pickups, this.onPickup, null, this);

        // Oleadas; al terminar la última llega el jefe
        this.waves = new WaveManager(this, this.enemies, () => {
            this.time.delayedCall(WAVES.bossDelay, () => this.startBoss());
        });

        // Hud
        this.isGameOver = false;
        this.won = false;
        this.bossIncoming = false;
        this.leaving = false; // la escena se reutiliza: hay que reiniciar este flag
        this.scene.launch('UIScene'); // corre EN PARALELO, encima del juego

        // Pausa: Esc / P, o solo al cambiar de ventana
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.input.keyboard.on('keydown-P', () => this.pauseGame());
        const onBlur = () => this.pauseGame();
        this.game.events.on('blur', onBlur);

        // Al volver de la pausa la música regresa a su volumen
        const onResume = () => this.music.restore(1, 300);
        this.events.on('resume', onResume);

        // Los eventos de la escena sobreviven al reinicio: hay que quitarlos a mano
        this.events.once('shutdown', () => {
            this.game.events.off('blur', onBlur);
            this.events.off('preupdate', tick);
            this.events.off('resume', onResume);
        });

        irisIn(this, this.player.x, this.player.y);
        this.time.delayedCall(450, () => this.banner('READY?', '#ffd54f'));
        this.time.delayedCall(1500, () => this.banner('FLY!', '#ffffff'));
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

    // El sol mira al perrito y pone cara según lo que pasa
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

    // Texto grande en el centro de la pantalla (lo dibuja UIScene)
    banner(text, color) {
        this.registry.set('banner', { text, color, id: Math.random() });
    }

    // Api para los enemigos y el jefe

    // En grados
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

    // Enemigo suelto (los que llama el jefe)
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
        this.stats.puppies++;
    }

    spawnPowerUp(x, y) {
        const pickup = this.pickups.get(x, y);
        if (pickup) pickup.spawn(x, y, Phaser.Utils.Array.GetRandom(POWERUPS.kinds));
    }

    // Colisiones

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

    // Muerte con puntos (por bala o por el súper)
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
        // Si el jugador es invulnerable, la bala lo atraviesa
        if (this.hurtPlayer()) bullet.kill();
    }

    onBossHitsPlayer() {
        if (this.boss.state !== 'dying') this.hurtPlayer();
    }

    // Devuelve true si el golpe contó (daño o escudo)
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

        // El HUD hace volar el perrito o el power-up hasta su lugar
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
            // El collar llena el súper de una
            this.chargeSuper(1);
            this.fx.poweredUp(x, y, kind);
        } else {
            player.givePowerUp(kind);
            this.fx.poweredUp(x, y, kind);
        }
    }

    // Súper

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
        this.player.playAction('super');   // toma aire y ladra
        this.fx.superBlast(x, y);

        // El daño llega cuando la onda ya cubrió la pantalla
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

    // Jefe

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
                this.player.invulnerable = true; // ya ganó: nada le hace daño
                this.clearEnemyBullets();
                for (const enemy of this.enemies.getMatching('active', true)) {
                    this.fx.enemyKilled(enemy);
                    enemy.kill();
                }
            });
            this.boss.on('defeated', () => {
                this.registry.inc('score', BOSS.points);
                this.fx.popup(this.boss.x, this.boss.y - 60, BOSS.points, 5);
                this.time.delayedCall(800, () => this.registry.set('bossHp', -1)); // esconde la barra
                this.time.delayedCall(900, () => {
                    this.banner('KNOCKOUT!', '#ffd54f');
                    this.sfx.fanfare();
                });
                this.time.delayedCall(3200, () => this.finish(true));
            });
        });
    }

    // Cine

    // Barras negras, zoom al jefe, tarjeta con su nombre y a pelear
    bossIntro() {
        const camera = this.cameras.main;
        const { width, height } = this.scale;
        const INTRO_TIME = 6000; // por si acaso; se acorta cuando termina

        // El perrito se acomoda a la izquierda mientras el jefe se presenta
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
                    this.player.protect(600, false); // un respiro antes del primer ataque
                    this.boss.startFight();
                });
            });
        });
    }

    // Cámara lenta con zoom (el golpe final al jefe). realMs: cuánto dura en tiempo real
    slowMotion(scale, realMs) {
        const camera = this.cameras.main;
        const { width, height } = this.scale;

        this.time.timeScale = scale;
        this.tweens.timeScale = scale;
        this.physics.world.timeScale = 1 / scale; // en Arcade, más alto = más lento
        this.registry.set('cinema', true);
        camera.zoomTo(1.3, 300, 'Quad.easeOut');
        camera.pan(this.boss.x, this.boss.y, 300, 'Quad.easeOut');

        // El reloj de la escena va lento, así que se compensa
        this.time.delayedCall(realMs * scale, () => {
            this.time.timeScale = 1;
            this.tweens.timeScale = 1;
            this.physics.world.timeScale = 1;
            this.registry.set('cinema', false);
            camera.zoomTo(1, 800, 'Sine.easeInOut');
            camera.pan(width / 2, height / 2, 800, 'Sine.easeInOut');
        });
    }

    // Pausa y salida

    pauseGame() {
        if (this.isGameOver || this.won || this.leaving || !this.scene.isActive()) return;
        this.music.restore(0.4, 200);
        this.scene.pause();
        this.scene.launch('PauseScene');
    }

    // Cierra el iris sobre el jugador y después cambia de escena
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

    // Fin de la partida

    gameOver() {
        this.isGameOver = true;
        this.combo.break();
        this.explode(this.player.x, this.player.y, 2);
        this.fx.playerDied(this.player.x, this.player.y);
        this.music.restore(SOUND.gameOverDuck, 1200);
        this.physics.pause();
        this.time.delayedCall(1800, () => this.finish(false));
    }

    // Guarda el récord y abre la pantalla de resultados
    finish(win) {
        this.registry.set('playing', false);
        const score = this.registry.get('score');
        const best = load('best', 0);
        const isNewBest = score > best;
        if (isNewBest) save('best', score);

        // Progreso para la barra al perder: las oleadas valen 70% y el jefe 30%
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
        if (boom) boom.boom(x, y, size); // si el pool está lleno, no se ve
    }
}
