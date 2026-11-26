// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x480 playfield is scaled to fit the window and centred. A chase
// view: sky and sea, a chain of islands projected in pseudo-3D, gold rings
// ahead, the runway at the end of the course, the plane in frame at the
// bottom centre, and a lit instrument HUD across the top and bottom.
import { COURSE, FIELD, FONT, PALETTE, RING_COUNT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const VIEW_DEPTH = 1500;

function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  function horizonY(state) {
    // Higher altitude lifts the horizon line; pitching down drops it.
    return 168 - state.plane.alt * 0.14;
  }

  function drawSky(state) {
    const hy = horizonY(state);
    const grad = context.createLinearGradient(0, 0, 0, hy + 40);
    grad.addColorStop(0, PALETTE.skyTop);
    grad.addColorStop(0.55, PALETTE.skyMid);
    grad.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, hy + 40);
    // Sun, upper right, with a soft halo.
    const sunX = 1060;
    const sunY = 62;
    const halo = context.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
    halo.addColorStop(0, 'rgba(255, 244, 200, 0.9)');
    halo.addColorStop(1, 'rgba(255, 244, 200, 0)');
    context.fillStyle = halo;
    context.fillRect(sunX - 90, sunY - 90, 180, 180);
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.arc(sunX, sunY, 26, 0, Math.PI * 2);
    context.fill();
    // Sea below the horizon, with a lighter band at the horizon.
    const sea = context.createLinearGradient(0, hy, 0, FIELD.height);
    sea.addColorStop(0, PALETTE.seaLight);
    sea.addColorStop(0.35, PALETTE.sea);
    sea.addColorStop(1, PALETTE.seaDeep);
    context.fillStyle = sea;
    context.fillRect(0, hy, FIELD.width, FIELD.height - hy);
    context.fillStyle = 'rgba(255,255,255,0.25)';
    context.fillRect(0, hy, FIELD.width, 2);
  }

  function drawClouds(state) {
    const hy = horizonY(state);
    for (const cloud of state.clouds) {
      const d = cloud.z - state.plane.z;
      if (d < -80 || d > VIEW_DEPTH) continue;
      const t = 1 - d / VIEW_DEPTH;
      const sx = FIELD.width / 2 + (cloud.x - state.plane.x) * (0.12 + 0.9 * t);
      const sy = Math.max(72, hy - 40 - (cloud.alt - state.plane.alt) * (0.1 + 0.5 * t));
      const s = cloud.size * (0.2 + 0.9 * t);
      if (sx < -s || sx > FIELD.width + s) continue;
      context.fillStyle = 'rgba(255,255,255,0.85)';
      context.beginPath();
      context.ellipse(sx, sy, s, s * 0.32, 0, 0, Math.PI * 2);
      context.ellipse(sx - s * 0.5, sy + s * 0.08, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
      context.ellipse(sx + s * 0.5, sy + s * 0.08, s * 0.6, s * 0.24, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawIsland(state, island) {
    const hy = horizonY(state);
    const d = island.z - state.plane.z;
    if (d < -120 || d > VIEW_DEPTH) return;
    const t = clamp(1 - d / VIEW_DEPTH, 0.04, 1);
    const sx = FIELD.width / 2 + (island.x - state.plane.x) * (0.22 + 1.05 * t);
    const baseY = hy + 26 + 190 * t;
    const rx = island.size * (0.14 + 0.85 * t);
    const ry = rx * 0.30;
    if (sx < -rx - 40 || sx > FIELD.width + rx + 40) return;
    // Sand rim, then green body.
    context.fillStyle = PALETTE.sand;
    context.beginPath();
    context.ellipse(sx, baseY, rx * 1.08, ry * 1.25, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = island.town ? PALETTE.grass : PALETTE.grassDark;
    context.beginPath();
    context.ellipse(sx, baseY - ry * 0.2, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
    // The mountain: a rock cone with a snow cap.
    const peakH = island.peak * (0.25 + 1.15 * t);
    const peakW = rx * 0.62;
    context.fillStyle = PALETTE.rock;
    context.beginPath();
    context.moveTo(sx - peakW, baseY - ry * 0.2);
    context.lineTo(sx, baseY - ry * 0.2 - peakH);
    context.lineTo(sx + peakW, baseY - ry * 0.2);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.snow;
    context.beginPath();
    context.moveTo(sx - peakW * 0.34, baseY - ry * 0.2 - peakH * 0.66);
    context.lineTo(sx, baseY - ry * 0.2 - peakH);
    context.lineTo(sx + peakW * 0.34, baseY - ry * 0.2 - peakH * 0.66);
    context.lineTo(sx + peakW * 0.16, baseY - ry * 0.2 - peakH * 0.52);
    context.lineTo(sx - peakW * 0.16, baseY - ry * 0.2 - peakH * 0.52);
    context.closePath();
    context.fill();
    // A small town: pale walls and red roofs along the shore.
    if (island.town) {
      const n = 5;
      for (let i = 0; i < n; i += 1) {
        const hx = sx - rx * 0.7 + (i * rx * 1.4) / (n - 1);
        const hw = Math.max(4, rx * 0.09);
        const hh = Math.max(5, rx * 0.11);
        context.fillStyle = PALETTE.town;
        context.fillRect(hx - hw / 2, baseY - ry * 0.3 - hh, hw, hh);
        context.fillStyle = PALETTE.roof;
        context.beginPath();
        context.moveTo(hx - hw / 2 - 1, baseY - ry * 0.3 - hh);
        context.lineTo(hx, baseY - ry * 0.3 - hh - hh * 0.55);
        context.lineTo(hx + hw / 2 + 1, baseY - ry * 0.3 - hh);
        context.closePath();
        context.fill();
      }
    }
  }

  function drawRunway(state) {
    const hy = horizonY(state);
    const d = COURSE - state.plane.z;
    if (d < -60 || d > VIEW_DEPTH) return;
    const t = clamp(1 - d / VIEW_DEPTH, 0.05, 1);
    const sx = FIELD.width / 2 - state.plane.x * (0.22 + 1.05 * t);
    const baseY = hy + 26 + 190 * t;
    const w = Math.max(8, 110 * t);
    const len = Math.max(12, 240 * t);
    // A flat island carries the strip, so the runway reads as a destination.
    context.fillStyle = PALETTE.sand;
    context.beginPath();
    context.ellipse(sx, baseY, w * 1.5, w * 0.42, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.grass;
    context.beginPath();
    context.ellipse(sx, baseY - 2, w * 1.35, w * 0.36, 0, 0, Math.PI * 2);
    context.fill();
    // The strip itself: a trapezoid, narrow at the far end by the horizon
    // and wide at the near end, so it reads as a runway from any distance.
    const topY = baseY - len;
    const botY = Math.min(FIELD.height - 4, baseY + 30 + 90 * t);
    const topW = Math.max(3, w * 0.45);
    const botW = Math.max(6, w * 1.5);
    context.fillStyle = PALETTE.runway;
    context.beginPath();
    context.moveTo(sx - topW, topY);
    context.lineTo(sx + topW, topY);
    context.lineTo(sx + botW, botY);
    context.lineTo(sx - botW, botY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.runwayLine;
    const dashes = 5;
    for (let i = 0; i < dashes; i += 1) {
      const frac = i / (dashes - 1);
      const dy = topY + frac * (botY - topY);
      const dw = topW + frac * (botW - topW);
      context.fillRect(sx - dw * 0.06, dy, dw * 0.12, Math.max(2, (botY - topY) * 0.06));
    }
    text('RUNWAY', sx, topY - 8, Math.max(11, 15 * t + 6), PALETTE.text, 'center');
  }

  function drawRing(state, ring) {
    const hy = horizonY(state);
    const d = ring.z - state.plane.z;
    if (d < -30 || d > VIEW_DEPTH) return;
    const t = clamp(1 - d / VIEW_DEPTH, 0.05, 1);
    const sx = FIELD.width / 2 + (ring.x - state.plane.x) * (0.3 + 1.25 * t);
    const sy = hy - (ring.alt - state.plane.alt) * (0.35 + 1.05 * t) - 24 * t;
    const r = 14 + 62 * t;
    if (sx < -r - 20 || sx > FIELD.width + r + 20 || sy < -r || sy > FIELD.height + r) return;
    if (ring.passed) return;
    context.lineWidth = Math.max(3, 7 * t + 2);
    context.strokeStyle = ring.missed ? 'rgba(160,170,180,0.7)' : PALETTE.ringGlow;
    context.beginPath();
    context.arc(sx, sy, r, 0, Math.PI * 2);
    context.stroke();
    context.lineWidth = Math.max(2, 4 * t + 1);
    context.strokeStyle = ring.missed ? '#8b93a3' : PALETTE.ring;
    context.beginPath();
    context.arc(sx, sy, r, 0, Math.PI * 2);
    context.stroke();
    if (!ring.missed && t > 0.45) {
      text('RING', sx, sy - r - 8, 13, PALETTE.ringGlow, 'center');
    }
  }

  function drawBalloon(state, balloon) {
    const hy = horizonY(state);
    const d = balloon.z - state.plane.z;
    if (d < -40 || d > VIEW_DEPTH) return;
    const t = clamp(1 - d / VIEW_DEPTH, 0.05, 1);
    const bob = Math.sin(state.elapsed * 1.4 + balloon.bob) * 6 * t;
    const sx = FIELD.width / 2 + (balloon.x - state.plane.x) * (0.3 + 1.25 * t);
    const sy = hy - (balloon.alt - state.plane.alt) * (0.35 + 1.05 * t) + bob;
    const r = 10 + 26 * t;
    if (sx < -r - 20 || sx > FIELD.width + r + 20) return;
    context.fillStyle = PALETTE.balloon;
    context.beginPath();
    context.arc(sx, sy, r, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.35)';
    context.beginPath();
    context.arc(sx - r * 0.3, sy - r * 0.3, r * 0.4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#5a4632';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(sx - r * 0.6, sy + r * 0.7);
    context.lineTo(sx, sy + r * 1.5);
    context.moveTo(sx + r * 0.6, sy + r * 0.7);
    context.lineTo(sx, sy + r * 1.5);
    context.stroke();
    context.fillStyle = PALETTE.balloonBasket;
    context.fillRect(sx - r * 0.28, sy + r * 1.5, r * 0.56, r * 0.5);
  }

  function drawPlane(state) {
    const plane = state.plane;
    const cx = FIELD.width / 2;
    const cy = 392;
    context.save();
    context.translate(cx, cy);
    context.rotate(plane.bank);
    // Shadow on the sea far below the plane.
    context.fillStyle = 'rgba(10, 30, 50, 0.25)';
    context.beginPath();
    context.ellipse(0, 62, 52, 9, 0, 0, Math.PI * 2);
    context.fill();
    // Tail, fuselage, wings, canopy — a little red-and-white prop plane.
    context.fillStyle = PALETTE.planeWing;
    context.beginPath();
    context.moveTo(-14, 6);
    context.lineTo(-58, 26);
    context.lineTo(-52, 34);
    context.lineTo(-10, 16);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.planeBody;
    context.beginPath();
    context.ellipse(0, 0, 62, 15, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.planeWing;
    context.beginPath();
    context.moveTo(-6, -8);
    context.lineTo(-46, -34);
    context.lineTo(-34, -40);
    context.lineTo(10, -12);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(-6, 8);
    context.lineTo(-46, 34);
    context.lineTo(-34, 40);
    context.lineTo(10, 12);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.glass;
    context.beginPath();
    context.ellipse(22, -4, 16, 9, -0.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.planeTrim;
    context.fillRect(-62, -3, 10, 6);
    // Spinning propeller at the nose.
    context.strokeStyle = 'rgba(230,235,240,0.75)';
    context.lineWidth = 4;
    context.beginPath();
    context.ellipse(66, 0, 5, 26, 0.3, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawCompass(state) {
    const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const headingDeg = Math.round(((state.plane.x / 620) * 45 + 360) % 360);
    const label = headings[Math.round(headingDeg / 45) % 8];
    text(`HDG ${String(headingDeg).padStart(3, '0')}° ${label}`, FIELD.width / 2, 8, 19, PALETTE.text, 'center', 'top');
  }

  function drawHud(state, best) {
    const plane = state.plane;
    const speedKts = Math.round(plane.speed * 1.6);
    // Top instrument bar.
    context.fillStyle = 'rgba(10, 20, 30, 0.72)';
    context.fillRect(0, 0, FIELD.width, 44);
    context.fillStyle = PALETTE.panelEdge;
    context.fillRect(0, 44, FIELD.width, 2);
    text(`ALT ${Math.round(plane.alt * 3)} ft`, 18, 8, 19, PALETTE.text, 'left', 'top');
    text(`SPD ${speedKts} kt`, 210, 8, 19, PALETTE.text, 'left', 'top');
    drawCompass(state);
    text(`SCORE ${state.score}`, 1010, 8, 19, PALETTE.ringGlow, 'right', 'top');
    text(`BEST ${best}`, 1130, 8, 19, PALETTE.muted, 'right', 'top');
    // Throttle bar under the speed readout.
    context.fillStyle = '#24384a';
    context.fillRect(210, 31, 90, 5);
    context.fillStyle = PALETTE.good;
    context.fillRect(210, 31, 90 * plane.throttle, 5);
    // Bottom strip: timer, rings left, distance to runway.
    context.fillStyle = 'rgba(10, 20, 30, 0.72)';
    context.fillRect(0, FIELD.height - 34, FIELD.width, 34);
    const timeColor = state.timeLeft < 20 ? PALETTE.danger : PALETTE.text;
    text(`TIME ${Math.ceil(state.timeLeft)}s`, 18, FIELD.height - 24, 19, timeColor, 'left', 'top');
    text(`RINGS ${state.ringIndex}/${RING_COUNT}`, 200, FIELD.height - 24, 19, PALETTE.text, 'left', 'top');
    const dist = Math.max(0, Math.round((COURSE - plane.z) / 100) / 10);
    text(`RUNWAY ${dist} km`, 430, FIELD.height - 24, 19, PALETTE.text, 'left', 'top');
    const next = state.rings[state.ringIndex];
    if (next) {
      const dir = next.x > plane.x + 20 ? '→' : next.x < plane.x - 20 ? '←' : '•';
      const up = next.alt > plane.alt + 15 ? ' climb' : next.alt < plane.alt - 15 ? ' descend' : '';
      text(`NEXT RING ${dir}${up}`, 700, FIELD.height - 24, 19, PALETTE.ringGlow, 'left', 'top');
    } else {
      text('NEXT: LAND ON THE RUNWAY', 700, FIELD.height - 24, 19, PALETTE.ringGlow, 'left', 'top');
    }
    text('Q/E throttle · M mute', 1252, FIELD.height - 24, 15, PALETTE.muted, 'right', 'top');
    // Centre message (ring scored, crash reason) fades on its own timer.
    if (state.message && state.messageTimer > 0) {
      context.globalAlpha = clamp(state.messageTimer, 0, 1);
      text(state.message, FIELD.width / 2, 66, 24, PALETTE.ringGlow, 'center', 'top');
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const lineH = 30;
    const height = 150 + lines.length * lineH;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2 - 20;
    context.fillStyle = 'rgba(8, 16, 24, 0.82)';
    context.fillRect(x, y, width, height);
    context.strokeStyle = accent ?? PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, width, height);
    text(title, FIELD.width / 2, y + 58, 44, PALETTE.text, 'center');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 104 + i * lineH, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 28, 21, PALETTE.ringGlow, 'center');
  }

  /** Paint one frame: the world, then the HUD or a panel for the screen. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0b1520';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(state);
    drawClouds(state);
    // Far to near so near islands overlap far ones.
    const sorted = [...state.islands].sort((a, b) => b.z - a.z);
    for (const island of sorted) drawIsland(state, island);
    drawRunway(state);
    for (const ring of state.rings) drawRing(state, ring);
    for (const balloon of state.balloons) drawBalloon(state, balloon);
    drawPlane(state);
    if (screen === SCREEN_TITLE) {
      drawHud(state, best);
      drawPanel('MERIDIAN RUN', [
        'Fly the island chain. Thread every gold ring.',
        'Dodge the peaks and the balloons. Land on the runway.',
        '← → steer · ↑ ↓ climb / descend · Q / E throttle',
        'Drag to steer · P pause · M mute',
      ], 'Press Space or click to fly', PALETTE.ring);
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The islands will wait for you.'], 'Press P or click to resume');
    } else if (screen === SCREEN_OVER) {
      const landed = state.landed;
      const title = landed ? 'LANDED!' : state.timedOut ? "OUT OF TIME" : 'CRASHED';
      const lines = [
        `Score ${state.score}   Best ${best}`,
        `Rings ${state.ringIndex}/${RING_COUNT}   Time left ${Math.max(0, Math.ceil(state.timeLeft))}s`,
        landed ? 'A perfect island landing. The Meridian is yours.' : 'The Meridian chain is unforgiving. Fly it again.',
      ];
      drawPanel(title, lines, 'Press Space or click to fly again', landed ? PALETTE.good : PALETTE.danger);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
