import type { Guide } from "../toys/types";

export const helpersIntro: Guide = {
  toy: "wave-builder",
  steps: [
    { say: "Tap play. One lonely wave.", set: { helpers: 1, muffle: 8000 }, lock: ["helpers", "muffle"], until: "playStarted" },
    { say: "Now stack helpers on — slide to 5 or more. Same note… richer!", lock: ["muffle"], until: "helpers5" },
    { say: "Now turn the muffle down and listen to the helpers leave again.", lock: [], until: "muffled", hint: "below ~700 they're mostly gone" },
  ],
  handoff: "All yours. Every real sound you love is one wave plus its helpers.",
};

export const lockInIntro: Guide = {
  toy: "two-tone",
  steps: [
    { say: "Tap play. That's TWO sounds at once.", set: { ratio: 1.42, snap: false }, lock: ["ratio", "snap"], until: "playStarted" },
    { say: "Hear that wobble? The two sounds are leaning on each other.", until: "continue" },
    { say: "Slide the second sound until the wobble disappears.", lock: [], until: "lockAchieved", hint: "go slow — the wobble slows down right before it stops" },
    { say: "It's resting! You found a simple ratio. Simple relationships rest.", set: { snap: true }, until: "continue" },
  ],
  handoff: "Magnet's on as a reward — find ALL the resting spots. (There are five more.)",
};

export const blackKeysIntro: Guide = {
  toy: "drone-pad",
  steps: [
    { say: "These five pads are the black keys — a ready-made five-tone scale. Tap around!", set: { scale: "five-major", home: "66", drone: true }, lock: ["scale", "home"], until: "noteOn" },
    { say: "Notice: NOTHING clashes. There are no scoots hiding in here.", until: "continue" },
    { say: "Try to land back on Home and feel it settle.", until: "homeLanded" },
  ],
  handoff: "Free play — try the piano or guitar surface too. Home is marked in gold.",
};

export const flavorIntro: Guide = {
  toy: "drone-pad",
  steps: [
    { say: "Same five black keys… but Home is Gb now. Play — it's BRIGHT.", set: { scale: "five-major", home: "66", drone: true }, lock: ["scale", "home"], until: "noteOn" },
    { say: "Now watch: same notes, but Home moves to Eb. Play again — MOODY.", set: { scale: "five-minor", home: "63" }, lock: ["scale", "home"], until: "noteOn" },
    { say: "Nothing changed except which note is Home. Home decides the flavor.", until: "continue" },
  ],
  handoff: "Flip between them yourself: Gb bright ⇄ Eb moody. Same pads, two worlds.",
};

export const ladderIntro: Guide = {
  toy: "move-ladder",
  steps: [
    { say: "This is the ladder. Tap STEP — hear it, then take one real step.", until: "moveHeard:step" },
    { say: "Now tap LEAP — the big friendly one. Do the motion!", until: "moveHeard:leap" },
    { say: "Now FLY — same note, way up high. Arms out.", until: "moveHeard:fly" },
  ],
  handoff: "Climb the whole thing. Say each word out loud as you hear it.",
};

export const bendTour: Guide = {
  toy: "bend-meter",
  steps: [
    { say: "Play. You're on the fret — the piano's hop. Already pretty close.", set: { cents: 300 }, lock: ["cents"], until: "playStarted" },
    { say: "Bend up slowly and STOP when it feels perfectly settled.", lock: [], until: "zone:m3-pure", hint: "around +16" },
    { say: "That's the PURE hop — 6:5. No fret can play it. Keep bending to the blue zone…", until: "zone:blue" },
    { say: "THAT is the blue note — between hop and skip. Singers and guitarists live here.", until: "continue" },
  ],
  handoff: "Keep going — can you find the pure skip (5:4) before the next fret?",
};

export const pegsByEar: Guide = {
  toy: "tune-it",
  steps: [
    { say: "Meter's OFF. Ears only. Press play.", set: { meter: false }, lock: ["meter"], until: "continue" },
    { say: "Turn the peg. Wobble slowing down = getting closer.", until: "lockAchieved", hint: "slow wobble → slower → gone" },
  ],
  handoff: "That's real tuning. Now go loosen a string on the real guitar and bring it back. (Loosen only!)",
};
