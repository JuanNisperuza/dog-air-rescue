// Diseño de las oleadas.
// Cada grupo: at (ms desde que empieza la oleada), type, formation
// (single | line | column | v | random), count, y (0 arriba, 1 abajo)
// y, si hace falta, cualquier stat del tipo para sobreescribirlo.
// Una oleada termina cuando ya salieron todos y no queda ninguno vivo.
export const WAVE_LIST = [
    {
        name: 'Warm-up',
        groups: [
            { at: 0, type: 'flyer', formation: 'line', count: 5, y: 0.3 },
            { at: 2500, type: 'flyer', formation: 'line', count: 5, y: 0.7 }
        ]
    },
    {
        name: 'Formation',
        groups: [
            { at: 0, type: 'flyer', formation: 'v', count: 5, y: 0.5, amplitude: 0, speed: 230 },
            { at: 2500, type: 'gunner', formation: 'column', count: 2, y: 0.5, spacing: 220 },
            { at: 5500, type: 'flyer', formation: 'v', count: 5, y: 0.35, amplitude: 0, speed: 230 }
        ]
    },
    {
        name: 'Nosedive',
        groups: [
            { at: 0, type: 'diver', formation: 'line', count: 3, y: 0.2, interval: 700 },
            { at: 1200, type: 'diver', formation: 'line', count: 3, y: 0.8, interval: 700 },
            { at: 3800, type: 'flyer', formation: 'column', count: 4, y: 0.5, spacing: 95 },
            { at: 5500, type: 'diver', formation: 'column', count: 3, y: 0.5, spacing: 150 }
        ]
    },
    {
        name: 'Heavyweight',
        groups: [
            { at: 0, type: 'heavy', formation: 'single', y: 0.5 },
            { at: 2000, type: 'gunner', formation: 'column', count: 2, y: 0.5, spacing: 340 },
            { at: 6000, type: 'flyer', formation: 'random', count: 6, interval: 450 }
        ]
    },
    {
        name: 'Crossfire',
        groups: [
            { at: 0, type: 'gunner', formation: 'line', count: 3, y: 0.2, interval: 600, stopX: 0.85 },
            { at: 0, type: 'gunner', formation: 'line', count: 3, y: 0.8, interval: 600, stopX: 0.85 },
            { at: 3000, type: 'flyer', formation: 'v', count: 7, y: 0.5, amplitude: 30 },
            { at: 6000, type: 'diver', formation: 'random', count: 5, interval: 500 }
        ]
    },
    {
        name: 'Squadron',
        groups: [
            { at: 0, type: 'heavy', formation: 'single', y: 0.3 },
            { at: 1500, type: 'heavy', formation: 'single', y: 0.75 },
            { at: 3000, type: 'diver', formation: 'line', count: 4, y: 0.5, interval: 800 },
            { at: 5000, type: 'flyer', formation: 'line', count: 8, y: 0.15, interval: 300, amplitude: 25 }
        ]
    }
];
