import { Link } from "react-router-dom";
import { ALL_SQUARES, COURT_ROWS } from "../content/court";
import { THREAD_COLORS } from "../toys/types";
import { useStore } from "../state/store";

export default function Court() {
  const done = useStore(s => s.done);
  const nextUp = ALL_SQUARES.find(s => !done[s.id])?.id;
  const rows = [...COURT_ROWS].reverse(); // sky at top
  return (
    <div>
      <h1 style={{ textAlign: "center" }}>the court</h1>
      <p style={{ textAlign: "center" }} className="smallnote">
        toss your stone, hop the squares. wide rows = pick your order. dashed squares = regroup, where the threads braid together.
      </p>
      <div className="court">
        {rows.map((row, ri) => (
          row[0].n === "band" ? (
            <Link key="band" to="/lesson/the-band" className="homearc">
              <h3 style={{ margin: 0 }}>🎵 The Band {done["the-band"] && "✓"}</h3>
              <p className="smallnote">{row[0].blurb}</p>
            </Link>
          ) : (
            <div className="crow" key={ri}>
              {row.map(sq => (
                <Link key={sq.id} to={`/lesson/${sq.id}`} className={`sq ${sq.regroup ? "regroup" : ""} ${sq.id === nextUp ? "next" : ""}`}>
                  {sq.id === nextUp && <span className="nexttag">next hop!</span>}
                  <span className="n">{sq.n}</span>
                  {done[sq.id] && <span className="done">✓</span>}
                  <h3>{sq.title}</h3>
                  <p>{sq.blurb}</p>
                  <span className="tag" style={{ background: THREAD_COLORS[sq.thread] ?? "var(--chalk-dim)" }}>{sq.thread}</span>
                </Link>
              ))}
            </div>
          )
        ))}
        <div className="arrow">▲ start at 1, at the bottom — like real hopscotch</div>
      </div>
      <div className="legendrow">
        {Object.entries(THREAD_COLORS).filter(([k]) => k !== "ear").map(([k, v]) => (
          <span className="lchip" key={k}><span className="dot" style={{ background: v }} />{k}</span>
        ))}
      </div>
    </div>
  );
}
