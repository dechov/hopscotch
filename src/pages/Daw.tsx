import { useEffect, useRef, useState } from "react";
import { Tone, isArmed, armAudio } from "../audio/engine";
import { midiToFreq, midiName } from "../audio/notes";

const STEPS = 16;
const LEAD_ROWS = [81, 79, 76, 74, 72, 69, 67, 64, 62, 60];   // C penta, 2 octaves, top→down
const BASS_ROWS = [45, 43, 41, 38, 36];                        // A2 G2 F2 D2 C2
const DRUM_ROWS = ["boom", "clap"];

type Doc = { tempo: number; swing?: number; lead: boolean[][]; bass: boolean[][]; drums: boolean[][] };
type Commit = { id: string; ts: number; message: string; doc: Doc };
type Piece = { id: string; name: string; commits: Commit[] };

const blank = (): Doc => ({
  tempo: 92,
  swing: 0,
  lead: LEAD_ROWS.map(() => Array(STEPS).fill(false)),
  bass: BASS_ROWS.map(() => Array(STEPS).fill(false)),
  drums: DRUM_ROWS.map(() => Array(STEPS).fill(false)),
});
const clone = (d: Doc): Doc => JSON.parse(JSON.stringify(d));
const uid = () => Math.random().toString(36).slice(2, 9);

function loadPieces(): Piece[] {
  try { return JSON.parse(localStorage.getItem("hopscotch-pieces") || "[]"); } catch { return []; }
}
function savePieces(p: Piece[]) { localStorage.setItem("hopscotch-pieces", JSON.stringify(p)); }

function countCells(d: Doc) {
  let n = 0;
  for (const g of [d.lead, d.bass, d.drums]) for (const row of g) for (const v of row) if (v) n++;
  return n;
}
function diff(a: Doc, b: Doc) {
  let added = 0, removed = 0;
  (["lead", "bass", "drums"] as const).forEach(k => {
    a[k].forEach((row, r) => row.forEach((v, c) => {
      const w = b[k][r]?.[c] ?? false;
      if (v && !w) removed++;
      if (!v && w) added++;
    }));
  });
  return { added, removed };
}

export default function Daw() {
  const [pieces, setPieces] = useState<Piece[]>(loadPieces);
  const [pieceId, setPieceId] = useState<string | null>(pieces[0]?.id ?? null);
  const [doc, setDoc] = useState<Doc>(() => pieces[0]?.commits.at(-1)?.doc ? clone(pieces[0].commits.at(-1)!.doc) : blank());
  const [playing, setPlaying] = useState(false);
  const [col, setCol] = useState(-1);
  const [msg, setMsg] = useState("");
  const docRef = useRef(doc); docRef.current = doc;
  const evId = useRef<number | null>(null);
  const step = useRef(0);

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
        LEAD_ROWS.forEach((m, r) => { if (d.lead[r][s]) lead.triggerAttackRelease(midiToFreq(m), "16n", time); });
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

  function toggle(track: "lead" | "bass" | "drums", r: number, c: number) {
    setDoc(d => {
      const n = clone(d);
      n[track][r][c] = !n[track][r][c];
      return n;
    });
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
        const p = JSON.parse(txt) as Piece;
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

  function grid(track: "lead" | "bass" | "drums", rows: (number | string)[], color: string, label: (r: any) => string) {
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

  return (
    <div>
      <h1>the treehouse</h1>
      <p className="smallnote">
        A tiny piece-builder. Lead rows are the High Five (two floors of it) — so whatever you
        draw over the C ground sounds good. Save <b>checkpoints</b> as you go; branch a piece to
        remix it without losing the original. Your band's version of git.
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

      <div className="trackhead">lead — the High Five ×2</div>
      {grid("lead", LEAD_ROWS, "var(--home)", (m) => midiName(m as number))}
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
