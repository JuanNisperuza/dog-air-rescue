import Phaser from 'phaser';
import { PLAYER, BULLET, DEBUG } from '../config/constants.js';
import { SKINS } from '../config/skins.js';

// Avión del jugador. El arte, la hitbox y las animaciones vienen del skin (config/skins.js).
export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, bullets) {
        const skinKey = PLAYER.skin;
        const skin = SKINS[skinKey];
        super(scene, x, y, skin.atlas, `${skin.framePrefix}idle_straight_0001`);

        this.skinKey = skinKey;
        this.skin = skin;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // El dibujo no está centrado en su lienzo, así que anclamos en su centro real
        const { x: cx, y: cy } = skin.canvasCenter;
        this.setOrigin(cx / this.width, cy / this.height);

        // La hitbox se escala junto con el sprite
        this.setScale(PLAYER.scale);

        // Hitbox más pequeña que el dibujo; se siente más justo
        const { width: hw, height: hh } = skin.hitbox;
        this.body.setSize(hw, hh, false);
        this.body.setOffset(cx - hw / 2, cy - hh / 2);
        this.setCollideWorldBounds(true);

        this.bullets = bullets;
        this.hp = PLAYER.maxHp;
        this.nextShotTime = 0;
        this.invulnerable = false;
        this.pitch = 'straight'; // 'straight' | 'up' | 'down'

        // Se reutiliza para no crear un vector nuevo en cada frame
        this.moveDir = new Phaser.Math.Vector2();
        this.warnedPoolFull = false;

        this.play(this.animKey('idle_straight'));

        this.keys = scene.input.keyboard.addKeys({
            up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
            w: 'W', a: 'A', s: 'S', d: 'D',
            shoot: 'X', shootAlt: 'SPACE'
        });
    }

    // "idle_up" → "dog_idle_up"
    animKey(anim) {
        return `${this.skinKey}_${anim}`;
    }

    hasAnim(anim) {
        return this.skin.anims[anim] !== undefined;
    }

    update(time) {
        if (!this.active) return;
        const k = this.keys;

        // Movimiento en 8 direcciones
        const dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
        const dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);

        // normalize() para que en diagonal no vaya más rápido
        this.moveDir.set(dx, dy).normalize();
        this.setVelocity(this.moveDir.x * PLAYER.speed, this.moveDir.y * PLAYER.speed);

        this.updatePitchAnimation(dy);

        // Disparo con cadencia
        const shooting = k.shoot.isDown || k.shootAlt.isDown;
        if (shooting && time >= this.nextShotTime) {
            this.shoot();
            this.nextShotTime = time + PLAYER.fireRate;
        }
    }

    // Cambia la animación solo cuando cambia la dirección vertical
    updatePitchAnimation(dy) {
        const target = dy < 0 ? 'up' : dy > 0 ? 'down' : 'straight';
        if (target === this.pitch) return;

        const previous = this.pitch;
        this.pitch = target;

        this.anims.chain();

        // Si el skin no tiene transición, cambia directo
        const transition = target === 'straight' ? `trans_${previous}` : `trans_${target}`;
        if (!this.hasAnim(transition)) {
            this.play(this.animKey(`idle_${target}`));
            return;
        }

        if (target === 'straight') {
            // Para volver a recto se reproduce la transición al revés
            this.playReverse(this.animKey(transition));
        } else {
            this.play(this.animKey(transition));
        }
        this.anims.chain(this.animKey(`idle_${target}`));
    }

    shoot() {
        const angle = this.pitch === 'up' ? -BULLET.tiltAngle
            : this.pitch === 'down' ? BULLET.tiltAngle
            : 0;

        // Rotamos también la punta del arma para que la bala salga del avión inclinado
        const rad = Phaser.Math.DegToRad(angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const mx = this.skin.muzzle.x * PLAYER.scale;
        const my = this.skin.muzzle.y * PLAYER.scale;
        const x = this.x + mx * cos - my * sin;
        const y = this.y + mx * sin + my * cos;

        const bullet = this.bullets.get(x, y);
        if (bullet) {
            bullet.fire(x, y, angle);
            this.emit('shoot', x, y); // la escena decide los efectos (destello, sonido)
        } else if (DEBUG && !this.warnedPoolFull) {
            console.warn('Bullet pool is full: consider raising BULLET.poolSize');
            this.warnedPoolFull = true;
        }
    }

    // Devuelve true si el golpe hizo daño
    hit() {
        if (this.invulnerable || !this.active) return false;

        this.hp--;
        this.scene.registry.set('hp', this.hp);

        if (this.hp <= 0) {
            this.die();
            return true;
        }

        this.invulnerable = true;
        this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: Math.floor(PLAYER.invulnerableTime / 200) - 1,
            onComplete: () => {
                this.alpha = 1;
                this.invulnerable = false;
            }
        });

        return true;
    }

    die() {
        // El fantasma es un sprite aparte para no tocar el origen ni la hitbox del jugador
        const ghost = this.scene.add.sprite(this.x, this.y, this.skin.atlas)
            .setScale(PLAYER.scale)
            .play(this.animKey('ghost'));
        this.scene.tweens.add({
            targets: ghost,
            y: ghost.y - 250,
            alpha: 0,
            duration: 2500,
            onComplete: () => ghost.destroy()
        });

        this.disableBody(true, true);
        this.emit('died');
    }
}
