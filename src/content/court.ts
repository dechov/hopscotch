export type Square = {
  n: number | "band";
  id: string;           // lesson id
  title: string;
  blurb: string;
  thread: string;
  regroup?: boolean;
};

// rows bottom-to-top of the court; each inner array renders as one row
export const COURT_ROWS: Square[][] = [
  [{ n: 1, id: "listen", title: "Listen", blurb: "one wave + its helpers", thread: "sound" }],
  [
    { n: 2, id: "rest-or-lean", title: "Rest or Lean", blurb: "the wobble & the ratios", thread: "sound" },
    { n: 3, id: "see-your-sound", title: "See Your Sound", blurb: "sing into the mic", thread: "timbre" },
  ],
  [{ n: 4, id: "lock-in", title: "Lock In", blurb: "kill the wobble · bend past the fret", thread: "sound", regroup: true }],
  [{ n: 5, id: "home", title: "Home", blurb: "the settled feeling", thread: "home" }],
  [
    { n: 6, id: "high-five", title: "The High Five", blurb: "five notes, zero clashes", thread: "home" },
    { n: 7, id: "flavor", title: "Bright & Moody", blurb: "Home decides the flavor", thread: "home" },
  ],
  [{ n: 8, id: "turn-the-pegs", title: "Turn the Pegs", blurb: "tune by ear — for real", thread: "sound", regroup: true }],
  [
    { n: 9, id: "the-ladder", title: "The Ladder", blurb: "scoot step hop skip jump leap fly", thread: "moves" },
    { n: 10, id: "pulse", title: "Pulse", blurb: "the beat as boxes", thread: "time" },
    { n: 11, id: "make-a-sound", title: "Make a Sound", blurb: "shape · dirt · wobble", thread: "timbre" },
  ],
  [{ n: 12, id: "chant", title: "Chant a Song", blurb: "Old MacDonald as moves", thread: "moves", regroup: true }],
  [
    { n: 13, id: "earshot", title: "Earshot", blurb: "echo me · name the move", thread: "ear" },
    { n: 14, id: "changing-ground", title: "Changing Ground", blurb: "chords: the floor moves", thread: "home" },
  ],
  [
    { n: 15, id: "knobs", title: "Lean the Time", blurb: "swing · dirt · feel", thread: "time" },
    { n: 16, id: "rainbow", title: "The Rainbow", blurb: "7 notes — spice + danger", thread: "color" },
  ],
  [{ n: 17, id: "put-it-together", title: "Put It Together", blurb: "ground + five + pulse", thread: "together", regroup: true }],
  [{ n: "band", id: "the-band", title: "🎵 The Band", blurb: "12-bar blues in A — everyone plays", thread: "together" }],
];

export const ALL_SQUARES = COURT_ROWS.flat();
