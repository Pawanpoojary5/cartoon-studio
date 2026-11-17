import { Story } from "../engine/types";

export const demoStory: Story = {
  id: "demo",
  title: "Demo",
  characters: {
    raju: { name: "Raju", shirt: "#bfe3ff", hair: "#111111", voice: "original" },
    meena: { name: "Meena", shirt: "#f9c5d1", hair: "#5a2d0c", voice: "high" },
  },
  scenes: [
    {
      background: "park",
      cast: { raju: { x: -150 }, meena: { x: 900, facing: -1 } },
      beats: [
        { who: "raju", action: "walk", to: 500 },
        { who: "raju", say: "Hello Meena! How are you?", expression: "happy" },
        { who: "meena", say: "ನಮಸ್ಕಾರ Raju! I am fine.", expression: "happy" },
        { who: "raju", say: "Watch this jump!", action: "jump" },
        { who: "meena", action: "laugh", frames: 45 },
        { who: "raju", say: "Ouch!", action: "slip" },
        { who: "meena", say: "Are you okay?", expression: "shocked" },
        { who: "raju", action: "getup" },
        { who: "raju", say: "I am fine!", expression: "happy" },
      ],
    },
    {
      background: "room",
      cast: { raju: { x: "left", posture: "sit" }, meena: { x: "right", facing: -1 } },
      beats: [
        { who: "meena", say: "Dinner is ready!", expression: "happy" },
        { who: "raju", action: "stand" },
        { who: "raju", say: "Coming!", action: "cheer" },
        { who: "raju", action: "walk", to: 700 },
        { who: "raju", say: "Let's eat!", action: "point", expression: "happy" },
      ],
    },
  ],
};