import { useRef, useState } from "react";
import { Tone, isArmed, blip } from "../audio/engine";
import { moveFor } from "../content/glossary";
import { midiToFreq } from "../audio/notes";
import type { ToyDef, ToyInnerProps } from "./types";

// Old MacDonald in C — with the G and A BELOW middle C (as sung).
const SONG: { word: string; midi: number; beats: number }[] = [
  { word: "Old", midi: 60, beats: 1 }, { word: "Mac", midi: 60, beats: 1 },
  { word: "Don", midi: 60, beats: 1 }, { word: "ald", midi: 55, beats: 1 },
  { word: "had", midi: 57, beats: 1 }, { word: "a", midi: 57, beats: 1 },
  { word: "farm", midi: 55, beats: 2 },
  { word: "E", midi: 64, beats: 1 }, { word: "I", midi: 64, beats: 1 },
  { word: "E", midi: 62, beats: 1 }, { word: "I", midi: 62, beats: 1 },
  { word: "O", midi: 60, beats: 2 },
];

function moveWord(i: number) {
  if (i === 0) return "start";
  const d = SONG[i].midi - SONG[i - 1].midi;
  if (d === 0) return "stay";
  return `${moveFor(d).word} ${d > 0 ? "↑" : "↓"}`;
}

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const [at, setAt] = useState(-1);
  const playing = useRef(false);

  async function play() {
    if (playing.current || !isArmed()) return;
    playing.current = true;
    const beat = 60 / dials.tempo;
    const t0 = Tone.now() + 0.1;
    let acc = 0;
    SONG.forEach((n, i) => {
      const when = t0 + acc;
      if (dials.pitches) blip(midiToFreq(n.midi), n.beats * beat * 0.9, when);
      if (dials.claps) {
        const noise = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.08, sustain: 0 }, volume: -12 }).toDestination();
        noise.triggerAttackRelease("16n", when);
        setTimeout(() => noise.dispose(), (acc + 1) * 1000 + 2000);
      }
      Tone.getDraw().schedule(() => setAt(i), when);
      acc += n.beats * beat;
    });
    Tone.getDraw().schedule(() => { setAt(-1); playing.current = false; emit("playedThrough"); }, t0 + acc);
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Old MacDonald — first line</h3>
      <div className="lane">
        {SONG.map((n, i) => (
          <div key={i} className={`tile ${i === at ? "now" : ""}`} style={{ minWidth: n.beats > 1 ? 84 : 56 }}>
            <span className="w">{n.word}</span>
            <span className="smallnote">{moveWord(i)}</span>
            <span className="smallnote">{n.beats > 1 ? "loong" : "short"}</span>
          </div>
        ))}
      </div>
      <div className="dialrow">
        <button className="primary" onClick={play}>▶ chant it</button>
        <label className="dial" style={{minWidth:90}}><span>pitches</span><button disabled={locked.has("pitches")} onClick={() => setDial("pitches", !dials.pitches)}>{dials.pitches ? "on" : "off"}</button></label>
        <label className="dial" style={{minWidth:90}}><span>claps</span><button disabled={locked.has("claps")} onClick={() => setDial("claps", !dials.claps)}>{dials.claps ? "on" : "off"}</button></label>
        <label className="dial"><span>tempo: <b style={{color:"var(--chalk)"}}>{dials.tempo}</b></span>
          <input type="range" min={50} max={140} value={dials.tempo} disabled={locked.has("tempo")} onChange={e => setDial("tempo", parseInt(e.target.value))} /></label>
      </div>
      <p className="smallnote">Notice: it opens with a <b>jump ↓</b> (Home down to the farm)… and there is not a single <b>scoot</b> anywhere. That's the five-tone scale keeping everything safe. (Farm up to "E" is a big vault — the one fancy move.)</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "chant-board",
  title: "Chant Board",
  blurb: "A song you know, as moves + longs & shorts.",
  thread: "time",
  dials: {
    pitches: { type: "toggle", default: true, label: "pitches" },
    claps:   { type: "toggle", default: false, label: "claps" },
    tempo:   { type: "slider", min: 50, max: 140, step: 1, default: 92, label: "tempo" },
  },
  component: Comp,
};
