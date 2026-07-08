import { useRef, useState } from "react";
import { blipSeq } from "../audio/engine";
import { midiToFreq } from "../audio/notes";
import type { ToyDef, ToyInnerProps } from "./types";

// C major pentatonic melodies; "finished" ends on C (60/72), hanging ends elsewhere
const BANK: { notes: number[]; finished: boolean }[] = [
  { notes: [64, 62, 60], finished: true },
  { notes: [67, 69, 67, 64, 62], finished: false },
  { notes: [60, 62, 64, 67, 72], finished: true },
  { notes: [64, 67, 69], finished: false },
  { notes: [67, 64, 62, 60], finished: true },
  { notes: [60, 64, 62], finished: false },
  { notes: [69, 67, 64, 60], finished: true },
  { notes: [62, 64, 67, 62], finished: false },
];

function Comp({ emit }: ToyInnerProps) {
  const [cur, setCur] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const busy = useRef(false);

  function play() {
    const i = Math.floor(Math.random() * BANK.length);
    setCur(i); setMsg("");
    blipSeq(BANK[i].notes.map(midiToFreq), 0.42);
  }
  function answer(saysFinished: boolean) {
    if (cur == null || busy.current) return;
    const right = BANK[cur].finished === saysFinished;
    emit(right ? "answeredRight" : "answeredWrong");
    setStreak(s => right ? s + 1 : 0);
    setMsg(right ? "✔ yes! your ear knows Home." : "✗ hmm — listen again for the settled feeling.");
    busy.current = true; setTimeout(() => { busy.current = false; }, 400);
  }

  return (
    <div>
      <div className="dialrow">
        <button className="primary" onClick={play}>▶ play a little tune</button>
        {cur != null && <button onClick={() => blipSeq(BANK[cur].notes.map(midiToFreq), 0.42)}>hear it again</button>}
      </div>
      <div className="answers">
        <button onClick={() => answer(true)}>😌 sounds finished</button>
        <button onClick={() => answer(false)}>🤨 still hanging…</button>
      </div>
      <div className="readout">
        <div className="chip"><div className="k">streak</div><div className="v">{streak}</div></div>
      </div>
      {msg && <div className={`verdict ${msg.startsWith("✔") ? "rest" : "lean"}`}>{msg}</div>}
    </div>
  );
}

export const def: ToyDef = {
  id: "home-finder",
  title: "Does It Sound Finished?",
  blurb: "Find Home by ear — no theory, just the settled feeling.",
  thread: "home",
  dials: {},
  component: Comp,
};
