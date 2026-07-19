import { useEffect, useRef, useState } from "react";
import { Tone, isArmed, blip } from "../audio/engine";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

// The 5-limit just-intonation lattice, as drawn in Erlich's "A Middle Path": the ×3 axis runs
// horizontally (each rung a fifth, folded by octaves), the ×5 axis runs diagonally up (each
// rung a pure third). Every node is a playable ratio over Home; comma walks trace the paths
// whose ends *almost* meet — the cracks temperament exists to smooth over.

const F_RANGE = 6; // fifths axis: -6 … +6 (13 columns — wide enough for the full Pythagorean-comma walk)
const T_RANGE = 2; // thirds axis: -2 … +2

type Node = { f: number; t: number; num: number; den: number; cents: number };

function makeNode(f: number, t: number): Node {
  // 3^f * 5^t * 2^k reduced into [1, 2)
  let num = Math.pow(3, Math.max(f, 0)) * Math.pow(5, Math.max(t, 0));
  let den = Math.pow(3, Math.max(-f, 0)) * Math.pow(5, Math.max(-t, 0));
  while (num / den >= 2) den *= 2;
  while (num / den < 1) num *= 2;
  return { f, t, num, den, cents: 1200 * Math.log2(num / den) };
}

const NODES: Node[] = [];
for (let t = -T_RANGE; t <= T_RANGE; t++)
  for (let f = -F_RANGE; f <= F_RANGE; f++) NODES.push(makeNode(f, t));
const nodeAt = (f: number, t: number) => NODES.find(n => n.f === f && n.t === t)!;

// layout: x follows the fifths axis, shifted half a column per third-rung (Erlich's diagonal)
const W = 760, DX = 50, DY = 60;
const xOf = (f: number, t: number) => 75 + (f + F_RANGE + (t + T_RANGE) * 0.5) * DX - T_RANGE * 0.5 * DX;
const yOf = (t: number) => 34 + (T_RANGE - t) * DY;
const H = yOf(-T_RANGE) + 40;

type Walk = {
  name: string;
  steps: [number, number][];   // lattice path, stepped with sound
  endA: [number, number];      // the two nodes that *almost* meet…
  endB: [number, number];
  cents: number;               // …and the comma between them
};
const WALKS: Walk[] = [
  {
    name: "syntonic comma (21.5¢)",
    steps: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1]],
    endA: [4, 0], endB: [0, 1], cents: 21.51,
  },
  {
    name: "Pythagorean comma (23.5¢)",
    steps: Array.from({ length: 13 }, (_, i) => [i - 6, 0] as [number, number]),
    endA: [6, 0], endB: [-6, 0], cents: 23.46,
  },
];

function Comp({ dials, emit, locked, setDial }: ToyInnerProps) {
  const homeHz = dials.homeHz as number;
  const [picked, setPicked] = useState<Node | null>(null);
  const [lit, setLit] = useState<string | null>(null);        // "f,t" of the walking highlight
  const [walkPath, setWalkPath] = useState<Walk | null>(null);
  const timers = useRef<number[]>([]);
  const pair = useRef<Tone.PolySynth | null>(null);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    pair.current?.dispose(); pair.current = null;
  }, []);

  useEffect(() => {
    if (!dials.drone || !isArmed()) return;
    const o = new Tone.Oscillator({ frequency: homeHz / 2, type: "triangle", volume: -18 }).toDestination().start();
    return () => { o.stop().dispose(); };
  }, [dials.drone, homeHz]);

  const freqOf = (n: Node) => homeHz * (n.num / n.den);

  function play(n: Node) {
    blip(freqOf(n), 0.5);
    setPicked(n);
    emit("noteOn");
    if (n.f === 0 && n.t === 0) emit("homeTouched");
  }

  function playPairTogether(a: Node, b: Node) {
    if (!isArmed()) return;
    if (!pair.current) pair.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.4 }, volume: -12,
    }).toDestination();
    const t0 = Tone.now() + 0.05;
    pair.current.triggerAttackRelease(freqOf(a), 2.2, t0);
    pair.current.triggerAttackRelease(freqOf(b), 2.2, t0);
  }

  function walk(w: Walk) {
    timers.current.forEach(clearTimeout); timers.current = [];
    setWalkPath(w);
    emit(`walk:${w.name.split(" ")[0]}`);
    const STEP = 550;
    w.steps.forEach(([f, t], i) => {
      timers.current.push(window.setTimeout(() => {
        const n = nodeAt(f, t);
        setLit(`${f},${t}`); setPicked(n); blip(freqOf(n), 0.42);
      }, i * STEP));
    });
    // the punchline: the two ends together, beating one comma apart
    timers.current.push(window.setTimeout(() => {
      setLit(null);
      playPairTogether(nodeAt(...w.endA), nodeAt(...w.endB));
    }, w.steps.length * STEP + 350));
  }

  const centsFromHome = picked ? Math.round(1200 * Math.log2(picked.num / picked.den) * 10) / 10 : null;

  return (
    <div>
      <svg width={W} height={H} className="scope" style={{ maxWidth: "100%", userSelect: "none" }}>
        {/* lattice rungs */}
        {NODES.map(n => (
          <g key={`r${n.f},${n.t}`}>
            {n.f < F_RANGE && (
              <line x1={xOf(n.f, n.t)} y1={yOf(n.t)} x2={xOf(n.f + 1, n.t)} y2={yOf(n.t)}
                stroke="rgba(244,241,232,.18)" />
            )}
            {n.t < T_RANGE && (
              <line x1={xOf(n.f, n.t)} y1={yOf(n.t)} x2={xOf(n.f, n.t + 1)} y2={yOf(n.t + 1)}
                stroke="rgba(244,241,232,.18)" />
            )}
          </g>
        ))}
        {/* active walk path */}
        {walkPath && walkPath.steps.slice(1).map(([f, t], i) => {
          const [pf, pt] = walkPath.steps[i];
          return <line key={`w${i}`} x1={xOf(pf, pt)} y1={yOf(pt)} x2={xOf(f, t)} y2={yOf(t)}
            stroke="#9ad0e8" strokeWidth={2.5} opacity={0.8} />;
        })}
        {/* nodes */}
        {NODES.map(n => {
          const isHome = n.f === 0 && n.t === 0;
          const isLit = lit === `${n.f},${n.t}`;
          const isPicked = picked === n;
          return (
            <g key={`${n.f},${n.t}`} onPointerDown={() => play(n)} style={{ cursor: "pointer" }}>
              <circle cx={xOf(n.f, n.t)} cy={yOf(n.t)} r={21}
                fill={isLit ? "#9ad0e8" : isHome ? "rgba(242,193,78,.25)" : "rgba(244,241,232,.06)"}
                stroke={isHome ? "#f2c14e" : isPicked ? "#f4f1e8" : "rgba(244,241,232,.4)"}
                strokeWidth={isHome || isPicked ? 2.5 : 1} />
              <text x={xOf(n.f, n.t)} y={yOf(n.t) - 2} textAnchor="middle" fontSize={n.num > 99 || n.den > 99 ? 8 : 10}
                fontFamily="monospace" fill={isLit ? "#2c2e33" : "#f4f1e8"}>{n.num}</text>
              <line x1={xOf(n.f, n.t) - 9} x2={xOf(n.f, n.t) + 9} y1={yOf(n.t) + 1.5} y2={yOf(n.t) + 1.5}
                stroke={isLit ? "#2c2e33" : "#9a968a"} strokeWidth={0.75} />
              <text x={xOf(n.f, n.t)} y={yOf(n.t) + 12} textAnchor="middle" fontSize={n.num > 99 || n.den > 99 ? 8 : 10}
                fontFamily="monospace" fill={isLit ? "#2c2e33" : "#cfcabb"}>{n.den}</text>
            </g>
          );
        })}
        <text x={W - 8} y={H - 8} textAnchor="end" fontSize={10} fontFamily="monospace" fill="#9a968a">
          → each step right = ×3/2 (a leap) · ↗ each step up = ×5/4 (a pure skip) · octaves folded away
        </text>
      </svg>

      <div className="readout">
        <div className="chip"><div className="k">last played</div><div className="v">{picked ? `${picked.num}/${picked.den}` : "—"}</div></div>
        <div className="chip"><div className="k">from Home</div><div className="v">{centsFromHome != null ? `${centsFromHome}¢` : "—"}</div></div>
        <div className="chip"><div className="k">frequency</div><div className="v">{picked ? `${freqOf(picked).toFixed(1)} Hz` : "—"}</div></div>
      </div>

      <div className="dialrow">
        {WALKS.map(w => (
          <button key={w.name} onClick={() => walk(w)}>🚶 walk the {w.name}</button>
        ))}
      </div>

      <Dials names={["homeHz", "drone"]} specs={def.dials} values={dials} locked={locked} set={setDial} />
      <p className="smallnote">
        This is the map of <b>pure ratios</b> (5-limit just intonation). Rightward steps stack leaps
        (×3/2); diagonal steps stack pure skips (×5/4); octaves are folded away. The walks trace two
        famous paths whose ends <i>almost</i> meet — at the end you hear both "ends" at once, one comma
        apart, beating. Nudging that crack shut is what temperament is (see The Drift, and the
        Same-Note game).
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "ratio-map",
  title: "Ratio Map",
  blurb: "Every pure ratio on one map — walk the paths that almost close.",
  thread: "sound",
  dials: {
    homeHz: { type: "slider", min: 110, max: 440, step: 1, default: 220, label: "home (Hz)" },
    drone:  { type: "toggle", default: false, label: "home drone" },
  },
  component: Comp,
};
