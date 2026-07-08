import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

/** The same ratio, slowed down: 3:2 as a leap when fast, a gallop when slow. */
function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const t0 = useRef(0);

  const [a, b] = (dials.ratio as string).split(":").map(Number); // a:b with a > b
  const speed = dials.speed as number;      // revolutions/sec of the SLOW wheel
  const rSlow = speed, rFast = speed * a / b;

  // audio: two loops on the shared transport
  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const boom = new Tone.MembraneSynth({ volume: -6 }).toDestination();
    const tick = new Tone.MembraneSynth({ pitchDecay: 0.006, octaves: 1.5, volume: -10 }).toDestination();
    const t = Tone.getTransport();
    const loopSlow = new Tone.Loop((time) => boom.triggerAttackRelease("C2", "16n", time), 1 / rSlow).start(0);
    const loopFast = new Tone.Loop((time) => tick.triggerAttackRelease("A4", "32n", time), 1 / rFast).start(0);
    t.start();
    t0.current = performance.now();
    emit("playStarted");
    return () => { loopSlow.dispose(); loopFast.dispose(); t.stop(); boom.dispose(); tick.dispose(); };
  }, [dials.playing, dials.ratio, dials.speed]);

  // wheels
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    function frame(now: number) {
      const t = dials.playing ? (now - t0.current) / 1000 : 0;
      x.clearRect(0, 0, w, h);
      const draw = (cx: number, rate: number, ticks: number, col: string, label: string) => {
        const r = h / 2 - 20, cy = h / 2 + 4;
        x.strokeStyle = "rgba(244,241,232,.25)"; x.lineWidth = 1.5;
        x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
        for (let i = 0; i < ticks; i++) {
          const ang = -Math.PI / 2 + (i / ticks) * Math.PI * 2;
          x.fillStyle = "rgba(244,241,232,.4)";
          x.beginPath(); x.arc(cx + r * Math.cos(ang), cy + r * Math.sin(ang), 3, 0, Math.PI * 2); x.fill();
        }
        const ang = -Math.PI / 2 + 2 * Math.PI * rate * t;
        x.fillStyle = col;
        x.beginPath(); x.arc(cx + r * Math.cos(ang), cy + r * Math.sin(ang), 9, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#9a968a"; x.font = "13px monospace"; x.textAlign = "center";
        x.fillText(label, cx, 14);
      };
      draw(w * 0.28, rSlow, b, "#9ad0e8", `slow wheel ×${b}`);
      draw(w * 0.72, rFast, a, "#f08a6b", `fast wheel ×${a}`);
      // alignment flash: both dots at top together
      const phase = (rSlow * t) % 1, phase2 = (rFast * t) % 1;
      if (dials.playing && phase < 0.03 && phase2 < 0.03) { x.fillStyle = "rgba(242,193,78,.15)"; x.fillRect(0, 0, w, h); }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [rSlow, rFast, a, b, dials.playing]);

  function hearAsPitch() {
    if (!isArmed()) return;
    const o1 = new Tone.Oscillator({ frequency: 220, volume: -14 }).toDestination().start();
    const o2 = new Tone.Oscillator({ frequency: 220 * a / b, volume: -14 }).toDestination().start();
    setTimeout(() => { o1.stop().dispose(); o2.stop().dispose(); }, 1400);
    emit("heardAsPitch");
  }

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={150} style={{ height: 150 }} />
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ spin the wheels"}</button>
        <label className="dial" style={{ minWidth: 120 }}><span>ratio</span>
          <select disabled={locked.has("ratio")} value={dials.ratio} onChange={e => setDial("ratio", e.target.value)}>
            <option value="2:1">2:1 (fly)</option>
            <option value="3:2">3:2 (leap)</option>
            <option value="4:3">4:3 (jump)</option>
            <option value="5:4">5:4 (skip)</option>
          </select></label>
        <label className="dial"><span>speed: <b style={{ color: "var(--chalk)" }}>{speed.toFixed(1)}/s</b></span>
          <input type="range" min={0.4} max={2.4} step={0.1} value={speed} disabled={locked.has("speed")}
            onChange={e => setDial("speed", parseFloat(e.target.value))} /></label>
        <button onClick={hearAsPitch}>⚡ same ratio as PITCH</button>
      </div>
      <p className="smallnote">
        {a} ticks against {b} booms — the famous <b>{a}-over-{b}</b> groove. Now press ⚡:
        the exact same {a}:{b}, three hundred times faster, is the <b>{["", "", "fly", "leap", "jump", "skip"][a] ?? "interval"}</b> from
        square 2. One ratio, two disguises. (The gold flash = the wheels meeting — every {b} booms.)
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "slow-ratios",
  title: "Ratios in Slow Motion",
  blurb: "3:2 is a leap when fast — and a gallop when slow.",
  thread: "time",
  dials: {
    playing: { type: "toggle", default: false, label: "playing" },
    ratio:   { type: "select", default: "3:2", label: "ratio", options: [
      { value: "2:1", label: "2:1" }, { value: "3:2", label: "3:2" }, { value: "4:3", label: "4:3" }, { value: "5:4", label: "5:4" }] },
    speed:   { type: "slider", min: 0.4, max: 2.4, step: 0.1, default: 0.8, label: "speed" },
  },
  component: Comp,
};
