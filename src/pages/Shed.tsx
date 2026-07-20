import { useState } from "react";
import Toy from "../toys/Toy";
import { registry } from "../toys/registry";
import { THREAD_COLORS } from "../toys/types";

// The most surprising / fundamental demos go first; everything else is grouped by thread so
// the full collection reads as a few small shelves instead of one overwhelming list.
const FEATURED = ["speed-trick", "same-note", "song-passport", "tone-ruler", "ratio-map"];
const THREAD_ORDER = ["sound", "home", "moves", "time", "timbre", "color", "ear", "together"];

export default function Shed() {
  const ids = Object.keys(registry);
  const [open, setOpen] = useState<Record<string, boolean>>({ [FEATURED[0]]: true });
  const rest = ids.filter(id => !FEATURED.includes(id));

  const entry = (id: string) => (
    <div key={id}>
      <button onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))} style={{ width: "100%", textAlign: "left" }}>
        {open[id] ? "▾" : "▸"} {registry[id].title} — <span className="smallnote">{registry[id].blurb}</span>
      </button>
      {open[id] && <Toy id={id} mode="free" />}
    </div>
  );

  return (
    <div>
      <h1>the toybox</h1>
      <p className="smallnote">
        Every toy, free mode, no lessons attached. Open a few at once and make a racket.
        Add <b>?debug=1</b> to the address to see each toy's dials and events live.
      </p>
      <h2>start here — the big surprises</h2>
      <div className="shedgrid">{FEATURED.map(entry)}</div>
      {THREAD_ORDER.map(thread => {
        const group = rest.filter(id => registry[id].thread === thread);
        if (!group.length) return null;
        return (
          <div key={thread}>
            <h2 style={{ marginTop: 22 }}>
              <span className="thread" style={{ background: THREAD_COLORS[thread], marginRight: 8 }}>{thread}</span>
            </h2>
            <div className="shedgrid">{group.map(entry)}</div>
          </div>
        );
      })}
    </div>
  );
}
