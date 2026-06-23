# SAMI SUPREME

A self-contained 16-bit comedic brawler. Escape dead-end Colorado, fight (or talk) your way across 6 stages to Chicago, and face the twins at the city limits.

Everything is in one file: **`index.html`**. No build step, no servers, no external assets — all pixel art and parallax are drawn procedurally on a canvas.

## How to run / host

- **Just open it:** double-click `index.html` (or drag it into any browser). Works offline.
- **On your phone:** put `index.html` on any static host and open the URL on your phone.
  - Drag-and-drop hosts: Netlify Drop (drop the folder), Cloudflare Pages, GitHub Pages, Vercel.
  - Or any web server, e.g. from this folder: `python3 -m http.server 8080`, then visit `http://<your-computer-ip>:8080` on the phone.
- Add it to your home screen for a fullscreen, app-like experience (it's set up as a web-app).

## Controls

**Desktop (keyboard):**
- Move: `WASD` or Arrow keys
- Jump: `Space` · Light: `J` · Heavy: `K` · Special: `L` · Dodge: `Shift` · Super: `U`
- Block: hold `Down`
- Combo: chain Light/Heavy quickly. Special needs meter (≥35). Super needs full meter.

**Platforming:** jump onto the themed scenery in each arena (benches, a semi trailer, the diner counter, hay bales, dumpsters, an overpass). They're one-way platforms — jump up through them, and **Down + Jump** to drop back through. High platforms put you out of reach of ground enemies, so jumping is now a real defensive option.

**Pause:** `Esc` / `P` on keyboard, or the ❚❚ button at the top of the screen during combat. The pause menu shows the full control list; Resume or Quit to Title.

**Mobile (touch):** on-screen joystick (left) + buttons (right): PUNCH, HEAVY, JUMP, SPEC, DODGE, SUPER. Layout works in both portrait and landscape; buttons are large and thumb-reachable.

## Intro

After the title, an opening screen lays out Sami's escape plan (the 6:05 bus, Route 36, Chicago) before the journey begins. Edit it via the `INTRO_TEXT` constant (marked `[EDIT:DIALOGUE]`).

## Art

Every battle location is its own scene, drawn fresh (no shared template): a clear-morning hometown parking lot with a chain-link dugout fence and scoreboard; a harsh-midday highway rest stop with telephone poles and a REST AREA sign; a golden-afternoon diner with an EAT neon and checker baseboard; a green-gold cornfield with a barn, silo and NEBRASKA sign; a purple dusk on the city outskirts with a lit skyline and warehouses; and a neon Chicago night with stars, a moon, a tall lit tower and wet reflective asphalt. There are gradient skies, parallax layers, a vignette, and twinkling stars in the finale. Edit any of it in the `bg0`–`bg5` functions.

## Character art

Every fighter has its own sprite kit, not just a recolor: Sami (blond ponytail + bangs, red cheek mark, denim jacket over a red tank), the Catcher (backwards cap, cage mask, chest protector, mitt), the Pitcher (cap + brim, jersey number, glove), the Shortstop (cap, ponytail, eye-black, glove), the Outfielders (sun visor + wraparound shades), the Coach (cap, belly, whistle, clipboard), the twins (matching pigtails, bows, and a heart on the jersey in pink/purple), plus mooks: a jersey Scrub, a literal angry Road Cone, and a face-painted Fan waving a foam finger. Sprites have shading, an alternating walk gait, fists on attack, and held items. Edit the looks in `drawKit` / `drawFighter`.

## Branching boss dialogue

Each of the five softball bosses now has a multi-step talk tree (in `STAGES[].talk`, marked `[EDIT:DIALOGUE]`): an opening question with several replies, where the empathetic path opens a second, deeper question before the boss stands down — and blunt or flippant replies drop you straight into the fight. There's always a "forget it — FIGHT" bail too. Options use `ok:true` (resolve peacefully, +1 peace), `to:{…}` (go deeper), or `fight:true` (drop to combat).

## The main enemies (all named)

Buck "Mitts" Delgado (Catcher), Hank "The Arm" Boyle (Pitcher), Rosa "Pivot" Nakamura (Shortstop), Cal & Earl Tuttle (Outfielders), Coach Don Pyle, and the final twins **Dot & Junie Vance** — Sami's sisters. Sami herself is a blond woman with a red mark on her cheek.

## The journey

6 stages, Colorado → Chicago, each ending in a softball-team boss: The Catcher, The Pitcher, The Shortstop, The Outfielders, The Coach, and finally **the twin sisters — Dot & Junie**, who are your own sisters.

Before each boss you choose **FIGHT** or **TALK**. The right de-escalating line lets you walk on peacefully and raises your peace count. Reach the twins with enough peace (≥3) and a softer, more emotional finale unlocks — Sami trying to *reach* them, not beat them. Everyone still gets to Chicago; the *feeling* of the ending changes (warm / mixed / cold).

## Where to edit things (open `index.html`, search these tags)

- `[EDIT:DIALOGUE]` — every boss intro, reason, talk branch, and the twin finale script. Each talk option has `ok:true/false` (true = resolves peacefully) and `r:` (the response shown).
- `[EDIT:ENEMIES]` — `ENEMY_STATS`: hp, speed, dmg, reach, attack cooldown, size, color for every mook and boss.
- `[EDIT:SPECIALS]` — `PLAYER` + `SPECIALS`: player health, walk/jump, attack damage, combo window, dodge i-frames, block reduction, meter rates, and the special/super move tuning + names.
- `[EDIT:ENDINGS]` — the three ending text variants. `{peace}` is replaced with the count.

To change the twin "warm path" requirement, search `peaceProgress>=3` in `startTwinDialogue`.

## Notes

- Tested via a headless logic simulation across the full flow: title → stages → minor combat → talk/fight branching → bosses → twin finale → endings, plus light/heavy/combo, specials, the screen-clearing super, enemy AI, blocking, and player-down retry. No runtime errors.
- All game state (stage, health, meter, peaceProgress) lives in memory for the session — refresh = new journey.
