import { create } from "zustand";
import { persist } from "zustand/middleware";

type S = {
  name: string;
  setName: (n: string) => void;
  done: Record<string, boolean>;
  markDone: (id: string) => void;
  unmark: (id: string) => void;
};
export const useStore = create<S>()(
  persist(
    (set) => ({
      name: "",
      setName: (name) => set({ name }),
      done: {},
      markDone: (id) => set((s) => ({ done: { ...s.done, [id]: true } })),
      unmark: (id) => set((s) => { const d = { ...s.done }; delete d[id]; return { done: d }; }),
    }),
    { name: "hopscotch-progress" }
  )
);
export const isDebug = () => new URLSearchParams(location.search).has("debug");
