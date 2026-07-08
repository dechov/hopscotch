import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

/**
 * An honest ideal string: pluck it anywhere (harmonic amps = sin(kπp)/k),
 * or touch a node while plucking to isolate harmonics — like real guitar harmonics.
 */
const K = 8; // harmonics modeled

function amps(p: number, touch: number): number[] {
  const raw = Array.from({ length: K }, (_, i) => {
    const k = i + 1;
    let a = Math.abs(Math.sin(k * Math.PI * p)) / k;
    if (touch > 1 && k % touch !== 0) a = 0; // touching at 1/n silences non-multiples of n
    return a;
  });
  const max = Math.max(...raw, 1e-6);
  return raw.map(a => a / max);
}

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const live = useRef<{ oscs: Tone.Oscillator[]; gains: Tone.Gain[] }>({ oscs: [], gains: [] });
  const anim = useRef<{ amps: number[]; t0: number } | null>(null);

  const f0 = parseFloat(dials.openF);
  const p = dials.pluckPos as number;
  const touch = parseInt(dials.touch);
  const A = amps(p, touch);

  function killVoices() {
    live.current.oscs.forEach(o => { try { o.stop().dispose(); } catch {} });
    live.current.gains.forEach(g => { try { g.dispose(); } catch {} });
    live.current = { oscs: [], gains: [] };
  }
  useEffect(() => () => { killVoices(); cancelAnimationFrame(raf.current); }, []);

  function pluck() {
    if (!isArmed()) return;
    killVoices();
    const now = Tone.now();
    A.forEach((a, i) => {
      if (a < 0.01) return;
      const k = i + 1;
      const g = new Tone.Gain(0).toDestination();
      const o = new Tone.Oscillator({ frequency: f0 * k, volume: -14 }).connect(g).start(now);
      g.gain.setValueAtTime(a * 0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 3.2 / Math.sqrt(k)); // high harmonics die faster
      o.stop(now + 3.4);
      live.current.oscs.push(o); live.current.gains.push(g);
    });
    anim.current = { amps: [...A], t0: performance.now() };
    emit("plucked");
    if (touch > 1) emit(`touched:${touch}`);
  }

  // standing-wave animation (time slowed ~160×, damped)
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    function frame(now: number) {
      x.clearRect(0, 0, w, h);
      // string anchors
      x.fillStyle = "#9a968a";
      x.beginPath(); x.arc(10, h / 2, 5, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(w - 10, h / 2, 5, 0, Math.PI * 2); x.fill();
      // pluck-position marker
      const px = 10 + p * (w - 20);
      x.strokeStyle = "rgba(242,193,78,.5)"; x.setLineDash([4, 4]);
      x.beginPath(); x.moveTo(px, 8); x.lineTo(px, h - 8); x.stroke(); x.setLineDash([]);
      // touch marker
      if (touch > 1) {
        const tx = 10 + (1 / touch) * (w - 20);
        x.fillStyle = "rgba(154,208,232,.9)";
        x.beginPath(); x.arc(tx, h / 2, 7, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#9a968a"; x.font = "12px monospace"; x.textAlign = "center";
        x.fillText(`finger at 1/${touch}`, tx, h - 6);
      }
      // the string
      const st = anim.current;
      x.strokeStyle = "#f4f1e8"; x.lineWidth = 2; x.beginPath();
      for (let i = 0; i <= 200; i++) {
        const xi = i / 200;
        let y = 0;
        if (st) {
          const t = (now - st.t0) / 1000;
          const damp = Math.exp(-t / 2.2);
          for (let ki = 0; ki < K; ki++) {
            const k = ki + 1;
            y += st.amps[ki] * Math.sin(k * Math.PI * xi) * Math.cos(2 * Math.PI * (f0 / 160) * k * t) * Math.exp(-t * Math.sqrt(k) / 3);
          }
          y *= damp * (h / 2 - 12) / 2.2;
        }
        const X = 10 + xi * (w - 20);
        if (i === 0) x.moveTo(X, h / 2 - y); else x.lineTo(X, h / 2 - y);
      }
      x.stroke();
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [p, touch, f0]);

  const touchNote =
    touch === 2 ? "only even helpers survive → you hear the FLY (octave up)" :
    touch === 3 ? "only every-3rd helper survives → a fly + a leap up" :
    touch === 4 ? "only every-4th survives → TWO flies up" :
    "all the helpers ring — the full family";

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={140} style={{ height: 140, cursor: "pointer" }}
        onPointerDown={(e) => {
          const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
          const np = Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width));
          if (!locked.has("pluckPos")) setDial("pluckPos", Math.round(np * 100) / 100);
          setTimeout(pluck, 0);
        }} />
      <div className="dialrow">
        <button className="primary" onClick={pluck}>🎸 pluck</button>
        <label className="dial" style={{ minWidth: 110 }}><span>string</span>
          <select disabled={locked.has("openF")} value={dials.openF} onChange={e => setDial("openF", e.target.value)}>
            <option value="110">A (110 Hz)</option>
            <option value="146.83">D (147 Hz)</option>
            <option value="196">G (196 Hz)</option>
          </select></label>
        <label className="dial"><span>pluck at: <b style={{ color: "var(--chalk)" }}>{Math.round(p * 100)}%</b></span>
          <input type="range" min={0.05} max={0.95} step={0.01} value={p} disabled={locked.has("pluckPos")}
            onChange={e => setDial("pluckPos", parseFloat(e.target.value))} /></label>
        <label className="dial" style={{ minWidth: 140 }}><span>touch the string</span>
          <select disabled={locked.has("touch")} value={dials.touch} onChange={e => setDial("touch", e.target.value)}>
            <option value="1">nowhere (open)</option>
            <option value="2">at 1/2 (12th fret)</option>
            <option value="3">at 1/3 (7th fret)</option>
            <option value="4">at 1/4 (5th fret)</option>
          </select></label>
      </div>
      <div className="readout">
        {A.map((a, i) => (
          <div className="chip" key={i} style={{ minWidth: 56, flex: 1, opacity: a < 0.01 ? 0.25 : 1 }}>
            <div className="k">×{i + 1}</div>
            <div style={{ height: 34, display: "flex", alignItems: "flex-end" }}>
              <div style={{ width: "100%", height: `${a * 100}%`, background: "var(--sound)", borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
      <p className="smallnote">
        <b>{touchNote}.</b> Click anywhere on the string to pluck there — near the end = bright
        (lots of helpers), the middle = round (the middle is a silent spot for every even helper).
        Now go do the real thing: touch a guitar string lightly over the 12th fret and pluck.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "pluck-string",
  title: "Pluck the String",
  blurb: "A real string: pluck position + touch-harmonics, honestly modeled.",
  thread: "timbre",
  dials: {
    openF:    { type: "select", default: "110", label: "string", options: [
      { value: "110", label: "A" }, { value: "146.83", label: "D" }, { value: "196", label: "G" }] },
    pluckPos: { type: "slider", min: 0.05, max: 0.95, step: 0.01, default: 0.2, label: "pluck position" },
    touch:    { type: "select", default: "1", label: "touch", options: [
      { value: "1", label: "open" }, { value: "2", label: "1/2" }, { value: "3", label: "1/3" }, { value: "4", label: "1/4" }] },
  },
  component: Comp,
};
