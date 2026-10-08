import Phaser from 'phaser';
import Sfx from '../systems/Sfx.js';
import MenuList from '../systems/MenuList.js';
import { getMusic } from '../systems/Music.js';
import { settings, saveSettings } from '../systems/settings.js';
import { applyFilm } from '../systems/OldFilmPipeline.js';

const FONT = 'Arial Black, Arial, sans-serif';

export default class OptionsScene extends Phaser.Scene {
    constructor() {
        super('OptionsScene');
    }

    create(data) {
        const { width, height } = this.scale;
        this.from = data.from;
        this.closing = false;
        this.musicFactor = data.musicFactor ?? 1;
        this.scene.pause(this.from);

        this.sfx = new Sfx(this);
        this.music = getMusic();

        this.shade = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive().setAlpha(0);
        this.panel = this.add.rectangle(width / 2, height / 2, 540, 400, 0x1b2631, 0.95).setStrokeStyle(4, 0xffd54f);
        this.title = this.add.text(width / 2, height / 2 - 160, 'OPTIONS', {
            fontFamily: FONT, fontSize: '34px', color: '#ffd54f', stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        const volume = (name, key) => ({
            label: () => `${name}   ◀ ${settings[key]} ▶`,
            left: () => this.setVolume(key, -1),
            right: () => this.setVolume(key, 1)
        });
        const toggle = (name, key, after) => ({
            label: () => `${name}: ${settings[key] ? 'ON' : 'OFF'}`,
            action: () => {
                settings[key] = !settings[key];
                saveSettings();
                after?.();
            }
        });

        this.list = new MenuList(this, width / 2, height / 2 - 85, [
            volume('MUSIC', 'music'),
            volume('SFX', 'sfx'),
            toggle('OLD FILM FILTER', 'film', () => this.refreshFilm()),
            toggle('SCREEN SHAKE', 'shake'),
            { label: () => 'BACK', action: () => this.close() }
        ], { spacing: 58, fontSize: 26, sfx: this.sfx, delay: 120 });

        this.hint = this.add.text(width / 2, height / 2 + 178, '◀ ▶ to change     Esc to go back', {
            fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#90a4ae'
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ESC', () => this.close());

        this.tweens.add({ targets: this.shade, alpha: 1, duration: 150 });
        this.panel.setScale(1, 0.05);
        this.tweens.add({ targets: this.panel, scaleY: 1, duration: 280, ease: 'Back.Out' });
        for (const obj of [this.title, this.hint]) {
            obj.setAlpha(0);
            this.tweens.add({ targets: obj, alpha: 1, duration: 200, delay: 120 });
        }
    }

    setVolume(key, step) {
        settings[key] = Phaser.Math.Clamp(settings[key] + step, 0, 10);
        saveSettings();
        if (key === 'music') this.music.restore(this.musicFactor, 100);
    }

    refreshFilm() {
        for (const key of ['MenuScene', 'GameScene']) {
            const scene = this.scene.get(key);
            if (scene.sys.isActive() || scene.sys.isPaused()) applyFilm(scene);
        }
    }

    close() {
        if (this.closing || !this.list.enabled) return;
        this.closing = true;
        this.sfx.uiMove();
        this.tweens.add({ targets: [this.title, this.hint], alpha: 0, duration: 120 });
        this.list.close(() => {
            this.tweens.add({ targets: this.shade, alpha: 0, duration: 150 });
            this.tweens.add({
                targets: this.panel,
                scaleY: 0.05,
                alpha: 0,
                duration: 160,
                ease: 'Back.In',
                onComplete: () => {
                    this.scene.resume(this.from);
                    this.scene.stop();
                }
            });
        });
    }
}
