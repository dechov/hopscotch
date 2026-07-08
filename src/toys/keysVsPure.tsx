import { useRef, useState } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

const ROOT = 261.63; // C4
const GRID = [ROOT, ROOT * Math.pow(2, 4 / 12), ROOT * Math.pow(2, 7 / 12)];
const PURE = [ROOT, ROOT * 5 / 4, ROOT * 3 / 2];

function Comp({ dials, setDial, emit }: ToyInnerProps) {
  const [blind, setBlind] = useState(false);
  const order = useRef<[string, string]>(["grid", "pure"]);
  const [msg, setMsg] = useState("");

  function play(freqs: number[]) {
    if (!isArmed()) return;
    const s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.03, sustain: 0.9, release: 0.4 }, volume: -14 }).toDestination();
    s.triggerAttackRelease(freqs, 1.6);
    setTimeout(() => s.dispose(), 2600);
    emit("chordPlayed");
  }
  function startBlind() {
    order.current = Math.random() > 0.5 ? ["grid", "pure"] : ["pure", "grid"];
    setBlind(true); setMsg("");
  }
  function guess(which: 0 | 1) {
    const right = order.current[which] === "pure";
    setMsg(right ? "✔ you found the pure one — it holds perfectly still." : "✗ other one — the pure chord is the stiller of the two.");
    emit(right ? "guessedRight" : "guessedWrong");
  }

  return (
    <div>
      {!blind ? (
        <div className="dialrow">
          <button onClick={() => play(GRID)}>▶ piano's chord (the grid)</button>
          <button onClick={() => play(PURE)}>▶ pure chord (4:5:6)</button>
          <button className="primary" onClick={startBlind}>🎲 blind test me</button>
        </div>
      ) : (
        <div className="dialrow">
          <button onClick={() => play(order.current[0] === "grid" ? GRID : PURE)}>▶ chord A</button>
          <button onClick={() => play(order.current[1] === "grid" ? GRID : PURE)}>▶ chord B</button>
          <button onClick={() => guess(0)}>A is the pure one</button>
          <button onClick={() => guess(1)}>B is the pure one</button>
          <button onClick={() => setBlind(false)}>back</button>
        </div>
      )}
      {msg && <div className={`verdict ${msg.startsWith("✔") ? "rest" : "lean"}`}>{msg}</div>}
      <p className="smallnote">The piano's skip is ~14¢ sharp of pure 5:4 — every piano chord shimmers a little, on purpose, so that ALL keys can work. The pure one gives up that flexibility to hold still.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "keys-vs-pure",
  title: "Grid vs. Pure",
  blurb: "The piano's compromise chord next to the pure one.",
  thread: "sound",
  dials: {},
  component: Comp,
};
