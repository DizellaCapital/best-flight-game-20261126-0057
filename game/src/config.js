// Meridian Run — every tuning number and colour in one place.
// The playfield is a fixed 1280x480 logical area; the renderer scales it to
// the window, so no rule depends on the screen size.
export const FIELD = { width: 1280, height: 480 };

/** Fixed simulation step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** Length of the course in world units; the runway sits at its end. */
export const COURSE = 5200;
/** Seconds on the clock when a flight starts. */
export const TIME_LIMIT = 150;
/** Rings to fly through, in order, before the runway. */
export const RING_COUNT = 8;
/** Points for a clean ring, plus a bonus for time left on the clock. */
export const RING_POINTS = 100;
export const LAND_POINTS = 250;

export const PLANE = {
  /** Lateral speed across the course, world units per second at full steer. */
  steerSpeed: 300,
  /** Climb / descend speed, world units per second at full pitch. */
  climbSpeed: 110,
  /** Lowest and highest the plane may fly (0 = sea level). */
  minAlt: 8,
  maxAlt: 420,
  /** Lateral limits of the course. */
  minX: -620,
  maxX: 620,
  /** Base forward speed; throttle adds up to throttleBoost. */
  baseSpeed: 150,
  throttleBoost: 90,
};

export const PALETTE = {
  skyTop: '#2f6fb8',
  skyMid: '#7db4e2',
  skyLow: '#cfe8f5',
  seaDeep: '#14507e',
  sea: '#1f6da8',
  seaLight: '#3f93c9',
  sand: '#e8d49a',
  grass: '#4f9e4d',
  grassDark: '#357a38',
  rock: '#6e6a63',
  snow: '#f4f7f8',
  town: '#f3e2c7',
  roof: '#c65b3f',
  runway: '#3a3f46',
  runwayLine: '#f5f0dc',
  ring: '#f2c94c',
  ringGlow: '#ffe98a',
  balloon: '#e5534b',
  balloonBasket: '#7a5230',
  planeBody: '#e8edf2',
  planeWing: '#d2453a',
  planeTrim: '#1d4e89',
  glass: '#9fd4ef',
  panel: '#101820',
  panelEdge: '#2c3e50',
  text: '#eef4f8',
  muted: '#a9c2d4',
  good: '#7ee081',
  warn: '#ffb347',
  danger: '#ff6b5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'meridian-run.best';
