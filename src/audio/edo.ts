// Note naming and geometry for any N-EDO world, shared by the EDO Workbench (and anything else
// that wants to spell steps of an arbitrary equal division). Steps are indexed absolutely:
// p = 0 is C4 of the world, p = n is C5. Pitch is anchored at A4 = 440 Hz, so a world's C is
// wherever its own A-to-C distance puts it (31-EDO's C4 is ~263.1 Hz, a hair above 12-EDO's 261.6).

export type EdoInfo = {
  n: number;
  fifth: number;  // steps in the best fifth
  W: number;      // whole tone = two fifths minus a fly
  s: number;      // diatonic semitone (E→F)
  A1: number;     // chromatic semitone (C→C♯) = 7 fifths − 4 flies
  pcA: number;    // step of A within the fly (A4 is pinned to 440 Hz); fractional below 5-EDO
  tiny: boolean;  // 1–4 EDO: too few steps for a chain of fifths, so steps are named after the
                  // nearest 12-EDO note and C stays at 12-EDO's C4 (A isn't a step there at all)
};

const NAT = "FCGDAEB"; // the chain of fifths, F first so C sits at k = 0
const LETTER_K: Record<string, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
const mod = (a: number, n: number) => ((a % n) + n) % n;

export function edoInfo(n: number): EdoInfo {
  const fifth = Math.round(n * Math.log2(1.5));
  const W = 2 * fifth - n;
  const s = 3 * n - 5 * fifth;
  const A1 = 7 * fifth - 4 * n;
  const tiny = n < 5;
  return { n, fifth, W, s, A1, tiny, pcA: tiny ? (9 * n) / 12 : mod(3 * fifth, n) };
}

const NAMES12 = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const LETTER_12: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export type Spelling = {
  name: string;    // e.g. "C", "C♯", "^C", "vE"
  sharps: number;  // −1, 0, +1 from the chain of fifths
  arrows: number;  // ups (+) / downs (−) on top of that, for steps the fifths don't reach
  offset: number;  // steps from the bare natural letter (keeps octave numbers honest: C♭4, B♯3)
  natural: boolean;
};

// Spell every step of the fly: chain-of-fifths names with at most one ♯/♭, and Kite-style
// ups and downs (^ = one step up, v = one step down) for whatever those don't reach.
export function spellWorld(info: EdoInfo): Spelling[] {
  const { n, fifth, A1 } = info;
  if (info.tiny) {
    // 1 = octaves only, 2 = the tritone, 3 = major thirds, 4 = minor thirds: name each by the
    // 12-EDO note it lands on (they land exactly, since 1–4 all divide 12)
    return Array.from({ length: n }, (_, pc) => {
      const name = NAMES12[Math.round((pc * 12) / n) % 12];
      const sharps = name.includes("♯") ? 1 : name.includes("♭") ? -1 : 0;
      return { name, sharps, arrows: 0, offset: 0, natural: sharps === 0 };
    });
  }
  const best: (Spelling & { k: number })[] = [];
  for (let k = -8; k <= 12; k++) {
    const pc = mod(k * fifth, n);
    const sharps = Math.floor((k + 1) / 7);
    const letter = NAT[mod(k + 1, 7)];
    const cur = best[pc];
    if (cur && (Math.abs(cur.sharps) < Math.abs(sharps) ||
        (Math.abs(cur.sharps) === Math.abs(sharps) && Math.abs(cur.k) <= Math.abs(k)))) continue;
    const acc = sharps > 0 ? "♯" : sharps < 0 ? "♭" : "";
    best[pc] = { k, name: letter + acc, sharps, arrows: 0, offset: sharps * A1, natural: sharps === 0 };
  }
  const out: Spelling[] = [];
  for (let pc = 0; pc < n; pc++) {
    if (best[pc]) { const { k: _k, ...sp } = best[pc]; out[pc] = sp; continue; }
    let pick: { q: number; d: number } | null = null;
    for (let q = 0; q < n; q++) {
      if (!best[q]) continue;
      let d = mod(pc - q, n); if (d > n / 2) d -= n;
      if (!pick || Math.abs(d) < Math.abs(pick.d) ||
          (Math.abs(d) === Math.abs(pick.d) && Math.abs(best[q].sharps) < Math.abs(best[pick.q].sharps))) {
        pick = { q, d };
      }
    }
    const b = best[pick!.q], d = pick!.d;
    out[pc] = {
      name: (d > 0 ? "^".repeat(d) : "v".repeat(-d)) + b.name,
      sharps: b.sharps, arrows: d, offset: b.offset + d, natural: false,
    };
  }
  return out;
}

export const pcOf = (p: number, n: number) => mod(p, n);
export const freqOf = (p: number, info: EdoInfo) => 440 * Math.pow(2, (p - info.pcA) / info.n);
export const pOfFreq = (f: number, info: EdoInfo) => info.pcA + info.n * Math.log2(f / 440);
export const letterPc = (letter: string, info: EdoInfo) => info.tiny
  ? mod(Math.round((LETTER_12[letter] * info.n) / 12), info.n)   // nearest step to that letter
  : mod(LETTER_K[letter] * info.fifth, info.n);

export function nameOf(p: number, info: EdoInfo, sp: Spelling[]) {
  const s = sp[mod(p, info.n)];
  return `${s.name}${4 + Math.floor((p - s.offset) / info.n)}`;
}

// Pure ratios. `tick` = drawn on the pitch line (home markers 1:1 and 2:1 are drawn separately);
// all of them are candidates when naming an interval.
export type Ratio = { a: number; b: number; tick: boolean };
const R = (a: number, b: number, tick = true): Ratio => ({ a, b, tick });
export const RATIO_SET: Ratio[] = [
  R(1, 1, false), R(16, 15, false), R(12, 11, false), R(11, 10, false), R(10, 9, false),
  R(9, 8), R(8, 7), R(7, 6), R(6, 5), R(11, 9), R(5, 4), R(9, 7), R(4, 3), R(11, 8), R(7, 5),
  R(10, 7, false), R(3, 2), R(14, 9, false), R(8, 5), R(5, 3), R(12, 7), R(7, 4), R(16, 9, false),
  R(9, 5), R(11, 6), R(15, 8), R(2, 1, false),
];
export const ratioCents = (r: Ratio) => 1200 * Math.log2(r.a / r.b);

function maxPrime(x: number) {
  let m = 1;
  for (let d = 2; d <= x; d++) while (x % d === 0) { m = d; x /= d; }
  return m;
}
export const primeLimit = (r: Ratio) => Math.max(maxPrime(r.a), maxPrime(r.b));

// Nearest pure ratio to an interval in cents (octave-reduced; `flies` counts the octaves taken off).
export function nearestRatio(cents: number) {
  const flies = cents > 1225 ? Math.floor((cents - 25) / 1200) : 0;
  const c = cents - 1200 * flies;
  let best = RATIO_SET[0], bd = Infinity;
  for (const r of RATIO_SET) { const d = Math.abs(c - ratioCents(r)); if (d < bd) { bd = d; best = r; } }
  return { ratio: best, flies, off: c - ratioCents(best) };
}
