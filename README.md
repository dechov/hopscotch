# 🪨 Hopscotch

A family music playground: a chalk hopscotch court of 18 short lessons, a toybox of
24 sound **toys**, and a tiny versioned piece-builder (**the sketchbook**).

Everything runs in the browser — no server, no accounts. Progress and pieces live in
localStorage on the device.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173). On first sound, tap the
"wake the sound" button — browsers require a tap before audio can start.

- **the court** — the lesson map. Start at square 1 (bottom), like real hopscotch.
  Wide rows can be hopped in any order; dashed squares are regroups. Finishing a
  toy's guided intro (or tapping "mark as hopped") checks the square.
- **the toybox** — every toy in free mode. Great for testing and for kids who just
  want to make noise.
- **the sketchbook** — a 3-track step sequencer (lead = pentatonic ×2, bass roots,
  drums), with a log-pitch **canvas** view for the lead (place a note at any pitch). Save **checkpoints** with messages, **branch** a piece to remix it,
  load/revert any checkpoint. This is the seed of the band's "git for music."

## New in this build

- **🎹 MIDI in**: tap the MIDI button in the nav (Chrome/Edge), then play your electronic
  piano straight into the Drone Pad, Tone Forge, and Earshot (echoes count real keys!).
- **🔊 master volume + mute** in the nav. Parents: you're welcome.
- **The Necklace** (square 16): spin the beads = new key; walk Home = new mode.
- **The Drift** (toybox, teacher toy): the comma pump — pure chords that sink 21.5¢ per loop,
  next to the equal-tempered version that doesn't. The audible reason temperament exists.
- **Sketchbook**: lean (swing) knob per piece, plus ⬇ export / ⬆ import of pieces as JSON —
  kids can trade riffs between devices.
- The court now glows a gentle **"next hop!"** on the first unfinished square.

## Useful tricks

- Add `?debug=1` to any URL to overlay every toy with its live dial values and
  last events — handy when a guided step won't advance.
- **See Your Sound** (square 3 / the toybox) needs microphone permission.
- iPad-friendly: everything is tap-first; no hover required.

## Testing checklist (10 minutes)

1. Court loads, squares link, checkmarks persist after refresh.
2. Square 1 "Listen": guided steps advance (play → slide helpers to 5 → muffle below ~700).
3. Square 2 "Rest or Lean": find a resting ratio, hold ~1s → step advances; magnet turns on.
4. Square 6 "High Five": pads make sound over the drone; landing Home advances the guide.
5. Toybox: open several toys at once; sound doesn't glitch (all share one AudioContext).
6. Sketchbook: draw boxes, play, save checkpoint, change boxes, save again, load the first —
   diff counts (+/−) show against "now". Branch, confirm both pieces in the picker. Refresh —
   everything's still there.
7. `?debug=1` on a lesson shows dials/events under each toy.
8. The physics trio: **Speed Trick** (square 10 or the toybox) — auto-sweep turns clicks into a
   note around ~45 Hz; **Ratios in Slow Motion** (square 17) — 3:2 gallops, then ⚡ plays the same
   ratio as a leap; **Pluck the String** (square 11) — touch at 1/2 and pluck: only even helpers
   ring (a real guitar harmonic).

## Where things live

```
src/content/    glossary (moves/scales/ratios), songs, court map
src/audio/      Tone.js wrapper + note math
src/toys/       24 toys + registry + Toy embed wrapper + PitchSurface + Dials
src/guidance/   useGuide hook + all guided-intro scripts
src/lessons/    18 MDX lessons + registry
src/pages/      Court, LessonPage, Shed (the toybox), Daw (the sketchbook)
src/state/      zustand progress store (localStorage)
```

## Deploying later

The plan (see build-decisions doc) is Vercel + Supabase. This build is Vite; the source
layout maps 1:1 onto the planned Next.js app (lessons stay MDX, toys stay as-is). For a
static deploy of THIS build: `npm run build`, serve `dist/`, and add an SPA fallback
(all routes → index.html).

## Known edges (v1)

- Old MacDonald's farm→"E" is honestly labeled a **vault ↑** (major sixth) on the chant board.
- ToneForge presets set dials; saving custom presets across sessions isn't wired yet.
- Sketchbook "suggestions between band members" (PR-style) is designed but not built.
- Mic toys hold the mic exclusively; close the toy to release it.
