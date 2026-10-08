import { defineConfig } from 'vite';

export default defineConfig({
    // Relative paths: the build works on GitHub Pages (/<repo>/), itch.io or inside an iframe
    base: './',
    build: {
        chunkSizeWarningLimit: 1600
    }
});
