import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";

export const claudeTool = defineTool({
  name: "ask_claude",
  description:
    "Ask Claude Code CLI a question or give it a task. Returns text response",
  parameters: v.object({
    prompt: v.pipe(v.string(), v.description("The question or task for Claude Code")),
  }),
  execute: async (args) => {
    try {
      const command = new Deno.Command("claude", {
        args: ["-p", args.prompt],
        stdout: "piped",
        stderr: "piped",
      });

      const process = command.spawn();

      const timeout = setTimeout(() => {
        try {
          process.kill();
        } catch { /* already dead */ }
      }, 60_000);

      const { stdout, stderr, success } = await process.output();
      clearTimeout(timeout);

      const out = new TextDecoder().decode(stdout).trim();
      const err = new TextDecoder().decode(stderr).trim();

      if (!success && err) {
        return { error: err.slice(0, 2000) };
      }

      return {
        response: out.slice(0, 4000),
        truncated: out.length > 4000,
      };
    } catch (error) {
      return { error: `Failed to run claude: ${String(error)}` };
    }
  },
});
