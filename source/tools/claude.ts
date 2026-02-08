import type { Tool } from "$/core/types.ts";

export const claudeTool: Tool = {
  name: "ask_claude",
  description:
    "Ask Claude Code CLI a question or give it a task. Returns text response",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The question or task for Claude Code",
      },
    },
    required: ["prompt"],
  },
  execute: async (args) => {
    const prompt = args.prompt as string;

    try {
      const command = new Deno.Command("claude", {
        args: ["-p", prompt],
        stdout: "piped",
        stderr: "piped",
      });

      const process = command.spawn();

      // Таймаут 60 секунд
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
};
