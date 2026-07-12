// The single source of truth for Hopscotch vocabulary.
export type Move = { word: string; semitones: number; grown: string; color: string; motion: string; core: boolean };

export const MOVES: Move[] = [
  { word: "stay",  semitones: 0,  grown: "unison",        color: "#cfcabb", motion: "freeze",            core: true },
  { word: "scoot", semitones: 1,  grown: "half step",     color: "#e8615a", motion: "tiny shuffle",      core: true },
  { word: "step",  semitones: 2,  grown: "whole step",    color: "#f08a6b", motion: "one walking step",  core: true },
  { word: "hop",   semitones: 3,  grown: "minor third",   color: "#f2c14e", motion: "hop on one foot",   core: true },
  { word: "skip",  semitones: 4,  grown: "major third",   color: "#e8e06a", motion: "skip forward",      core: true },
  { word: "jump",  semitones: 5,  grown: "fourth",        color: "#8fd6a0", motion: "two-foot jump",     core: true },
  { word: "trip",  semitones: 6,  grown: "tritone",       color: "#9ad0e8", motion: "stumble!",          core: false },
  { word: "leap",  semitones: 7,  grown: "fifth",         color: "#4fa3d1", motion: "big leap",          core: true },
  { word: "vault", semitones: 9,  grown: "sixth",         color: "#c79bca", motion: "vault over",        core: false },
  { word: "reach", semitones: 11, grown: "seventh",       color: "#f29bc4", motion: "reach way up",      core: false },
  { word: "fly",   semitones: 12, grown: "octave",        color: "#f4f1e8", motion: "arms out, fly",     core: true },
];

export function moveFor(semitones: number): Move {
  const s = Math.abs(semitones);
  const exact = MOVES.find(m => m.semitones === s);
  if (exact) return exact;
  if (s === 8) return { ...MOVES.find(m => m.word === "vault")!, grown: "minor sixth" };
  if (s === 10) return { ...MOVES.find(m => m.word === "reach")!, grown: "minor seventh" };
  return { word: `big (${s})`, semitones: s, grown: `${s} semitones`, color: "#cfcabb", motion: "??", core: false };
}

export const STICKERS = ["Home", "Park", "School", "Farm", "Woods"]; // five-tone degree names

export const SCALES: Record<string, { label: string; pcs: number[] }> = {
  "five-major": { label: "five-tone (bright)", pcs: [0, 2, 4, 7, 9] },
  "five-minor": { label: "five-tone (moody)",  pcs: [0, 3, 5, 7, 10] },
  "seven-tone": { label: "seven-tone",         pcs: [0, 2, 4, 5, 7, 9, 11] },
  "chromatic":  { label: "Every note",         pcs: [0,1,2,3,4,5,6,7,8,9,10,11] },
};

export const RATIOS: { a: number; b: number; name: string }[] = [
  { a: 1, b: 1, name: "the same note" },
  { a: 6, b: 5, name: "pure hop" },
  { a: 5, b: 4, name: "pure skip" },
  { a: 4, b: 3, name: "jump" },
  { a: 3, b: 2, name: "leap" },
  { a: 5, b: 3, name: "vault" },
  { a: 2, b: 1, name: "fly (octave)" },
];
