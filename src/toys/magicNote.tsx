import { useEffect, useRef, useState } from "react";
import { Tone, isArmed } from "../audio/engine";
import { midiToFreq } from "../audio/notes";
import type { ToyDef, ToyInnerProps } from "./types";

const CHORDS = [
  { label: "C — home", freqs: [130.81, 196.0], feeling: "calm — G is the leap of this chord" },
  { label: "F — jump up", freqs: [174.61, 261.63], feeling: "bright — now G shines as the step above" },
  { label: "G — leap up", freqs: [196.0, 293.66], feeling: "home itself — G IS this chord" },
];

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const [which, setWhich] = useState(0);
  const held = useRef<Tone.Oscillator | null>(null);
  const bed = useRef<Tone.PolySynth | null>(null);

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const h = new Tone.Oscillator({ frequency: midiToFreq(67), type: "sine", volume: -10 }).toDestination().start(); // G4
    const b = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.05, sustain: 0.8, release: 0.5 }, volume: -16 }).toDestination();
    held.current = h; bed.current = b;
    b.triggerAttack(CHORDS[which].freqs);
    return () => { h.stop().dispose(); b.releaseAll(); b.dispose(); held.current = null; bed.current = null; };
  }, [dials.playing]);

  function change(i: number) {
    setWhich(i);
    emit("chordChanged");
    if (bed.current) { bed.current.releaseAll(); bed.current.triggerAttack(CHORDS[i].freqs); }
  }

  return (
    <div>
      <div style={{ textAlign: "center", margin: "6px 0 12px" }}>
        <span style={{ fontFamily: "Caveat", fontSize: 40, color: "var(--home)" }}>G</span>
        <span className="smallnote"> — one held note, never changing</span>
      </div>
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ hold the note"}</button>
        {CHORDS.map((c, i) => (
          <button key={i} disabled={!dials.playing} style={i === which ? { borderColor: "var(--home)" } : {}} onClick={() => change(i)}>{c.label}</button>
        ))}
      </div>
      {dials.playing && <div className="verdict rest">feeling: {CHORDS[which].feeling}</div>}
      <p className="smallnote">Same note, three feelings. The ground underneath decides what a note means.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "magic-note",
  title: "The Magic Note",
  blurb: "Hold one note. Change the chord beneath. Three feelings.",
  thread: "home",
  dials: { playing: { type: "toggle", default: false, label: "playing" } },
  component: Comp,
};
