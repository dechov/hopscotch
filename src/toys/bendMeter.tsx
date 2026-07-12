import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

const TARGETS = [
  { name: "6:5 pure hop", cents: 315.64, zone: "m3-pure" },
  { name: "11:9 blue",    cents: 347.41, zone: "blue" },
  { name: "5:4 pure skip", cents: 386.31, zone: "M3-pure" },
];

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const oscs = useRef<{ a: Tone.Oscillator; b: Tone.Oscillator } | null>(null);
  const home = dials.homeHz as number;
  const cents = dials.cents as number;
  const freq = home * Math.pow(2, cents / 1200);
  let nearestT = TARGETS[0]; let nd = 1e9;
  for (const t of TARGETS) { const d = Math.abs(t.cents - cents); if (d < nd) { nd = d; nearestT = t; } }

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    const map = (cc: number) => ((cc - 300) / 100) * w;
    x.font = "12px monospace";
    TARGETS.forEach(t => {
      const px = map(t.cents);
      x.strokeStyle = "rgba(244,241,232,.25)"; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke();
      x.fillStyle = "#9a968a"; x.fillText(t.name, px + 3, 14);
    });
    const cx = map(cents);
    x.strokeStyle = "#4fa3d1"; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx, h); x.stroke();
    x.strokeStyle = "rgba(79,163,209,.7)"; x.lineWidth = 2; x.beginPath();
    for (let px = 0; px < w; px++) {
      const t = (px / w) * Math.PI * 2 * 6;
      const y = (Math.sin(t) + Math.sin(t * freq / home)) / 2;
      x.lineTo(px, h / 2 - y * (h / 2 - 16));
    }
    x.stroke();
  }, [cents, freq, home]);

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const a = new Tone.Oscillator({ frequency: home, volume: -14 }).toDestination().start();
    const b = new Tone.Oscillator({ frequency: freq, volume: -14 }).toDestination().start();
    oscs.current = { a, b };
    emit("playStarted");
    return () => { a.stop().dispose(); b.stop().dispose(); oscs.current = null; };
  }, [dials.playing]);

  useEffect(() => {
    if (oscs.current) oscs.current.b.frequency.rampTo(freq, 0.04);
    if (nd < 4) emit(`zone:${nearestT.zone}`);
  }, [freq]);

  const note =
    cents < 308 ? "On the fret — already only ~16¢ shy of the pure hop. A hair of bend perfects it." :
    cents < 332 ? "Resting on the PURE HOP (6:5) — sweet and settled." :
    cents < 367 ? "The BLUE ZONE (~11:9) — between hop and skip. No fret can play this. It sings." :
    cents < 395 ? "Reaching the PURE SKIP (5:4) — very bright, very pure." :
    "At the next fret (400¢) — bend complete, back on the grid.";

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={130} />
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ home + note"}</button>
        <label className="dial" style={{ flex: 3 }}>
          <span>bend: <b style={{color:"var(--chalk)"}}>{cents - 300}¢ above the fret</b></span>
          <input type="range" min={300} max={400} step={1} value={cents} disabled={locked.has("cents")}
            onChange={(e) => setDial("cents", parseFloat(e.target.value))} />
        </label>
      </div>
      <div className="readout">
        <div className="chip"><div className="k">from home</div><div className="v">{cents}¢</div></div>
        <div className="chip"><div className="k">nearest pure spot</div><div className="v">{nearestT.name.split(" ")[0]}</div></div>
        <div className="chip"><div className="k">off by</div><div className="v">{Math.round(nd)}¢</div></div>
      </div>
      <p className="smallnote">{note}</p>
      <p className="smallnote">A <b>¢</b> ("cent") is a scoot sliced into 100 equal bits — so each fret step is exactly 100¢.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "bend-meter",
  title: "Bend Meter",
  blurb: "The fret is a compromise — bend past it toward the pure ratios.",
  thread: "sound",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    homeHz:  { type: "slider", min: 110, max: 330, step: 1, default: 220, label: "home (Hz)" },
    cents:   { type: "slider", min: 300, max: 400, step: 1, default: 300, label: "bend (cents)" },
  },
  component: Comp,
};
