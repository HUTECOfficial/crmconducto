import fs from "node:fs";

const rate = 44100, seconds = 20, frames = rate * seconds;
const out = Buffer.alloc(44 + frames * 4);
out.write("RIFF", 0); out.writeUInt32LE(out.length - 8, 4); out.write("WAVE", 8);
out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20);
out.writeUInt16LE(2, 22); out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 4, 28);
out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(frames * 4, 40);
const chords = [[146.83,220,293.66],[164.81,246.94,329.63],[130.81,196,261.63],[174.61,261.63,349.23]];
let seed = 24681357;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
const wave = (phase) => Math.sin(phase) + Math.sin(phase * 2) * .17;
for (let i = 0; i < frames; i++) {
  const t = i / rate, beat = t * 2, chord = chords[Math.floor(t / 2.5) % chords.length];
  let l = 0, r = 0;
  chord.forEach((hz, n) => { const s = wave(Math.PI * 2 * hz * t) * .07; l += s * (n === 0 ? .85 : .55); r += s * (n === 2 ? .85 : .55); });
  const kickPhase = beat - Math.floor(beat); if (kickPhase < .22) { const env = Math.exp(-kickPhase * 17); const k = Math.sin(Math.PI * 2 * (115 - kickPhase * 250) * kickPhase) * env * .24; l += k; r += k; }
  const step = beat * 2, stepPhase = step - Math.floor(step); if (stepPhase < .055) { const hat = noise() * Math.exp(-stepPhase * 85) * .035; l += hat; r += hat; }
  const noteIndex = Math.floor(t * 4) % 8, noteTime = t * 4 - Math.floor(t * 4), notes = [587.33,659.25,739.99,880,739.99,659.25,587.33,523.25];
  const pluck = Math.sin(Math.PI * 2 * notes[noteIndex] * t) * Math.exp(-noteTime * 7) * .09; l += pluck; r += pluck * .82;
  const fade = Math.min(1, t / .7, (seconds - t) / 1.1), gain = fade * .72;
  out.writeInt16LE(Math.max(-1, Math.min(1, l * gain)) * 32767, 44 + i * 4);
  out.writeInt16LE(Math.max(-1, Math.min(1, r * gain)) * 32767, 46 + i * 4);
}
fs.mkdirSync("public/audio", {recursive: true});
fs.writeFileSync("public/audio/agency-bed.wav", out);
