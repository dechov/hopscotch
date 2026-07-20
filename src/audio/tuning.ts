// A tuning "world": the shared object every surface can play in. Steps are cents within
// one fold (octave), starting at 0. Kept deliberately tiny — a world is just a list of
// places to stand, however it was derived (EDO, temperament subset, or a Same-Note run).
export type World = { id: string; name: string; blurb: string; steps: number[] };

export const edoSteps = (n: number) => Array.from({ length: n }, (_, i) => (i * 1200) / n);
export const bestFifth = (n: number) => (Math.round((701.955 * n) / 1200) * 1200) / n;

const in22 = (pattern: number[]) => {
  const out = [0]; let acc = 0;
  for (let i = 0; i < pattern.length - 1; i++) { acc += pattern[i]; out.push((acc * 1200) / 22); }
  return out;
};

// Curated, deliberately short — a picker, not a catalog.
export const WORLDS: World[] = [
  { id: "w12", name: "the familiar 12", blurb: "the piano's world", steps: edoSteps(12) },
  { id: "w19", name: "19 — the smooth cousin", blurb: "your songs survive, sweeter thirds", steps: edoSteps(19) },
  { id: "w22", name: "22 — the rebel", blurb: "familiar songs audibly bend", steps: edoSteps(22) },
  { id: "w31", name: "31 — the connoisseur", blurb: "nearly-pure everything, lots of notes", steps: edoSteps(31) },
  { id: "w7", name: "7 — all steps equal", blurb: "no big/small steps: everything neutral", steps: edoSteps(7) },
  { id: "w5", name: "5 — the wide world", blurb: "five broad, clash-proof steps", steps: edoSteps(5) },
  { id: "porcupine", name: "porcupine (7 of 22)", blurb: "almost-equal steps with a secret", steps: in22([3, 3, 3, 3, 3, 3, 4]) },
  { id: "pajara", name: "pajara (10 of 22)", blurb: "Erlich's own decatonic world", steps: in22([2, 2, 3, 2, 2, 2, 2, 3, 2, 2]) },
];

// Worlds kept from the Same-Note game live in localStorage (small, device-local, like pieces).
const KEY = "hopscotch-worlds";
export function savedWorlds(): World[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveWorld(w: Omit<World, "id">): World {
  const world = { ...w, id: `mine-${Date.now().toString(36)}` };
  localStorage.setItem(KEY, JSON.stringify([...savedWorlds(), world]));
  return world;
}
export function allWorlds(): World[] { return [...WORLDS, ...savedWorlds()]; }
export function worldById(id: string | undefined): World | undefined {
  return id ? allWorlds().find(w => w.id === id) : undefined;
}

// Two-step-size (MOS) classification: which steps of a world are "small" — the generalized
// black keys. Returns a flag per step interval (true = small).
export function smallSteps(steps: number[]): boolean[] {
  const n = steps.length;
  const sizes = steps.map((c, i) => (i + 1 < n ? steps[i + 1] - c : 1200 - c));
  const min = Math.min(...sizes), max = Math.max(...sizes);
  if (max - min < 1) return sizes.map(() => false); // equal-step world: no black keys
  const mid = (min + max) / 2;
  return sizes.map(s => s < mid);
}
