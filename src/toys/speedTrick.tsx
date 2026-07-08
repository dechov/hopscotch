import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import { midiName } from "../audio/notes";
import type { ToyDef, ToyInnerProps } from "./types";

/** Rhythm IS pitch: a click train swept from 1/s into the audio range. */
function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const nodes = useRef<{ osc: Tone.PulseOscillator; hp: Tone.Filter } | null>(null);
  const sweeping = useRef(false);
  const crossed = useRef(false);

  // slider is log-scale: v in 0..1 → f = 440^v  (1 Hz → 440 Hz)
  const v = dials.v as number;
  const f = Math.pow(440, v);

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const hp = new Tone.Filter(25, "highpass").toDestination();
    const osc = new Tone.PulseOscillator({ frequency: f, width: 0.98, volume: -4 }).connect(hp).start();
    nodes.current = { osc, hp };
    emit("playStarted");
    return () => { osc.stop().dispose(); hp.dispose(); nodes.current = null; sweeping.current = false; };
  }, [dials.playing]);

  useEffect(() => {
    if (nodes.current) nodes.current.osc.frequency.rampTo(f, 0.05);
    if (f >= 45 && !crossed.current) { crossed.current = true; emit("becamePitch"); }
    if (f < 30) crossed.current = false;
  }, [f]);

  // draw the click train (2-second window)
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    const windowS = 2;
    const n = Math.floor(f * windowS);
    x.strokeStyle = "#8fd6a0"; x.lineWidth = Math.max(0.6, Math.min(3, w / (n * 3)));
    if (n <= w) {
      for (let i = 0; i < n; i++) {
        const px = (i / n) * w;
        x.beginPath(); x.moveTo(px, h * 0.15); x.lineTo(px, h * 0.85); x.stroke();
      }
    } else { x.fillStyle = "rgba(143,214,160,.8)"; x.fillRect(0, h * 0.15, w, h * 0.7); }
    x.fillStyle = "#9a968a"; x.font = "12px monospace";
    x.fillText("← 2 seconds of clicks →", 8, h - 6);
  }, [f]);

  function sweep() {
    if (!dials.playing) setDial("playing", true);
    if (sweeping.current) return;
    sweeping.current = true;
    const t0 = performance.now();
    const v0 = dials.v as number;
    const DUR = 22000;
    function tick(now: number) {
      if (!sweeping.current) return;
      const p = Math.min(1, (now - t0) / DUR);
      setDial("v", v0 + (1 - v0) * p);
      if (p < 1) requestAnimationFrame(tick); else sweeping.current = false;
    }
    requestAnimationFrame(tick);
  }

  const zone =
    f < 14 ? { label: "RHYTHM", note: `${f.toFixed(1)} clicks/sec — that's ${(f * 60).toFixed(0)} BPM` } :
    f < 45 ? { label: "the in-between flutter", note: "too fast to count, too slow to sing…" } :
    { label: "PITCH!", note: `${f.toFixed(0)} Hz — near ${midiName(Math.round(69 + 12 * Math.log2(f / 440)))}` };

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={110} />
      <div className="dialrow">
        <button className="primary" onClick={() => { sweeping.current = false; setDial("playing", !dials.playing); }}>
          {dials.playing ? "■ stop" : "▶ start clicking"}
        </button>
        <button onClick={sweep} disabled={locked.has("v")}>🚀 auto-sweep (22s)</button>
        <label className="dial" style={{ flex: 3 }}>
          <span>speed</span>
          <input type="range" min={0} max={1} step={0.001} value={v} disabled={locked.has("v")}
            onChange={(e) => { sweeping.current = false; setDial("v", parseFloat(e.target.value)); }} />
        </label>
      </div>
      <div className="readout">
        <div className="chip" style={{ minWidth: 200 }}><div className="k">what your ear calls it</div><div className="v">{zone.label}</div></div>
        <div className="chip" style={{ flex: 1 }}><div className="k">the numbers</div><div className="v" style={{ fontSize: 18 }}>{zone.note}</div></div>
      </div>
      <p className="smallnote">
        Nothing changes but the speed. Slow clicks are a <b>beat</b>; the same clicks, fast enough,
        become a <b>note</b>. Rhythm and pitch are one thing at two speeds — the time thread and the
        sound thread were the same thread all along.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "speed-trick",
  title: "The Speed Trick",
  blurb: "Speed a beat up until it becomes a note. (!)",
  thread: "time",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    v: { type: "slider", min: 0, max: 1, step: 0.001, default: 0.12, label: "speed (log)" },
  },
  component: Comp,
};
