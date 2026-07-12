import { useEffect, useRef } from "react";
import { onMidiNote } from "../input/midi";
import { Tone, isArmed, blip } from "../audio/engine";
import { SCALES } from "../content/glossary";
import { midiToFreq, midiName } from "../audio/notes";
import { PitchSurface } from "./PitchSurface";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const drone = useRef<Tone.Oscillator[] | null>(null);
  const home = parseInt(dials.home);
  const pcs = SCALES[dials.scale]?.pcs ?? SCALES["five-major"].pcs;

  useEffect(() => {
    if (!dials.drone || !isArmed()) return;
    const f = midiToFreq(home - 12);
    const o1 = new Tone.Oscillator({ frequency: f, type: "triangle", volume: -14 }).toDestination().start();
    const os = [o1];
    if (dials.droneType === "fifth") {
      os.push(new Tone.Oscillator({ frequency: f * 1.5, type: "triangle", volume: -18 }).toDestination().start());
    }
    drone.current = os;
    return () => { os.forEach(o => o.stop().dispose()); drone.current = null; };
  }, [dials.drone, dials.droneType, home]);

  useEffect(() => onMidiNote((m) => onNote(m)), [home]);

  const onNote = (m: number) => {
    blip(midiToFreq(m), 0.5);
    emit("noteOn");
    if ((((m - home) % 12) + 12) % 12 === 0) emit("homeLanded");
  };

  return (
    <div>
      <PitchSurface surface={dials.surface} home={home} pcs={pcs}
        labels={dials.stickers ? "stickers" : "letters"} onNote={onNote} />
      <Dials names={["drone", "droneType", "scale", "home", "surface", "stickers"]}
        specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">Home right now: <b>{midiName(home)}</b>. With the drone on, nothing you tap can sound wrong — there are no scoots in the five-tone scale.</p>
    </div>
  );
}

const homeOptions = [63, 64, 66, 57, 60, 62, 65, 67, 69].sort((a,b)=>a-b).map(m => ({ value: String(m), label: midiName(m) }));

export const def: ToyDef = {
  id: "drone-pad",
  title: "Drone Pad",
  blurb: "Noodle over a home drone. The workhorse.",
  thread: "home",
  dials: {
    drone:     { type: "toggle", default: true, label: "drone" },
    droneType: { type: "select", default: "fifth", label: "drone type", options: [
      { value: "root", label: "just home" }, { value: "fifth", label: "home + leap" }] },
    scale:     { type: "select", default: "five-major", label: "scale", options: Object.entries(SCALES).map(([v, s]) => ({ value: v, label: s.label })) },
    home:      { type: "select", default: "60", label: "home note", options: homeOptions },
    surface:   { type: "select", default: "pads", label: "surface", options: [
      { value: "pads", label: "pads" }, { value: "keys", label: "piano" }, { value: "frets", label: "guitar" }] },
    stickers:  { type: "toggle", default: true, label: "sticker names" },
  },
  component: Comp,
};
