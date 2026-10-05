// Valores ajustables del juego.

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// true = muestra las cajas de colisión
export const DEBUG = false;

export const PLAYER = {
    skin: 'dog',            // 'dog' | 'cuphead'  (ver config/skins.js)
    scale: 0.8,             // tamaño del avión (1 = tamaño original del sprite)

    speed: 320,             // px/s
    maxHp: 3,
    fireRate: 120,          // ms entre disparos (menor = dispara más rápido)
    invulnerableTime: 1500  // ms de invulnerabilidad después de recibir daño
};

export const BULLET = {
    speed: 700,     // px/s
    tiltAngle: 15,  // grados de inclinación al disparar subiendo/bajando (0 = siempre recto)
    damage: 1,
    poolSize: 40    // máximo de balas en pantalla al mismo tiempo
};

// Los stats de cada tipo de enemigo están en config/enemyTypes.js
export const ENEMY = {
    poolSize: 30            // máximo de enemigos vivos al mismo tiempo
};

export const ENEMY_BULLET = {
    poolSize: 120
};

// Las oleadas en sí están en config/waves.js
export const WAVES = {
    firstDelay: 1500,       // ms antes de la primera oleada
    breakTime: 2500,        // ms de descanso entre oleadas
    // Cada vuelta completa a la lista de oleadas suma estos porcentajes
    loopHp: 0.3,            // +30% de vida
    loopSpeed: 0.1,         // +10% de velocidad
    loopFireRate: 0.15      // +15% de cadencia de disparo
};

export const SOUND = {
    volume: 0.5,            // volumen de efectos (0 a 1). Tecla M = silenciar todo
    musicVolume: 0.35,      // volumen de la música
    musicGameOver: 0.12     // la música baja en el game over
};

// Efectos de impacto (se pueden apagar para comparar)
export const JUICE = {
    hitStop: true,          // congelar la física unos ms en golpes fuertes
    screenShake: true       // temblor de cámara
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
    ]
};
