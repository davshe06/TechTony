# Tech Tony — Sysadmin Quest

A browser platformer set on the floor of a data centre, built for Anthony's 20th work anniversary.

**▶ Play: https://davshe06.github.io/TechTony/**

The queue went feral in time for the anniversary. Phishing mail, blue screens and a rogue AI
chatbot are loose on the floor. Stomp them, bank the coffee, decommission Promptbot 9000 and
reach the mainframe before the SLA expires.

## The Giant Coffee

Head-butt a supply crate and roughly one in four releases a **Giant Coffee**. It pops out,
lands and walks off at 0.8 — turning at walls but happily strolling off a ledge, so catch it
before it drops down a gap.

Catch it and Tony is **fully caffeinated for 30 seconds**: he glows, and any enemy he touches
is destroyed from any angle, no stomp required. The aura flickers over the last three seconds
as a warning.

It does not make him immortal. Exposed cabling and open gaps still end a run, and Promptbot
9000 or one of its prompt bolts will burn the charge off early instead of costing a life.
Crates that don't roll a Giant Coffee still roll the usual one-hit shield.

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` or `←` / `→` | Move |
| `Space`, `W` or `↑` | Jump — hold for height |
| `Shift` | Sprint |
| `P` | Pause |
| `Enter` | Start / restart |

Keyboard only. Three lives, a 300-second SLA, and the level restarts on a death but keeps
your coffee and bitcoin totals.

## Running it locally

No build step, no dependencies. It does need a server, because it uses ES modules:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## How it's put together

Plain HTML, CSS and ES modules over a single `<canvas>`. Simulation runs on a fixed 60 Hz
accumulator; rendering happens once per animation frame, and the two are kept apart.

| File | Role |
| --- | --- |
| `src/main.js` | bootstrap, loop, screen state machine |
| `src/engine.js` | fixed timestep, AABB tile collision, camera |
| `src/level.js` | level data, tile types, colour ramp |
| `src/entities.js` | player, enemies, boss, projectiles, pickups |
| `src/render.js` | background, tiles, hero, effects |
| `src/sprites.js` | enemy, pickup and boss pixel art |
| `src/audio.js` | WebAudio blips |
| `src/powerup.js` | the Giant Coffee and the charge it grants |
| `src/storage.js` | personal bests in localStorage |

The canvas is 960×576 backing a 320×192 logical frame at integer scale, with smoothing off.

---

Happy 20th, Anthony. From everyone who never had to open a ticket.
