# Dog Air Rescue

A small side-scrolling shoot 'em up made with **Phaser 3** and **Vite**. The cats of the city stole the puppies. Fly in and get them back.

**[Play it in your browser](https://juannisperuza.github.io/dog-air-rescue/)** (desktop or mobile)

![Gameplay](docs/gameplay.gif)

## Controls

| Action | Keys |
|---|---|
| Move | Arrows / WASD |
| Shoot | Hold X or Space (you aim up while climbing and down while diving) |
| Super | C or Shift (when the meter is full) |
| Pause | Esc / P (also pauses when the window loses focus) |
| Mute | M |

On phones and tablets: drag anywhere on the left side to move (the plane fires on its own) and tap **SUPER** for the special attack.

## Features

- **Boss fight**: Baron von Whiskers, a three-phase boss with its own attack patterns (aimed shots, bullet rings, charges and minions), a health bar and a death sequence.
- **4 enemy types with their own behaviors**: a balloon cat that weaves across the screen, a gunner that stops to aim at you, a kamikaze that telegraphs and dives, and a heavy blimp that fires in a spread. Each one dies in its own way.
- **Wave system** with formations (line, column, V, random), leading up to the boss.
- **Puppies to rescue**: they float by in bubbles; grabbing one gives points and heals you.
- **Super meter** that fills as you hit enemies and unleashes a screen-clearing bark.
- **Power-ups**: triple shot, rapid fire and a shield.
- **Combo multiplier** for chaining kills.
- **Results screen** with stats and a grade (S to C-), Cuphead style.
- **Game feel**: old-film shader, iris transitions, hit-stop, screen shake, particles, score popups and an animated HUD.
- **Synthesized sound effects** (Web Audio, no audio files) and streamed background music.
- **Pause menu and options** (music/SFX volume, film filter, screen shake), saved locally.
- **Touch controls** with a floating joystick, so it's playable on mobile.

![Menu](docs/menu.jpg)

## Technical highlights

- **Object pooling everywhere.** Bullets, enemies, enemy bullets, explosions, pickups, corpses and score popups are created once and pre-warmed when the level loads, so nothing is allocated or destroyed during play.
- **Data-driven design.** Waves (`src/config/waves.js`), enemy types (`enemyTypes.js`), player skins (`skins.js`) and tuning values (`constants.js`) are plain config objects. Designing a level means editing data, not code.
- **One enemy class, many behaviors.** All enemy types share a single class and pool. Each type plugs in a behavior (`src/entities/enemyBehaviors.js`), a small state machine with `spawn` and `update`.
- **Pausable game clock.** Gameplay timers run on the scene's own clock, which stops while paused, so waves, cooldowns and power-ups resume exactly where they were.
- **Custom WebGL post-processing.** The old-film look (grain, flicker, scratches, vignette) is a small GLSL `PostFXPipeline` applied to the camera.
- **Decoupled systems.** Entities emit events, the HUD only listens to the registry, and visual/audio feedback lives in `Effects`, so gameplay code never has to know how a hit should look or sound.
- **Streaming music.** The soundtrack plays through an `<audio>` element instead of being fully decoded by Web Audio, which would take ~160 MB of RAM for a 7-minute track.

## Asset pipeline

The art starts as sprite sheets on a flat magenta background and is processed with small Node scripts (using [sharp](https://sharp.pixelplumbing.com/)):

```
sprite sheet -> npm run slice -> individual frames -> npm run atlas -> compressed texture atlas
background art -> npm run parallax -> seamless WebP layers
```

- **`slice`** removes the magenta background (chroma key plus despill), splits the sheet into frames and aligns them on the character's body so animations don't jitter. A *connected components* mode handles sheets where effects such as muzzle flashes spill into the neighboring cell.
- **`atlas`** trims transparent space, packs the frames and quantizes the PNG to 256 colors. All 28 enemy frames fit in a single ~105 KB atlas.
- **`parallax`** keys out each layer, finds two matching columns to make it tile seamlessly (cutting between buildings where possible) and exports WebP. The four layers total 170 KB.

## Project structure

```
src/
|-- config/     tuning, skins, enemy types and wave design
|-- entities/   player, enemies and their behaviors, boss, pickups, bullets, explosions
|-- scenes/     Boot, Menu, Game (with UI on top), Pause, Options, Results, Transition
`-- systems/    waves, effects, combo, sound, music, settings, touch controls, film shader
tools/          asset pipeline scripts
```

## Run it locally

```bash
npm install
npm run dev
```

Build for production with `npm run build` (output in `dist/`).

## Credits

- Music: **"Dark Forest" by Holizna** (CC0)
- Sound effects: synthesized in code
- Code: Juan Camilo Hernández Nisperuza
