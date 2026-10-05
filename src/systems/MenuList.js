// Lista de opciones vertical: flechas o W/S para moverse, Enter/Espacio/X para elegir
// e izquierda/derecha para los valores (volumen). También funciona con mouse y táctil.
// La usan la pausa, las opciones y los resultados.
// items: [{ label: () => string, action?, left?, right? }]
//
// Animaciones: las opciones entran una tras otra, la elegida se mece suave,
// al elegir se "aplasta" como un botón de caricatura y close() las saca.
const FONT = 'Arial Black, Arial, sans-serif';
const COLOR_IDLE = '#ffffff';
const COLOR_SELECTED = '#ffd54f';
const ENTER_STAGGER = 70;   // ms entre una opción y la siguiente al entrar
const SELECTED_SCALE = 1.12;

export default class MenuList {
    constructor(scene, x, y, items, { spacing = 56, fontSize = 30, depth = 0, sfx = null, delay = 0 } = {}) {
        this.scene = scene;
        this.items = items;
        this.sfx = sfx;
        this.enabled = true;
        this.entering = true;   // mientras las opciones van entrando
        this.selected = 0;
        this.pressing = false;

        items.forEach((item, i) => {
            item.text = scene.add.text(x, y + i * spacing, item.label(), {
                fontFamily: FONT, fontSize: `${fontSize}px`, color: COLOR_IDLE, stroke: '#000000', strokeThickness: 6,
                padding: { x: 8, y: 4 }
            }).setOrigin(0.5).setDepth(depth).setInteractive({ useHandCursor: true });
            item.baseX = x;

            item.text.on('pointerover', () => this.enabled && !this.entering && this.select(i));
            item.text.on('pointerdown', (pointer) => {
                if (!this.enabled) return;
                this.select(i, true);
                // En las filas con valor, tocar a la izquierda baja y a la derecha sube
                if (item.left && item.right) {
                    const local = pointer.x - item.text.x;
                    if (local < -item.text.width * 0.2) this.change(-1);
                    else if (local > item.text.width * 0.2) this.change(1);
                    return;
                }
                this.activate();
            });

            // Entrada: cada opción llega desde la derecha con un rebote
            item.text.setAlpha(0).setX(x + 80).setScale(0.6);
            scene.tweens.add({
                targets: item.text,
                x,
                alpha: 1,
                scale: i === 0 ? SELECTED_SCALE : 1,
                duration: 380,
                delay: delay + i * ENTER_STAGGER,
                ease: 'Back.Out'
            });
        });

        this.cursor = scene.add.text(0, 0, '▶', {
            fontFamily: FONT, fontSize: `${Math.round(fontSize * 0.8)}px`, color: COLOR_SELECTED, stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5).setDepth(depth).setAlpha(0);

        items[0].text.setColor(COLOR_SELECTED);
        const enterTime = delay + (items.length - 1) * ENTER_STAGGER + 400;
        scene.time.delayedCall(enterTime, () => this.finishEntrance());

        this.onKey = (event) => {
            if (!this.enabled) return;
            switch (event.code) {
                case 'ArrowUp': case 'KeyW': this.move(-1); break;
                case 'ArrowDown': case 'KeyS': this.move(1); break;
                case 'ArrowLeft': case 'KeyA': this.change(-1); break;
                case 'ArrowRight': case 'KeyD': this.change(1); break;
                case 'Enter': case 'Space': case 'KeyX': this.activate(); break;
            }
        };
        scene.input.keyboard.on('keydown', this.onKey);

        scene.events.on('update', this.update, this);
        scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
    }

    // Termina la entrada (de una, si el jugador ya está usando el menú)
    finishEntrance() {
        if (!this.entering) return;
        this.entering = false;
        this.items.forEach((item, i) => {
            this.scene.tweens.killTweensOf(item.text);
            item.text.setX(item.baseX).setAlpha(1).setScale(i === this.selected ? SELECTED_SCALE : 1);
        });
        this.scene.tweens.add({ targets: this.cursor, alpha: 1, duration: 150 });
    }

    move(step) {
        this.select((this.selected + step + this.items.length) % this.items.length);
    }

    select(index, silent = false) {
        this.finishEntrance();
        if (index !== this.selected && !silent) this.sfx?.uiMove();
        const changed = index !== this.selected;
        this.selected = index;

        this.items.forEach((item, i) => {
            const isSelected = i === index;
            item.text.setColor(isSelected ? COLOR_SELECTED : COLOR_IDLE);
            this.scene.tweens.killTweensOf(item.text);
            item.text.setX(item.baseX).setAlpha(1);
            this.scene.tweens.add({
                targets: item.text,
                scale: isSelected ? SELECTED_SCALE : 1,
                angle: 0,
                duration: 140,
                ease: 'Back.Out'
            });
        });

        // El cursor salta a la nueva opción
        if (changed) {
            this.cursor.setScale(1.6);
            this.scene.tweens.add({ targets: this.cursor, scale: 1, duration: 200, ease: 'Back.Out' });
        }
    }

    activate() {
        this.finishEntrance();
        const item = this.items[this.selected];
        if (!item.action || this.pressing) return;
        this.sfx?.uiSelect();
        this.press(item.text, () => {
            item.action();
            this.refresh();
        });
    }

    // Aplastón tipo caricatura: se achata, se estira y vuelve
    press(text, onDone) {
        this.pressing = true;
        this.scene.tweens.killTweensOf(text);
        this.scene.tweens.chain({
            targets: text,
            tweens: [
                { scaleX: SELECTED_SCALE * 1.25, scaleY: SELECTED_SCALE * 0.75, duration: 60, ease: 'Quad.Out' },
                { scaleX: SELECTED_SCALE * 0.9, scaleY: SELECTED_SCALE * 1.15, duration: 70, ease: 'Quad.Out' },
                { scaleX: SELECTED_SCALE, scaleY: SELECTED_SCALE, duration: 90, ease: 'Back.Out' }
            ],
            onComplete: () => {
                this.pressing = false;
                onDone?.();
            }
        });
    }

    change(step) {
        const item = this.items[this.selected];
        const fn = step < 0 ? item.left : item.right;
        if (!fn) return;
        this.finishEntrance();
        this.sfx?.uiMove();
        fn();
        this.refresh();

        // El valor "salta" hacia el lado en que cambió
        this.scene.tweens.killTweensOf(item.text);
        item.text.setX(item.baseX + step * 10).setScale(SELECTED_SCALE * 1.15);
        this.scene.tweens.add({ targets: item.text, x: item.baseX, scale: SELECTED_SCALE, duration: 200, ease: 'Back.Out' });
    }

    refresh() {
        for (const item of this.items) item.text.setText(item.label());
    }

    // Saca las opciones (al revés de como entraron) y llama a onDone
    close(onDone) {
        this.enabled = false;
        this.entering = false;
        this.scene.tweens.add({ targets: this.cursor, alpha: 0, duration: 100 });
        this.items.forEach((item, i) => {
            this.scene.tweens.killTweensOf(item.text);
            this.scene.tweens.add({
                targets: item.text,
                x: item.baseX - 60,
                alpha: 0,
                duration: 160,
                delay: i * 30,
                ease: 'Quad.In'
            });
        });
        this.scene.time.delayedCall(160 + this.items.length * 30, () => onDone?.());
    }

    update(time) {
        const text = this.items[this.selected].text;
        this.cursor.x = text.x - (text.width * text.scaleX) / 2 - 18 + Math.sin(time * 0.01) * 4;
        this.cursor.y = text.y;

        // La opción elegida se mece un poquito
        if (this.enabled && !this.entering && !this.pressing && !this.scene.tweens.isTweening(text)) {
            text.angle = Math.sin(time * 0.005) * 2;
        }
    }
}
