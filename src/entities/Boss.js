import Phaser from 'phaser';
import { BOSS } from '../config/constants.js';

// El jefe: Baron von Whiskers en su zepelín (atlas 'boss'). Tiene tres fases (BOSS.attacks); en cada una
// repite su lista de ataques en orden. Al cambiar de fase ruge, limpia las balas
// y se vuelve más agresivo. GameScene se entera de todo por eventos:
// 'arrived' (terminó de entrar; espera a startFight), 'phase', 'dying' y 'defeated'.
const FLASH_TIME = 50;
const ENTER_TIME = 2400;
const PHASE_PAUSE = 1400;
const DEATH_TIME = 2600;

// Medidas del arte (px del frame): el origen es el centro del zepelín
const ART = {
    width: 245, height: 501,
    origin: { x: 125.5, y: 325 },
    body: { x: 125, y: 262, radius: 102 },  // círculo que cubre al gato y al zepelín
    muzzle: { x: -118, y: -8 }              // punta del cañón, desde el origen
};

export default class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene) {
        const { width, height } = scene.scale;
        super(scene, width + 300, height * 0.64, 'boss', 'boss_idle_0001');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setOrigin(ART.origin.x / this.width, ART.origin.y / this.height);
        this.setScale(BOSS.scale).setDepth(6);
        const { x: bx, y: by, radius } = ART.body;
        this.body.setCircle(radius, bx - radius, by - radius);

        this.play('boss_idle');

        this.maxHp = BOSS.hp;
        this.hp = BOSS.hp;
        this.phase = 0;              // 0, 1, 2
        this.state = 'enter';        // enter | intro | fight | charge | phase | dying
        this.invulnerable = true;
        this.flashUntil = 0;
        this.attackIndex = 0;
        this.homeX = width * BOSS.x;
        this.homeY = height * 0.64;   // el origen es el zepelín; el gato queda arriba

        scene.registry.set('bossHp', 1);

        // Entra despacio desde la derecha
        scene.tweens.add({
            targets: this,
            x: this.homeX,
            duration: ENTER_TIME,
            ease: 'Cubic.Out',
            onComplete: () => {
                this.state = 'intro';
                this.emit('arrived');
            }
        });
    }

    // Lo llama GameScene cuando termina la presentación
    startFight() {
        if (this.state !== 'intro') return;
        this.state = 'fight';
        this.invulnerable = false;
        this.nextAttack = this.scene.now + 600;
    }

    get config() {
        return BOSS.attacks[this.phase];
    }

    get muzzleX() { return this.x + ART.muzzle.x * BOSS.scale; }
    get muzzleY() { return this.y + ART.muzzle.y * BOSS.scale; }

    // En la última fase el barón está furioso todo el tiempo
    get idleAnim() {
        return this.phase === 2 ? 'boss_angry' : 'boss_idle';
    }

    update() {
        if (!this.active) return;
        const now = this.scene.now;

        if (this.flashUntil && now >= this.flashUntil) {
            this.flashUntil = 0;
            this.applyTint();
        }

        // Sube y baja suave (el Linear evita saltos al volver de una embestida)
        if (this.state === 'fight' || this.state === 'phase' || this.state === 'intro') {
            const speed = this.phase === 2 ? 0.0016 : 0.0011;
            const targetY = this.homeY + Math.sin(now * speed) * this.config.bob;
            this.y = Phaser.Math.Linear(this.y, targetY, 0.05);
            this.x = Phaser.Math.Linear(this.x, this.homeX, 0.05);
        }

        if (this.state === 'fight' && !this.scene.isGameOver && now >= this.nextAttack) {
            const list = this.config.list;
            const attack = list[this.attackIndex % list.length];
            this.attackIndex++;
            this.nextAttack = now + this.config.every;
            this[attack]();
        }
    }

    // Ataques

    // Grita y dispara: la bala sale en el frame del fogonazo
    shootAnim(fire) {
        if (this.phase === 2) {
            // Furioso: no cambia de animación, solo da un salto al disparar
            this.scene.tweens.add({ targets: this, scaleX: BOSS.scale * 1.08, scaleY: BOSS.scale * 0.92, duration: 80, yoyo: true });
            fire();
            return;
        }
        this.play('boss_attack');
        this.chain(this.idleAnim);
        this.scene.time.delayedCall(1000 / 12, () => {
            if (this.state !== 'dying') fire();
        });
    }

    fireSpread(count, step, speed = BOSS.bulletSpeed) {
        this.shootAnim(() => {
            const center = this.scene.angleToPlayer(this.muzzleX, this.muzzleY);
            const first = center - (step * (count - 1)) / 2;
            for (let i = 0; i < count; i++) {
                this.scene.fireEnemyBullet(this.muzzleX, this.muzzleY, first + step * i, speed);
            }
        });
    }

    aimed() { this.fireSpread(3, 12); }
    spread() { this.fireSpread(5, 14); }
    fan() { this.fireSpread(7, 13, BOSS.bulletSpeed * 1.1); }

    // Anillo de balas en todas direcciones, con un hueco que gira
    ring() {
        const count = 16;
        const offset = Phaser.Math.Between(0, 360);
        for (let wave = 0; wave < 2; wave++) {
            this.scene.time.delayedCall(wave * 220, () => {
                if (this.state === 'dying') return;
                for (let i = 0; i < count; i++) {
                    if (i % 8 === 0) continue; // huecos para pasar
                    const angle = offset + wave * 11 + (360 / count) * i;
                    this.scene.fireEnemyBullet(this.x, this.y, angle, BOSS.bulletSpeed * 0.8);
                }
            });
        }
    }

    // Llama a dos gatos con globo
    minions() {
        const { height } = this.scene.scale;
        this.scene.spawnMinion('flyer', height * 0.2);
        this.scene.spawnMinion('flyer', height * 0.8);
    }

    divers() {
        const { height } = this.scene.scale;
        this.scene.spawnMinion('diver', height * 0.15);
        this.scene.spawnMinion('diver', height * 0.85);
    }

    // Avisa (tiembla en rojo) y se lanza hacia donde está el jugador
    charge() {
        this.state = 'charge';
        this.scene.fx.enemyTelegraph();
        this.scene.fx.emote(this, '!!!', '#ff5252', 2);
        this.setTint(0xff6e6e);

        const startX = this.x;
        this.scene.tweens.add({
            targets: this,
            x: startX + 6,
            duration: 50,
            yoyo: true,
            repeat: 6,
            onComplete: () => {
                if (this.state !== 'charge') return;
                this.applyTint();
                // El zepelín baja o sube hasta el jugador, sin que el gato se salga por arriba
                const targetY = Phaser.Math.Clamp(this.scene.player.y, 240, this.scene.scale.height - 60);
                this.scene.tweens.add({
                    targets: this,
                    x: 170,
                    y: targetY,
                    duration: 650,
                    ease: 'Quad.In',
                    onComplete: () => {
                        if (this.state !== 'charge') return;
                        this.scene.fx.shake(200, 0.01);
                        this.scene.tweens.add({
                            targets: this,
                            x: this.homeX,
                            duration: 1100,
                            ease: 'Quad.Out',
                            onComplete: () => {
                                if (this.state === 'charge') this.state = 'fight';
                            }
                        });
                    }
                });
            }
        });
    }

    // Daño

    // Devuelve true si el golpe contó
    damage(amount) {
        if (this.invulnerable || this.state === 'dying') return false;

        this.hp = Math.max(0, this.hp - amount);
        this.scene.registry.set('bossHp', this.hp / this.maxHp);
        this.setTintFill(0xffffff);
        this.flashUntil = this.scene.now + FLASH_TIME;

        if (this.hp <= 0) {
            this.die();
        } else if (this.phase < BOSS.phases.length && this.hp / this.maxHp <= BOSS.phases[this.phase]) {
            this.nextPhase();
        }
        return true;
    }

    applyTint() {
        this.clearTint();
    }

    nextPhase() {
        this.phase++;
        this.attackIndex = 0;
        this.scene.tweens.killTweensOf(this);
        this.state = 'phase';
        this.invulnerable = true;
        this.play('boss_angry');     // se enoja mientras ruge
        this.emit('phase', this.phase);

        // Pequeñas explosiones mientras ruge
        for (let i = 0; i < 4; i++) {
            this.scene.time.delayedCall(i * 200, () => this.scene.fx.smallBoom(
                this.x + Phaser.Math.Between(-90, 90), this.y + Phaser.Math.Between(-70, 70)
            ));
        }

        this.scene.time.delayedCall(PHASE_PAUSE, () => {
            if (this.state !== 'phase') return;
            this.play(this.idleAnim);
            this.state = 'fight';
            this.invulnerable = false;
            this.applyTint();
            this.nextAttack = this.scene.now + 400;
        });
    }

    die() {
        this.state = 'dying';
        this.invulnerable = true;
        this.scene.tweens.killTweensOf(this);
        this.scene.registry.set('bossHp', 0);
        this.play('boss_defeated');  // pierde el monóculo y queda mareado
        this.emit('dying');

        // Cadena de explosiones, temblando cada vez más
        const booms = 14;
        for (let i = 0; i < booms; i++) {
            this.scene.time.delayedCall((i / booms) * DEATH_TIME, () => {
                this.scene.fx.smallBoom(this.x + Phaser.Math.Between(-110, 110), this.y + Phaser.Math.Between(-90, 90));
                // Destello corto en cada explosión, así se ve la animación de derrota
                this.setTintFill(i % 2 ? 0xffffff : 0xff8a65);
                this.scene.time.delayedCall(60, () => this.clearTint());
            });
        }
        this.scene.tweens.add({ targets: this, x: this.x + 5, duration: 40, yoyo: true, repeat: DEATH_TIME / 80 });

        // Al final cae girando y explota
        this.scene.time.delayedCall(DEATH_TIME, () => {
            this.clearTint();
            this.scene.fx.bigBoom(this.x, this.y);
            this.body.enable = false;
            this.scene.tweens.add({
                targets: this,
                y: this.scene.scale.height + 300,
                angle: -35,
                duration: 1400,
                ease: 'Quad.In',
                onComplete: () => this.setVisible(false)
            });
            this.emit('defeated');
        });
    }
}
