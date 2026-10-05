import Phaser from 'phaser';

// La cara del sol del fondo, animada. Tapa la cara pintada en bg_sky con un círculo
// del mismo color y dibuja encima ojos y boca con Graphics, un poco más arriba que la
// original para que los edificios no la tapen. Los ojos siguen a un objetivo,
// parpadea solo y cambia de expresión según lo que pase en el juego.
// Moods: 'happy' | 'worried' | 'scared' | 'cheer' | 'sad'
const SUN = { x: 653, y: 370 };         // centro del sol en bg_sky (px de la imagen)
const SUN_INNER = 111;                  // radio sin el borde negro
const FACE = { x: 652, y: 312 };        // centro de la cara nueva
const SUN_COLOR = 0xfacd78;
const INK = 0x2b1d14;
const EYE_DX = 33;                      // distancia de cada ojo al centro de la cara
const EYE_Y = -15;

export default class SunFace {
    // sky: la imagen del cielo (para convertir coordenadas de la imagen a la pantalla)
    constructor(scene, sky) {
        this.scene = scene;
        const s = sky.scaleX;
        this.sunX = sky.x + SUN.x * s;
        this.sunY = sky.y + SUN.y * s;

        // Parche que borra la cara original (se dibuja una sola vez)
        scene.add.graphics()
            .fillStyle(SUN_COLOR)
            .fillCircle(this.sunX, this.sunY, SUN_INNER * s);

        this.g = scene.add.graphics({ x: sky.x + FACE.x * s, y: sky.y + FACE.y * s }).setScale(s);
        this.baseScale = s;

        this.mood = 'happy';
        this.look = new Phaser.Math.Vector2();   // hacia dónde miran las pupilas (-1 a 1)
        this.target = new Phaser.Math.Vector2(this.g.x - 200, this.g.y);
        this.blink = 0;                          // 0 = abiertos, 1 = cerrados
        this.nextBlink = 1500;
        this.time = 0;
    }

    lookAt(x, y) {
        this.target.set(x, y);
    }

    setMood(mood) {
        if (mood === this.mood) return;
        this.mood = mood;
        // Cambio de cara con un "boing"
        this.scene.tweens.killTweensOf(this.g);
        this.g.setScale(this.baseScale * 1.15, this.baseScale * 0.85);
        this.scene.tweens.add({ targets: this.g, scaleX: this.baseScale, scaleY: this.baseScale, duration: 350, ease: 'Back.Out' });
    }

    update(delta) {
        this.time += delta;

        // Pupilas: se mueven suave hacia el objetivo
        const dx = this.target.x - this.g.x;
        const dy = this.target.y - this.g.y;
        const length = Math.hypot(dx, dy) || 1;
        const strength = Math.min(1, length / 250);
        this.look.x = Phaser.Math.Linear(this.look.x, (dx / length) * strength, 0.12);
        this.look.y = Phaser.Math.Linear(this.look.y, (dy / length) * strength, 0.12);

        // Parpadeo de vez en cuando (más seguido si está asustado)
        this.nextBlink -= delta;
        if (this.nextBlink <= 0) {
            this.blinkStart = this.time;
            this.nextBlink = this.mood === 'scared' ? Phaser.Math.Between(700, 1600) : Phaser.Math.Between(2000, 4500);
        }
        const sinceBlink = this.time - (this.blinkStart ?? -1000);
        this.blink = sinceBlink < 140 ? Math.sin((sinceBlink / 140) * Math.PI) : 0;

        this.draw();
    }

    draw() {
        const g = this.g;
        g.clear();

        const scared = this.mood === 'scared';
        const t = this.time;

        // Asustado: tiembla un poquito
        const shakeX = scared ? Math.sin(t * 0.08) * 1.2 : 0;

        if (this.mood === 'cheer') {
            // Ojos felices cerrados: ^ ^
            g.lineStyle(5, INK);
            for (const side of [-1, 1]) {
                const x = side * EYE_DX;
                g.beginPath();
                g.moveTo(x - 10, EYE_Y + 6);
                g.lineTo(x, EYE_Y - 7);
                g.lineTo(x + 10, EYE_Y + 6);
                g.strokePath();
            }
        } else {
            const eyeW = scared ? 24 : 20;
            const eyeH = scared ? 44 : 40;
            const droop = this.mood === 'sad' ? 0.45 : 0;
            const open = Math.max(0.08, 1 - Math.max(this.blink, droop));

            for (const side of [-1, 1]) {
                const x = side * EYE_DX + shakeX;
                g.fillStyle(INK);
                g.fillEllipse(x, EYE_Y, eyeW, eyeH * open);
                if (open > 0.3) {
                    // Brillo: es lo que se mueve para mirar
                    const r = scared ? 3.5 : 5;
                    g.fillStyle(0xffffff);
                    g.fillCircle(x + this.look.x * 5 - side * 2, EYE_Y - 6 + this.look.y * 9, r);
                }
            }

            // Cejas preocupadas
            if (this.mood === 'worried' || this.mood === 'sad' || scared) {
                g.lineStyle(4, INK);
                for (const side of [-1, 1]) {
                    const x = side * EYE_DX;
                    g.lineBetween(x - side * 12, EYE_Y - 24, x + side * 10, EYE_Y - 20 - (scared ? 6 : 0));
                }
            }
        }

        // Boca
        g.lineStyle(4, INK);
        switch (this.mood) {
            case 'happy': {
                g.beginPath();
                g.arc(0, -8, 46, Phaser.Math.DegToRad(30), Phaser.Math.DegToRad(150));
                g.strokePath();
                // Cachetes
                g.lineBetween(-46, 13, -38, 22);
                g.lineBetween(46, 13, 38, 22);
                break;
            }
            case 'cheer': {
                // Boca grande abierta con lengua
                g.fillStyle(INK);
                g.slice(0, 14, 26, 0, Math.PI, false);
                g.fillPath();
                g.fillStyle(0xe57373);
                g.fillEllipse(0, 31, 22, 10);
                break;
            }
            case 'scared': {
                const open = 26 + Math.sin(t * 0.03) * 3;
                g.fillStyle(INK);
                g.fillEllipse(shakeX, 30, 22, open);
                // Gota de sudor
                const dropY = -18 + ((t * 0.05) % 26);
                g.fillStyle(0x81d4fa);
                g.fillCircle(54, dropY, 5);
                g.fillTriangle(49, dropY - 1, 59, dropY - 1, 54, dropY - 11);
                break;
            }
            case 'worried':
            case 'sad': {
                g.beginPath();
                g.arc(0, 52, 26, Phaser.Math.DegToRad(215), Phaser.Math.DegToRad(325));
                g.strokePath();
                break;
            }
        }
    }
}
