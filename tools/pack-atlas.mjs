import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import texturePacker from 'free-tex-packer-core';
import sharp from 'sharp';

const OUTPUT_DIR = 'public/assets/atlas';

const COMPRESS_PNG = true;

const ATLASES = [
    {
        name: 'enemies',
        sourceDir: 'art/frames/enemies',
        prefixes: ['cat_']
    },
    {
        name: 'dog_plane',
        sourceDir: 'art/frames/dog',
        prefixes: ['dog_plane_']
    },
    {
        name: 'fx',
        sourceDir: 'art/frames/fx',
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
    width: 2048,
    height: 2048,
    fixedSize: false,
    powerOfTwo: false,
    padding: 2,
    extrude: 0,               // with trim, extrude > 0 draws a visible border around each frame
    allowRotation: false,
    allowTrim: true,
    trimMode: 'trim',
    detectIdentical: true,
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

const only = process.argv.slice(2);
for (const atlas of ATLASES.filter((a) => only.length === 0 || only.includes(a.name))) {
    const files = readdirSync(atlas.sourceDir)
        .filter((f) => f.toLowerCase().endsWith('.png'))
        .filter((f) => atlas.prefixes.some((p) => f.startsWith(p)))
        .sort();

    if (files.length === 0) {
        console.warn(`${atlas.name}: no frames found in "${atlas.sourceDir}"`);
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
        console.log(`  ${join(OUTPUT_DIR, file.name)}  (${(file.buffer.length / 1024).toFixed(0)} KB)`);
    }
    console.log(`${atlas.name}: ${files.length} frames packed`);
}
