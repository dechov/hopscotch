export const NAMES = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
export const midiName = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
export const centsBetween = (f1: number, f2: number) => 1200 * Math.log2(f2 / f1);
export function inScale(midi: number, homeMidi: number, pcs: number[]) {
  return pcs.includes((((midi - homeMidi) % 12) + 12) % 12);
}
export function degreeOf(midi: number, homeMidi: number, pcs: number[]) {
  const pc = (((midi - homeMidi) % 12) + 12) % 12;
  return pcs.indexOf(pc);
}
