import React from "react";
import { BackgroundName } from "./types";

export const W = 1280;
export const H = 720;
export const GROUND = 620;

const Floor: React.FC<{ color: string }> = ({ color }) => <rect x={-200} y={GROUND} width={W + 400} height={2000} fill={color} />;

const STARS = Array.from({ length: 80 }, (_, i) => [(i * 337) % W, -700 + ((i * 151) % 1030), 1.5 + (i % 3)]);

export const Background: React.FC<{ name: BackgroundName }> = ({ name }) => {
  switch (name) {
    case "room":
      return (
        <>
          <rect x={-200} y={-1600} width={W + 400} height={GROUND + 1600} fill="#eadfca" />
          <rect x={-200} y={GROUND - 90} width={W + 400} height={12} fill="#cdbb9a" />
          <rect x={140} y={110} width={260} height={230} rx={8} fill="#bfe3f7" stroke="#8a6f4d" strokeWidth={12} />
          <line x1={270} y1={110} x2={270} y2={340} stroke="#8a6f4d" strokeWidth={8} />
          <line x1={140} y1={225} x2={400} y2={225} stroke="#8a6f4d" strokeWidth={8} />
          <rect x={860} y={130} width={170} height={120} fill="#f7f3ea" stroke="#8a6f4d" strokeWidth={10} />
          <circle cx={945} cy={190} r={32} fill="#e7a977" />
          <Floor color="#c9a97c" />
        </>
      );
    case "street":
      return (
        <>
          <rect x={-200} y={-1600} width={W + 400} height={GROUND + 1600} fill="#cfe8ff" />
          {[0, 230, 470, 740, 1000].map((x, i) => (
            <g key={x}>
              <rect x={x} y={GROUND - [300, 220, 360, 260, 320][i]} width={[200, 220, 250, 230, 280][i]} height={[300, 220, 360, 260, 320][i]} fill={["#b9b2c9", "#c9b2b2", "#b2c4c9", "#c9c6b2", "#b2c9b8"][i]} />
              {[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={x + 30 + c * 80} y={GROUND - [300, 220, 360, 260, 320][i] + 30 + r * 60} width={40} height={36} fill="#f3f0d8" />))}
            </g>
          ))}
          <Floor color="#7a7a80" />
          <rect x={0} y={GROUND + 55} width={W} height={6} fill="#e8e0b0" />
        </>
      );
    case "park":
      return (
        <>
          <rect x={-200} y={-1600} width={W + 400} height={GROUND + 1600} fill="#bfe6ff" />
          <circle cx={1080} cy={120} r={56} fill="#ffe27a" />
          <ellipse cx={300} cy={GROUND} rx={420} ry={150} fill="#a5d36f" />
          <ellipse cx={980} cy={GROUND} rx={460} ry={120} fill="#8fc65c" />
          <rect x={1085} y={330} width={36} height={GROUND - 330} fill="#7a5230" />
          <circle cx={1103} cy={300} r={110} fill="#4f9d47" />
          <circle cx={1040} cy={350} r={70} fill="#5eae55" />
          <Floor color="#7fbf4f" />
        </>
      );
    case "night":
      return (
        <>
          <rect x={-200} y={-1600} width={W + 400} height={GROUND + 1600} fill="#14182b" />
          {STARS.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.8} />)}
          <circle cx={1050} cy={130} r={60} fill="#f4f1d0" />
          <circle cx={1075} cy={115} r={52} fill="#14182b" />
          <Floor color="#1f2740" />
        </>
      );
    default:
      return (
        <>
          <rect x={-200} y={-1600} width={W + 400} height={GROUND + 1600} fill="#f4f1ea" />
          <Floor color="#e6e0d2" />
        </>
      );
  }
};

/** Wooden chair (side view). Seat top is exactly where a seated character's thighs rest. */
export const Chair: React.FC<{ x: number; facing: 1 | -1 }> = ({ x, facing }) => (
  <g transform={`translate(${x} ${GROUND}) scale(${facing} 1)`}>
    <line x1={-48} y1={-70} x2={-48} y2={0} stroke="#7a5a35" strokeWidth={10} strokeLinecap="round" />
    <line x1={46} y1={-70} x2={46} y2={0} stroke="#7a5a35" strokeWidth={10} strokeLinecap="round" />
    <rect x={-66} y={-212} width={14} height={134} rx={6} fill="#b98a56" stroke="#111" strokeWidth={4} />
    <rect x={-66} y={-81} width={126} height={14} rx={5} fill="#b98a56" stroke="#111" strokeWidth={4} />
  </g>
);