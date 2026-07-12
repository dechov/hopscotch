# Naming

Small file, high blast radius if a fresh session ignores it — several of these names were
chosen *after* trying and rejecting something else, and the rejected names are individually
plausible-sounding, so it's easy for a new session to innocently suggest reverting to one.

## Current, final names

| Concept | Name | Notes |
|---|---|---|
| An interactive component | **toy** | `<Toy id="..."/>`. Never "widget" in code, comments, docs, or UI copy. |
| The free-play gallery of all toys | **the toybox** | dev gallery too — a toy isn't done until it behaves correctly here. Route `/shed` and `Shed.tsx` stay internally (same convention as `/daw`). |
| The piece-builder / mini sequencer with checkpoints & branching | **the sketchbook** | route `/daw` internally (file/route name unchanged; user-facing label is "the sketchbook"). |
| A guided intro script for a toy | **guide** (type `Guide`, hook `useGuide`) | See rejected: "taw." |
| The lesson map | **the court** | hopscotch court metaphor; squares, rows, "regroup" squares. |
| The ear-training subsystem/mode | **Earshot** | also the id of the specific echo/name-the-move toy. |
| The pentatonic scale | **the five-tone scale** | plain ELI5 name; "pentatonic" stays as the grown-up gloss. Internal ids `high-five` (lesson), `five-major`/`five-minor` (scales) unchanged. |
| The diatonic scale | **the seven-tone scale** | same pattern; internal ids `rainbow` (lesson/scale key) unchanged. |
| Sticker names for five-tone degrees | **Home, Park, School, Farm, Woods** | not "1st degree, 2nd degree" etc. — see PEDAGOGY.md. |

## Rejected names (don't reintroduce without a real reason)

- **"Widget"** — rejected as the term for interactive components in favor of "toy." "Toy" was
  chosen specifically because it captures the guided→free model in one word (you're handed a
  toy, shown a trick, then you play) and reads well in kid-facing contexts without sounding
  babyish to adults ("what a fun toy" is a thing adults say about synths).
- **"Taw"** — the hopscotch term for the stone you toss first — was proposed as the name for a
  guided-intro script. **Explicitly vetoed by the project owner as an unfamiliar word** ("I've
  never heard of that word"). The concept (a scripted intro that locks dials, narrates steps,
  then hands off to free play) is fully intact and used throughout — it's just called a
  **guide** now. Do not reintroduce "taw" anywhere, including as internal-only naming; keep
  internal and user-facing vocabulary consistent so docs and code don't drift.
- **"Garage"** — was the name for the piece-builder page before "the treehouse." Rejected for
  being too close to Apple's GarageBand (a real, well-known competing/adjacent product name).
  If a future session considers other names, avoid anything that
  reads as a existing DAW/music-software brand.
- **"The treehouse"** — the piece-builder's name after "Garage," superseded by **"the
  sketchbook"** at the owner's request when the log-pitch canvas landed: he wanted a name that
  evokes studio/canvas/editor and is "consistent with presenting everything in a nice, visual
  (almost tactile) way." Sketchbook also explains the git features (checkpoints = kept
  sketches, branching = tear out a page and redraw). Internal route stays `/daw`, file stays
  `Daw.tsx`.
- **"The Shed"** — the free-play gallery's name, superseded by **"the toybox"** (owner's
  suggestion): it's literally the box the toys live in, keeping the toy metaphor tight now
  that the backyard-structures family (court/shed/treehouse) dissolved with the sketchbook
  rename. Internal route stays `/shed`, file stays `Shed.tsx`.
- **"The High Five" and "the Rainbow"** — the original kid-names for the pentatonic and
  diatonic scales, superseded by **"the five-tone scale"** and **"the seven-tone scale"**.
  The owner didn't love either name (nor alternatives like "Star" or "Neighborhood") and
  chose plain descriptive terms as part of a general ELI5-naming preference: say what the
  thing is in ordinary words ("five-tone scale"), keep the jargon ("pentatonic," "diatonic")
  as a parenthetical grown-up gloss, and save the whimsy for genuinely new concepts (moves,
  stickers, the wobble). Don't reintroduce cute proper-noun scale names. Internal ids
  (`high-five`, `rainbow`, `five-major`, `five-minor`, dial value `"five"`) are unchanged so
  saved progress and pieces keep working.
- **"Stations"** — considered as a runner-up to "toy" (heritage from an earlier "Sound Lab"
  prototype with physical stations). Not used, but noted as the fallback if "toy" ever stops
  fitting the tone as the app grows.
- **"Clubhouse" / "fort"** — considered as alternate names for the treehouse if it didn't land.
  Not needed; treehouse was accepted.

## If you're a fresh Claude Code session and want to rename something

Check this file first. If the name you're about to introduce or change appears in the
"rejected" list above, don't — even if it seems like a good idea in isolation, it's already
been tried and specifically turned down. If you do rename something new (not on either list),
update this file in the same change so the next session doesn't relitigate it.
