import { useEffect, useRef, useState } from "react";
import { blip } from "../audio/engine";
import { midiToFreq, midiName } from "../audio/notes";
import { useMic } from "./mic";
import { Readout } from "./Readout";
import type { ToyDef, ToyInnerProps } from "./types";

// The pitch spiral: pitch drawn as a coil. Going around once = one octave, so "fly" is
// literally "same place, one floor up" — the fold made visible. Tap any dot to hear it;
// turn the mic on and your own voice climbs the coil. (Reuses the shared useMic hook.)
const W = 760, H = 320, CX = W / 2, CY = H / 2 + 6;
const M_LO = 40, M_HI = 88;
function posOf(m: number) {
  const ang = ((((m % 12) + 12) % 12) / 12) * Math.PI * 2 - Math.PI / 2;
  const r = 26 + ((m - M_LO) / (M_HI - M_LO)) * 115;
  return { x: CX + r * Math.cos(ang), y: CY + r * Math.sin(ang) };
}

function Comp({ emit }: ToyInnerProps) {
  const mic = useMic();
  const raf = useRef(0);
  const [voice, setVoice] = useState<number | null>(null); // fractional midi from the mic
  const trail = useRef<number[]>([]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  useEffect(() => {
    if (!mic.on) return;
    function frame() {
      const [pitch, clarity] = mic.pitch();
      if (clarity > 0.9 && pitch > 70 && pitch < 1400) {
        const m = 69 + 12 * Math.log2(pitch / 440);
        if (m >= M_LO && m <= M_HI) {
          setVoice(m);
          trail.current = [...trail.current.slice(-40), m];
          emit("voiceOnSpiral");
        }
      }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [mic.on]);

  // the coil path
  let path = "";
  for (let m = M_LO; m <= M_HI; m += 0.25) {
    const p = posOf(m);
    path += (m === M_LO ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1);
  }

  return (
    <div>
      <svg width={W} height={H} className="scope" style={{ maxWidth: "100%", userSelect: "none" }}>
        <path d={path} fill="none" stroke="rgba(244,241,232,.3)" strokeWidth={1.5} />
        {Array.from({ length: M_HI - M_LO + 1 }, (_, i) => M_LO + i).map(m => {
          const p = posOf(m);
          const isA = m % 12 === 9, isC = m % 12 === 0;
          return (
            <g key={m} onPointerDown={() => { blip(midiToFreq(m), 0.4); emit("noteOn"); }} style={{ cursor: "pointer" }}>
              <circle cx={p.x} cy={p.y} r={isC || isA ? 7 : 5}
                fill={isC ? "#f2c14e" : isA ? "#9ad0e8" : "rgba(244,241,232,.5)"} />
              {isC && <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#f2c14e">{midiName(m)}</text>}
            </g>
          );
        })}
        {trail.current.map((m, i) => {
          const p = posOf(m);
          return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f08a6b" opacity={(i + 1) / trail.current.length} />;
        })}
        <text x={8} y={16} fontSize={11} fontFamily="monospace" fill="#9a968a">around once = one fly (octave)</text>
        <text x={8} y={30} fontSize={11} fontFamily="monospace" fill="#9a968a">same direction = same note, higher floor</text>
      </svg>
      <Readout items={[["your voice", voice != null ? `${midiName(Math.round(voice))} ${Math.round((voice - Math.round(voice)) * 100) >= 0 ? "+" : ""}${Math.round((voice - Math.round(voice)) * 100)}¢` : "—"]]} />
      {!mic.on && (
        <div className="dialrow">
          <button onClick={() => mic.enable().then(ok => ok && emit("micOn"))}>🎤 add your voice to the spiral</button>
          {mic.err && <span className="smallnote" style={{ color: "var(--bad)" }}>{mic.err}</span>}
        </div>
      )}
      <p className="smallnote">
        Pitch is a coil: go around once and you're back at the same clock position, one floor up —
        that's why octaves feel like "the same note." All the Cs line up in one golden spoke; all the
        As in a blue one. Tap dots to hear; with the mic on, your voice climbs the coil live —
        sing a fly and watch yourself land on the very same spoke.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "pitch-spiral",
  title: "The Pitch Spiral",
  blurb: "Pitch as a coil — around once is an octave, so 'fly' is the same spoke, one floor up.",
  thread: "color",
  exclusive: true,
  dials: {},
  component: Comp,
};
