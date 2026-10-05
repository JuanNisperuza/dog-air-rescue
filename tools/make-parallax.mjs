// Prepara las capas del fondo: quita el magenta, las vuelve repetibles sin costura,
// recorta el espacio vacío de arriba y las guarda en WebP. El cielo solo se recorta a 16:9.
// Uso: npm run parallax
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OUTPUT_DIR = 'public/assets/bg';
const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;

const LAYERS = [
    { input: 'art/source/cielo.jpeg', output: 'bg_sky', sky: true },
    // key: umbrales del chroma key [opaco, transparente]; las capas claras necesitan uno más estricto
    // blend: px de fundido en la unión (0 = corte limpio)
    // valley: cuánto preferir cortar donde los edificios son más bajos
    // scale: 1 = la imagen completa mide lo mismo que la pantalla de alto
    { input: 'art/source/ciudad lejana.jpeg', output: 'bg_far', key: [25, 90], blend: 40, valley: 0.3, scale: 0.72 },
    // La ciudad media va menos saturada para que no compita con enemigos y balas
    { input: 'art/source/ciudad media.jpeg', output: 'bg_mid', key: [35, 65], blend: 0, valley: 1.5, saturation: 0.8, brightness: 0.92, scale: 0.7 },
    { input: 'art/source/primer plano.jpeg', output: 'bg_near', key: [60, 130], blend: 30, valley: 0.5, scale: 0.55 }
];

// Chroma key (igual que en slice-sheet.mjs)
const MIN_ALPHA = 24;

// Seamless
const SEARCH_DOWNSCALE = 4;  // buscamos la unión en una copia chica (más rápido)
const SEARCH_EDGE = 0.22;    // buscar en el primer y último 22% del ancho
const MATCH_WINDOW = 6;      // columnas que se comparan a cada lado
const MAX_BLEND = 40;        // px máximos de fundido (a resolución original)

function keyOut(rgb, width, height, [KEY_SOLID, KEY_CLEAR]) {
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0, o = 0; i < rgb.length; i += 3, o += 4) {
        let r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
        const key = Math.min(r, b) - g;
        let alpha = 1 - (key - KEY_SOLID) / (KEY_CLEAR - KEY_SOLID);
        alpha = Math.max(0, Math.min(1, alpha));
        const spill = Math.max(0, Math.min(r, b) - g);
        if (alpha < 1 && spill > 0) { r -= spill; b -= spill; }
        out[o] = r; out[o + 1] = g; out[o + 2] = b;
        out[o + 3] = Math.round(alpha * 255);
        if (out[o + 3] < MIN_ALPHA) out[o + 3] = 0;
    }
    return out;
}

// Diferencia entre las columnas alrededor de a y alrededor de b
function windowDiff(px, width, height, a, b) {
    let sum = 0;
    for (let dx = -MATCH_WINDOW; dx < MATCH_WINDOW; dx++) {
        for (let y = 0; y < height; y++) {
            const ia = (y * width + a + dx) * 4;
            const ib = (y * width + b + dx) * 4;
            // Color premultiplicado por alpha, así lo transparente no cuenta
            const aa = px[ia + 3] / 255, ab = px[ib + 3] / 255;
            sum += Math.abs(px[ia] * aa - px[ib] * ab)
                + Math.abs(px[ia + 1] * aa - px[ib + 1] * ab)
                + Math.abs(px[ia + 2] * aa - px[ib + 2] * ab)
                + Math.abs(px[ia + 3] - px[ib + 3]);
        }
    }
    return sum;
}

// Altura del dibujo en cada columna (0 vacía, 1 llega hasta arriba)
function columnHeights(px, width, height) {
    const heights = new Float32Array(width);
    for (let x = 0; x < width; x++) {
        let y = 0;
        while (y < height && px[(y * width + x) * 4 + 3] < 128) y++;
        heights[x] = 1 - y / height;
    }
    return heights;
}

async function findSeam(rgba, width, height, valley) {
    const w = Math.round(width / SEARCH_DOWNSCALE);
    const h = Math.round(height / SEARCH_DOWNSCALE);
    const small = await sharp(rgba, { raw: { width, height, channels: 4 } })
        .resize(w, h, { kernel: 'linear' })
        .raw()
        .toBuffer();

    const margin = Math.ceil(MAX_BLEND / SEARCH_DOWNSCALE) + MATCH_WINDOW;
    const edge = Math.round(w * SEARCH_EDGE);
    const heights = columnHeights(small, w, h);

    const maxDiff = MATCH_WINDOW * 2 * h * 255 * 4;
    let best = { score: Infinity, a: 0, b: w };

    for (let a = margin; a < edge; a++) {
        for (let b = w - edge; b < w - MATCH_WINDOW; b++) {
            const diff = windowDiff(small, w, h, a, b) / maxDiff;
            const score = diff + valley * (heights[a] + heights[b]);
            if (score < best.score) best = { score, a, b };
        }
    }
    return { start: best.a * SEARCH_DOWNSCALE, end: best.b * SEARCH_DOWNSCALE };
}

// Recorta [start, end) y funde el final con lo que hay antes de start,
// así la última columna empata con la primera al repetirse
function makeSeamless(rgba, width, height, start, end, blend) {
    const period = end - start;
    const out = Buffer.alloc(period * height * 4);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < period; x++) {
            const src = ((y * width) + start + x) * 4;
            const dst = (y * period + x) * 4;
            const fromEnd = period - x; // distancia al final
            if (fromEnd <= blend) {
                const t = 1 - fromEnd / blend;           // 0 → 1 al acercarse al final
                const alt = ((y * width) + start - fromEnd) * 4; // columna equivalente antes del inicio
                for (let c = 0; c < 4; c++) {
                    out[dst + c] = Math.round(rgba[src + c] * (1 - t) + rgba[alt + c] * t);
                }
            } else {
                rgba.copy(out, dst, src, src + 4);
            }
        }
    }
    return { pixels: out, width: period };
}

function firstOpaqueRow(rgba, width, height) {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (rgba[(y * width + x) * 4 + 3] > 16) return y;
        }
    }
    return height;
}

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const layer of LAYERS) {
    const image = sharp(layer.input).removeAlpha();
    const { width, height } = await image.metadata();
    const scale = (GAME_HEIGHT / height) * (layer.scale ?? 1);

    if (layer.sky) {
        // 16:9 alineado a la derecha, donde está el sol
        const cropW = Math.round(height * 16 / 9);
        await image
            .extract({ left: width - cropW, top: 0, width: cropW, height })
            .resize(GAME_WIDTH, GAME_HEIGHT, { kernel: 'lanczos3' })
            .webp({ quality: 82 })
            .toFile(join(OUTPUT_DIR, `${layer.output}.webp`));
        console.log(`✔ ${layer.output}: ${GAME_WIDTH}x${GAME_HEIGHT} (fijo)`);
        continue;
    }

    const rgb = await image.raw().toBuffer();
    let rgba = keyOut(rgb, width, height, layer.key);

    // El color se ajusta después del chroma key; antes, el magenta desaturado ya no se borraría
    if (layer.saturation !== undefined || layer.brightness !== undefined) {
        rgba = await sharp(rgba, { raw: { width, height, channels: 4 } })
            .modulate({ saturation: layer.saturation ?? 1, brightness: layer.brightness ?? 1 })
            .raw()
            .toBuffer();
    }

    const { start, end } = await findSeam(rgba, width, height, layer.valley);
    const seamless = makeSeamless(rgba, width, height, start, end, Math.min(layer.blend, MAX_BLEND));

    // Quitar el espacio vacío de arriba
    const top = Math.max(0, firstOpaqueRow(seamless.pixels, seamless.width, height) - 4);
    const cropH = height - top;

    const outW = Math.round(seamless.width * scale);
    const outH = Math.round(cropH * scale);

    await sharp(seamless.pixels, { raw: { width: seamless.width, height, channels: 4 } })
        .extract({ left: 0, top, width: seamless.width, height: cropH })
        .resize(outW, outH, { kernel: 'lanczos3' })
        .webp({ quality: 85, alphaQuality: 90 })
        .toFile(join(OUTPUT_DIR, `${layer.output}.webp`));

    console.log(`✔ ${layer.output}: ${outW}x${outH}  (unión entre columnas ${start} y ${end} de ${width})`);
}
