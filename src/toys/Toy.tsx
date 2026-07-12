import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { registry } from "./registry";
import type { Guide, ToyMode } from "./types";
import { THREAD_COLORS } from "./types";
import { EmbedViewCtx } from "./embedView";
import { armAudio, isArmed, onArmed } from "../audio/engine";
import { isDebug } from "../state/store";

export const LessonCtx = createContext<{ notify: (toy: string, event: string) => void } | null>(null);

export default function Toy(props: {
  id: string;
  mode?: ToyMode;
  guide?: Guide;
  dials?: Record<string, any>;
  locked?: string[];
  hide?: string[];                     // dials not shown in this embed (values still apply)
  choices?: Record<string, string[]>;  // narrow a select dial to these options in this embed
  size?: "full" | "inline";
  title?: string;
}) {
  const def = registry[props.id];
  const lesson = useContext(LessonCtx);
  const [armed, setArmed] = useState(isArmed());
  useEffect(() => onArmed(() => setArmed(true)), []);
  const [events, setEvents] = useState<string[]>([]);
  const mode: ToyMode = props.mode ?? "free";

  const defaults = useMemo(() => {
    const d: Record<string, any> = {};
    if (def) for (const k of Object.keys(def.dials)) d[k] = def.dials[k].default;
    return { ...d, ...(props.dials ?? {}) };
  }, [def, props.dials]);

  const [values, setValues] = useState<Record<string, any>>(defaults);
  const applySet = useCallback((s: Record<string, any>) => setValues((v) => ({ ...v, ...s })), []);

  // guidance (inline import to avoid cycle)
  const { step, stepIndex, total, finished, onEvent, locks, handoff } =
    useGuideBridge(mode === "guided" ? props.guide : undefined, applySet);

  const locked = useMemo(() => {
    const base = new Set(props.locked ?? []);
    if (!finished) for (const l of locks) base.add(l);
    return base;
  }, [props.locked, locks, finished]);

  const emitRef = useRef<(t: string, d?: any) => void>(() => {});
  emitRef.current = (type: string) => {
    setEvents((e) => [...e.slice(-4), type]);
    onEvent(type);
    lesson?.notify(props.id, type);
    if (finished && type !== "guideFinished") return;
  };
  const emit = useCallback((t: string, d?: any) => emitRef.current(t, d), []);

  // fire guideFinished exactly once
  const firedFinish = useRef(false);
  if (finished && props.guide && mode === "guided" && !firedFinish.current) {
    firedFinish.current = true;
    setTimeout(() => lesson?.notify(props.id, "guideFinished"), 0);
  }

  const setDial = useCallback((k: string, v: any) => {
    setValues((old) => (locked.has(k) ? old : { ...old, [k]: v }));
    emit("valueChanged");
  }, [locked, emit]);

  const view = useMemo(() => ({ hide: props.hide, choices: props.choices }), [props.hide, props.choices]);

  if (!def) return <div className="toy">unknown toy: {props.id}</div>;
  const C = def.component;

  return (
    <EmbedViewCtx.Provider value={view}>
    <div className={`toy ${props.size === "inline" ? "inline" : ""}`}>
      <div className="toyhead">
        <h3>{props.title ?? def.title}</h3>
        <span className="thread" style={{ background: THREAD_COLORS[def.thread] }}>{def.thread}</span>
      </div>
      {mode === "guided" && step && !finished && (
        <div className="guide">
          <div>
            <div className="say">{step.say}</div>
            {step.hint && <div className="hint">{step.hint}</div>}
          </div>
          {step.until === "continue"
            ? <button className="primary" onClick={() => emit("continue")}>next →</button>
            : <span className="hint">{stepIndex + 1}/{total}</span>}
        </div>
      )}
      {mode === "guided" && finished && handoff && <div className="handoff">✔ {handoff}</div>}
      <C dials={values} setDial={setDial} locked={locked} emit={emit} mode={mode} />
      {!armed && (
        <div className="veil">
          <button className="primary" onClick={async () => { await armAudio(); setArmed(true); }}>
            tap to wake the sound 🔊
          </button>
        </div>
      )}
      {isDebug() && (
        <div className="debug">{JSON.stringify(values)}{"\n"}events: {events.join(" · ")}</div>
      )}
    </div>
    </EmbedViewCtx.Provider>
  );
}

// thin bridge so Toy.tsx doesn't import the hook before types settle
import { useGuide } from "../guidance/useGuide";
function useGuideBridge(guide: Guide | undefined, applySet: (s: Record<string, any>) => void) {
  return useGuide(guide, applySet);
}
