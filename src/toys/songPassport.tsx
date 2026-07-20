import { useRef, useState } from "react";
import { Tone, isArmed, blip } from "../audio/engine";
import { bestFifth } from "../audio/tuning";
import type { ToyDef, ToyInnerProps } from "./types";

// Same song, different world. The melody is stored not as keyboard notes but as positions on
// the chain of fifths (plus an octave correction) — the structure underneath the notes. Each
// world is then rendered with ITS fifth, so worlds in the meantone family (19, 31) keep the
// song recognizable while others audibly bend or flatten it. Old MacDonald reused from the
// Chant Board, octave-honest (opens with a jump DOWN — see PEDAGOGY.md).
//
// fifths: C=0 G=1 D=2 A=3 E=4 (diatonic positions in the chain); oct chosen so that with a
// 700¢ fifth the melody reproduces the familiar 12-EDO shape around middle C.
const MELODY: { word: string; fifths: number; oct: number; beats: number }[] = [
  { word: "Old", fifths: 0, oct: 0, beats: 1 }, { word: "Mac", fifths: 0, oct: 0, beats: 1 },
  { word: "Don", fifths: 0, oct: 0, beats: 1 }, { word: "ald", fifths: 1, oct: -1, beats: 1 },
  { word: "had", fifths: 3, oct: -2, beats: 1 }, { word: "a", fifths: 3, oct: -2, beats: 1 },
  { word: "farm", fifths: 1, oct: -1, beats: 2 },
  { word: "E", fifths: 4, oct: -2, beats: 1 }, { word: "I", fifths: 4, oct: -2, beats: 1 },
  { word: "E", fifths: 2, oct: -1, beats: 1 }, { word: "I", fifths: 2, oct: -1, beats: 1 },
  { word: "O", fifths: 0, oct: 0, beats: 2 },
];

const STAMPS: { id: string; label: string; fifth: number; note: string }[] = [
  { id: "12", label: "the familiar 12", fifth: bestFifth(12), note: "home base — the song as you know it." },
  { id: "19", label: "19 — the smooth cousin", fifth: bestFifth(19), note: "survives! fifths a touch soft, thirds sweeter — same family (meantone)." },
  { id: "31", label: "31 — the connoisseur", fifth: bestFifth(31), note: "survives beautifully — this world's thirds are nearly pure." },
  { id: "22", label: "22 — the rebel", fifth: bestFifth(22), note: "the shape bends — 22's sharp fifths stack into glaring thirds. This world refuses to play meantone." },
  { id: "17", label: "17 — the wiry one", fifth: bestFifth(17), note: "recognizable but wiry — thirds go tense and neutral-ish." },
  { id: "7", label: "7 — all steps equal", fifth: bestFifth(7), note: "every step the same size: major and minor melt into one neutral color." },
  { id: "5", label: "5 — the wide world", fifth: bestFifth(5), note: "the melody flattens into five broad steps — a different creature." },
  { id: "pure", label: "pure fifths (no temper)", fifth: 701.955, note: "every fifth exact — this melody can't tell, but chords eventually drift (see The Drift)." },
];

function Comp({ dials, emit }: ToyInnerProps) {
  const [stamp, setStamp] = useState("12");
  const [at, setAt] = useState(-1);
  const playing = useRef(false);
  const w = STAMPS.find(s => s.id === stamp)!;

  function centsOf(n: typeof MELODY[number], fifth: number) {
    return n.fifths * fifth + n.oct * 1200;
  }
  function play(id: string) {
    if (playing.current || !isArmed()) return;
    setStamp(id);
    const world = STAMPS.find(s => s.id === id)!;
    playing.current = true;
    emit(`stamp:${id}`);
    const beat = 60 / (dials.tempo as number);
    const t0 = Tone.now() + 0.1;
    let acc = 0;
    MELODY.forEach((n, i) => {
      const when = t0 + acc;
      blip(261.63 * Math.pow(2, centsOf(n, world.fifth) / 1200), n.beats * beat * 0.9, when);
      const delay = acc;
      setTimeout(() => setAt(i), (0.1 + delay) * 1000);
      acc += n.beats * beat;
    });
    setTimeout(() => { setAt(-1); playing.current = false; }, (0.2 + acc) * 1000);
  }

  return (
    <div>
      <div className="dialrow">
        {STAMPS.map(s => (
          <button key={s.id} className={s.id === stamp ? "primary" : ""} onClick={() => play(s.id)}>
            ▶ {s.label}
          </button>
        ))}
      </div>
      <div className="readout">
        <div className="chip"><div className="k">this world's ×3/2</div><div className="v">{w.fifth.toFixed(1)}¢ {Math.abs(w.fifth - 701.955) < 0.5 ? "(pure)" : `(bent ${(w.fifth - 701.955) > 0 ? "+" : ""}${(w.fifth - 701.955).toFixed(1)}¢)`}</div></div>
        <div className="chip" style={{ flex: 2 }}><div className="k">verdict</div><div className="v" style={{ fontSize: 16 }}>{w.note}</div></div>
      </div>
      <div className="dialrow" style={{ gap: 6 }}>
        {MELODY.map((n, i) => (
          <span key={i} className="smallnote" style={{
            padding: "3px 8px", borderRadius: 8,
            border: `2px solid ${i === at ? "var(--home)" : "var(--line)"}`,
            color: i === at ? "var(--chalk)" : undefined,
          }}>{n.word}</span>
        ))}
      </div>
      <p className="smallnote">
        The song isn't stored as keyboard notes — it's stored as <b>moves on the chain of ×3/2</b>,
        the structure underneath the notes. Each world rebuilds it with its own ×3/2. Worlds in the
        same family as 12 (19, 31) keep the song; 22 bends it; 7 and 5 melt it. One melody, passport
        stamps from every world.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "song-passport",
  title: "Song Passport",
  blurb: "The same song visits other tuning worlds — some keep it, some bend it.",
  thread: "color",
  dials: {
    tempo: { type: "slider", min: 60, max: 160, step: 1, default: 110, label: "tempo" },
  },
  component: Comp,
};
