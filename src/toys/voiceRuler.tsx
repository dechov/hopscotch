import { useEffect, useRef, useState } from "react";
import { midiName } from "../audio/notes";
import { useMic, MicGate } from "./mic";
import type { ToyDef, ToyInnerProps } from "./types";

// Your voice on the log-pitch ruler: the theremin in reverse. Pitchy tracks the mic; the
// gold trace is your real, continuous pitch — gliding through everything between the bands.
// The "auto-tune" toggle draws a second, blue trace snapped to the 12-EDO grid, so you can
// SEE what quantizing a voice keeps and what it throws away (FIRST-PRINCIPLES §5b).
const W = 760, H = 240;
const M_LO = 40, M_HI = 84; // E2 … C6
const yOfM = (m: number) => H - ((m - M_LO) / (M_HI - M_LO)) * H;
const BLACK = new Set([1, 3, 6, 8, 10]);

function Comp({ dials, setDial, emit, locked }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [reading, setReading] = useState("—");
  const mic = useMic();
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    if (!mic.on) return;
    const c = canvas.current!; const x = c.getContext("2d")!;
    const COL = 2;
    // paint the band background once, then scroll
    const paintCol = (px: number) => {
      for (let m = M_LO; m <= M_HI; m++) {
        const y0 = yOfM(m + 0.5), y1 = yOfM(m - 0.5);
        x.fillStyle = BLACK.has(((m % 12) + 12) % 12) ? "#26282c" : "#33363b";
        x.fillRect(px, y0, COL, y1 - y0);
      }
    };
    for (let px = 0; px < W; px += COL) paintCol(px);
    function frame() {
      x.drawImage(c, -COL, 0);
      paintCol(W - COL);
      const [pitch, clarity] = mic.pitch();
      if (clarity > 0.9 && pitch > 60 && pitch < 1200) {
        const mFloat = 69 + 12 * Math.log2(pitch / 440);
        if (mFloat >= M_LO && mFloat <= M_HI) {
          if (dials.autotune) {
            x.fillStyle = "#9ad0e8";
            x.fillRect(W - COL, yOfM(Math.round(mFloat)) - 1.5, COL, 3);
          }
          x.fillStyle = "#f2c14e";
          x.fillRect(W - COL, yOfM(mFloat) - 1.5, COL, 3);
          const near = Math.round(mFloat);
          const cents = Math.round((mFloat - near) * 100);
          setReading(`${pitch.toFixed(1)} Hz — ${midiName(near)} ${cents >= 0 ? "+" : ""}${cents}¢`);
          emit("voiceOn");
          if (Math.abs(cents) < 5) emit("nailedIt");
        }
      }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [mic.on, dials.autotune]);

  return (
    <div>
      <MicGate on={mic.on} err={mic.err} enable={async () => { if (await mic.enable()) emit("micOn"); }}
        hint="Sing or hum — your voice becomes the gold line.">
        <>
          <canvas ref={canvas} className="scope" width={W} height={H} style={{ height: H }} />
          <div className="readout">
            <div className="chip" style={{ flex: 1 }}><div className="k">your voice right now</div><div className="v">{reading}</div></div>
            <label className="dial" style={{ minWidth: 150 }}><span>auto-tune trace</span>
              <button disabled={locked.has("autotune")} onClick={() => setDial("autotune", !dials.autotune)}>{dials.autotune ? "on" : "off"}</button></label>
          </div>
          <p className="smallnote">
            The gold line is your <b>real</b> voice: continuous, expressive, sliding through all the
            in-between pitches — a built-in theremin. Flip on the <b>auto-tune trace</b>: the blue line
            is your voice snapped to the 12-band grid. Everything gold that the blue line misses —
            the slides, the scoops, the wobble — is exactly what quantizing throws away. Try a siren,
            then try landing a note dead-center (±5¢!).
          </p>
        </>
      </MicGate>
    </div>
  );
}

export const def: ToyDef = {
  id: "voice-ruler",
  title: "Your Voice on the Ruler",
  blurb: "Sing — your pitch draws a line, with an auto-tune trace to compare.",
  thread: "ear",
  exclusive: true,
  dials: { autotune: { type: "toggle", default: false, label: "auto-tune trace" } },
  component: Comp,
};
