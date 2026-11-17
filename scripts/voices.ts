/**
 * Voice tool.
 *   npm run voices:list    -- <storyId>   -> checklist of lines to record (also saved as script.txt)
 *   npm run voices:process -- <storyId>   -> trims, applies each character's voice effect, normalizes,
 *                                            builds lip-sync data, updates src/generated/audio.ts
 *
 * Your recordings go in  public/voices/<storyId>/raw/   (never modified).
 * Processed files go in  public/voices/<storyId>/out/.
 * Name each file by line key (s1-b2.m4a) OR by line number (07.m4a, as shown in the checklist).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { STORIES } from "../src/stories";
import type { AudioClip, Story, VoicePreset } from "../src/engine/types";

const ROOT = process.cwd();
const VOICES = path.join(ROOT, "public", "voices");
const EXTS = [".wav", ".mp3", ".m4a", ".ogg", ".flac", ".aac", ".webm", ".opus", ".mp4"];

const PRESET: Record<VoicePreset, string> = {
  original: "",
  deep: "rubberband=pitch=0.80:formant=shifted",
  high: "rubberband=pitch=1.30:formant=shifted",
  kid: "rubberband=pitch=1.55:formant=shifted:tempo=1.06",
  old: "rubberband=pitch=0.93:formant=preserved,tremolo=f=5.5:d=0.3",
  robot: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75",
  radio: "highpass=f=400,lowpass=f=3400,acompressor=threshold=0.05:ratio=6",
  monster: "rubberband=pitch=0.62:formant=shifted,aecho=0.8:0.7:40:0.4",
};

// trim silence at both ends, light low-cut, (voice effect), loudness normalize
const trimEnds = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05";
const chain = (preset: VoicePreset) =>
  ["highpass=f=70", trimEnds, "areverse", trimEnds, "areverse", PRESET[preset], "loudnorm=I=-16:TP=-1.5:LRA=11"].filter(Boolean).join(",");

type Line = { no: number; key: string; who: string; name: string; say: string; preset: VoicePreset };
type Saved = AudioClip & { preset: VoicePreset; rawMtime: number };

const die = (msg: string): never => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

const linesOf = (story: Story): Line[] => {
  const out: Line[] = [];
  story.scenes.forEach((sc, si) =>
    sc.beats.forEach((b, bi) => {
      if (!b.say || !b.who) return;
      const def = story.characters[b.who];
      out.push({ no: out.length + 1, key: `s${si + 1}-b${bi + 1}`, who: b.who, name: def?.name ?? b.who, say: b.say, preset: def?.voice ?? "original" });
    }),
  );
  return out;
};

const findRaw = (rawDir: string, l: Line): string | undefined => {
  if (!fs.existsSync(rawDir)) return undefined;
  const files = fs.readdirSync(rawDir).filter((f) => EXTS.includes(path.extname(f).toLowerCase()));
  const pad = String(l.no).padStart(2, "0");
  const hit =
    files.find((f) => path.parse(f).name.toLowerCase() === l.key) ??
    files.find((f) => path.parse(f).name === pad || path.parse(f).name === String(l.no));
  return hit ? path.join(rawDir, hit) : undefined;
};

const ffmpeg = (args: string[]) => {
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args], { encoding: "utf8" });
  if (r.error) die("ffmpeg not found. Install it (winget install Gyan.FFmpeg) and reopen the terminal.");
  return r;
};

/** Mouth openness per video frame (0..1) from loudness. */
const analyze = (wav: string, fps: number): { frames: number; mouth: number[] } => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", wav, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], { maxBuffer: 1 << 29 });
  if (r.status !== 0) die(`could not read ${wav}`);
  const buf = Buffer.from(r.stdout);
  const total = Math.floor(buf.length / 2);
  const win = 16000 / fps;
  const frames = Math.max(1, Math.ceil(total / win));
  const db: number[] = [];
  for (let f = 0; f < frames; f++) {
    const a = Math.floor(f * win);
    const b = Math.min(total, Math.floor((f + 1) * win));
    let sum = 0;
    for (let i = a; i < b; i++) {
      const v = buf.readInt16LE(i * 2) / 32768;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, b - a));
    db.push(20 * Math.log10(Math.max(rms, 1e-5)));
  }
  const voiced = db.filter((d) => d > -50).sort((x, y) => x - y);
  const top = voiced.length ? voiced[Math.floor(voiced.length * 0.9)] : -20;
  const floor = top - 24;
  let prev = 0;
  const mouth = db.map((d) => {
    let lvl = Math.min(1, Math.max(0, (d - floor) / (top - floor)));
    if (lvl < 0.12) lvl = 0;
    lvl = Math.max(lvl, prev * 0.55); // quick open, slower close
    prev = lvl;
    return Math.round(lvl * 100) / 100;
  });
  return { frames, mouth };
};

const writeGenerated = () => {
  const all: Record<string, Record<string, AudioClip>> = {};
  if (fs.existsSync(VOICES)) {
    for (const id of fs.readdirSync(VOICES)) {
      const j = path.join(VOICES, id, "audio.json");
      if (!fs.existsSync(j)) continue;
      const saved: Record<string, Saved> = JSON.parse(fs.readFileSync(j, "utf8"));
      all[id] = Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, { file: v.file, frames: v.frames, mouth: v.mouth }]));
    }
  }
  const file = path.join(ROOT, "src", "generated", "audio.ts");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `// AUTO-GENERATED by \`npm run voices:process\`. Do not edit.\nimport { AudioMap } from "../engine/types";\n\nexport const AUDIO: Record<string, AudioMap> = ${JSON.stringify(all)};\n`,
  );
};

const [cmd, idArg] = process.argv.slice(2);
const ids = Object.keys(STORIES);
const id = idArg ?? (ids.length === 1 ? ids[0] : "");
if (!cmd || !["list", "process"].includes(cmd)) die("Use: voices:list -- <storyId>   or   voices:process -- <storyId>");
if (!STORIES[id]) die(`Unknown story "${id}". Available: ${ids.join(", ")}`);
const story = STORIES[id];
const lines = linesOf(story);
const rawDir = path.join(VOICES, id, "raw");
const outDir = path.join(VOICES, id, "out");

if (cmd === "list") {
  fs.mkdirSync(rawDir, { recursive: true });
  const text = lines.map((l) => `${String(l.no).padStart(2, "0")}  [${l.key}]  ${l.name} (${l.preset}):  ${l.say}`).join("\n");
  fs.writeFileSync(path.join(VOICES, id, "script.txt"), text + "\n");
  console.log(`\nStory "${id}": ${lines.length} lines to record\n`);
  console.log(text);
  console.log(`\nPut your recordings in: public/voices/${id}/raw/`);
  console.log(`Name each file by key (s1-b2.m4a) or by line number (07.m4a). Then run: npm run voices:process -- ${id}\n`);
} else {
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const dataFile = path.join(VOICES, id, "audio.json");
  const saved: Record<string, Saved> = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, "utf8")) : {};
  const fps = story.fps ?? 30;
  const next: Record<string, Saved> = {};
  const missing: Line[] = [];
  let done = 0;
  let reused = 0;

  for (const l of lines) {
    const raw = findRaw(rawDir, l);
    if (!raw) {
      missing.push(l);
      continue;
    }
    const mtime = Math.floor(fs.statSync(raw).mtimeMs);
    const out = path.join(outDir, `${l.key}.wav`);
    const prev = saved[l.key];
    if (prev && prev.preset === l.preset && prev.rawMtime === mtime && fs.existsSync(out)) {
      next[l.key] = prev;
      reused++;
      continue;
    }
    const r = ffmpeg(["-i", raw, "-vn", "-af", chain(l.preset), "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", out]);
    if (r.status !== 0 || !fs.existsSync(out)) {
      console.error(`✗ ${l.key} (${path.basename(raw)}): ${r.stderr?.trim() || "ffmpeg failed"}`);
      continue;
    }
    const { frames, mouth } = analyze(out, fps);
    next[l.key] = { file: `voices/${id}/out/${l.key}.wav`, frames, mouth, preset: l.preset, rawMtime: mtime };
    console.log(`✓ ${l.key}  ${l.name.padEnd(8)} ${l.preset.padEnd(8)} ${(frames / fps).toFixed(1)}s  ← ${path.basename(raw)}`);
    done++;
  }

  fs.writeFileSync(dataFile, JSON.stringify(next));
  writeGenerated();
  console.log(`\nProcessed ${done}, unchanged ${reused}, missing ${missing.length} (of ${lines.length} lines).`);
  if (missing.length) {
    console.log("Missing recordings (these lines use text-based timing and placeholder lip-sync until recorded):");
    missing.forEach((l) => console.log(`  ${String(l.no).padStart(2, "0")} [${l.key}] ${l.name}: ${l.say}`));
  }
  console.log("");
}