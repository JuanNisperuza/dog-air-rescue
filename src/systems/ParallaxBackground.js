import { PARALLAX } from '../config/constants.js';
import SunFace from './SunFace.js';

export default class ParallaxBackground {
    constructor(scene) {
        const m = PARALLAX.margin;
        const width = scene.scale.width + m * 2;
        const height = scene.scale.height + m * 2;
        this.layers = [];

        for (const config of PARALLAX.layers) {
            if (config.static) {
                const sky = scene.add.image(-m, -m, config.key).setOrigin(0).setDisplaySize(width, height);
                this.sun = new SunFace(scene, sky);
                continue;
            }

            const source = scene.textures.get(config.key).getSourceImage();
            const layerHeight = source.height * (config.tileScale ?? 1);
            const y = config.y ?? scene.scale.height - layerHeight + (config.offsetY ?? 0);

            const sprite = scene.add.tileSprite(-m, y, width, layerHeight, config.key)
                .setOrigin(0)
                .setAlpha(config.alpha ?? 1)
                .setTileScale(config.tileScale ?? 1);

            this.layers.push({ sprite, speed: config.speed });

            if (config.key === 'clouds') this.birds = new Birds(scene);
        }
    }

    update(delta, speedFactor = 1) {
        this.sun?.update(delta);
        this.birds?.update(delta);
        const dt = (delta / 1000) * speedFactor;
        for (const layer of this.layers) {
            layer.sprite.tilePositionX += layer.speed * dt / layer.sprite.tileScaleX;
        }
    }
}

class Birds {
    constructor(scene) {
        this.scene = scene;
        this.layer = scene.add.container(0, 0);
        this.nextFlock = 2500;
    }

    update(delta) {
        this.nextFlock -= delta;
        if (this.nextFlock <= 0) {
            this.spawnFlock();
            this.nextFlock = 7000 + Math.random() * 7000;
        }

        const dt = delta / 1000;
        for (const bird of [...this.layer.list]) {
            bird.life += delta;
            bird.x += bird.vx * dt;
            bird.y = bird.baseY + Math.sin(bird.life * 0.004 + bird.phase) * 6;
            bird.setTexture(Math.floor(bird.life / 140 + bird.phase) % 2 ? 'bird1' : 'bird0');
            if (bird.x < -60 || bird.x > this.scene.scale.width + 60) bird.destroy();
        }
    }

    spawnFlock() {
        const { width } = this.scene.scale;
        const toLeft = Math.random() < 0.6;
        const count = 3 + Math.floor(Math.random() * 3);
        const speed = 55 + Math.random() * 35;
        const y = 60 + Math.random() * 150;
        const scale = 0.6 + Math.random() * 0.4;

        for (let i = 0; i < count; i++) {
            const row = Math.ceil(i / 2);
            const side = i % 2 ? 1 : -1;
            const x = toLeft ? width + 30 + row * 26 : -30 - row * 26;
            const bird = this.scene.add.image(x, 0, 'bird0').setScale(scale).setAlpha(0.75);
            bird.baseY = y + (i === 0 ? 0 : side * row * 14);
            bird.vx = toLeft ? -speed : speed;
            bird.life = 0;
            bird.phase = Math.random() * 3;
            this.layer.add(bird);
        }
    }
}
