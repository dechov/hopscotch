import { useEffect, useMemo, useRef, useState } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const oscs = useRef<{ a: Tone.Oscillator; b: Tone.Oscillator } | null>(null);
  const [won, setWon] = useState(false);
  const timer = useRef<number | null>(null);
  const startOffset = useMemo(() => (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 22), []);

  const root = 220;
  const [num, den] = (dials.target as string).split(":").map(Number);
  const pure = root * (num / den);
  const cents = (dials.peg as number) + startOffset;
  const f2 = pure * Math.pow(2, cents / 1200);
  const beat = Math.abs(f2 - pure);

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    const a = new Tone.Oscillator({ frequency: root, volume: -14 }).toDestination().start();
    const b = new Tone.Oscillator({ frequency: f2, volume: -14 }).toDestination().start();
    oscs.current = { a, b };
    return () => { a.stop().dispose(); b.stop().dispose(); oscs.current = null; };
  }, [dials.playing]);
  useEffect(() => { if (oscs.current) oscs.current.b.frequency.rampTo(f2, 0.05); }, [f2]);

  useEffect(() => {
    if (dials.playing && Math.abs(cents) < 2.5) {
      if (timer.current == null) timer.current = window.setTimeout(() => { setWon(true); emit("lockAchieved"); }, 900);
    } else { if (timer.current) { clearTimeout(timer.current); timer.current = null; } setWon(false); }
  }, [cents, dials.playing]);

  return (
    <div>
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ two strings"}</button>
        <label className="dial" style={{ flex: 3 }}>
          <span>🔧 turn the peg</span>
          <input type="range" min={-60} max={60} step={0.5} value={dials.peg} disabled={locked.has("peg")}
            onChange={(e) => setDial("peg", parseFloat(e.target.value))} />
        </label>
        <label className="dial" style={{ minWidth: 100 }}><span>show meter</span>
          <button disabled={locked.has("meter")} onClick={() => setDial("meter", !dials.meter)}>{dials.meter ? "on" : "off"}</button>
        </label>
      </div>
      {dials.meter ? (
        <div className="readout">
          <div className="chip"><div className="k">wobble</div><div className="v">{beat.toFixed(1)}/s</div></div>
          <div className="chip"><div className="k">off by</div><div className="v">{Math.abs(cents).toFixed(0)}¢</div></div>
        </div>
      ) : <p className="smallnote">Meter off — ears only. Slow wobble = close. No wobble = there.</p>}
      <div className={`verdict ${won ? "rest" : "lean"}`}>{won ? "✔ LOCKED IN — beatless!" : dials.playing ? "listen for the wobble…" : "press play, then turn"}</div>
    </div>
  );
}

export const def: ToyDef = {
  id: "tune-it",
  title: "Tune It",
  blurb: "Turn the peg until the wobble dies. Tuning is a relationship.",
  thread: "sound",
  dials: {
    playing: { type: "toggle", default: false, label: "sound" },
    target:  { type: "select", default: "3:2", label: "target", options: [
      { value: "2:1", label: "fly (2:1)" }, { value: "3:2", label: "leap (3:2)" }, { value: "4:3", label: "jump (4:3)" }] },
    peg:     { type: "slider", min: -60, max: 60, step: 0.5, default: 0, label: "peg" },
    meter:   { type: "toggle", default: true, label: "meter" },
  },
  component: Comp,
};
