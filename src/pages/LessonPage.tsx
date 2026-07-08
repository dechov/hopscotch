import { useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { LESSONS } from "../lessons";
import { LessonCtx } from "../toys/Toy";
import { useStore } from "../state/store";
import { ALL_SQUARES } from "../content/court";

export default function LessonPage() {
  const { id = "" } = useParams();
  const entry = LESSONS[id];
  const done = useStore(s => s.done);
  const markDone = useStore(s => s.markDone);
  const unmark = useStore(s => s.unmark);

  const notify = useCallback((toy: string, event: string) => {
    const cw = entry?.meta?.completeWhen;
    if (cw && cw.toy === toy && cw.event === event) markDone(id);
  }, [entry, id, markDone]);

  const ctx = useMemo(() => ({ notify }), [notify]);

  if (!entry) return <div><h1>hmm</h1><p>No lesson called "{id}". <Link to="/">Back to the court</Link>.</p></div>;
  const { Component } = entry;

  const idx = ALL_SQUARES.findIndex(s => s.id === id);
  const prev = idx > 0 ? ALL_SQUARES[idx - 1] : null;
  const next = idx >= 0 && idx < ALL_SQUARES.length - 1 ? ALL_SQUARES[idx + 1] : null;

  return (
    <LessonCtx.Provider value={ctx}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" className="smallnote">← the court</Link>
        {done[id]
          ? <button onClick={() => unmark(id)}>✓ hopped! (tap to un-hop)</button>
          : <button onClick={() => markDone(id)}>mark as hopped ✓</button>}
      </div>
      <Component />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
        {prev ? <Link to={`/lesson/${prev.id}`} className="smallnote">← {prev.title}</Link> : <span />}
        {next ? <Link to={`/lesson/${next.id}`} className="smallnote">{next.title} →</Link> : <span />}
      </div>
    </LessonCtx.Provider>
  );
}
