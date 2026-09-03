# Tech Tony — Sysadmin Quest

A browser platformer set on the floor of a data centre, built for Anthony's 20th work anniversary.

**▶ Play: https://davshe06.github.io/TechTony/**

The queue went feral in time for the anniversary. Phishing mail, blue screens and a rogue AI
chatbot are loose on the floor. Stomp them, bank the coffee, decommission Promptbot 9000 and
reach the mainframe before the SLA expires.

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
| `src/storage.js` | personal bests in localStorage |

The canvas is 960×576 backing a 320×192 logical frame at integer scale, with smoothing off.

---

Happy 20th, Anthony. From everyone who never had to open a ticket.
