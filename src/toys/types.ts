import type { ComponentType } from "react";

export type DialSpec = {
  type: "slider" | "toggle" | "select";
  label?: string;
  min?: number; max?: number; step?: number;
  options?: { value: string; label: string }[];
  default: any;
};

export type ToyMode = "guided" | "free" | "demo";

export type ToyInnerProps = {
  dials: Record<string, any>;
  setDial: (k: string, v: any) => void;
  locked: Set<string>;
  emit: (type: string, data?: any) => void;
  mode: ToyMode;
};

export type ToyDef = {
  id: string;
  title: string;
  blurb: string;
  thread: "sound" | "home" | "moves" | "time" | "timbre" | "together" | "color" | "ear";
  exclusive?: boolean; // holds the mic
  dials: Record<string, DialSpec>;
  component: ComponentType<ToyInnerProps>;
};

export type GuideStep = {
  say: string;
  set?: Record<string, any>;
  lock?: string[];       // dials frozen during this step (replaces previous step's locks)
  until: string;         // event type that completes the step; "continue" renders a Next button
  hint?: string;
};

export type Guide = {
  toy: string;
  steps: GuideStep[];
  handoff: string;
};

export const THREAD_COLORS: Record<string, string> = {
  sound: "var(--sound)", home: "var(--home)", moves: "var(--moves)", time: "var(--time)",
  timbre: "var(--timbre)", together: "var(--together)", color: "var(--color)", ear: "var(--together)",
};
