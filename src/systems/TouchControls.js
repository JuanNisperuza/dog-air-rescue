// Controles táctiles: joystick que aparece donde pones el dedo (lado izquierdo),
// botón de súper y botón de pausa. Solo se muestran después del primer toque en
// pantalla, así en computador no estorban. En celular el avión dispara solo.
// El estado se comparte con Player a través del registry ('touchInput').
const STICK_RADIUS = 60;
const STICK_ZONE = 0.6;     // fracción izquierda de la pantalla para el joystick

export default class TouchControls {
    constructor(scene) {
        this.scene = scene;
        const { width, height } = scene.scale;

        this.state = { enabled: false, active: false, x: 0, y: 0, superPressed: false };
        scene.registry.set('touchInput', this.state);
        scene.input.addPointer(2); // hasta 3 dedos a la vez

        this.base = scene.add.circle(0, 0, STICK_RADIUS, 0x000000, 0.25)
            .setStrokeStyle(4, 0xffffff, 0.6).setDepth(30).setVisible(false);
        this.knob = scene.add.circle(0, 0, 28, 0xffffff, 0.6).setDepth(31).setVisible(false);

        this.superButton = scene.add.circle(width - 80, height - 80, 46, 0x000000, 0.3)
            .setStrokeStyle(4, 0xffd54f, 0.8).setDepth(30).setVisible(false)
            .setInteractive();
        this.superLabel = scene.add.text(width - 80, height - 80, 'SUPER', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '16px', color: '#ffd54f', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(31).setVisible(false);

        this.pauseButton = scene.add.text(width / 2, 24, 'II', {
            fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '26px', color: '#ffffff', stroke: '#000000', strokeThickness: 6,
            padding: { x: 14, y: 4 }
        }).setOrigin(0.5).setDepth(30).setVisible(false).setInteractive();

        this.superButton.on('pointerdown', () => { this.state.superPressed = true; });
        this.pauseButton.on('pointerdown', () => scene.scene.get('GameScene').pauseGame());

        this.stickPointer = null;
        scene.input.on('pointerdown', this.onDown, this);
        scene.input.on('pointermove', this.onMove, this);
        scene.input.on('pointerup', this.onUp, this);
        scene.input.on('pointerupoutside', this.onUp, this);

        // Si ya se usó táctil antes (en esta visita), se muestran de una
        if (scene.registry.get('touchMode')) this.enable();
    }

    enable() {
        this.state.enabled = true;
        this.scene.registry.set('touchMode', true);
        for (const obj of [this.superButton, this.superLabel, this.pauseButton]) obj.setVisible(true);
    }

    onDown(pointer, over) {
        if (!pointer.wasTouch) return;
        if (!this.state.enabled) this.enable();
        if (over.length > 0 || this.stickPointer) return; // tocó un botón o ya hay joystick
        if (pointer.x > this.scene.scale.width * STICK_ZONE) return;

        this.stickPointer = pointer;
        this.base.setPosition(pointer.x, pointer.y).setVisible(true);
        this.knob.setPosition(pointer.x, pointer.y).setVisible(true);
        this.state.active = true;
        this.state.x = 0;
        this.state.y = 0;
    }

    onMove(pointer) {
        if (pointer !== this.stickPointer) return;
        let dx = pointer.x - this.base.x;
        let dy = pointer.y - this.base.y;
        const length = Math.hypot(dx, dy);
        if (length > STICK_RADIUS) {
            dx *= STICK_RADIUS / length;
            dy *= STICK_RADIUS / length;
        }
        this.knob.setPosition(this.base.x + dx, this.base.y + dy);
        this.state.x = dx / STICK_RADIUS;
        this.state.y = dy / STICK_RADIUS;
    }

    onUp(pointer) {
        if (pointer !== this.stickPointer) return;
        this.stickPointer = null;
        this.base.setVisible(false);
        this.knob.setVisible(false);
        this.state.active = false;
        this.state.x = 0;
        this.state.y = 0;
    }

    // El botón brilla cuando el súper está lleno
    setSuperReady(ready, time) {
        if (!this.state.enabled) return;
        const pulse = ready ? 0.55 + Math.sin(time * 0.012) * 0.25 : 0.3;
        this.superButton.setFillStyle(ready ? 0xffa000 : 0x000000, pulse);
        this.superLabel.setColor(ready ? '#ffffff' : '#ffd54f');
    }

    // Se esconde en la pantalla de resultados
    setVisible(visible) {
        const show = visible && this.state.enabled;
        for (const obj of [this.superButton, this.superLabel, this.pauseButton]) obj.setVisible(show);
        if (!visible) this.onUp(this.stickPointer);
    }
}
