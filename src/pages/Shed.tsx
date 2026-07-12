import { useState } from "react";
import Toy from "../toys/Toy";
import { registry } from "../toys/registry";

export default function Shed() {
  const ids = Object.keys(registry);
  const [open, setOpen] = useState<Record<string, boolean>>({ [ids[0]]: true });
  return (
    <div>
      <h1>the toybox</h1>
      <p className="smallnote">
        Every toy, free mode, no lessons attached. Open a few at once and make a racket.
        Add <b>?debug=1</b> to the address to see each toy's dials and events live.
      </p>
      <div className="shedgrid">
        {ids.map(id => (
          <div key={id}>
            <button onClick={() => setOpen(o => ({ ...o, [id]: !o[id] }))} style={{ width: "100%", textAlign: "left" }}>
              {open[id] ? "▾" : "▸"} {registry[id].title} — <span className="smallnote">{registry[id].blurb}</span>
            </button>
            {open[id] && <Toy id={id} mode="free" />}
          </div>
        ))}
      </div>
    </div>
  );
}
