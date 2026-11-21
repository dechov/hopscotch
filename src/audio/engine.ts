import * as Tone from "tone";

let armed = false;
const listeners = new Set<() => void>();

export function isArmed() { return armed; }
export async function armAudio() {
  if (armed) return;
  // iPhones mute Web Audio when the ring/silent switch is on silent unless the page says it
  // plays media (Safari 16.4+); browsers without navigator.audioSession just skip this.
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  if (nav.audioSession) nav.audioSession.type = "playback";
  await Tone.start();
  Tone.getDestination().volume.value = -6;
  armed = true;
  listeners.forEach(l => l());
}
export function onArmed(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export const transport = () => Tone.getTransport();

let mVol = -6, mMuted = false;
export function setMasterVolume(db: number) { mVol = db; if (armed) Tone.getDestination().volume.rampTo(mMuted ? -80 : db, 0.05); }
export function setMuted(m: boolean) { mMuted = m; if (armed) Tone.getDestination().volume.rampTo(m ? -80 : mVol, 0.03); }
export function getMasterVolume() { return mVol; }
export function getMuted() { return mMuted; }

let shared: Tone.Synth | null = null;
export function blip(freq: number, dur = 0.35, when?: number) {
  if (!armed) return;
  if (!shared) shared = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.25 }, volume: -8 }).toDestination();
  shared.triggerAttackRelease(freq, dur, when ?? Tone.now());
}
export function blipSeq(freqs: number[], gap = 0.45, dur = 0.38) {
  if (!armed) return 0;
  const t0 = Tone.now() + 0.05;
  freqs.forEach((f, i) => blip(f, dur, t0 + i * gap));
  return freqs.length * gap;
}
export { Tone };
