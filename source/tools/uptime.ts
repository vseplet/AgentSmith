import type { Tool } from "$/core/types.ts";

export const uptimeTool: Tool = {
  name: "get_system_uptime",
  description:
    "Get the current system uptime. Always call this when user asks about uptime or how long the system has been running.",
  parameters: {
    type: "object",
    properties: {
      verbose: {
        type: "boolean",
        description: "If true, return detailed info. Default is false.",
      },
    },
  },
  execute: async () => {
    const command = new Deno.Command("uptime", {
      stdout: "piped",
      stderr: "piped",
    });
    const { stdout } = await command.output();
    return { uptime: new TextDecoder().decode(stdout).trim() };
  },
};
