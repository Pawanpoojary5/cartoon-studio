import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Stickman } from "../characters/Stickman";
import { Background, Chair, GROUND, H, W } from "./backgrounds";
import { AUDIO_LEAD, SceneTL, Timeline, buildTimeline, cameraView, resolveChar } from "./timeline";
import { AudioMap, Story } from "./types";

export type StoryProps = { story: Story; audio?: AudioMap };

export const findScene = (tl: Timeline, frame: number): SceneTL =>
  tl.scenes.find((s) => frame >= s.start && frame < s.start + s.len) ?? tl.scenes[tl.scenes.length - 1];

/** Pure SVG for one frame (no Remotion hooks, so it can be tested outside Remotion). */
export type View = { x: number; y: number; w: number; h: number };
const FULL: View = { x: 0, y: 0, w: W, h: H };

/** Which part of the stage is visible. Landscape = whole stage. Vertical = window that keeps everyone in view. */
export const viewFor = (sc: SceneTL, f: number, width: number, height: number): View => {
  if (height <= width) return FULL;
  const { cx, w } = cameraView(sc, f);
  const h = (w * height) / width;
  return { x: cx - w / 2, y: GROUND - 0.62 * h, w, h };
};

export const SceneSvg: React.FC<{ story: Story; sc: SceneTL; frame: number; view?: View; size?: { w: number; h: number } }> = ({
  story, sc, frame, view = FULL, size = { w: W, h: H },
}) => {
  const f = frame - sc.start;
  return (
    <svg width={size.w} height={size.h} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}>
      <Background name={sc.scene.background} />
      <line x1={-200} y1={GROUND} x2={W + 200} y2={GROUND} stroke="#111" strokeWidth={6} />
      {sc.chairs.map((c, i) => (
        <Chair key={i} x={c.x} facing={c.facing} />
      ))}
      {Object.keys(sc.scene.cast).map((id, i) => {
        const def = story.characters[id];
        const c = resolveChar(sc, f, id, frame);
        return (
          <Stickman
            key={id}
            x={c.x}
            groundY={GROUND}
            pose={c.pose}
            expression={c.expression}
            mouthOpen={c.mouth}
            blink={(frame + i * 37) % 100 < 4 ? 1 : 0}
            facing={c.facing}
            scale={def.scale ?? 1}
            shirt={def.shirt}
            hair={def.hair}
          />
        );
      })}
    </svg>
  );
};

export const captionAt = (sc: SceneTL, f: number): string | undefined =>
  sc.beats.find((b) => f >= b.start && f < b.start + b.len)?.say;

export const StoryVideo: React.FC<StoryProps> = ({ story, audio }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const tl = useMemo(() => buildTimeline(story, audio ?? {}), [story, audio]);
  const sc = findScene(tl, frame);
  const caption = captionAt(sc, frame - sc.start);
  return (
    <AbsoluteFill>
      <SceneSvg story={story} sc={sc} frame={frame} view={viewFor(sc, frame - sc.start, width, height)} size={{ w: width, h: height }} />
      {tl.scenes.flatMap((s, si) =>
        s.beats.map((b, bi) =>
          b.clip ? (
            <Sequence key={`${si}-${bi}`} from={s.start + b.start + AUDIO_LEAD} durationInFrames={b.clip.frames + 2} layout="none">
              <Audio src={staticFile(b.clip.file)} />
            </Sequence>
          ) : null,
        ),
      )}
      {caption ? (
        <div
          style={{
            position: "absolute",
            left: vertical ? 60 : 120,
            right: vertical ? 60 : 120,
            bottom: vertical ? 320 : 28,
            padding: "10px 26px",
            textAlign: "center",
            fontSize: vertical ? 60 : 56,
            lineHeight: 1.25,
            fontWeight: 700,
            color: "#fff",
            background: "rgba(0,0,0,0.65)",
            borderRadius: 12,
            fontFamily: '"Noto Sans Kannada","Nirmala UI","Segoe UI",sans-serif',
          }}
        >
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};