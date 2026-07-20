import type { ReactNode } from "react";

// The shared readout chip row (label/value pairs) — one markup, one look, every toy.
export function Readout({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="readout">
      {items.map(([k, v]) => (
        <div key={k} className="chip"><div className="k">{k}</div><div className="v">{v}</div></div>
      ))}
    </div>
  );
}
