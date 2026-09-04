# Tech Tony — Sysadmin Quest

A browser platformer set on the floor of a data centre, built for Anthony's 20th work anniversary.

**▶ Play: https://davshe06.github.io/TechTony/**

The queue went feral in time for the anniversary. Phishing mail, blue screens and a rogue AI
chatbot are loose on the floor. Stomp them, bank the coffee, decommission Promptbot 9000 and
reach the mainframe before the SLA expires.

## Dying

A new life resumes at the nearest standable ground to where you fell, with three seconds of
invulnerability — not back at the start. The floor keeps its state too: enemies you cleared
stay cleared, crates you opened stay open, and damage dealt to the boss sticks. Coffee and
bitcoin totals carry over as before. You get three lives, and can hold up to five.

## Crate drops

Head-butt a supply crate and one roll decides what comes out: a quarter of the time a
**Giant Coffee**, a quarter of the time a **spare-capacity drive** worth an extra life, and
otherwise the old one-hit shield at 30% of what's left. Both drops walk, so both can be lost.

### The Giant Coffee

Roughly one in four crates releases a **Giant Coffee**. It pops out,
lands and walks off at 0.8 — turning at walls but happily strolling off a ledge, so catch it
before it drops down a gap.

Catch it and Tony is **fully caffeinated for 30 seconds**: he glows, and any enemy he touches
is destroyed from any angle, no stomp required. The aura flickers over the last three seconds
as a warning.

It does not make him immortal. Exposed cabling and open gaps still end a run, and Promptbot
9000 or one of its prompt bolts will burn the charge off early instead of costing a life.
The one-hit shield absorbs a hit from an enemy *or* from the floor cabling, launching you
clear of the run either way.

## Soundtrack

The score is generated, not recorded: a small sequencer schedules square, triangle and noise
voices straight onto the audio clock, so the whole soundtrack adds no download at all. There
is a driving level theme and a faster, more chromatic one that takes over when Promptbot 9000
wakes up. `M` or the button under the canvas mutes it, and the choice is remembered.

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` or `←` / `→` | Move |
| `Space`, `W` or `↑` | Jump — hold for height |
| `Shift` | Sprint |
| `P` | Pause |
| `M` | Mute / unmute the music |

Pause, music and a volume slider sit under the canvas.

On a touchscreen, on-screen pads fade in at the corners of the play area — move on the left,
jump and sprint on the right. They appear on the first touch and disappear again the moment
you use a real key, so a laptop with a touchscreen never gets stuck with them.
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
| `src/music.js` | the generated chiptune score |
| `src/powerup.js` | the Giant Coffee and the charge it grants |
| `src/touch.js` | on-screen controls for touch devices |
| `src/storage.js` | personal bests, volume and mute in localStorage |

The canvas is 960×576 backing a 320×192 logical frame at integer scale, with smoothing off.

---

Happy 20th, Anthony. From everyone who never had to open a ticket.
