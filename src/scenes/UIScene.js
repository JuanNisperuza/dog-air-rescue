import Phaser from 'phaser';

// HUD. Corre encima de GameScene y solo escucha el registry (hp y score).
const PUNCH_DECAY = 6; // qué tan rápido vuelve a su tamaño el "salto"

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        const style = {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '26px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        };

        this.hpText = this.add.text(16, 12, '', style);
        this.scoreText = this.add.text(this.scale.width - 16, 12, '', style).setOrigin(1, 0);

        // Al cambiar, el texto crece un momento y vuelve a su tamaño
        this.scorePunch = 0;
        this.hpPunch = 0;

        this.onHpChanged(null, this.registry.get('hp'));
        this.onScoreChanged(null, this.registry.get('score'));
        this.hpPunch = 0;      // al iniciar no hay "salto"
        this.scorePunch = 0;
        this.hpText.clearTint();

        this.registry.events.on('changedata-hp', this.onHpChanged, this);
        this.registry.events.on('changedata-score', this.onScoreChanged, this);

        // Sin esto, al reiniciar se acumulan listeners duplicados
        this.events.once('shutdown', () => {
            this.registry.events.off('changedata-hp', this.onHpChanged, this);
            this.registry.events.off('changedata-score', this.onScoreChanged, this);
        });
    }

    update(time, delta) {
        const dt = delta / 1000;

        if (this.scorePunch > 0) {
            this.scorePunch = Math.max(0, this.scorePunch - PUNCH_DECAY * dt);
            this.scoreText.setScale(1 + 0.3 * this.scorePunch);
        }
        if (this.hpPunch > 0) {
            this.hpPunch = Math.max(0, this.hpPunch - PUNCH_DECAY * 0.5 * dt);
            this.hpText.setScale(1 + 0.35 * this.hpPunch);
            this.hpText.x = 16 + (Math.random() - 0.5) * 8 * this.hpPunch;
            if (this.hpPunch === 0) {
                this.hpText.clearTint();
                this.hpText.x = 16;
            }
        }
    }

    onHpChanged(parent, value) {
        this.hpText.setText('LIVES ' + '♥'.repeat(Math.max(0, value)));
        this.hpText.setTint(0xff5252);
        this.hpPunch = 1;
    }

    onScoreChanged(parent, value) {
        this.scoreText.setText('SCORE ' + value);
        this.scorePunch = 1;
    }
}
