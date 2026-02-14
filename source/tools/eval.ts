import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";

export const evalTool = defineTool({
  name: "eval_code",
  description:
    "Execute JavaScript/TypeScript code in a sandboxed Deno environment (no permissions). Use for calculations, data processing, string manipulation, algorithms. Returns the result of the last expression.",
  dangerous: true,
  parameters: v.object({
    code: v.pipe(v.string(), v.description("JavaScript/TypeScript code to execute. The result of the last expression is returned.")),
  }),
  execute: async (args) => {
    const wrappedCode = `
const __result = (async () => {
  ${args.code}
})();
__result.then(r => console.log(JSON.stringify(r ?? null))).catch(e => console.error(e.message));
`;

    const command = new Deno.Command("deno", {
      args: ["eval", "--no-prompt", wrappedCode],
      stdout: "piped",
      stderr: "piped",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const process = command.spawn();
      const { stdout, stderr } = await process.output();
      clearTimeout(timeout);

      const out = new TextDecoder().decode(stdout).trim();
      const err = new TextDecoder().decode(stderr).trim();

      if (err) {
        return { error: err };
      }

      try {
        return { result: JSON.parse(out) };
      } catch {
        return { result: out || null };
      }
    } catch (e) {
      clearTimeout(timeout);
      return { error: e instanceof Error ? e.message : "Execution failed" };
    }
  },
});
