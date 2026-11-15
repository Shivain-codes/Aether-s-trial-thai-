# Aether’s Trial — Windborne

Open **index.html** in a desktop browser with WebGL 2. The file contains the game, shaders, avatar data, textures and female narration; it does not need npm, a server, or runtime downloads to play. Direct file opening remains a manual verification item because the automated browser blocks `file://` navigation.

This is a local, fan-made 3D exploration prototype inspired by Genshin Impact. It is not an exact recreation or production-quality replacement. No cloud GPU is required or configured.

## Run locally

The ready-built `index.html` is included. For a consistent browser address and save location:

```bash
git clone https://github.com/Shivain-codes/Aether-s-trial-thai-.git
cd Aether-s-trial-thai-
python3 -m http.server 8765 --bind 127.0.0.1
```

Open **http://127.0.0.1:8765/** in a desktop browser. Keep using the same address and browser profile to retain your device save. To change the code, install Node.js 20 or newer, then run `npm ci`, `npm run build` and `npm test`.

[Game story and save behavior](GAME_EVENTS_AND_SAVES.md) · [How it was built](HOW_WE_BUILT_IT.md) · [PowerPoint](presentation/Aethers_Trial_Windborne.pptx) · [PDF](presentation/Aethers_Trial_Windborne.pdf)

## Controls

| Action | Input |
|---|---|
| Move | WASD |
| Camera | Mouse drag, left/right arrows; mouse wheel zoom |
| Sword combo | Space or click |
| Dash / sprint | Shift |
| Jump / glide | J / G while airborne |
| Pyro / burst | E / Q |
| Interact / potion | F / H |
| World map / pause | M / Escape |
| Performance overlay | F3 |

Find Lyra in Mondstadt for the wind-sigil quest. Activate waypoints with F. The two trial gates are at (-27, -40) and (65, -96); the second unlocks after the first guardian falls. Visit Dawn Winery, Windrise, Cider Lake, Mondstadt and the northern ruins. Eight furnished camps contain 24 enemies across six archetypes: elemental slimes, masked raiders, shield wardens, archers, mages and ruin sentinels. Eight residents perform work routines, with Lyra as the ninth townsperson.

Saves are stored by the browser on this device. Trial retry restores the entry snapshot. Choose Continue to retain a saved journey. Begin starts a fresh journey with a 30-second, four-scene illustrated opening film: a wind shrine erupts, Aether duels its guardian, he seals the breach at the cost of his memories, and he awakens beside his companion. The film includes a conversational female voice generated locally with Kokoro, music, synchronized subtitles, mute, pause/resume and skip controls. Continue and Retry bypass it. **Watch opening** replays it from the title screen without changing your journey. The QA page uses a separate save key.

## What kind of game is this?

**Aether’s Trial: Windborne** is a single-player, third-person fantasy action RPG prototype. Explore Windrise Valley, meet its people, discover treasure and wind sigils, and fight elemental enemies with sword combos, dodges and Pyro abilities. Face two ancient guardians and restore the valley’s winds.

The title and pause menus include **About the game**. See `GAME_DESCRIPTION.md` for short and full descriptions.

## Story and presentation

Open **The story of Windrise** from the title screen or pause menu. Aether sacrifices his memories to seal a broken wind shrine and protect the village. His companion finds him afterward, unaware of what happened. He helps Lyra reconnect the wind shrines and faces two guardians to protect the valley. This is the prototype’s original fan-made backstory, not official Genshin Impact canon.

The `presentation/` folder contains an editable 11-slide PowerPoint, a PDF, and `STORY.md`. The story treatment extends the playable quest context; fully acted story cinematics are not implemented.

## Development

- `npm ci` — install pinned build dependencies.
- `npm run build` — rebuild the self-contained 3D `index.html` from `src3d/`.
- `npm test` — 51 simulation, movement, enemy-behavior, intro-player and packaging checks.
- `npm run build:qa` — build `qa.html`, a separate browser regression harness with controlled fixtures.
- `npm run test:legacy` — run the preserved 2D game's tests.
- `npm run build:legacy` — rebuild `legacy-2d.html`; it will not overwrite the 3D game.

The preserved 2D game remains in `legacy-2d.html` and `src/`. Historical backups remain local and are excluded from this repository.

See `ENGINEERING_REPORT.md` for verification and limitations, and `CREDITS.md` for asset sources and licenses.

For a step-by-step explanation of the real technology and development process, see [HOW_WE_BUILT_IT.md](HOW_WE_BUILT_IT.md).

## Movement and combat update

Character movement uses smooth acceleration and braking, continuous stride timing, blended rig poses, turn lean and softer landings. Jump input has a 120 ms buffer and 100 ms edge grace period. Enemies have increased health and damage, faster pursuit and shorter cooldowns while keeping their visible attack warnings. The Mitachurl has 700 HP and the Storm Drake 1,200 HP; both enrage below half health.

## Character refinement

The traveler now has layered golden locks, amber irises, a slimmer braided tail, cropped black-and-gold clothing, fitted limb armor, ivory cloak panels and a new sword. The floating companion has a white bob, blue eyes, rose-gold crown, star ornament and animated constellation cape. These remain authored fan-made interpretations. CPU studio model previews are in `shots/characters/`; they use the actual posed game meshes but do not reproduce browser lighting.

See [GAME_EVENTS_AND_SAVES.md](GAME_EVENTS_AND_SAVES.md) for the full sequence of story and gameplay events, rewards, save location and trial persistence rules.
