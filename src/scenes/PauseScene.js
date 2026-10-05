import Phaser from 'phaser';
import Sfx from '../systems/Sfx.js';
import MenuList from '../systems/MenuList.js';

// Menú de pausa. GameScene se pausa a sí misma y lanza esta escena encima.
const FONT = 'Arial Black, Arial, sans-serif';

export default class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        const { width, height } = this.scale;
        this.game_ = this.scene.get('GameScene');
        this.sfx = new Sfx(this);
        this.sfx.uiSelect();
        this.done = false;

        // El fondo oscuro también bloquea los toques al juego
        this.shade = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive().setAlpha(0);
        this.tweens.add({ targets: this.shade, alpha: 1, duration: 200 });

        // El título cae desde arriba, rebota y se queda balanceándose
        this.title = this.add.text(width / 2, -60, 'PAUSED', {
            fontFamily: FONT, fontSize: '64px', color: '#ffd54f', stroke: '#4e342e', strokeThickness: 12
        }).setOrigin(0.5).setAngle(-8);
        this.tweens.add({ targets: this.title, y: 120, angle: 0, duration: 500, ease: 'Bounce.Out' });
        this.tweens.add({ targets: this.title, angle: { from: -2, to: 2 }, duration: 1200, delay: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });

        this.list = new MenuList(this, width / 2, 230, [
            { label: () => 'RESUME', action: () => this.resumeGame() },
            { label: () => 'RETRY', action: () => this.exit(() => this.game_.restartLevel()) },
            { label: () => 'OPTIONS', action: () => this.scene.launch('OptionsScene', { from: 'PauseScene', musicFactor: 0.4 }) },
            { label: () => 'QUIT TO MENU', action: () => this.exit(() => this.game_.quitToMenu()) }
        ], { spacing: 60, sfx: this.sfx, delay: 150 });

        this.input.keyboard.on('keydown-ESC', () => this.resumeGame());
        this.input.keyboard.on('keydown-P', () => this.resumeGame());
    }

    // Todo sale de la pantalla y después sigue el juego
    resumeGame() {
        if (this.done || !this.list.enabled) return;
        this.done = true;
        this.sfx.uiMove();
        this.tweens.killTweensOf(this.title);
        this.tweens.add({ targets: this.title, y: -80, duration: 220, ease: 'Back.In' });
        this.tweens.add({ targets: this.shade, alpha: 0, duration: 250 });
        this.list.close(() => {
            this.scene.resume('GameScene');
            this.scene.stop();
        });
    }

    // Reintentar o salir: el iris se cierra con el juego todavía en pausa
    exit(fn) {
        if (this.done) return;
        this.done = true;
        this.list.enabled = false;
        fn();
    }
}
