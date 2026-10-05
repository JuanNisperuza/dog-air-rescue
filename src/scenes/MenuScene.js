import Phaser from 'phaser';
import { PLAYER, SOUND } from '../config/constants.js';
import { SKINS } from '../config/skins.js';
import Sfx from '../systems/Sfx.js';
import { getMusic } from '../systems/Music.js';
import { load } from '../systems/storage.js';
import ParallaxBackground from '../systems/ParallaxBackground.js';

// Menú principal. Se navega con las flechas + Enter/Espacio/X o con el mouse.
const TEXT = {
    title: 'DOG AIR RESCUE',
    subtitle: 'a tiny shoot \'em up',
    play: 'PLAY',
    howTo: 'HOW TO PLAY',
    soundOn: 'SOUND: ON',
    soundOff: 'SOUND: OFF',
    best: 'BEST',
    credits: 'Music: "Dark Forest" by Holizna (CC0)',
    controlsTitle: 'HOW TO PLAY',
    controls: [
        ['MOVE', 'Arrows / WASD'],
        ['SHOOT', 'Hold X / Space'],
        ['MUTE', 'M'],
        ['RETRY', 'R'],
        ['MENU', 'Esc']
    ],
    tip: 'Tip: you shoot upward while climbing\nand downward while diving.',
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
        this.scene.stop('UIScene'); // por si venimos de una partida

        this.sfx = new Sfx(this);
        this.music = getMusic();
        this.music.play();
        this.music.fadeTo(SOUND.musicVolume, 800);

        // Fondo
        this.background = new ParallaxBackground(this);

        // Personaje volando
        const skinKey = PLAYER.skin;
        const skin = SKINS[skinKey];
        this.hero = this.add.sprite(250, height / 2 + 40, skin.atlas)
            .setScale(1.3)
            .play(`${skinKey}_idle_straight`);
        this.heroBaseY = this.hero.y;

        // Título
        this.title = this.add.text(width / 2, 95, TEXT.title, {
            fontFamily: FONT,
            fontSize: '72px',
            color: '#ffd54f',
            stroke: '#4e342e',
            strokeThickness: 12
        }).setOrigin(0.5).setShadow(6, 6, '#00000055', 0, true, true);

        this.add.text(width / 2, 160, TEXT.subtitle, {
            fontFamily: FONT,
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#4e342e',
            strokeThickness: 5
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.title,
            scale: 1.05,
            angle: { from: -2, to: 2 },
            duration: 1400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });

        // Botones
        this.buttons = [
            { label: () => TEXT.play, action: () => this.startGame() },
            { label: () => TEXT.howTo, action: () => this.showHowTo() },
            { label: () => (this.sfx.muted ? TEXT.soundOff : TEXT.soundOn), action: () => this.toggleSound() }
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
        });

        this.cursor = this.add.text(0, 0, '▶', {
            fontFamily: FONT, fontSize: '28px', color: COLOR_SELECTED, stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        // Pie
        const best = load('best', 0);
        this.add.text(16, height - 14, `${TEXT.best} ${best}`, {
            fontFamily: FONT, fontSize: '22px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0, 1);
        this.add.text(width - 16, height - 14, TEXT.credits, {
            fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3
        }).setOrigin(1, 1);

        this.createHowToPanel();

        // Teclado
        this.selected = 0;
        this.select(0, true);
        this.transitioning = false;

        this.input.keyboard.on('keydown', this.onKey, this);

        this.cameras.main.fadeIn(400, 0, 0, 0);
    }

    update(time, delta) {
        this.background.update(delta);

        this.hero.y = this.heroBaseY + Math.sin(time * 0.002) * 14;
        this.hero.angle = Math.cos(time * 0.002) * 4;

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
                this.toggleSound();
                break;
        }
    }

    select(index, silent = false) {
        if (index === this.selected && !silent) return;
        this.selected = index;

        this.buttons.forEach((button, i) => {
            const isSelected = i === index;
            button.text.setColor(isSelected ? COLOR_SELECTED : COLOR_IDLE);
            this.tweens.killTweensOf(button.text);
            this.tweens.add({
                targets: button.text,
                scale: isSelected ? 1.15 : 1,
                duration: 120,
                ease: 'Back.Out'
            });
        });

        if (!silent) this.sfx.uiMove();
    }

    activate() {
        if (this.transitioning || this.panel.visible) return;
        this.buttons[this.selected].action();
    }

    startGame() {
        this.transitioning = true;
        this.sfx.uiSelect();

        this.tweens.add({ targets: this.hero, x: this.scale.width + 150, duration: 600, ease: 'Quad.In' });
        // Si el fadeIn inicial sigue corriendo, Phaser ignora el fadeOut y nunca
        // llega el evento de fin, así que lo cortamos primero
        this.cameras.main.resetFX();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    }

    toggleSound() {
        const muted = this.sfx.toggleMute();
        this.music.setMuted(muted);
        this.buttons[2].text.setText(this.buttons[2].label());
        this.sfx.uiSelect(); // si quedó en silencio, no suena (y está bien)
    }

    // Panel "how to play"

    createHowToPanel() {
        const { width, height } = this.scale;
        this.panel = this.add.container(width / 2, height / 2).setDepth(10).setVisible(false);

        const bg = this.add.rectangle(0, 0, 560, 400, 0x1b2631, 0.92).setStrokeStyle(4, 0xffd54f);
        const title = this.add.text(0, -160, TEXT.controlsTitle, {
            fontFamily: FONT, fontSize: '32px', color: COLOR_SELECTED, stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        this.panel.add([bg, title]);

        TEXT.controls.forEach(([action, keys], i) => {
            const y = -95 + i * 42;
            this.panel.add(this.add.text(-200, y, action, {
                fontFamily: FONT, fontSize: '22px', color: '#ffffff'
            }).setOrigin(0, 0.5));
            this.panel.add(this.add.text(200, y, keys, {
                fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#b3e5fc'
            }).setOrigin(1, 0.5));
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
