// Valores ajustables del juego.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// true = muestra las cajas de colisión
export const DEBUG = false;

export const PLAYER = {
    skin: 'dog',            // 'dog' | 'cuphead'  (ver config/skins.js)
    scale: 0.8,             // tamaño del avión (1 = tamaño original del sprite)
    tilt: 4,                // grados que se inclina al subir/bajar (además de la animación)

    speed: 320,             // px/s
    maxHp: 3,
    fireRate: 120,          // ms entre disparos (menor = dispara más rápido)
    invulnerableTime: 1500  // ms de invulnerabilidad después de recibir daño
};

export const BULLET = {
    speed: 700,     // px/s
    tiltAngle: 15,  // grados de inclinación al disparar subiendo/bajando (0 = siempre recto)
    damage: 1,
    poolSize: 80    // máximo de balas en pantalla (con el disparo triple salen 3 a la vez)
};

// Los stats de cada tipo de enemigo están en config/enemyTypes.js
export const ENEMY = {
    poolSize: 30            // máximo de enemigos vivos al mismo tiempo
};

export const ENEMY_BULLET = {
    poolSize: 120
};

// Las oleadas en sí están en config/waves.js. Después de la última llega el jefe.
export const WAVES = {
    firstDelay: 2200,       // ms antes de la primera oleada (deja ver el "READY?")
    breakTime: 2500,        // ms de descanso entre oleadas
    bossDelay: 1500         // ms entre la última oleada y el aviso del jefe
};

// Volumen máximo; el jugador elige el nivel (0 a 10) en Options. Tecla M = silenciar todo
export const SOUND = {
    sfxMax: 0.7,
    musicMax: 0.5,
    gameOverDuck: 0.35      // la música baja a este porcentaje al terminar la partida
};

// El jefe: el gato pesado en grande, con tres fases
export const BOSS = {
    name: 'BARON VON WHISKERS',
    subtitle: 'the fattest cat in the sky',
    hp: 300,
    scale: 1.3,
    x: 0.78,                // dónde se queda (fracción del ancho)
    phases: [0.66, 0.33],   // cambia de fase al bajar de estos porcentajes de vida
    // Ataques de cada fase: se repiten en orden, con este tiempo entre uno y otro (ms)
    attacks: [
        { list: ['aimed', 'aimed', 'minions'], every: 1500, bob: 70 },
        { list: ['ring', 'spread', 'charge', 'ring'], every: 1700, bob: 90 },
        { list: ['fan', 'ring', 'divers', 'fan', 'charge'], every: 1150, bob: 80 }
    ],
    bulletSpeed: 260,
    points: 2000
};

// Ataque especial: se llena pegando y matando, y se suelta con C / Shift
export const SUPER = {
    perHit: 0.004,
    perKill: 0.025,
    damage: 14,             // daño a cada enemigo en pantalla
    bossDamage: 30,
    invulnerable: 1200      // ms de invulnerabilidad al usarlo
};

// Mejoras que sueltan algunos enemigos (la probabilidad está en enemyTypes.js, en "drop")
export const POWERUPS = {
    kinds: ['spread', 'rapid', 'shield', 'super'],   // super: llena el medidor de una
    duration: 9000,         // ms que duran spread y rapid (el escudo dura hasta que te pegan)
    spreadAngle: 12,        // grados entre las tres balas
    rapidFactor: 0.55       // multiplica el tiempo entre disparos
};

// Perritos para rescatar (aparecen según config/waves.js)
export const RESCUE = {
    points: 100,
    speed: 85
};

// Nota final (solo al ganar): puntos de 0 a 10
export const GRADE = {
    parTime: 170,           // segundos; terminar antes da puntos extra
    comboGood: 15,
    comboGreat: 30
};

// Efectos de impacto (se pueden apagar para comparar)
export const JUICE = {
    hitStop: true,          // congelar la física unos ms en golpes fuertes
    screenShake: true       // temblor de cámara
};

// Filtro de película vieja (solo WebGL)
export const FILM = {
    enabled: true,
    grain: 0.09,            // intensidad del grano
    flicker: 0.05,          // parpadeo de brillo
    sepia: 0.12,            // 0 = colores originales, 1 = sepia total
    vignette: 0.9,          // oscurecimiento de las esquinas
    scratches: 0.25         // probabilidad de rayón por frame
};

// Combo: matar seguido sube el multiplicador de puntos
export const COMBO = {
    window: 1800,           // ms máximos entre muertes para mantener el combo
    killsPerLevel: 5,       // cada 5 muertes seguidas sube el multiplicador
    maxMultiplier: 5
};

// Capas del fondo, de atrás hacia adelante (speed en px/s).
// offsetY baja la capa para que una parte quede fuera de pantalla.
export const PARALLAX = {
    layers: [
        { key: 'bg_sky', static: true },                    // cielo fijo
        { key: 'clouds', speed: 14, y: -30, alpha: 0.7 },   // nubes (dibujadas con código)
        { key: 'bg_far', speed: 22 },                       // ciudad lejana
        { key: 'bg_mid', speed: 55 },                       // ciudad media
        { key: 'bg_near', speed: 120, offsetY: 55 }         // primer plano (asoma solo la parte de arriba)
    ],
    margin: 24              // px extra por cada lado para que el temblor no muestre el borde
};
