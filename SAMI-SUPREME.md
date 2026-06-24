# SAMI SUPREME

A self-contained 16-bit comedic brawler. Escape dead-end Colorado, fight (or talk) your way across 6 levels — each a real Colorado landmark — and face the twins at Maroon Bells before the road to Chicago.

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

## Art — six Colorado landmarks

Each level is a recognizable Colorado landmark, drawn fresh (no shared template): **Garden of the Gods** (red sandstone spires, balanced rock, Pikes Peak behind), **Royal Gorge Bridge** (suspension towers and cables over the gorge, a wooden plank deck), **Red Rocks Amphitheatre** (giant red monoliths and tiered seating you climb), **Great Sand Dunes** (rolling dunes under the Sangre de Cristos), **Denver Union Station** (Mile High skyline + the neon UNION STATION facade and clock), and the finale at **Maroon Bells** (the twin maroon peaks reflected in Maroon Lake, golden aspens) — the twin peaks for the twin sisters. The journey/ending still lands in Chicago. Edit any of it in the `bg0`–`bg5` functions.

**Platforming:** each landmark's scenery is now climbable with more elevation — red-rock ledges, bridge girders, a staircase of amphitheatre tiers, dune ridges, station canopies/baggage carts, and alpine boulders/logs. Higher platforms are reached by stepping up from lower ones. Tune them in `STAGE_PLATFORMS` (`fx` = position, `dy` = height above ground, `type` = which prop).

**Character portraits & blind choices:** when characters speak, a pixel-art portrait of the speaker shows in the dialogue (each boss, both twins, and Sami have their own, built in `PORTRAITS`/`portrait()`). And every dialogue border is now the *same* gold color (`DLG_BORDER`) — so a choice's appearance never tells you which option de-escalates and which secretly drops you into a fight. You have to read and decide.

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

- `[EDIT:DIALOGUE]` — every boss intro, reason, talk branch, and the twin finale script. Each talk option has `ok:true/false` (true = resolves peacefu