import { useEffect, useRef, useState } from "react";
import { onMidiNote } from "../input/midi";
import { blipSeq } from "../audio/engine";
import { MOVES, moveFor } from "../content/glossary";
import { midiToFreq } from "../audio/notes";
import { PitchSurface } from "./PitchSurface";
import type { ToyDef, ToyInnerProps } from "./types";

const PENTA = [60, 62, 64, 67, 69, 72]; // C D E G A C

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const [call, setCall] = useState<number[]>([]);
  const [got, setGot] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const nameAnswer = useRef<number>(0);
  const [nameOpts, setNameOpts] = useState<string[]>([]);

  function newCall() {
    if (dials.mode === "name") {
      const pool = MOVES.filter(m => m.core && m.semitones > 0);
      const pick = pool[Math.floor(Math.random() * pool.length)];
      nameAnswer.current = pick.semitones;
      const opts = [pick.word];
      while (opts.length < 3) {
        const o = pool[Math.floor(Math.random() * pool.length)].word;
        if (!opts.includes(o)) opts.push(o);
      }
      setNameOpts(opts.sort(() => Math.random() - 0.5));
      setMsg(""); setCall([60, 60 + pick.semitones]);
      blipSeq([midiToFreq(60), midiToFreq(60 + pick.semitones)], 0.55);
      return;
    }
    const n = dials.mode === "echo3" ? 3 : 2;
    const c = Array.from({ length: n }, () => PENTA[Math.floor(Math.random() * PENTA.length)]);
    setCall(c); setGot([]); setMsg("");
    blipSeq(c.map(midiToFreq), 0.5);
    emit("callIssued");
  }

  function tapped(m: number) {
    if (dials.mode === "name" || call.length === 0) return;
    const next = [...got, m];
    setGot(next);
    if (next.length === call.length) {
      const right = next.every((v, i) => v === call[i]);
      setStreak(s => right ? s + 1 : 0);
      setMsg(right ? "✔ perfect echo!" : "✗ close — hear it again and copy the shape.");
      emit(right ? "echoRight" : "echoWrong");
    }
  }

  useEffect(() => onMidiNote((m) => tapped(m)), [call, got, dials.mode]);

  function nameIt(word: string) {
    const right = moveFor(nameAnswer.current).word === word;
    setStreak(s => right ? s + 1 : 0);
    setMsg(right ? `✔ yes — that's a ${word}!` : "✗ not that one — hear it again.");
    emit(right ? "namedRight" : "namedWrong");
  }

  return (
    <div>
      <div className="dialrow">
        <label className="dial" style={{ minWidth: 170 }}><span>game</span>
          <select disabled={locked.has("mode")} value={dials.mode} onChange={e => setDial("mode", e.target.value)}>
            <option value="echo2">echo me (2 notes)</option>
            <option value="echo3">echo me (3 notes)</option>
            <option value="name">name the move</option>
          </select>
        </label>
        <button className="primary" onClick={newCall}>▶ {call.length ? "new call" : "give me a call"}</button>
        {call.length > 0 && <button onClick={() => blipSeq(call.map(midiToFreq), 0.5)}>hear it again</button>}
      </div>
      {dials.mode !== "name" ? (
        <PitchSurface surface="pads" home={60} pcs={[0, 2, 4, 7, 9]} labels="stickers" onNote={tapped} />
      ) : (
        <div className="answers">{nameOpts.map(w => <button key={w} onClick={() => nameIt(w)}>{w}</button>)}</div>
      )}
      <div className="readout"><div className="chip"><div className="k">streak</div><div className="v">{streak}</div></div></div>
      {msg && <div className={`verdict ${msg.startsWith("✔") ? "rest" : "lean"}`}>{msg}</div>}
      <p className="smallnote">Copy first, name later — that's the Earshot way. Your fingers learn it before your mouth does.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "echo-trainer",
  title: "Earshot",
  blurb: "They play, you echo. Then: name the move you hear.",
  thread: "ear",
  dials: {
    mode: { type: "select", default: "echo2", label: "game", options: [
      { value: "echo2", label: "echo (2)" }, { value: "echo3", label: "echo (3)" }, { value: "name", label: "name the move" }] },
  },
  component: Comp,
};
