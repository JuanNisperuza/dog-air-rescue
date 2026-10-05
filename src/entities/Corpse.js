import Phaser from 'phaser';

// Lo que queda de un enemigo al morir. Copia su frame y se anima solo, así el
// enemigo vuelve al pool de inmediato. Estilos (death en enemyTypes.js):
//   pop   → el globo revienta: queda solo la canasta y cae
//   spin  → cae girando y echando humo
//   chain → tiembla con explosiones en cadena y termina en una explosión grande
const GRAVITY = 900;
const CHAIN_BOOMS = 6;
const CHAIN_STEP = 140;     // ms entre explosiones

export default class Corpse extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'particle');
        this.setDepth(5);
    }

    start(enemy, style, fx) {
        this.fx = fx;
        this.style = style;
        this.elapsed = 0;
        this.nextPuff = 0;
        this.booms = 0;

        this.setTexture(enemy.texture.key, enemy.frame.name);
        this.setOrigin(enemy.originX, enemy.originY);
        this.setPosition(enemy.x, enemy.y);
        this.setAngle(enemy.angle).setScale(1).setAlpha(1);
        this.clearTint();
        this.setCrop();
        this.setActive(true).setVisible(true);

        const vx = enemy.body.velocity.x;
        switch (style) {
            case 'pop':
                // Recortamos el globo (mitad de arriba del frame) y cae solo la canasta
                this.setCrop(0, this.frame.realHeight * enemy.originY, this.frame.realWidth, this.frame.realHeight);
                this.vx = vx * 0.2;
                this.vy = -40;
                this.spin = Phaser.Math.Between(-120, 120);
                break;
            case 'chain':
                this.baseX = enemy.x;
                this.baseY = enemy.y;
                break;
            default: // spin
                this.vx = vx * 0.4;
                this.vy = -140;
                this.spin = Phaser.Math.RND.sign() * Phaser.Math.Between(420, 720);
        }
    }

    update(time, delta) {
        this.elapsed += delta;
        if (this.style === 'chain') {
            this.updateChain();
            return;
        }

        const dt = delta / 1000;
        this.vy += GRAVITY * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle += this.spin * dt;

        if (this.style === 'spin' && this.elapsed >= this.nextPuff) {
            this.fx.smokePuff(this.x, this.y);
            this.nextPuff = this.elapsed + 45;
        }

        if (this.y > this.scene.scale.height + 150) this.kill();
    }

    updateChain() {
        // Tiembla, parpadea y se va hundiendo mientras explota por partes
        this.x = this.baseX + Phaser.Math.Between(-4, 4);
        this.y = this.baseY + Phaser.Math.Between(-3, 3) + this.elapsed * 0.03;
        if (Math.floor(this.elapsed / 60) % 2) this.setTintFill(0xffffff);
        else this.clearTint();

        if (this.booms < CHAIN_BOOMS && this.elapsed >= this.booms * CHAIN_STEP) {
            this.fx.smallBoom(
                this.baseX + Phaser.Math.Between(-55, 55),
                this.baseY + Phaser.Math.Between(-45, 45)
            );
            this.booms++;
        }

        if (this.elapsed >= CHAIN_BOOMS * CHAIN_STEP + 120) {
            this.fx.bigBoom(this.x, this.y);
            this.kill();
        }
    }

    kill() {
        this.clearTint();
        this.setCrop();
        this.setActive(false).setVisible(false);
    }
}
