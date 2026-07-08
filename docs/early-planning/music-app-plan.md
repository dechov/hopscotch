# Group Music App — Build Plan / Sketch (v2)

Plain spec, not polished. A multi-user web experience that teaches music from *sound up*,
hands-on, with an always-available mini-DAW. No LLM tutor (dropped for now). Built for **groups/
bands**, not assumed families.

Working name candidates: **Hopscotch** / **Earshot** (see notes at bottom).

---

## 0. Core principles

- **Sound before music.** Level 0 is acoustics, not notes.
- **Every concept has an interactive.** Listening/playing beats reading.
- **Guided → Free, everywhere.** Each interactive starts in a guided, step-gated mode, then opens
  into a free/sandbox mode. One shared scaffold; every station inherits it.
- **Produce before you name.** Ear training asks you to *perform* an interval (sing/play) before it
  asks you to recognize one.
- **Adapt to the instruments in the room.** A profile (voice/guitar/piano/uke/listen-only) swaps
  visuals and input method per learner.
- **One short word + one body motion per concept.** Glossary is the spine (scoot/step/hop…, High
  Five, home, flavor, Rainbow, lock-in). Now purely the UI's source of truth.
- **Soft gating.** Free order within a level; next level opens when the current one's modules are
  done. `ENFORCE_GATING` flag to flip hard/soft.
- **Multi-user from day one.** Groups with members; per-member progress + shared rooms.
- **MIDI-first.** Structured data is why collaboration/versioning is tractable at all.

---

## 1. Level / module map

Complete a level's modules in any order; the next level then unlocks. Each module lists its
**interactive(s)**.

### LEVEL 0 — Sound (no music yet)
- **L0.1 Lonely wave vs. helpers** — pure tone vs. harmonic stack. *Interactive: waveform builder; a Tone.js lowpass-filter knob audibly adds/removes the helpers.*
- **L0.2 Resting vs. leaning** — consonance, beats, lock-in. *Interactive: two-tone mixer; slide one tone, wobble vanishes at simple ratios.*
- **L0.3 The grid vs. pure ratios** — instruments are a compromise; bend toward a ratio. *Interactive: bend slider, live cents + nearest ratio (6:5 → 11:9 → 5:4).*
- **L0.4 Find the lock by ear** — tune two tones until beatless. *Interactive: detune sim; "make the wobble stop." Bridges to free-tuning a real guitar.*
- **L0.5 See your sound** — mic spectrum. *Interactive: sing/play, watch the FFT; fundamental + harmonics labeled. Visual proof of L0.1.*

### LEVEL 1 — Home & the High Five (first music)
- **L1.1 Black-key noodle** — 5 black keys over an Eb drone; can't play wrong. *Tap-pad over a drone.*
- **L1.2 Does it sound finished?** — find the rest-note. *"Which feels like home?" ear game.*
- **L1.3 The High Five** — 5 notes / 5 fingers / slap five; location stickers. *Five-pad scale player.*
- **L1.4 Flavor** — move home: bright vs. moody, same keys. *Home-mover toggle.*
- **L1.5 Turn the pegs** — free tuning as a feature (loosen only). *Virtual pegs + L0.4 lock meter.*

### LEVEL 2 — Moves & Time
- **L2.1 The ladder** — scoot · step · hop · skip · jump · leap · fly. *Character climbs rungs; hear each move.*
- **L2.2 Up vs. down** — direction by gesture.
- **L2.3 Long & short / pulse** — rhythm, kept separate. *Tap-the-pulse, build patterns.*
- **L2.4 Chant & clap a tune** — Moves × Time. *Chant-along lights up moves + claps.*
- **L2.5 Old MacDonald** — familiar song; "no scoots," opens on a jump-down. *Play-along.*
- **L2.6 Perform the interval (ear training)** — *produce-first.* App: "sing/play a **hop** above this note." Mic or Web-MIDI checks what you made, in cents. Visuals adapt to your instrument (fretboard / keyboard / voice ribbon). *Free mode: recognition (hear → name the move) + production challenges.*

### LEVEL 3 — Together & moving ground
- **L3.1 Echo game** — 3-note High-Five call & response (tap, mic, or MIDI).
- **L3.2 Scramble bank** — cold echoes; nothing clashes.
- **L3.3 Two-chord rock** — one scale, moving bass (C ⇄ Am). *Chord-bed you noodle over.*
- **L3.4 I–IV–V skeleton** — C–F–G under the High Five.
- **L3.5 The magic note** — hold one note, change the chord; hear it re-color.
- **L3.6 Expression knobs** — loud/soft, fast/slow + a couple Tone.js knobs (filter, a little reverb/delay). *Same loop, live controls.*
- **L3.7 The Rainbow** — 7 notes = Five + two scoots, color-coded.

### LEVEL 4 — Convergence / the band
- **L4.1 Open-string handoff** — A-minor pentatonic on open guitar strings. *Fretboard.*
- **L4.2 12-bar blues in A** — band vehicle ("Hound Dog"); roles. *Multi-user jam room + DAW.*
- **L4.3 Country Roads** — introduces the vi chord. *Play-along.*
- **L4.4 Lock-in (capstone)** — bend/sing to beatless against the band. *Live pitch meter vs. target.*

---

## 2. Cross-cutting systems

### Glossary
Typed config (`glossary.ts`): every term, kid-definition, body motion, audio params
("hop" = minor third = 3 semitones). The UI reads from it everywhere. Single source of truth.

### Instrument profile + adaptive visuals
Per member, pick what's in reach: **voice / guitar / piano / ukulele / listen-only** (changeable
anytime). Swaps: input method (mic pitch / Web MIDI / on-screen) and visuals (fretboard / keyboard /
voice pitch-ribbon). Read by ear-training and any module that wants you to perform.

### Input & analysis services
- **Mic pitch detection** — autocorrelation/YIN in an AudioWorklet; returns pitch + cents.
- **FFT/spectrum** — for L0.5 and any "see your sound" use (Tone.js analyser).
- **Web MIDI input** — real keyboard/digital-piano note input, no mic.
- Graceful fallback if mic/MIDI blocked (tap/on-screen).

### Guided → Free scaffold
Shared component wrapping any interactive: a scripted guided sequence (app drives, success-gated)
that graduates into open sandbox play. Authored per module as a small step list.

### Progress & gating
Per-member progress rows; a module is "done" when engaged (not graded — low pressure). Level unlocks
when prior-level modules are done. `ENFORCE_GATING` toggles hard/soft. Track richly regardless
(attempts, last-seen, time) for the dashboard.

### Multi-user
Groups/bands with members. **Shared rooms** (Supabase Realtime presence) for live sessions and the
band; **parallel progress** (each member's own tree/streak). Both exist; band needs the first, daily
practice the second.

---

## 3. The mini-DAW + versioning

Always accessible (persistent drawer/tab). Easy first: small MIDI piano-roll + Tone.js instruments,
record/playback, save a loop. **Audio recording is a later phase.**

### Why MIDI-first is architectural, not just easier
MIDI is **structured** (notes = pitch/start/duration/velocity on tracks) → real diffs, merges,
branches. Audio is an opaque blob → snapshots/lineage only, never merge.

### Versioning model (git internals → music)
A piece is a small JSON doc; store a **full snapshot per commit** in v1 (skip dedup until needed);
compute diffs on read.

| Git | Here |
|---|---|
| blob | a track's / region's note list |
| tree | the whole piece snapshot (tracks + tempo + key) |
| commit | snapshot + parent(s) + author + message |
| branch/ref | named pointer to a commit |
| pull request | a branch + a "suggested change" targeting its parent |
| review/approve | reactions + approve → merge |
| merge | combine trees; **conflict only if the same region/track is edited**, else auto-merge |

- **Suggest changes:** branch a take, edit, open a suggestion; others react / approve.
- **Non-destructive:** every save is a commit; revert = move the ref.
- **Diff view:** per-note added / removed / moved / velocity-changed — visual, obvious, fun.
- **Live co-edit:** optional/later via Realtime presence; commit graph is the async/PR layer.

### Library
**Tone.js** for transport, instruments, scheduling, analysis. Custom canvas piano-roll on top. Small
soundfont/sample set for nicer playback.

---

## 4. Stack & data model

- **Front:** Next.js (App Router), Tailwind, **Tone.js**, Web Audio, Web MIDI. Canvas for piano-roll/waveforms.
- **Back:** Supabase — Postgres, Realtime (rooms/co-edit), Storage (audio later), Auth.
- **Deploy:** Vercel.
- No server-side LLM.

Tables (sketch):
```
groups(id, name)
members(id, group_id, display_name, role, instruments jsonb)   -- role: learner | facilitator
progress(id, member_id, module_id, status, stats jsonb, updated_at)
rooms(id, group_id, level_id, host_member_id, state jsonb)
pieces(id, group_id, title, head_commit_id, created_by)
commits(id, piece_id, parent_id, author_id, message, doc jsonb, created_at)
branches(id, piece_id, name, head_commit_id, author_id)
suggestions(id, piece_id, source_branch_id, target_branch_id, status, created_by)
reactions(id, target_type, target_id, member_id, emoji)
```
Level/module/glossary content lives in versioned repo config, not the DB.

---

## 5. Build plan — Claude Code sessions (dependency-ordered)

`↳ needs:` = prerequisites. **[parallel]** = can run alongside the prior session.

**S0 — Scaffold & shell.**
Next.js + Tailwind + Supabase (auth, client) + Vercel. **Groups & member switching.** Instrument-
profile onboarding (pick what you have). Data-driven Level/Module shell from config. **Guided→Free
scaffold component.** Routing skeleton.
↳ needs: none.
Done when: log in, pick a member, set instruments, see Levels 0–4 with stub modules, gating reads from config, guided/free wrapper works on a stub.

**S1 — Content model, glossary, progress/gating.**
`glossary.ts` + `content.ts` (levels → modules). Supabase `progress` + hooks. Soft-gating +
`ENFORCE_GATING`. Dashboard stub.
↳ needs: S0.

**S2 — Audio engine core (Tone.js).**
Wrapper service: play tone, ratio/interval, drone, chord-bed, scheduled sequence, transport. **Exposed
knobs:** filter, ADSR, a couple effects. Test harness.
↳ needs: S0. **[parallel with S1]**

**S3 — Input & analysis services.**
Mic pitch detection (autocorrelation/YIN worklet), FFT/spectrum, Web MIDI input. Permission handling +
fallbacks. Test harness shows live pitch/cents + spectrum.
↳ needs: S2.

**S4 — Level 0 interactives.**
The 3 Sound-Lab stations + L0.4 tuning sim + **L0.5 spectrum ("see your sound")**, on the engine +
input services.
↳ needs: S2, S3.

**S5 — Level 1 interactives.**
Drone-noodle pad, "which is home?" game, flavor mover, virtual pegs + lock meter.
↳ needs: S2, S3.

**S6 — Level 2 interactives.**
Moves ladder, up/down, pulse/rhythm builder, chant-and-clap, Old MacDonald play-along, **L2.6 perform-
the-interval ear trainer (instrument-adaptive, produce-first).**
↳ needs: S2, S3.

**S7 — Level 3 interactives.**
Echo game, scramble bank, two-chord rock bed, I–IV–V bed, magic-note demo, expression knobs (incl.
Tone.js), Rainbow.
↳ needs: S2, S3, S5.

**S8 — Mini-DAW v1 (single-user, MIDI).**
Canvas piano-roll, Tone.js instruments, record/playback, Web-MIDI input, save a piece (full-snapshot
commit, no branching yet). Always-accessible drawer.
↳ needs: S2, S3.

**S9 — DAW collaboration & versioning.**
Commit DAG, branches, suggestions (PR model), reactions/approve, MIDI diff view, disjoint auto-merge,
revert. (Live co-edit optional/deferred.)
↳ needs: S8.

**S10 — Level 4 / band room.**
Multi-user live room (Realtime), roles, 12-bar blues jam, collaborative DAW, lock-in capstone, Country
Roads play-along.
↳ needs: S6, S7, S8 (S9 ideal).

**S11 — Progress dashboard & polish.**
Group/member view, streaks, soft-gating UX.
↳ needs: S1, S7.

**S12 (later) — Audio recording in the DAW.**
getUserMedia capture → Storage; snapshot/lineage versioning; overdub. After MIDI branching is solid.
↳ needs: S9.

---

## 6. Open decisions (flagged, not blocking)

1. **Gating:** soft (recommended) vs. forced — built as a flag; decide after S4.
2. **First multiplayer shape:** per-member progress first (practice loop) vs. shared room first
   (group session). Leaning practice-first; band room (S10) brings the live shape.
3. **DAW live co-edit:** in S9, or async-PR-only first + presence later? Async-only is simpler and
   probably enough for v1.
4. **Instruments/sounds:** Tone.js instruments throughout; add a soundfont at S8 for the DAW.

---

## Name candidates

- **Hopscotch** — our movement words (hop/skip/jump/scoot) *are* hopscotch moves; the pitch ladder is
  the chalk grid; it's a group playground game. Best thematic fit, kid-friendly without being babyish.
- **Earshot** — ear-first focus + "together, within earshot." Ages up well with older players.
- **High Five** — already a coined term in our system; friendly, five-ish, has a gesture.
- **Lock-In** — the beatless capstone + playing in lock as a band. More music-nerd; mild
  "conformity" connotation to weigh.
