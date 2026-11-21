import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { Tone, isArmed } from "../audio/engine";
import { RATIOS as KID_RATIOS } from "../content/glossary";
import { midiName } from "../audio/notes";
import {
  edoInfo, spellWorld, freqOf, pOfFreq, letterPc, nameOf, pcOf,
  RATIO_SET, ratioCents, primeLimit, nearestRatio, type Ratio,
} from "../audio/edo";
import { Dials } from "./Dials";
import { Readout } from "./Readout";
import type { ToyDef, ToyInnerProps } from "./types";

// Three instruments in one world (any N-EDO), all reading the same step numbers:
//   · a pitch line that morphs between log (equal ratio = equal distance) and linear Hz,
//   · a keyboard whose columns sit exactly over the log pitch line (one column per step),
//   · a guitar neck with frets where they really go (crowding toward the body).
// Anything played or hovered in one lights up in the other two.

const W = 760, X0 = 34, X1 = 752;
const PRESETS = [12, 19, 22, 24, 31, 41, 53, 72];
const OPEN: [string, number][] = [["E", 4], ["B", 3], ["G", 3], ["D", 3], ["A", 2], ["E", 2]]; // tab order
const CLR = {
  chalk: "#f4f1e8", dim: "#cfcabb", faint: "#9a968a", line: "rgba(244,241,232,.28)",
  sound: "#9ad0e8", home: "#f2c14e", moves: "#f08a6b", good: "#8fd6a0", timbre: "#c79bca",
};
const KID: Record<string, string> = Object.fromEntries(KID_RATIOS.map(r => [`${r.a}:${r.b}`, r.name]));

type View = "keys" | "guitar" | "line";
type Voice = { view: View; p: number; exact: number; string?: number };
type Hit = { p: number; exact: number; string?: number } | null;

const sign = (x: number) => (x > 0 ? `+${x}` : `${x}`);
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

function svgPoint(e: ReactPointerEvent, el: SVGSVGElement, h: number) {
  const r = el.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * h };
}

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const n = Math.round(dials.edo as number);
  const info = useMemo(() => edoInfo(n), [n]);
  const sp = useMemo(() => spellWorld(info), [info]);
  const pLo = dials.span === "1" ? 0 : -n, pHi = n;          // C4–C5 or C3–C5
  const cols = pHi - pLo + 1;
  const colW = (X1 - X0) / cols;
  const xLog = (p: number) => X0 + (p - pLo + 0.5) * colW;   // keys + log pitch line share this
  const homePc = letterPc(dials.home as string, info);
  const limit = parseInt(dials.ratios as string);
  const bearings = !!dials.bearings;

  // ── the log ⇄ linear morph ──
  const [m, setM] = useState(dials.line === "linear" ? 1 : 0);
  const mRef = useRef(m); mRef.current = m;
  useEffect(() => {
    const target = dials.line === "linear" ? 1 : 0, from = mRef.current, t0 = performance.now();
    if (from === target) return;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 650), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setM(from + (target - from) * e);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [dials.line]);
  const fLo = freqOf(pLo - 0.5, info), fHi = freqOf(pHi + 0.5, info);
  const xLin = (p: number) => X0 + ((freqOf(p, info) - fLo) / (fHi - fLo)) * (X1 - X0);
  const xLine = (p: number) => xLog(p) * (1 - m) + xLin(p) * m;
  const pFromLineX = (x: number) => dials.line === "linear"
    ? pOfFreq(fLo + ((x - X0) / (X1 - X0)) * (fHi - fLo), info)
    : (x - X0) / colW + pLo - 0.5;

  // ── sound ──
  const inst = useRef<{
    keys?: Tone.PolySynth; strings?: Tone.PluckSynth[];
    line?: { o: Tone.Oscillator; g: Tone.Gain; flt: Tone.Filter };
  }>({});
  useEffect(() => () => {
    const i = inst.current;
    i.keys?.dispose(); i.strings?.forEach(s => s.dispose());
    if (i.line) { i.line.o.stop().dispose(); i.line.g.dispose(); i.line.flt.dispose(); }
    inst.current = {};
  }, []);
  function keysSynth() {
    if (!inst.current.keys) {
      const k = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1, modulationIndex: 2.6,
        oscillator: { type: "sine" }, modulation: { type: "sine" },
        envelope: { attack: 0.003, decay: 2.4, sustain: 0.04, release: 0.9 },
        modulationEnvelope: { attack: 0.002, decay: 0.45, sustain: 0.12, release: 0.5 },
      }).toDestination();
      k.volume.value = -13;
      inst.current.keys = k;
    }
    return inst.current.keys;
  }
  function stringSynth(i: number) {
    if (!inst.current.strings) {
      inst.current.strings = OPEN.map(() => {
        const s = new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3600, resonance: 0.975, release: 1 }).toDestination();
        s.volume.value = -3;
        return s;
      });
    }
    return inst.current.strings[i];
  }
  function lineVoice() {
    if (!inst.current.line) {
      const g = new Tone.Gain(0).toDestination();
      const flt = new Tone.Filter(1800, "lowpass").connect(g);
      const o = new Tone.Oscillator({ type: "sawtooth", frequency: 220, volume: -16 }).connect(flt).start();
      inst.current.line = { o, g, flt };
    }
    return inst.current.line;
  }

  useEffect(() => {
    if (!dials.drone || !isArmed()) return;
    const f = freqOf(homePc - n, info); // home, one fly under C4
    const g = new Tone.Gain(0.7).toDestination();
    const flt = new Tone.Filter(1400, "lowpass").connect(g);
    const o = new Tone.Oscillator({ type: "sawtooth", frequency: f, volume: -24 }).connect(flt).start();
    return () => { o.stop().dispose(); flt.dispose(); g.dispose(); };
  }, [dials.drone, homePc, n, info]);

  // ── who's sounding ──
  const [voices, setVoices] = useState<Record<number, Voice>>({});
  const vRef = useRef(voices); vRef.current = voices;
  const [focus, setFocus] = useState<number | null>(null);   // last note played (stays lit softly)
  const [hover, setHover] = useState<{ p: number; exact: number } | null>(null);

  // a different world means different notes: drop everything held
  useEffect(() => {
    inst.current.keys?.releaseAll();
    inst.current.line?.g.gain.rampTo(0, 0.05);
    setVoices({}); setFocus(null); setHover(null);
  }, [n]);

  function soundOn(v: Voice) {
    if (!isArmed()) return;
    const f = freqOf(v.exact, info);
    if (v.view === "keys") keysSynth().triggerAttack(f);
    else if (v.view === "guitar") stringSynth(v.string!).triggerAttack(f);
    else { const l = lineVoice(); l.o.frequency.rampTo(f, 0.03); l.g.gain.rampTo(0.9, 0.02); }
  }
  function soundOff(v: Voice) {
    if (!isArmed()) return;
    if (v.view === "keys") inst.current.keys?.triggerRelease(freqOf(v.exact, info));
    else if (v.view === "line") inst.current.line?.g.gain.rampTo(0, 0.08);
    // guitar strings ring out on their own
  }

  function press(id: number, view: View, hit: Hit) {
    if (!hit) return;
    const v: Voice = { view, ...hit };
    soundOn(v);
    setVoices(o => ({ ...o, [id]: v }));
    setFocus(hit.p);
    emit("played");
    emit(`played:${view}`);
  }
  function drag(id: number, hit: Hit) {
    const old = vRef.current[id];
    if (!old || !hit) return;
    if (old.view === "line") {
      if (Math.abs(old.exact - hit.exact) < 1e-6) return;
      const l = lineVoice(); l.o.frequency.rampTo(freqOf(hit.exact, info), 0.03);
    } else {
      if (old.p === hit.p && old.string === hit.string) return;
      soundOff(old); soundOn({ ...old, ...hit });    // slide across keys, strum across strings
    }
    setVoices(o => ({ ...o, [id]: { ...old, ...hit } }));
    setFocus(hit.p);
  }
  function release(id: number) {
    const old = vRef.current[id];
    if (!old) return;
    soundOff(old);
    setVoices(o => { const c = { ...o }; delete c[id]; return c; });
  }

  const held = Object.values(voices);
  const sounding = new Set(held.map(v => v.p));
  const exactSounding = held.map(v => v.exact);

  // tell lessons about pure intervals as they're held
  const lastIv = useRef("");
  useEffect(() => {
    if (held.length < 2) { lastIv.current = ""; return; }
    const ps = held.map(v => v.exact).sort((a, b) => a - b);
    const nr = nearestRatio(((ps[ps.length - 1] - ps[0]) * 1200) / n);
    const key = Math.abs(nr.off) < 8 ? `${nr.ratio.a}:${nr.ratio.b}` : "";
    if (key && key !== lastIv.current) emit(`interval:${key}`);
    lastIv.current = key;
  });

  // shared pointer plumbing for all three surfaces
  function surface(view: View, h: number, hitAt: (x: number, y: number) => Hit) {
    return {
      onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const { x, y } = svgPoint(e, e.currentTarget, h);
        press(e.pointerId, view, hitAt(x, y));
      },
      onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
        const { x, y } = svgPoint(e, e.currentTarget, h);
        const hit = hitAt(x, y);
        if (vRef.current[e.pointerId]) drag(e.pointerId, hit);
        else if (e.pointerType === "mouse") setHover(hit ? { p: hit.p, exact: hit.exact } : null);
      },
      onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => release(e.pointerId),
      onPointerCancel: (e: ReactPointerEvent<SVGSVGElement>) => release(e.pointerId),
      onPointerLeave: () => setHover(null),
      style: { touchAction: "none", userSelect: "none", width: "100%", height: "auto", display: "block", cursor: "pointer" } as const,
    };
  }

  const lit = (p: number) => sounding.has(p) ? "on" : focus === p ? "focus" : hover?.p === p ? "hover" : "";
  const sameClass = (p: number) => {
    const c = pcOf(p, n);
    return [...sounding].some(q => pcOf(q, n) === c) || (focus != null && pcOf(focus, n) === c);
  };

  // 12-EDO landmarks, as fractional step positions (A4 = 440 in both worlds)
  const bearingsIn = (lo: number, hi: number) => {
    const out: { p: number; midi: number }[] = [];
    for (let midi = 24; midi <= 108; midi++) {
      const p = info.pcA + (n * (midi - 69)) / 12;
      if (p >= lo && p <= hi) out.push({ p, midi });
    }
    return out;
  };

  // ════════════════ pitch line ════════════════
  const LH = 124, BASE = 72;
  const ticks: { p: number; r: Ratio }[] = [];
  for (let o = -3; o <= 2; o++) {
    for (const r of RATIO_SET) {
      if (!r.tick || primeLimit(r) > limit) continue;
      const p = homePc + n * o + (n * ratioCents(r)) / 1200;
      if (p >= pLo - 0.5 && p <= pHi + 0.5) ticks.push({ p, r });
    }
  }
  ticks.sort((a, b) => a.p - b.p);
  const homes: number[] = [];
  for (let p = homePc - 3 * n; p <= pHi; p += n) if (p >= pLo) homes.push(p);

  const lineSnap = dials.snap as string;
  const lineHit = (x: number): Hit => {
    let exact = Math.min(pHi + 0.5, Math.max(pLo - 0.5, pFromLineX(Math.min(X1, Math.max(X0, x)))));
    if (lineSnap === "steps") exact = Math.round(exact);
    else if (lineSnap === "pure") {
      let best = exact, bd = Infinity;
      for (const t of [...ticks.map(t => t.p), ...homes]) { const d = Math.abs(t - exact); if (d < bd) { bd = d; best = t; } }
      exact = best;
    }
    return { p: Math.round(exact), exact };
  };
  const linear = m > 0.5;
  const hzLabels = linear ? [100, 200, 300, 400, 500, 600, 800, 1000] : [110, 165, 220, 330, 440, 660, 880];

  const lineEls: ReactElement[] = [];
  for (const hz of hzLabels) {
    if (hz < fLo || hz > fHi) continue;
    const x = xLine(pOfFreq(hz, info));
    lineEls.push(
      <g key={`hz${hz}`}>
        <text x={x} y={11} textAnchor="middle" fontSize={10} fill={CLR.dim} fontFamily="monospace">{Math.round(hz)}</text>
        <line x1={x} x2={x} y1={14} y2={20} stroke={CLR.line} />
      </g>
    );
  }
  const lastLabel = [-99, -99, -99];
  ticks.forEach((t, i) => {
    const x = xLine(t.p), row = i % 3;
    const label = x - lastLabel[row] > 24;   // squeezed labels (the low end in linear) just drop out
    if (label) lastLabel[row] = x;
    lineEls.push(
      <g key={`r${i}`}>
        <line x1={x} x2={x} y1={26 + row * 10} y2={BASE} stroke={CLR.sound} strokeWidth={1} opacity={label ? 0.7 : 0.45} />
        {label && <text x={x} y={24 + row * 10} textAnchor="middle" fontSize={8.5} fill={CLR.sound} fontFamily="monospace">{t.r.a}:{t.r.b}</text>}
      </g>
    );
  });
  homes.forEach(p => {
    const x = xLine(p);
    lineEls.push(<polygon key={`h${p}`} points={`${x - 5},${BASE - 12} ${x + 5},${BASE - 12} ${x},${BASE - 3}`} fill={CLR.home} />);
  });
  lineEls.push(<line key="axis" x1={X0} x2={X1} y1={BASE} y2={BASE} stroke={CLR.chalk} strokeWidth={1.5} />);
  for (let p = pLo; p <= pHi; p++) {
    const s = sp[pcOf(p, n)], x = xLine(p), l = lit(p);
    lineEls.push(
      <line key={`s${p}`} x1={x} x2={x} y1={BASE} y2={BASE + (s.natural ? 16 : 8)}
        stroke={l === "on" ? CLR.good : l === "focus" ? CLR.chalk : CLR.dim} strokeWidth={s.natural ? 1.5 : 1} opacity={l ? 1 : 0.75} />
    );
    if (s.natural && colW * (1 - m) + 4 * m > 3.5) lineEls.push(
      <text key={`sl${p}`} x={x} y={BASE + 27} textAnchor="middle" fontSize={9.5} fill={CLR.dim} fontFamily="monospace">
        {pcOf(p, n) === 0 ? nameOf(p, info, sp) : s.name}
      </text>
    );
  }
  if (bearings) bearingsIn(pLo - 0.5, pHi + 0.5).forEach(({ p, midi }) => {
    const x = xLine(p);
    lineEls.push(<line key={`b${midi}`} x1={x} x2={x} y1={BASE + 32} y2={BASE + 40} stroke={CLR.moves} strokeWidth={1} opacity={0.7} />);
  });
  if (bearings) lineEls.push(<text key="bl" x={2} y={BASE + 40} fontSize={8} fill={CLR.moves} fontFamily="monospace">12</text>);
  exactSounding.forEach((p, i) => {
    const x = xLine(p);
    lineEls.push(<line key={`on${i}`} x1={x} x2={x} y1={14} y2={LH - 2} stroke={CLR.good} strokeWidth={2} opacity={0.9} />);
  });
  if (hover && !held.length) {
    const x = xLine(hover.exact);
    lineEls.push(<line key="hov" x1={x} x2={x} y1={14} y2={LH - 2} stroke={CLR.chalk} strokeDasharray="3 3" opacity={0.5} />);
  }

  // ════════════════ keyboard ════════════════
  const iso = dials.keys === "iso";
  const KT = 4;
  const naturals: number[] = [];
  for (let p = pLo; p <= pHi; p++) if (sp[pcOf(p, n)].natural) naturals.push(p);
  const tierFrac = (p: number) => {
    const s = sp[pcOf(p, n)];
    if (s.natural) return 1;
    if (s.arrows === 0) return 0.6;
    return Math.abs(s.sharps) === 0 ? 0.44 : 0.34;
  };
  const accFill = (p: number) => {
    const s = sp[pcOf(p, n)];
    if (s.arrows !== 0 && s.sharps === 0) return "#3a3d44";
    return s.sharps > 0 ? "#22313a" : "#3a3222";
  };

  // isomorphic (Bosanquet-style): right = whole tone, up = chromatic semitone (♯). x stays the
  // step column, so every key still sits over its tick on the log pitch line.
  let isoW = info.W > 0 ? info.W : 1, isoU = info.A1;
  const isoFallback = isoU <= 0 || gcd(gcd(isoW, isoU), n) !== 1;
  if (isoFallback) { isoW = Math.max(1, info.W); isoU = 1; }
  const ROWS = [2, 1, 0, -1, -2], KRH = 30;
  const isoKeys: { p: number; x: number; y: number }[] = [];
  if (iso) ROWS.forEach((r, ri) => {
    const y = KT + ri * KRH + KRH / 2;
    for (let c = Math.ceil((pLo - r * isoU) / isoW); c * isoW + r * isoU <= pHi; c++) {
      const p = c * isoW + r * isoU;
      isoKeys.push({ p, x: xLog(p), y });
    }
  });
  let isoR = 16;
  if (iso) {
    let md = Infinity;
    for (let dr = 0; dr <= 3; dr++) for (let dc = -4; dc <= 4; dc++) {
      if (!dr && dc <= 0) continue;
      md = Math.min(md, Math.hypot((dc * isoW + dr * isoU) * colW, dr * KRH));
    }
    isoR = Math.max(3, Math.min(14, md * 0.46));
  }
  const KH = iso ? ROWS.length * KRH : 112;
  const KBH = KT + KH + (bearings ? 16 : 6);

  const keyHit = (x: number, y: number): Hit => {
    if (iso) {
      let best: number | null = null, bd = Infinity;
      for (const k of isoKeys) { const d = Math.hypot(k.x - x, k.y - y); if (d < bd) { bd = d; best = k.p; } }
      return best != null && bd < Math.max(isoR * 1.4, 10) ? { p: best, exact: best } : null;
    }
    const p = Math.round((x - X0) / colW - 0.5) + pLo;
    if (p < pLo || p > pHi) return null;
    if (!sp[pcOf(p, n)].natural && y - KT < KH * tierFrac(p)) return { p, exact: p };
    const q = (x - X0) / colW + pLo - 0.5;   // white keys split the gap between naturals evenly
    let nat = naturals[0];
    for (const c of naturals) if (Math.abs(c - q) <= Math.abs(nat - q)) nat = c;
    return { p: nat, exact: nat };
  };

  const keyEls: ReactElement[] = [];
  if (!iso) {
    naturals.forEach((p, i) => {
      const prev = i > 0 ? naturals[i - 1] : null, next = i + 1 < naturals.length ? naturals[i + 1] : null;
      const xa = prev == null ? xLog(p) - colW / 2 : xLog((prev + p) / 2);
      const xb = next == null ? xLog(p) + colW / 2 : xLog((p + next) / 2);
      const l = lit(p);
      keyEls.push(
        <g key={`w${p}`}>
          <rect x={xa} y={KT} width={xb - xa} height={KH} rx={2}
            fill={l === "on" ? CLR.good : l === "focus" ? "#d9ecd9" : sameClass(p) ? "#efe9d2" : "#e9e5d8"}
            stroke="#44474d" strokeWidth={1} />
          {l === "hover" && <rect x={xa + 1} y={KT + 1} width={xb - xa - 2} height={KH - 2} fill="none" stroke={CLR.sound} strokeWidth={2} />}
          {xb - xa > 9 && (
            <text x={(xa + xb) / 2} y={KT + KH - 6} textAnchor="middle" fontSize={pcOf(p, n) === 0 ? 9 : 8.5}
              fontFamily="monospace" fill="#2c2e33">{pcOf(p, n) === 0 ? nameOf(p, info, sp) : sp[pcOf(p, n)].name}</text>
          )}
        </g>
      );
    });
    for (let p = pLo; p <= pHi; p++) {
      if (sp[pcOf(p, n)].natural) continue;
      const l = lit(p), x = xLog(p) - colW / 2 + 0.6, h = KH * tierFrac(p);
      keyEls.push(
        <g key={`a${p}`}>
          <rect x={x} y={KT} width={Math.max(1, colW - 1.2)} height={h} rx={1.5}
            fill={l === "on" ? CLR.good : l === "focus" ? "#6f8f74" : accFill(p)}
            stroke={l === "hover" ? CLR.sound : sameClass(p) ? CLR.faint : "#14161a"} strokeWidth={l === "hover" ? 1.5 : 0.8} />
        </g>
      );
    }
  } else {
    isoKeys.forEach(({ p, x, y }, i) => {
      const s = sp[pcOf(p, n)], l = lit(p);
      const fill = l === "on" ? CLR.good : l === "focus" ? "#6f8f74" : s.natural ? "#e9e5d8" : accFill(p);
      keyEls.push(
        <g key={`i${i}`}>
          <circle cx={x} cy={y} r={isoR} fill={fill}
            stroke={l === "hover" ? CLR.sound : pcOf(p, n) === homePc ? CLR.home : sameClass(p) ? CLR.chalk : "#14161a"}
            strokeWidth={l === "hover" || pcOf(p, n) === homePc ? 2 : 1} />
          {isoR >= 9 && (
            <text x={x} y={y + 3} textAnchor="middle" fontSize={isoR >= 12 ? 9 : 7.5} fontFamily="monospace"
              fill={s.natural || l ? "#2c2e33" : CLR.dim}>{s.name}</text>
          )}
        </g>
      );
    });
  }
  if (bearings) bearingsIn(pLo - 0.5, pHi + 0.5).forEach(({ p, midi }) => {
    const x = xLog(p), y = KT + KH + 3;
    keyEls.push(
      <g key={`kb${midi}`}>
        <line x1={x} x2={x} y1={y} y2={y + 6} stroke={CLR.moves} strokeWidth={1.2} opacity={0.8} />
        {midi % 12 === 0 && <text x={x + 2} y={y + 13} fontSize={8} fill={CLR.moves} fontFamily="monospace">{midiName(midi)}</text>}
      </g>
    );
  });

  // ════════════════ guitar neck ════════════════
  const XN = X0 + 22, GL = 2 * (X1 - 6 - XN);
  const fretX = (k: number) => XN + GL * (1 - Math.pow(2, -k / n));
  const GY = (i: number) => 22 + i * 17;
  const GH = 152;
  const opens = OPEN.map(([L, o]) => letterPc(L, info) + n * (o - 4));
  const cellX = (k: number) => (k === 0 ? (X0 + XN) / 2 - 2 : (fretX(k - 1) + fretX(k)) / 2);
  const guitarHit = (x: number, y: number): Hit => {
    const si = Math.round((y - GY(0)) / 17);
    if (si < 0 || si >= OPEN.length || Math.abs(y - GY(si)) > 10) return null;
    let k: number;
    if (x < XN) k = 0;
    else { const t = Math.min(0.5, (x - XN) / GL); k = Math.max(1, Math.min(n, Math.ceil(-n * Math.log2(1 - t) - 1e-9))); }
    const p = opens[si] + k;
    return { p, exact: p, string: si };
  };
  const gEls: ReactElement[] = [];
  gEls.push(<rect key="neck" x={XN} y={GY(0) - 10} width={fretX(n) - XN + 4} height={GY(5) - GY(0) + 20} fill="#2b2622" rx={3} />);
  if (bearings) for (let j = 1; j <= 12; j++) {
    const x = XN + GL * (1 - Math.pow(2, -j / 12));
    gEls.push(<line key={`gb${j}`} x1={x} x2={x} y1={GY(0) - 10} y2={GY(5) + 10} stroke={CLR.moves} strokeDasharray="2 3" opacity={0.6} />);
  }
  for (let k = 1; k <= n; k++) {
    const x = fretX(k);
    gEls.push(<line key={`f${k}`} x1={x} x2={x} y1={GY(0) - 10} y2={GY(5) + 10} stroke="#a7a294" strokeWidth={k === n ? 2 : 0.9} opacity={0.85} />);
  }
  gEls.push(<rect key="nut" x={XN - 3} y={GY(0) - 10} width={4} height={GY(5) - GY(0) + 20} fill={CLR.chalk} />);
  [3, 5, 7, 9, 12].forEach(j => {
    const k = Math.round((n * j) / 12);
    if (k < 1 || k > n) return;
    const x = cellX(k);
    const ys = j === 12 ? [(GY(1) + GY(2)) / 2, (GY(3) + GY(4)) / 2] : [(GY(2) + GY(3)) / 2];
    ys.forEach((y, yi) => gEls.push(<circle key={`dot${j}-${yi}`} cx={x} cy={y} r={2.6} fill="rgba(244,241,232,.35)" />));
    gEls.push(<text key={`dn${j}`} x={x} y={GY(5) + 21} textAnchor="middle" fontSize={8.5} fill={CLR.faint} fontFamily="monospace">{k}</text>);
  });
  OPEN.forEach(([L], i) => {
    gEls.push(<line key={`st${i}`} x1={X0 - 4} x2={fretX(n) + 4} y1={GY(i)} y2={GY(i)} stroke="#d8d2c0" strokeWidth={0.9 + i * 0.35} opacity={0.85} />);
    gEls.push(<text key={`sn${i}`} x={X0 - 14} y={GY(i) + 3} textAnchor="middle" fontSize={10} fill={CLR.dim} fontFamily="monospace">{L}</text>);
  });
  OPEN.forEach((_, si) => {
    for (let k = 0; k <= n; k++) {
      const p = opens[si] + k, l = lit(p);
      const sameStr = held.some(v => v.view === "guitar" && v.string === si && v.p === p);
      const cls = sameClass(p) && !l;
      if (!l && !cls) continue;
      const r = Math.max(2.5, Math.min(6.5, (k === 0 ? 10 : fretX(k) - fretX(k - 1)) * 0.42));
      gEls.push(
        <circle key={`g${si}-${k}`} cx={cellX(k)} cy={GY(si)} r={cls ? r * 0.55 : r}
          fill={l === "on" ? CLR.good : l === "focus" ? "#9fc4a5" : cls ? "rgba(244,241,232,.45)" : "none"}
          stroke={l === "hover" ? CLR.sound : sameStr ? CLR.chalk : "none"} strokeWidth={1.5} />
      );
    }
  });

  // ════════════════ readout ════════════════
  const tgt = focus ?? hover?.p ?? null;
  const items: [string, string][] = [];
  if (tgt != null) {
    const f = freqOf(tgt, info);
    const m12 = 69 + 12 * Math.log2(f / 440), r12 = Math.round(m12);
    const overHome = ((((tgt - homePc) % n) + n) % n) * 1200 / n;
    const nr = nearestRatio(overHome);
    items.push(
      ["note", `${nameOf(tgt, info, sp)} · step ${pcOf(tgt, n)}/${n}`],
      ["Hz", f.toFixed(1)],
      ["vs 12-EDO", `${midiName(r12)} ${sign(Math.round((m12 - r12) * 100))}¢`],
      [`over ${dials.home}`, `${Math.round(overHome)}¢ ≈ ${nr.ratio.a}:${nr.ratio.b} ${sign(Math.round(nr.off * 10) / 10)}¢`],
    );
  }
  if (held.length >= 2) {
    const ps = held.map(v => v.exact).sort((a, b) => a - b);
    const steps = ps[ps.length - 1] - ps[0], cents = (steps * 1200) / n, nr = nearestRatio(cents);
    const rname = nr.ratio.a === 1 && nr.ratio.b === 1 && nr.flies ? `2:1` : `${nr.ratio.a}:${nr.ratio.b}`;
    const kid = KID[rname] ? ` (${KID[rname]})` : "";
    items.unshift(["between them", `${Math.round(steps * 100) / 100} steps · ${Math.round(cents)}¢ ≈ ${rname}${nr.flies ? ` + ${nr.flies} fly` : ""}${kid} ${sign(Math.round(nr.off * 10) / 10)}¢`]);
  }

  const lineSurf = surface("line", LH, (x) => lineHit(x));
  const keySurf = surface("keys", KBH, keyHit);
  const gSurf = surface("guitar", GH, guitarHit);

  return (
    <div>
      <div className="dialrow" style={{ alignItems: "center" }}>
        <span className="smallnote" style={{ margin: 0 }}>worlds:</span>
        {PRESETS.map(k => (
          <button key={k} disabled={locked.has("edo")} className={k === n ? "primary" : ""}
            onClick={() => setDial("edo", k)} style={{ padding: "2px 10px" }}>{k}</button>
        ))}
      </div>

      {dials.showLine && (
        <svg viewBox={`0 0 ${W} ${LH}`} className="scope" {...lineSurf}>
          <text x={2} y={11} fontSize={9} fill={CLR.faint} fontFamily="monospace">Hz</text>
          <text x={X1} y={LH - 4} textAnchor="end" fontSize={9} fill={CLR.faint} fontFamily="monospace">
            {linear ? "linear: equal Hz = equal distance" : `log: every step = ${(1200 / n).toFixed(2)}¢, same width everywhere`}
          </text>
          {lineEls}
        </svg>
      )}

      {dials.showKeys && (
        <svg viewBox={`0 0 ${W} ${KBH}`} className="scope" {...keySurf} style={{ ...keySurf.style, marginTop: 8 }}>
          {keyEls}
        </svg>
      )}

      {dials.showGuitar && (
        <svg viewBox={`0 0 ${W} ${GH}`} className="scope" {...gSurf} style={{ ...gSurf.style, marginTop: 8 }}>
          {gEls}
          <text x={X1} y={GH - 4} textAnchor="end" fontSize={9} fill={CLR.faint} fontFamily="monospace">
            {n} frets to the fly · numbers = the steps nearest 12-EDO's 3rd, 5th, 7th, 9th and 12th frets
          </text>
        </svg>
      )}

      <Readout items={items.length ? items : [["note", "play anything — it lights up everywhere"]]} />

      <Dials names={["edo", "line", "keys", "snap", "home", "ratios", "span", "drone", "bearings", "showLine", "showKeys", "showGuitar"]}
        specs={def.dials} values={dials} locked={locked} set={setDial} />

      <p className="smallnote">
        One world, three ways in. The <b>keyboard</b> has a column for every step, sitting right over
        its tick on the <b>log</b> pitch line: naturals are the white keys, the dark keys are the ♯s
        (blue-ish) and ♭s (brown-ish), and the short grey ones are steps the chain of fifths doesn't name,
        spelled with ups and downs (<b>^</b> = one step up, <b>v</b> = one step down). The <b>guitar</b> puts
        frets where they really go, so they crowd toward the body. Flip the pitch line to <b>linear</b> to see
        what equal Hz looks like: the low flies squash and the high ones stretch. Coral marks are the
        familiar 12-EDO notes and frets; blue ticks are pure ratios over home. Hold two notes to hear and
        read the interval.
        {isoFallback && iso && <> (This world's ♯ doesn't make a full isomorphic grid, so up is one step here.)</>}
      </p>
      <p className="smallnote">
        In 31, try: C and E (10 steps, a pure skip 5:4 within a cent) · C and A♯ (25 steps, the 7:4
        "barbershop" seventh) · C and vE (9 steps, the neutral third, about 11:9) · C and G (18 steps,
        a fifth 5¢ narrow). Turn on the home drone and the pure ones go still.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "edo-bench",
  title: "EDO Workbench",
  blurb: "Any world (31 to start) on a guitar neck, a keyboard and a log/Hz pitch line, all in sync.",
  thread: "sound",
  dials: {
    edo:    { type: "slider", min: 5, max: 72, step: 1, default: 31, label: "slices per fly (EDO)" },
    line:   { type: "select", default: "log", label: "pitch line", options: [
      { value: "log", label: "log (equal ratio = equal distance)" },
      { value: "linear", label: "linear (equal Hz = equal distance)" },
    ]},
    keys:   { type: "select", default: "strip", label: "keyboard", options: [
      { value: "strip", label: "piano-style, one key per step" },
      { value: "iso", label: "isomorphic (Bosanquet-style)" },
    ]},
    snap:   { type: "select", default: "steps", label: "pitch line snaps to", options: [
      { value: "steps", label: "the world's steps" },
      { value: "pure", label: "pure ratios over home" },
      { value: "free", label: "nothing — free glide" },
    ]},
    home:   { type: "select", default: "C", label: "home", options: "CDEFGAB".split("").map(l => ({ value: l, label: l })) },
    ratios: { type: "select", default: "11", label: "pure ratios shown", options: [
      { value: "5", label: "5-limit (3s and 5s)" },
      { value: "7", label: "7-limit (+ septimal)" },
      { value: "11", label: "11-limit (+ undecimal)" },
    ]},
    span:   { type: "select", default: "2", label: "keys & line span", options: [
      { value: "1", label: "one fly (C4–C5)" },
      { value: "2", label: "two flies (C3–C5)" },
    ]},
    drone:      { type: "toggle", default: false, label: "home drone" },
    bearings:   { type: "toggle", default: true, label: "12-EDO bearings" },
    showLine:   { type: "toggle", default: true, label: "pitch line" },
    showKeys:   { type: "toggle", default: true, label: "keyboard" },
    showGuitar: { type: "toggle", default: true, label: "guitar" },
  },
  component: Comp,
};
