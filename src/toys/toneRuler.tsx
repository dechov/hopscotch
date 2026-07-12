import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { Tone, isArmed } from "../audio/engine";
import { RATIOS, STICKERS } from "../content/glossary";
import { midiToFreq, midiName } from "../audio/notes";
import { Dials } from "./Dials";
import type { ToyDef, ToyInnerProps } from "./types";

// The ruler axis: x position is log2(frequency). Equal distance = equal ratio,
// so an octave is the same width everywhere and each 12-EDO band is 1/12 of it (100¢).
const W = 760;
const LO_MIDI = 40, HI_MIDI = 88; // E2 … E6
const F_LO = midiToFreq(LO_MIDI), F_HI = midiToFreq(HI_MIDI);
const X0 = 30, X1 = W - 8;
const SPAN = Math.log2(F_HI / F_LO);
const xOf = (f: number) => X0 + (Math.log2(f / F_LO) / SPAN) * (X1 - X0);
const fOf = (x: number) => F_LO * Math.pow(2, ((x - X0) / (X1 - X0)) * SPAN);

const BLACK = new Set([1, 3, 6, 8, 10]);
const GUITAR = [64, 59, 55, 50, 45, 40]; // E4 B3 G3 D3 A2 E2, top→bottom like tab
const VIOLIN = [76, 69, 62, 55];         // E5 A4 D4 G3 — a mandolin tunes the same
const STRING_SPAN = 12;                  // each string strip covers one fly (octave)

type Target = { f: number; label: string };

function targetsFor(snap: string, homeHz: number, edo: number): Target[] {
  const out: Target[] = [];
  if (snap === "grid") {
    // N equal divisions of the fly (octave), anchored at Home
    const kLo = Math.ceil(edo * Math.log2(F_LO / homeHz));
    const kHi = Math.floor(edo * Math.log2(F_HI / homeHz));
    for (let k = kLo; k <= kHi; k++) {
      out.push({ f: homeHz * Math.pow(2, k / edo), label: `${((k % edo) + edo) % edo}/${edo}` });
    }
  } else if (snap === "pure") {
    for (const r of RATIOS) {
      if (r.a === 2) continue; // 2:1 is just 1:1 an octave up
      for (let k = -3; k <= 4; k++) {
        const f = homeHz * (r.a / r.b) * Math.pow(2, k);
        if (f >= F_LO && f <= F_HI) out.push({ f, label: `${r.a}:${r.b}` });
      }
    }
  } else if (snap === "five") {
    [0, 2, 4, 7, 9].forEach((pc, i) => {
      for (let k = -3; k <= 4; k++) {
        const f = homeHz * Math.pow(2, (pc + 12 * k) / 12);
        if (f >= F_LO && f <= F_HI) out.push({ f, label: STICKERS[i] });
      }
    });
  }
  return out.sort((a, b) => a.f - b.f);
}

function nearestBand(f: number) {
  const mFloat = 69 + 12 * Math.log2(f / 440);
  const m = Math.round(mFloat);
  const cents = Math.round((mFloat - m) * 100);
  return { name: midiName(m), cents };
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function Comp({ dials, emit, locked, setDial }: ToyInnerProps) {
  const homeHz = dials.homeHz as number;
  const snap = dials.snap as string;
  const edo = dials.edo as number;
  const [cur, setCur] = useState<number | null>(null);   // last touched frequency
  const [curLabel, setCurLabel] = useState("");          // snap target name, if snapped
  const [held, setHeld] = useState(false);
  const heldRef = useRef(false);
  const voice = useRef<{ o: Tone.Oscillator; g: Tone.Gain } | null>(null);

  useEffect(() => () => {
    if (voice.current) { voice.current.o.stop().dispose(); voice.current.g.dispose(); voice.current = null; }
  }, []);

  useEffect(() => {
    if (!dials.drone || !isArmed()) return;
    const o = new Tone.Oscillator({ frequency: homeHz, type: "triangle", volume: -16 }).toDestination().start();
    return () => { o.stop().dispose(); };
  }, [dials.drone, homeHz]);

  const svgRef = useRef<SVGSVGElement>(null);

  function pick(clientX: number, fMin: number, fMax: number) {
    const r = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W; // svg may render narrower than W on small screens
    let f = fOf(Math.min(X1, Math.max(X0, x)));
    let label = "";
    const ts = targetsFor(snap, homeHz, edo);
    if (ts.length) {
      let best = ts[0], bd = Infinity;
      for (const t of ts) { const d = Math.abs(Math.log2(t.f / f)); if (d < bd) { bd = d; best = t; } }
      f = best.f; label = best.label;
    }
    f = Math.min(fMax, Math.max(fMin, f));
    return { f, label };
  }

  function sound(f: number) {
    if (!isArmed()) return;
    if (!voice.current) {
      const g = new Tone.Gain(0).toDestination();
      const o = new Tone.Oscillator({ frequency: f, type: "triangle", volume: -8 }).connect(g).start();
      voice.current = { o, g };
    }
    voice.current.o.frequency.rampTo(f, 0.03);
    voice.current.g.gain.rampTo(0.9, 0.02);
  }
  function hush() { voice.current?.g.gain.rampTo(0, 0.08); }

  function hitProps(fMin: number, fMax: number) {
    const apply = (e: ReactPointerEvent, isDown: boolean) => {
      const { f, label } = pick(e.clientX, fMin, fMax);
      sound(f); setCur(f); setCurLabel(label);
      if (isDown) {
        emit("played");
        if (Math.abs(1200 * Math.log2(f / homeHz)) < 5) emit("homeTouched");
        if (label && snap === "pure") emit("pureLanded");
        if (label && snap === "five") emit("fiveLanded");
      }
    };
    const release = () => { heldRef.current = false; setHeld(false); hush(); };
    return {
      onPointerDown: (e: ReactPointerEvent) => {
        (e.target as Element).setPointerCapture(e.pointerId);
        heldRef.current = true; setHeld(true); apply(e, true);
      },
      onPointerMove: (e: ReactPointerEvent) => { if (heldRef.current) apply(e, false); },
      onPointerUp: release,
      onPointerCancel: release,
      style: { cursor: "crosshair" } as CSSProperties,
    };
  }

  // ── layout ──
  const showG = !!dials.guitar, showV = !!dials.violin;
  const labelRow = snap === "pure" || snap === "five";
  const KEY_Y = 26, KEY_H = 56;
  let y = KEY_Y + KEY_H + (labelRow ? 18 : 6);
  const gY = y; if (showG) y += 16 + GUITAR.length * 15 + 6;
  const vY = y; if (showV) y += 16 + VIOLIN.length * 15 + 6;
  const H = y + 2;

  const targets = targetsFor(snap, homeHz, edo);
  const tickColor = snap === "grid" ? "#9a968a" : snap === "pure" ? "#9ad0e8" : "#f2c14e";

  const bands: ReactElement[] = [];
  for (let m = LO_MIDI; m <= HI_MIDI; m++) {
    const xa = Math.max(X0, xOf(midiToFreq(m - 0.5)));
    const xb = Math.min(X1, xOf(midiToFreq(m + 0.5)));
    const black = BLACK.has(((m % 12) + 12) % 12);
    bands.push(
      <rect key={m} x={xa} y={KEY_Y} width={xb - xa} height={KEY_H}
        fill={black ? "#26282c" : "#e9e5d8"} stroke="#44474d" strokeWidth={0.75} />
    );
    if (m % 12 === 0) bands.push(
      <text key={`l${m}`} x={(xa + xb) / 2} y={KEY_Y + KEY_H - 5} textAnchor="middle"
        fontSize={9} fontFamily="monospace" fill="#2c2e33">{midiName(m)}</text>
    );
  }

  function strings(opens: number[], y0: number, header: string, frets: boolean, color: string) {
    return (
      <g>
        <text x={X0} y={y0 + 10} fontSize={11} fill="#cfcabb" fontFamily="monospace">{header}</text>
        {opens.map((open, i) => {
          const yy = y0 + 16 + i * 15 + 7;
          const fo = midiToFreq(open), fe = midiToFreq(open + STRING_SPAN);
          const xa = xOf(fo), xb = xOf(fe);
          return (
            <g key={open}>
              <line x1={xa} x2={xb} y1={yy} y2={yy} stroke={color} strokeWidth={1.5} opacity={0.8} />
              {frets && Array.from({ length: STRING_SPAN }, (_, k) => k + 1).map(k => (
                <line key={k} x1={xOf(midiToFreq(open + k))} x2={xOf(midiToFreq(open + k))}
                  y1={yy - 4} y2={yy + 4} stroke="#9a968a" strokeWidth={1} />
              ))}
              <circle cx={xa} cy={yy} r={3.5} fill="none" stroke={color} strokeWidth={1.5} />
              <text x={xa - 7} y={yy + 3} textAnchor="end" fontSize={9} fontFamily="monospace" fill="#9a968a">
                {midiName(open)}
              </text>
              <rect x={Math.max(0, xa - 8)} y={yy - 7} width={xb - xa + 16} height={15}
                fill="transparent" {...hitProps(fo, fe)} />
            </g>
          );
        })}
      </g>
    );
  }

  const band = cur != null ? nearestBand(cur) : null;
  const fromHome = cur != null ? Math.round(1200 * Math.log2(cur / homeHz)) : null;

  return (
    <div>
      <svg ref={svgRef} width={W} height={H} className="scope"
        style={{ touchAction: "none", userSelect: "none", maxWidth: "100%" }}>
        {/* Hz axis */}
        <text x={2} y={12} fontSize={10} fill="#9a968a" fontFamily="monospace">Hz</text>
        {[110, 220, 440, 880].map(hz => (
          <g key={hz}>
            <text x={xOf(hz)} y={12} textAnchor="middle" fontSize={11} fill="#cfcabb" fontFamily="monospace">{hz}</text>
            <line x1={xOf(hz)} x2={xOf(hz)} y1={15} y2={KEY_Y} stroke="rgba(244,241,232,.4)" />
          </g>
        ))}
        {/* home marker */}
        <polygon points={`${xOf(homeHz) - 5},${KEY_Y - 9} ${xOf(homeHz) + 5},${KEY_Y - 9} ${xOf(homeHz)},${KEY_Y - 1}`}
          fill="#f2c14e" />

        {/* the keyboard strip — equal bands because the axis is logarithmic */}
        {bands}
        {/* snap targets superimposed */}
        {targets.map((t, i) => (
          <g key={i}>
            <line x1={xOf(t.f)} x2={xOf(t.f)} y1={KEY_Y} y2={KEY_Y + KEY_H}
              stroke={tickColor} strokeWidth={snap === "grid" ? 1 : 1.5} opacity={snap === "grid" ? 0.55 : 0.9} />
            {labelRow && (
              <text x={xOf(t.f)} y={KEY_Y + KEY_H + 12} textAnchor="middle" fontSize={8.5}
                fontFamily="monospace" fill={tickColor}>{t.label}</text>
            )}
          </g>
        ))}
        <rect x={X0} y={KEY_Y} width={X1 - X0} height={KEY_H} fill="transparent" {...hitProps(F_LO, F_HI)} />

        {showG && strings(GUITAR, gY, "guitar — fret ticks are the same 12-EDO grid as the bands above", true, "#9ad0e8")}
        {showV && strings(VIOLIN, vY, "violin / mandolin — no frets: every point on the line is playable", false, "#c79bca")}

        {/* playhead */}
        {cur != null && (
          <line x1={xOf(cur)} x2={xOf(cur)} y1={16} y2={H - 2} stroke="#f4f1e8"
            strokeWidth={2} opacity={held ? 0.95 : 0.35} />
        )}
      </svg>

      <div className="readout">
        <div className="chip"><div className="k">frequency</div><div className="v">{cur != null ? `${cur.toFixed(1)} Hz` : "—"}</div></div>
        <div className="chip"><div className="k">nearest band</div><div className="v">{band ? `${band.name} ${sign(band.cents)}¢` : "—"}</div></div>
        <div className="chip"><div className="k">from home</div><div className="v">{fromHome != null ? `${sign(fromHome)}¢` : "—"}</div></div>
        {snap !== "off" && <div className="chip"><div className="k">snapped to</div><div className="v">{curLabel || "—"}</div></div>}
      </div>

      <Dials names={snap === "grid"
          ? ["snap", "edo", "homeHz", "drone", "guitar", "violin"]
          : ["snap", "homeHz", "drone", "guitar", "violin"]}
        specs={def.dials} values={dials} locked={locked} set={setDial} />

      <p className="smallnote">
        This ruler is <b>logarithmic</b>: equal distance = equal <i>ratio</i>. Every fly (×2 in Hz) is the
        same width, so each band is one twelfth of an octave — ×2<sup>1/12</sup> ≈ 1.0595, exactly 100¢ (a <b>¢</b>, "cent," is a scoot sliced into 100 bits).
        That's why the frets, which crowd together on a real guitar neck, sit perfectly evenly here:
        the 12-EDO grid <b>is</b> this even spacing. The piano picked 12 slices per octave, but the slices
        dial lets you chop the fly into any number of equal steps (1 slice = only flies!). And between
        the bands there's still sound — drag anywhere (snap off) to play the in-between pitches a
        keyboard hides.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "tone-ruler",
  title: "Tone Ruler",
  blurb: "Keys, frets, and strings laid on one log-frequency ruler — with the in-between pitches too.",
  thread: "sound",
  dials: {
    snap:   { type: "select", default: "off", label: "snap to", options: [
      { value: "off",  label: "nothing — free glide" },
      { value: "grid", label: "the equal grid over Home" },
      { value: "pure", label: "pure ratios over Home" },
      { value: "five", label: "the five-tone scale over Home" },
    ]},
    edo:    { type: "slider", min: 1, max: 24, step: 1, default: 12, label: "slices per fly" },
    homeHz: { type: "slider", min: 110, max: 440, step: 1, default: 220, label: "home (Hz)" },
    drone:  { type: "toggle", default: false, label: "home drone" },
    guitar: { type: "toggle", default: true,  label: "guitar strings" },
    violin: { type: "toggle", default: false, label: "violin / mandolin" },
  },
  component: Comp,
};
