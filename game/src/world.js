// The game's rules and state, with no drawing and no browser in it: the
// plane flying a seeded island course, gold rings in order, mountains and
// balloons to avoid, and a runway landing at the end. step() advances one
// fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound. Nothing here allocates
// after createWorld returns.
import { COURSE, LAND_POINTS, PLANE, RING_COUNT, RING_POINTS, TIME_LIMIT } from './config.js';

export const EVENT_RING = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_LANDED = 8;
export const EVENT_TIMEOUT = 16;

const RING_RADIUS = 55;
const MOUNTAIN_CLEAR = 46;

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createWorld(random) {
  const plane = { x: 0, z: 0, alt: 120, speed: PLANE.baseSpeed, throttle: 0.55, bank: 0 };
  const rings = [];
  const islands = [];
  const balloons = [];
  const clouds = [];
  const state = {
    plane,
    rings,
    islands,
    balloons,
    clouds,
    score: 0,
    ringIndex: 0,
    ringsTotal: RING_COUNT,
    timeLeft: TIME_LIMIT,
    elapsed: 0,
    landed: false,
    crashed: false,
    timedOut: false,
    message: '',
    messageTimer: 0,
  };

  function buildCourse() {
    rings.length = 0;
    islands.length = 0;
    balloons.length = 0;
    clouds.length = 0;
    // Rings wander across the course, alternating sides, climbing and diving.
    let rx = 0;
    let ra = 140;
    for (let i = 0; i < RING_COUNT; i += 1) {
      rx = clamp(rx + (random() * 2 - 1) * 260, -380, 380);
      ra = clamp(ra + (random() * 2 - 1) * 110, 70, 300);
      rings.push({ z: 420 + i * 560, x: rx, alt: ra, passed: false, missed: false });
    }
    // Islands line the course: a big one with a town, a volcanic peak, a low
    // green atoll, and so on — each placed off the ring line so the flight
    // path stays flyable but the peaks stay threatening.
    const specs = [
      { z: 700, x: -430, size: 210, peak: 190, town: true },
      { z: 1250, x: 420, size: 260, peak: 260, town: false },
      { z: 1800, x: -380, size: 170, peak: 120, town: true },
      { z: 2350, x: 430, size: 300, peak: 330, town: false },
      { z: 2950, x: -450, size: 190, peak: 150, town: false },
      { z: 3500, x: 400, size: 240, peak: 210, town: true },
      { z: 4100, x: -420, size: 280, peak: 290, town: false },
      { z: 4650, x: 380, size: 200, peak: 140, town: true },
    ];
    for (const spec of specs) {
      const jitter = (random() * 2 - 1) * 40;
      islands.push({ z: spec.z, x: spec.x + jitter, size: spec.size, peak: spec.peak, town: spec.town, seed: random() });
    }
    // Balloons drift near the ring line: slow, bright, and in the way.
    const balloonZ = [950, 1650, 2150, 2750, 3300, 3950, 4450];
    for (const z of balloonZ) {
      balloons.push({
        z,
        x: (random() * 2 - 1) * 320,
        alt: 90 + random() * 190,
        bob: random() * Math.PI * 2,
        drift: (random() * 2 - 1) * 12,
      });
    }
    for (let i = 0; i < 9; i += 1) {
      clouds.push({ x: (random() * 2 - 1) * 900, alt: 260 + random() * 160, z: random() * COURSE, size: 60 + random() * 90 });
    }
  }

  function reset() {
    plane.x = 0;
    plane.z = 0;
    plane.alt = 120;
    plane.speed = PLANE.baseSpeed;
    plane.throttle = 0.55;
    plane.bank = 0;
    state.score = 0;
    state.ringIndex = 0;
    state.timeLeft = TIME_LIMIT;
    state.elapsed = 0;
    state.landed = false;
    state.crashed = false;
    state.timedOut = false;
    state.message = '';
    state.messageTimer = 0;
    buildCourse();
  }

  function setMessage(text) {
    state.message = text;
    state.messageTimer = 2.2;
  }

  /**
   * One fixed step. steer -1..1, pitch -1..1, throttle -1..1. With `harmless`
   * set (the title screen's backdrop) the plane cruises but nothing scores
   * and nothing can crash it.
   */
  function step(dt, steer, pitch, throttle, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (!harmless) state.timeLeft -= dt;

    plane.throttle = clamp(plane.throttle + throttle * dt * 0.8, 0, 1);
    plane.speed = PLANE.baseSpeed + plane.throttle * PLANE.throttleBoost;
    plane.x = clamp(plane.x + steer * PLANE.steerSpeed * dt, PLANE.minX, PLANE.maxX);
    plane.alt = clamp(plane.alt + pitch * PLANE.climbSpeed * dt, PLANE.minAlt, PLANE.maxAlt);
    plane.z += plane.speed * dt;
    const targetBank = clamp(steer * 0.5, -0.5, 0.5);
    plane.bank += (targetBank - plane.bank) * Math.min(1, dt * 6);

    // Rings: judged the moment the plane's nose crosses the ring's plane.
    // (Not on the title backdrop: harmless flights score nothing.)
    if (!harmless) {
      for (let i = 0; i < rings.length; i += 1) {
        const ring = rings[i];
        if (ring.passed || ring.missed) continue;
        if (plane.z < ring.z) break;
        const dx = plane.x - ring.x;
        const da = plane.alt - ring.alt;
        const dist = Math.sqrt(dx * dx + da * da);
        if (dist <= RING_RADIUS) {
          ring.passed = true;
          state.ringIndex += 1;
          const bonus = Math.round(state.timeLeft);
          state.score += RING_POINTS + bonus;
          events |= EVENT_RING;
          setMessage(`Ring ${state.ringIndex}/${RING_COUNT} — +${RING_POINTS + bonus}`);
        } else {
          ring.missed = true;
          state.ringIndex += 1;
          setMessage('Ring missed — keep flying');
        }
      }
    }

    if (!harmless) {
      // Mountains: a peak is a cone; flying into its slope ends the flight.
      for (const island of islands) {
        const dz = plane.z - island.z;
        if (dz < -MOUNTAIN_CLEAR || dz > MOUNTAIN_CLEAR) continue;
        const dx = Math.abs(plane.x - island.x);
        const slope = 1 - dx / (island.size * 0.55);
        if (slope > 0 && plane.alt < island.peak * slope) {
          state.crashed = true;
          events |= EVENT_HIT | EVENT_OVER;
          setMessage('Crashed into the mountain!');
          return events;
        }
      }
      // Balloons: a soft obstacle with a hard envelope.
      for (const balloon of balloons) {
        const dz = Math.abs(plane.z - balloon.z);
        if (dz > 26) continue;
        const dx = Math.abs(plane.x - balloon.x);
        const da = Math.abs(plane.alt - balloon.alt);
        if (dx < 34 && da < 34) {
          state.crashed = true;
          events |= EVENT_HIT | EVENT_OVER;
          setMessage('Hit a balloon!');
          return events;
        }
      }
      // Sea level: dipping a wing in the water ends the flight.
      if (plane.alt <= PLANE.minAlt + 0.5 && plane.z > 60) {
        state.crashed = true;
        events |= EVENT_HIT | EVENT_OVER;
        setMessage('Ditched in the sea!');
        return events;
      }
      // The runway: arrive low, slow-ish and centred to land.
      if (plane.z >= COURSE) {
        if (Math.abs(plane.x) < 90 && plane.alt < 70) {
          state.landed = true;
          state.score += LAND_POINTS + Math.round(state.timeLeft);
          events |= EVENT_LANDED | EVENT_OVER;
          setMessage(`Landed! +${LAND_POINTS + Math.round(state.timeLeft)}`);
        } else {
          state.crashed = true;
          events |= EVENT_HIT | EVENT_OVER;
          setMessage('Overshot the runway!');
        }
        return events;
      }
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.timedOut = true;
        events |= EVENT_TIMEOUT | EVENT_OVER;
        setMessage('Out of time!');
        return events;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
