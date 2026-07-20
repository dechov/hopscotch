import { useEffect, useRef, useState } from "react";
import { Tone } from "../audio/engine";
import { useMic, MicGate } from "./mic";
import type { ToyDef, ToyInnerProps } from "./types";

function Comp({ dials, setDial, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mic = useMic({ fft: 1024 });
  const raf = useRef(0);
  const f0Ref = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    if (!mic.on) return;
    const c = canvas.current!; const x = c.getContext("2d")!;
    const w = c.width, h = c.height;
    function frame() {
      const s = mic.nodes.current; if (!s?.fft) return;
      const vals = s.fft.getValue() as Float32Array;
      const sr = Tone.getContext().sampleRate;
      const [pitch, clarity] = mic.pitch();
      if (clarity > 0.9 && pitch > 60 && pitch < 1500) { f0Ref.current = pitch; emit("fundamentalDetected"); }
      x.clearRect(0, 0, w, h);
      // spectrum (log-ish view of first ~4kHz)
      const maxBin = Math.floor((4000 / (sr / 2)) * vals.length);
      x.fillStyle = "#9ad0e8";
      for (let i = 0; i < maxBin; i++) {
        const db = vals[i] as number;
        const v = Math.max(0, (db + 100) / 70);
        const px = (i / maxBin) * w;
        x.fillRect(px, h - v * h, Math.max(1, w / maxBin - 1), v * h);
      }
      // harmonic comb
      if (dials.comb && f0Ref.current) {
        for (let k = 1; k <= 10; k++) {
          const f = f0Ref.current * k; if (f > 4000) break;
          const px = (f / 4000) * w;
          x.strokeStyle = k === 1 ? "#f2c14e" : "rgba(242,193,78,.5)";
          x.lineWidth = k === 1 ? 3 : 1.5;
          x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke();
        }
        x.fillStyle = "#f2c14e"; x.font = "14px monospace";
        x.fillText(`${f0Ref.current.toFixed(0)} Hz`, (f0Ref.current / 4000) * w + 4, 16);
      }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [mic.on, dials.comb]);

  return (
    <div>
      <MicGate on={mic.on} err={mic.err} enable={async () => { if (await mic.enable()) emit("micOn"); }}
        hint={'Sing "ahh" and watch your own helpers appear.'}>
        <>
          <canvas ref={canvas} className="scope" width={760} height={160} style={{ height: 160 }} />
          <div className="dialrow">
            <label className="dial" style={{ minWidth: 130 }}><span>harmonic comb</span>
              <button onClick={() => setDial("comb", !dials.comb)}>{dials.comb ? "on" : "off"}</button></label>
          </div>
          <p className="smallnote">The tallest golden line = your fundamental. The fainter lines = its helpers, at exact multiples. Try "ahh" vs "ooo" — same spike, different helpers. That's what a vowel is!</p>
        </>
      </MicGate>
    </div>
  );
}

export const def: ToyDef = {
  id: "spectrum-scope",
  title: "See Your Sound",
  blurb: "Sing into the mic — watch your fundamental and its helpers.",
  thread: "timbre",
  exclusive: true,
  dials: { comb: { type: "toggle", default: true, label: "harmonic comb" } },
  component: Comp,
};
