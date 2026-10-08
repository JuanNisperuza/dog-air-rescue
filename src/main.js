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
            gravity: { x: 0, y: 0 },
            debug: DEBUG
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pipeline: { OldFilm: OldFilmPipeline },
    input: { activePointers: 3 },
    // Order is draw order: TransitionScene goes last so it sits on top of everything.
    scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, ResultsScene, OptionsScene, TransitionScene]
};

new Phaser.Game(config);
