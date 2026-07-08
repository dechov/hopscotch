import { MOVES } from "../content/glossary";
import { blipSeq } from "../audio/engine";
import { midiToFreq } from "../audio/notes";
import type { ToyDef, ToyInnerProps } from "./types";

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const up = dials.direction === "up";
  const root = 60; // C4
  const rungs = MOVES.filter(m => (dials.allMoves ? m.semitones > 0 : m.core && m.semitones > 0));

  function hear(word: string, semis: number) {
    const target = up ? root + semis : root - semis;
    blipSeq([midiToFreq(root), midiToFreq(target)], 0.5);
    emit("moveHeard");
    emit(`moveHeard:${word}`);
  }

  return (
    <div>
      <div className="dialrow">
        <label className="dial" style={{ minWidth: 120 }}><span>direction</span>
          <button disabled={locked.has("direction")} onClick={() => setDial("direction", up ? "down" : "up")}>
            {up ? "⬆ up" : "⬇ down"}
          </button>
        </label>
        <label className="dial" style={{ minWidth: 130 }}><span>bonus rungs</span>
          <button disabled={locked.has("allMoves")} onClick={() => setDial("allMoves", !dials.allMoves)}>{dials.allMoves ? "on" : "off"}</button>
        </label>
      </div>
      <div style={{ display: "flex", flexDirection: "column-reverse", gap: 8 }}>
        {rungs.map(m => (
          <div key={m.word} className="rung" style={{ borderColor: m.color }} onClick={() => hear(m.word, m.semitones)}>
            <b style={{ color: m.color }}>{m.word}</b>
            <span className="smallnote">{m.motion} · {m.semitones} {m.semitones === 1 ? "little square" : "little squares"} · grown-ups say "{m.grown}"</span>
            <span>▶</span>
          </div>
        ))}
      </div>
      <p className="smallnote">Tap a rung: you hear Home, then the move {up ? "up" : "down"}. Say the word out loud and DO the motion.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "move-ladder",
  title: "The Ladder",
  blurb: "scoot · step · hop · skip · jump · leap · fly",
  thread: "moves",
  dials: {
    direction: { type: "select", default: "up", label: "direction", options: [{ value: "up", label: "up" }, { value: "down", label: "down" }] },
    allMoves:  { type: "toggle", default: false, label: "bonus rungs" },
  },
  component: Comp,
};
