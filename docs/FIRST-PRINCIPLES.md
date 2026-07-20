# First-principles notes — rhythm→pitch, scale derivation, the lattice, melody vs. harmony

Paul's design notes from 2026-07 (jotted after a long drive), organized and annotated by
Claude Code in the same session that implemented the first slice of them. Each section says
what it is, answers the factual questions Paul embedded in the notes, and carries a status:
**built** · **designed** (spec'd here, not built) · **content-to-source** (needs media/curation,
not code).

Reference used throughout: Paul Erlich, *A Middle Path Between Just Intonation and the Equal
Temperaments* (Xenharmonikôn 18; the 12/28/15-corrected PDF). Not committed to the repo
(copyright) — key facts needed by the toys are restated here.

---

## 1. Where pitch comes from: rhythm and pitch are one thing (status: mostly built already + content-to-source)

The core claim — a tone is just "how many times per second something happens," and there is
no fundamental difference between rhythm and harmony — is **already the app's thesis #5**
(PEDAGOGY.md "rest, root, and lean," Speed Trick + Ratios in Slow Motion). These notes extend
it with better anchors to the physical world:

- **Animal wingbeats** (content-to-source: find/license video, ideally slow-motion):
  a bumblebee's buzz IS its wingbeat rate (~130–240 beats/sec → a low buzz around
  G♯2–A♯3); a mosquito's whine is higher because its wings beat faster (~400–600/sec);
  a hummingbird hums lower (~40–80/sec, right at the rhythm/pitch boundary — the perfect
  demo animal because it sits *in the flutter zone*). Same phenomenon, three speeds.
- **The car engine**: pitch tracks RPM directly. A 4-cylinder four-stroke fires twice per
  revolution, so 3000 RPM ≈ 100 firings/sec ≈ a 100 Hz drone (~G2). Every driver already
  has this ear-training; we just need to name it. (Content-to-source for video; the
  **landmark buttons on Speed Trick** — built — cover the interactive version.)
- **The low piano keys are astonishingly slow**: A0 = 27.5 Hz, the bass guitar's low
  E1 = 41.2 Hz. These are countable-ish speeds — barely faster than a drum roll — and we
  already hear them as *notes*. Built as Speed Trick landmarks.
- **Film frame rate**: ~24 images/sec already reads as smooth motion — the eye's version of
  the same threshold the ear crosses at ~20–45 Hz. Built as a Speed Trick landmark.
- **BPM ↔ Hz**: one honest unit conversion (÷60) connects the metronome to the tuner.
  Built: Speed Trick now shows per-minute and per-second in every zone, not just the
  rhythm zone.
- **The inner ear**: the basilar membrane in the cochlea is a physical log-frequency ruler —
  different positions resonate at different frequencies (place coding), while slow rates are
  tracked as individual events (rate coding). The handoff between those two mechanisms *is*
  the flutter zone the Speed Trick sweeps through. (Lesson-copy material, not a toy.)
- **Vocal folds — Paul asked whether they really vibrate at the pitch we hear: yes.**
  In normal (modal) phonation the folds open and close once per cycle of the perceived
  fundamental — singing A440 means the folds are colliding 440 times per second. (Falsetto
  and vocal-fry change the vibration mode but the rate still matches the fundamental.)
  Safe to incorporate.
- **Rhythm harmonics — Paul's hypothesis: overlaid rhythms (triplets etc.) work like
  harmonics/consonance; is that wrong? It is not wrong — it's exactly right, and the app
  already stakes this claim**: Ratios in Slow Motion demonstrates that a 3:2 polyrhythm and
  a 3:2 musical leap are the same ratio at different speeds. The generalization worth
  teaching: subdivisions of a beat are the beat's *harmonic series* (2× = eighth notes,
  3× = triplets…), and two simultaneous subdivision streams are consonant exactly when their
  ratio is simple — a 3-against-2 gallop is a "perfect fifth of rhythm," 7-against-5 is as
  crunchy as the interval 7:5. A future Pulse Grid upgrade (multiple simultaneous
  subdivision rates) could make this playable. (Designed, not built.)
- **Moiré patterns** (Paul's analogy): two grids of slightly different spacing overlaid
  produce a big slow pattern — that *is* beating, in space instead of time. The wobble
  (beat frequency = difference of two close frequencies) is a temporal moiré. A visual toy
  overlaying two adjustable stripe patterns next to two detuned tones would make the analogy
  literal. (Designed, not built — natural companion to Wobble Scope.)

## 2. The Same-Note Game: deriving scales from first principles (status: BUILT as the `same-note` toy)

Paul's choose-your-own-adventure: start from a single tone and derive every classic scale by
repeatedly answering one question — **"is that the same note, or a new one?"** The deep lesson:
every tuning system is a record of where somebody decided two nearly-equal pitches were "close
enough," and tempering is the act of smoothing over that decision so the cycle closes.

The decision tree, with the real numbers (all from stacking pure fifths, 3:2 = 701.955¢,
folding by octaves):

1. **Unison.** One tone. Call it A.
2. **The octave (2:1).** Same note or different?
   - *Different* → names never repeat; the audible range needs ~10 octaves × per-note names
     and no pattern ever recurs. (The game narrates this consequence and lets you fold later —
     nearly every musical culture folds at 2:1, which is why the toy calls the octave "the
     fold.")
   - *Same* → every ×2/÷2 shares a name. Pitch becomes a circle (pitch class); proceed.
3. **The fifth (3:2).** Same or different?
   - *Same* → then any note reachable by 2s and 3s is "A" — the whole 3-limit collapses to a
     single name; you've chosen drone music. (Narrated dead-end with a reconsider button.)
   - *Different* → name it B. Keep stacking fifths, folding each into the octave.
4. **Two notes** in the chain: the next candidate lands 203.9¢ (9:8) from A. Same?
   - *Same* → 9:8 is your comma; you have a 2-note system. Tempering it evenly = **2-EDO**
     (600¢ steps — hear how badly the pure 702¢ fifth gets bent to 600¢).
   - *Different* → continue stacking.
5. **Five notes** (the chain A→B→C→D→E): the 6th candidate lands only **90.2¢** (the
   **limma**, 256:243) from an existing note — the first time a candidate arrives *inside*
   the gaps rather than splitting them evenly. Same?
   - *Same* → the five-tone scale closes. Tempered evenly = **5-EDO** (fifth becomes 720¢).
   - *Different* → continue.
6. **Seven notes**: the 8th candidate lands *between* two existing notes — **113.7¢** (the
   **apotome**, 2187:2048) above one and **90.2¢** (the limma) below the other. Same as its
   nearest neighbor?
   - *Same* → the seven-tone scale closes (≈ **7-EDO**, fifth 685.7¢). **Paul asked what this
     comma is called**: the two "semitone-sized misses" in the fifths chain are the **limma**
     (diatonic semitone, 256:243, 90.2¢) and the **apotome** (chromatic semitone, 2187:2048,
     113.7¢); their *difference* is the Pythagorean comma (23.5¢). So the 7-note closure
     doesn't have a cute comma name of its own — you're deciding that an apotome is
     negligible.
   - *Different* → continue.
7. **Twelve notes**: the 13th candidate lands **23.46¢** from the starting note — the
   **Pythagorean comma** (531441:524288, vector [-19 12> in Erlich's notation: 12 fifths up,
   19 octaves down). Same?
   - *Same* → the familiar 12 closes; tempered evenly = **12-EDO**, and the fifth only bends
     701.955→700¢ — two cents! This is why 12 won.
   - *Different* → keep going: the chain's next natural stopping points (where a candidate
     lands closer than ever before) are **17, 29, 41, 53** — the continued-fraction
     convergents of the fifth. 53 closes to within 3.6¢ ("Mercator's comma") and was
     seriously proposed historically. 19- and 31-tone systems are also popular but come from
     tempering the *meantone* fifth rather than the pure one (Erlich's paper is the map of
     that territory). The game steps through these with context notes.

**Design notes for the built toy:**
- The engine is generic: stack fifths, fold, measure the gap to the nearest existing note,
  and *ask* at the classic decision counts (2, 5, 7, 12, then the convergents) rather than
  at every step — answering 50 identical questions is not a game.
- At every closure the toy offers: **hear the crack** (the two nearly-equal notes together,
  beating), and **smooth it out** (the tempered n-EDO scale + the pure vs. tempered fifth
  side by side) — tempering as the price of modulation, made audible.
- Notes are named A, B, C… **in the order they were added** (deliberately NOT letter names —
  the historical letters would smuggle in the answer).
- **Primary/secondary notes, generalized** (Paul's white-keys/black-keys question): this is
  exactly the **MOS (moment-of-symmetry) scale series** from Erlich's paper — each closure's
  scale splits into "the previous closure's notes" (primary/white) and "the new arrivals"
  (secondary/black): 7 = 5+2, 12 = 7+5, 17 = 12+5, 53 = 41+12… The toy colors each note by
  the closure generation it arrived in, which generalizes white/black keys to every system
  automatically.
- **The missing-square illusion** (Curry's paradox — the rearranged triangle with a cell
  left over) as the visual primer for "small discrepancies can hide in plain sight until they
  accumulate": good lesson-opener material when this toy gets a lesson square.
  (Content-to-source: build or draw the illusion; not in the toy itself.)
- **History (to verify before putting in lesson copy)**: heptatonic diatonic tuning by a
  cycle of fifths predates Pythagoras by over a millennium — Old Babylonian tablets
  (~1800 BCE, e.g. CBS 10996 / UET VII 74) describe seven named diatonic tunings and a
  retuning cycle. The seven letter names of Western notation come much later (Greek
  two-octave system → Boethius → medieval A–G). "Pre-Pythagoras" is right in spirit.
- Prior art (Paul asked): nothing known to us does the *derivation-as-game*. Adjacent:
  Wilson's horagrams and the Erlich paper (the math, not a game), Duffin's and Isacoff's
  temperament histories (narrative, not interactive), and various web "EDO explorers"
  (parameter browsers, no decision tree). The choose-your-own-adventure framing appears
  genuinely novel.

## 3. The Ratio Map: a playable JI lattice with visible commas (status: BUILT as the `ratio-map` toy)

From the Erlich paper: JI is a lattice — one axis per prime. The built toy is the 5-limit
lattice exactly as Erlich draws it (fifths run horizontally, pure-third rungs run diagonally
up; octaves fold away), each node a playable pitch labeled with its ratio and cents.

- **Comma walks** (Paul: "show and hear paths from one note to another"): preset animated
  paths that step node-by-node with sound, then land on two nodes a comma apart and play
  them together so you hear the crack:
  - **Syntonic comma** 81:80 = 21.5¢, vector [-4 4 -1>: four fifths up vs. one pure third —
    the very pump The Drift runs.
  - **Pythagorean comma** 531441:524288 = 23.5¢, [-19 12>: twelve fifths vs. seven octaves.
- Hexagonal-grid instruments exist (Wilson/Terpstra/Lumatone layouts; harmonic-table MIDI
  controllers) — the Ratio Map uses the same offset geometry, which is why triads form
  compact triangles on it.
- Future (designed, not built): a "temper" control that visibly *rolls up* the lattice when a
  comma is tempered out (Erlich: tempering reduces the lattice's dimensionality — meantone
  turns the 3-D 5-limit lattice into a 2-D strip). This would be the bridge from this toy to
  the Same-Note Game and The Drift.

## 4. Melody = continuity, harmony = multiplication (status: captured; assessment below)

Paul's epiphany, restated: the traditional "melody = sequential, harmony = simultaneous"
split fails — partly because tones persist in perception after they stop sounding. Better:
**melody lives on the continuity axis** (small motions in log-frequency; don't stray too far
too fast) while **harmony lives on the multiplication axis** (simple frequency ratios,
regardless of when the notes sound). Notes serve both at once, the way a word serves syntax
and semantics at once.

**Assessment (Paul asked "tell me if this sounds wrong"): it is not wrong — it aligns with
real perception research.** Melodic streaming (auditory scene analysis, Bregman) depends on
proximity in time and log-frequency — large leaps literally break a melody into two perceived
streams, which is how compound melody works. Harmonic relatedness tracks simple ratios /
periodicity and survives temporal separation (arpeggios are heard as chords; implied harmony
works). Two refinements worth keeping:
- **Voice leading is the craft of serving both axes at once** — moving between harmonies
  (multiplication) by the smallest melodic steps (continuity). It deserves explicit mention
  in any lesson built from this.
- The towel analogy: **folding** is the better half — folding the log-frequency line at every
  octave is literally how pitch-class arises (and it's the "fold" step of the Same-Note
  Game); the ROADMAP's "pitch spiral" idea is this fold drawn as a helix. "Rolling" doesn't
  map to anything as cleanly; suggest dropping that half.
- The app's existing hooks: the **Tone Ruler in free-glide is already the virtual theremin**
  (continuity made playable); the **Ratio Map is its dual** (multiplication made playable,
  with continuity nearly absent); the Necklace holds the circle-of-fifths view. A lesson
  could literally be: play a melody on the Tone Ruler, play a chord path on the Ratio Map,
  then find both inside one piece in the sketchbook.
- **Flight of the Bumblebee callback** (content-to-source + future chant data): the melody
  sounds random but hovers chromatically around anchor tones — continuity pushed to its
  limit while harmony barely moves. Ties square 10's bee back in. Transcribing a phrase into
  the sketchbook is a fun future task, not blocking anything.

## 5. Arithmetic ("equal Hz") temperament (status: BUILT as a Tone Ruler snap mode)

Paul: what if steps were a fixed number of Hz apart instead of a fixed ratio — "octaves as
harmonics"? **Does it make sense? Yes — it's the harmonic series itself.** Equal-Hz spacing
from a fundamental f is exactly the helper ladder f, 2f, 3f…: the "octave" only appears
between harmonics k and 2k, intervals shrink as you climb (12:13 is crunchy where 2:3 was
sweet), and on a log ruler the ticks crowd together going up — which is precisely the
lesson: *equal Hz ≠ equal musical distance*. Built as the Tone Ruler's "helper ladder" snap
(ticks at k × Home/8, labeled by harmonic number, visibly bunching rightward). It belongs
exactly where it landed: next to the wave-builder's helpers and the ruler's log axis.

## 5b. Temperament as quantization (Paul's later note; status: captured + one line of copy)

Paul's framing: limiting music to discrete equal-tempered notes is a loss of richness
fundamentally similar to discretization / quantization / digitization — even auto-tune.
**Does it make sense? Yes — with one refinement worth keeping.** The mapping is real:
equal temperament quantizes the pitch continuum to a uniform grid exactly the way an ADC
quantizes voltage; auto-tune literally IS pitch quantization (and the sketchbook's canvas
snap is a hand-operated auto-tune — that's now said in its copy); DAW rhythm-quantize is the
same operation in time, which closes the loop with the app's rhythm-is-pitch thesis. What
quantization discards is exactly what the app celebrates as "the in-between": blue notes,
bends, vibrato, the pure ratios between frets. The refinement: unlike audio digitization,
where a finer grid is strictly higher fidelity, temperament's grid is not merely lossy —
the loss *buys* something (closure, modulation, interchangeable keys), and there is no
single "original signal" being approximated (JI is a lattice of ideals, not a master tape).
So the honest one-liner for lesson copy is: **"snapping is auto-tune: it tidies, it costs,
and choosing when to snap is a musical decision, not a technical one."** Best homes when a
lesson wants it: the sketchbook canvas (built), the Tone Ruler's snap dial, and any future
recording/mic feature (where real auto-tune could be demonstrated on the learner's own
voice — content idea, not designed).

## 6. Resonance in pipes and glasses (status: parked, low priority per Paul)

How a resonant frequency emerges from an air column or a wine glass (standing waves; length
sets pitch). Natural home when it happens: the timbre thread, next to Pluck the String
(which already does the string version — touch-harmonics are standing-wave nodes). Not
designed further yet.

---

## Implementation record (this session)

- **`same-note`** toy (color thread) — the Same-Note Game, §2. Toybox-only for now.
- **`ratio-map`** toy (sound thread) — the playable 5-limit lattice with comma walks, §3.
  Toybox-only for now.
- **Tone Ruler**: new "helper ladder (equal Hz steps)" snap mode, §5.
- **Speed Trick**: per-minute AND per-second shown in every zone; landmark buttons
  (film 24/s · piano's lowest A 27.5 · bass E1 41.2 · engine ~100 · bumblebee ~200 ·
  A440), §1.
- This file; TOY_CATALOG/ROADMAP updated.

Second pass (same branch, after the "keystone" go-ahead):
- **Tuning worlds** — `src/audio/tuning.ts` + DECISIONS.md §10a: the shared object, curated
  built-ins (incl. porcupine and pajara from the Erlich paper, both as 22-EDO subsets), saved
  worlds from the game.
- **Same-Note game hands off its result**: "keep this world" at any closure → playable pad
  row in place + appears in the sketchbook's world picker.
- **Sketchbook**: per-piece world (snapshotted in the doc), world snapping on the canvas,
  MOS small-step shading (generalized black keys), étude prompts (crack / continuity / drift).
- **Song Passport** toy (§ "song passport" idea): Old MacDonald stored as chain-of-fifths
  moves, rendered in 8 worlds via each world's best fifth.
- **Wobble Stripes** toy: the Moiré analogy, built (§1).
- **Pulse Grid**: rhythm-harmonic extra stream (3- or 5-against-2), §1.
- **Ratio Map**: "roll it up" temper slider — lattice collapses onto the meantone chain,
  comma walks land silent at full temper (§3's designed item, built).
- **Toybox**: "start here — the big surprises" featured shelf + thread-grouped shelves.
- The Band lesson: blue-zone paragraph — the microtonal door via feel (§ blue notes).

Third pass (FFT / digitization / voice):
- **Sound Picture** (`sound-picture`): live spectrogram on the log ruler (Tone.UserMedia +
  Analyser fft, scrolling canvas, pitchy voice trace, freeze).
- **Sound Is Numbers** (`sound-numbers`): the digitization toy from §5b — sample dots on a
  time grid with a Nyquist alias overlay, loudness grid audible via Tone.BitCrusher.
- **Your Voice on the Ruler** (`voice-ruler`): pitchy trace of the singer's own voice on the
  12-band ruler with an auto-tune comparison trace — §5b's "auto-tune on your own voice,"
  visual version (audible retuning would need pitch-shifting; future).
  Mic toys use the established `exclusive` pattern from See Your Sound.

Deliberate exceptions to note: the Same-Note Game keeps its branching *inside the toy*
(normally pedagogy lives in guides — DECISIONS.md §3/§4). The branching decision tree IS the
toy's mechanism, not a lesson script layered on it; a future lesson can still wrap it with a
guide for the intro. If a second toy ever needs real branching, revisit upgrading the guide
runner instead (DECISIONS.md §4).
