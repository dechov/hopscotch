import { useEffect, useRef, useState } from "react";
import { Tone, isArmed } from "../audio/engine";
import { midiToFreq } from "../audio/notes";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

type Chord = { name: string; roman: string; root: number };
const CHORDS: Record<string, Chord> = {
  I:  { name: "C (home)",  roman: "I",  root: 48 },
  IV: { name: "F (jump up)", roman: "IV", root: 53 },
  V:  { name: "G (leap up)", roman: "V",  root: 55 },
  vi: { name: "Am (moody cousin)", roman: "vi", root: 45 },
};
const PROGS: Record<string, string[]> = {
  home:   ["I"],
  rock2:  ["I", "vi"],
  skeleton: ["I", "IV", "V", "I"],
  blues12:  ["I","I","I","I","IV","IV","I","I","V","IV","I","V"],
};

function chordFreqs(c: Chord, voicing: string) {
  const f = midiToFreq(c.root);
  const isMinor = c.roman === "vi";
  if (voicing === "fifth") return [f, f * 1.5];
  return [f, f * (isMinor ? Math.pow(2, 3 / 12) : Math.pow(2, 4 / 12)), f * 1.5];
}

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const [pos, setPos] = useState(0);
  const synth = useRef<Tone.PolySynth | null>(null);
  const evId = useRef<number | null>(null);
  const posRef = useRef(0);
  const prog = PROGS[dials.progression] ?? PROGS.home;

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.04, decay: 0.2, sustain: 0.7, release: 0.4 }, volume: -14 }).toDestination();
    synth.current = s;
    const t = Tone.getTransport();
    t.bpm.value = dials.tempo;
    posRef.current = 0; setPos(0);
    evId.current = t.scheduleRepeat((time) => {
      const p = posRef.current % prog.length;
      const chord = CHORDS[prog[p]];
      s.triggerAttackRelease(chordFreqs(chord, dials.voicing), "1m", time);
      Tone.getDraw().schedule(() => { setPos(p); emit("chordChanged"); if (p === prog.length - 1) emit("loopCompleted"); }, time);
      posRef.current++;
    }, "1m");
    t.start();
    return () => {
      if (evId.current != null) t.clear(evId.current);
      t.stop();
      s.dispose(); synth.current = null;
    };
  }, [dials.playing, dials.progression, dials.voicing]);

  useEffect(() => { Tone.getTransport().bpm.rampTo(dials.tempo, 0.2); }, [dials.tempo]);

  return (
    <div>
      <div className="lane">
        {prog.map((r, i) => (
          <div key={i} className={`tile ${i === pos && dials.playing ? "now" : ""}`}>
            <span className="w">{r}</span>{CHORDS[r].name.split(" ")[0]}
          </div>
        ))}
      </div>
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ play the ground"}</button>
      </div>
      <Dials names={["progression", "voicing", "tempo"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">The ground moves; your five notes stay safe on top. Noodle over it with a Drone Pad (drone off).</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "chord-bed",
  title: "Chord Bed",
  blurb: "The moving ground: I, IV, V, vi — and the 12-bar blues.",
  thread: "home",
  dials: {
    playing:     { type: "toggle", default: false, label: "playing" },
    progression: { type: "select", default: "rock2", label: "progression", options: [
      { value: "home", label: "just Home (I)" },
      { value: "rock2", label: "two-chord rock (I ⇄ vi)" },
      { value: "skeleton", label: "the skeleton (I IV V I)" },
      { value: "blues12", label: "12-bar blues" }] },
    voicing: { type: "select", default: "fifth", label: "chord flavor", options: [
      { value: "fifth", label: "open fifth (no flavor)" }, { value: "triad", label: "full chord" }] },
    tempo:   { type: "slider", min: 50, max: 140, step: 1, default: 80, label: "tempo" },
  },
  component: Comp,
};
