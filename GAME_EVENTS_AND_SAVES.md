# What happens in Aether’s Trial — Windborne

This describes the current local game, rather than planned features. Its memory-loss story is original to our fan-made adventure; it is not Genshin Impact’s canonical opening.

## The story, in order

| Stage | What you see or do | What changes |
|---|---|---|
| The opening | A wind shrine breaks. Aether fights a guardian, seals the storm to protect the village, and loses his memories as the seal takes its price. His companion finds him afterward. | A 30-second illustrated film establishes the story. Watching it from **Watch opening** does not reset your journey. |
| The overlook | You begin at Windrise Overlook with your floating companion. Follow the road toward Mondstadt. | A new journey starts at level 1 with 100 HP, two potions and the overlook already discovered. |
| Meet Lyra | Speak to Lyra in Mondstadt and accept her request to recover three wind sigils. | The quest changes from meeting Lyra to collecting sigils. |
| Explore the valley | Search six landmarks, activate waypoints, open eight valley chests and collect up to six wind sigils. | Discoveries, opened chests and collected sigils are tracked. Sigils give 5 gems and 10 XP each; new landmark discoveries give 8 XP. |
| Return to Lyra | Return after collecting at least three sigils and choose **Give the sigils**. | The quest advances. You receive 60 coins, two potions, and 35 XP. Collected sigils remain recorded in the save. |
| First trial | Enter Mondstadt Fields northeast of town. Defeat ten regular enemies and the Mitachurl; there are three trial chests. | Victory clears the first trial and unlocks entry to the northern trial. The Mitachurl has 700 HP. |
| Second trial | Enter Stormterror Ruins. Defeat fifteen regular enemies and the Storm Drake; there are two trial chests. | Victory clears the second trial. The Storm Drake has 1,200 HP. |
| The ending | The game says the winds are free: Aether still does not know his past, but has chosen to protect the valley. Select **Return to the valley**. | Both trials become complete, their rewards are saved, and free exploration continues. There is no playable memory-recovery chapter after this ending yet. |

Lyra’s quest is the intended story route. The first trial is currently accessible before finishing that quest; only the second trial is technically locked behind the first victory.

The six places are **Windrise Overlook, Mondstadt, Cider Lake, Windrise, Dawn Winery, and Stormterror Ruins**. Their layouts are simplified interpretations built for this prototype.

## Things that happen while you explore

- **Movement:** run, sprint, dash, jump, glide and move through water. Stamina supports sprinting, dashing and gliding; it recovers when you stop spending it. The camera follows the traveler.
- **Companion:** floats beside you and follows your movement. She is a visual companion, not a separately controllable fighter.
- **Residents:** nine people inhabit the valley. Oren works as a blacksmith, Mira tends the market, Tessa tends the vineyard, Nell fishes, Edda runs deliveries, Rowan patrols, Iris walks near Windrise, Alden works around the winery, and Lyra gives the main quest. Their work and routes are authored looping animations; the market is not a working buy/sell inventory system.
- **Environment:** windmills rotate, water and vegetation animate, and floating sigils and waypoint crystals move. These are visual scene updates, not events that produce a permanent log.
- **Treasure:** each valley chest gives 25 coins, 10 gems and one potion. A chest can reward you only once in the saved journey. Trial chest rewards differ by chest. Potions are capped at nine.
- **Waypoints:** discover and activate them to travel between unlocked destinations through the map. Resting at a waypoint fills HP and burst energy. Travel is unavailable inside trials.
- **Progression:** defeating enemies and completing exploration objectives grants XP. Level-ups increase maximum HP and attack power, and restore some health while you are alive. A potion restores up to 45 HP.

## Combat events

There are **24 roaming enemies in eight camps**, plus the enemies in the two trials. The six regular types have different attacks:

| Enemy | What happens | Your response |
|---|---|---|
| Elemental slime | Marks a landing zone, then leaps. | Move out of the marked zone. |
| Masked raider | Winds up a club attack. | Dash away, then attack during recovery. |
| Shield warden | Reduces physical damage from the front. | Flank it, or break its shield with Pyro. |
| Ember archer | Shows an aim line, then fires. | Sidestep after it commits to its aim. |
| Abyss weaver | Marks a spell circle before it erupts. | Leave the circle. |
| Ruin sentinel | Uses heavy cone attacks and circular slams. | Read the warning shape and escape it. |

Aether has a three-hit sword combo, a Pyro skill and an elemental burst. The Pyro skill has a five-second cooldown. The burst spends 60 energy. Pyro against a Hydro enemy causes **Vaporize for 1.5× damage**. Damage, impact effects and rewards happen through the combat system; repeated hit IDs cannot award the same damage or kill reward twice.

Both bosses enrage at half health, moving faster and attacking more often. Their visible warning periods remain. Defeated outdoor enemies stay defeated after that progress is saved. Surviving enemies’ exact positions and remaining HP are not stored between sessions.

## Where your progress is saved

**Progress is stored in the browser’s `localStorage` as one JSON snapshot, under this key:**

```text
aethers-trial-windborne-v1
```

The separate testing page `qa.html` uses `aethers-trial-windborne-v1-qa`, so its test journey does not overwrite the normal game’s save.

This storage belongs to the browser profile and the game’s **origin**: protocol, hostname and port. For example, `http://127.0.0.1:8765` and `http://127.0.0.1:8766` have separate saves; so do `localhost` and `127.0.0.1`. A query string such as `?v=characters` does not create a different origin. Use the same browser/profile and address to continue the same journey. Direct `file://` storage behavior depends on the browser and has not been verified here.

There is **no cloud sync, account, server database, telemetry event history, or built-in save export/import**. Clearing this site’s browser data removes its save. Private browsing generally does not retain that progress after the private session ends.

The source code, assets, rendered intro and presentation are ordinary files in:

```text
/Users/shivain/Desktop/space-invaders/
```

Your playthrough is **not** written into that folder or into the PowerPoint. The browser manages its own storage files internally.

## What the saved snapshot contains

| Saved | Not saved as persistent progress |
|---|---|
| Player’s horizontal position (`x`, `z`) and HP | Exact camera angle, jumping height, animation pose or stamina |
| Level, XP, coins, gems, potions and burst energy | Current damage numbers, effects, projectiles and attack cooldowns |
| Discovered landmarks and activated waypoints | NPC walking positions or the phase of environmental animations |
| IDs of opened chests and collected sigils | A chronological history of every movement, conversation or hit |
| IDs of defeated outdoor enemies | Surviving enemies’ partial damage or exact positions |
| Lyra quest stage, two trial-clear flags and completion status | A suspended mid-trial battle |

Graphics-quality and sound settings also reset on a new page load in the current build.

## When it saves, and what retry means

- **Autosave:** approximately every **12 seconds of active outdoor gameplay**. The timer does not advance while paused or inside a trial.
- **Immediate outdoor saves:** after starting/skipping a new journey’s intro, discovering a landmark, activating/resting at a waypoint, gathering a sigil, opening a chest, progressing Lyra’s dialogue, and fast travel.
- **Manual save:** outside a trial, press **Esc → Save journey**. A successful save displays “Journey saved on this device.”
- **Combat rewards and potion use outside trials:** enter the in-memory state immediately, then persist at the next autosave or another save trigger. Closing the page before that can lose those latest changes. There is no page-close save handler.
- **Entering a trial:** saves your outdoor progress first and takes an in-memory snapshot. No persistent save writes occur during the trial.
- **Retrying or abandoning a trial:** restores that entry snapshot. Loot, XP, potion spending and enemy deaths from the abandoned attempt are rolled back; the player returns with full HP.
- **Winning a trial:** the victory screen marks success in memory. **Choose “Return to the valley” to persist the victory and rewards.** Closing or refreshing on the victory screen before returning currently loses that trial’s unsaved result.
- **Outdoor defeat:** “Rise again” restores the last saved journey and refills HP.
- **New journey:** resets the current journey and overwrites the same save slot when its intro finishes or is skipped. **Continue journey** loads the saved progress instead. **Watch opening** only replays the film.

To inspect the stored snapshot, open the browser’s developer tools and look under **Application/Storage → Local Storage → the game’s address → `aethers-trial-windborne-v1`**. Labels vary by browser. No separate cloud dashboard exists.

Verified against `src3d/main.js`, `core.js`, `story.js`, `world.js`, `residents.js`, `enemy-config.js`, and `battle.js` on 15 November 2026.
