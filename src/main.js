import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEBUG } from './config/constants.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import PauseScene from './scenes/PauseScene.js';
import OptionsScene from './scenes/OptionsScene.js';
import ResultsScene from './scenes/ResultsScene.js';
import TransitionScene from './scenes/TransitionScene.js';
import OldFilmPipeline from './systems/OldFilmPipeline.js';

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#87ceeb',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 }, // es un avión: sin gravedad
            debug: DEBUG
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,             // se ajusta al tamaño de la ventana
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pipeline: { OldFilm: OldFilmPipeline },
    input: { activePointers: 3 },           // varios dedos a la vez en celular
    // La primera escena arranca sola; las demás se lanzan desde código.
    // El orden es el orden de dibujo: TransitionScene va al final para quedar encima de todo.
    scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, ResultsScene, OptionsScene, TransitionScene]
};

new Phaser.Game(config);
