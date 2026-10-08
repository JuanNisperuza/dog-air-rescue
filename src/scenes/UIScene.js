import Phaser from 'phaser';
import { PLAYER, COMBO, POWERUPS, BOSS } from '../config/constants.js';
import TouchControls from '../systems/TouchControls.js';

const FONT = 'Arial Black, Arial, sans-serif';
const PUNCH_DECAY = 6;
const HEART_SPACING = 36;
const COMBO_COLORS = ['#ffffff', '#ffd54f', '#ffab40', '#ff7043', '#ff4081'];
const METER_WIDTH = 110;
const BOSS_BAR_WIDTH = 420;
const ICON_SCALE = 0.38;

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        const { width, height } = this.scale;
        this.game_ = this.scene.get('GameScene');

        this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0).setAlpha(0);

        this.hearts = [];
        for (let i = 0; i < PLAYER.maxHp; i++) {
            this.hearts.push(this.add.image(30 + i * HEART_SPACING, 30, 'heart'));
        }
        this.hp = PLAYER.maxHp;

        this.pupScale = 34 / this.textures.getFrame('fx', 'pup_happy_0001').realHeight;
        this.pupIcon = this.add.sprite(30 + PLAYER.maxHp * HEART_SPACING + 8, 30, 'fx', 'pup_happy_0001')
            .setScale(this.pupScale);
        this.pupText = this.add.text(this.pupIcon.x + 22, 30, 'x0', {
            fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0, 0.5);
        this.rescued = 0;

        this.heartBits = this.add.particles(0, 0, 'particle', {
            speed: { min: 80, max: 200 },
            lifespan: 500,
            scale: { start: 0.8, end: 0 },
            gravityY: 500,
            tint: [0xe53935, 0xff8a80, 0x3e0d0d],
            emitting: false
        });

        const superLabel = this.add.text(14, 50, 'SUPER', {
            fontFamily: FONT, fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
        });
        const superBg = this.add.rectangle(66, 59, METER_WIDTH + 4, 12, 0x000000, 0.55).setOrigin(0, 0.5);
        this.superBar = this.add.rectangle(68, 59, 1, 8, 0xffd54f).setOrigin(0, 0.5);
        this.superShine = this.add.rectangle(68, 59, 14, 8, 0xffffff).setOrigin(0.5).setVisible(false);
        this.superParts = [superLabel, superBg, this.superBar];
        this.superHint = this.add.text(66 + METER_WIDTH + 12, 59, 'C!', {
            fontFamily: FONT, fontSize: '16px', color: '#ffd54f', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0, 0.5).setVisible(false);
        this.superValue = 0;

        this.powerIcon = this.add.image(30, 92, 'fx', 'pu_spread').setScale(ICON_SCALE).setVisible(false);
        this.powerBarBg = this.add.rectangle(50, 92, 64, 8, 0x000000, 0.55).setOrigin(0, 0.5).setVisible(false);
        this.powerBar = this.add.rectangle(51, 92, 62, 5, 0xffffff).setOrigin(0, 0.5).setVisible(false);
        this.shieldIcon = this.add.image(132, 92, 'fx', 'pu_shield').setScale(ICON_SCALE).setVisible(false);

        this.scoreText = this.add.text(width - 16, 12, '', {
            fontFamily: FONT, fontSize: '26px', color: '#ffffff', stroke: '#000000', strokeThickness: 6
        }).setOrigin(1, 0);
        this.scorePunch = 0;

        this.comboGroup = this.add.container(width - 16, 52).setAlpha(0);
        this.comboMult = this.add.text(0, 0, '', {
            fontFamily: FONT, fontSize: '34px', color: '#ffffff', stroke: '#000000', strokeThickness: 7
        }).setOrigin(1, 0);
        this.comboCount = this.add.text(0, 40, '', {
            fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(1, 0);
        this.comboBarBg = this.add.rectangle(0, 64, 110, 6, 0x000000, 0.5).setOrigin(1, 0);
        this.comboBar = this.add.rectangle(-1, 65, 108, 4, 0xffd54f).setOrigin(1, 0);
        this.comboGroup.add([this.comboMult, this.comboCount, this.comboBarBg, this.comboBar]);
        this.comboPunch = 0;
        this.comboVisible = false;

        this.bossGroup = this.add.container(width / 2, height - 30).setVisible(false);
        const bossName = this.add.text(0, -22, BOSS.name, {
            fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5);
        const bossBg = this.add.rectangle(0, 0, BOSS_BAR_WIDTH + 6, 18, 0x2b1d14).setStrokeStyle(2, 0x000000);
        this.bossTrail = this.add.rectangle(-BOSS_BAR_WIDTH / 2, 0, BOSS_BAR_WIDTH, 12, 0xffffff).setOrigin(0, 0.5);
        this.bossBar = this.add.rectangle(-BOSS_BAR_WIDTH / 2, 0, BOSS_BAR_WIDTH, 12, 0xe53935).setOrigin(0, 0.5);
        const notches = BOSS.phases.map((p) =>
            this.add.rectangle(-BOSS_BAR_WIDTH / 2 + BOSS_BAR_WIDTH * p, 0, 3, 16, 0x000000));
        this.bossGroup.add([bossName, bossBg, this.bossTrail, this.bossBar, ...notches]);
        this.bossShown = 0;
        this.bossTrailShown = 0;

        this.bannerText = this.add.text(width / 2, height / 2 - 40, '', {
            fontFamily: FONT, fontSize: '80px', color: '#ffffff', stroke: '#2b1d14', strokeThickness: 14
        }).setOrigin(0.5).setShadow(6, 6, '#00000066', 0, true, true).setVisible(false);

        this.barTop = this.add.rectangle(0, 0, width, 70, 0x000000).setOrigin(0, 0).setDepth(50).setScale(1, 0);
        this.barBottom = this.add.rectangle(0, height, width, 70, 0x000000).setOrigin(0, 1).setDepth(50).setScale(1, 0);

        this.trail = this.add.particles(0, 0, 'particle', {
            lifespan: 350,
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.9, end: 0 },
            tint: [0xfff59d, 0xffffff, 0x80d8ff],
            blendMode: 'ADD',
            emitting: false
        }).setDepth(39);

        this.touch = new TouchControls(this);

        this.score = this.registry.get('score');
        this.shownScore = this.score;
        this.scoreText.setText('SCORE ' + this.score);
        this.scorePunch = 0;
        this.superWasReady = false;

        this.playIntro();

        const listeners = {
            'changedata-hp': this.onHpChanged,
            'changedata-score': this.onScoreChanged,
            'changedata-combo': this.onComboChanged,
            'changedata-power': this.onPowerChanged,
            'changedata-shield': this.onShieldChanged,
            'changedata-banner': this.onBanner,
            'changedata-playing': this.onPlayingChanged,
            'changedata-cinema': this.onCinema,
            'changedata-titleCard': this.onTitleCard,
            'changedata-collect': this.onCollect
        };
        for (const [event, fn] of Object.entries(listeners)) this.registry.events.on(event, fn, this);

        // Without this, restarting stacks duplicate listeners
        this.events.once('shutdown', () => {
            for (const [event, fn] of Object.entries(listeners)) this.registry.events.off(event, fn, this);
        });
    }

    update(time, delta) {
        const dt = delta / 1000;
        const playing = this.registry.get('playing');

        this.hearts.forEach((heart, i) => {
            if (heart.breaking) return;
            if (i >= this.hp) {
                heart.setScale(1);
                return;
            }
            const danger = this.hp === 1;
            const speed = danger ? 0.012 : 0.004;
            const beat = Math.max(0, Math.sin(time * speed - i * 0.6));
            heart.setScale(1 + beat * beat * (danger ? 0.3 : 0.1));
        });

        const danger = this.hp === 1 && playing;
        if (danger && this.scene.isActive('GameScene')) this.game_.sfx.heartbeat();
        const targetAlpha = danger ? 0.35 + Math.max(0, Math.sin(time * 0.012)) * 0.35 : 0;
        this.vignette.setAlpha(Phaser.Math.Linear(this.vignette.alpha, targetAlpha, 0.15));

        if (this.shownScore !== this.score) {
            const step = Math.max(1, Math.ceil((this.score - this.shownScore) * 0.2));
            this.shownScore = Math.min(this.score, this.shownScore + step);
            this.scoreText.setText('SCORE ' + this.shownScore);
        }

        if (this.scorePunch > 0) {
            this.scorePunch = Math.max(0, this.scorePunch - PUNCH_DECAY * dt);
            this.scoreText.setScale(1 + 0.3 * this.scorePunch);
        }

        if (this.comboVisible) {
            if (this.comboPunch > 0) {
                this.comboPunch = Math.max(0, this.comboPunch - PUNCH_DECAY * dt);
                this.comboMult.setScale(1 + 0.5 * this.comboPunch);
            }
            const left = this.registry.get('comboExpires') - this.game_.now;
            this.comboBar.setSize(Math.max(1, 108 * Phaser.Math.Clamp(left / COMBO.window, 0, 1)), 4);
        }

        this.updateSuper(time);
        this.updatePower();
        this.updateBossBar();
    }

    updateSuper(time) {
        const target = this.registry.get('super') ?? 0;
        this.superValue = Phaser.Math.Linear(this.superValue, target, 0.2);
        this.superBar.setSize(Math.max(1, METER_WIDTH * this.superValue), 8);

        const ready = target >= 1;
        if (ready && !this.superWasReady) this.superReadyBurst();
        this.superWasReady = ready;
        this.superHint.setVisible(ready && this.registry.get('playing') && !this.touch.state.enabled);
        if (ready) {
            const flash = Math.sin(time * 0.015) > 0;
            this.superBar.setFillStyle(flash ? 0xffffff : 0xffd54f);
            this.superHint.setScale(1 + Math.max(0, Math.sin(time * 0.015)) * 0.25);
        } else {
            this.superBar.setFillStyle(0xffd54f);
        }
        this.touch.setSuperReady(ready, time);
    }

    updatePower() {
        if (!this.powerIcon.visible) return;
        const left = this.registry.get('powerUntil') - this.game_.now;
        this.powerBar.setSize(Math.max(1, 62 * Phaser.Math.Clamp(left / POWERUPS.duration, 0, 1)), 5);
        this.powerIcon.setAlpha(left < 2000 && Math.floor(left / 150) % 2 ? 0.3 : 1);
    }

    updateBossBar() {
        const hp = this.registry.get('bossHp');
        if (hp < 0) {
            if (this.bossGroup.visible && !this.bossHiding) {
                this.bossHiding = true;
                this.tweens.add({
                    targets: this.bossGroup, alpha: 0, y: this.scale.height + 50, duration: 500, ease: 'Back.In',
                    onComplete: () => { this.bossGroup.setVisible(false); this.bossHiding = false; }
                });
            }
            return;
        }
        if (!this.bossGroup.visible) {
            const y = this.scale.height - 30;
            this.bossGroup.setVisible(true).setAlpha(1).setY(y + 80);
            this.tweens.add({ targets: this.bossGroup, y, duration: 500, ease: 'Back.Out' });
            this.bossShown = 0;
            this.bossTrailShown = 1;
        }
        this.bossShown = Phaser.Math.Linear(this.bossShown, hp, 0.2);
        this.bossTrailShown = this.bossTrailShown > hp ? Phaser.Math.Linear(this.bossTrailShown, hp, 0.04) : this.bossShown;
        this.bossBar.setSize(Math.max(0.01, BOSS_BAR_WIDTH * this.bossShown), 12);
        this.bossTrail.setSize(Math.max(0.01, BOSS_BAR_WIDTH * this.bossTrailShown), 12);
    }

    onHpChanged(parent, value) {
        const previous = this.hp;
        this.hp = value;

        this.hearts.forEach((heart, i) => {
            if (i < value) {
                if (i >= previous) this.refillHeart(heart);
                else heart.setTexture('heart');
            } else if (i < previous) {
                this.breakHeart(heart);
            }
        });
    }

    breakHeart(heart) {
        heart.breaking = true;
        heart.setTintFill(0xffffff);
        this.tweens.add({
            targets: heart,
            scale: 1.7,
            duration: 120,
            ease: 'Quad.Out',
            yoyo: true,
            onComplete: () => {
                heart.clearTint().setTexture('heart_empty').setScale(1);
                this.heartBits.explode(10, heart.x, heart.y);
                this.tweens.add({
                    targets: heart,
                    x: heart.x + 4,
                    duration: 40,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => { heart.breaking = false; }
                });
            }
        });
    }

    refillHeart(heart) {
        heart.breaking = true;
        heart.setTexture('heart').setScale(0);
        this.tweens.add({
            targets: heart,
            scale: 1,
            duration: 400,
            ease: 'Back.Out',
            onComplete: () => { heart.breaking = false; }
        });
    }

    onScoreChanged(parent, value) {
        this.score = value;
        if (value < this.shownScore) this.shownScore = value;
        this.scorePunch = 1;
    }

    playIntro() {
        this.hearts.forEach((heart, i) => {
            heart.breaking = true;
            heart.setScale(0);
            this.tweens.add({
                targets: heart,
                scale: 1,
                duration: 350,
                delay: 300 + i * 120,
                ease: 'Back.Out',
                onComplete: () => { heart.breaking = false; }
            });
        });

        const scoreY = this.scoreText.y;
        this.scoreText.setY(-40);
        this.tweens.add({ targets: this.scoreText, y: scoreY, duration: 500, delay: 400, ease: 'Bounce.Out' });

        for (const obj of this.superParts) {
            const x = obj.x;
            obj.setX(x - 200);
            this.tweens.add({ targets: obj, x, duration: 450, delay: 650, ease: 'Back.Out' });
        }
    }

    superReadyBurst() {
        const text = this.add.text(70 + METER_WIDTH / 2, 59, 'SUPER READY!', {
            fontFamily: FONT, fontSize: '18px', color: '#ffd54f', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setScale(0.3);
        this.tweens.add({ targets: text, scale: 1.2, y: 84, duration: 300, ease: 'Back.Out' });
        this.tweens.add({ targets: text, alpha: 0, y: 70, delay: 900, duration: 400, onComplete: () => text.destroy() });

        this.superShine.setX(68).setAlpha(0.9).setVisible(true);
        this.tweens.add({
            targets: this.superShine, x: 68 + METER_WIDTH, alpha: 0, duration: 450, ease: 'Quad.In',
            onComplete: () => this.superShine.setVisible(false)
        });
    }

    onComboChanged(parent, count) {
        if (count < 2) {
            this.lastMultiplier = 1;
            if (this.comboVisible) {
                this.comboVisible = false;
                this.tweens.add({ targets: this.comboGroup, alpha: 0, duration: 250 });
            }
            return;
        }

        const multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(count / COMBO.killsPerLevel));
        const color = COMBO_COLORS[multiplier - 1];
        if (multiplier > (this.lastMultiplier ?? 1)) this.praise(multiplier, color);
        this.lastMultiplier = multiplier;
        this.comboMult.setText('x' + multiplier).setColor(color);
        this.comboCount.setText('COMBO ' + count);
        this.comboBar.setFillStyle(Phaser.Display.Color.HexStringToColor(color).color);
        this.comboPunch = 1;

        this.comboMult.setAngle(Phaser.Math.Between(-12, 12));
        this.tweens.add({ targets: this.comboMult, angle: 0, duration: 250, ease: 'Back.Out' });

        if (!this.comboVisible) {
            this.comboVisible = true;
            this.tweens.killTweensOf(this.comboGroup);
            this.comboGroup.setAlpha(1).setX(this.scale.width + 120);
            this.tweens.add({ targets: this.comboGroup, x: this.scale.width - 16, duration: 300, ease: 'Back.Out' });
        }
    }

    praise(multiplier, color) {
        const words = ['', '', 'NICE!', 'GREAT!', 'AWESOME!', 'PAWSOME!'];
        const text = this.add.text(this.scale.width - 130, 150, words[multiplier], {
            fontFamily: FONT, fontSize: '40px', color, stroke: '#2b1d14', strokeThickness: 9
        }).setOrigin(0.5).setAngle(-10).setScale(0).setDepth(20);
        this.tweens.chain({
            targets: text,
            tweens: [
                { scale: 1.3, angle: 6, duration: 180, ease: 'Back.Out' },
                { scale: 1, angle: -4, duration: 160 },
                { y: 110, alpha: 0, duration: 400, delay: 500, ease: 'Quad.In' }
            ],
            onComplete: () => text.destroy()
        });
    }

    onPowerChanged(parent, kind) {
        const show = !!kind;
        for (const obj of [this.powerIcon, this.powerBarBg, this.powerBar]) obj.setVisible(show);
        if (!show) return;
        this.powerIcon.setTexture('fx', `pu_${kind}`).setScale(0.8);
        this.tweens.add({ targets: this.powerIcon, scale: ICON_SCALE, duration: 300, ease: 'Back.Out' });
    }

    onShieldChanged(parent, on) {
        if (on) {
            this.shieldIcon.setVisible(true).setScale(0.8);
            this.tweens.add({ targets: this.shieldIcon, scale: ICON_SCALE, duration: 300, ease: 'Back.Out' });
        } else {
            this.tweens.add({
                targets: this.shieldIcon, scale: 0, duration: 200,
                onComplete: () => this.shieldIcon.setVisible(false)
            });
        }
    }

    onBanner(parent, banner) {
        if (!banner) return;
        const text = this.bannerText;
        this.tweens.killTweensOf(text);
        text.setText(banner.text).setColor(banner.color).setVisible(true).setAlpha(1).setScale(0).setAngle(-6);
        this.tweens.add({ targets: text, scale: 1, angle: 0, duration: 350, ease: 'Back.Out' });
        this.tweens.add({
            targets: text,
            alpha: 0,
            scale: 1.3,
            delay: 900,
            duration: 300,
            onComplete: () => text.setVisible(false)
        });
    }

    onCinema(parent, on) {
        this.game_.sfx.whoosh(on);
        this.tweens.killTweensOf([this.barTop, this.barBottom]);
        this.tweens.add({
            targets: [this.barTop, this.barBottom],
            scaleY: on ? 1 : 0,
            duration: on ? 450 : 350,
            ease: on ? 'Quad.Out' : 'Quad.In'
        });
    }

    onTitleCard(parent, card) {
        if (!card) return;
        this.game_.sfx.titleCard();
        const { width, height } = this.scale;

        const ribbon = this.add.rectangle(0, 0, 640, 130, 0xc62828).setStrokeStyle(6, 0x2b1d14);
        const stripe = this.add.rectangle(0, 20, 640, 6, 0xffd54f);
        const name = this.add.text(0, -22, card.name, {
            fontFamily: FONT, fontSize: '46px', color: '#ffffff', stroke: '#2b1d14', strokeThickness: 10
        }).setOrigin(0.5);
        const subtitle = this.add.text(0, 44, card.subtitle, {
            fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'italic', color: '#ffffff', stroke: '#2b1d14', strokeThickness: 5
        }).setOrigin(0.5);
        const group = this.add.container(-400, height / 2 + 110, [ribbon, stripe, name, subtitle]).setDepth(45).setAngle(-4);

        this.tweens.chain({
            targets: group,
            tweens: [
                { x: width / 2, duration: 450, ease: 'Back.Out' },
                { scale: 1.05, duration: 140, yoyo: true, ease: 'Quad.Out' },
                { x: width / 2 + 10, duration: 1300 },
                { x: width + 400, duration: 350, ease: 'Back.In' }
            ],
            onComplete: () => group.destroy()
        });

        const full = card.name;
        const step = Math.min(35, 500 / full.length);
        name.setText('');
        for (let i = 1; i <= full.length; i++) {
            this.time.delayedCall(200 + i * step, () => {
                if (!name.scene) return;
                name.setText(full.slice(0, i));
                this.game_.sfx.typeTick();
            });
        }
    }

    onCollect(parent, item) {
        if (!item) return;
        const isPuppy = item.kind === 'puppy';
        const isSuper = item.kind === 'super';
        const target = isPuppy ? this.pupIcon
            : isSuper ? this.superBar
            : item.kind === 'shield' ? this.shieldIcon
            : this.powerIcon;

        const flyer = isPuppy
            ? this.add.sprite(item.x, item.y, 'fx', 'pup_happy_0001').play('pup_happy').setScale(this.pupScale * 1.8)
            : this.add.image(item.x, item.y, 'fx', `pu_${item.kind}`).setScale(0.8);
        flyer.setDepth(40);

        const start = new Phaser.Math.Vector2(item.x, item.y);
        const end = isSuper
            ? new Phaser.Math.Vector2(target.x + METER_WIDTH / 2, target.y)
            : new Phaser.Math.Vector2(target.x, target.y);
        const control = new Phaser.Math.Vector2(Phaser.Math.Linear(start.x, end.x, 0.35), Math.min(start.y, end.y) - 140);
        const curve = new Phaser.Curves.QuadraticBezier(start, control, end);
        const startScale = flyer.scale;
        const endScale = isPuppy ? this.pupScale : isSuper ? 0.2 : ICON_SCALE;
        const point = new Phaser.Math.Vector2();
        const progress = { t: 0 };

        this.tweens.add({ targets: flyer, scale: startScale * 1.4, duration: 120, yoyo: true });
        this.tweens.add({
            targets: progress,
            t: 1,
            delay: 200,
            duration: 650,
            ease: 'Cubic.In',
            onUpdate: () => {
                curve.getPoint(progress.t, point);
                flyer.setPosition(point.x, point.y);
                flyer.setScale(Phaser.Math.Linear(startScale, endScale, progress.t));
                flyer.angle = progress.t * 360;
                this.trail.emitParticleAt(point.x, point.y, 1);
            },
            onComplete: () => {
                flyer.destroy();
                this.trail.explode(10, end.x, end.y);
                if (isSuper) {
                    this.superBar.setScale(1, 2.2);
                    this.tweens.add({ targets: this.superBar, scaleY: 1, duration: 350, ease: 'Back.Out' });
                } else {
                    this.tweens.killTweensOf(target);
                    target.setScale(endScale * 1.7);
                    this.tweens.add({ targets: target, scale: endScale, duration: 350, ease: 'Back.Out' });
                }
                if (isPuppy) {
                    this.pupIcon.play('pup_happy');
                    this.time.delayedCall(1200, () => this.pupIcon.stop().setFrame('pup_happy_0001'));
                    this.rescued++;
                    this.pupText.setText('x' + this.rescued).setScale(1.5);
                    this.tweens.add({ targets: this.pupText, scale: 1, duration: 300, ease: 'Back.Out' });
                }
            }
        });
    }

    onPlayingChanged(parent, playing) {
        this.touch.setVisible(playing);
    }
}
