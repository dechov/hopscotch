import { useEffect, useRef, useState } from "react";
import { Tone, isArmed } from "../audio/engine";
import { RATIOS } from "../content/glossary";
import type { ToyDef, ToyInnerProps } from "./types";

const nice = RATIOS.map(r => ({ ...r, v: r.a / r.b }));

function nearest(ratio: number) {
  let best = nice[0], bd = 1e9;
  for (const n of nice) { const d = Math.abs(n.v - ratio); if (d < bd) { bd = d; best = n; } }
  return { best, dist: bd };
}

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const oscs = useRef<{ a: Tone.Oscillator; b: Tone.Oscillator } | null>(null);
  const lockTimer = useRef<number | null>(null);
  const [lockedIn, setLockedIn] = useState(false);

  const root = dials.rootHz as number;
  let ratio = dials.ratio as number;
  const { best, dist } = nearest(ratio);
  if (dials.snap && dist < 0.015) ratio = best.v;
  const f2 = root * ratio;
  const beat = Math.abs(f2 - root * best.v);
  const resting = Math.abs(ratio - best.v) < 0.004;

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h); x.strokeStyle = "#8fd6a0"; x.lineWidth = 2; x.beginPath();
    for (let px = 0; px < w; px++) {
      const t = (px / w) * Math.PI * 2 * 8;
      const y = (Math.sin(t) + Math.sin(t * ratio)) / 2;
      x.lineTo(px, h / 2 - y * (h / 2 - 10));
    }
    x.stroke();
  }, [ratio]);

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const a = new Tone.Oscillator({ frequency: root, volume: -14 }).toDestination().start();
    const b = new Tone.Oscillator({ frequency: f2, volume: -14 }).toDestination().start();
    oscs.current = { a, b };
    emit("playStarted");
    return () => { a.stop().dispose(); b.stop().dispose(); oscs.current = null; };
  }, [dials.playing]);

  useEffect(() => {
    if (oscs.current) { oscs.current.a.frequency.rampTo(root, 0.03); oscs.current.b.frequency.rampTo(f2, 0.03); }
  }, [root, f2]);

  // lockAchieved after holding a resting ratio 1s (while playing)
  useEffect(() => {
    if (resting && dials.playing && best.a !== 1) {
      if (lockTimer.current == null) {
        lockTimer.current = window.setTimeout(() => { setLockedIn(true); emit("lockAchieved"); }, 900);
      }
    } else {
      if (lockTimer.current != null) { clearTimeout(lockTimer.current); lockTimer.current = null; }
      setLockedIn(false);
    }
  }, [resting, dials.playing, best.a]);

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={120} />
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ play both"}</button>
        <label className="dial" style={{ flex: 3 }}>
          <span>slide the second sound</span>
          <input type="range" min={1} max={2.1} step={0.001} value={dials.ratio} disabled={locked.has("ratio")}
            onChange={(e) => setDial("ratio", parseFloat(e.target.value))} />
        </label>
        <label className="dial" style={{ minWidth: 90 }}>
          <span>magnet</span>
          <button disabled={locked.has("snap")} onClick={() => setDial("snap", !dials.snap)}>{dials.snap ? "on" : "off"}</button>
        </label>
      </div>
      <div className="readout">
        <div className="chip"><div className="k">nearest ratio</div><div className="v">{best.a}:{best.b}</div></div>
        <div className="chip"><div className="k">its name</div><div className="v">{best.name}</div></div>
        <div className="chip"><div className="k">wobble</div><div className="v">{beat.toFixed(1)}/s</div></div>
      </div>
      <div className={`verdict ${resting ? "rest" : "lean"}`}>
        {resting ? (lockedIn ? "✔ locked in — resting" : "resting…") : "leaning — hear the wobble"}
      </div>
    </div>
  );
}

export const def: ToyDef = {
  id: "two-tone",
  title: "Two Tone",
  blurb: "Two sounds rest at simple ratios — or lean and wobble.",
  thread: "sound",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    rootHz:  { type: "slider", min: 110, max: 440, step: 1, default: 220, label: "first sound (Hz)" },
    ratio:   { type: "slider", min: 1, max: 2.1, step: 0.001, default: 1.42, label: "ratio" },
    snap:    { type: "toggle", default: false, label: "magnet" },
  },
  component: Comp,
};
