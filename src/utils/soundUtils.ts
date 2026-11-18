// Lightweight Web Audio API sound effects (no external audio files required)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'triangle',
  volume = 0.14
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playTileClick(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(ctx, 540, now, 0.055, 'sine', 0.06);
}

export function playCorrectChime(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Cheerful rising C major arpeggio
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    playTone(ctx, freq, now + idx * 0.07, 0.18, 'triangle', 0.13);
  });
}

export function playTryAgainTone(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Gentle, warm two-note marimba tone (never a harsh buzzer)
  playTone(ctx, 349.23, now, 0.14, 'sine', 0.11);
  playTone(ctx, 293.66, now + 0.12, 0.22, 'sine', 0.1);
}

export function playTurboWhoosh(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Rising turbo synth sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.exponentialRampToValueAtTime(2800, now + 0.25);

  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.11, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.36);

  // Sparkle chime on top
  playTone(ctx, 783.99, now + 0.08, 0.16, 'triangle', 0.11);
  playTone(ctx, 1046.5, now + 0.16, 0.22, 'triangle', 0.12);
}

export function playRoundFanfare(soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  // Celebratory 5-note victory fanfare
  const sequence = [
    { freq: 523.25, offset: 0, dur: 0.14 },
    { freq: 659.25, offset: 0.11, dur: 0.14 },
    { freq: 783.99, offset: 0.22, dur: 0.14 },
    { freq: 1046.5, offset: 0.35, dur: 0.35 },
    { freq: 783.99, offset: 0.52, dur: 0.14 },
    { freq: 1046.5, offset: 0.65, dur: 0.45 },
  ];
  sequence.forEach((n) => {
    playTone(ctx, n.freq, now + n.offset, n.dur, 'triangle', 0.14);
  });
}
