import type { Tool } from "#types";

export const psTool: Tool = {
  name: "list_processes",
  description:
    "List running processes. Can filter by name, sort by CPU or memory usage, or show top N processes.",
  parameters: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Filter processes by name (grep pattern)",
      },
      sort_by: {
        type: "string",
        enum: ["cpu", "memory", "pid"],
        description: "Sort by CPU usage, memory usage, or PID. Default: cpu",
      },
      limit: {
        type: "number",
        description: "Limit number of results. Default: 10",
      },
    },
  },
  execute: async (args) => {
    const filter = args.filter as string | undefined;
    const sortBy = (args.sort_by as string) || "cpu";
    const limit = (args.limit as number) || 10;

    const command = new Deno.Command("ps", {
      args: ["aux"],
      stdout: "piped",
      stderr: "piped",
    });

    const { stdout } = await command.output();
    const lines = new TextDecoder().decode(stdout).trim().split("\n");

    const header = lines[0];
    let processes = lines.slice(1);

    // Filter by name if specified
    if (filter) {
      processes = processes.filter((line) =>
        line.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // Sort
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

    // Limit results
    processes = processes.slice(0, limit);

    return {
      header,
      processes,
      total: processes.length,
    };
  },
};
