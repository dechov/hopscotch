import { STICKERS } from "../content/glossary";
import { inScale, degreeOf, midiName } from "../audio/notes";

const BLACK = new Set([1, 3, 6, 8, 10]);

export function PitchSurface(props: {
  surface: "keys" | "pads" | "frets";
  home: number;                // midi
  pcs: number[];               // scale mask (pitch classes relative to home)
  range?: [number, number];    // midi range for keys
  labels?: "none" | "stickers" | "letters";
  onNote: (midi: number) => void;
  highlight?: number;
}) {
  const { surface, home, pcs, onNote } = props;
  const labels = props.labels ?? "stickers";

  if (surface === "pads") {
    const pads: number[] = [];
    for (let m = home; m <= home + 12 && pads.length < pcs.length + 1; m++) {
      if (inScale(m, home, pcs)) pads.push(m);
    }
    return (
      <div className="pads">
        {pads.map((m) => {
          const deg = degreeOf(m, home, pcs);
          const isHome = ((m - home) % 12 + 12) % 12 === 0;
          const name = labels === "stickers" && pcs.length === 5
            ? (isHome && m !== home ? "Home ↑" : STICKERS[deg] ?? "")
            : labels === "letters" ? midiName(m) : "";
          const hues = ["var(--home)", "var(--time)", "var(--sound)", "var(--color)", "var(--timbre)", "var(--together)", "var(--moves)"];
          return (
            <div key={m} className="pad" style={{ background: hues[deg % hues.length], outline: props.highlight === m ? "4px solid #fff" : undefined }}
              onPointerDown={() => onNote(m)}>
              <span>{name}</span>
              <span style={{ fontSize: 13, fontFamily: "Patrick Hand" }}>{midiName(m)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (surface === "frets") {
    const strings = [64, 59, 55, 50, 45, 40]; // E4 B3 G3 D3 A2 E2 (top to bottom)
    const frets = 8;
    return (
      <div className="frets" style={{ gridTemplateColumns: `repeat(${frets + 1}, 1fr)` }}>
        {strings.map((open) =>
          Array.from({ length: frets + 1 }, (_, f) => {
            const m = open + f;
            const ok = inScale(m, home, pcs);
            const isHome = ok && (((m - home) % 12) + 12) % 12 === 0;
            return (
              <div key={`${open}-${f}`}
                className={`fret ${ok ? "" : "off"} ${f === 0 ? "open" : ""} ${isHome ? "home" : ""}`}
                onPointerDown={() => ok && onNote(m)}>
                {ok ? midiName(m) : ""}
              </div>
            );
          })
        )}
      </div>
    );
  }

  // keys
  const [lo, hi] = props.range ?? [home - 1, home + 13];
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!BLACK.has(((m % 12) + 12) % 12)) whites.push(m);
  return (
    <div className="keys">
      {whites.map((m) => {
        const ok = inScale(m, home, pcs);
        const isHome = ok && (((m - home) % 12) + 12) % 12 === 0;
        return (
          <div key={m} className={`key ${ok ? "" : "off"} ${isHome ? "home" : ""}`}
            onPointerDown={() => ok && onNote(m)}>
            {labels !== "none" ? midiName(m) : ""}
          </div>
        );
      })}
      {/* black keys positioned over whites */}
      {whites.map((m, i) => {
        const b = m + 1;
        if (!BLACK.has(((b % 12) + 12) % 12) || b > hi) return null;
        const ok = inScale(b, home, pcs);
        const isHome = ok && (((b - home) % 12) + 12) % 12 === 0;
        const left = ((i + 1) / whites.length) * 100 - 4;
        return (
          <div key={`b${b}`} className={`key black ${ok ? "" : "off"} ${isHome ? "home" : ""}`}
            style={{ left: `${left}%` }}
            onPointerDown={(e) => { e.stopPropagation(); ok && props.onNote(b); }}>
          </div>
        );
      })}
    </div>
  );
}
