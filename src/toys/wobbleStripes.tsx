import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

// Beating is a moiré pattern in time. Two stripe gratings whose spacings almost match produce
// big slow bands — at exactly the DIFFERENCE of their frequencies. The same two frequencies,
// played as tones, wobble at that same difference. One phenomenon, eyes and ears.

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const oscs = useRef<{ a: Tone.Oscillator; b: Tone.Oscillator } | null>(null);
  const baseHz = dials.baseHz as number;
  const detune = dials.detune as number;
  const f2 = baseHz + detune;

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    // stripes per canvas scale with the two frequencies (÷4 so individual stripes stay visible)
    const cyc1 = baseHz / 4, cyc2 = f2 / 4;
    for (let px = 0; px < w; px++) {
      const s1 = Math.sin((px / w) * Math.PI * 2 * cyc1);
      const s2 = Math.sin((px / w) * Math.PI * 2 * cyc2);
      x.fillStyle = `rgba(154,208,232,${(0.5 + s1 / 2) * 0.5})`;
      x.fillRect(px, 8, 1, h * 0.34);
      x.fillStyle = `rgba(242,193,78,${(0.5 + s2 / 2) * 0.5})`;
      x.fillRect(px, h * 0.34 + 14, 1, h * 0.34);
      // overlaid: the sum — the big soft bands are the moiré / the wobble
      x.fillStyle = `rgba(244,241,232,${(0.5 + (s1 + s2) / 4) * 0.6})`;
      x.fillRect(px, h * 0.68 + 20, 1, h * 0.28);
    }
    x.fillStyle = "#9a968a"; x.font = "11px monospace";
    x.fillText(`${baseHz} stripes`, 6, 20);
    x.fillText(`${f2.toFixed(1)} stripes`, 6, h * 0.34 + 26);
    x.fillText("both at once — count the big soft bands", 6, h * 0.68 + 32);
  }, [baseHz, f2]);

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const a = new Tone.Oscillator({ frequency: baseHz, volume: -14 }).toDestination().start();
    const b = new Tone.Oscillator({ frequency: f2, volume: -14 }).toDestination().start();
    oscs.current = { a, b };
    emit("playStarted");
    return () => { a.stop().dispose(); b.stop().dispose(); oscs.current = null; };
  }, [dials.playing]);
  useEffect(() => {
    oscs.current?.a.frequency.rampTo(baseHz, 0.05);
    oscs.current?.b.frequency.rampTo(f2, 0.05);
    if (detune > 0 && detune < 1.5) emit("slowWobble");
  }, [baseHz, f2]);

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={190} />
      <div className="readout">
        <div className="chip"><div className="k">difference</div><div className="v">{detune.toFixed(1)} Hz</div></div>
        <div className="chip" style={{ flex: 1 }}><div className="k">so you see / hear</div>
          <div className="v" style={{ fontSize: 16 }}>{detune === 0 ? "no bands, no wobble — they agree" : `${detune.toFixed(1)} bands, and ${detune.toFixed(1)} wobbles per second`}</div></div>
      </div>
      <Dials names={["playing", "baseHz", "detune"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">
        The big soft bands are a <b>moiré</b> — two patterns almost agreeing, disagreeing slowly.
        The wobble between two close tones is the exact same thing in time: it beats at the
        <b> difference</b> of the frequencies. Same math the Wobble Scope spins.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "wobble-stripes",
  title: "Wobble Stripes",
  blurb: "Beating, but for your eyes — the wobble is a moiré pattern in time.",
  thread: "sound",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    baseHz:  { type: "slider", min: 110, max: 440, step: 1, default: 220, label: "tone 1 (Hz)" },
    detune:  { type: "slider", min: 0, max: 12, step: 0.1, default: 3, label: "difference (Hz)" },
  },
  component: Comp,
};
