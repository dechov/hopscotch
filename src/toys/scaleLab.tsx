import { blip } from "../audio/engine";
import { moveFor, SCALES } from "../content/glossary";
import { midiToFreq, NAMES } from "../audio/notes";
import { PitchSurface } from "./PitchSurface";
import type { ToyDef, ToyInnerProps } from "./types";

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const home = 60;
  const mask: number[] = dials.mask;

  function toggle(pc: number) {
    if (pc === 0) return; // home stays
    const next = mask.includes(pc) ? mask.filter(p => p !== pc) : [...mask, pc].sort((a, b) => a - b);
    setDial("mask", next);
    emit("maskChanged");
  }
  const chant = [...mask, 12].map((pc, i, arr) => i === 0 ? null : moveFor(pc - arr[i - 1]).word).filter(Boolean);

  return (
    <div>
      <div className="dialrow" style={{ gap: 6 }}>
        {Array.from({ length: 12 }, (_, pc) => (
          <button key={pc}
            style={{ minWidth: 52, borderColor: mask.includes(pc) ? "var(--home)" : "var(--line)", opacity: pc === 0 ? 1 : undefined, background: mask.includes(pc) ? "rgba(242,193,78,.2)" : undefined }}
            onClick={() => toggle(pc)}>
            {NAMES[pc]}{pc === 0 ? " ★" : ""}
          </button>
        ))}
      </div>
      <div className="dialrow">
        <button onClick={() => setDial("mask", SCALES["five-major"].pcs)}>five-tone (bright)</button>
        <button onClick={() => setDial("mask", SCALES["five-minor"].pcs)}>five-tone (moody)</button>
        <button onClick={() => setDial("mask", SCALES["rainbow"].pcs)}>seven-tone</button>
      </div>
      <div className="verdict rest">the chant: {chant.join(" · ")} <span className="smallnote">(…and back to Home)</span></div>
      <PitchSurface surface="keys" home={home} pcs={mask} range={[60, 72]} labels="letters"
        onNote={(m) => { blip(midiToFreq(m), 0.45); emit("noteOn"); }} />
      <p className="smallnote">A scale is just a chant of moves that adds up to a fly (12). The seven-tone scale's chant has <b>scoots</b> in it — that's where the spice (and the danger) lives. The five-tone scale's chant has none.</p>
    </div>
  );
}

export const def: ToyDef = {
  id: "scale-lab",
  title: "Scale Lab",
  blurb: "Build your own scale; read its chant of moves.",
  thread: "color",
  dials: { mask: { type: "select", default: [0, 2, 4, 7, 9], label: "mask" } as any },
  component: Comp,
};
