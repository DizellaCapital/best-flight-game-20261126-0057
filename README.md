# Meridian Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/DizellaCapital/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/DizellaCapital/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A chase-view flight game for the [Make the best flight game](https://make.fun/bounty/best-flight-game-20261126-0057) bounty on make.fun.

## Play

Fly a small prop plane over an island chain: thread eight gold rings in order, dodge volcanic peaks and drifting balloons, and land on the runway at the end of the course before the 150-second clock runs out. Each ring scores 100 points plus a time bonus; a clean landing scores 250 plus the time bonus.

- **Steer:** ← → or A / D (or drag with the mouse)
- **Climb / descend:** ↑ ↓ or W / S
- **Throttle:** Q / E (Shift also throttles up)
- **Pause:** P or Esc · **Mute:** M · **Start / restart:** Space or click

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no libraries, no network requests — plain canvas 2D and WebAudio synth, all in `game/`.

## Screenshots

`?shot=start|play|rush|land&seed=7` stages the four scenes (title, mid-flight ring run, low rush, runway landing) deterministically from the real game rules.
