import { useEffect, useRef, useState } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

const ROWS = [
  { name: "boom (kick)" }, { name: "clap (snare)" }, { name: "tick" },
];

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const slots = dials.slots as number;
  const [grid, setGrid] = useState<boolean[][]>(() => ROWS.map((_, r) => Array(16).fill(false).map((_, i) => r === 0 && i % 8 === 0)));
  const [play, setPlay] = useState(-1);
  const gridRef = useRef(grid); gridRef.current = grid;
  const evId = useRef<number | null>(null);
  const step = useRef(0);

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const kick = new Tone.MembraneSynth({ volume: -8 }).toDestination();
    const snare = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -12 }).toDestination();
    const tick = new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 2, volume: -14 }).toDestination();
    const t = Tone.getTransport();
    t.bpm.value = dials.tempo;
    t.swing = dials.swing; t.swingSubdivision = "8n";
    step.current = 0;
    evId.current = t.scheduleRepeat((time) => {
      const s = step.current % slots;
      const g = gridRef.current;
      if (g[0][s]) kick.triggerAttackRelease("C2", "8n", time);
      if (g[1][s]) snare.triggerAttackRelease("16n", time);
      if (g[2][s]) tick.triggerAttackRelease("C5", "16n", time);
      Tone.getDraw().schedule(() => { setPlay(s); if (s === slots - 1) emit("barLooped"); }, time);
      step.current++;
    }, "8n");
    t.start();
    return () => { if (evId.current != null) t.clear(evId.current); t.stop(); kick.dispose(); snare.dispose(); tick.dispose(); setPlay(-1); };
  }, [dials.playing, slots]);

  useEffect(() => { Tone.getTransport().bpm.rampTo(dials.tempo, 0.1); }, [dials.tempo]);
  useEffect(() => { Tone.getTransport().swing = dials.swing; }, [dials.swing]);

  // the extra stream: k evenly spaced clicks per two beats — a rhythm "harmonic" riding the pulse
  useEffect(() => {
    const k = parseInt(dials.stream);
    if (!dials.playing || !k || !isArmed()) return;
    const ping = new Tone.MembraneSynth({ pitchDecay: 0.004, octaves: 1.5, volume: -10 }).toDestination();
    const t = Tone.getTransport();
    const id = t.scheduleRepeat((time) => ping.triggerAttackRelease("A5", "32n", time),
      Tone.Time("2n").toSeconds() / k);
    return () => { t.clear(id); ping.dispose(); };
  }, [dials.playing, dials.stream, dials.tempo]);

  return (
    <div>
      <div className="dawgrid" style={{ gridTemplateColumns: `110px repeat(${slots}, 1fr)` }}>
        {ROWS.map((row, r) => (
          [<div key={`l${r}`} className="rowlabel">{row.name}</div>,
          ...Array.from({ length: slots }, (_, i) => (
            <div key={`${r}-${i}`}
              className={`cell ${grid[r][i] ? "on" : ""} ${i === play ? "play" : ""}`}
              style={grid[r][i] ? { background: ["var(--time)", "var(--moves)", "var(--sound)"][r] } : {}}
              onClick={() => setGrid(g => g.map((row2, r2) => r2 === r ? row2.map((v, i2) => i2 === i ? !v : v) : row2))} />
          ))]
        ))}
      </div>
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ loop"}</button>
        <label className="dial"><span>tempo: <b style={{color:"var(--chalk)"}}>{dials.tempo}</b></span>
          <input type="range" min={60} max={160} value={dials.tempo} disabled={locked.has("tempo")} onChange={e => setDial("tempo", parseInt(e.target.value))} /></label>
        <label className="dial"><span>lean (swing): <b style={{color:"var(--chalk)"}}>{Math.round(dials.swing * 100)}%</b></span>
          <input type="range" min={0} max={0.6} step={0.01} value={dials.swing} disabled={locked.has("swing")} onChange={e => setDial("swing", parseFloat(e.target.value))} /></label>
        <label className="dial" style={{minWidth:90}}><span>slots</span>
          <select disabled={locked.has("slots")} value={dials.slots} onChange={e => setDial("slots", parseInt(e.target.value))}>
            <option value={8}>8</option><option value={16}>16</option>
          </select></label>
        <label className="dial" style={{minWidth:150}}><span>extra stream</span>
          <select disabled={locked.has("stream")} value={dials.stream} onChange={e => setDial("stream", e.target.value)}>
            <option value="0">off</option>
            <option value="3">3 over 2 — the gallop</option>
            <option value="5">5 over 2 — the tumble</option>
          </select></label>
      </div>
      <p className="smallnote">Same boxes + the lean knob = groove. That's swing: the boxes don't change, the timing
        leans. The <b>extra stream</b> is a rhythm <i>harmonic</i>: 3-against-2 is the leap (3:2) of time —
        speed any of this up (Speed Trick) and the streams become intervals.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "pulse-grid",
  title: "Pulse Grid",
  blurb: "The beat as boxes. Then lean it — swing.",
  thread: "time",
  dials: {
    playing: { type: "toggle", default: false, label: "playing" },
    tempo:   { type: "slider", min: 60, max: 160, step: 1, default: 100, label: "tempo" },
    swing:   { type: "slider", min: 0, max: 0.6, step: 0.01, default: 0, label: "lean (swing)" },
    slots:   { type: "select", default: 8, label: "slots", options: [{ value: "8", label: "8" }, { value: "16", label: "16" }] },
    stream:  { type: "select", default: "0", label: "extra stream", options: [
      { value: "0", label: "off" }, { value: "3", label: "3 over 2" }, { value: "5", label: "5 over 2" }] },
  },
  component: Comp,
};
