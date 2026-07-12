import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactElement } from "react";
import { Tone, isArmed, armAudio, blip } from "../audio/engine";
import { midiToFreq, midiName } from "../audio/notes";

const STEPS = 16;
const LEAD_ROWS = [81, 79, 76, 74, 72, 69, 67, 64, 62, 60];   // C penta, 2 octaves, top→down
const BASS_ROWS = [45, 43, 41, 38, 36];                        // A2 G2 F2 D2 C2
const DRUM_ROWS = ["boom", "clap"];
const FIVE_PCS = [0, 2, 4, 7, 9];                              // the piece's ground is C

// A lead note is a step plus a (possibly fractional) midi number — fractional midi encodes
// any frequency while staying structured/diffable, which the commit model depends on.
type Note = { s: number; m: number };
type Doc = { tempo: number; swing?: number; lead: Note[]; bass: boolean[][]; drums: boolean[][] };
type Commit = { id: string; ts: number; message: string; doc: Doc };
type Piece = { id: string; name: string; commits: Commit[] };

const blank = (): Doc => ({
  tempo: 92,
  swing: 0,
  lead: [],
  bass: BASS_ROWS.map(() => Array(STEPS).fill(false)),
  drums: DRUM_ROWS.map(() => Array(STEPS).fill(false)),
});
const clone = (d: Doc): Doc => JSON.parse(JSON.stringify(d));
const uid = () => Math.random().toString(36).slice(2, 9);

// Older pieces stored lead as boolean[][] over LEAD_ROWS; convert to note events on load.
function migrateDoc(d: any): Doc {
  const lead: Note[] =
    Array.isArray(d?.lead) && d.lead.every((x: any) => Array.isArray(x))
      ? (d.lead as boolean[][]).flatMap((row, r) =>
          row.flatMap((v, c) => (v ? [{ s: c, m: LEAD_ROWS[r] }] : [])))
      : (d?.lead ?? []);
  return { ...blank(), ...d, lead };
}
function migratePiece(p: Piece): Piece {
  return { ...p, commits: (p.commits ?? []).map(c => ({ ...c, doc: migrateDoc(c.doc) })) };
}

function loadPieces(): Piece[] {
  try {
    return (JSON.parse(localStorage.getItem("hopscotch-pieces") || "[]") as Piece[]).map(migratePiece);
  } catch { return []; }
}
function savePieces(p: Piece[]) { localStorage.setItem("hopscotch-pieces", JSON.stringify(p)); }

function countCells(d: Doc) {
  let n = d.lead.length;
  for (const g of [d.bass, d.drums]) for (const row of g) for (const v of row) if (v) n++;
  return n;
}
function diff(a: Doc, b: Doc) {
  let added = 0, removed = 0;
  const key = (n: Note) => `${n.s}:${n.m.toFixed(2)}`;
  const as = new Set(a.lead.map(key)), bs = new Set(b.lead.map(key));
  for (const k of as) if (!bs.has(k)) removed++;
  for (const k of bs) if (!as.has(k)) added++;
  (["bass", "drums"] as const).forEach(k => {
    a[k].forEach((row, r) => row.forEach((v, c) => {
      const w = b[k][r]?.[c] ?? false;
      if (v && !w) removed++;
      if (!v && w) added++;
    }));
  });
  return { added, removed };
}

// ── the canvas view: x = steps, y = log2(frequency) (equal distance = equal ratio) ──
const CW = 760, CH = 250, CX0 = 36, CX1 = CW - 6, CPAD = 8;
const M_LO = 58, M_HI = 83; // Bb3 … B5, comfortably around the lead range
const BLACK = new Set([1, 3, 6, 8, 10]);
const yOf = (m: number) => CPAD + (1 - (m - M_LO) / (M_HI - M_LO)) * (CH - 2 * CPAD);
const mOf = (y: number) => M_LO + (1 - (y - CPAD) / (CH - 2 * CPAD)) * (M_HI - M_LO);
const colX = (c: number) => CX0 + (c / STEPS) * (CX1 - CX0);

function snapMidi(m: number, mode: string): number {
  if (mode === "grid") return Math.round(m);
  if (mode === "five") {
    let best = m, bd = Infinity;
    for (let oct = 3; oct <= 7; oct++) for (const pc of FIVE_PCS) {
      const cand = 12 * oct + pc; // C-anchored: midi 12*oct is a C
      const d = Math.abs(cand - m);
      if (d < bd) { bd = d; best = cand; }
    }
    return best;
  }
  return Math.round(m * 100) / 100; // free: keep cents precision, not float noise
}

export default function Daw() {
  const [pieces, setPieces] = useState<Piece[]>(loadPieces);
  const [pieceId, setPieceId] = useState<string | null>(pieces[0]?.id ?? null);
  const [doc, setDoc] = useState<Doc>(() => pieces[0]?.commits.at(-1)?.doc ? clone(pieces[0].commits.at(-1)!.doc) : blank());
  const [playing, setPlaying] = useState(false);
  const [col, setCol] = useState(-1);
  const [msg, setMsg] = useState("");
  const [leadView, setLeadView] = useState<"boxes" | "canvas">("boxes");
  const [canvasSnap, setCanvasSnap] = useState("five");
  const docRef = useRef(doc); docRef.current = doc;
  const evId = useRef<number | null>(null);
  const step = useRef(0);
  const canvasRef = useRef<SVGSVGElement>(null);

  const piece = pieces.find(p => p.id === pieceId) ?? null;
  const head = piece?.commits.at(-1);
  const dirty = head ? JSON.stringify(head.doc) !== JSON.stringify(doc) : countCells(doc) > 0;

  // ── playback ──
  useEffect(() => {
    if (!playing) return;
    let disposed = false;
    (async () => {
      if (!isArmed()) await armAudio();
      if (disposed) return;
      const lead = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.25, release: 0.2 }, volume: -10 }).toDestination();
      const bass = new Tone.MonoSynth({ oscillator: { type: "square" }, filter: { frequency: 700 } as any, envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.15 }, volume: -12 }).toDestination();
      const kick = new Tone.MembraneSynth({ volume: -6 }).toDestination();
      const clap = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -12 }).toDestination();
      const t = Tone.getTransport();
      t.bpm.value = docRef.current.tempo;
      t.swing = docRef.current.swing ?? 0;
      t.swingSubdivision = "16n";
      step.current = 0;
      evId.current = t.scheduleRepeat((time) => {
        const s = step.current % STEPS;
        const d = docRef.current;
        d.lead.forEach(n => { if (n.s === s) lead.triggerAttackRelease(midiToFreq(n.m), "16n", time); });
        BASS_ROWS.forEach((m, r) => { if (d.bass[r][s]) bass.triggerAttackRelease(midiToFreq(m), "8n", time); });
        if (d.drums[0][s]) kick.triggerAttackRelease("C2", "8n", time);
        if (d.drums[1][s]) clap.triggerAttackRelease("16n", time);
        Tone.getDraw().schedule(() => setCol(s), time);
        step.current++;
      }, "16n");
      t.start();
      cleanupRef.current = () => {
        if (evId.current != null) t.clear(evId.current);
        t.stop();
        lead.dispose(); bass.dispose(); kick.dispose(); clap.dispose();
        setCol(-1);
      };
    })();
    return () => { disposed = true; cleanupRef.current?.(); cleanupRef.current = null; };
  }, [playing]);
  const cleanupRef = useRef<null | (() => void)>(null);
  useEffect(() => { Tone.getTransport().bpm.rampTo(doc.tempo, 0.1); }, [doc.tempo]);
  useEffect(() => { Tone.getTransport().swing = doc.swing ?? 0; }, [doc.swing]);

  function toggle(track: "bass" | "drums", r: number, c: number) {
    setDoc(d => {
      const n = clone(d);
      n[track][r][c] = !n[track][r][c];
      return n;
    });
  }
  function toggleLeadCell(r: number, c: number) {
    const rowM = LEAD_ROWS[r];
    setDoc(d => {
      const n = clone(d);
      const inBand = (x: Note) => x.s === c && Math.abs(x.m - rowM) < 0.5;
      n.lead = n.lead.some(inBand) ? n.lead.filter(x => !inBand(x)) : [...n.lead, { s: c, m: rowM }];
      return n;
    });
  }
  function canvasClick(e: ReactPointerEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * CW;
    const y = ((e.clientY - r.top) / r.height) * CH;
    if (x < CX0 || x > CX1) return;
    const c = Math.min(STEPS - 1, Math.max(0, Math.floor(((x - CX0) / (CX1 - CX0)) * STEPS)));
    const raw = Math.min(M_HI, Math.max(M_LO, mOf(y)));
    const near = (n: Note) => n.s === c && Math.abs(n.m - raw) < 0.6;
    if (doc.lead.some(near)) {
      setDoc(d => { const n = clone(d); n.lead = n.lead.filter(x => !near(x)); return n; });
      return;
    }
    const m = snapMidi(raw, canvasSnap);
    setDoc(d => { const n = clone(d); n.lead = [...n.lead, { s: c, m }]; return n; });
    blip(midiToFreq(m), 0.3);
  }

  // ── pieces & commits ──
  function newPiece() {
    const name = prompt("name your piece:", "my first riff");
    if (!name) return;
    const p: Piece = { id: uid(), name, commits: [] };
    const next = [...pieces, p];
    setPieces(next); savePieces(next);
    setPieceId(p.id); setDoc(blank());
  }
  function commit() {
    if (!piece) { newPiece(); return; }
    const message = msg.trim() || "checkpoint";
    const c: Commit = { id: uid(), ts: Date.now(), message, doc: clone(doc) };
    const next = pieces.map(p => p.id === piece.id ? { ...p, commits: [...p.commits, c] } : p);
    setPieces(next); savePieces(next); setMsg("");
  }
  function revert(c: Commit) {
    if (dirty && !confirm("You have unsaved boxes. Load this checkpoint anyway?")) return;
    setDoc(clone(c.doc));
  }
  function branch() {
    if (!piece) return;
    const name = prompt("branch name:", `${piece.name} (remix)`);
    if (!name) return;
    const p: Piece = { id: uid(), name, commits: [{ id: uid(), ts: Date.now(), message: `branched from "${piece.name}"`, doc: clone(doc) }] };
    const next = [...pieces, p];
    setPieces(next); savePieces(next); setPieceId(p.id);
  }
  function exportPiece() {
    if (!piece) return;
    const blob = new Blob([JSON.stringify(piece, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${piece.name.replace(/[^a-z0-9]+/gi, "-")}.hopscotch.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importPiece(file: File) {
    file.text().then(txt => {
      try {
        const p = migratePiece(JSON.parse(txt) as Piece);
        if (!p.name || !Array.isArray(p.commits)) throw new Error("bad file");
        const fresh: Piece = { ...p, id: uid(), commits: p.commits.map(c => ({ ...c, id: uid() })) };
        const next = [...pieces, fresh];
        setPieces(next); savePieces(next); setPieceId(fresh.id);
        const last = fresh.commits.at(-1);
        setDoc(last ? clone(last.doc) : blank());
      } catch { alert("That didn't look like a hopscotch piece file."); }
    });
  }

  function switchPiece(id: string) {
    if (dirty && !confirm("You have unsaved boxes. Switch anyway?")) return;
    setPieceId(id);
    const p = pieces.find(x => x.id === id);
    setDoc(p?.commits.at(-1)?.doc ? clone(p.commits.at(-1)!.doc) : blank());
  }

  function grid(track: "bass" | "drums", rows: (number | string)[], color: string, label: (r: any) => string) {
    return (
      <div className="dawgrid" style={{ gridTemplateColumns: `90px repeat(${STEPS}, 1fr)` }}>
        {rows.map((row, r) => ([
          <div key={`l${r}`} className="rowlabel">{label(row)}</div>,
          ...Array.from({ length: STEPS }, (_, c) => (
            <div key={`${r}-${c}`}
              className={`cell ${doc[track][r][c] ? "on" : ""} ${c === col ? "play" : ""}`}
              style={{ ...(doc[track][r][c] ? { background: color } : {}), ...(c % 4 === 0 ? { borderLeft: "2px solid rgba(244,241,232,.35)" } : {}) }}
              onClick={() => toggle(track, r, c)} />
          )),
        ]))}
      </div>
    );
  }

  const offGrid = doc.lead.filter(n => !LEAD_ROWS.some(rm => Math.abs(rm - n.m) < 0.5)).length;

  function leadBoxes() {
    return (
      <div>
        <div className="dawgrid" style={{ gridTemplateColumns: `90px repeat(${STEPS}, 1fr)` }}>
          {LEAD_ROWS.map((rowM, r) => ([
            <div key={`l${r}`} className="rowlabel">{midiName(rowM)}</div>,
            ...Array.from({ length: STEPS }, (_, c) => {
              const on = doc.lead.some(n => n.s === c && Math.abs(n.m - rowM) < 0.5);
              return (
                <div key={`${r}-${c}`}
                  className={`cell ${on ? "on" : ""} ${c === col ? "play" : ""}`}
                  style={{ ...(on ? { background: "var(--home)" } : {}), ...(c % 4 === 0 ? { borderLeft: "2px solid rgba(244,241,232,.35)" } : {}) }}
                  onClick={() => toggleLeadCell(r, c)} />
              );
            }),
          ]))}
        </div>
        {offGrid > 0 && (
          <p className="smallnote">{offGrid} in-between note{offGrid > 1 ? "s" : ""} (placed on the canvas) {offGrid > 1 ? "don't" : "doesn't"} fit these boxes — switch to canvas view to see and edit them.</p>
        )}
      </div>
    );
  }

  function leadCanvas() {
    const bands: ReactElement[] = [];
    for (let m = M_LO; m <= M_HI; m++) {
      const y0 = yOf(m + 0.5), y1 = yOf(m - 0.5);
      const black = BLACK.has(((m % 12) + 12) % 12);
      bands.push(
        <rect key={m} x={CX0} y={y0} width={CX1 - CX0} height={y1 - y0}
          fill={black ? "rgba(16,18,22,.45)" : "rgba(244,241,232,.08)"} />
      );
      if (m % 12 === 0 || m % 12 === 9) bands.push(
        <text key={`t${m}`} x={CX0 - 5} y={yOf(m) + 3} textAnchor="end" fontSize={9}
          fontFamily="monospace" fill="#9a968a">{midiName(m)}</text>
      );
    }
    return (
      <div>
        <svg ref={canvasRef} width={CW} height={CH} className="scope"
          style={{ touchAction: "none", userSelect: "none", maxWidth: "100%", cursor: "crosshair" }}
          onPointerDown={canvasClick}>
          {bands}
          {Array.from({ length: STEPS + 1 }, (_, c) => (
            <line key={c} x1={colX(c)} x2={colX(c)} y1={CPAD} y2={CH - CPAD}
              stroke={c % 4 === 0 ? "rgba(244,241,232,.35)" : "rgba(244,241,232,.12)"} strokeWidth={c % 4 === 0 ? 2 : 1} />
          ))}
          {col >= 0 && (
            <rect x={colX(col)} y={CPAD} width={colX(1) - colX(0)} height={CH - 2 * CPAD}
              fill="rgba(244,241,232,.10)" />
          )}
          {doc.lead.filter(n => n.m >= M_LO && n.m <= M_HI).map((n, i) => (
            <circle key={i} cx={(colX(n.s) + colX(n.s + 1)) / 2} cy={yOf(n.m)}
              r={n.s === col ? 8 : 6.5} fill="var(--home)"
              stroke={n.s === col ? "#f4f1e8" : "#2c2e33"} strokeWidth={1.5} />
          ))}
        </svg>
        <div className="dialrow" style={{ marginTop: 4 }}>
          <label className="dial" style={{ maxWidth: 220 }}><span>snap notes to</span>
            <select value={canvasSnap} onChange={e => setCanvasSnap(e.target.value)}>
              <option value="five">the High Five (over C)</option>
              <option value="grid">the 12-EDO grid</option>
              <option value="free">nothing — any pitch</option>
            </select></label>
          <p className="smallnote" style={{ flex: 2, margin: 0 }}>
            Up = higher pitch, spaced by <b>log frequency</b> — equal distance = equal ratio, so every
            octave is the same height and each band is 100¢. Tap to drop a note (tap a dot to remove
            it). With snap off you can put a note <i>between</i> the bands — somewhere no piano key goes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>the sketchbook</h1>
      <p className="smallnote">
        A tiny piece-builder. Lead rows are the High Five (two floors of it) — so whatever you
        draw over the C ground sounds good. Save <b>checkpoints</b> as you go; branch a piece to
        remix it without losing the original — like tearing out a page and redrawing it.
        Your band's version of git.
      </p>

      <div className="dialrow">
        <button className="primary" onClick={async () => { if (!isArmed()) await armAudio(); setPlaying(p => !p); }}>{playing ? "■ stop" : "▶ play"}</button>
        <label className="dial"><span>tempo: <b style={{ color: "var(--chalk)" }}>{doc.tempo}</b></span>
          <input type="range" min={60} max={150} value={doc.tempo} onChange={e => setDoc(d => ({ ...clone(d), tempo: parseInt(e.target.value) }))} /></label>
        <label className="dial" style={{ minWidth: 180 }}><span>piece</span>
          <select value={pieceId ?? ""} onChange={e => switchPiece(e.target.value)}>
            {pieces.length === 0 && <option value="">— none yet —</option>}
            {pieces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></label>
        <label className="dial"><span>lean: <b style={{ color: "var(--chalk)" }}>{Math.round((doc.swing ?? 0) * 100)}%</b></span>
          <input type="range" min={0} max={0.6} step={0.01} value={doc.swing ?? 0}
            onChange={e => setDoc(d => ({ ...clone(d), swing: parseFloat(e.target.value) }))} /></label>
        <button onClick={newPiece}>+ new piece</button>
        <button onClick={branch} disabled={!piece}>⑂ branch</button>
        <button onClick={exportPiece} disabled={!piece}>⬇ export</button>
        <label style={{ display: "inline-block" }}>
          <span className="smallnote" style={{ border: "2px solid var(--line)", borderRadius: 12, padding: "8px 14px", cursor: "pointer", display: "inline-block" }}>⬆ import</span>
          <input type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) importPiece(f); e.target.value = ""; }} />
        </label>
        <button onClick={() => setDoc(blank())}>clear boxes</button>
      </div>

      <div className="trackhead">
        lead — the High Five ×2{" "}
        <button style={{ marginLeft: 10, fontSize: 14, padding: "3px 10px" }}
          onClick={() => setLeadView(v => (v === "boxes" ? "canvas" : "boxes"))}>
          {leadView === "boxes" ? "switch to canvas (any pitch)" : "switch to boxes"}
        </button>
      </div>
      {leadView === "boxes" ? leadBoxes() : leadCanvas()}
      <div className="trackhead">bass — roots</div>
      {grid("bass", BASS_ROWS, "var(--sound)", (m) => midiName(m as number))}
      <div className="trackhead">drums</div>
      {grid("drums", DRUM_ROWS, "var(--time)", (s) => s as string)}

      <h2 style={{ marginTop: 26 }}>checkpoints {piece ? `— ${piece.name}` : ""} {dirty && <span className="smallnote">(unsaved boxes)</span>}</h2>
      <div className="dialrow">
        <input style={{ flex: 1, fontFamily: "Patrick Hand", fontSize: 16, background: "var(--panel)", border: "2px solid var(--line)", borderRadius: 10, color: "var(--chalk)", padding: "8px 12px" }}
          placeholder="what changed? (e.g. added the clap on 3)" value={msg} onChange={e => setMsg(e.target.value)} />
        <button className="primary" onClick={commit}>💾 save checkpoint</button>
      </div>
      {piece && [...piece.commits].reverse().map(c => {
        const d = diff(c.doc, doc);
        return (
          <div className="commit" key={c.id}>
            <div>
              <b>{c.message}</b>
              <div className="smallnote">{new Date(c.ts).toLocaleString()} · {countCells(c.doc)} boxes
                {(d.added || d.removed) ? ` · vs now: +${d.added} −${d.removed}` : " · same as now"}</div>
            </div>
            <button onClick={() => revert(c)}>load</button>
          </div>
        );
      })}
      {!piece && <p className="smallnote">No piece yet — hit “+ new piece”, draw some boxes, save a checkpoint.</p>}
      {piece && piece.commits.length === 0 && <p className="smallnote">No checkpoints yet — draw something and save one.</p>}
      <p className="smallnote" style={{ marginTop: 20 }}>
        Coming later (the plan is written): suggestions between band members — “here's my idea for
        your bass line” — reviewed and merged like pull requests, plus audio-recording snapshots.
      </p>
    </div>
  );
}
