# Naming

Small file, high blast radius if a fresh session ignores it — several of these names were
chosen *after* trying and rejecting something else, and the rejected names are individually
plausible-sounding, so it's easy for a new session to innocently suggest reverting to one.

## Current, final names

| Concept | Name | Notes |
|---|---|---|
| An interactive component | **toy** | `<Toy id="..."/>`. Never "widget" in code, comments, docs, or UI copy. |
| The free-play gallery of all toys | **the Shed** | dev gallery too — a toy isn't done until it behaves correctly here. |
| The piece-builder / mini sequencer with checkpoints & branching | **the treehouse** | route `/daw` internally (file/route name unchanged; user-facing label is "the treehouse"). |
| A guided intro script for a toy | **guide** (type `Guide`, hook `useGuide`) | See rejected: "taw." |
| The lesson map | **the court** | hopscotch court metaphor; squares, rows, "regroup" squares. |
| The ear-training subsystem/mode | **Earshot** | also the id of the specific echo/name-the-move toy. |
| Sticker names for pentatonic degrees | **Home, Park, School, Farm, Woods** | not "1st degree, 2nd degree" etc. — see PEDAGOGY.md. |

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
  Renamed to "the treehouse." If a future session considers other names, avoid anything that
  reads as a existing DAW/music-software brand.
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
