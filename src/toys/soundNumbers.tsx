import { useEffect, useRef } from "react";
import { Tone, isArmed } from "../audio/engine";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

// Digitization: a microphone is a very fast list-writer. This toy draws the two grids that
// turn a smooth wave into numbers — the time grid (sample rate) and the loudness grid (bit
// depth) — and lets you hear the loudness grid get crunchy (Tone.BitCrusher). It completes
// the quantization trilogy from FIRST-PRINCIPLES §5b: pitch grid, time grid, loudness grid.

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const nodes = useRef<{ osc: Tone.Oscillator; crush: Tone.BitCrusher } | null>(null);
  const freq = dials.freq as number;
  const rate = dials.rate as number;   // samples per second (visualized)
  const bits = dials.bits as number;   // quantization levels (audible via BitCrusher)

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const crush = new Tone.BitCrusher(bits).toDestination();
    const osc = new Tone.Oscillator({ frequency: freq, type: "sine", volume: -10 }).connect(crush).start();
    nodes.current = { osc, crush };
    emit("playStarted");
    return () => { osc.stop().dispose(); crush.dispose(); nodes.current = null; };
  }, [dials.playing]);
  useEffect(() => { nodes.current?.osc.frequency.rampTo(freq, 0.05); }, [freq]);
  useEffect(() => { if (nodes.current) nodes.current.crush.bits.value = bits; }, [bits]);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    const WIN = 0.02; // a 20 ms window
    const levels = Math.pow(2, bits);
    const q = (v: number) => (Math.round(((v + 1) / 2) * (levels - 1)) / (levels - 1)) * 2 - 1;
    const yOf = (v: number) => h / 2 - v * (h / 2 - 14);
    // the true smooth wave
    x.strokeStyle = "rgba(154,208,232,.8)"; x.lineWidth = 2; x.beginPath();
    for (let px = 0; px < w; px++) {
      const t = (px / w) * WIN;
      x.lineTo(px, yOf(Math.sin(2 * Math.PI * freq * t)));
    }
    x.stroke();
    // loudness grid lines (only when coarse enough to see)
    if (bits <= 4) {
      x.strokeStyle = "rgba(244,241,232,.12)";
      for (let l = 0; l < levels; l++) {
        const v = (l / (levels - 1)) * 2 - 1;
        x.beginPath(); x.moveTo(0, yOf(v)); x.lineTo(w, yOf(v)); x.stroke();
      }
    }
    // samples: dots on the time grid, quantized to the loudness grid, staircase reconstruction
    const n = Math.floor(rate * WIN);
    x.strokeStyle = "#f2c14e"; x.lineWidth = 2; x.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = (i / rate);
      const px = (t / WIN) * w;
      const v = q(Math.sin(2 * Math.PI * freq * t));
      if (i === 0) x.moveTo(px, yOf(v)); else x.lineTo(px, yOf(v));
      if (i < n) x.lineTo(Math.min(w, ((i + 1) / rate / WIN) * w), yOf(v));
    }
    x.stroke();
    x.fillStyle = "#f2c14e";
    for (let i = 0; i <= n; i++) {
      const t = i / rate;
      x.beginPath(); x.arc((t / WIN) * w, yOf(q(Math.sin(2 * Math.PI * freq * t))), 3, 0, Math.PI * 2); x.fill();
    }
    // Nyquist: fewer than 2 samples per cycle → an alias wave fits the same dots
    const perCycle = rate / freq;
    if (perCycle < 2) {
      const alias = Math.abs(freq - Math.round(freq / rate) * rate);
      x.strokeStyle = "#f08a6b"; x.lineWidth = 2; x.setLineDash([5, 4]); x.beginPath();
      for (let px = 0; px < w; px++) {
        const t = (px / w) * WIN;
        x.lineTo(px, yOf(Math.sin(2 * Math.PI * alias * t)));
      }
      x.stroke(); x.setLineDash([]);
      x.fillStyle = "#f08a6b"; x.font = "12px monospace";
      x.fillText(`alias! the dots also fit a ${alias.toFixed(0)} Hz wave`, 8, 16);
      emit("aliased");
    }
    x.fillStyle = "#9a968a"; x.font = "11px monospace";
    x.fillText(`${perCycle.toFixed(1)} samples per wiggle · ${levels} loudness levels`, 8, h - 6);
  }, [freq, rate, bits]);

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={200} />
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ tone"}</button>
        <Dials names={["freq", "rate", "bits"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      </div>
      <p className="smallnote">
        A microphone is a very fast <b>list-writer</b>: it measures the air ~44,100 times a second and
        writes each measurement down as a number. Two grids do it: the <b>time grid</b> (dots — drop
        below 2 samples per wiggle and a phantom <i>alias</i> wave fits the same dots: that's the
        Nyquist limit, cousin of the Speed Trick's flutter zone) and the <b>loudness grid</b> (drag
        bits down and <i>hear</i> the staircase). Third cousin: snapping notes to a scale — pitch,
        time, loudness: three grids, one idea.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "sound-numbers",
  title: "Sound Is Numbers",
  blurb: "Digitization: the time grid, the loudness grid, and the phantom alias wave.",
  thread: "sound",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    freq: { type: "slider", min: 110, max: 1760, step: 1, default: 220, label: "tone (Hz)" },
    rate: { type: "slider", min: 300, max: 8000, step: 10, default: 2000, label: "samples per second" },
    bits: { type: "slider", min: 1, max: 8, step: 1, default: 8, label: "bits (loudness levels)" },
  },
  component: Comp,
};
