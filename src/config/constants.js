export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

export const DEBUG = false;

export const PLAYER = {
    skin: 'dog',
    scale: 0.8,
    tilt: 4,

    speed: 320,
    maxHp: 3,
    fireRate: 120,
    invulnerableTime: 1500
};

export const BULLET = {
    speed: 700,
    tiltAngle: 15,
    damage: 1,
    poolSize: 80
};

export const ENEMY = {
    poolSize: 30
};

export const ENEMY_BULLET = {
    poolSize: 120
};

export const WAVES = {
    firstDelay: 2200,
    breakTime: 2500,
    bossDelay: 1500
};

export const SOUND = {
    sfxMax: 0.7,
    musicMax: 0.5,
    gameOverDuck: 0.35
};

export const BOSS = {
    name: 'BARON VON WHISKERS',
    subtitle: 'the fattest cat in the sky',
    hp: 300,
    scale: 1.3,
    x: 0.78,
    phases: [0.66, 0.33],
    attacks: [
        { list: ['aimed', 'aimed', 'minions'], every: 1500, bob: 70 },
        { list: ['ring', 'spread', 'charge', 'ring'], every: 1700, bob: 90 },
        { list: ['fan', 'ring', 'divers', 'fan', 'charge'], every: 1150, bob: 80 }
    ],
    bulletSpeed: 260,
    points: 2000
};

export const SUPER = {
    perHit: 0.004,
    perKill: 0.025,
    damage: 14,
    bossDamage: 30,
    invulnerable: 1200
};

export const POWERUPS = {
    kinds: ['spread', 'rapid', 'shield', 'super'],
    duration: 9000,
    spreadAngle: 12,
    rapidFactor: 0.55
};

export const RESCUE = {
    points: 100,
    speed: 85
};

export const GRADE = {
    parTime: 170,
    comboGood: 15,
    comboGreat: 30
};

export const JUICE = {
    hitStop: true,
    screenShake: true
};

export const FILM = {
    enabled: true,
    grain: 0.09,
    flicker: 0.05,
    sepia: 0.12,
    vignette: 0.9,
    scratches: 0.25
};

export const COMBO = {
    window: 1800,
    killsPerLevel: 5,
    maxMultiplier: 5
};

export const PARALLAX = {
    layers: [
        { key: 'bg_sky', static: true },
        { key: 'clouds', speed: 14, y: -30, alpha: 0.7 },
        { key: 'bg_far', speed: 22 },
        { key: 'bg_mid', speed: 55 },
        { key: 'bg_near', speed: 120, offsetY: 55 }
    ],
    margin: 24              // extra px per side so camera shake never shows the edge
};
