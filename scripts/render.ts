import path from "node:path";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

// Usage: npm run render -- <story> <format>
//   story:  story id (e.g. demo)  |  showcase  |  actions
//   format: landscape | vertical | both   (default: both)
// Output: out/<story>-landscape.mp4 and out/<story>-vertical.mp4
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "out");

type Job = { compId: string; file: string; w: number; h: number };

const [nameArg = "demo", fmtArg = "both"] = process.argv.slice(2);
const name = nameArg.toLowerCase();
const fmt = fmtArg.toLowerCase();

if (!["landscape", "vertical", "both"].includes(fmt)) {
  console.error(`Unknown format "${fmtArg}". Use: landscape | vertical | both`);
  process.exit(1);
}

const jobs: Job[] = [];
if (name === "showcase" || name === "actions") {
  const id = name === "showcase" ? "Showcase" : "Actions";
  jobs.push({ compId: id, file: `${id}.mp4`, w: 1280, h: 720 });
} else {
  if (fmt !== "vertical") jobs.push({ compId: `story-${name}`, file: `${name}-landscape.mp4`, w: 1920, h: 1080 });
  if (fmt !== "landscape") jobs.push({ compId: `story-${name}-vertical`, file: `${name}-vertical.mp4`, w: 1080, h: 1920 });
}

/** Check the finished file with ffprobe (skipped if ffprobe is not installed). */
const verify = (file: string, job: Job, fps: number) => {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type,codec_name,pix_fmt,width,height,r_frame_rate,duration", "-of", "json", file],
    { encoding: "utf8" },
  );
  if (r.error || r.status !== 0) {
    console.log("  (ffprobe not found - skipped file checks. Open the MP4 and check it by eye.)");
    return;
  }
  const streams = JSON.parse(r.stdout).streams as Record<string, string>[];
  const v = streams.find((s) => s.codec_type === "video");
  const a = streams.find((s) => s.codec_type === "audio");
  const checks: [string, boolean][] = [
    ["codec h264", v?.codec_name === "h264"],
    [`pixel format yuv420p (got ${v?.pix_fmt})`, v?.pix_fmt === "yuv420p"], // >>> CHANGED
    [`size ${job.w}x${job.h}`, Number(v?.width) === job.w && Number(v?.height) === job.h],
    [`fps ${fps}`, v?.r_frame_rate === `${fps}/1`],
  ];
  for (const [label, ok] of checks) console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  // >>> CHANGED: no audio is normal until voices are added
  console.log(a ? "  ✓ audio track" : "  - no audio track (normal until voices are added)");
};

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Bundling...");
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src", "index.ts") });

  for (const job of jobs) {
    const composition = await selectComposition({ serveUrl, id: job.compId });
    const outputLocation = path.join(OUT_DIR, job.file);
    console.log(`Rendering ${job.compId} -> ${outputLocation}`);
    let last = -1;
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      pixelFormat: "yuv420p",
      imageFormat: "png", // >>> CHANGED (avoids yuvj420p washed-out colors from JPEG frames)
      outputLocation,
      onProgress: ({ progress }) => {
        const pct = Math.floor(progress * 100);
        if (pct !== last && pct % 10 === 0) {
          last = pct;
          console.log(`  ${pct}%`);
        }
      },
    });
    console.log(`Done: ${outputLocation}`);
    verify(outputLocation, job, composition.fps);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});