// Tiny WebAudio synth: an engine hum, a ring chime, a crash thud. No files,
// no network — everything is oscillators and noise made on the spot. Sound
// only starts after the player has pressed a key or clicked, so browsers
// allow it; muted state is kept in memory only.
export function createAudio() {
  let context = null;
  let engine = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      engine = context.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 70;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engine.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(context.destination);
      engine.start();
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when) {
    if (!context || muted) return;
    try {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = context.createGain();
      const start = context.currentTime + (when ?? 0);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    } catch {
      // Sound is decoration; a failure here must never stop the game.
    }
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    setEngine(speed, throttle) {
      if (!context || !engine || muted) return;
      try {
        engine.frequency.value = 55 + speed * 0.25 + throttle * 30;
        engineGain.gain.value = 0.035 + throttle * 0.02;
      } catch {
        // Ignore audio errors.
      }
    },
    stopEngine() {
      if (engineGain) engineGain.gain.value = 0;
    },
    ring() {
      tone(880, 0.35, 'sine', 0.16, 0);
      tone(1318, 0.45, 'sine', 0.12, 0.08);
    },
    crash() {
      if (!context || muted) return;
      try {
        const len = Math.floor(context.sampleRate * 0.4);
        const buffer = context.createBuffer(1, len, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const source = context.createBufferSource();
        source.buffer = buffer;
        const gain = context.createGain();
        gain.gain.value = 0.3;
        source.connect(gain);
        gain.connect(context.destination);
        source.start();
      } catch {
        // Ignore audio errors.
      }
      tone(110, 0.5, 'triangle', 0.2, 0);
    },
    land() {
      tone(523, 0.3, 'sine', 0.14, 0);
      tone(659, 0.3, 'sine', 0.14, 0.12);
      tone(784, 0.5, 'sine', 0.14, 0.24);
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopEngine();
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
