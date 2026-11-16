import { AbsoluteFill, CalculateMetadataFunction, Composition, useCurrentFrame } from "remotion";
import { Expression, Stickman } from "./characters/Stickman";
import { blendPose, idle, walk, walkSpeed, wave } from "./animation/actions";

type Props = {};

const W = 1280;
const H = 720;
const GROUND = 620;
const EXPRESSIONS: Expression[] = ["neutral", "happy", "laughing", "angry", "sad", "shocked", "confused"];

const calculateMetadata: CalculateMetadataFunction<Props> = () => {
  return {};
};

export const MyComposition = () => {
  return (
    <Composition
      id="Showcase"
      component={MyComponent}
      durationInFrames={240}
      fps={30}
      width={W}
      height={H}
      calculateMetadata={calculateMetadata}
    />
  );
};

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
    <AbsoluteFill style={{ background: "#f4f1ea" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={0} y1={GROUND} x2={W} y2={GROUND} stroke="#111" strokeWidth={6} />
        <Stickman x={x} groundY={GROUND} pose={pose} expression={expression} mouthOpen={mouthOpen} blink={blink} />
      </svg>
    </AbsoluteFill>
  );
};