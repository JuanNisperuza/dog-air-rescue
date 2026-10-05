// Corta hojas de sprites en frames sueltos y les quita el fondo magenta.
// mode 'grid': corta por cuadrícula y centra cada dibujo.
// mode 'components': busca cada isla de píxeles y junta las piezas sueltas
// (fogonazos, humo) con el personaje más cercano; útil cuando un dibujo se sale de su celda.
// Después correr npm run atlas. Uso: npm run slice
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SHEETS = [
    // Jugador
    {
        input: 'art/source/dogsheet.jpeg',
        outputDir: 'art/frames/dog',
        prefix: 'dog_plane_',
        cols: 6,
        rows: 6,
        scale: 0.42,       // 300px del dibujo original → ~125px en el juego
        // [fila, columna] de cada frame, desde 0
        animations: {
            idle_straight: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5]],
            idle_up:       [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5]],
            idle_down:     [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5]],
            ghost:         [[5, 1], [5, 4]]
        }
    },

    // Enemigos (gatos)
    // En modo components la columna es el n-ésimo personaje de la fila.
    // targetWidth: ancho del cuerpo en el juego (px).
    // align 'right' alinea por la cola, útil cuando el fogonazo sale por la izquierda.
    {
        input: 'art/source/flyer.jpeg', mode: 'components', outputDir: 'art/frames/enemies', prefix: 'cat_flyer_',
        rows: 2, cols: 4, targetWidth: 54, align: 'center',
        animations: { fly: [[0, 0], [0, 1], [0, 2], [0, 3]] }
    },
    {
        input: 'art/source/gunner.jpeg', mode: 'components', outputDir: 'art/frames/enemies', prefix: 'cat_gunner_',
        rows: 2, cols: 4, targetWidth: 74, align: 'right', key: [100, 150],
        animations: {
            fly: [[0, 0], [0, 1], [0, 2], [0, 3]],
            shoot: [[1, 0], [1, 1], [1, 2], [1, 3]]
        }
    },
    {
        input: 'art/source/diver.jpeg', mode: 'components', outputDir: 'art/frames/enemies', prefix: 'cat_diver_',
        rows: 2, cols: 4, targetWidth: 70, align: 'center', flipX: true, // la IA lo dibujó mirando a la derecha
        animations: {
            fly: [[0, 0], [0, 1], [0, 2], [0, 3]],
            warn: [[1, 0]],
            dash: [[1, 1], [1, 2], [1, 3]]
        }
    },
    {
        input: 'art/source/heavy.jpeg', mode: 'components', outputDir: 'art/frames/enemies', prefix: 'cat_heavy_',
        rows: 2, cols: 4, targetWidth: 130, align: 'right',
        animations: {
            fly: [[0, 0], [0, 1], [0, 2], [0, 3]],
            shoot: [[1, 0], [1, 1], [1, 2], [1, 3]]
        }
    }
];

// Chroma key
// Qué tan magenta es un píxel: min(R, B) - G. El fondo da ~170-250 y el personaje < 100.
const KEY_SOLID = 100;  // por debajo: 100% opaco
const KEY_CLEAR = 160;  // por encima: 100% transparente
const PADDING = 8;      // px de margen alrededor del dibujo (antes de escalar)
const MIN_ALPHA = 24;   // alpha menor a esto = ruido del JPEG → transparente

function keyOut(data, width, x0, y0, w, h) {
    const out = Buffer.alloc(w * h * 4);
    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = ((y0 + y) * width + (x0 + x)) * 3;
            let r = data[i], g = data[i + 1], b = data[i + 2];

            const key = Math.min(r, b) - g;
            let alpha = 1 - (key - KEY_SOLID) / (KEY_CLEAR - KEY_SOLID);
            alpha = Math.max(0, Math.min(1, alpha));

            // Quitar el tinte magenta de los bordes
            const spill = Math.max(0, Math.min(r, b) - g);
            if (alpha < 1 && spill > 0) {
                r -= spill;
                b -= spill;
            }

            const o = (y * w + x) * 4;
            out[o] = r; out[o + 1] = g; out[o + 2] = b;
            out[o + 3] = Math.round(alpha * 255);
            if (out[o + 3] < MIN_ALPHA) out[o + 3] = 0;

            if (out[o + 3] > 32) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    return { pixels: out, bbox: maxX < 0 ? null : { minX, minY, maxX, maxY } };
}

async function sliceGrid(sheet) {
    const { data, info } = await sharp(sheet.input)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const cellW = info.width / sheet.cols;
    const cellH = info.height / sheet.rows;

    // 1) Recortar y limpiar todas las celdas
    const frames = [];
    for (const [anim, cells] of Object.entries(sheet.animations)) {
        cells.forEach(([row, col], index) => {
            const x0 = Math.round(col * cellW);
            const y0 = Math.round(row * cellH);
            const w = Math.round((col + 1) * cellW) - x0;
            const h = Math.round((row + 1) * cellH) - y0;
            const { pixels, bbox } = keyOut(data, info.width, x0, y0, w, h);
            if (!bbox) {
                console.warn(`⚠ celda vacía [${row}, ${col}] en ${anim}`);
                return;
            }
            frames.push({ anim, index, pixels, w, h, bbox });
        });
    }

    // 2) Todos los frames usan el mismo lienzo (el del dibujo más grande)
    const canvasW = Math.max(...frames.map((f) => f.bbox.maxX - f.bbox.minX + 1)) + PADDING * 2;
    const canvasH = Math.max(...frames.map((f) => f.bbox.maxY - f.bbox.minY + 1)) + PADDING * 2;
    const outW = Math.round(canvasW * sheet.scale);
    const outH = Math.round(canvasH * sheet.scale);

    mkdirSync(sheet.outputDir, { recursive: true });

    // 3) Centrar cada dibujo en el lienzo, escalar y guardar
    for (const f of frames) {
        const bw = f.bbox.maxX - f.bbox.minX + 1;
        const bh = f.bbox.maxY - f.bbox.minY + 1;

        const cropped = await sharp(f.pixels, { raw: { width: f.w, height: f.h, channels: 4 } })
            .extract({ left: f.bbox.minX, top: f.bbox.minY, width: bw, height: bh })
            .png()
            .toBuffer();

        const name = `${sheet.prefix}${f.anim}_${String(f.index + 1).padStart(4, '0')}.png`;
        await sharp({
            create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        })
            .composite([{
                input: cropped,
                left: Math.floor((canvasW - bw) / 2),
                top: Math.floor((canvasH - bh) / 2)
            }])
            .png()
            .toBuffer()
            .then((buf) => sharp(buf).resize(outW, outH, { kernel: 'lanczos3' }).png().toFile(join(sheet.outputDir, name)));
    }

    console.log(`✔ ${sheet.input}: ${frames.length} frames → "${sheet.outputDir}/" (lienzo ${outW}x${outH})`);
}

// Modo componentes
const MIN_COMPONENT = 120;     // islas más chicas que esto (px) = ruido, se ignoran
const ANCHOR_RATIO = 0.25;     // isla "cuerpo" = al menos 25% del área de la más grande de su fila

function keyOutSheet(data, width, height, [solid, clear] = [KEY_SOLID, KEY_CLEAR]) {
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];
        const key = Math.min(r, b) - g;
        let alpha = 1 - (key - solid) / (clear - solid);
        alpha = Math.max(0, Math.min(1, alpha));
        const spill = Math.max(0, Math.min(r, b) - g);
        if (alpha < 1 && spill > 0) { r -= spill; b -= spill; }
        out[o] = r; out[o + 1] = g; out[o + 2] = b;
        out[o + 3] = Math.round(alpha * 255);
        if (out[o + 3] < MIN_ALPHA) out[o + 3] = 0;
    }
    return out;
}

// Etiqueta cada isla de píxeles opacos (8 vecinos)
function labelComponents(rgba, width, height) {
    const labels = new Int32Array(width * height);
    const stack = new Int32Array(width * height);
    const components = [];

    for (let start = 0; start < width * height; start++) {
        if (labels[start] !== 0 || rgba[start * 4 + 3] <= 32) continue;

        const id = components.length + 1;
        const c = { id, area: 0, minX: width, minY: height, maxX: 0, maxY: 0 };
        let top = 0;
        stack[top++] = start;
        labels[start] = id;

        while (top > 0) {
            const p = stack[--top];
            const x = p % width, y = (p - x) / width;
            c.area++;
            if (x < c.minX) c.minX = x; if (x > c.maxX) c.maxX = x;
            if (y < c.minY) c.minY = y; if (y > c.maxY) c.maxY = y;

            for (let dy = -1; dy <= 1; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width) continue;
                    const q = ny * width + nx;
                    if (labels[q] === 0 && rgba[q * 4 + 3] > 32) {
                        labels[q] = id;
                        stack[top++] = q;
                    }
                }
            }
        }
        components.push(c);
    }
    return { labels, components: components.filter((c) => c.area >= MIN_COMPONENT) };
}

const bboxOf = (list) => ({
    minX: Math.min(...list.map((c) => c.minX)), minY: Math.min(...list.map((c) => c.minY)),
    maxX: Math.max(...list.map((c) => c.maxX)), maxY: Math.max(...list.map((c) => c.maxY))
});

// Distancia horizontal entre dos intervalos (0 si se tocan)
const gapX = (a, b) => Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));

async function sliceComponents(sheet) {
    const { data, info } = await sharp(sheet.input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    const rgba = keyOutSheet(data, width, height, sheet.key);
    const { labels, components } = labelComponents(rgba, width, height);

    // 1) Repartir islas por fila (según su centro vertical)
    const rowH = height / sheet.rows;
    const grid = []; // grid[fila][columna] = { parts: [islas], body: [islas del cuerpo] }

    for (let row = 0; row < sheet.rows; row++) {
        const inRow = components.filter((c) => Math.floor(((c.minY + c.maxY) / 2) / rowH) === row);
        const biggest = Math.max(...inRow.map((c) => c.area));

        // 2) Las islas grandes son cuerpos. Si sobran (globo y canasta separados, un fogonazo
        //    grande), se juntan las vecinas más cercanas hasta tener una por columna
        const anchors = inRow.filter((c) => c.area >= biggest * ANCHOR_RATIO).sort((a, b) => a.minX - b.minX);
        const frames = anchors.map((a) => ({ body: [a], parts: [a] }));
        while (frames.length > sheet.cols) {
            let bestI = 0, bestDist = Infinity;
            for (let i = 0; i < frames.length - 1; i++) {
                const A = bboxOf(frames[i].body), B = bboxOf(frames[i + 1].body);
                const dist = gapX(A, B) * 1000 + Math.abs((A.minX + A.maxX) / 2 - (B.minX + B.maxX) / 2);
                if (dist < bestDist) { bestDist = dist; bestI = i; }
            }
            // La isla más grande del par queda como cuerpo
            const [A, B] = [frames[bestI], frames[bestI + 1]];
            const areaA = A.body.reduce((n, c) => n + c.area, 0);
            const areaB = B.body.reduce((n, c) => n + c.area, 0);
            const overlap = gapX(bboxOf(A.body), bboxOf(B.body)) === 0;
            const merged = overlap && Math.min(areaA, areaB) > 0.5 * Math.max(areaA, areaB)
                ? { body: [...A.body, ...B.body], parts: [...A.parts, ...B.parts] }  // dos mitades del mismo personaje
                : areaA >= areaB
                    ? { body: A.body, parts: [...A.parts, ...B.parts] }
                    : { body: B.body, parts: [...A.parts, ...B.parts] };
            frames.splice(bestI, 2, merged);
        }
        if (frames.length !== sheet.cols) {
            console.warn(`⚠ ${sheet.input} fila ${row}: encontré ${frames.length} personajes, esperaba ${sheet.cols}`);
        }

        // 3) Las islas pequeñas (fogonazo, humo...) van con el cuerpo más cercano
        for (const c of inRow) {
            if (frames.some((f) => f.body.includes(c))) continue;
            let best = null, bestDist = Infinity;
            for (const f of frames) {
                const box = bboxOf(f.body);
                const dist = gapX(box, c) * 1000 + Math.abs((box.minX + box.maxX) / 2 - (c.minX + c.maxX) / 2);
                if (dist < bestDist) { bestDist = dist; best = f; }
            }
            best?.parts.push(c);
        }
        grid.push(frames);
    }

    // 4) Punto de alineación de cada frame, sobre el cuerpo
    const wanted = [];
    for (const [anim, cells] of Object.entries(sheet.animations)) {
        cells.forEach(([row, col], index) => {
            const frame = grid[row]?.[col];
            if (!frame) { console.warn(`⚠ ${sheet.input}: no existe [${row}, ${col}] (${anim})`); return; }
            const body = bboxOf(frame.body);
            const all = bboxOf(frame.parts);
            const ax = sheet.align === 'right' ? body.maxX : (body.minX + body.maxX) / 2;
            const ay = (body.minY + body.maxY) / 2;
            wanted.push({ anim, index, frame, body, all, ax, ay });
        });
    }

    // Lienzo común: el punto de alineación queda en el mismo lugar en todos los frames
    const left = Math.max(...wanted.map((w) => w.ax - w.all.minX)) + PADDING;
    const right = Math.max(...wanted.map((w) => w.all.maxX - w.ax)) + PADDING;
    const up = Math.max(...wanted.map((w) => w.ay - w.all.minY)) + PADDING;
    const down = Math.max(...wanted.map((w) => w.all.maxY - w.ay)) + PADDING;
    const canvasW = Math.ceil(left + right);
    const canvasH = Math.ceil(up + down);

    // Que el cuerpo mida targetWidth (mediana de los anchos)
    const bodyWidths = wanted.map((w) => w.body.maxX - w.body.minX).sort((a, b) => a - b);
    const scale = sheet.targetWidth / bodyWidths[Math.floor(bodyWidths.length / 2)];
    const outW = Math.round(canvasW * scale);
    const outH = Math.round(canvasH * scale);

    mkdirSync(sheet.outputDir, { recursive: true });

    for (const w of wanted) {
        const ids = new Set(w.frame.parts.map((c) => c.id));
        const canvas = Buffer.alloc(canvasW * canvasH * 4);
        const offX = Math.round(left - w.ax);
        const offY = Math.round(up - w.ay);

        // Solo los píxeles de las islas de este frame
        for (let y = w.all.minY; y <= w.all.maxY; y++) {
            for (let x = w.all.minX; x <= w.all.maxX; x++) {
                const p = y * width + x;
                if (!ids.has(labels[p])) continue;
                let cx = x + offX;
                if (sheet.flipX) cx = canvasW - 1 - cx;
                const cy = y + offY;
                if (cx < 0 || cy < 0 || cx >= canvasW || cy >= canvasH) continue;
                rgba.copy(canvas, (cy * canvasW + cx) * 4, p * 4, p * 4 + 4);
            }
        }

        const name = `${sheet.prefix}${w.anim}_${String(w.index + 1).padStart(4, '0')}.png`;
        await sharp(canvas, { raw: { width: canvasW, height: canvasH, channels: 4 } })
            .resize(outW, outH, { kernel: 'lanczos3' })
            .png()
            .toFile(join(sheet.outputDir, name));
    }

    // Centro del cuerpo en el lienzo final, para configurar el origen y la hitbox
    const bodyCenterX = sheet.flipX ? canvasW - left : left;
    const align = sheet.align === 'right' ? ' (borde derecho del cuerpo)' : '';
    console.log(`✔ ${sheet.input}: ${wanted.length} frames → "${sheet.outputDir}/" lienzo ${outW}x${outH}, ` +
        `punto de alineación${align} en (${Math.round(bodyCenterX * scale)}, ${Math.round(up * scale)})`);
}

// Ejecutar
for (const sheet of SHEETS) {
    if (sheet.mode === 'components') await sliceComponents(sheet);
    else await sliceGrid(sheet);
}
