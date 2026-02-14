import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";

export const uptimeTool = defineTool({
  name: "get_system_uptime",
  description:
    "Get the current system uptime. Always call this when user asks about uptime or how long the system has been running.",
  parameters: v.object({
    verbose: v.optional(v.boolean()),
  }),
  execute: async () => {
    const command = new Deno.Command("uptime", {
      stdout: "piped",
      stderr: "piped",
    });
    const { stdout } = await command.output();
    return { uptime: new TextDecoder().decode(stdout).trim() };
  },
});
