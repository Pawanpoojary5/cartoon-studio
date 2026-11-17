import { Expression, Pose } from "../characters/Stickman";
import {
  ACTIONS, FALL_DX, FALL_FRAMES, GETUP_BACK, GETUP_FRONT, SLIP_DX, SLIP_FRAMES, backRest, blendPose, fall, getUpBack, getUpFront, idle, proneRest, runSpeed, sit, slip, walkSpeed,
} from "../animation/actions";
import { ActionName, AudioMap, Beat, CastEntry, Posture, Scene, Slot, Story } from "./types";
import { AudioClip } from "./types";

export const AUDIO_LEAD = 3; // frames between beat start and voice start
export const beatKey = (scene: number, beat: number) => `s${scene + 1}-b${beat + 1}`;

export type CharState = { x: number; facing: 1 | -1; posture: Posture; expression: Expression };
export type BeatTL = {
  start: number; // local to scene
  len: number;
  actor: string | null;
  action: ActionName;
  expression: Expression;
  speaking: boolean;
  say?: string;
  clip?: AudioClip;
  fromX: number;
  toX: number;
  before: Record<string, CharState>;
  after: Record<string, CharState>;
};
export type Chair = { x: number; facing: 1 | -1 };
export type SceneTL = { start: number; len: number; scene: Scene; initial: Record<string, CharState>; chairs: Chair[]; beats: BeatTL[] };
export type Timeline = { total: number; scenes: SceneTL[] };

const SLOTS: Record<Slot, number> = { left: 320, center: 640, right: 960 };
const px = (v: number | Slot) => (typeof v === "number" ? v : SLOTS[v]);

const DEFAULT_EXPR: Partial<Record<ActionName, Expression>> = {
  laugh: "laughing", cheer: "happy", jump: "happy", wave: "happy", punch: "angry", kick: "angry", fall: "shocked", slip: "shocked",
  shock: "shocked", shrug: "confused", think: "confused",
};
const ACTION_FRAMES: Partial<Record<ActionName, number>> = {
  idle: 30, jump: 34, punch: 24, kick: 26, fall: 46, slip: 46, getup: GETUP_FRONT, fold: 40, shrug: 40, think: 50, shock: 40, sit: 15, stand: 15, wave: 45, cheer: 45, laugh: 45, point: 40, talk: 30,
};
const POSTURE_AFTER: Partial<Record<ActionName, Posture>> = { sit: "sit", stand: "stand", fall: "lie", slip: "lieBack", getup: "stand" };

const fail = (msg: string): never => {
  throw new Error(`[story] ${msg}`);
};

const clone = (m: Record<string, CharState>): Record<string, CharState> =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v }]));

export const buildTimeline = (story: Story, audio: AudioMap = {}): Timeline => {
  let cursor = 0;
  const scenes: SceneTL[] = story.scenes.map((scene, si) => {
    const initial: Record<string, CharState> = {};
    Object.entries(scene.cast).forEach(([id, c]: [string, CastEntry]) => {
      if (!story.characters[id]) fail(`scene ${si + 1}: cast has unknown character "${id}"`);
      initial[id] = { x: px(c.x), facing: c.facing ?? 1, posture: c.posture ?? "stand", expression: "neutral" };
    });

    const chairs: Chair[] = (scene.props ?? []).filter((p) => p.type === "chair").map((p) => ({ x: px(p.x), facing: p.facing ?? 1 }));
    Object.entries(scene.cast).forEach(([, c]) => {
      if (c.posture === "sit" && !chairs.some((ch) => Math.abs(ch.x - px(c.x)) < 60)) chairs.push({ x: px(c.x), facing: c.facing ?? 1 });
    });

    let state = clone(initial);
    let t = 0;
    const beats: BeatTL[] = scene.beats.map((b: Beat, bi: number) => {
      const where = `scene ${si + 1}, beat ${bi + 1}`;
      const actor = b.who ?? null;
      if (actor && !state[actor]) fail(`${where}: "${actor}" is not in this scene's cast`);
      const action: ActionName = b.action ?? (b.say ? "talk" : "idle");
      if (!ACTIONS[action]) fail(`${where}: unknown action "${action}"`);

      const before = clone(state);
      const after = clone(state);
      const from = actor ? before[actor].x : 0;
      const moving = actor !== null && (action === "walk" || action === "run");
      let chair: Chair | undefined;
      if (actor && action === "sit") {
        chair = chairs.filter((c) => Math.abs(c.x - from) <= 90).sort((a, c) => Math.abs(a.x - from) - Math.abs(c.x - from))[0];
        if (!chair) fail(`${where}: "${actor}" sits at x=${Math.round(from)} but there is no chair there. Add props: [{ type: "chair", x: ${Math.round(from)} }] to the scene, or walk to a chair first.`);
      }
      if (actor && action === "getup" && before[actor].posture !== "lie" && before[actor].posture !== "lieBack")
        fail(`${where}: "${actor}" does getup but is not lying down (use fall or slip first).`);
      const to = chair ? chair.x : moving && b.to !== undefined ? px(b.to) : from;

      const clip = b.say ? audio[beatKey(si, bi)] : undefined;
      let len = b.frames;
      if (len === undefined) {
        if (moving && to !== from) len = Math.max(1, Math.ceil(Math.abs(to - from) / (action === "run" ? runSpeed() : walkSpeed())));
        else {
          const base = action === "getup" && actor ? (before[actor].posture === "lieBack" ? GETUP_BACK : GETUP_FRONT) : ACTION_FRAMES[action] ?? 30;
          len = clip ? Math.max(base, clip.frames + AUDIO_LEAD + 5) : b.say ? Math.max(base, Math.round(b.say.length * 2) + 12) : base;
        }
      }
      const expression = b.expression ?? (actor ? DEFAULT_EXPR[action] ?? before[actor].expression : "neutral");

      if (actor) {
        const a = after[actor];
        if (moving && to !== from) a.facing = to > from ? 1 : -1;
        if (chair) a.facing = chair.facing;
        if (b.face) a.facing = b.face;
        a.x = to;
        if (action === "fall") a.x = to + a.facing * FALL_DX; // the fall carries the body forward
        if (action === "slip") a.x = to + a.facing * SLIP_DX;
        a.posture = POSTURE_AFTER[action] ?? a.posture;
        a.expression = b.expression ?? before[actor].expression;
      }
      const tl: BeatTL = { start: t, len, actor, action, expression, speaking: !!(actor && b.say), say: b.say, clip, fromX: from, toX: to, before, after };
      state = after;
      t += len;
      return tl;
    });

    const len = t + (scene.pad ?? 10);
    const sc: SceneTL = { start: cursor, len, scene, initial, chairs, beats };
    cursor += len;
    return sc;
  });
  return { total: Math.max(1, cursor), scenes };
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const restPose = (posture: Posture, gf: number): Pose =>
  posture === "sit" ? sit(gf, 1) : posture === "lie" ? proneRest() : posture === "lieBack" ? backRest() : idle(gf);

export type CharFrame = { x: number; facing: 1 | -1; pose: Pose; expression: Expression; speaking: boolean; mouth: number };

/** State of one character at scene-local frame f (gf = global frame, keeps breathing continuous). */
export const resolveChar = (sc: SceneTL, f: number, id: string, gf: number): CharFrame => {
  const b = sc.beats.find((x) => f >= x.start && f < x.start + x.len);
  if (!b) {
    const last = sc.beats.length ? sc.beats[sc.beats.length - 1].after : sc.initial;
    const st = last[id];
    return { x: st.x, facing: st.facing, pose: restPose(st.posture, gf), expression: st.expression, speaking: false, mouth: 0 };
  }
  const st = b.before[id];
  if (id !== b.actor) return { x: st.x, facing: st.facing, pose: restPose(st.posture, gf), expression: st.expression, speaking: false, mouth: 0 };

  const lf = f - b.start;
  const dur = b.action === "sit" ? Math.min(b.len, 15) : b.len;
  const x = b.fromX + (b.toX - b.fromX) * clamp01(lf / dur);
  const facing = b.after[id].facing;
  let pose: Pose;
  switch (b.action) {
    case "sit": pose = sit(gf, clamp01(lf / 15)); break;
    case "stand": pose = sit(gf, 1 - clamp01(lf / 15)); break;
    case "fall": pose = fall(Math.min(lf, FALL_FRAMES)); break;
    case "slip": pose = slip(Math.min(lf, SLIP_FRAMES)); break;
    case "getup": pose = st.posture === "lieBack" ? getUpBack(Math.min(lf, GETUP_BACK)) : getUpFront(Math.min(lf, GETUP_FRONT)); break;
    default: {
      const ramp = clamp01(Math.min(lf / 6, (b.len - lf) / 6));
      pose = blendPose(restPose(st.posture, gf), ACTIONS[b.action](lf), ramp);
    }
  }
  // real voice: mouth follows the recording; no recording yet: placeholder flap
  const mouth = !b.speaking ? 0 : b.clip ? b.clip.mouth[lf - AUDIO_LEAD] ?? 0 : Math.abs(Math.sin(gf * 0.9)) * Math.abs(Math.sin(gf * 0.37));
  return { x, facing, pose, expression: b.expression, speaking: b.speaking, mouth };
};

// ---------- camera (vertical format only; landscape always shows the whole stage) ----------
// Rule: everyone who is on stage stays in view. The view is at least 800 stage units wide and
// zooms out only as far as needed (lying bodies are long). Smoothed over 15 frames.
export const CAM_MIN_W = 800;
type Ext = Record<string, [number, number]>;

/** Horizontal space a character occupies (a lying body is much longer than a standing one). */
const extent = (c: CharState): [number, number] => {
  const [a, b] = c.posture === "lie" ? [-190, 330] : c.posture === "lieBack" ? [-330, 190] : [-110, 110];
  return c.facing === 1 ? [c.x + a, c.x + b] : [c.x - b, c.x - a];
};
const extentsOf = (m: Record<string, CharState>): Ext => Object.fromEntries(Object.entries(m).map(([id, c]) => [id, extent(c)]));

const camTarget = (ext: Ext): { cx: number; w: number } => {
  // characters still off-stage (walking in) are ignored until they arrive
  const shown = Object.values(ext).filter((e) => (e[0] + e[1]) / 2 > 0 && (e[0] + e[1]) / 2 < 1280);
  if (!shown.length) return { cx: 640, w: CAM_MIN_W };
  const lo = Math.min(...shown.map((e) => e[0]));
  const hi = Math.max(...shown.map((e) => e[1]));
  const w = Math.min(1280, Math.max(CAM_MIN_W, hi - lo + 120));
  return { cx: Math.min(1280 - w / 2, Math.max(w / 2, (lo + hi) / 2)), w };
};

const cameraRaw = (sc: SceneTL, f: number): { cx: number; w: number } => {
  const b = sc.beats.find((x) => f >= x.start && f < x.start + x.len);
  if (!b) {
    const last = sc.beats[sc.beats.length - 1];
    return camTarget(extentsOf(last ? last.after : sc.initial));
  }
  const lf = f - b.start;
  const ext = extentsOf(b.before);
  if (b.actor) {
    // the actor moves from where they were to where they end up (walk, sit, fall, slip, get up)
    const bef = b.before[b.actor];
    const span =
      b.action === "fall" ? FALL_FRAMES : b.action === "slip" ? SLIP_FRAMES : b.action === "sit" ? Math.min(b.len, 15)
      : b.action === "getup" ? (bef.posture === "lieBack" ? GETUP_BACK : GETUP_FRONT) : b.len;
    const p = clamp01(lf / span);
    const e0 = ext[b.actor];
    const e1 = extent(b.after[b.actor]);
    ext[b.actor] = [e0[0] + (e1[0] - e0[0]) * p, e0[1] + (e1[1] - e0[1]) * p];
  }
  return camTarget(ext);
};

/** Smoothed camera: average of 7 frames before and after, so zoom/pan changes never jump and never lag behind a fall. */
export const cameraView = (sc: SceneTL, f: number): { cx: number; w: number } => {
  let cx = 0;
  let w = 0;
  for (let k = -7; k <= 7; k++) {
    const r = cameraRaw(sc, Math.min(sc.len - 1, Math.max(0, f + k)));
    cx += r.cx;
    w += r.w;
  }
  return { cx: cx / 15, w: w / 15 };
};