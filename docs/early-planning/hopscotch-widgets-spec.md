# Hopscotch — Widget Library Spec

Reusable, embeddable interactive widgets. Lessons are thin scripts over this library; widgets also
appear in the sandbox ("the Shed"), the DAW, and anywhere else useful. Err toward building more.

---

## 1. Architecture & packaging

### Shape
A **monorepo package** (`@hopscotch/widgets`) inside the app repo (pnpm workspace). Not published
externally at first, but built as if it could be. Widgets are **React components** over two shared
service layers:

```
@hopscotch/audio    — Tone.js wrapper: engine, transport, instruments, knobs
@hopscotch/input    — mic pitch (YIN worklet), FFT, Web MIDI, tap fallback
@hopscotch/widgets  — the components in this spec
@hopscotch/guidance — the step-script runner (below)
```

Every widget:
- **Owns no audio context.** It requests nodes/voices from `@hopscotch/audio` and releases them on
  unmount. One AudioContext app-wide; widgets are tenants. (Hard rule — prevents the classic
  many-contexts mess and lets widgets coexist on one page.)
- **Is controlled-or-uncontrolled.** Every dial can be set via props (controlled, for guided steps)
  or left interactive (uncontrolled, for free mode). Same convention as form inputs.
- **Emits events.** A single `onEvent(e)` callback with typed events (`noteOn`, `lockAchieved`,
  `targetHit`, `stepComplete`, `valueChanged`…). Guidance, progress tracking, and lessons all
  subscribe to the same stream.
- **Declares its manifest.** Each widget exports `manifest`: id, dials (name/type/range/default),
  events emitted, guidance hooks, and sizes supported. The lesson authoring format and the widget
  gallery both read manifests — this is what makes embedding data-driven.
- **Renders headless-first.** Logic in a hook (`useTwoTone(...)`), presentation in a default skin.
  Lets us reskin per lesson (chalk style vs. DAW style) without forking logic.

### Embedding contract
Lessons are authored as config (MDX or JSON blocks), not hand-wired pages:

```tsx
<Widget
  id="two-tone"                    // registry key
  size="full" | "panel" | "inline" // responsive presets
  mode="guided" | "free" | "demo"  // demo = autoplay, no input
  script={lockInIntro}             // guidance script (guided mode)
  dials={{ ratioSnap: true, rootHz: 220 }}   // initial/locked dial values
  lockedDials={["rootHz"]}         // dials the learner can't touch in this embed
  onEvent={trackProgress}
/>
```

- `size` presets: `inline` (a single control row inside prose), `panel` (card, ~half width),
  `full` (the lesson's main stage). Widgets declare which they support.
- `lockedDials` is the key reuse trick: the *same* widget is a simple demo (most dials locked) in
  square 1 and a full instrument (nothing locked) in the Shed.
- Widgets must be **multi-instance safe** (two on one page) except where the manifest says
  `exclusive: true` (e.g. anything holding the mic).

### Guided → Free (`@hopscotch/guidance`)
A guidance **script** is an ordered list of steps; the runner drives any widget through its dials +
events:

```ts
type Step = {
  say: string;                 // short instruction (kid-voice, glossary words)
  set?: Partial<Dials>;        // dial values to apply on step entry
  lock?: DialName[];           // dials frozen this step
  highlight?: ElementId[];     // UI affordances to spotlight
  until: EventMatcher;         // completion condition, e.g. {type:"lockAchieved"} or {type:"valueChanged", dial:"partials", gte:4}
  timeoutHint?: string;        // gentle nudge if stuck
};
```

Runner behavior: apply `set`/`lock`, show `say`, wait for `until`, advance. Last step always hands
off to **free mode** ("your turn — everything's unlocked"). Scripts live beside lessons, not inside
widgets — one widget, many scripts. Every widget must be fully usable with **no script** (free
mode is the default export behavior).

### Other cross-cutting rules
- **Start-gesture handling** is centralized: first user tap anywhere arms the AudioContext; widgets
  render a "tap to wake the sound" veil until armed (browser autoplay policy).
- **Glossary-aware labels**: widgets never hardcode "minor third" — they render terms via
  `glossary.ts` lookups (`hop`), with a settings flag to also show grown-up names.
- **Color/interval coding** comes from one shared theme map (ladder colors, sticker names) so a hop
  is the same color in every widget.
- **Instrument-profile awareness**: widgets that display pitch space take a `surface` prop:
  `keys | fretboard | ribbon | pads` (from the member's instrument profile) and render accordingly.
  Implemented once as a shared `<PitchSurface>` primitive (see W16).
- **Mic/MIDI acquisition** goes through `@hopscotch/input` with permission UX handled once;
  widgets receive streams, never call `getUserMedia` themselves.
- **Persistence hook**: widgets can expose `serialize()/hydrate()` for their state so the Shed can
  save presets and lessons can restore a learner's last state.
- **A11y/kid ergonomics**: big hit targets (44px+), drag *and* tap alternatives, no reliance on
  hover, reduced-motion respected, captions for every sound ("what you're hearing: …").

---

## 2. Widget catalog

Grouped by thread. Each entry: what it teaches → dials → guidance hooks (what scripts can do with
it) → embed notes. Names are working names.

Legend for dial types: `slider`, `knob`, `toggle`, `select`, `pads`, `xy` (2-D pad), `drag`.

---

### SOUND thread

**W1 · WaveBuilder** — *lonely wave vs. helpers*
Teaches: harmonics/partials; timbre from recipe. Tone.js: `Oscillator.partials`, custom periodic wave.
- Dials: `partialCount` (slider 1–16), `partialLevels` (per-harmonic mini-faders, drag), `wavePreset`
  (select: sine/triangle/square/saw — shown as "recipes"), `baseHz` (slider, lockable), `filterCutoff`
  (knob — the "muffle" knob, a lowpass that removes helpers again).
- Views: waveform (time-domain) + harmonic comb (bar per partial). Toggle or side-by-side.
- Events: `valueChanged`, `presetMatched` (learner's custom levels ≈ a named recipe).
- Guidance hooks: start locked at 1 partial; step-unlock partials one at a time; "make it buzzy";
  "now muffle it back to lonely" (filter sweep = removing helpers — the L0.1 payoff).
- Embed: `inline` variant = just the partialCount slider + tiny wave. `full` = the lab station.

**W2 · TwoTone** — *rest or lean*
Teaches: consonance, beats, simple ratios. Tone.js: two oscillators + gain.
- Dials: `rootHz` (lockable), `secondRatio` (drag slider, continuous), `ratioSnap` (toggle: magnet
  to 1:1, 5:4, 4:3, 3:2, 5:3, 2:1), `waveform` (select, lockable).
- Views: summed waveform + a **wobble meter** (beats/sec, big and readable) + verdict text
  (resting / leaning) + ratio readout.
- Events: `lockAchieved` (within ε of a simple ratio, sustained 1s), `ratioVisited`.
- Guidance: "find the spot where the wobble dies"; visit each nice ratio in order; then snap-off
  free exploration.
- Embed: the core Level-0 station; also reused *inside* W4 and W13.

**W3 · BendMeter** — *the grid vs. pure ratios*
Teaches: 12-TET compromise, just intonation, the blue zone. (Our Station 3, generalized.)
- Dials: `homeHz` (lockable), `cents` (drag 0–1200 or scoped window like 300–400), `targets`
  (config: which just ratios to mark), `window` (which interval region).
- Views: cents ruler with ratio flags (6:5, 11:9, 5:4…), live "nearest nice ratio / off by"
  readout, wobble-against-home trace.
- Events: `targetHit` (within ε of a target ratio), `zoneEntered` (e.g. blue zone).
- Guidance: scripted tour m3→blue→M3; then free with any window.
- Embed: `panel` inside the bend lesson; **live-input variant** (see W14) reuses the same ruler.

**W4 · TuneIt** — *find the lock by ear*
Teaches: tuning is a relationship; beats → beatless. Composition of W2's engine with a "peg" skin.
- Dials: `targetRatio` (config), `startDetune` (config: how far off it starts), `pegSensitivity`,
  `showMeter` (toggle — hide it for ear-only challenges).
- Views: two big pegs (drag to turn), string-pair animation, optional wobble meter.
- Events: `lockAchieved`, `overTightened` (playful warning — ties to the real-guitar "loosen only" rule).
- Guidance: meter visible → meter hidden (ear only) → "now go do it on the real guitar" handoff card.

**W5 · SpectrumScope** — *see your sound*
Teaches: any sound is a recipe; your voice has harmonics. Tone.js: `FFT` + `UserMedia` via input pkg.
- Dials: `source` (select: mic / any playing widget / file later), `freeze` (toggle), `labelMode`
  (select: none / fundamental / full harmonic comb), `range` (zoom).
- Views: live spectrum, detected fundamental flag, harmonic comb overlay showing integer multiples.
- Events: `fundamentalDetected`, `harmonicCountSeen`.
- Guidance: "sing ahh — find the tallest spike"; "now sing oo — watch the helpers change while the
  spike stays" (vowels = filter! source-filter preview).
- Embed: `exclusive: true` (mic). Also dockable as a mini-scope beside any other widget (`panel`).

---

### HOME thread

**W6 · DronePad** — *noodle over a home*
Teaches: home, safety of the Five, flavor. The workhorse.
- Dials: `scale` (select: highFive-major / highFive-minor / rainbow / custom mask), `home` (note
  select), `surface` (keys/fretboard/ribbon/pads via PitchSurface), `droneType` (select: root /
  open-fifth / chord), `droneOn` (toggle), `stickerLabels` (toggle: Home/Park/School/Farm/Woods).
- Views: the pitch surface with in-scale notes lit; drone indicator.
- Events: `noteOn` (with scale-degree), `homeLanded`, `phraseEnded` (silence gap).
- Guidance: black-keys-only start; "end your wander on Home"; flavor flip mid-script (`set: {home:"Gb"}` vs `"Eb"`).
- Embed: `full` in lessons; `panel` version docks next to ChordBed (W8) later. Probably the most
  reused widget in the app.

**W7 · HomeFinder** — *does it sound finished?*
Teaches: tonic by ear.
- Dials: `melodyBank` (config), `endingsMode` (select: resolved-vs-hanging / pick-home-note),
  `scale`, `voice` (instrument sound).
- Views: play button + two/three big answer pads (✓ finished / ~ hanging), or a mini surface for
  "tap the note that would finish it".
- Events: `answered` (correct?), `streak`.
- Guidance: 2-choice → 3-choice → "sing the finish yourself" (mic, checks landing note).

**W8 · ChordBed** — *changing ground*
Teaches: moving chords under a fixed scale; I–IV–V; relative minor. Tone.js: transport + PolySynth.
- Dials: `progression` (select/drag-builder: [I], [I,vi], [I,IV,V,I], 12-bar, custom), `voicing`
  (select: open-fifth / triad), `tempo` (knob), `barsPerChord`, `loop` (toggle), `nowPlayingBadge`.
- Views: chord lane (like a mini timeline) with the current chord lit; roman + friendly labels.
- Events: `chordChanged`, `loopCompleted`.
- Guidance: single drone → two-chord rock → I–IV–V; scripts can force chord changes at moments
  ("hold your note… *now* — hear it change color?" → the Magic Note lesson is literally a script
  over ChordBed + DronePad docked together).
- Embed: designed to **pair**: `<Dock a={ChordBed} b={DronePad}/>` sharing one transport.

**W9 · MagicNote** — *one note, three feelings*
Teaches: harmonic context re-colors a pitch. (A thin, purpose-built composition of W8 with a
one-note surface — worth having as its own widget because the framing is the lesson.)
- Dials: `heldNote` (select, lockable), `chords` (config), `autoCycle` (toggle + rate).
- Views: one big glowing sustained note + the chord lane; a "feeling" label that re-colors per chord
  (settled / bright / floating…).
- Events: `chordChanged`, `feltDifference` (learner taps "it changed!").
- Guidance: auto-cycle demo → learner drives the chord changes → learner picks the held note.

---

### MOVES thread

**W10 · MoveLadder** — *the interval ladder*
Teaches: scoot·step·hop·skip·jump·leap·fly as distances; up vs. down.
- Dials: `rungs` (config: which moves shown), `rootNote`, `direction` (toggle up/down — the arrow is
  the UI for our direction convention), `playMode` (select: tap-a-rung / sequence-builder).
- Views: vertical ladder/hopscotch-rung graphic; a chip hops the chosen distance with the sound;
  color per move from the shared theme.
- Events: `moveHeard` (which move), `sequencePlayed`.
- Guidance: introduce rungs one at a time; "make it go step step scoot" (builds the major-scale
  chant); direction flip drills.
- Embed: `inline` variant = a single row of move-chips that plays each (usable inside any prose).

**W11 · ChantBoard** — *moves × time*
Teaches: a tune as a chant of moves + a clap pattern; the notation-before-notation.
- Dials: `song` (config: move+rhythm sequence, e.g. Old MacDonald), `tempo`, `layers` (toggles:
  say-moves / clap-rhythm / hear-pitches), `follow` (bouncing-ball highlight).
- Views: two parallel lanes — move-words lane and long/short lane — with a follow ball.
- Events: `layerToggled`, `playedThrough`, `tapAccuracy` (if learner claps via tap/mic onset).
- Guidance: hear it → say it → clap it → all three; then load other songs in free mode.

**W12 · PulseGrid** — *long & short, the beat*
Teaches: pulse, subdivision, patterns; later swing. Tone.js: Transport, subdivisions, swing param.
- Dials: `tempo` (knob), `slots` (4/8/16), `sounds` (per-row voice select: clap/drum/wood),
  `swing` (knob — off by default, unlocked in a later lesson), `metronome` (toggle).
- Views: step-sequencer row(s), big and chunky; playhead sweep.
- Events: `patternChanged`, `barLooped`, `tapOnBeat` (accuracy when tapping along).
- Guidance: copy-this-pattern (echo for rhythm); keep-the-pulse tap test; swing reveal ("same
  boxes — feel the lean").
- Embed: also the seed of the DAW's drum lane later; `inline` = single-row 8-slot version.

---

### TIMBRE thread

**W13 · ToneForge** — *make a sound*
Teaches: a sound's identity = recipe (partials) + life-shape (envelope) + dirt (distortion) +
wobble (vibrato/LFO). Tone.js: Synth + AmplitudeEnvelope + Distortion + Vibrato/LFO, FM `harmonicity`.
- Dials: `recipe` (embeds W1's partial faders or preset select), `ADSR` (4 mini-sliders with a
  drawn envelope you can also drag), `dirt` (knob: distortion amount), `wobbleRate`/`wobbleDepth`
  (knobs: vibrato LFO), `harmonicity` (knob, advanced/lockable — FM ratio: watch integer ratios
  sound "musical" and odd ones go clangy = the Root Principle *inside* one sound), `keyboard`
  (mini surface to audition).
- Views: envelope curve (draggable), wave + spectrum mini-scopes, preset shelf ("pluck", "organ",
  "bell", "fog horn"), **save-to-Shed** button (serialize preset).
- Events: `presetSaved`, `envelopeShaped` (e.g. attack < 20ms = "pluck achieved"), `dialChanged`.
- Guidance: "make it a pluck" (fast attack, no sustain) → "make it an organ" → "add dirt — hear the
  helpers pile in" (link back to W1/W5: dock the SpectrumScope and *watch* distortion add
  harmonics) → free forge.
- Embed: `full`; its saved presets become selectable voices in DronePad, ChordBed, and the DAW —
  the cross-widget payoff that makes timbre feel real.

---

### EAR thread (Earshot)

**W14 · PitchRibbon** — *live pitch, the voice's surface*
Teaches: pitch is continuous; your voice is an instrument. The shared live-input display.
- Dials: `target` (optional: note / interval / ratio-flagged window à la W3), `tolerance` (cents),
  `trail` (seconds of history), `guide` (toggle: show target line).
- Views: scrolling pitch trace (ribbon) with target lines/zones; cents readout; hit glow.
- Events: `targetHit` (sustained within tolerance), `contourMatched` (trace ≈ reference shape).
- Guidance: "slide up until you're in the glow"; "now land a hop above the drone"; contour-copy games.
- Embed: `exclusive` (mic). Reused by W15, and as the live variant of W3 (bend with your voice).

**W15 · EchoTrainer** — *Earshot's core: produce, then name*
Teaches: intervals/phrases by **production first**, recognition second.
- Dials: `mode` (select: **perform** — "play/sing a hop up from this note" / **echo** — copy a 2–3
  note call / **name** — hear and tap the move word), `inputKind` (mic / MIDI / tap-surface — from
  instrument profile), `bank` (which moves/phrases in rotation), `tolerance`, `tempoOfCalls`.
- Views: call display (lit on the learner's surface), response meter (cents / correct-note check),
  move-word answer chips (name mode), streak/level chips.
- Events: `callIssued`, `responseScored` (with cents error), `named` (correct?), `levelUp`.
- Guidance: perform-with-guide-line → perform-blind → echo → name; scripts pick the bank (e.g.
  hops-only day). Free mode = endless practice with settings exposed.
- Embed: `full` as the Earshot gym; `panel` drop-in inside any lesson to drill that lesson's move.

---

### TOGETHER thread

**W16 · PitchSurface** — *(primitive, but ships as a widget too)*
The shared input/display surface: `keys | fretboard | ribbon | pads`, scale-mask, sticker labels,
color coding, touch/MIDI input. Every pitch widget renders through it; exposed standalone as a
simple playable instrument in the Shed.
- Dials: `surface`, `scaleMask`, `home`, `labels` (none/stickers/letters), `range`.
- Events: `noteOn/off` with degree + move-from-last (it computes the move between successive
  notes — free ear-training data everywhere).

**W17 · JamRoom** — *play together*
Teaches: roles, listening, the band. Supabase Realtime + shared Transport.
- Dials: `song` (12-bar blues in A / Country Roads / free), `roles` (assign per member: beat /
  chords / noodle / caller), `tempo` (host-controlled), `countIn` (toggle).
- Views: member chips with live activity glow, shared chord lane (W8's view), whose-turn spotlight
  for trading fours.
- Events: `memberJoined`, `roleChanged`, `fourTraded`, `songLooped`.
- Guidance: scripted first-jam (everyone gets 4 bars of noodle in turn); then free rooms.
- Embed: `full` only; the Level-4 centerpiece. (Realtime sync of *audio* is not attempted — each
  device sounds locally against the shared transport/click; the room syncs state, not sound.)

**W18 · CallBoard** — *human call-and-response conductor*
Low-tech but high-value: turns any room (physical or JamRoom) into structured call-and-response
without the app making the sounds.
- Dials: `caller` (member select / rotate), `promptBank` (moves, scrambles, rhythm patterns),
  `timer` (per-turn), `display` (giant prompt card).
- Views: full-screen prompt ("play: hop up, step down"), turn order, next-up.
- Events: `promptShown`, `turnAdvanced`.
- Embed: `full`; also great on a TV/shared screen while instruments are physical. Pairs with W15
  when you want the app to *check* responses instead.

---

### UTILITY / DELIGHT widgets (build-more-than-needed bucket)

**W19 · RatioZoo** — a gallery of just ratios: tap 2:1, 3:2, 5:4, 6:5, 7:4, 11:9… hear each pure,
see the two waves overlaid aligning every N cycles. Dials: `ratioSet`, `showMath` (toggle: the
"aligns every N wiggles" counter). The "why simple = restful" museum piece.

**W20 · KeysVsPure** — toggle a chord between 12-TET and just intonation; hear the shimmer
difference; a "grid vs. pure" capstone toy. Dials: `chord`, `tuning` (A/B toggle), `blindTest`
(which was which?).

**W21 · ScaleLab** — build any scale by lighting moves on the ladder (mask editor); instantly
playable on a surface; shows the chant (step-step-scoot…). Dials: `mask` (drag), `home`,
`surface`. Free-mode gold; also how "the Rainbow = Five + two scoots" is *shown* (diff view
between two masks).

**W22 · LoopStation** — one-lane mini looper (MIDI capture over a drone/bed): record 2 bars,
layer up to 3 lanes. The bridge widget between lessons and the full DAW; its lanes are DAW tracks
in embryo. Dials: `bars`, `lanes`, `quantize` (toggle — also teaches quantization!), `bed`
(none/drone/chord progression).

**W23 · WobbleScope** — dedicated beats visualizer: two adjustable tones rendered as two spinning
dots whose alignment flashes on each beat — makes "wobble rate = frequency difference" visible and
countable. Dials: `f1`,`f2` (or `Δf` direct), `sound` (toggle). Tiny, inline-friendly, weirdly
mesmerizing.

**W24 · SongMapper** — displays any song from the content bank as its move-chant + rhythm lanes
(W11's view) with play-along; the "familiar songs" delivery vehicle. Dials: `song`, `layers`,
`transpose` (select home — sneaky flavor/transposition lesson).

---

## 3. Build order & session mapping

Foundation first, then widgets in lesson order, utilities interleaved where cheap:

1. **WS-A — Primitives:** `@hopscotch/audio`, `@hopscotch/input`, `<PitchSurface>` (W16),
   guidance runner, `<Widget>` registry/embed component, gallery page (renders every manifest —
   the dev playground *is* the widget catalog).
2. **WS-B — Sound set:** W1, W2, W3, W4, W23 (W4 and W23 are thin over W2's engine).
3. **WS-C — Scope:** W5 (mic/FFT; first `exclusive` widget; permission UX).
4. **WS-D — Home set:** W6, W7, W8, W9 (W9 is a composition — cheap after W6+W8; build the
   `<Dock>` pairing primitive here).
5. **WS-E — Moves/Time set:** W10, W11, W12, W24 (W24 is W11 + content bank).
6. **WS-F — Timbre:** W13 (+ preset pipeline into W6/W8 voices), W19, W20.
7. **WS-G — Earshot:** W14, W15, W21 (W15 consumes W14 + W16 + glossary scoring).
8. **WS-H — Together:** W18 (cheap), W22, then W17 (Realtime; biggest lift).

Rule of thumb honored throughout: every "widget" that's really a *composition* (W4, W9, W15, W24)
is listed anyway — naming compositions keeps lessons thin and the catalog browsable.

---

## 4. Manifest example (normative)

```ts
export const manifest: WidgetManifest = {
  id: "two-tone",
  title: "TwoTone",
  threads: ["sound"],
  sizes: ["inline", "panel", "full"],
  exclusive: false,
  dials: {
    rootHz:      { type: "slider", min: 110, max: 440, default: 220, lockable: true },
    secondRatio: { type: "drag",   min: 1.0, max: 2.1, default: 1.5 },
    ratioSnap:   { type: "toggle", default: false },
    waveform:    { type: "select", options: ["sine","triangle"], default: "sine", lockable: true },
  },
  events: ["valueChanged", "lockAchieved", "ratioVisited"],
  guidance: { highlights: ["ratioHandle","wobbleMeter"], completables: ["lockAchieved","ratioVisited"] },
};
```

The gallery, the lesson author format, the guidance runner, and progress tracking all consume this
one shape. A widget isn't "done" until its manifest renders correctly in the gallery in all three
modes (demo / guided-with-a-test-script / free).
