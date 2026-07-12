# Architecture & product decisions

Decisions and the reasoning behind them, so they don't get silently reversed by a session that
doesn't have the context for why they were made. If you want to overturn one of these, that's
fine — just do it deliberately, and update this file.

## 1. One app, plain folders, no monorepo

Rejected: separate workspace packages (`@hopscotch/audio`, `@hopscotch/input`, etc). Reasoning:
premature packaging is the single biggest way a solo/small project accumulates ceremony it
doesn't need. Extract a package later *only if* something else outside this app would consume
it. Current layout:

```
src/
  audio/       Tone.js engine wrapper (singleton context, transport, master volume/mute)
  input/       Web MIDI input (mic input for pitch lives inline in spectrumScope.tsx for now)
  content/     glossary.ts (moves/scales/ratios — pedagogy source of truth), court.ts (map data)
  state/       zustand progress store (localStorage)
  toys/        each toy = one file exporting `def: ToyDef`; registry.ts is the whole "registry"
  guidance/    useGuide.ts (the runner) + guides.ts (all guided-intro scripts)
  lessons/     *.mdx, one per court square, + index.ts registry
  pages/       Court, LessonPage, Shed, Daw (the treehouse)
```

## 2. Lessons are MDX, not a custom JSON format

MDX gives prose + embedded React components natively, is first-class in Vite/Next, is
readable in a diff/PR, and needs no bespoke authoring tool. A lesson file's `meta` export
(id, square, `completeWhen: {toy, event}`) is the only structured part; everything else is
just markdown with `<Toy id="...">` embeds.

## 3. The toy embed contract

```mdx
<Toy id="two-tone" mode="guided" guide={lockInIntro} dials={{ rootHz: 220 }} locked={["rootHz"]} />
```

- `mode`: `guided` (runs the named `Guide`, then hands off to free) · `free` · (demo mode was
  speced but not built — see ROADMAP.md).
- `dials` = initial values; `locked` = dials the learner can't touch in this embed.
- A toy's manifest (`ToyDef` in `src/toys/types.ts`) is a plain object: `{id, title, blurb,
  thread, dials, component}`. No registry framework beyond the `Record<string, ToyDef>` in
  `registry.ts`.
- Every toy must be fully usable and pedagogically correct with **zero guide attached** — the
  Shed renders every toy in free mode with no lesson context, and that's a deliberate
  acceptance bar, not just a nice-to-have.
- Rule: **pedagogy lives in the guide, not the toy.** A toy shouldn't know it's being taught;
  it should just correctly expose its dials and emit events. This is what keeps adding new
  lessons cheap — reordering/relocking an existing toy for a new teaching purpose never
  requires touching the toy's component code.

## 4. Guidance runner is ~100 lines, not a state-machine framework

`src/guidance/useGuide.ts`: apply a step's `set`, show its `say` text, wait for the `until`
event (or a `continue` button click), advance, repeat, then flip to free mode and show
`handoff`. No branching in v1. If guidance ever needs real branching (e.g. different paths
based on how a kid answers), upgrade the hook then — don't pre-build it now.

## 5. Reused solutions — don't hand-roll these

| Need | Use | Don't |
|---|---|---|
| Audio engine, synths, transport, FFT | **Tone.js** | custom Web Audio graph management |
| Pitch detection | **pitchy** (McLeod method) | hand-rolled YIN/autocorrelation |
| Lesson format | **MDX** | custom JSON lesson schema |
| Client state | **Zustand** | Redux/Context-as-store/anything heavier |
| Local persistence | **Zustand `persist` middleware → localStorage** | a backend, for v1 |
| DB / auth / realtime (later, band-room features) | **Supabase** | rolling your own |

## 6. Naming: "toys," not "widgets"

See `NAMING.md` for the full rationale and the list of names that were tried and rejected.

## 7. Deployment: Vercel + Supabase. Explicitly NOT AWS.

All audio is client-side Web Audio — **there is no server audio workload at all.** That means
there's nothing AWS would buy that Vercel+Supabase doesn't already give more simply:

- Vercel hosts the app (this Vite build maps cleanly onto a future Next.js app if/when
  server-rendering or API routes are needed).
- Supabase provides Postgres + Auth + Realtime (for the eventual band-room / multi-device
  features) + Storage (for audio blobs, later).
- **Preview deploys are the intended QA loop**: every branch/PR gets a URL that can be handed
  directly to a kid on an iPad. This was a deliberate reason to pick Vercel, not incidental.
- Tiers: Vercel Hobby + Supabase Free are expected to be sufficient until real multi-user
  band-room features land; the first realistic ceiling is Supabase Realtime concurrent
  connections, which is far off at family/small-group scale.

If a future session finds itself reaching for server-side audio rendering, a queue, or
anything that assumes a long-lived server process, stop and reconsider — it's very likely
solvable client-side, and introducing a server changes the whole deployment story.

## 8. Debug ergonomics: `?debug=1`

Every `<Toy>` overlays its live dial values and last 5 emitted events when the URL has
`?debug=1`. This was treated as a first-class feature, not an afterthought, because audio bugs
are frequently invisible any other way (you can't screenshot a wobble). If you add a toy with
meaningful internal state that ISN'T exposed as a dial, consider whether it should be — the
debug overlay, guided locking, and Shed free-mode all only see dials.

## 9. The treehouse (piece-builder) data model

- A **Piece** has a list of **Commits** (`{id, ts, message, doc}`), each a full snapshot of the
  grid state — not a diff-based history. This is deliberately simple (v1: localStorage, small
  data volumes) over anything like CRDT/operational-transform.
- **Lead notes are events, not a boolean grid** (since the log-pitch canvas landed): `lead` is
  `{s: step, m: midi}[]` where `m` may be **fractional** — fractional midi encodes any frequency
  (m = 69 + 12·log₂(f/440)) while staying structured and diffable, so the commit/branch/diff
  model is preserved; this is the continuous-pitch extension of MIDI-first, not a departure
  from it. Old boolean-grid docs are migrated on load/import (`migrateDoc` in `Daw.tsx`); bass
  and drums remain boolean grids until they need the same freedom.
- **Branch** = duplicate the piece with a new id, seeded from the current in-progress doc, with
  a commit noting what it was branched from.
- **Diff display** (`+N −M` boxes vs. "now") is a cheap grid-cell comparison, not a real
  structural diff — fine for the current 3-track/16-step grid size.
- Explicitly designed toward, but NOT yet built: **suggestions between band members** —
  PR-style proposed changes that get reviewed/merged rather than directly committed, plus
  audio-recording snapshots (as opposed to MIDI-only). See ROADMAP.md.
- MIDI-first was a deliberate choice over audio-first for the treehouse: structured note data
  enables the git-like commit/branch/diff/suggestion model; raw audio would only support
  snapshotting, not real diffing. Audio recording is meant to layer on top later, not replace
  this.

## 10. Toy "threads" (categories) are a fixed vocabulary

`THREAD_COLORS` in `src/toys/types.ts`: `sound, home, moves, time, timbre, together, color,
ear`. These map to the color legend on the court map and are pedagogically meaningful (see
PEDAGOGY.md's "curriculum shape" section for the timbre-thread arc as an example of why the
thread assignment of a toy isn't cosmetic). Adding a 9th thread should be rare and deliberate,
not a default for a toy that doesn't obviously fit an existing one.
