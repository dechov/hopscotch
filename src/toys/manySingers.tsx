import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import { Readout } from "./Readout";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

// The wobble, redeemed: square 2's villain becomes lushness. One singer is a plain tone;
// many singers, each a tiny bit off, wobble against each other in a crowd — and the crowd
// of wobbles is what "lush" is (chorus, string sections, choirs).
function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const oscs = useRef<Tone.Oscillator[]>([]);
  const voices = dials.voices as number;
  const spread = dials.spread as number; // max detune in cents
  const freq = 220;

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const os: Tone.Oscillator[] = [];
    for (let i = 0; i < voices; i++) {
      const off = voices === 1 ? 0 : ((i / (voices - 1)) * 2 - 1) * spread;
      os.push(new Tone.Oscillator({
        frequency: freq * Math.pow(2, off / 1200), type: "sawtooth",
        volume: -18 - Math.min(6, voices),
      }).toDestination().start());
    }
    oscs.current = os;
    emit("playStarted");
    if (voices >= 5) emit("lush");
    return () => { os.forEach(o => o.stop().dispose()); oscs.current = []; };
  }, [dials.playing, voices, spread]);

  return (
    <div>
      <Readout items={[
        ["singers", `${voices}`],
        ["spread", `±${spread}¢`],
        ["what you hear", voices === 1 ? "one plain voice" : voices === 2 ? "two voices — hello, wobble" : "a crowd of tiny wobbles = LUSH"],
      ]} />
      <Dials names={["playing", "voices", "spread"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">
        Remember square 2, where the wobble was the villain? Here it comes back as the hero. Two
        singers slightly apart wobble. <b>Eight</b> singers slightly apart wobble in so many
        overlapping ways that no single wobble survives — it melts into shimmer. That's a choir,
        a string section, a chorus pedal: lushness IS the wobble, crowd-sized.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "many-singers",
  title: "How Many Singers?",
  blurb: "The wobble, redeemed: one voice is plain, a crowd of wobbles is lush.",
  thread: "timbre",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    voices: { type: "slider", min: 1, max: 8, step: 1, default: 1, label: "singers" },
    spread: { type: "slider", min: 2, max: 25, step: 1, default: 10, label: "spread (¢)" },
  },
  component: Comp,
};
