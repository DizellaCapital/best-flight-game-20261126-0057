// The screenshot scenes behind ?shot=start|play|rush|land. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (aim at the next ring, climb or descend to
// its height, ease off the throttle near the runway), so the frame is what a
// short game really looks like and the same seed always gives the same frame.
import { COURSE, STEP } from './config.js';
import { EVENT_LANDED, EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;

/** Steer and pitch toward the next ring (or the runway when rings are done). */
function autopilot(state, low) {
  const plane = state.plane;
  const next = state.rings[state.ringIndex];
  const targetX = next ? next.x : 0;
  let targetAlt = next ? next.alt : 40;
  if (low) targetAlt = Math.min(targetAlt, 70);
  if (!next) targetAlt = 40;
  const steer = Math.max(-1, Math.min(1, (targetX - plane.x) / 120));
  const pitch = Math.max(-1, Math.min(1, (targetAlt - plane.alt) / 60));
  // Ease the throttle off on the final approach so the landing is gentle.
  const throttle = COURSE - plane.z < 500 ? -0.6 : 0.4;
  return { steer, pitch, throttle };
}

/** Run the world forward for `seconds`, steered by the autopilot. */
function fly(world, seconds, low) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const pilot = autopilot(world.state, low);
    const events = world.step(SAMPLE, pilot.steer, pilot.pitch, pilot.throttle, false);
    if (events & EVENT_OVER) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Unknown names are the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    fly(world, 9, false);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'rush') {
    fly(world, 16, true);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'land') {
    fly(world, 120, false);
    const over = world.state.landed || world.state.crashed || world.state.timedOut;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  // start: a few seconds of backdrop flight behind the title panel.
  for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, 0, 0, 0, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
