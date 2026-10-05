import { PARALLAX } from '../config/constants.js';

// Fondo por capas: cada una es un TileSprite que se desliza a su propia velocidad.
// Las capas se configuran en PARALLAX (constants.js).
export default class ParallaxBackground {
    constructor(scene) {
        const { width, height } = scene.scale;
        this.layers = [];

        for (const config of PARALLAX.layers) {
            if (config.static) {
                // Capa fija (el cielo)
                scene.add.image(0, 0, config.key).setOrigin(0).setDisplaySize(width, height);
                continue;
            }

            // Por defecto la capa se apoya en el borde de abajo
            const source = scene.textures.get(config.key).getSourceImage();
            const layerHeight = source.height * (config.tileScale ?? 1);
            const y = config.y ?? height - layerHeight + (config.offsetY ?? 0);

            const sprite = scene.add.tileSprite(0, y, width, layerHeight, config.key)
                .setOrigin(0)
                .setAlpha(config.alpha ?? 1)
                .setTileScale(config.tileScale ?? 1);

            this.layers.push({ sprite, speed: config.speed });
        }
    }

    // speedFactor acelera o frena todo el fondo a la vez
    update(delta, speedFactor = 1) {
        const dt = (delta / 1000) * speedFactor;
        for (const layer of this.layers) {
            layer.sprite.tilePositionX += layer.speed * dt / layer.sprite.tileScaleX;
        }
    }
}
