import type { ToyDef } from "./types";
import { def as waveBuilder } from "./waveBuilder";
import { def as twoTone } from "./twoTone";
import { def as wobbleScope } from "./wobbleScope";
import { def as bendMeter } from "./bendMeter";
import { def as tuneIt } from "./tuneIt";
import { def as spectrumScope } from "./spectrumScope";
import { def as dronePad } from "./dronePad";
import { def as homeFinder } from "./homeFinder";
import { def as chordBed } from "./chordBed";
import { def as magicNote } from "./magicNote";
import { def as moveLadder } from "./moveLadder";
import { def as chantBoard } from "./chantBoard";
import { def as pulseGrid } from "./pulseGrid";
import { def as toneForge } from "./toneForge";
import { def as echoTrainer } from "./echoTrainer";
import { def as ratioZoo } from "./ratioZoo";
import { def as keysVsPure } from "./keysVsPure";
import { def as scaleLab } from "./scaleLab";
import { def as speedTrick } from "./speedTrick";
import { def as slowRatios } from "./slowRatios";
import { def as pluckString } from "./pluckString";
import { def as necklace } from "./necklace";
import { def as theDrift } from "./theDrift";
import { def as toneRuler } from "./toneRuler";
import { def as sameNote } from "./sameNote";
import { def as ratioMap } from "./ratioMap";
import { def as songPassport } from "./songPassport";
import { def as wobbleStripes } from "./wobbleStripes";

const all: ToyDef[] = [
  waveBuilder, twoTone, wobbleScope, bendMeter, tuneIt, spectrumScope,
  dronePad, homeFinder, chordBed, magicNote, moveLadder, chantBoard,
  pulseGrid, toneForge, echoTrainer, ratioZoo, keysVsPure, scaleLab,
  speedTrick, slowRatios, pluckString, necklace, theDrift, toneRuler,
  sameNote, ratioMap, songPassport, wobbleStripes,
];

export const registry: Record<string, ToyDef> = Object.fromEntries(all.map(d => [d.id, d]));
