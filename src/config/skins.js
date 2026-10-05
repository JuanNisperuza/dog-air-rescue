// Personajes jugables. Se elige cuál usar con PLAYER.skin en constants.js.
export const SKINS = {
    dog: {
        atlas: 'dog_plane',                 // clave y nombre del archivo del atlas
        framePrefix: 'dog_plane_',          // prefijo de los frames dentro del atlas
        // Cuántos frames tiene cada animación (las que falten no se usan).
        // Sin idle_up / idle_down: la inclinación al subir o bajar se hace rotando el sprite.
        anims: {
            // Vuelo: sin los frames de boca abierta (5 a 8), que hacían notar el bucle
            idle_straight: { from: 'idle', frames: [1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16] },
            happy: 8,                       // celebrando (al ganar y en el menú)
            hurt: 4,                        // recibe un golpe
            super: 11,                      // toma aire y ladra
            ghost: 2
        },
        fps: 20,
        tilt: 14,
        propeller: { x: 74, y: 5 },         // centro de la hélice (para el disco que gira encima)
        // Centro del avión dentro de su lienzo (201x209), sale de tools/slice-player.py
        canvasCenter: { x: 99, y: 123 },
        hitbox: { width: 70, height: 46 },
        muzzle: { x: 68, y: 2 },            // desde dónde salen las balas
        exhaust: { x: -60, y: -2 }          // de dónde sale el humo del motor
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
        muzzle: { x: 50, y: 6 },
        exhaust: { x: -50, y: 8 }
    }
};
