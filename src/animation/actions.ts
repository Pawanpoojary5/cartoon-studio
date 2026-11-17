import { NEUTRAL_POSE, Pose } from "../characters/Stickman";
import { ActionName } from "../engine/types";

const TAU = Math.PI * 2;

/** Linear blend between two poses (t = 0..1). Use to avoid pops between actions. */
export const blendPose = (a: Pose, b: Pose, t: number): Pose => {
  const m = (x: number, y: number) => x + (y - x) * t;
  return {
    y: m(a.y, b.y),
    rot: m(a.rot ?? 0, b.rot ?? 0),
    dx: m(a.dx ?? 0, b.dx ?? 0),
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

// ---------- keyframe helper ----------
type Ease = "lin" | "in" | "out" | "io";
type Key = [frame: number, pose: Pose, ease?: Ease];
const EASE: Record<Ease, (t: number) => number> = {
  lin: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => t * t * (3 - 2 * t),
};
const P = (o: Partial<Pose>): Pose => ({ ...NEUTRAL_POSE, ...o });

/** Interpolate between keyframes. Ease belongs to the segment ENDING at that key. */
export const track = (frame: number, keys: Key[]): Pose => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, p1, e = "io"] = keys[i];
    const [f0, p0] = keys[i - 1];
    if (frame <= f1) return blendPose(p0, p1, EASE[e]((frame - f0) / (f1 - f0)));
  }
  return keys[keys.length - 1][1];
};

// ---------- run ----------
export const run = (frame: number, period = 20): Pose => {
  const p = (frame / period) * TAU;
  const hL = 50 * Math.sin(p);
  const hR = -hL;
  return {
    y: 0,
    lean: 16,
    head: -8,
    legL: { h: hL, k: 85 * Math.max(0, Math.cos(p)) },
    legR: { h: hR, k: 85 * Math.max(0, -Math.cos(p)) },
    armL: { s: -hL * 1.1, e: 85 },
    armR: { s: -hR * 1.1, e: 85 },
  };
};
export const runSpeed = (period = 20) => 514 / period;

// ---------- jump (34 frames, lands back on the same spot) ----------
const CROUCH = P({ lean: 18, head: -6, legL: { h: 36, k: 72 }, legR: { h: 36, k: 72 }, armL: { s: -50, e: 25 }, armR: { s: -50, e: 25 } });
const AIR = P({ y: -150, legL: { h: 25, k: 60 }, legR: { h: -12, k: 45 }, armL: { s: 155, e: 10 }, armR: { s: 155, e: 10 } });
export const jump = (frame: number): Pose =>
  track(frame, [[0, NEUTRAL_POSE], [6, CROUCH], [14, AIR, "out"], [22, CROUCH, "in"], [27, NEUTRAL_POSE]]);

// ---------- sit (invisible chair at hip height). amount 0..1 ----------
const SIT = P({ lean: 2, legL: { h: 90, k: 90 }, legR: { h: 90, k: 90 }, armL: { s: 35, e: 55 }, armR: { s: 35, e: 55 } });
export const sit = (frame: number, amount = 1): Pose => blendPose(idle(frame), SIT, EASE.io(Math.min(1, Math.max(0, amount))));

// ---------- gestures ----------
export const cheer = (frame: number): Pose => {
  const s = Math.sin(frame * 0.5);
  return {
    ...idle(frame),
    y: -10 * Math.abs(s),
    armL: { s: 150 + 14 * s, e: 12 },
    armR: { s: 150 - 14 * s, e: 12 },
    legL: { h: 4, k: 14 * Math.abs(s) },
    legR: { h: -4, k: 14 * Math.abs(s) },
  };
};

export const laugh = (frame: number): Pose => {
  const s = Math.sin(frame * 1.1);
  return {
    ...idle(frame),
    y: -3 * Math.abs(s),
    lean: -8 + 3 * s,
    head: -14 + 4 * s,
    armL: { s: 28, e: 70 },
    armR: { s: 28, e: 70 },
  };
};

export const point = (frame: number): Pose => ({
  ...idle(frame),
  lean: 3,
  head: 4,
  armR: { s: 85, e: 4 },
});

// ---------- fight ----------
export const punch = (frame: number): Pose => {
  const W = P({ lean: -8, legL: { h: 18, k: 10 }, legR: { h: -22, k: 14 }, armR: { s: -45, e: 115 }, armL: { s: 40, e: 90 } });
  const S = P({ lean: 16, legL: { h: 32, k: 0 }, legR: { h: -26, k: 12 }, armR: { s: 88, e: 0 }, armL: { s: -30, e: 100 } });
  return track(frame, [[0, NEUTRAL_POSE], [6, W], [10, S, "out"], [14, S], [22, NEUTRAL_POSE]]);
};

export const kick = (frame: number): Pose => {
  const W = P({ lean: -10, legR: { h: -30, k: 75 }, armL: { s: 50, e: 60 }, armR: { s: -40, e: 40 } });
  const S = P({ lean: -16, legR: { h: 92, k: 0 }, armL: { s: 60, e: 40 }, armR: { s: -55, e: 30 } });
  return track(frame, [[0, NEUTRAL_POSE], [7, W], [11, S, "out"], [15, S], [24, NEUTRAL_POSE]]);
};

// ---------- falls: body folds at the hip, limbs flail unevenly, body travels (dx) ----------
export const FALL_DX = 150; // trip: body ends this far forward (timeline moves the character by this)
export const SLIP_DX = -60; // slip: body slides back a little

// trip forward: foot catches -> stagger -> reach out -> face-down landing, legs kicked up
const T1 = P({ lean: 16, head: 6, dx: 6, legL: { h: -38, k: 75 }, legR: { h: 14, k: 0 }, armL: { s: -55, e: 20 }, armR: { s: 105, e: 35 } });
const T2 = P({ rot: 28, lean: 22, head: -10, dx: 46, legL: { h: -48, k: 55 }, legR: { h: -8, k: 28 }, armL: { s: 138, e: 14 }, armR: { s: 150, e: 24 } });
const T3 = P({ rot: 62, lean: 14, head: -24, dx: 104, legL: { h: -30, k: 78 }, legR: { h: -52, k: 42 }, armL: { s: 165, e: 10 }, armR: { s: 140, e: 32 } });
const PRONE = P({ rot: 88, lean: 3, head: -26, dx: FALL_DX, legL: { h: -8, k: 18 }, legR: { h: -10, k: 88 }, armL: { s: 176, e: 8 }, armR: { s: 148, e: 44 } });
const PRONE_UP = P({ rot: 78, lean: 3, head: -36, dx: FALL_DX + 8, legL: { h: -14, k: 40 }, legR: { h: -16, k: 95 }, armL: { s: 170, e: 10 }, armR: { s: 140, e: 40 } });
export const FALL_FRAMES = 24;
export const fall = (frame: number): Pose =>
  track(frame, [[0, NEUTRAL_POSE], [4, T1, "out"], [9, T2], [14, T3, "in"], [18, PRONE, "in"], [21, PRONE_UP, "out"], [FALL_FRAMES, PRONE, "in"]]);
export const proneRest = (): Pose => ({ ...PRONE, dx: 0 }); // after the timeline has moved the character

// slip backward: foot shoots out -> arms up -> lands on the back, one knee up
const S1 = P({ rot: -8, lean: -8, head: -6, dx: -4, legL: { h: 14, k: 8 }, legR: { h: 72, k: 0 }, armL: { s: 150, e: 14 }, armR: { s: 118, e: 22 } });
const S2 = P({ rot: -42, lean: -4, head: -8, dx: -18, legL: { h: 44, k: 42 }, legR: { h: 86, k: 8 }, armL: { s: 165, e: 12 }, armR: { s: 150, e: 26 } });
const S3 = P({ rot: -72, head: 6, dx: -46, legL: { h: 30, k: 70 }, legR: { h: 74, k: 30 }, armL: { s: 120, e: 30 }, armR: { s: 90, e: 40 } });
const BACK = P({ rot: -90, head: 20, dx: SLIP_DX, armL: { s: 22, e: 34 }, armR: { s: 62, e: 36 }, legL: { h: 0, k: 0 }, legR: { h: 55, k: 95 } });
const BACK_UP = P({ rot: -80, head: 26, dx: SLIP_DX - 4, armL: { s: 80, e: 20 }, armR: { s: 100, e: 30 }, legL: { h: 30, k: 30 }, legR: { h: 60, k: 80 } });
export const SLIP_FRAMES = 22;
export const slip = (frame: number): Pose =>
  track(frame, [[0, NEUTRAL_POSE], [4, S1, "out"], [9, S2], [14, S3, "in"], [17, BACK, "in"], [19, BACK_UP, "out"], [SLIP_FRAMES, BACK, "in"]]);
export const backRest = (): Pose => ({ ...BACK, dx: 0 });

// ---------- get up (from face-down: push-up then rise; from back: sit up, then stand) ----------
const PLANK = P({ rot: 68, lean: -2, head: -14, legL: { h: 6, k: 4 }, legR: { h: 4, k: 4 }, armL: { s: 68, e: 4 }, armR: { s: 62, e: 6 } });
const GETUP_CROUCH = P({ rot: 28, lean: 20, head: -6, legL: { h: 40, k: 80 }, legR: { h: 50, k: 90 }, armL: { s: 22, e: 20 }, armR: { s: 18, e: 24 } });
const SIT_GROUND = P({ lean: 6, legL: { h: 88, k: 0 }, legR: { h: 84, k: 6 }, armL: { s: -25, e: 20 }, armR: { s: -30, e: 10 } });
export const GETUP_FRONT = 22;
export const GETUP_BACK = 26;
export const getUpFront = (frame: number): Pose =>
  track(frame, [[0, proneRest()], [7, PLANK], [14, GETUP_CROUCH], [GETUP_FRONT, NEUTRAL_POSE, "out"]]);
export const getUpBack = (frame: number): Pose =>
  track(frame, [[0, backRest()], [10, SIT_GROUND, "out"], [14, SIT_GROUND], [GETUP_BACK, NEUTRAL_POSE]]);

// ---------- reference poses: hands on fold, shrug, thinking, shocked ----------
export const fold = (frame: number): Pose => ({ ...idle(frame), armL: { s: -28, e: 118 }, armR: { s: -28, e: 118 }, lean: -2 });
export const shrug = (frame: number): Pose => {
  const b = Math.sin(frame * 0.2);
  return { ...idle(frame), head: 8, armL: { s: 38 + 3 * b, e: 62 }, armR: { s: 38 - 3 * b, e: 62 } };
};
export const think = (frame: number): Pose => ({ ...idle(frame), head: 6, lean: 2, armR: { s: 68, e: 125 }, armL: { s: -24, e: 105 } });
export const shock = (frame: number): Pose => {
  const t = Math.sin(frame * 0.9) * 1.5;
  return { ...idle(frame), y: t, head: -4, armL: { s: 72, e: 128 }, armR: { s: 66, e: 132 } };
};

// ---------- talking gesture (idle + small hand movement) ----------
export const talk = (frame: number): Pose => {
  const g = Math.max(0, Math.sin(frame * 0.11));
  const s = Math.sin(frame * 0.22);
  return { ...idle(frame), head: 2 * s, armR: { s: 22 + 34 * g, e: 38 + 22 * s } };
};

// ---------- registry used by the story player ----------
export const ACTIONS: Record<ActionName, (f: number) => Pose> = {
  idle, talk, wave, jump, cheer, laugh, point, punch, kick,
  walk: (f) => walk(f),
  run: (f) => run(f),
  sit: (f) => sit(f, 1),
  stand: (f) => idle(f),
  fall: (f) => fall(f),
  slip: (f) => slip(f),
  getup: (f) => getUpFront(f), // timeline picks front/back from the posture
  fold, shrug, think, shock,
};