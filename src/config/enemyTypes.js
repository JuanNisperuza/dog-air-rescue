// Tipos de enemigo (los gatos). Cada uno usa un comportamiento de enemyBehaviors.js
// y cualquier valor se puede sobreescribir por grupo en waves.js.
// sprite.center es el centro del cuerpo dentro del frame; muzzle, la punta del cañón.
export const ENEMY_ATLAS = 'enemies';

export const ENEMY_TYPES = {
    // Volador básico: cruza la pantalla ondulando.
    // Con amplitude: 0 vuela en línea recta.
    flyer: {
        sprite: { prefix: 'cat_flyer_', anims: { fly: 4 }, fps: 8, center: { x: 29, y: 55 } },
        behavior: 'sine',
        hp: 2,
        speed: 200,
        radius: 24,
        points: 10,
        amplitude: 60,          // px que sube y baja
        frequency: 0.004        // qué tan rápido ondula
    },

    // Artillero: entra, se detiene, dispara al jugador y se va.
    gunner: {
        sprite: {
            prefix: 'cat_gunner_', anims: { fly: 4, shoot: 4 }, fps: 12,
            center: { x: 74, y: 34 }, muzzle: { x: -37, y: 6 }
        },
        behavior: 'gunner',
        hp: 5,
        speed: 240,
        radius: 26,
        points: 25,
        stopX: 0.78,            // dónde se detiene (fracción del ancho)
        fireRate: 900,          // ms entre disparos
        shots: 4,               // disparos antes de irse
        bulletSpeed: 280
    },

    // Kamikaze: entra, "avisa" retrocediendo un poco y se lanza
    // hacia donde estaba el jugador.
    diver: {
        sprite: { prefix: 'cat_diver_', anims: { fly: 4, warn: 1, dash: 3 }, fps: 12, center: { x: 48, y: 31 } },
        behavior: 'diver',
        hp: 2,
        speed: 260,
        radius: 20,
        points: 20,
        stopX: 0.82,
        windup: 550,            // ms de aviso antes de lanzarse
        dashSpeed: 560
    },

    // Pesado: lento, mucha vida, dispara en abanico.
    heavy: {
        sprite: {
            prefix: 'cat_heavy_', anims: { fly: 4, shoot: 4 }, fps: 10,
            center: { x: 105, y: 70 }, muzzle: { x: -25, y: 30 }
        },
        behavior: 'heavy',
        hp: 30,
        speed: 60,
        radius: 50,
        points: 150,
        fireRate: 1500,
        spread: 5,              // balas por ráfaga
        spreadAngle: 14,        // grados entre balas
        bulletSpeed: 230,
        diesOnContact: false,   // si lo chocas, NO muere (tú sí recibes daño)
        explosionSize: 2.5
    }
};
