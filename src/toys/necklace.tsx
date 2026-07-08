import { useEffect, useRef } from "react";
import { blipSeq } from "../audio/engine";
import { midiToFreq, NAMES } from "../audio/notes";
import type { ToyDef, ToyInnerProps } from "./types";

const MODE_NAMES: Record<string, string> = {
  "0,2,4,5,7,9,11": "the Rainbow (grown-ups: major / Ionian)",
  "0,2,3,5,7,9,10": "Dorian — moody but hopeful",
  "0,1,3,5,7,8,10": "Phrygian — dark, Spanish",
  "0,2,4,6,7,9,11": "Lydian — floaty, dreamlike",
  "0,2,4,5,7,9,10": "Mixolydian — rock & bagpipes",
  "0,2,3,5,7,8,10": "natural minor / Aeolian",
  "0,1,3,5,6,8,10": "Locrian — the haunted one",
  "0,2,4,7,9": "High Five (bright)",
  "0,3,5,7,10": "High Five (moody)",
  "0,2,5,7,10": "a pentatonic mode — suspended, open",
  "0,2,5,7,9": "a pentatonic mode — floating",
  "0,3,5,8,10": "a pentatonic mode — soft minor-ish",
};

function Comp({ dials, setDial, locked, emit }: ToyInnerProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const beads: number[] = dials.beads;   // absolute pitch classes on the necklace
  const home: number = dials.home;       // absolute pitch class where Home sits

  const fromHome = beads.map(b => ((b - home) % 12 + 12) % 12).sort((a, b) => a - b);
  const modeName = MODE_NAMES[fromHome.join(",")] ?? "…something you invented";
  const homeOnBead = beads.includes(home);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const x = c.getContext("2d")!; const w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, r = h / 2 - 26;
    x.strokeStyle = "rgba(244,241,232,.25)"; x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
    for (let pc = 0; pc < 12; pc++) {
      const ang = -Math.PI / 2 + (pc / 12) * Math.PI * 2;
      const bx = cx + r * Math.cos(ang), by = cy + r * Math.sin(ang);
      const on = beads.includes(pc);
      x.fillStyle = on ? "#f4f1e8" : "rgba(244,241,232,.15)";
      x.beginPath(); x.arc(bx, by, on ? 11 : 6, 0, Math.PI * 2); x.fill();
      if (pc === home) { x.strokeStyle = "#f2c14e"; x.lineWidth = 4; x.beginPath(); x.arc(bx, by, 16, 0, Math.PI * 2); x.stroke(); }
      x.fillStyle = on ? "#2c2e33" : "#9a968a"; x.font = "12px 'Patrick Hand'"; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(NAMES[pc], bx, by + (on ? 0 : 18));
    }
    x.fillStyle = "#9a968a"; x.font = "14px 'Caveat'"; x.textAlign = "center";
    x.fillText("gold ring = Home", cx, h - 8);
  }, [beads, home]);

  function rotateNecklace(dir: 1 | -1) {
    setDial("beads", beads.map(b => ((b + dir) % 12 + 12) % 12).sort((a, b) => a - b));
    emit("rotated");
  }
  function moveHome(dir: 1 | -1) {
    // Home walks to the NEXT bead around the circle (that's what makes it a mode)
    const sorted = [...beads].sort((a, b) => a - b);
    if (!homeOnBead) { setDial("home", sorted[0]); return; }
    const i = sorted.indexOf(home);
    setDial("home", sorted[((i + dir) % sorted.length + sorted.length) % sorted.length]);
    emit("homeMoved");
  }
  function playIt() {
    const base = home <= 6 ? 60 + home : 48 + home; // keep the run near middle C
    const seq = [...fromHome, 12].map(iv => midiToFreq(base + iv));
    blipSeq(seq, 0.38);
    emit("played");
  }
  function preset(bs: number[], h: number) { setDial("beads", bs); setDial("home", h); }

  return (
    <div>
      <canvas ref={canvas} className="scope" width={760} height={230} style={{ height: 230 }} />
      <div className="dialrow">
        <button className="primary" onClick={playIt}>▶ play from Home</button>
        <label className="dial" style={{ minWidth: 170 }}><span>spin the NECKLACE (same world, new key)</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button disabled={locked.has("beads")} onClick={() => rotateNecklace(-1)}>⟲</button>
            <button disabled={locked.has("beads")} onClick={() => rotateNecklace(1)}>⟳</button>
          </span></label>
        <label className="dial" style={{ minWidth: 170 }}><span>walk HOME (same beads, new world)</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button disabled={locked.has("home")} onClick={() => moveHome(-1)}>←🏠</button>
            <button disabled={locked.has("home")} onClick={() => moveHome(1)}>🏠→</button>
          </span></label>
      </div>
      <div className="dialrow">
        <button onClick={() => preset([0, 2, 4, 7, 9], 0)}>High Five</button>
        <button onClick={() => preset([0, 2, 4, 5, 7, 9, 11], 0)}>Rainbow</button>
        <button onClick={() => preset([0, 2, 4, 5, 7, 9, 11], 9)}>Rainbow, Home on A</button>
      </div>
      <div className="verdict rest">{homeOnBead ? modeName : "Home fell off the necklace — walk it back on"}</div>
      <p className="smallnote">
        Two totally different moves. <b>Spinning the necklace</b> keeps every relationship —
        it's the same music, higher or lower (a new key). <b>Walking Home to another bead</b> keeps
        the same notes but changes every relationship — a new world (grown-ups call these <i>modes</i>).
        Play after each move and hear which one changed the feeling.
      </p>
    </div>
  );
}

export const def: ToyDef = {
  id: "necklace",
  title: "The Necklace",
  blurb: "Spin the beads = new key. Move Home = new world (modes).",
  thread: "color",
  dials: {
    beads: { type: "select", default: [0, 2, 4, 5, 7, 9, 11], label: "beads" } as any,
    home:  { type: "select", default: 0, label: "home" } as any,
  },
  component: Comp,
};
