import { Story } from "../engine/types";
import { demoStory } from "./demo";

/** Register every story here. The id must match story.id. */
export const STORIES: Record<string, Story> = {
  [demoStory.id]: demoStory,
};