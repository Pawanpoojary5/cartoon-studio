import { AbsoluteFill, CalculateMetadataFunction, Composition, useCurrentFrame } from "remotion";
import { Expression, Pose, Stickman } from "./characters/Stickman";
import {
  FALL_DX, FALL_FRAMES, GETUP_BACK, GETUP_FRONT, SLIP_DX, SLIP_FRAMES, blendPose, cheer, fall, getUpBack, getUpFront, fold, idle, jump, kick, laugh, point, punch,
  run, runSpeed, shock, shrug, sit, slip, think, walk, walkSpeed, wave,
} from "./animation/actions";
import { Chair } from "./engine/backgrounds";
import { StoryProps, StoryVideo } from "./engine/StoryVideo";
import { buildTimeline } from "./engine/timeline";
import { AUDIO } from "./generated/audio";
import { STORIES } from "./stories";

type Props = {};

const W = 1280;
const H = 720;
const GROUND = 620;
const EXPRESSIONS: Expression[] = ["neutral", "happy", "laughing", "angry", "sad", "shocked", "confused"];

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

const storyMeta: CalculateMetadataFunction<StoryProps> = ({ props }) => ({
  durationInFrames: buildTimeline(props.story, props.audio ?? {}).total,
  fps: props.story.fps ?? 30,
});

export const MyComposition = () => {
  return (
    <>
      <Composition id="Showcase" component={MyComponent} durationInFrames={240} fps={30} width={W} height={H} calculateMetadata={calculateMetadata} />
      <Composition id="Actions" component={ActionsDemo} durationInFrames={ACTIONS_TOTAL} fps={30} width={W} height={H} />
      {Object.entries(STORIES).flatMap(([id, story]) =>
        (
          [
            ["", 1920, 1080],
            ["-vertical", 1080, 1920],
          ] as const
        ).map(([suffix, w, h]) => (
          <Composition
            key={id + suffix}
            id={`story-${id}${suffix}`}
            component={StoryVideo}
            durationInFrames={1}
            fps={story.fps ?? 30}
            width={w}
            height={h}
            defaultProps={{ story, audio: AUDIO[id] ?? {} }}
            calculateMetadata={storyMeta}
          />
        )),
      )}
    </>
  );
};

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: "#f4f1ea" }}>
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <line x1={0} y1={GROUND} x2={W} y2={GROUND} stroke="#111" strokeWidth={6} />
      {children}
    </svg>
  </AbsoluteFill>
);

// ---------------- Showcase (walk / wave / talk / expressions) ----------------
export const MyComponent: React.FC<Props> = () => {
  const frame = useCurrentFrame();
  const blink = frame % 100 < 4 ? 1 : 0;

  // 0-60 walk in, 60-120 wave, 120-240 talk + cycle expressions
  let pose = idle(frame);
  let x = W / 2;
  let expression: Expression = "neutral";
  let mouthOpen = 0;

  if (frame < 60) {
    x = W / 2 - walkSpeed() * (60 - frame);
    pose = walk(frame);
  } else if (frame < 72) {
    pose = blendPose(walk(60), idle(frame), (frame - 60) / 12);
  } else if (frame < 120) {
    pose = wave(frame);
    expression = "happy";
  } else {
    expression = EXPRESSIONS[Math.floor((frame - 120) / 17) % EXPRESSIONS.length];
    mouthOpen = Math.abs(Math.sin(frame * 0.9)) * Math.abs(Math.sin(frame * 0.37));
  }

  return (
    <Stage>
      <Stickman x={x} groundY={GROUND} pose={pose} expression={expression} mouthOpen={mouthOpen} blink={blink} />
    </Stage>
  );
};

// ---------------- Actions demo (every action, one after another) ----------------
type Seg = { label: string; len: number; expr: Expression; pose: (f: number, len: number) => Pose; x?: (f: number) => number; chair?: boolean };

const SEGS: Seg[] = [
  { label: "run", len: 45, expr: "neutral", pose: (f) => run(f), x: (f) => -100 + runSpeed() * f },
  { label: "jump", len: 40, expr: "happy", pose: (f) => jump(f) },
  { label: "sit", len: 70, expr: "neutral", chair: true, pose: (f, n) => sit(f, f < 15 ? f / 15 : f > n - 15 ? (n - f) / 15 : 1) },
  { label: "cheer", len: 45, expr: "happy", pose: (f) => cheer(f) },
  { label: "laugh", len: 45, expr: "laughing", pose: (f) => laugh(f) },
  { label: "point", len: 40, expr: "neutral", pose: (f) => point(f) },
  { label: "punch", len: 30, expr: "angry", pose: (f) => punch(f) },
  { label: "kick", len: 30, expr: "angry", pose: (f) => kick(f) },
  { label: "trip + get up", len: 74, expr: "shocked", x: (f) => W / 2 - 100 + (f >= FALL_FRAMES + 16 ? FALL_DX : 0), pose: (f) => (f < FALL_FRAMES + 16 ? fall(Math.min(f, FALL_FRAMES)) : getUpFront(Math.min(f - FALL_FRAMES - 16, GETUP_FRONT))) },
  { label: "slip + get up", len: 74, expr: "shocked", x: (f) => W / 2 + 60 + (f >= SLIP_FRAMES + 16 ? SLIP_DX : 0), pose: (f) => (f < SLIP_FRAMES + 16 ? slip(Math.min(f, SLIP_FRAMES)) : getUpBack(Math.min(f - SLIP_FRAMES - 16, GETUP_BACK))) },
  { label: "arms folded", len: 40, expr: "neutral", pose: (f) => fold(f) },
  { label: "shrug", len: 40, expr: "confused", pose: (f) => shrug(f) },
  { label: "think", len: 50, expr: "confused", pose: (f) => think(f) },
  { label: "shock", len: 40, expr: "shocked", pose: (f) => shock(f) },
];
const ACTIONS_TOTAL = SEGS.reduce((a, s) => a + s.len, 0);

export const ActionsDemo: React.FC = () => {
  const frame = useCurrentFrame();
  let start = 0;
  let seg = SEGS[0];
  for (const s of SEGS) {
    if (frame < start + s.len) {
      seg = s;
      break;
    }
    start += s.len;
  }
  const f = frame - start;
  const x = seg.x ? seg.x(f) : W / 2;
  const pose = seg.pose(f, seg.len);

  return (
    <Stage>
      <text x={40} y={70} fontSize={44} fontFamily="sans-serif" fontWeight={700} fill="#111">
        {seg.label}
      </text>
      {seg.chair ? <Chair x={x} facing={1} /> : null}
      <Stickman x={x} groundY={GROUND} pose={pose} expression={seg.expr} blink={frame % 100 < 4 ? 1 : 0} />
    </Stage>
  );
};