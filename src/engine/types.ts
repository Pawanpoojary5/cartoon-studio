import { Expression } from "../characters/Stickman";

export type ActionName =
  | "idle" | "talk" | "walk" | "run" | "wave" | "jump" | "sit" | "stand"
  | "cheer" | "laugh" | "point" | "punch" | "kick" | "fall" | "slip" | "getup"
  | "fold" | "shrug" | "think" | "shock";

export type BackgroundName = "plain" | "room" | "street" | "park" | "night";
export type Slot = "left" | "center" | "right";

/** Voice effect applied to YOUR recording for this character (your original file is never changed). */
export type VoicePreset = "original" | "deep" | "high" | "kid" | "old" | "robot" | "radio" | "monster";

/** Processed voice clip + mouth movement, produced by `npm run voices:process`. */
export type AudioClip = { file: string; frames: number; mouth: number[] };
export type AudioMap = Record<string, AudioClip>; // key = "s1-b2" (scene 1, beat 2)
export type Posture = "stand" | "sit" | "lie" | "lieBack";

export type CharacterDef = {
  name: string;
  shirt?: string; // torso color
  hair?: string; // hair color
  scale?: number; // 1 = default size
  voice?: VoicePreset; // default "original"
};

export type CastEntry = {
  x: number | Slot; // px on a 1280-wide canvas (off-screen like -150 is fine)
  facing?: 1 | -1; // 1 = right, -1 = left
  posture?: "stand" | "sit";
};

/** One step of a scene. Beats play one after another. */
export type Beat = {
  who?: string; // acting character. Omit for a pure pause (use `frames`).
  action?: ActionName; // default: "talk" if `say`, else "idle"
  say?: string; // spoken line (also shown as caption)
  expression?: Expression; // persists until changed
  to?: number | Slot; // walk/run target x
  face?: 1 | -1;
  frames?: number; // override auto length
};

/** Scene objects. A character can only `sit` where a chair is (cast posture "sit" adds one automatically). */
export type PropDef = { type: "chair"; x: number | Slot; facing?: 1 | -1 };

export type Scene = {
  background: BackgroundName;
  props?: PropDef[];
  cast: Record<string, CastEntry>;
  beats: Beat[];
  pad?: number; // frames of calm at the end (default 10)
};

export type Story = {
  id: string; // folder name for voices, e.g. "demo" -> public/voices/demo
  title: string;
  fps?: number;
  characters: Record<string, CharacterDef>;
  scenes: Scene[];
};