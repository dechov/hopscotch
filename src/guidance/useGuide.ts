import { useCallback, useMemo, useRef, useState } from "react";
import type { Guide } from "../toys/types";

/** Tiny guided-steps runner: apply set/lock, show say, wait for `until`, advance. */
export function useGuide(guide: Guide | undefined, applySet: (s: Record<string, any>) => void) {
  const [i, setI] = useState(0);
  const [finished, setFinished] = useState(!guide);
  const appliedFirst = useRef(false);

  const step = guide && !finished ? guide.steps[i] : undefined;

  // apply step 0's `set` lazily on first render with a guide
  if (guide && !finished && !appliedFirst.current) {
    appliedFirst.current = true;
    if (guide.steps[0]?.set) setTimeout(() => applySet(guide.steps[0].set!), 0);
  }

  const advance = useCallback(() => {
    if (!guide) return;
    const next = i + 1;
    if (next >= guide.steps.length) { setFinished(true); return; }
    setI(next);
    const s = guide.steps[next];
    if (s.set) applySet(s.set);
  }, [guide, i, applySet]);

  const onEvent = useCallback((type: string) => {
    if (!guide || finished) return false;
    if (guide.steps[i].until === type) { advance(); return true; }
    return false;
  }, [guide, finished, i, advance]);

  const locks = useMemo(() => new Set(step?.lock ?? []), [step]);

  return { step, stepIndex: i, total: guide?.steps.length ?? 0, finished, onEvent, locks, handoff: guide?.handoff };
}
