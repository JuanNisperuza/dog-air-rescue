import { defineConfig } from 'vite';

export default defineConfig({
    // Rutas relativas: el build funciona en GitHub Pages (/<repo>/), itch.io o dentro de un iframe
    base: './',
    build: {
        // Phaser solo ya pesa ~1.2 MB; no hace falta la advertencia
        chunkSizeWarningLimit: 1600
    }
});
