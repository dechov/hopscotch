import Listen, { meta as m1 } from "./listen.mdx";
import RestOrLean, { meta as m2 } from "./rest-or-lean.mdx";
import SeeYourSound, { meta as m3 } from "./see-your-sound.mdx";
import LockIn, { meta as m4 } from "./lock-in.mdx";
import Home, { meta as m5 } from "./home.mdx";
import HighFive, { meta as m6 } from "./high-five.mdx";
import Flavor, { meta as m7 } from "./flavor.mdx";
import Pegs, { meta as m8 } from "./turn-the-pegs.mdx";
import Ladder, { meta as m9 } from "./the-ladder.mdx";
import Pulse, { meta as m10 } from "./pulse.mdx";
import MakeASound, { meta as m11 } from "./make-a-sound.mdx";
import Chant, { meta as m12 } from "./chant.mdx";
import Earshot, { meta as m13 } from "./earshot.mdx";
import ChangingGround, { meta as m14 } from "./changing-ground.mdx";
import Knobs, { meta as m15 } from "./knobs.mdx";
import Rainbow, { meta as m16 } from "./rainbow.mdx";
import PutItTogether, { meta as m17 } from "./put-it-together.mdx";
import TheBand, { meta as mb } from "./the-band.mdx";
import type { ComponentType } from "react";

export const LESSONS: Record<string, { Component: ComponentType<any>; meta: any }> = {
  [m1.id]: { Component: Listen, meta: m1 },
  [m2.id]: { Component: RestOrLean, meta: m2 },
  [m3.id]: { Component: SeeYourSound, meta: m3 },
  [m4.id]: { Component: LockIn, meta: m4 },
  [m5.id]: { Component: Home, meta: m5 },
  [m6.id]: { Component: HighFive, meta: m6 },
  [m7.id]: { Component: Flavor, meta: m7 },
  [m8.id]: { Component: Pegs, meta: m8 },
  [m9.id]: { Component: Ladder, meta: m9 },
  [m10.id]: { Component: Pulse, meta: m10 },
  [m11.id]: { Component: MakeASound, meta: m11 },
  [m12.id]: { Component: Chant, meta: m12 },
  [m13.id]: { Component: Earshot, meta: m13 },
  [m14.id]: { Component: ChangingGround, meta: m14 },
  [m15.id]: { Component: Knobs, meta: m15 },
  [m16.id]: { Component: Rainbow, meta: m16 },
  [m17.id]: { Component: PutItTogether, meta: m17 },
  [mb.id]: { Component: TheBand, meta: mb },
};
