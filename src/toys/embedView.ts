import { createContext } from "react";

// Per-embed presentation of a toy's dials: a lesson can hide dials that would be
// noise in its context and narrow a select dial to just the options it teaches.
// Values behind hidden/filtered dials still exist and still work (set via the
// embed's `dials` prop or a guide's `set`) — this filters presentation only.
export type EmbedView = {
  hide?: string[];                     // dial names not rendered in this embed
  choices?: Record<string, string[]>;  // select dials narrowed to these option values
};

export const EmbedViewCtx = createContext<EmbedView>({});
