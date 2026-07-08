# Pedagogy — the teaching decisions

This is the theory everything else is built on. It came out of a long design conversation and
most of it exists *because* an easier/more obvious alternative was tried and rejected. Where
that's true, the rejected alternative is noted — don't re-propose it without re-reading why.

## The move-word ladder

Melodies aren't taught as notes. They're taught as **moves** — one monosyllabic word per
interval distance, said out loud and paired with a physical motion:

| word  | semitones | grown-up name | motion |
|---|---|---|---|
| stay  | 0  | unison | freeze |
| scoot | 1  | half step | tiny shuffle |
| step  | 2  | whole step | one walking step |
| hop   | 3  | minor third | hop on one foot |
| skip  | 4  | major third | skip forward |
| jump  | 5  | fourth | two-foot jump |
| trip  | 6  | tritone | stumble! |
| leap  | 7  | fifth | big leap |
| vault | 9  | sixth | vault over |
| reach | 11 | seventh | reach way up |
| fly   | 12 | octave | arms out, fly |

**Decision:** direction (up/down) is NOT a separate word set. One word per distance; direction
is shown with a gesture/arrow ("hop up" / "hop down"). This was deliberate: a separate up/down
vocabulary would double the words to memorize, and it would hide the inversion insight (a leap
up and a jump down land on the same *kind* of note — same family, opposite doors). Keeping
direction as a modifier, not a new word, preserves that for later.

"Dip/drop" survives only as optional expressive color commentary, not as core vocabulary.

`src/content/glossary.ts` (`MOVES`, `moveFor()`) is the code source of truth for this table —
if you change a word or a semitone mapping, change it there and it propagates everywhere
(Move Ladder, Chant Board, Earshot's "name the move" mode).

## The High Five (pentatonic) and the Rainbow (diatonic)

- **Pentatonic scale = "the High Five."** Five notes, five fingers. Degree names are
  location-based stickers: **Home, Park, School, Farm, Woods** (not scale-degree numbers —
  numbers came later, in `docs/ROADMAP.md` "not yet" list, as an optional advanced overlay).
- **7-note scale = "the Rainbow"** = the High Five plus two extra notes (two scoots).
- **Why pentatonic-first, and why it's safe:** the High Five has no scoots (half-steps) in it
  anywhere — every pair of notes is a step or more apart. That's *why* nothing in it clashes.
  This is a provable, demonstrable fact (see Scale Lab's "read the chant" feature), not just an
  assertion — kids can check it themselves by building scales and reading the move-chant.
- **The Rainbow's added danger/spice is exactly its two scoots.** This is presented as a
  feature discovered, not a rule stated. Don't shortcut this into "the 7-note scale has more
  notes" — the pedagogical point is specifically about half-steps and clash, which the pure
  note-count framing loses.

## Old MacDonald and the octave-placement correction

This song is used to *prove* the no-scoot rule by ear, but only works if you get the register
right. In the key of C: G and A sit **below** middle C as sung. That means:

- The song **opens with a jump DOWN** (C → G3, a fourth) — not up. If you build this with G/A
  above middle C, the "prove the rule" beat lands wrong and the move-word doesn't match what
  a kid actually sings.
- **Farm (G3) → "E" (E4) is a vault** (major sixth) — the one big/fancy move in an otherwise
  small-stepped tune. Don't relabel this as anything smaller; the corrected version in
  `src/toys/chantBoard.tsx` (`SONG` array) is deliberately this shape.

If you ever touch `chantBoard.tsx`'s note data, re-derive against this, don't "simplify" the
octaves back to something that looks tidier on a keyboard diagram.

## Root, rest, and lean ("the big idea of the whole court")

**"Simple relationships rest; complex ones lean."** This is the single sentence the entire
sound-thread curriculum is trying to teach, at increasing sophistication:

1. Two tones (Two Tone toy, square 2): simple frequency ratios (3:2, 4:3, 5:4...) produce no
   beating — "rest." Complex/irrational-ish ratios beat — "lean."
2. Bending (Bend Meter, square 4): the 12-TET fret is a *compromise* location, not the true
   resting spot. True pure ratios (6:5 = 315.6¢, 11:9 "blue" = 347.4¢, 5:4 = 386.3¢) sit between
   frets — bending reaches ratios a fretted instrument physically cannot play.
3. Tuning (Tune It, square 4/8): the peg-turning game is literally the same rest/lean
   perception, applied to instrument setup.
4. Harmonicity inside one sound (Tone Forge, square 11): whole-number harmonicity ratios sound
   musical; in-between ones sound bell-clangy. Same rest/lean idea, now *inside* a single note
   rather than between two notes.
5. Rhythm as pitch (Speed Trick) and ratios-in-time (Ratios in Slow Motion): the same "simple
   ratio = stable/resting relationship" idea, applied to time instead of frequency. A 3:2
   polyrhythm gallop and a 3:2 musical leap are the *same ratio at different speeds* — this is
   the closing "whoa" of the whole curriculum, not a separate topic.
6. The comma pump (The Drift, teacher-facing): pure ratios chained together don't stay
   consistent — chase local purity everywhere and pitch drifts forever. This is *why*
   temperament (the 12-TET grid) had to be invented — a deliberate compromise that trades local
   purity for global consistency. Keep this toy positioned as "why the compromise from #2/#3
   exists," not as an isolated curiosity.

If you add new toys, ask whether they're teaching a new idea or another costume for
rest-or-lean — many good toy ideas turn out to be #6 in disguise, and that's fine, but the
lesson text should say so explicitly (the "one idea, different speeds/domains" callback is a
deliberate structural feature of the course, not incidental).

## Black keys, key journeys, and open strings

- The five black keys on a piano ARE a ready-made High Five. Home = Gb → bright major-flavored
  High Five. Home = Eb → moody minor-flavored High Five. Same five notes, different Home,
  different flavor — this is the seed for the Necklace toy's "spin vs. walk Home" distinction
  (see below).
- The six-stage key journey (Gb maj → Eb min → Eb maj → C min → C maj → A min) was designed so
  each step changes **exactly one thing** (either the Home note or the major/minor flavor, never
  both at once) — alternating relative-key moves and parallel-key moves. A minor is the last
  stop deliberately, because it's the open-string handoff to real guitar (E A D G B E has an
  open A and open E, so A minor needs no fretting to start playing).
- Accompaniment default = **open fifths on Home**, not full triads — this avoids committing to
  major/minor color before the lesson wants to reveal it.

## The Necklace: keys vs. modes as two different circle operations

This is the precise mental model behind `src/toys/necklace.tsx` — get this right if you extend
it, because "spin" and "walk Home" are easy to conflate and they are NOT the same operation:

- **Spinning the necklace** (rotating which of the 12 clock positions the whole bead pattern
  sits on) = **transposition / a new key**. Every relationship between beads is preserved.
  Same song, higher or lower.
- **Walking Home to a different bead on a FIXED necklace** = **a new mode**. The notes are
  identical; every relationship to Home changes. This is where Dorian/Phrygian/etc. come from,
  and it's taught by feel (the toy narrates a one-line character sketch per mode — "moody but
  hopeful," "the haunted one" — not by naming the Greek modes as vocabulary to memorize first).

## Curriculum shape: the hopscotch court itself

- Court = single squares (linear, must be done in order) + wide rows (any order within the
  row) + dashed "regroup" squares (4, 8, 12, 17) where separate threads reconverge and combine.
  The regroup squares are deliberately positioned — don't add a new regroup square without
  checking it's actually a convergence point of ≥2 prior threads, or it undermines the map's
  logic for the player.
- Threads run through the court as color-coded categories (`THREAD_COLORS` in
  `src/toys/types.ts`): sound, home, moves, time, timbre, together, color, ear. The **timbre
  thread specifically runs 3 → 11 → 15** (See Your Sound → Make a Sound → Lean the Time) — a
  deliberate arc from "discover timbre exists" to "you can build one" to "you can make it
  groove." Preserve this arc if you touch those three lessons.
- **Sky / Home square = "The Band"** — 12-bar blues in A, the terminal/celebration square, not
  just "one more lesson." It's where the moody-flavored High Five over guitar frets pays off
  the open-string A-minor handoff from the key journey above.

## Deliberately rejected simplifications (don't re-propose these)

- **An LLM tutor inside the app.** Dropped early. The guidance system is scripted
  (`Guide`/`GuideStep`), not generative — see DECISIONS.md for the reasoning (predictability,
  cost, and the guided→free handoff model doesn't need it).
- **A separate up/down word vocabulary** for moves — see "move-word ladder" above.
- **Scale-degree numbers as the primary pentatonic vocabulary** — stickers (Home/Park/School/
  Farm/Woods) came first deliberately; numbers are optional/later, see ROADMAP.md.
- **"Taw" as the name for a guided intro script.** Tried, then vetoed as unfamiliar
  jargon — see NAMING.md. The concept survives; the word doesn't.
