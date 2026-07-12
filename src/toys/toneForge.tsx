import { useEffect, useRef } from "react";
import { onMidiNote } from "../input/midi";
import { Tone, isArmed } from "../audio/engine";
import { midiToFreq } from "../audio/notes";
import { PitchSurface } from "./PitchSurface";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

const PRESETS: Record<string, Partial<Record<string, number>>> = {
  pluck:   { attack: 0.005, decay: 0.25, sustain: 0, release: 0.25, dirt: 0, wobbleDepth: 0, harmonicity: 1 },
  organ:   { attack: 0.06, decay: 0.1, sustain: 1, release: 0.3, dirt: 0, wobbleDepth: 0.1, harmonicity: 1 },
  bell:    { attack: 0.001, decay: 1.4, sustain: 0, release: 1.6, dirt: 0, wobbleDepth: 0, harmonicity: 2.4 },
  foghorn: { attack: 0.4, decay: 0.2, sustain: 0.9, release: 0.8, dirt: 0.5, wobbleDepth: 0.3, harmonicity: 0.5 },
};

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const chain = useRef<{ synth: Tone.FMSynth; dist: Tone.Distortion; vib: Tone.Vibrato } | null>(null);

  useEffect(() => {
    if (!isArmed()) return;
    const vib = new Tone.Vibrato({ frequency: dials.wobbleRate, depth: dials.wobbleDepth }).toDestination();
    const dist = new Tone.Distortion({ distortion: dials.dirt, wet: dials.dirt > 0 ? 1 : 0 }).connect(vib);
    const synth = new Tone.FMSynth({ harmonicity: dials.harmonicity, volume: -10 }).connect(dist);
    chain.current = { synth, dist, vib };
    return () => { synth.dispose(); dist.dispose(); vib.dispose(); chain.current = null; };
  }, []);

  useEffect(() => {
    const c = chain.current; if (!c) return;
    c.synth.envelope.attack = dials.attack;
    c.synth.envelope.decay = dials.decay;
    c.synth.envelope.sustain = dials.sustain;
    c.synth.envelope.release = dials.release;
    c.synth.harmonicity.value = dials.harmonicity;
    c.dist.distortion = dials.dirt;
    c.dist.wet.value = dials.dirt > 0 ? 1 : 0;
    c.vib.frequency.value = dials.wobbleRate;
    c.vib.depth.value = dials.wobbleDepth;
    if (dials.attack <= 0.01 && dials.sustain === 0) emit("pluckShaped");
  }, [dials]);

  useEffect(() => onMidiNote((m) => {
    chain.current?.synth.triggerAttackRelease(midiToFreq(m), dials.sustain > 0 ? 0.8 : 1.2);
    emit("noteOn");
  }), [dials.sustain]);

  function preset(name: string) {
    const p = PRESETS[name];
    for (const [k, v] of Object.entries(p)) setDial(k, v);
    emit(`preset:${name}`);
  }

  return (
    <div>
      <div className="dialrow">
        {Object.keys(PRESETS).map(p => <button key={p} onClick={() => preset(p)}>{p}</button>)}
      </div>
      <Dials names={["attack", "decay", "sustain", "release"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <Dials names={["dirt", "wobbleRate", "wobbleDepth", "harmonicity"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <PitchSurface surface="keys" home={60} pcs={[0,1,2,3,4,5,6,7,8,9,10,11]} range={[60, 72]} labels="letters"
        onNote={(m) => { chain.current?.synth.triggerAttackRelease(midiToFreq(m), dials.sustain > 0 ? 0.8 : 1.2); emit("noteOn"); }} />
      <p className="smallnote">A sound's identity = its life-shape (start → settle → hold → fade) + its dirt (extra helpers!) + its wobble. Try <b>helper spacing</b>: whole numbers sound musical, in-between numbers go bell-clangy — resting vs. leaning INSIDE one sound.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "tone-forge",
  title: "Tone Forge",
  blurb: "Build a sound: shape its life, add dirt, make it wobble.",
  thread: "timbre",
  dials: {
    attack:      { type: "slider", min: 0.001, max: 1, step: 0.001, default: 0.01, label: "start (attack)" },
    decay:       { type: "slider", min: 0.01, max: 2, step: 0.01, default: 0.2, label: "settle (decay)" },
    sustain:     { type: "slider", min: 0, max: 1, step: 0.01, default: 0.6, label: "hold (sustain)" },
    release:     { type: "slider", min: 0.01, max: 2.5, step: 0.01, default: 0.4, label: "fade (release)" },
    dirt:        { type: "slider", min: 0, max: 1, step: 0.01, default: 0, label: "dirt" },
    wobbleRate:  { type: "slider", min: 0.5, max: 12, step: 0.1, default: 5, label: "wobble speed" },
    wobbleDepth: { type: "slider", min: 0, max: 1, step: 0.01, default: 0, label: "wobble amount" },
    harmonicity: { type: "slider", min: 0.5, max: 4, step: 0.01, default: 1, label: "helper spacing (harmonicity)" },
  },
  component: Comp,
};
