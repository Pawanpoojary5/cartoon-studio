import { NEUTRAL_POSE, Pose } from "../characters/Stickman";

const TAU = Math.PI * 2;

/** Linear blend between two poses (t = 0..1). Use to avoid pops between actions. */
export const blendPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    y: m(a.y, b.y),
    lean: m(a.lean, b.lean),
    head: m(a.head, b.head),
    armL: { s: m(a.armL.s, b.armL.s), e: m(a.armL.e, b.armL.e) },
    armR: { s: m(a.armR.s, b.armR.s), e: m(a.armR.e, b.armR.e) },
    legL: { h: m(a.legL.h, b.legL.h), k: m(a.legL.k, b.legL.k) },
    legR: { h: m(a.legR.h, b.legR.h), k: m(a.legR.k, b.legR.k) },
  };
};

/** Idle / breathing. */
export const idle = (frame: number): Pose => {
  const b = Math.sin((frame / 60) * TAU);
  return {
    ...NEUTRAL_POSE,
    y: b * -2,
    lean: 1.5 * b,
    head: -1.5 * b,
    armL: { s: 6 + 2 * b, e: 12 },
    armR: { s: -6 - 2 * b, e: 12 },
  };
};

/** Walk cycle. One full cycle = `period` frames (2 steps). */
export const walk = (frame: number, period = 30): Pose => {
  const p = (frame / period) * TAU;
  const hL = 28 * Math.sin(p);
  const hR = -hL;
  return {
    y: 0,
    lean: 5,
    head: -3 + 1.5 * Math.sin(2 * p),
    legL: { h: hL, k: 48 * Math.max(0, Math.cos(p)) },
    legR: { h: hR, k: 48 * Math.max(0, -Math.cos(p)) },
    armL: { s: -hL * 1.1, e: 22 + 12 * Math.max(0, Math.cos(p + Math.PI)) },
    armR: { s: -hR * 1.1, e: 22 + 12 * Math.max(0, -Math.cos(p + Math.PI)) },
  };
};

/** Horizontal px per frame so planted feet do not slide (matches walk()). */
export const walkSpeed = (period = 30) => 316 / period;

/** Wave with the right arm (call with frames since the wave started). */
export const wave = (frame: number): Pose => {
  const w = Math.sin(frame * 0.6);
  return {
    ...idle(frame),
    armR: { s: 150 + 6 * Math.sin(frame * 0.3), e: 25 + 32 * w },
  };
};