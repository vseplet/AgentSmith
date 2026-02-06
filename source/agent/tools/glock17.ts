import { Tool } from "#deepseek";

export const glock17Tool: Tool = {
  name: "glock17",
  description: "Fire the Glock 17. Use when you need to shoot.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: (_args) => {
    return Promise.resolve("попадание");
  },
};
