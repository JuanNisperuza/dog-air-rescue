import Phaser from 'phaser';
import { GRADE } from '../config/constants.js';
import Sfx from '../systems/Sfx.js';
import MenuList from '../systems/MenuList.js';
import { load, save } from '../systems/storage.js';

const FONT = 'Arial Black, Arial, sans-serif';
const PAPER = 0xf3e5c0;
const INK = '#3e2723';
const ROW_DELAY = 380;
const GRADES = ['C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S'];

function computeGrade(r) {
    let points = 0;
    points += r.hp;
    points += r.puppies > 0 ? (r.rescued / r.puppies) * 3 : 0;
    points += r.time <= GRADE.parTime ? 2 : r.time <= GRADE.parTime * 1.3 ? 1 : 0;
    points += r.bestCombo >= GRADE.comboGreat ? 2 : r.bestCombo >= GRADE.comboGood ? 1 : 0;

    if (points >= 10) return 'S';
    const index = Phaser.Math.Clamp(Math.floor(points) - 1, 0, GRADES.length - 2);
    return GRADES[index];
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default class ResultsScene extends Phaser.Scene {
    constructor() {
        super('ResultsScene');
    }

    create(r) {
        const { width, height } = this.scale;
        this.game_ = this.scene.get('GameScene');
        this.sfx = new Sfx(this);
        this.result = r;
        this.leaving = false; // the scene is reused between runs
        this.list = null;

        this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();

        const card = this.add.container(width / 2 - 90, height / 2 + 10).setAngle(-1.5);
        card.add(this.add.rectangle(8, 8, 520, 430, 0x000000, 0.35));
        card.add(this.add.rectangle(0, 0, 520, 430, PAPER).setStrokeStyle(5, 0x3e2723));
        card.add(this.add.text(0, -178, r.win ? 'KNOCKOUT!' : 'GAME OVER', {
            fontFamily: FONT, fontSize: '44px', color: r.win ? '#c62828' : INK
        }).setOrigin(0.5));
        card.add(this.add.rectangle(0, -146, 440, 4, 0x3e2723));
        this.card = card;

        const rows = [
            ['TIME', r.time, (v) => formatTime(v)],
            ['HP LEFT', r.hp, (v) => `${Math.round(v)} / ${r.maxHp}`],
            ['PUPPIES', r.rescued, (v) => `${Math.round(v)} / ${r.puppies}`],
            ['BEST COMBO', r.bestCombo, (v) => `${Math.round(v)}`],
            ['SUPERS', r.supers, (v) => `${Math.round(v)}`],
            ['SCORE', r.score, (v) => `${Math.round(v)}`]
        ];
        this.rows = rows.map(([label, value, format], i) => {
            const y = -112 + i * 42;
            const left = this.add.text(-215, y, label, { fontFamily: FONT, fontSize: '22px', color: INK }).setOrigin(0, 0.5).setAlpha(0);
            const right = this.add.text(215, y, format(0), { fontFamily: FONT, fontSize: '22px', color: INK }).setOrigin(1, 0.5).setAlpha(0);
            card.add([left, right]);
            return { left, right, value, format };
        });

        this.bestText = this.add.text(215, 132, r.isNewBest ? 'NEW BEST!' : `BEST ${r.best}`, {
            fontFamily: FONT, fontSize: '18px', color: r.isNewBest ? '#c62828' : '#6d4c41'
        }).setOrigin(1, 0.5).setAlpha(0);
        card.add(this.bestText);

        this.rows.forEach((row, i) => {
            this.time.delayedCall(500 + i * ROW_DELAY, () => this.countRow(row));
        });
        const after = 500 + this.rows.length * ROW_DELAY + 300;

        this.time.delayedCall(after, () => {
            this.tweens.add({ targets: this.bestText, alpha: 1, duration: 200 });
            if (r.isNewBest) {
                this.sfx.newBest();
                this.tweens.add({ targets: this.bestText, scale: 1.15, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
            }
            if (r.win) this.showGrade();
            else this.showProgress();
        });

        this.time.delayedCall(after + 700, () => {
            this.list = new MenuList(this, width - 140, height / 2 + 70, [
                { label: () => 'RETRY', action: () => this.exit(() => this.game_.restartLevel()) },
                { label: () => 'MENU', action: () => this.exit(() => this.game_.quitToMenu()) }
            ], { spacing: 64, fontSize: 32, sfx: this.sfx });
            this.input.keyboard.on('keydown-R', () => this.exit(() => this.game_.restartLevel()));
            this.input.keyboard.on('keydown-ESC', () => this.exit(() => this.game_.quitToMenu()));
        });

        const cardY = card.y;
        card.setY(-260).setAngle(-14);
        this.tweens.add({
            targets: card,
            y: cardY,
            angle: -1.5,
            duration: 520,
            ease: 'Back.Out',
            onComplete: () => {
                this.cameras.main.shake(120, 0.004);
                this.sfx.cardLand();
            }
        });
    }

    countRow(row) {
        for (const text of [row.left, row.right]) {
            const x = text.x;
            text.setX(x - 30).setAlpha(0);
            this.tweens.add({ targets: text, x, alpha: 1, duration: 220, ease: 'Quad.Out' });
        }
        this.time.delayedCall(320, () => {
            this.tweens.add({ targets: row.right, scale: 1.25, duration: 90, yoyo: true, ease: 'Quad.Out' });
        });
        const counter = { v: 0 };
        this.tweens.add({
            targets: counter,
            v: row.value,
            duration: 300,
            onUpdate: () => {
                row.right.setText(row.format(counter.v));
                this.sfx.tick();
            },
            onComplete: () => row.right.setText(row.format(row.value))
        });
    }

    showGrade() {
        const grade = computeGrade(this.result);
        const { width } = this.scale;

        const bestGrade = load('bestGrade', null);
        if (!bestGrade || GRADES.indexOf(grade) > GRADES.indexOf(bestGrade)) save('bestGrade', grade);

        const x = width - 140;
        const y = 175;
        const circle = this.add.circle(x, y, 62, 0xc62828).setStrokeStyle(6, 0x3e2723).setScale(4).setAlpha(0);
        const text = this.add.text(x, y, grade, {
            fontFamily: FONT, fontSize: grade.length > 1 ? '56px' : '68px', color: '#ffffff', stroke: '#3e2723', strokeThickness: 8
        }).setOrigin(0.5).setScale(4).setAlpha(0);
        const label = this.add.text(x, y - 82, 'GRADE', {
            fontFamily: FONT, fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: [circle, text],
            scale: 1,
            alpha: 1,
            angle: 12,
            duration: 260,
            ease: 'Quad.In',
            onComplete: () => {
                this.sfx.stamp();
                this.cameras.main.shake(180, 0.01);
                label.setAlpha(1);
                this.tweens.add({ targets: [circle, text], scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
            }
        });
    }

    showProgress() {
        const barWidth = 400;
        const y = 182;
        const bar = this.add.rectangle(-barWidth / 2, y, barWidth, 10, 0x3e2723, 0.3).setOrigin(0, 0.5);
        const fill = this.add.rectangle(-barWidth / 2, y, 1, 10, 0xc62828).setOrigin(0, 0.5);
        const label = this.add.text(-barWidth / 2, y - 22, 'PROGRESS', { fontFamily: FONT, fontSize: '14px', color: INK }).setOrigin(0, 0.5);
        this.card.add([bar, fill, label]);

        const value = { p: 0 };
        this.tweens.add({
            targets: value,
            p: Phaser.Math.Clamp(this.result.progress, 0, 1),
            duration: 900,
            ease: 'Cubic.Out',
            onUpdate: () => fill.setSize(Math.max(1, barWidth * value.p), 10)
        });
    }

    exit(fn) {
        if (this.leaving) return;
        this.leaving = true;
        if (this.list) this.list.enabled = false;
        fn();
    }
}
