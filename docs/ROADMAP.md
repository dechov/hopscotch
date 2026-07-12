# Roadmap

Status categories used below: **built** (in the codebase, `npm run build` passes) · **designed**
(discussed in enough detail to implement, not yet built) · **idea** (raised as interesting,
not designed).

## Immediate next steps for a fresh Claude Code session

Nothing in this app has been tested by ear or hand yet — only `npm run build` (type-check +
bundle) has been verified. That's the honest starting point. In priority order:

1. **`npm install && npm run dev`, then work the README's testing checklist** end to end. Fix
   whatever's broken. Audio-timing bugs (Tone.js Transport interactions when dials change
   mid-loop, e.g. Chord Bed / Pulse Grid / the sketchbook) are the most likely category of real
   bug, since compile-time checking can't catch them.
2. Specifically stress-test: guided-step advancement (does every `until` event actually fire
   from real interaction, not just compile?), MIDI input against a real device, and the
   sketchbook's checkpoint/branch/export/import round-trip.
3. Only after the app is verified working end-to-end should new toys/lessons be added — a
   broken foundation makes every subsequent addition harder to debug.

## Built (see docs/TOY_CATALOG.md for the full list)

All 18 lessons, all 24 toys (incl. the Tone Ruler — the log-frequency instrument ruler with
an any-N EDO snap dial), the court/toybox/sketchbook pages, MIDI input (Drone Pad, Tone Forge,
Earshot), master volume/mute, the `?debug=1` overlay, and the sketchbook's checkpoints/
branching/export-import/swing **plus its log-pitch canvas view** — the lead track can be
edited either as the classic pentatonic boxes or on a continuous log₂(frequency) canvas
(snap: High Five / 12-EDO / free), with old boolean-grid pieces migrated on load (see
DECISIONS.md §9).

## Designed but not built

- **Suggestions between sketchbook collaborators** — PR-style: one band member proposes a
  change to another's piece, the owner reviews and merges (or doesn't), rather than direct
  commits to someone else's piece. This was the whole reason the sketchbook's data model is
  MIDI/structured-note-first rather than audio-first (see DECISIONS.md §9) — the structured
  data is what makes a real diff/review possible. Needs: a notion of piece ownership/authorship
  (currently pieces have no owner field — add one), a "propose" action that creates a pending
  commit visible to the owner, and a merge/reject UI.
- **Audio-recording snapshots in the sketchbook** — layered on top of the MIDI-first commits,
  not a replacement. E.g. attaching a voice memo or instrument recording to a checkpoint as
  supplementary context, not as the primary versioned data.
- **Reactions** (band members can react to a piece/commit — mentioned in early data-model
  planning: rooms/pieces/commits/branches/suggestions/**reactions**). Lightweight, not
  designed in detail.
- **Groups/rooms/multi-user sync** — the whole reason Supabase Realtime is in the deployment
  plan (DECISIONS.md §7). Currently everything is single-device localStorage. This is the
  actual "band room" feature that make multi-person, multi-device collaboration real, as
  opposed to the current single-device jam-together-in-person model.
- **Instrument-profile-adapted surfaces** — the concept that a toy's `PitchSurface` should
  adapt to a chosen instrument profile (keys/fretboard/pads/ribbon) beyond the current
  per-toy `surface` dial. Partially present (Drone Pad and Tone Forge already expose
  keys/pads/frets as a dial), not generalized into a shared profile system. The Tone Ruler
  toy is a continuous cousin of this idea (instrument layouts as overlays on one frequency
  axis) but deliberately separate from `PitchSurface`, which stays a discrete playable
  instrument.
- **Scale-degree numbers as an optional overlay** on top of the sticker names
  (Home/Park/School/Farm/Woods) — for older kids/adults who want the numeric vocabulary
  alongside or instead of stickers. See PEDAGOGY.md — deliberately not the primary vocabulary,
  but was discussed as a reasonable advanced toggle, not yet built.
- **`mode="demo"`** on the `<Toy>` embed contract — autoplay, no input, mentioned in early
  embed-contract planning (alongside `guided`/`free`) but never implemented; only `guided` and
  `free` exist in code today.

## Ideas raised but not designed in detail ("cool, not yet")

Roughly in the order they came up across the project conversation. None of these have code or
a detailed spec — treat them as a backlog to pull from, not commitments.

- **The wobble, redeemed** — a toy where the "bad" beating from Two Tone/square-2 becomes a
  deliberate chorus/lushness effect (e.g. a "how many singers?" dial stacking detuned voices).
  Narratively nice because it turns square 2's villain into a later feature.
- **Lissajous knots** — drive a dot's x/y position from two tones; resting ratios draw stable
  closed knots, leaning ratios tumble. Would be Two Tone's third visualization alongside the
  waveform and Wobble Scope.
- **The time microscope** — record a note via mic (Tone.GrainPlayer) and let a kid stretch/
  freeze it 20× without pitch change, to explore attack/wobble/decay as a "landscape." Also
  Tone.PitchShift to decouple pitch from time (why chipmunk-voice happens).
- **Euclidean rhythm dial** — distribute k hits evenly across n slots to generate tresillo,
  cumbia, and similar world grooves from two numbers. Proposed as a one-knob upgrade to Pulse
  Grid specifically, not a new toy.
- **The cave knob** — Tone.Reverb/FeedbackDelay as "how big is the room?", ideally with mic
  input so a clap changes the reverb tail live.
- **The pitch spiral** — pitch as a helix (octaves stack, pitch-class = angle around the
  helix), ideally with live mic input drawing the singer's own voice on it. Would make "fly =
  same place, higher floor" literally visible; a natural companion to the Necklace toy (same
  circle-of-pitch-classes idea, but 3D/helical to also show octave).

## Explicitly rejected (don't rebuild these — see docs/PEDAGOGY.md and docs/DECISIONS.md)

- LLM tutor inside the app.
- Monorepo package split.
- A separate up/down word vocabulary for the move ladder.
- "Taw" and "Garage" as names (see NAMING.md).
- Headless/multi-skin toy architecture for v1.
- AWS in the deployment story.
- **Lesson-gated "unlocks" for toy dial options** (progress-store-gated tunings/scales) —
  proposed, then rejected by the owner in favor of per-embed presentation filtering: the
  `hide`/`choices` props on `<Toy>` (DECISIONS.md §3). Toys expose everything everywhere;
  each lesson embed just shows the subset it's about. No gating, nothing to unlock.
