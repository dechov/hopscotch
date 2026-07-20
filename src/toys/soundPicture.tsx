import { useEffect, useRef, useState } from "react";
import { Tone } from "../audio/engine";
import { useMic, MicGate } from "./mic";
import type { ToyDef, ToyInnerProps } from "./types";

// A spectrogram: the log-frequency ruler finally gets its time axis. Frequency runs up the
// left edge (log₂, like every pitch picture in the app), time scrolls right-to-left,
// brightness = energy. Harmonics appear as parallel stripes; a melody is a drawn line.
const W = 760, H = 240;
const F_LO = 80, OCTS = 6; // 80 Hz … ~5120 Hz
const yOfF = (f: number) => H - (Math.log2(f / F_LO) / OCTS) * H;

function Comp({ dials, setDial, emit, locked }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const mic = useMic({ fft: 2048 });
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    if (!mic.on) return;
    const c = canvas.current!; const x = c.getContext("2d")!;
    x.fillStyle = "#26282c"; x.fillRect(0, 0, W, H);
    const COL = 2;
    function frame() {
      const s = mic.nodes.current; if (!s?.fft) return;
      if (!dials.frozen) {
        const vals = s.fft.getValue() as Float32Array;
        const sr = Tone.getContext().sampleRate;
        // scroll left, draw the newest moment as a column on the right
        x.drawImage(c, -COL, 0);
        for (let py = 0; py < H; py++) {
          const f = F_LO * Math.pow(2, ((H - py) / H) * OCTS);
          const bin = Math.min(vals.length - 1, Math.round((f / (sr / 2)) * vals.length));
          const v = Math.max(0, Math.min(1, ((vals[bin] as number) + 100) / 70));
          x.fillStyle = `rgb(${38 + v * 200},${40 + v * 168},${44 + v * 120})`; // dark → warm chalk
          x.fillRect(W - COL, py, COL, 1);
        }
        if (dials.trace) {
          const [pitch, clarity] = mic.pitch();
          if (clarity > 0.9 && pitch > F_LO && pitch < F_LO * Math.pow(2, OCTS)) {
            x.fillStyle = "#f2c14e";
            x.fillRect(W - COL, yOfF(pitch) - 1.5, COL, 3);
            emit("voiceTraced");
          }
        }
        // octave gridlines + labels (A2…A6 at 110·2^k)
        for (let k = 0; k < OCTS; k++) {
          const f = 110 * Math.pow(2, k);
          x.fillStyle = "rgba(244,241,232,.25)"; x.fillRect(W - COL, yOfF(f), COL, 1);
        }
      }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [mic.on, dials.frozen, dials.trace]);

  return (
    <div>
      <MicGate on={mic.on} err={mic.err} enable={async () => { if (await mic.enable()) emit("micOn"); }}
        hint="Then sing, whistle, hum — and watch sound become a picture.">
        <>
          <div style={{ position: "relative" }}>
            <canvas ref={canvas} className="scope" width={W} height={H} style={{ height: H }} />
            <span className="smallnote" style={{ position: "absolute", left: 6, top: 4 }}>high</span>
            <span className="smallnote" style={{ position: "absolute", left: 6, bottom: 4 }}>low · time →</span>
          </div>
          <div className="dialrow">
            <label className="dial" style={{ minWidth: 120 }}><span>voice trace</span>
              <button disabled={locked.has("trace")} onClick={() => setDial("trace", !dials.trace)}>{dials.trace ? "on" : "off"}</button></label>
            <label className="dial" style={{ minWidth: 120 }}><span>freeze</span>
              <button disabled={locked.has("frozen")} onClick={() => setDial("frozen", !dials.frozen)}>{dials.frozen ? "frozen" : "live"}</button></label>
          </div>
          <p className="smallnote">
            Up = higher (the same log ruler as everywhere else — each octave the same height), left = the
            past. Hum a note: the bright stripes above your gold trace are your <b>helpers</b>, at exact
            multiples. Sing a scoot, then a leap — you can <i>read the moves</i> right off the picture.
            Whistle for one clean line; say "shhh" for a waterfall of everything at once.
          </p>
        </>
      </MicGate>
    </div>
  );
}

export const def: ToyDef = {
  id: "sound-picture",
  title: "Sound Picture",
  blurb: "A spectrogram: your sound drawn in time — melody as a line, helpers as stripes.",
  thread: "timbre",
  exclusive: true,
  dials: {
    trace:  { type: "toggle", default: true, label: "voice trace" },
    frozen: { type: "toggle", default: false, label: "freeze" },
  },
  component: Comp,
};
