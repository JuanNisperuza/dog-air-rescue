import Phaser from 'phaser';
import { PLAYER, BULLET, POWERUPS, DEBUG } from '../config/constants.js';
import { SKINS } from '../config/skins.js';

// Avión del jugador. El arte, la hitbox y las animaciones vienen del skin (config/skins.js).
export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, bullets) {
        const skinKey = PLAYER.skin;
        const skin = SKINS[skinKey];
        // Primer frame del vuelo (la animación ya existe: la crea BootScene)
        super(scene, x, y, skin.atlas, scene.anims.get(`${skinKey}_idle_straight`).frames[0].frame.name);

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

        // Power-ups
        this.power = null;          // 'spread' | 'rapid' | null
        this.powerUntil = 0;
        this.shield = false;
        this.shieldRing = scene.add.image(x, y, 'ring')
            .setTint(0x64b5f6).setBlendMode('ADD').setAlpha(0.8).setDepth(9).setVisible(false);

        // Se reutiliza para no crear un vector nuevo en cada frame
        this.moveDir = new Phaser.Math.Vector2();
        this.warnedPoolFull = false;

        this.play(this.animKey('idle_straight'));

        // Disco de la hélice girando, encima de la nariz del avión
        if (skin.propeller) {
            this.prop = scene.add.image(x, y, 'propblur').setDepth(this.depth + 0.1).setScale(PLAYER.scale);
        }

        this.keys = scene.input.keyboard.addKeys({
            up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
            w: 'W', a: 'A', s: 'S', d: 'D',
            shoot: 'X', shootAlt: 'SPACE',
            super: 'C', superAlt: 'SHIFT'
        });
    }

    // "idle_up" → "dog_idle_up"
    animKey(anim) {
        return `${this.skinKey}_${anim}`;
    }

    // Reproduce una animación una vez (golpe, súper) y vuelve a volar normal
    playAction(anim) {
        if (!this.hasAnim(anim) || !this.active) return;
        this.anims.chain();
        this.play(this.animKey(anim));
        this.chain(this.animKey(this.pitch !== 'straight' && this.hasAnim(`idle_${this.pitch}`) ? `idle_${this.pitch}` : 'idle_straight'));
    }

    // Celebración en bucle (al ganar)
    celebrate() {
        if (!this.hasAnim('happy') || !this.active) return;
        this.anims.chain();
        this.play(this.animKey('happy'));
    }

    hasAnim(anim) {
        return this.skin.anims[anim] !== undefined;
    }

    // Movimiento secundario hecho con código: hélice y respiración
    animateDetails(time, delta) {
        // Hélice: el óvalo se achata y se estira muy rápido, como aspas girando
        if (this.prop) {
            const { x: px, y: py } = this.skin.propeller;
            const rad = Phaser.Math.DegToRad(this.angle);
            const sx = px * this.scaleX;
            const sy = py * this.scaleY;
            this.prop.setPosition(this.x + sx * Math.cos(rad) - sy * Math.sin(rad), this.y + sx * Math.sin(rad) + sy * Math.cos(rad));
            this.prop.setAngle(this.angle);
            const spin = Math.abs(Math.sin(time * 0.045));
            this.prop.setScale(PLAYER.scale * (0.5 + spin * 0.6), PLAYER.scale * (0.85 + spin * 0.2));
            this.prop.setAlpha(this.alpha * (0.2 + spin * 0.25)).setVisible(this.visible); // suave: deja ver la hélice dibujada
        }

        // Respira: se estira y encoge un poco (si no hay un aplastón en curso)
        if (!this.squashing) {
            const breathe = Math.sin(time * 0.006) * 0.025;
            this.setScale(PLAYER.scale * (1 - breathe * 0.6), PLAYER.scale * (1 + breathe));
        }
    }

    update(time, delta = 16) {
        if (!this.active) return;
        this.animateDetails(time, delta);

        // Durante las escenas de cine el jugador no se controla
        if (this.locked) {
            this.setVelocity(0, 0);
            this.scene.fx.setSpeedLines(false);
            this.angle = Phaser.Math.Linear(this.angle, Math.sin(time * 0.005) * 1.5, 0.15);
            return;
        }

        const k = this.keys;
        const touch = this.scene.registry.get('touchInput'); // lo llena UIScene en celulares

        // Movimiento en 8 direcciones
        let dx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
        let dy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);

        if (touch?.active) {
            // Joystick analógico: ya viene con largo entre 0 y 1
            this.moveDir.set(touch.x, touch.y);
            dx = Math.abs(touch.x) > 0.3 ? Math.sign(touch.x) : 0;
            dy = Math.abs(touch.y) > 0.3 ? Math.sign(touch.y) : 0;
        } else {
            // normalize() para que en diagonal no vaya más rápido
            this.moveDir.set(dx, dy).normalize();
        }
        this.setVelocity(this.moveDir.x * PLAYER.speed, this.moveDir.y * PLAYER.speed);

        this.updatePitchAnimation(dy);

        // Bamboleo: se inclina un poco al subir/bajar y oscila suave todo el tiempo
        const tilt = this.moveDir.y * (this.skin.tilt ?? PLAYER.tilt) + Math.sin(time * 0.005) * 1.5;
        this.angle = Phaser.Math.Linear(this.angle, tilt, 0.15);

        // Líneas de velocidad al acelerar hacia adelante
        this.scene.fx.setSpeedLines(dx > 0);

        // Más humo al acelerar hacia adelante, menos al frenar
        const smokeRate = dx > 0 ? 22 : dx < 0 ? 90 : 45;
        if (this.smoke && smokeRate !== this.smokeRate) {
            this.smoke.setFrequency(smokeRate);
            this.smokeRate = smokeRate;
        }

        // Se acaba el power-up
        if (this.power && this.scene.now >= this.powerUntil) {
            this.power = null;
            this.scene.registry.set('power', null);
        }

        if (this.shield) this.shieldRing.setPosition(this.x, this.y).setScale(0.85 + Math.sin(time * 0.01) * 0.05);

        // Disparo con cadencia (en celular dispara solo)
        const shooting = k.shoot.isDown || k.shootAlt.isDown || touch?.enabled;
        if (shooting && time >= this.nextShotTime) {
            this.shoot();
            const rate = this.power === 'rapid' ? PLAYER.fireRate * POWERUPS.rapidFactor : PLAYER.fireRate;
            this.nextShotTime = time + rate;
        }

        const superPressed = Phaser.Input.Keyboard.JustDown(k.super) || Phaser.Input.Keyboard.JustDown(k.superAlt);
        if (superPressed || touch?.superPressed) {
            if (touch) touch.superPressed = false;
            this.emit('super');
        }
    }

    // kind: 'spread' | 'rapid' | 'shield'
    givePowerUp(kind) {
        if (kind === 'shield') {
            this.shield = true;
            this.shieldRing.setVisible(true);
            this.scene.registry.set('shield', true);
            return;
        }
        this.power = kind;
        this.powerUntil = this.scene.now + POWERUPS.duration;
        this.scene.registry.set('powerUntil', this.powerUntil);
        this.scene.registry.set('power', kind);
    }

    heal() {
        if (this.hp >= PLAYER.maxHp) return false;
        this.hp++;
        this.scene.registry.set('hp', this.hp);
        return true;
    }

    // Invulnerable por un rato sin perder vida (lo usa el súper)
    // glow: brillo dorado (el súper); sin glow se usa en las escenas de cine
    protect(ms, glow = true) {
        this.invulnerable = true;
        this.protectedUntil = this.scene.now + ms;
        if (glow) this.setTint(0xfff59d);
        this.scene.time.delayedCall(ms, () => {
            if (this.scene.now < this.protectedUntil - 1) return; // otro protect lo extendió
            this.clearTint();
            this.invulnerable = false;
        });
    }

    // Cambia la animación solo cuando cambia la dirección vertical
    updatePitchAnimation(dy) {
        const target = dy < 0 ? 'up' : dy > 0 ? 'down' : 'straight';
        if (target === this.pitch) return;

        const previous = this.pitch;
        this.pitch = target;

        // Skins sin poses de subir/bajar: solo se rota (en update)
        if (!this.hasAnim('idle_up')) return;

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

        const angles = this.power === 'spread'
            ? [angle - POWERUPS.spreadAngle, angle, angle + POWERUPS.spreadAngle]
            : [angle];

        let fired = false;
        for (const a of angles) {
            const bullet = this.bullets.get(x, y);
            if (!bullet) break;
            bullet.fire(x, y, a);
            fired = true;
        }

        if (fired) {
            this.emit('shoot', x, y); // la escena decide los efectos (destello, sonido)
        } else if (DEBUG && !this.warnedPoolFull) {
            console.warn('Bullet pool is full: consider raising BULLET.poolSize');
            this.warnedPoolFull = true;
        }
    }

    // Devuelve false si no pasó nada, 'shield' si lo paró el escudo o 'hurt' si hizo daño
    hit() {
        if (this.invulnerable || !this.active) return false;

        if (this.shield) {
            this.shield = false;
            this.shieldRing.setVisible(false);
            this.scene.registry.set('shield', false);
            this.blink(800);
            return 'shield';
        }

        this.hp--;
        this.scene.registry.set('hp', this.hp);

        if (this.hp <= 0) {
            this.die();
            return 'hurt';
        }

        this.blink(PLAYER.invulnerableTime);
        this.squash();
        this.playAction('hurt');
        return 'hurt';
    }

    // Aplastón de caricatura al recibir un golpe
    squash() {
        const s = PLAYER.scale;
        this.squashing = true;
        this.scene.tweens.add({
            targets: this,
            scaleX: { from: s * 1.35, to: s },
            scaleY: { from: s * 0.65, to: s },
            duration: 350,
            ease: 'Elastic.Out',
            easeParams: [1.2, 0.4],
            onComplete: () => { this.squashing = false; }
        });
    }

    // Parpadea y queda invulnerable durante ms
    blink(ms) {
        this.invulnerable = true;
        this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            duration: 100,
            yoyo: true,
            repeat: Math.floor(ms / 200) - 1,
            onComplete: () => {
                this.alpha = 1;
                this.invulnerable = this.scene.now < (this.protectedUntil ?? 0); // el súper puede seguir activo
            }
        });
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

        this.shieldRing.setVisible(false);
        this.prop?.setVisible(false);
        this.disableBody(true, true);
        this.emit('died');
    }
}
