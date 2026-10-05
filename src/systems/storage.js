// localStorage puede fallar (modo incógnito, almacenamiento bloqueado), por eso el try/catch.
const PREFIX = 'dog-air-rescue:';

export function load(key, fallback) {
    try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function save(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
        // Sin almacenamiento simplemente no se guarda
    }
}
