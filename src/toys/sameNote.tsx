import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Tone, isArmed } from "../audio/engine";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

// The Same-Note Game: derive scales from one repeated question — "same note, or new note?"
// The branching decision tree IS this toy's mechanism, so (as documented in
// docs/FIRST-PRINCIPLES.md) it deliberately owns its own stage state instead of using a guide.

const FIFTH = 701.955; // pure 3:2 in cents
const ASK_AT = [2, 5, 7, 12, 17, 29, 41, 53]; // counts where the next candidate deserves a decision
const CLOSURE_NAMES: Record<number, string> = {
  2: "a 2-note system — the octave cut in half",
  5: "the five-tone scale (as a closed circle)",
  7: "the seven-tone scale (as a closed circle)",
  12: "the familiar 12 — the piano's circle",
  17: "a 17-tone system (used in Arabic theory)",
  29: "a 29-tone system (a rare, very pure circle)",
  41: "a 41-tone system (fifths pure to 0.5¢)",
  53: "a 53-tone system (Mercator's — fifths pure to 0.07¢)",
};

const noteCents = (i: number) => ((i * FIFTH) % 1200 + 1200) % 1200;
const circDist = (a: number, b: number) => { const d = Math.abs(a - b); return Math.min(d, 1200 - d); };
const nameOf = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(97 + i - 26));
// which decision "generation" a note arrived in — generalizes white keys vs. black keys
const genOf = (i: number) => ASK_AT.findIndex(n => i < n) === -1 ? ASK_AT.length : ASK_AT.findIndex(n => i < n);
const GEN_COLORS = ["#f2c14e", "#9ad0e8", "#8fd6a0", "#c79bca", "#f08a6b", "#e8e06a", "#f29bc4", "#cfcabb", "#9a968a"];

function temperedFifth(n: number) { return (Math.round((FIFTH * n) / 1200) * 1200) / n; }

type Phase =
  | { kind: "octave" }
  | { kind: "octave-nofold" }
  | { kind: "fifth" }
  | { kind: "fifth-drone" }
  | { kind: "ask"; n: number }        // chain has n notes; candidate is note n
  | { kind: "closed"; n: number }
  | { kind: "end" };

function Comp({ dials, emit, locked, setDial }: ToyInnerProps) {
  const homeHz = dials.homeHz as number;
  const [phase, setPhase] = useState<Phase>({ kind: "octave" });
  const synth = useRef<Tone.PolySynth | null>(null);

  useEffect(() => () => { synth.current?.dispose(); synth.current = null; }, []);

  function ensure() {
    if (!synth.current) synth.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.35 },
      volume: -10,
    }).toDestination();
    return synth.current;
  }
  const freqOf = (c: number) => homeHz * Math.pow(2, c / 1200);
  function playSeq(cents: number[], gap = 0.5, dur = 0.45) {
    if (!isArmed()) return;
    const s = ensure(); const t0 = Tone.now() + 0.05;
    cents.forEach((c, i) => s.triggerAttackRelease(freqOf(c), dur, t0 + i * gap));
  }
  function playTogether(cents: number[], dur = 1.8) {
    if (!isArmed()) return;
    const s = ensure(); const t0 = Tone.now() + 0.05;
    cents.forEach(c => s.triggerAttackRelease(freqOf(c), dur, t0));
  }

  const n = phase.kind === "ask" || phase.kind === "closed" ? phase.n : 0;
  const chain = Array.from({ length: n }, (_, i) => noteCents(i));
  const cand = noteCents(n);
  let nearestIdx = 0, gap = 1e9;
  chain.forEach((c, i) => { const d = circDist(c, cand); if (d < gap) { gap = d; nearestIdx = i; } });

  function advance(from: number) {
    const next = ASK_AT.find(a => a > from);
    if (next == null) setPhase({ kind: "end" });
    else setPhase({ kind: "ask", n: next });
  }

  // ── the scale strip: every kept note on one octave-circle, colored by decision generation ──
  const W = 760, H = 64;
  const xOf = (c: number) => 20 + (c / 1200) * (W - 40);
  const strip = phase.kind !== "octave" && phase.kind !== "octave-nofold" && (
    <svg width={W} height={H} className="scope" style={{ maxWidth: "100%" }}>
      <line x1={20} x2={W - 20} y1={H - 18} y2={H - 18} stroke="rgba(244,241,232,.35)" />
      <text x={20} y={H - 4} fontSize={9} fontFamily="monospace" fill="#9a968a">Home</text>
      <text x={W - 20} y={H - 4} fontSize={9} fontFamily="monospace" fill="#9a968a" textAnchor="end">the fold (×2)</text>
      {chain.map((c, i) => (
        <g key={i}>
          <line x1={xOf(c)} x2={xOf(c)} y1={16} y2={H - 18} stroke={GEN_COLORS[genOf(i)]} strokeWidth={2.5} />
          <text x={xOf(c)} y={12} fontSize={9.5} fontFamily="monospace" fill={GEN_COLORS[genOf(i)]} textAnchor="middle">{nameOf(i)}</text>
        </g>
      ))}
      {phase.kind === "ask" && (
        <g>
          <line x1={xOf(cand)} x2={xOf(cand)} y1={16} y2={H - 18} stroke="#f4f1e8" strokeWidth={2} strokeDasharray="4 3" />
          <text x={xOf(cand)} y={12} fontSize={11} fill="#f4f1e8" textAnchor="middle">?</text>
        </g>
      )}
    </svg>
  );

  const btn = (label: string, onClick: () => void, primary = false) => (
    <button className={primary ? "primary" : ""} onClick={onClick}>{label}</button>
  );

  let body: ReactNode = null;
  if (phase.kind === "octave") body = (
    <>
      <p>Here is a tone. Its name is <b>A</b>. And here is the same thing happening <b>twice as fast</b> (×2).
        Listen, then decide: does "twice as fast" deserve to count as <b>the same note</b>, or a different one?</p>
      <div className="dialrow">
        {btn("▶ hear A, then ×2", () => playSeq([0, 1200]))}
        {btn("▶ hear them together", () => playTogether([0, 1200]))}
        {btn("same note", () => { emit("folded"); setPhase({ kind: "fifth" }); }, true)}
        {btn("different note", () => setPhase({ kind: "octave-nofold" }))}
      </div>
    </>
  );
  else if (phase.kind === "octave-nofold") body = (
    <>
      <p>Fair — they're clearly not <i>identical</i>. But look at the price: if ×2 gets a new name, names
        never repeat. The range you can hear covers about <b>ten doublings</b>, so every pattern you learn
        at one height has to be relearned, with new names, at every other height. Nearly every musical
        culture ever studied has decided this pair is "the same note, higher" — the <b>fold</b>.</p>
      <div className="dialrow">
        {btn("▶ a tiny tune, then ×2 — same shape?", () => playSeq([0, 204, 386, 0, 1200, 1404, 1586, 1200], 0.32))}
        {btn("okay — fold, and continue", () => { emit("folded"); setPhase({ kind: "fifth" }); }, true)}
      </div>
    </>
  );
  else if (phase.kind === "fifth") body = (
    <>
      <p>Everything ×2 now shares one name: <b>A</b>. Next relationship: <b>×3</b> (folded back down: ×3/2).
        It rests beautifully against A — almost family. Same note, or a new one?</p>
      <div className="dialrow">
        {btn("▶ hear A, then ×3/2", () => playSeq([0, FIFTH]))}
        {btn("▶ together", () => playTogether([0, FIFTH]))}
        {btn("same note", () => setPhase({ kind: "fifth-drone" }))}
        {btn("new note — call it B", () => setPhase({ kind: "ask", n: 2 }), true)}
      </div>
    </>
  );
  else if (phase.kind === "fifth-drone") body = (
    <>
      <p>Careful — if ×3 is "the same," then so is ×3 of ×3, and ×3 of that… and every note reachable by
        2s and 3s collapses into one name. One name = one note = <b>drone music</b>. (A beautiful choice —
        entire traditions live there — but the game ends.)</p>
      <div className="dialrow">
        {btn("▶ the drone world", () => playTogether([0, 1200, FIFTH], 2.5))}
        {btn("reconsider: B is a new note", () => setPhase({ kind: "ask", n: 2 }), true)}
      </div>
    </>
  );
  else if (phase.kind === "ask") body = (
    <>
      <p>
        You have <b>{n} notes</b> ({Array.from({ length: n }, (_, i) => nameOf(i)).join(" ")}), each one
        a ×3/2 above the last, folded into the octave. Stacking once more lands the dashed candidate{" "}
        <b>{gap.toFixed(1)}¢ away</b> from <b>{nameOf(nearestIdx)}</b>.
        {n === 12 && " (This 23.5¢ sliver is the famous Pythagorean comma.)"}
        {n === 7 && " (It sits between two neighbors: 90¢ below one — the limma — and 114¢ above the other — the apotome.)"}
        {" "}Same note, or new note?
      </p>
      <div className="dialrow">
        {btn(`▶ ${nameOf(nearestIdx)}, then the candidate`, () => playSeq([chain[nearestIdx], cand]))}
        {btn("▶ together (listen for beating)", () => playTogether([chain[nearestIdx], cand]))}
        {btn("same note — close the circle", () => { emit(`closed:${n}`); setPhase({ kind: "closed", n }); }, true)}
        {btn("new note — keep stacking", () => { emit(`kept:${n}`); advance(n); })}
      </div>
    </>
  );
  else if (phase.kind === "closed") {
    const tf = temperedFifth(n);
    body = (
      <>
        <p>
          Circle closed: <b>{CLOSURE_NAMES[n] ?? `a ${n}-note system`}</b>. But there's a <b>crack</b> —
          the two notes you merged were really {gap.toFixed(1)}¢ apart, and a tune that walks around the
          circle lands there. The fix is <b>tempering</b>: bend every ×3/2 a little
          ({FIFTH.toFixed(1)}¢ → {tf.toFixed(1)}¢, {Math.abs(FIFTH - tf) < 0.1 ? "almost nothing" : `${Math.abs(FIFTH - tf).toFixed(1)}¢ of bend`})
          so all {n} steps come out exactly equal and the crack vanishes. That's the deal every tuning
          system makes: a little purity for a circle that closes.
        </p>
        <div className="dialrow">
          {btn("▶ hear the crack", () => playTogether([chain[nearestIdx], cand]))}
          {btn("▶ pure ×3/2, then tempered", () => playSeq([0, FIFTH, 0, tf], 0.45))}
          {btn(`▶ the smoothed ${n}-note circle`, () => playSeq(Array.from({ length: n + 1 }, (_, i) => (i * 1200) / n), Math.max(0.16, 1.6 / n), 0.3))}
          {btn("un-merge — keep both and continue", () => advance(n))}
          {btn("start over", () => setPhase({ kind: "octave" }))}
        </div>
      </>
    );
  }
  else body = (
    <>
      <p>You out-stacked the game — past 53 notes, the candidates land closer than anyone can hear
        (3.6¢ and shrinking), so every path from here is a circle in practice. The systems you passed —
        5, 7, 12, 17, 29, 41, 53 — are exactly the ones history kept trying. Each one is just a
        different answer to the same question you've been asked all along.</p>
      <div className="dialrow">{btn("start over", () => setPhase({ kind: "octave" }), true)}</div>
    </>
  );

  return (
    <div>
      {strip}
      {body}
      <Dials names={["homeHz"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">
        Every tuning system in history is a trail of answers to this one question. Say "same" early and
        you get few notes and big compromises; say "new" forever and you get purity but no circle —
        and a keyboard with a thousand keys.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "same-note",
  title: "Is That the Same Note?",
  blurb: "Derive the world's scales yourself, one question at a time.",
  thread: "color",
  dials: {
    homeHz: { type: "slider", min: 110, max: 440, step: 1, default: 220, label: "home (Hz)" },
  },
  component: Comp,
};
