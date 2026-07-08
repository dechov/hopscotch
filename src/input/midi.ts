// Minimal Web MIDI input: one enable call, note-on fan-out to listeners.
type NoteFn = (midi: number, velocity: number) => void;
const listeners = new Set<NoteFn>();
let deviceName: string | null = null;
let enabled = false;
const stateFns = new Set<() => void>();

export function onMidiNote(fn: NoteFn) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function onMidiState(fn: () => void) { stateFns.add(fn); return () => { stateFns.delete(fn); }; }
export function midiDevice() { return deviceName; }
export function midiEnabled() { return enabled; }

function hook(access: any) {
  deviceName = null;
  access.inputs.forEach((input: any) => {
    deviceName = deviceName ?? input.name ?? "MIDI device";
    input.onmidimessage = (e: any) => {
      const [status, note, vel] = e.data;
      const cmd = status & 0xf0;
      if (cmd === 0x90 && vel > 0) listeners.forEach(fn => fn(note, vel / 127));
    };
  });
  stateFns.forEach(f => f());
}

export async function enableMidi(): Promise<boolean> {
  try {
    const access = await (navigator as any).requestMIDIAccess();
    enabled = true;
    hook(access);
    access.onstatechange = () => hook(access);
    return true;
  } catch {
    enabled = false;
    stateFns.forEach(f => f());
    return false;
  }
}
