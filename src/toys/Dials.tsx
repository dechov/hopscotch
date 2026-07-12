import { useContext } from "react";
import type { DialSpec } from "./types";
import { EmbedViewCtx } from "./embedView";

export function Dials(props: {
  names: string[];
  specs: Record<string, DialSpec>;
  values: Record<string, any>;
  locked: Set<string>;
  set: (k: string, v: any) => void;
}) {
  const { names, specs, values, locked, set } = props;
  const view = useContext(EmbedViewCtx);
  return (
    <div className="dialrow">
      {names.map((n) => {
        const s = specs[n];
        if (!s) return null;
        if (view.hide?.includes(n)) return null;
        const dis = locked.has(n);
        const label = s.label ?? n;
        if (s.type === "slider") return (
          <label className="dial" key={n}>
            <span>{label}: <b style={{ color: "var(--chalk)" }}>{typeof values[n] === "number" ? Math.round(values[n] * 100) / 100 : values[n]}</b></span>
            <input type="range" min={s.min} max={s.max} step={s.step ?? 1} value={values[n]}
              disabled={dis} onChange={(e) => set(n, parseFloat(e.target.value))} />
          </label>
        );
        if (s.type === "toggle") return (
          <label className="dial" key={n} style={{ minWidth: 110 }}>
            <span>{label}</span>
            <button disabled={dis} onClick={() => set(n, !values[n])}>{values[n] ? "on" : "off"}</button>
          </label>
        );
        return (
          <label className="dial" key={n} style={{ minWidth: 130 }}>
            <span>{label}</span>
            <select disabled={dis} value={values[n]} onChange={(e) => set(n, e.target.value)}>
              {s.options
                ?.filter((o) => !view.choices?.[n] || view.choices[n].includes(o.value))
                .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        );
      })}
    </div>
  );
}
