import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Tone } from "../audio/engine";
import { PitchDetector } from "pitchy";

// The shared mic pipeline: UserMedia + analysers + pitchy, with cleanup. Every mic toy uses
// this instead of hand-rolling it (see DECISIONS.md §3a "shared toy components").
export function useMic(opts?: { fft?: number; wave?: number }) {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const nodes = useRef<{ mic: Tone.UserMedia; fft?: Tone.Analyser; wave: Tone.Analyser; det: any } | null>(null);

  async function enable(): Promise<boolean> {
    try {
      const mic = new Tone.UserMedia();
      await mic.open();
      const waveSize = opts?.wave ?? 2048;
      const wave = new Tone.Analyser("waveform", waveSize);
      mic.connect(wave);
      let fft: Tone.Analyser | undefined;
      if (opts?.fft) { fft = new Tone.Analyser("fft", opts.fft); mic.connect(fft); }
      nodes.current = { mic, fft, wave, det: PitchDetector.forFloat32Array(waveSize) };
      setOn(true);
      return true;
    } catch { setErr("Mic blocked — allow microphone access and try again."); return false; }
  }

  useEffect(() => () => {
    if (nodes.current) { nodes.current.mic.close(); nodes.current.fft?.dispose(); nodes.current.wave.dispose(); nodes.current = null; }
  }, []);

  function pitch(): [number, number] { // [hz, clarity]
    const n = nodes.current; if (!n) return [0, 0];
    return n.det.findPitch(n.wave.getValue() as Float32Array, Tone.getContext().sampleRate);
  }

  return { on, err, enable, nodes, pitch };
}

// The consistent "turn the mic on" gate every mic toy shows before it has permission.
export function MicGate(props: { on: boolean; err: string; enable: () => void; hint: string; children: ReactNode }) {
  if (props.on) return <>{props.children}</>;
  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <button className="primary" onClick={props.enable}>🎤 turn the mic on</button>
      {props.err && <p className="smallnote" style={{ color: "var(--bad)" }}>{props.err}</p>}
      <p className="smallnote">{props.hint}</p>
    </div>
  );
}
