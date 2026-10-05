// Personajes jugables. Se elige cuál usar con PLAYER.skin en constants.js.
export const SKINS = {
    dog: {
        atlas: 'dog_plane',                 // clave y nombre del archivo del atlas
        framePrefix: 'dog_plane_',          // prefijo de los frames dentro del atlas
        // Cuántos frames tiene cada animación (las que falten no se usan)
        anims: {
            idle_straight: 6,
            idle_up: 6,
            idle_down: 6,
            ghost: 2
        },
        fps: 10,
        // Centro real del dibujo dentro de su lienzo (132x108)
        canvasCenter: { x: 66, y: 54 },
        hitbox: { width: 56, height: 40 },
        muzzle: { x: 60, y: 8 }             // desde dónde salen las balas
    },

    cuphead: {
        atlas: 'cuphead_plane',
        framePrefix: 'cuphead_plane_',
        anims: {
            idle_straight: 4,
            idle_up: 4,
            idle_down: 4,
            trans_up: 11,                   // transiciones (opcionales)
            trans_down: 11,
            ghost: 24
        },
        fps: 24,
        canvasCenter: { x: 245, y: 208 },   // lienzo de 520x443
        hitbox: { width: 56, height: 44 },
        muzzle: { x: 50, y: 6 }
    }
};
