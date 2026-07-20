import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import { RATIOS } from "../content/glossary";
import { Readout } from "./Readout";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

// Lissajous knots: one tone drives left-right, the other up-down. Resting ratios draw a
// closed knot that holds still; lean the ratio and the knot tumbles — rest/lean for the eyes.
function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const oscs = useRef<{ a: Tone.Oscillator; b: Tone.Oscillator } | null>(null);
  const phase = useRef(0);
  const raf = useRef(0);
  const [a, b] = (dials.ratio as string).split(":").map(Number);
  const lean = dials.lean as number; // cents of detune on the upper tone
  const base = 220;
  const fA = base * a / b * Math.pow(2, lean / 1200), fB = base;

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const oa = new Tone.Oscillator({ frequency: fA, volume: -16 }).toDestination().start();
    const ob = new Tone.Oscillator({ frequency: fB, volume: -16 }).toDestination().start();
    oscs.current = { a: oa, b: ob };
    emit("playStarted");
    return () => { oa.stop().dispose(); ob.stop().dispose(); oscs.current = null; };
  }, [dials.playing]);
  useEffect(() => { oscs.current?.a.frequency.rampTo(fA, 0.05); oscs.current?.b.frequency.rampTo(fB, 0.05); }, [fA, fB]);

  useEffect(() => {
    const c = canvas.current!; const x = c.getContext("2d")!;
    const w = c.width, h = c.height, cx = w / 2, cy = h / 2, R = h / 2 - 16;
    function frame() {
      // the knot tumbles at the lean rate: phase drifts by the detune frequency
      phase.current += (fA - base * a / b) * 0.05;
      x.fillStyle = "rgba(38,40,44,.35)"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "#9ad0e8"; x.lineWidth = 2; x.beginPath();
      for (let i = 0; i <= 1200; i++) {
        const t = (i / 1200) * Math.PI * 2;
        x.lineTo(cx + R * Math.sin(a * t + phase.current), cy + R * Math.sin(b * t));
      }
      x.stroke();
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [a, b, fA]);

  const name = RATIOS.find(r => r.a === a && r.b === b)?.name ?? "";
  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={230} />
      <Readout items={[["ratio", `${a}:${b} — ${name}`], ["lean", `${lean}¢ → ${lean === 0 ? "the knot holds still" : "the knot tumbles"}`]]} />
      <Dials names={["playing", "ratio", "lean"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">
        One tone pushes the dot left-right, the other up-down. A <b>resting</b> ratio traces the same
        closed knot forever — the curve literally rests. Add a little <b>lean</b> and the knot starts
        to tumble at exactly the wobble rate. Rest and lean, drawn instead of heard — the third face
        of Two Tone and the Wobble Scope.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "knots",
  title: "Sound Knots",
  blurb: "Two tones draw one curve — resting ratios knot, leaning ones tumble.",
  thread: "sound",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    ratio: { type: "select", default: "3:2", label: "ratio", options: RATIOS.filter(r => r.a !== 1).map(r => ({ value: `${r.a}:${r.b}`, label: `${r.a}:${r.b} — ${r.name}` })) },
    lean: { type: "slider", min: 0, max: 30, step: 1, default: 0, label: "lean (¢)" },
  },
  component: Comp,
};
