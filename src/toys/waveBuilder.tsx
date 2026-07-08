import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const nodes = useRef<{ osc: Tone.Oscillator; filt: Tone.Filter } | null>(null);

  const partials = (n: number) => Array.from({ length: n }, (_, i) => (1 / (i + 1)));

  // draw
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h); x.strokeStyle = "#f2c14e"; x.lineWidth = 2; x.beginPath();
    const n = dials.helpers; let norm = 0; for (let k = 1; k <= n; k++) norm += 1 / k;
    for (let px = 0; px < w; px++) {
      const t = (px / w) * Math.PI * 4; let y = 0;
      for (let k = 1; k <= n; k++) y += Math.sin(t * k) / k;
      y /= norm;
      x.lineTo(px, h / 2 - y * (h / 2 - 10));
    }
    x.stroke();
  }, [dials.helpers]);

  // audio
  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const filt = new Tone.Filter(dials.muffle, "lowpass").toDestination();
    const osc = new Tone.Oscillator({ frequency: dials.baseHz, volume: -10 });
    osc.partials = partials(dials.helpers);
    osc.connect(filt).start();
    nodes.current = { osc, filt };
    emit("playStarted");
    return () => { osc.stop().dispose(); filt.dispose(); nodes.current = null; };
  }, [dials.playing]);

  useEffect(() => { if (nodes.current) nodes.current.osc.partials = partials(dials.helpers); if (dials.helpers >= 5) emit("helpers5"); }, [dials.helpers]);
  useEffect(() => { if (nodes.current) nodes.current.filt.frequency.rampTo(dials.muffle, 0.05); if (dials.muffle <= 700) emit("muffled"); }, [dials.muffle]);

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={120} />
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>
          {dials.playing ? "■ stop" : "▶ play"}
        </button>
      </div>
      <Dials names={["helpers", "muffle"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">1 helper = a lonely wave. More helpers = the same note, richer. The muffle knob quietly takes the helpers away again.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "wave-builder",
  title: "Wave Builder",
  blurb: "A lonely wave vs. a wave with helpers (harmonics).",
  thread: "sound",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    helpers: { type: "slider", min: 1, max: 10, step: 1, default: 1, label: "helpers stacked on" },
    muffle:  { type: "slider", min: 200, max: 8000, step: 10, default: 8000, label: "muffle (filter)" },
    baseHz:  { type: "slider", min: 110, max: 440, step: 1, default: 196, label: "base pitch (Hz)" },
  },
  component: Comp,
};
