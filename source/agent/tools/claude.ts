import { Tool } from "#deepseek";

export const claudeTool: Tool = {
  name: "ask_claude",
  description:
    "Ask Claude Code CLI a question or give it a task. Use this when user wants to delegate a coding task or question to Claude.",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The question or task for Claude Code",
      },
      print_only: {
        type: "boolean",
        description:
          "If true, just print response without executing. Default: true",
      },
    },
    required: ["prompt"],
  },
  execute: async (args) => {
    const prompt = args.prompt as string;
    const printOnly = args.print_only !== false;

    const cmdArgs = ["--print"];
    if (printOnly) {
      cmdArgs.push("--no-edit");
    }
    cmdArgs.push(prompt);

    const command = new Deno.Command("claude", {
      args: cmdArgs,
      stdout: "piped",
      stderr: "piped",
    });

    const { stdout, stderr } = await command.output();
    const out = new TextDecoder().decode(stdout).trim();
    const err = new TextDecoder().decode(stderr).trim();

    if (err && !out) {
      return { error: err };
    }

    return {
      response: out.slice(0, 4000), // Limit response size
      truncated: out.length > 4000,
    };
  },
};
