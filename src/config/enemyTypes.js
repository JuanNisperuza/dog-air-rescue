export const ENEMY_ATLAS = 'enemies';

export const ENEMY_TYPES = {
    flyer: {
        sprite: { prefix: 'cat_flyer_', anims: { fly: 4 }, fps: 8, center: { x: 29, y: 55 } },
        behavior: 'sine',
        death: 'pop',
        hp: 2,
        speed: 200,
        radius: 24,
        points: 10,
        amplitude: 60,
        frequency: 0.004
    },

    gunner: {
        sprite: {
            prefix: 'cat_gunner_', anims: { fly: 4, shoot: 4 }, fps: 12,
            center: { x: 74, y: 34 }, muzzle: { x: -37, y: 6 }
        },
        behavior: 'gunner',
        death: 'spin',
        drop: 0.3,
        hp: 5,
        speed: 240,
        radius: 26,
        points: 25,
        stopX: 0.78,
        fireRate: 900,
        shots: 4,
        bulletSpeed: 280
    },

    diver: {
        sprite: { prefix: 'cat_diver_', anims: { fly: 4, warn: 1, dash: 3 }, fps: 12, center: { x: 48, y: 31 } },
        behavior: 'diver',
        death: 'spin',
        drop: 0.08,
        hp: 2,
        speed: 260,
        radius: 20,
        points: 20,
        stopX: 0.82,
        windup: 550,
        dashSpeed: 560
    },

    heavy: {
        sprite: {
            prefix: 'cat_heavy_', anims: { fly: 4, shoot: 4 }, fps: 10,
            center: { x: 105, y: 70 }, muzzle: { x: -25, y: 30 }
        },
        behavior: 'heavy',
        death: 'chain',
        drop: 1,
        hp: 30,
        speed: 60,
        radius: 50,
        points: 150,
        fireRate: 1500,
        spread: 5,
        spreadAngle: 14,
        bulletSpeed: 230,
        diesOnContact: false
    }
};
