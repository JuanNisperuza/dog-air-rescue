// Empaqueta los frames sueltos en atlas de Phaser (recorta la transparencia de cada
// frame y comprime el PNG a 256 colores). Para animaciones nuevas, agregar su prefijo
// en ATLASES. Uso: npm run atlas  (o solo algunos: npm run atlas -- fx boss)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import texturePacker from 'free-tex-packer-core';
import sharp from 'sharp';

const OUTPUT_DIR = 'public/assets/atlas';

// false = PNG sin pérdida (más pesado), por si se ven bandas de color
const COMPRESS_PNG = true;

const ATLASES = [
    {
        name: 'enemies',
        sourceDir: 'art/frames/enemies',  // generado con npm run slice
        prefixes: ['cat_']
    },
    {
        name: 'dog_plane',
        sourceDir: 'art/frames/dog',  // generado con npm run slice
        prefixes: ['dog_plane_']
    },
    {
        name: 'fx',
        sourceDir: 'art/frames/fx',     // explosiones, chispas, humo, balas, perritos, power-ups
        prefixes: ['fx_', 'pup_', 'pu_']
    },
    {
        name: 'boss',
        sourceDir: 'art/frames/boss',
        prefixes: ['boss_']
    },
    {
        name: 'cuphead_plane',
        sourceDir: 'art/frames/cuphead',
        prefixes: [
            'cuphead_plane_idle_straight_',
            'cuphead_plane_idle_up_',
            'cuphead_plane_idle_down_',
            'cuphead_plane_trans_up_',
            'cuphead_plane_trans_down_',
            'cuphead_plane_ghost_'
        ]
    }
];

const PACKER_OPTIONS = {
    exporter: 'Phaser3',
    width: 2048,              // tamaño máximo por hoja (si no cabe, crea otra)
    height: 2048,
    fixedSize: false,
    powerOfTwo: false,
    padding: 2,               // espacio entre frames (evita "sangrado" de píxeles)
    extrude: 0,               // ⚠ con trim, extrude > 0 dibuja un borde visible alrededor de cada frame
    allowRotation: false,
    allowTrim: true,          // ← recorta la transparencia: el ahorro grande
    trimMode: 'trim',
    detectIdentical: true,    // frames repetidos se guardan una sola vez
    removeFileExtension: true,
    prependFolderName: false,
    packer: 'MaxRectsPacker',
    packerMethod: 'Smart'
};

function pack(images, options) {
    return new Promise((resolve, reject) => {
        texturePacker(images, options, (files, error) => {
            if (error) reject(error);
            else resolve(files);
        });
    });
}

mkdirSync(OUTPUT_DIR, { recursive: true });

// Si se pasan nombres por consola, solo se empaquetan esos
const only = process.argv.slice(2);
for (const atlas of ATLASES.filter((a) => only.length === 0 || only.includes(a.name))) {
    const files = readdirSync(atlas.sourceDir)
        .filter((f) => f.toLowerCase().endsWith('.png'))
        .filter((f) => atlas.prefixes.some((p) => f.startsWith(p)))
        .sort();

    if (files.length === 0) {
        console.warn(`⚠ ${atlas.name}: no encontré frames en "${atlas.sourceDir}"`);
        continue;
    }

    const images = files.map((f) => ({
        path: f,
        contents: readFileSync(join(atlas.sourceDir, f))
    }));

    const output = await pack(images, { ...PACKER_OPTIONS, textureName: atlas.name });

    for (const file of output) {
        let buffer = file.buffer;
        if (file.name.endsWith('.png') && COMPRESS_PNG) {
            buffer = await sharp(buffer)
                .png({ palette: true, quality: 95, compressionLevel: 9, effort: 10 })
                .toBuffer();
        }
        writeFileSync(join(OUTPUT_DIR, file.name), buffer);
        file.buffer = buffer;
        console.log(`  ✓ ${join(OUTPUT_DIR, file.name)}  (${(file.buffer.length / 1024).toFixed(0)} KB)`);
    }
    console.log(`✔ ${atlas.name}: ${files.length} frames empaquetados`);
}
