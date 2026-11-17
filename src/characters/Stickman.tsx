import React from "react";

export type Expression =
  | "neutral"
  | "happy"
  | "laughing"
  | "angry"
  | "sad"
  | "shocked"
  | "confused";

/** Angles in degrees. Positive = swing FORWARD (toward the way the character faces). */
export type Arm = { s: number; e: number }; // shoulder swing, elbow bend (forward)
export type Leg = { h: number; k: number }; // hip swing (forward), knee bend (backward)

export type Pose = {
  y: number; // extra vertical offset in px (negative = up, e.g. jump)
  rot?: number; // whole-body rotation about the HIPS. >0 = forward (trip), <0 = backward (slip)
  dx?: number; // body shift along the facing direction (px) - used so falls travel
  lean: number; // torso lean, forward positive
  head: number; // head tilt, forward positive
  armL: Arm;
  armR: Arm;
  legL: Leg;
  legR: Leg;
};

export const NEUTRAL_POSE: Pose = {
  y: 0,
  lean: 0,
  head: 0,
  armL: { s: 6, e: 10 },
  armR: { s: -6, e: 10 },
  legL: { h: 0, k: 0 },
  legR: { h: 0, k: 0 },
};

export const DIM = {
  torsoW: 104,
  torsoH: 150,
  head: 70,
  upperArm: 72,
  foreArm: 66,
  thigh: 84,
  shin: 84,
  shoe: 14,
  line: 8,
  limb: 30,
};

const INK = "#111";
const rad = (d: number) => (d * Math.PI) / 180;

/** How far below the hip the foot sits for a given leg pose. */
const footReach = (l: Leg) =>
  DIM.thigh * Math.cos(rad(l.h)) + DIM.shin * Math.cos(rad(l.h - l.k));

const BROWS: Record<Expression, [number, number, number, number][]> = {
  neutral: [[-42, -36, -12, -36], [12, -36, 42, -36]],
  happy: [[-42, -38, -12, -42], [12, -42, 42, -38]],
  laughing: [[-42, -42, -12, -46], [12, -46, 42, -42]],
  angry: [[-44, -44, -12, -28], [12, -28, 44, -44]],
  sad: [[-44, -28, -12, -42], [12, -42, 44, -28]],
  shocked: [[-42, -52, -12, -56], [12, -56, 42, -52]],
  confused: [[-42, -46, -12, -52], [12, -30, 42, -34]],
};

const MOUTHS: Record<Expression, string> = {
  neutral: "M -18 36 L 18 36",
  happy: "M -26 26 Q 0 56 26 26",
  laughing: "M -30 22 Q 0 78 30 22 Z",
  angry: "M -20 44 Q 0 28 20 44",
  sad: "M -20 46 Q 0 28 20 46",
  shocked: "M -11 28 A 11 17 0 1 0 11 28 A 11 17 0 1 0 -11 28 Z",
  confused: "M -22 38 Q -11 28 0 38 T 22 38",
};

const Arm_: React.FC<{ x: number; arm: Arm }> = ({ x, arm }) => (
  <g transform={`translate(${x} -122) rotate(${-arm.s})`}>
    <line x1={0} y1={0} x2={0} y2={DIM.upperArm} stroke={INK} strokeWidth={DIM.limb} strokeLinecap="round" />
    <g transform={`translate(0 ${DIM.upperArm}) rotate(${-arm.e})`}>
      <line x1={0} y1={0} x2={0} y2={DIM.foreArm} stroke={INK} strokeWidth={DIM.limb} strokeLinecap="round" />
      <circle cx={0} cy={DIM.foreArm + 4} r={19} fill={INK} />
    </g>
  </g>
);

const Leg_: React.FC<{ x: number; leg: Leg }> = ({ x, leg }) => (
  <g transform={`translate(${x} 0) rotate(${-leg.h})`}>
    <line x1={0} y1={0} x2={0} y2={DIM.thigh} stroke={INK} strokeWidth={DIM.limb + 4} strokeLinecap="round" />
    <g transform={`translate(0 ${DIM.thigh}) rotate(${leg.k})`}>
      <line x1={0} y1={0} x2={0} y2={DIM.shin} stroke={INK} strokeWidth={DIM.limb + 4} strokeLinecap="round" />
      <rect x={-16} y={DIM.shin - 6} width={70} height={DIM.shoe + 8} rx={12} fill={INK} />
    </g>
  </g>
);

const Eye: React.FC<{ x: number; r: number; pupil: number; blink: number }> = ({ x, r, pupil, blink }) => (
  <g transform={`translate(${x} -4) scale(1 ${Math.max(0.08, 1 - blink)})`}>
    <circle r={r} fill="#fff" stroke={INK} strokeWidth={5} />
    <circle cx={5} r={pupil} fill={INK} />
  </g>
);

type Props = {
  x: number; // ground position of the character (px)
  groundY: number; // ground line (px)
  pose?: Pose;
  expression?: Expression;
  mouthOpen?: number; // 0..1, talking mouth (overrides expression mouth)
  blink?: number; // 0 open .. 1 closed
  facing?: 1 | -1;
  scale?: number;
  shirt?: string;
  hair?: string;
};

/** Render inside an <svg>. Pure component (no Remotion hooks) so it is easy to test. */
export const Stickman: React.FC<Props> = ({
  x,
  groundY,
  pose = NEUTRAL_POSE,
  expression = "neutral",
  mouthOpen = 0,
  blink = 0,
  facing = 1,
  scale = 1,
  shirt = "#fff",
  hair = INK,
}) => {
  // Lowest foot touches the ground automatically (no floating / sinking while walking).
  const reach = Math.max(footReach(pose.legL), footReach(pose.legR));
  const hipY = -(reach + DIM.shoe) + pose.y;
  const rot = pose.rot ?? 0;
  const a = Math.min(1, Math.abs(rot) / 90); // 0 standing .. 1 lying
  const LIE = 48; // hip height when lying on the ground
  const hipFinal = hipY * (1 - a) - LIE * a;
  const outer = `translate(${pose.dx ?? 0} 0)`;
  const hipTf = `translate(0 ${hipFinal}) rotate(${rot})`;
  const shadowRx = 80 + a * 160;
  const shadowCx = (pose.dx ?? 0) + 10 + (rot >= 0 ? a * 65 : -a * 65);
  const brows = BROWS[expression];
  const big = expression === "shocked";
  const talking = mouthOpen > 0.05 && expression !== "laughing";

  return (
    <g transform={`translate(${x} ${groundY}) scale(${facing * scale} ${scale})`}>
      <ellipse cx={shadowCx} cy={2} rx={shadowRx} ry={10} fill="#000" opacity={0.12} />
      <g transform={outer}>
      <g transform={hipTf}>
        <Leg_ x={-26} leg={pose.legL} />
        <Leg_ x={26} leg={pose.legR} />

        <g transform={`rotate(${-pose.lean})`}>
          <rect
            x={-DIM.torsoW / 2}
            y={-DIM.torsoH}
            width={DIM.torsoW}
            height={DIM.torsoH}
            rx={10}
            fill={shirt}
            stroke={INK}
            strokeWidth={DIM.line}
          />
          <Arm_ x={-62} arm={pose.armL} />
          <Arm_ x={62} arm={pose.armR} />

          <g transform={`translate(0 ${-DIM.torsoH}) rotate(${-pose.head})`}>
            <line x1={0} y1={0} x2={0} y2={-16} stroke={INK} strokeWidth={16} />
            <g transform="translate(0 -88) scale(1.1)">
              <circle r={DIM.head} fill="#fff" stroke={INK} strokeWidth={DIM.line} />
              <path
                d="M -72 -6 C -88 -72 -30 -110 20 -94 C 64 -82 84 -40 71 -2 C 52 -40 12 -58 -30 -50 C -52 -46 -66 -30 -72 -6 Z"
                fill={hair}
              />
              <Eye x={-27} r={big ? 21 : 17} pupil={big ? 5 : 7} blink={blink} />
              <Eye x={27} r={big ? 21 : 17} pupil={big ? 5 : 7} blink={blink} />
              {brows.map((b, i) => (
                <line key={i} x1={b[0]} y1={b[1]} x2={b[2]} y2={b[3]} stroke={INK} strokeWidth={7} strokeLinecap="round" />
              ))}
              {talking ? (
                <ellipse cx={0} cy={36} rx={14 + 8 * mouthOpen} ry={3 + 20 * mouthOpen} fill="#3b0d0d" stroke={INK} strokeWidth={5} />
              ) : (
                <path
                  d={MOUTHS[expression]}
                  fill={expression === "laughing" || expression === "shocked" ? "#3b0d0d" : "none"}
                  stroke={INK}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          </g>
        </g>
      </g>
      </g>
    </g>
  );
};