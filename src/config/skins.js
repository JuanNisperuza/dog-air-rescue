export const SKINS = {
    dog: {
        atlas: 'dog_plane',
        framePrefix: 'dog_plane_',
        anims: {
            // Flight skips the open-mouth frames (5 to 8), which made the loop noticeable
            idle_straight: { from: 'idle', frames: [1, 2, 3, 4, 9, 10, 11, 12, 13, 14, 15, 16] },
            happy: 8,
            hurt: 4,
            super: 11,
            ghost: 2
        },
        fps: 20,
        tilt: 14,
        propeller: { x: 74, y: 5 },
        canvasCenter: { x: 99, y: 123 },
        hitbox: { width: 70, height: 46 },
        muzzle: { x: 68, y: 2 },
        exhaust: { x: -60, y: -2 }
    },

    cuphead: {
        atlas: 'cuphead_plane',
        framePrefix: 'cuphead_plane_',
        anims: {
            idle_straight: 4,
            idle_up: 4,
            idle_down: 4,
            trans_up: 11,
            trans_down: 11,
            ghost: 24
        },
        fps: 24,
        canvasCenter: { x: 245, y: 208 },
        hitbox: { width: 56, height: 44 },
        muzzle: { x: 50, y: 6 },
        exhaust: { x: -50, y: 8 }
    }
};
