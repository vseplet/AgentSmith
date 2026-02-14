import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";

export const psTool = defineTool({
  name: "list_processes",
  description:
    "List running processes. Can filter by name, sort by CPU or memory usage, or show top N processes.",
  parameters: v.object({
    filter: v.optional(v.pipe(v.string(), v.description("Filter processes by name (grep pattern)"))),
    sort_by: v.optional(v.pipe(v.picklist(["cpu", "memory", "pid"]), v.description("Sort by CPU usage, memory usage, or PID. Default: cpu"))),
    limit: v.optional(v.pipe(v.number(), v.description("Limit number of results. Default: 10"))),
  }),
  execute: async (args) => {
    const filter = args.filter;
    const sortBy = args.sort_by ?? "cpu";
    const limit = args.limit ?? 10;

    const command = new Deno.Command("ps", {
      args: ["aux"],
      stdout: "piped",
      stderr: "piped",
    });

    const { stdout } = await command.output();
    const lines = new TextDecoder().decode(stdout).trim().split("\n");

    const header = lines[0];
    let processes = lines.slice(1);

    if (filter) {
      processes = processes.filter((line) =>
        line.toLowerCase().includes(filter.toLowerCase())
      );
    }

    if (sortBy === "cpu") {
      processes.sort((a, b) => {
        const cpuA = parseFloat(a.split(/\s+/)[2]) || 0;
        const cpuB = parseFloat(b.split(/\s+/)[2]) || 0;
        return cpuB - cpuA;
      });
    } else if (sortBy === "memory") {
      processes.sort((a, b) => {
        const memA = parseFloat(a.split(/\s+/)[3]) || 0;
        const memB = parseFloat(b.split(/\s+/)[3]) || 0;
        return memB - memA;
      });
    }

    processes = processes.slice(0, limit);

    return {
      header,
      processes,
      total: processes.length,
    };
  },
});
