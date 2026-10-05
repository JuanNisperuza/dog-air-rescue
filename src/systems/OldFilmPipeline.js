import Phaser from 'phaser';
import { FILM } from '../config/constants.js';
import { settings } from './settings.js';

// Filtro de "película vieja" (post-proceso en WebGL): grano, parpadeo, rayones,
// motas de polvo, un toque sepia y viñeta. El grano cambia a 24 fps, como el cine.
const fragShader = `
#define SHADER_NAME OLD_FILM_FS
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;
uniform vec2 uResolution;
uniform float uGrain;
uniform float uFlicker;
uniform float uSepia;
uniform float uVignette;
uniform float uScratches;
uniform float uAberration;

varying vec2 outTexCoord;

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = outTexCoord;
    vec4 color = texture2D(uMainSampler, uv);

    // Aberración cromática: rojo y azul se separan en los golpes fuertes
    if (uAberration > 0.0) {
        vec2 off = vec2(uAberration * 0.012, uAberration * 0.004);
        color.r = texture2D(uMainSampler, uv + off).r;
        color.b = texture2D(uMainSampler, uv - off).b;
    }
    float frame = floor(uTime * 24.0);

    vec3 sepia = vec3(
        dot(color.rgb, vec3(0.393, 0.769, 0.189)),
        dot(color.rgb, vec3(0.349, 0.686, 0.168)),
        dot(color.rgb, vec3(0.272, 0.534, 0.131))
    );
    color.rgb = mix(color.rgb, sepia, uSepia);

    float grain = rand(floor(uv * uResolution / 1.5) + frame) - 0.5;
    color.rgb += grain * uGrain;

    color.rgb *= 1.0 + (rand(vec2(frame, 1.7)) - 0.5) * uFlicker;

    // Un rayón vertical que aparece de vez en cuando
    if (rand(vec2(frame, 3.1)) > 1.0 - uScratches) {
        float x = rand(vec2(frame, 9.2));
        float d = abs(uv.x - x);
        color.rgb += smoothstep(0.0012, 0.0, d) * 0.22;
    }

    // Motas de polvo oscuras
    if (rand(floor(uv * uResolution / 3.0) + frame * 7.0) > 0.99965) {
        color.rgb *= 0.35;
    }

    vec2 c = uv - 0.5;
    color.rgb *= clamp(1.0 - dot(c, c) * uVignette, 0.0, 1.0);

    gl_FragColor = color;
}
`;

export default class OldFilmPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
    constructor(game) {
        super({ game, name: 'OldFilm', fragShader });
        this.aberration = 0;    // lo anima Effects (0 = nada)
    }

    onPreRender() {
        this.set1f('uTime', this.game.loop.time / 1000);
        this.set2f('uResolution', this.renderer.width, this.renderer.height);
        this.set1f('uGrain', FILM.grain);
        this.set1f('uFlicker', FILM.flicker);
        this.set1f('uSepia', FILM.sepia);
        this.set1f('uVignette', FILM.vignette);
        this.set1f('uScratches', FILM.scratches);
        this.set1f('uAberration', this.aberration);
    }
}

// Aplica el filtro a la cámara principal de una escena (solo en WebGL).
// Se puede llamar otra vez después de cambiarlo en Options.
export function applyFilm(scene) {
    if (scene.renderer.type !== Phaser.WEBGL) return;
    const camera = scene.cameras.main;
    const on = FILM.enabled && settings.film;
    const found = camera.getPostPipeline(OldFilmPipeline); // [] si no lo tiene
    const has = Array.isArray(found) ? found.length > 0 : !!found;
    if (on && !has) camera.setPostPipeline(OldFilmPipeline);
    if (!on && has) camera.removePostPipeline(OldFilmPipeline);
}
