import Phaser from 'phaser';
import { PLAYER } from '../config/constants.js';
import { SKINS } from '../config/skins.js';
import Sfx from '../systems/Sfx.js';
import { getMusic } from '../systems/Music.js';
import { load } from '../systems/storage.js';
import ParallaxBackground from '../systems/ParallaxBackground.js';
import { applyFilm } from '../systems/OldFilmPipeline.js';
import { irisIn, irisOut } from './TransitionScene.js';

const TEXT = {
    title: 'DOG AIR RESCUE',
    subtitle: 'a tiny shoot \'em up',
    play: 'PLAY',
    howTo: 'HOW TO PLAY',
    options: 'OPTIONS',
    best: 'BEST',
    grade: 'GRADE',
    credits: 'Music: "Dark Forest" by Holizna (CC0)',
    controlsTitle: 'HOW TO PLAY',
    controls: [
        ['MOVE', 'Arrows / WASD'],
        ['SHOOT', 'Hold X / Space'],
        ['SUPER', 'C / Shift (when full)'],
        ['PAUSE', 'Esc / P'],
        ['MUTE', 'M']
    ],
    tip: 'Rescue the puppies in bubbles, grab power-ups\nand beat the boss! On mobile: drag to move, it fires on its own.',
    close: 'Press any key to go back'
};

const FONT = 'Arial Black, Arial, sans-serif';
const COLOR_IDLE = '#ffffff';
const COLOR_SELECTED = '#ffd54f';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        const { width, height } = this.scale;
        for (const key of ['UIScene', 'PauseScene', 'ResultsScene', 'OptionsScene']) this.scene.stop(key);

        this.sfx = new Sfx(this);
        this.music = getMusic();
        this.music.play();
        this.music.restore();

        this.background = new ParallaxBackground(this);
        applyFilm(this);

        const skinKey = PLAYER.skin;
        const skin = SKINS[skinKey];
        this.hero = this.add.sprite(250, height / 2 + 40, skin.atlas, this.anims.get(`${skinKey}_idle_straight`).frames[0].frame.name)
            .setScale(1.1)
            .play(`${skinKey}_idle_straight`);
        this.hero.setOrigin(skin.canvasCenter.x / this.hero.width, skin.canvasCenter.y / this.hero.height);
        this.heroBaseY = this.hero.y;

        this.hero.setX(-160);
        this.tweens.add({ targets: this.hero, x: 250, duration: 1100, delay: 200, ease: 'Back.Out' });

        const exhaust = skin.exhaust;
        const smoke = this.add.particles(0, 0, 'fx', {
            frame: ['fx_puff_0001', 'fx_puff_0002', 'fx_puff_0003'],
            speedX: { min: -170, max: -100 },
            speedY: { min: -18, max: 18 },
            lifespan: { min: 380, max: 560 },
            scale: { start: 0.15, end: 0.45 },
            rotate: { min: -60, max: 60 },
            alpha: { start: 0.7, end: 0 },
            tint: [0xb0b0b0, 0x9a9a9a, 0x808080],
            frequency: 40
        });
        smoke.startFollow(this.hero, exhaust.x * 1.1, exhaust.y * 1.1);
        this.children.moveBelow(smoke, this.hero);

        this.createTitle(width / 2, 95);

        const subtitle = this.add.text(width / 2, 160, TEXT.subtitle, {
            fontFamily: FONT,
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#4e342e',
            strokeThickness: 5
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: subtitle, alpha: 1, y: { from: 175, to: 160 }, duration: 400, delay: 1100 });

        this.buttons = [
            { label: () => TEXT.play, action: () => this.startGame() },
            { label: () => TEXT.howTo, action: () => this.showHowTo() },
            { label: () => TEXT.options, action: () => this.showOptions() }
        ];

        const menuX = width * 0.66;
        this.buttons.forEach((button, i) => {
            button.text = this.add.text(menuX, 270 + i * 62, button.label(), {
                fontFamily: FONT,
                fontSize: '34px',
                color: COLOR_IDLE,
                stroke: '#000000',
                strokeThickness: 7
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            button.text.on('pointerover', () => this.select(i));
            button.text.on('pointerdown', () => this.activate());

            button.text.setX(width + 150);
            this.tweens.add({ targets: button.text, x: menuX, duration: 500, delay: 700 + i * 110, ease: 'Back.Out' });
        });

        this.cursor = this.add.text(0, 0, '▶', {
            fontFamily: FONT, fontSize: '28px', color: COLOR_SELECTED, stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: this.cursor, alpha: 1, duration: 200, delay: 1200 });

        const best = load('best', 0);
        const grade = load('bestGrade', null);
        const record = grade ? `${TEXT.best} ${best}   ${TEXT.grade} ${grade}` : `${TEXT.best} ${best}`;
        const footer = [
            this.add.text(16, height - 14, record, {
                fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
            }).setOrigin(0, 1),
            this.add.text(width - 16, height - 14, TEXT.credits, {
                fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3
            }).setOrigin(1, 1)
        ];
        for (const text of footer) {
            text.setAlpha(0);
            this.tweens.add({ targets: text, alpha: 1, y: { from: height + 10, to: height - 14 }, duration: 400, delay: 1300 });
        }

        this.createHowToPanel();

        this.selected = 0;
        this.pressing = false;
        this.select(0, true);
        this.transitioning = false;

        this.input.keyboard.on('keydown', this.onKey, this);

        this.input.on('pointerdown', (pointer) => {
            if (pointer.wasTouch) this.registry.set('touchMode', true);
        });

        this.heroX = 250;
        this.loop = { t: 0 };
        this.time.addEvent({
            delay: 6500,
            startAt: 3500,
            loop: true,
            callback: () => {
                if (this.transitioning) return;
                this.loop.t = 0;
                this.sfx.whoosh(true);
                this.tweens.add({ targets: this.loop, t: 1, duration: 1500, ease: 'Sine.InOut' });
            }
        });

        irisIn(this, this.hero.x, this.hero.y);
    }

    update(time, delta) {
        this.background.update(delta);
        this.background.sun.lookAt(this.hero.x, this.hero.y);

        this.hero.y = this.heroBaseY + Math.sin(time * 0.002) * 14;
        this.hero.angle = Math.cos(time * 0.002) * 4;

        if (this.loop.t > 0 && this.loop.t < 1) {
            const theta = this.loop.t * Math.PI * 2;
            this.hero.x = this.heroX + Math.sin(theta) * 75;
            this.hero.y -= (1 - Math.cos(theta)) * 75;
            this.hero.angle = -Phaser.Math.RadToDeg(theta);
        }

        for (const letter of this.letters) {
            if (letter.landed) letter.y = Math.sin(time * 0.004 - letter.index * 0.45) * 5;
        }

        const current = this.buttons[this.selected].text;
        if (!this.pressing) current.angle = Math.sin(time * 0.005) * 2.5;

        const button = this.buttons[this.selected].text;
        this.cursor.x = button.x - button.width / 2 - 28 + Math.sin(time * 0.01) * 4;
        this.cursor.y = button.y;
    }

    onKey(event) {
        if (this.transitioning) return;

        if (this.panel.visible) {
            this.hideHowTo();
            return;
        }

        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.select((this.selected - 1 + this.buttons.length) % this.buttons.length);
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.select((this.selected + 1) % this.buttons.length);
                break;
            case 'Enter':
            case 'Space':
            case 'KeyX':
                this.activate();
                break;
            case 'KeyM':
                this.toggleMute();
                break;
        }
    }

    select(index, silent = false) {
        if (index === this.selected && !silent) return;
        this.selected = index;

        this.buttons.forEach((button, i) => {
            const isSelected = i === index;
            button.text.setColor(isSelected ? COLOR_SELECTED : COLOR_IDLE);
            if (!isSelected) button.text.setAngle(0);
            button.scaleTween?.stop();
            button.scaleTween = this.tweens.add({
                targets: button.text,
                scale: isSelected ? 1.15 : 1,
                duration: 140,
                ease: 'Back.Out'
            });
        });

        if (!silent) {
            this.cursor.setScale(1.6);
            this.tweens.add({ targets: this.cursor, scale: 1, duration: 200, ease: 'Back.Out' });
        }

        if (!silent) this.sfx.uiMove();
    }

    activate() {
        if (this.transitioning || this.panel.visible || this.pressing) return;
        const button = this.buttons[this.selected];

        this.pressing = true;
        button.scaleTween?.stop();
        button.text.setAngle(0);
        this.tweens.chain({
            targets: button.text,
            tweens: [
                { scaleX: 1.45, scaleY: 0.85, duration: 60, ease: 'Quad.Out' },
                { scaleX: 1.05, scaleY: 1.3, duration: 70, ease: 'Quad.Out' },
                { scaleX: 1.15, scaleY: 1.15, duration: 90, ease: 'Back.Out' }
            ],
            onComplete: () => { this.pressing = false; }
        });
        button.action();
    }

    createTitle(x, y) {
        const style = { fontFamily: FONT, fontSize: '72px', color: '#ffd54f', stroke: '#4e342e', strokeThickness: 12 };
        this.titleGroup = this.add.container(x, y);
        this.letters = [];

        const spaceWidth = 22;
        let cursorX = 0;
        [...TEXT.title].forEach((char) => {
            if (char === ' ') {
                cursorX += spaceWidth;
                return;
            }
            const letter = this.add.text(cursorX, 0, char, style).setOrigin(0, 0.5)
                .setShadow(6, 6, '#00000055', 0, true, true);
            cursorX += letter.width - 12;
            letter.index = this.letters.length;
            this.letters.push(letter);
            this.titleGroup.add(letter);
        });

        const total = cursorX + 12;
        for (const letter of this.letters) letter.x -= total / 2;

        this.letters.forEach((letter, i) => {
            letter.y = -220;
            letter.setAngle(Phaser.Math.Between(-30, 30));
            this.tweens.add({
                targets: letter,
                y: 0,
                angle: 0,
                duration: 650,
                delay: 250 + i * 45,
                ease: 'Bounce.Out',
                onComplete: () => {
                    letter.landed = true;
                    this.sfx.letterDrop();
                }
            });
        });

        this.tweens.add({
            targets: this.titleGroup,
            scale: 1.04,
            angle: { from: -1.5, to: 1.5 },
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }

    startGame() {
        this.transitioning = true;
        this.sfx.uiSelect();

        if (this.registry.get('touchMode') && !this.scale.isFullscreen) {
            try { this.scale.startFullscreen(); } catch { }
        }

        this.background.sun.setMood('cheer');
        if (SKINS[PLAYER.skin].anims.happy) this.hero.play(`${PLAYER.skin}_happy`);

        this.tweens.add({ targets: this.hero, scale: 1.5, duration: 160, yoyo: true, ease: 'Quad.Out' });
        irisOut(this, this.hero.x, this.hero.y, () => this.scene.start('GameScene'));
    }

    toggleMute() {
        const muted = this.sfx.toggleMute();
        this.music.setMuted(muted);
        this.sfx.uiSelect();
    }

    showOptions() {
        this.sfx.uiSelect();
        this.scene.launch('OptionsScene', { from: 'MenuScene' });
    }

    createHowToPanel() {
        const { width, height } = this.scale;
        this.panel = this.add.container(width / 2, height / 2).setDepth(10).setVisible(false);

        const bg = this.add.rectangle(0, 0, 560, 400, 0x1b2631, 0.92).setStrokeStyle(4, 0xffd54f);
        const title = this.add.text(0, -160, TEXT.controlsTitle, {
            fontFamily: FONT, fontSize: '32px', color: COLOR_SELECTED, stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        this.panel.add([bg, title]);
        this.howToRows = [];

        TEXT.controls.forEach(([action, keys], i) => {
            const y = -95 + i * 42;
            const left = this.add.text(-200, y, action, {
                fontFamily: FONT, fontSize: '22px', color: '#ffffff'
            }).setOrigin(0, 0.5);
            const right = this.add.text(200, y, keys, {
                fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#b3e5fc'
            }).setOrigin(1, 0.5);
            left.baseX = -200;
            right.baseX = 200;
            this.howToRows.push(left, right);
            this.panel.add([left, right]);
        });

        this.panel.add(this.add.text(0, 125, TEXT.tip, {
            fontFamily: 'Arial, sans-serif', fontSize: '17px', color: '#ffffff', align: 'center', fontStyle: 'italic'
        }).setOrigin(0.5));
        this.panel.add(this.add.text(0, 172, TEXT.close, {
            fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#90a4ae'
        }).setOrigin(0.5));

        bg.setInteractive().on('pointerdown', () => this.hideHowTo());
    }

    showHowTo() {
        this.sfx.uiSelect();
        this.panel.setVisible(true).setScale(0.85).setAlpha(0);
        this.tweens.add({ targets: this.panel, scale: 1, alpha: 1, duration: 180, ease: 'Back.Out' });

        this.howToRows.forEach((text, i) => {
            const x = text.baseX;
            text.setAlpha(0).setX(x + (text.originX === 0 ? -30 : 30));
            this.tweens.add({ targets: text, x, alpha: 1, duration: 220, delay: 120 + Math.floor(i / 2) * 70, ease: 'Quad.Out' });
        });
    }

    hideHowTo() {
        this.sfx.uiMove();
        this.tweens.add({
            targets: this.panel,
            scale: 0.85,
            alpha: 0,
            duration: 120,
            onComplete: () => this.panel.setVisible(false)
        });
    }
}
