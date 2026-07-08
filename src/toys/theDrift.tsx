import { useEffect, useRef, useState } from "react";
import { Tone, isArmed } from "../audio/engine";
import type { ToyDef, ToyInnerProps } from "./types";

/**
 * The comma pump, audible. I–vi–ii–V–I tuned in PURE just intonation by common
 * tones. Every note is perfectly in tune with the chord before it — and the whole
 * piece sinks a syntonic comma (~21.5¢) per cycle. The reason temperament exists.
 *
 * Derivation (common tones marked):
 *   C  [1, 5/4, 3/2]
 *   Am [5/6, 1*, 5/4*]        A tuned a pure 6:5 below C
 *   Dm [10/9, 4/3, 5/3*]      D a pure fifth below A (up an octave); F = D·6/5
 *   G  [40/27, 50/27, 10/9*]  G a pure fifth below D — and 40/27 ≠ 3/2 !
 *   C  [80/81, …]             C a pure fifth below G → home has sunk 81/80.
 */
const CYCLE: { name: string; ratios: number[] }[] = [
  { name: "C",  ratios: [1, 5 / 4, 3 / 2] },
  { name: "Am", ratios: [5 / 6, 1, 5 / 4] },
  { name: "Dm", ratios: [10 / 9, 4 / 3, 5 / 3] },
  { name: "G",  ratios: [40 / 27, 50 / 27, 20 / 9] },
];

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const [pos, setPos] = useState(0);
  const [cycles, setCycles] = useState(0);
  const baseRef = useRef(261.63);
  const synth = useRef<Tone.PolySynth | null>(null);
  const evId = useRef<number | null>(null);
  const stepRef = useRef(0);

  const et = dials.tempered as boolean;
  const ET: number[][] = [[0, 4, 7], [-3, 0, 4], [2, 5, 9], [7, 11, 14]].map(ch => ch.map(s => Math.pow(2, s / 12)));

  useEffect(() => {
    if (!dials.playing || !isArmed()) return;
    baseRef.current = 261.63; setCycles(0); stepRef.current = 0;
    const s = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.04, decay: 0.1, sustain: 0.8, release: 0.35 }, volume: -14 }).toDestination();
    synth.current = s;
    const t = Tone.getTransport();
    t.bpm.value = 60;
    evId.current = t.scheduleRepeat((time) => {
      const p = stepRef.current % 4;
      const freqs = et
        ? ET[p].map(r => 261.63 * r)
        : CYCLE[p].ratios.map(r => baseRef.current * r);
      s.triggerAttackRelease(freqs, "2n", time);
      Tone.getDraw().schedule(() => {
        setPos(p);
        if (p === 3) {
          if (!et) baseRef.current *= 80 / 81;
          setCycles(c => c + 1);
          emit("cycleDone");
        }
      }, time);
      stepRef.current++;
    }, "2n");
    t.start();
    return () => { if (evId.current != null) t.clear(evId.current); t.stop(); s.dispose(); synth.current = null; };
  }, [dials.playing, et]);

  const drift = Math.round(1200 * Math.log2(Math.pow(80 / 81, cycles)) * 10) / 10;

  return (
    <div>
      <div className="lane">
        {CYCLE.map((c, i) => (
          <div key={i} className={`tile ${i === pos && dials.playing ? "now" : ""}`} style={{ minWidth: 70 }}>
            <span className="w">{c.name}</span>
            <span className="smallnote">{i < 3 ? "pure with last" : "pure… but low"}</span>
          </div>
        ))}
      </div>
      <div className="dialrow">
        <button className="primary" onClick={() => setDial("playing", !dials.playing)}>{dials.playing ? "■ stop" : "▶ pump"}</button>
        <label className="dial" style={{ minWidth: 190 }}><span>tuning</span>
          <button disabled={locked.has("tempered")} onClick={() => setDial("tempered", !et)}>
            {et ? "equal-tempered (the grid)" : "pure ratios (just)"}
          </button></label>
      </div>
      <div className="readout">
        <div className="chip"><div className="k">loops</div><div className="v">{cycles}</div></div>
        <div className="chip"><div className="k">home has sunk</div><div className="v">{et ? "0¢ (grid holds)" : `${drift}¢`}</div></div>
        <div className="chip" style={{ flex: 1 }}><div className="k">per loop</div><div className="v" style={{ fontSize: 18 }}>−21.5¢ — the syntonic comma</div></div>
      </div>
      <p className="smallnote">
        Every single chord change here is PERFECTLY in tune — each chord shares a pure common tone
        with the last. And yet the music sinks, forever. Purity and stability are mathematically
        incompatible; that's the dragon every tuning system in history was invented to fight.
        Flip to the grid version: no chord is perfectly pure, and nothing sinks. The piano's deal,
        made audible. (Teacher toy — this one's for the grown-ups.)
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "the-drift",
  title: "The Drift",
  blurb: "Pure chords, sinking pitch: the comma pump, audible.",
  thread: "sound",
  dials: {
    playing:  { type: "toggle", default: false, label: "playing" },
    tempered: { type: "toggle", default: false, label: "equal-tempered" },
  },
  component: Comp,
};
