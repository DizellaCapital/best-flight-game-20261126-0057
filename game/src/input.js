// Keyboard and pointer input. Held keys give steering, pitch and throttle;
// one-shot presses (start, restart, pause) are queued as bit flags and taken
// once by the loop, so a press between two frames is never lost or counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const THROTTLE_UP = new Set(['KeyE', 'ShiftLeft', 'ShiftRight']);
const THROTTLE_DOWN = new Set(['KeyQ']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let throttleUp = false;
  let throttleDown = false;
  let actions = 0;
  let dragX = null;
  let dragY = null;

  function press(event, set) {
    if (set.has(event.code)) return true;
    return false;
  }

  window.addEventListener('keydown', (event) => {
    if (press(event, LEFT)) left = true;
    else if (press(event, RIGHT)) right = true;
    else if (press(event, UP)) up = true;
    else if (press(event, DOWN)) down = true;
    else if (press(event, THROTTLE_UP)) throttleUp = true;
    else if (press(event, THROTTLE_DOWN)) throttleDown = true;
    else if (press(event, CONFIRM)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (press(event, PAUSE)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (press(event, MUTE)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (THROTTLE_UP.has(event.code)) throttleUp = false;
    else if (THROTTLE_DOWN.has(event.code)) throttleDown = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    left = right = up = down = throttleUp = throttleDown = false;
    dragX = dragY = null;
  });
  // Click confirms on menus; dragging steers the plane while flying.
  target.addEventListener('pointerdown', (event) => {
    dragX = event.clientX;
    dragY = event.clientY;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointermove', (event) => {
    if (dragX === null) return;
    dragX = event.clientX;
    dragY = event.clientY;
  });
  target.addEventListener('pointerup', () => {
    dragX = dragY = null;
  });

  return {
    /** -1 left, 1 right, 0 neither or both; drag steers toward the pointer. */
    steer() {
      if (dragX !== null) {
        const centre = window.innerWidth / 2;
        const offset = (dragX - centre) / Math.max(120, window.innerWidth / 3);
        return Math.max(-1, Math.min(1, offset));
      }
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** -1 descend, 1 climb; drag pulls the nose toward the pointer. */
    pitch() {
      if (dragY !== null) {
        const centre = window.innerHeight / 2;
        const offset = (centre - dragY) / Math.max(90, window.innerHeight / 3);
        return Math.max(-1, Math.min(1, offset));
      }
      return (up ? 1 : 0) - (down ? 1 : 0);
    },
    /** -1 throttle down, 1 throttle up. */
    throttle() {
      return (throttleUp ? 1 : 0) - (throttleDown ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
