# Hopscotch — context for Claude Code

Read this first. It's short on purpose; it points to the doc that actually has what you need
rather than repeating it. This is a family/group music education web app built with a real
human (Paul) across a long design conversation — the docs/ folder is that conversation's
memory, so future sessions don't have to rediscover decisions or re-litigate settled ones.

## What this project is

A chalk-styled hopscotch court of 18 short lessons, a shed of ~23 interactive sound **toys**
(never "widgets"), and **the treehouse** — a tiny local git-like piece-builder (step sequencer
with named checkpoints and branching). Everything is client-side Web Audio (Tone.js); no
server audio workload exists. Vite + React 18 + TypeScript + MDX + Zustand + pitchy.

## Start here, in order

1. **`docs/PEDAGOGY.md`** — the vocabulary and teaching theory everything else is built on
   (the move-word ladder, the High Five, root/lean, why certain "obvious" simplifications were
   rejected). Read this before touching any lesson content or adding a toy that teaches a
   concept — it's very easy to accidentally contradict a decision that was made for a specific
   pedagogical reason.
2. **`docs/DECISIONS.md`** — architecture and product decisions, and *why*, including things
   that were deliberately cut (LLM tutor, monorepo packages, headless toy skins) so they don't
   get re-proposed and re-rejected.
3. **`docs/NAMING.md`** — the vocabulary of the product itself. Small file, high blast radius
   if ignored — renaming something back to a rejected name (e.g. "widget", "garage") is an easy
   mistake for a fresh session to make.
4. **`docs/TOY_CATALOG.md`** — what every toy does, its thread (color-coded category), which
   lessons embed it, and which ones are still just specced vs. built.
5. **`docs/ROADMAP.md`** — what's built, what's designed-but-not-built, and the running list of
   "cool idea, not yet" items so good ideas don't get lost or re-suggested from scratch.
6. **`README.md`** (repo root) — how to actually run, build, and test it locally.

## Working conventions

- **Toy naming**: `<Toy id="...">`. Never call them widgets in code, comments, or docs.
- **Guidance scripts** live in `src/guidance/guides.ts`, one exported `Guide` per guided intro.
  Keep pedagogy (what to say, what to lock, in what order) in the guide, not in the toy — a toy
  should be fully usable and correct in free mode with zero guide attached.
- **New toy checklist**: add the toy file in `src/toys/`, export `def: ToyDef`, register it in
  `src/toys/registry.ts`, and it appears in the Shed automatically. If it belongs in a lesson,
  embed `<Toy id="...">` in the relevant MDX file — check `docs/PEDAGOGY.md` for which square/
  thread it belongs to before picking a home for it.
- **Every dial a toy exposes must be nameable in `ToyDef.dials`** — this is what makes the
  debug overlay (`?debug=1`), guided locking, and the Shed's free mode all work uniformly.
  Don't add component-local state for anything a lesson might want to script or lock.
- **Run `npm run build` before considering any change done** — it's `tsc --noEmit && vite
  build`, so it catches both type errors and real build failures in one command.
- Deploy target is **Vercel + Supabase, no AWS** (see DECISIONS.md §7 for why) — don't
  introduce server-side audio processing or infra that assumes a persistent server.

## Current state (update this section as you go)

All 18 lessons and ~23 toys are built and passing `npm run build`. Nothing has been tested
by ear/hand yet — that's the first task in a fresh session (see ROADMAP.md "Immediate next
steps"). Treat every toy's *audio behavior* as unverified even though the code compiles.

## Historical planning docs

`docs/early-planning/` holds the original design documents (music-app-plan.md,
hopscotch-widgets-spec.md, build-decisions.md) from before the full build. They're historical
record, not live specs — where they conflict with `docs/DECISIONS.md`, `docs/PEDAGOGY.md`, or
the actual code, the newer docs and the code win. Useful for understanding *why* something
looks the way it does, not for what to build next.
