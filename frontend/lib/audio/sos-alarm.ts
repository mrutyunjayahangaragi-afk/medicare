/**
 * lib/audio/sos-alarm.ts
 * Manages the SOS alarm sound using the Web Audio API.
 *
 * Rules:
 *  - Audio starts ONLY inside a user-gesture handler (click).
 *  - Playback stops automatically after MAX_DURATION_MS.
 *  - Cleans up on page unload.
 *  - Gracefully handles browsers that block autoplay.
 *  - Does NOT use a file asset — generates an alarm tone via Web Audio API
 *    so no separate MP3 is needed and CSP issues are avoided.
 */

const MAX_DURATION_MS = 15_000; // 15 s safety cutoff

let _context: AudioContext | null = null;
let _stopFn: (() => void) | null = null;
let _cutoffTimer: ReturnType<typeof setTimeout> | null = null;

/** Synthesise a repeating alert tone using the Web Audio API. */
function _createAlarmTone(ctx: AudioContext): () => void {
  const nodes: AudioNode[] = [];
  let stopped = false;

  function beep(startTime: number, freq: number, duration: number) {
    if (stopped) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type      = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.35, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.01);
    osc.start(startTime);
    osc.stop(startTime + duration);
    nodes.push(osc, gain);
  }

  // Build a repeating pattern: high-low beep every 0.6 s
  const now     = ctx.currentTime;
  const period  = 0.6;
  const cycles  = Math.ceil(MAX_DURATION_MS / 1000 / period);

  for (let i = 0; i < cycles; i++) {
    const t = now + i * period;
    beep(t,        880, 0.25); // high note
    beep(t + 0.3,  660, 0.25); // low note
  }

  return () => {
    stopped = true;
    nodes.forEach((n) => {
      try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ }
      n.disconnect();
    });
  };
}

/** Start the SOS alarm. Safe to call multiple times — restarts cleanly. */
export function playSOSAlarm(): void {
  stopSOSAlarm(); // Clear any previous alarm first

  try {
    const Ctx  = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      console.warn("[SOS Alarm] Web Audio API not supported in this browser.");
      return;
    }

    _context = new Ctx();

    // Resume suspended context (required on some browsers after inactivity)
    if (_context.state === "suspended") {
      _context.resume().catch(() => {});
    }

    _stopFn = _createAlarmTone(_context);

    // Auto-stop after MAX_DURATION_MS
    _cutoffTimer = setTimeout(() => stopSOSAlarm(), MAX_DURATION_MS);

    // Clean up on page unload
    window.addEventListener("beforeunload", stopSOSAlarm, { once: true });
    window.addEventListener("pagehide",     stopSOSAlarm, { once: true });

  } catch (err) {
    console.warn("[SOS Alarm] Could not start alarm:", err);
  }
}

/** Stop and clean up the SOS alarm. */
export function stopSOSAlarm(): void {
  if (_cutoffTimer !== null) {
    clearTimeout(_cutoffTimer);
    _cutoffTimer = null;
  }

  if (_stopFn) {
    try { _stopFn(); } catch { /* ignore */ }
    _stopFn = null;
  }

  if (_context) {
    try { _context.close(); } catch { /* ignore */ }
    _context = null;
  }
}

/** Returns true while the alarm is playing. */
export function isSOSAlarmPlaying(): boolean {
  return _context !== null && _context.state !== "closed";
}
