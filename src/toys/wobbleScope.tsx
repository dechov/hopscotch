import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);

  const f1 = dials.f1 as number;
  const f2 = f1 + (dials.delta as number);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!;
    const w = c.width, h = c.height;
    const start = performance.now();
    const SLOW = 55; // dots spin 55× slower than the real sounds
    function frame(now: number) {
      const t = (now - start) / 1000;
      x.clearRect(0, 0, w, h);
      const cx1 = w * 0.3, cx2 = w * 0.7, cy = h / 2, r = h / 2 - 14;
      const a1 = 2 * Math.PI * (f1 / SLOW) * t;
      const a2 = 2 * Math.PI * (f2 / SLOW) * t;
      // rings
      x.strokeStyle = "rgba(244,241,232,.25)";
      [cx1, cx2].forEach(cx0 => { x.beginPath(); x.arc(cx0, cy, r, 0, Math.PI * 2); x.stroke(); });
      // aligned flash
      const diff = Math.abs(((a1 - a2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI));
      const aligned = diff < 0.12 || diff > 2 * Math.PI - 0.12;
      if (aligned) { x.fillStyle = "rgba(242,193,78,.18)"; x.fillRect(0, 0, w, h); }
      // dots
      const dot = (cx0: number, a: number, col: string) => {
        x.fillStyle = col; x.beginPath();
        x.arc(cx0 + r * Math.cos(a), cy + r * Math.sin(a), 8, 0, Math.PI * 2); x.fill();
      };
      dot(cx1, a1, "#9ad0e8"); dot(cx2, a2, "#f08a6b");
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [f1, f2]);

  useEffect(() => {
    if (!dials.sound || !isArmed()) return;
    const a = new Tone.Oscillator({ frequency: f1, volume: -16 }).toDestination().start();
    const b = new Tone.Oscillator({ frequency: f2, volume: -16 }).toDestination().start();
    return () => { a.stop().dispose(); b.stop().dispose(); };
  }, [dials.sound, f1, f2]);

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={130} />
      <div className="dialrow">
        <label className="dial"><span>difference: <b style={{color:"var(--chalk)"}}>{dials.delta} Hz</b></span>
          <input type="range" min={0} max={12} step={0.5} value={dials.delta} disabled={locked.has("delta")}
            onChange={(e) => setDial("delta", parseFloat(e.target.value))} /></label>
        <label className="dial" style={{minWidth:90}}><span>sound</span>
          <button onClick={() => setDial("sound", !dials.sound)}>{dials.sound ? "on" : "off"}</button></label>
      </div>
      <p className="smallnote">Two spinning dots — the screen flashes each time they line up. The wobble you hear IS the lining-up, {dials.delta} times a second. (Dots slowed 55× so eyes can follow.)</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "wobble-scope",
  title: "Wobble Scope",
  blurb: "See the beats: two spinning dots that flash when they line up.",
  thread: "sound",
  dials: {
    f1:    { type: "slider", min: 110, max: 330, step: 1, default: 220, label: "first sound (Hz)" },
    delta: { type: "slider", min: 0, max: 12, step: 0.5, default: 3, label: "difference (Hz)" },
    sound: { type: "toggle", default: false, label: "sound" },
  },
  component: Comp,
};
