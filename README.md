# ⚡ ELECTROMAGEDDON — Prototype 03: Animated Robot Sparring

A small, playable **3D first-person action prototype** built with Three.js and Vite. This is the beginning of Electromageddon—not the full robot-apocalypse adventure yet.

**[▶ Play / edit in StackBlitz](https://stackblitz.com/~/github.com/RedBeard-Creative/electro_mageddon)**

## Version 0.2 changes

- **Punching bag direction fixed:** the bottom of the bag now travels *away* from the character when struck, whether you stand in front, behind, left, or right. The swinging pendulum still damps naturally.
- **Bigger, brighter flashlight:** spotlight intensity increased from 94 to 235, range from 24 to 36 world units, and half-angle from 0.33 to 0.57 radians. The visible beam is wider and longer, while the rest of the room stays dark.
- **25 gameplay checks passed** including all-direction bag impulse tests and flashlight parameter checks. Graphics appearance still needs direct inspection in a browser.

## Version 0.3 — The first actual character models

- **Actual rigged player body:** Uses [Xbot.glb](https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Xbot.glb), a neutral realistic humanoid included with the three.js examples. The character has idle/walk/run clips and follows your position. In first person, its upper body is clipped so it doesn't block the camera; you can see your legs by looking down. **Press V** to briefly switch to an over-the-shoulder view and inspect your whole character; press V again to return to first person.
- **New robot target AETHER-02:** Uses the [CC0 AETHER-02 model](https://github.com/RamonLinares/atlas-09/blob/main/public/models/aether-02.glb) from RamonLinares/atlas-09. This is a fully rigged non-cartoonish armored robot with a baked `Walk` animation. It now walks a small patrol around the training room. You can walk up and hit it.
- **Robot hit feedback:** Punching AETHER-02 within reach makes it flash bright red for about **0.85 seconds**, pause briefly, and physically move back about a third of a metre. The robot recovers and keeps walking. After eight hits, it briefly deactivates and resets so you can practice again.
- **Alternating punches:** Every new punch alternates between the *right and left* mechanical first-person arms, including missed punches, with a forward thrust and recovery animation.
- The original swinging punching bag is still in the room as a **secondary practice target**.
- The dark room, enlarged flashlight, free mouse-look, arrow-key strafing, running and physics remain intact.
- The HUD reports whether the real player and enemy GLBs loaded or whether a safe fallback is active. Models are downloaded from public GitHub-hosted asset URLs when playing online; no account is required.

### Controls

| Control | Action |
| --- | --- |
| Move mouse | Free first-person look; no click needed |
| ↑ / ↓ | Forward / backward relative to character viewpoint |
| ← / → | Strafe left / right |
| W / A / S / D | Alternative movement |
| F / Space / PUNCH button | Alternating left and right arm punches |
| V | Inspect complete player character; V again to return to first person |
| L | Toggle flashlight |
| Shift | Sprint |
| LOCK MOUSE | Optional unlimited mouse turning (Esc unlocks) |

### How to try the new robot

1. Launch the preview in a separate browser tab so all controls work.
2. Watch the model status labels under the objective. They should change to **PLAYER: XBOT HUMANOID LOADED** and **ENEMY: AETHER-02 LOADED** when the assets finish downloading.
3. Move toward the walking robot, track it with the mouse and press **F** when you're near it. The crosshair highlights when you are in punch range.
4. Watch its armor flash red, watch it stagger backward, and punch again to see the **other arm** animate.
5. Press **V** to see the rigged model of your full character, then V again for first-person movement.

## What remains from v0.2

- Punching the heavy hanging bag pushes it away in the direction you strike it; it behaves like a damped pendulum.
- The strong flashlight beam is wider and longer than in v0.1.

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

The game needs WebGL and internet the first time the Three.js dependency is installed. The room and fallback robots are generated locally. **Actual Xbot and AETHER-02 GLB assets require an internet connection during play** (served from public GitHub URLs). If unavailable, the game shows detailed articulated fallback figures instead of failing.

## Version scope

This build intentionally **does not** include the SkyVault, story campaign, character customization, salvage or ScrapForge. The goal is to establish working first-person controls, believable movement, a 3D scene, and punch feedback before adding more systems.

The gameplay math lives in `src/gameplay.js`, independent of the renderer. `tests/gameplay.test.js` contains **34 automated gameplay tests** covering movement, controls, alternating punches, robot patrol, red hit-feedback timing, recoil, reactivation, bag physics, collisions and the flashlight. The renderer is in `src/main.js`, with GLB loading, materials, walking animation mixer and safe fallbacks in `src/characters.js`.

### Notes on testing

Gameplay rules are verified using automated unit tests, but the WebGL appearance and feel still need to be checked in a real browser. Some browsers cannot provide unlimited mouse rotation without a pointer-lock gesture; free-mouse look works without that gesture but stops when the cursor reaches the screen edge.

## Project

- Game: **Electromageddon**
- Original working concept: **VOLTBOUND**
- Repository: `RedBeard-Creative/electro_mageddon`
- Current milestone: **v0.3 — Rigged player body, animated AETHER-02 robot, alternating fists and hit feedback**
