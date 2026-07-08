# Hopscotch — Build & Deploy Decisions (v1)

Locks in how the project is structured, how lessons are authored, how **toys** (né widgets) embed,
and where it runs. Supersedes the packaging section of the widgets spec; the toy *catalog* in that
spec still stands.

---

## 1. Naming

- Interactive components are **toys**. Embed as `<Toy id="..."/>`. (You're handed a toy, shown a
  trick, then you play — the guided→free model in one word.)
- A toy's scripted intro is its **taw** (the hopscotch stone you toss first) — file naming flavor
  only: `two-tone.taw.ts` for guidance scripts.
- The free-play area outside lessons is **the Shed**.

## 2. Project shape — one app, plain folders, no monorepo

```
hopscotch/
  src/
    app/                     # Next.js App Router
      (court)/               # the hopscotch court map + lesson routes
      shed/                  # free-play toy gallery (doubles as dev gallery)
      api/                   # (thin; most things are client-side)
    audio/                   # Tone.js engine wrapper (singleton context, voices, transport, knobs)
    input/                   # mic pitch (pitchy in a worklet), FFT tap, Web MIDI, permissions UX
    toys/
      two-tone/
        TwoTone.tsx          # component (one skin, logic in hooks inside the folder)
        manifest.ts          # plain object, zod-validated
        two-tone.taw.ts      # default guidance script(s)
      wave-builder/ ...
      registry.ts            # Record<string, ToyDef> — the whole "registry"
    guidance/                # useGuidance hook (~100 lines: step index + event matcher)
    lessons/                 # *.mdx — one file per court square
    content/
      glossary.ts            # terms, kid-definitions, motions, audio params (source of truth)
      songs.ts               # move+rhythm banks (Old MacDonald, etc.)
      court.ts               # squares → lessons → required toys (drives the map + gating)
    state/                   # Zustand: member/profile, audio-armed, debug flag
  supabase/                  # migrations
```

Extract packages later only if something external consumes them. Not before.

## 3. Reused solutions (don't build these)

| Need | Use |
|---|---|
| Audio engine, transport, synths, FFT | **Tone.js** |
| Pitch detection | **pitchy** (McLeod) in an AudioWorklet — no hand-rolled YIN |
| Lesson format | **MDX** (native in Next.js) — prose + `<Toy/>` embeds, versioned in git |
| Schema validation | **zod** (manifests, scripts, song banks) |
| Client state | **Zustand** (tiny store: member, armed, debug) |
| DB / auth / realtime / storage | **Supabase** |
| Styling | Tailwind + the chalk theme tokens |
| Guidance | ~100-line custom hook (a list index is not a framework problem) |

## 4. The embed contract (final, simplified)

```mdx
<Toy id="two-tone" size="full" mode="guided" taw="lock-in-intro"
     dials={{ rootHz: 220 }} locked={["rootHz", "waveform"]} />
```

- `mode`: `guided` (runs the named taw, then hands off to free) · `free` · `demo` (autoplays, no input).
- `dials` = initial values; `locked` = dials the learner can't touch in this embed.
- Manifest: plain TS object `{ id, title, sizes, exclusive, dials, events }`, zod-checked in dev.
- Rules that stand from the spec: one shared AudioContext (toys are tenants); mic toys are
  `exclusive`; a "tap to wake the sound" veil handled once; glossary-driven labels; every toy fully
  usable with no taw.

## 5. Guidance scripts (taws)

```ts
export const lockInIntro: Taw = {
  toy: "two-tone",
  steps: [
    { say: "Press play. Two sounds at once!", set: { secondRatio: 1.42 }, lock: ["secondRatio"], until: { event: "playStarted" } },
    { say: "Hear the wobble? Slide until it disappears.", lock: [], until: { event: "lockAchieved" } },
    { say: "You found 3:2 — a leap! The wobble dies at simple ratios.", until: { event: "continue" } },
  ],
  handoff: "Your turn — everything's unlocked. Find another resting spot.",
};
```

Runner = `useGuidance(taw, toyEvents)`: apply `set`/`lock`, show `say`, wait for `until`, advance,
then flip the toy to free mode. No branching in v1.

## 6. Dev ergonomics

- **`?debug=1`** overlays every toy with live dial values + last 5 events. Build in WS-A; audio bugs
  are invisible otherwise.
- **The Shed is the dev gallery**: it renders every manifest in demo/guided/free. A toy isn't done
  until it behaves in the Shed in all three modes.
- Each Claude Code session ends with the Shed page proving its toys (acceptance = visible there).

## 7. Deployment

- **Vercel + Supabase. No AWS.** All audio is client-side Web Audio — there is no server audio
  workload. Vercel hosts the Next app; Supabase provides Postgres, Auth, Realtime (band room),
  Storage (audio blobs, later).
- **Preview deploys are the QA loop**: every session/PR gets a URL → hand it to kids on the iPad.
- Tiers: Vercel Hobby + Supabase Free until the band room; first real ceiling is Supabase Realtime
  concurrent connections (fine for a family/group scale for a long time).
- Env: `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` only, no server secrets in v1 (no LLM).

## 8. v1 vertical slice (confidence checkpoint)

Foundation + **W1 WaveBuilder, W2 TwoTone, W6 DronePad, W16 PitchSurface**, embedded in **one real
MDX lesson** (Rest or Lean), deployed on Vercel, progress row written on completion. Everything
after this is pattern repetition. If this slice feels good in the hand, the architecture is right;
if not, we adjust before building 20 more toys.
