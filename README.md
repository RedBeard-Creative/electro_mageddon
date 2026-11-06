# ⚡ ELECTROMAGEDDON — Prototype 01: Darkroom

A small, playable **3D first-person action prototype** built with Three.js and Vite. This is the beginning of Electromageddon—not the full robot-apocalypse adventure yet.

**[▶ Play / edit in StackBlitz](https://stackblitz.com/~/github.com/RedBeard-Creative/electro_mageddon)**

## What's in the first version?

- A dark industrial warehouse with metal crates, conduits, lighting, and a hanging punching bag.
- **Free mouse-look:** move the mouse to turn and look up/down. **No click is required to start turning or moving.** For unlimited rotation, there's an optional **LOCK MOUSE** button (Esc unlocks).
- **Arrow-key movement:** Up = forward where you're looking, Down = backward, Left/Right = sideways strafe. WASD also works.
- **Shift:** sprint.
- A real 3D robot-styled first-person **mechanical forearm and fist** that thrusts forward and retracts when you punch.
- **F**, Space, the on-screen PUNCH button, or left-click in the 3D scene to punch.
- A hanging heavy bag that actually **swings with a damped physics response** after a well-aimed punch.
- **L:** switch the forward-facing spotlight flashlight on/off.
- Hit counter and small combat HUD.
- Room collision, crate collision and punching bag collision so you cannot run through solid objects.
- Procedural textures and models, with **no external character-model download required**. A full third-person character body and enemy AI will come later.

## How to play

1. Open the StackBlitz preview in its own tab for the best mouse experience.
2. Move your mouse to look around—no need to click inside the game.
3. Hold **↑** to move toward the punching bag; use **←/→** to strafe around it.
4. Aim at the bag, get close, and press **F** to punch.
5. Watch the bag sway and the hit count increase. You can turn your flashlight off with **L** for an extra challenge.

The bag is about nine world units straight ahead of the starting position; you must approach it before punching can register. If the cursor reaches the edge of the browser window, use the optional **LOCK MOUSE** button for continuous turning.

## How to run locally

Requires a recent version of Node.js.

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

```bash
npm test
npm run build
```

The game needs WebGL and internet the first time the Three.js dependency is installed. All in-game models and textures are generated locally; there are no model-CDN dependencies at runtime.

## Version scope

This build intentionally **does not** include the SkyVault, story campaign, character customization, salvage or ScrapForge. The goal is to establish working first-person controls, believable movement, a 3D scene, and punch feedback before adding more systems.

The gameplay math lives in `src/gameplay.js`, independent of the 3D renderer. `tests/gameplay.test.js` contains automated tests for movement, camera controls, bag hits, swing damping, collision and the flashlight. Scene rendering lives in `src/main.js`.

### Notes on testing

Gameplay rules are verified using automated unit tests, but the WebGL appearance and feel still need to be checked in a real browser. Some browsers cannot provide unlimited mouse rotation without a pointer-lock gesture; free-mouse look works without that gesture but stops when the cursor reaches the screen edge.

## Project

- Game: **Electromageddon**
- Original working concept: **VOLTBOUND**
- Repository: `RedBeard-Creative/electro_mageddon`
- Current milestone: **v0.1 — Darkroom with a punching bag**
