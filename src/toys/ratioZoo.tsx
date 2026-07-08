import { useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import { RATIOS } from "../content/glossary";
import type { ToyDef, ToyInnerProps } from "./types";

function Card({ a, b, name, showMath, onPlay }: { a: number; b: number; name: string; showMath: boolean; onPlay: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // draw two sines for b cycles of the low one
  function draw() {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    const cycles = b;
    [["#9ad0e8", 1], ["#f08a6b", a / b]].forEach(([col, mult]: any) => {
      x.strokeStyle = col; x.lineWidth = 1.6; x.beginPath();
      for (let px = 0; px < w; px++) {
        const t = (px / w) * Math.PI * 2 * cycles * mult;
        x.lineTo(px, h / 2 - Math.sin(t) * (h / 2 - 4));
      }
      x.stroke();
    });
  }
  setTimeout(draw, 0);
  return (
    <div className="chip" style={{ flex: 1, minWidth: 150, cursor: "pointer" }} onClick={onPlay}>
      <div className="v">{a}:{b} — {name}</div>
      <canvas ref={canvas} width={220} height={54} style={{ width: "100%", height: 54 }} />
      {showMath && <div className="k">meet again after {b} low wiggle{b > 1 ? "s" : ""} = {a} high</div>}
      <div className="k">▶ tap to hear</div>
    </div>
  );
}

function Comp({ dials, setDial, emit }: ToyInnerProps) {
  function play(a: number, b: number) {
    if (!isArmed()) return;
    const root = 220;
    const o1 = new Tone.Oscillator({ frequency: root, volume: -14 }).toDestination().start();
    const o2 = new Tone.Oscillator({ frequency: root * a / b, volume: -14 }).toDestination().start();
    setTimeout(() => { o1.stop().dispose(); o2.stop().dispose(); }, 1400);
    emit("dyadPlayed");
  }
  return (
    <div>
      <div className="readout">
        {RATIOS.filter(r => r.a !== 1 || r.b !== 1).map(r => (
          <Card key={`${r.a}${r.b}`} a={r.a} b={r.b} name={r.name} showMath={dials.math} onPlay={() => play(r.a, r.b)} />
        ))}
      </div>
      <div className="dialrow">
        <label className="dial" style={{ minWidth: 130 }}><span>show the math</span>
          <button onClick={() => setDial("math", !dials.math)}>{dials.math ? "on" : "off"}</button></label>
      </div>
      <p className="smallnote">Small numbers = the waves meet again soon = resting. Bigger numbers = longer to meet = more shimmer.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "ratio-zoo",
  title: "Ratio Zoo",
  blurb: "Meet the resting spots: 2:1, 3:2, 4:3, 5:4, 6:5, 5:3.",
  thread: "sound",
  dials: { math: { type: "toggle", default: false, label: "show math" } },
  component: Comp,
};
