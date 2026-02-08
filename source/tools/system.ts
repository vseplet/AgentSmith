import type { Tool } from "$/core/types.ts";

export const systemInfoTool: Tool = {
  name: "get_system_info",
  description:
    "Get system information: hostname, OS, memory, disk, CPU, network, or processes. Use to learn about the host machine.",
  parameters: {
    type: "object",
    properties: {
      info_type: {
        type: "string",
        enum: ["host", "memory", "disk", "cpu", "network", "processes", "all"],
        description:
          "Type of system info: host (hostname, OS, user), memory, disk, cpu, network (IP, interfaces), processes, or all",
      },
    },
    required: ["info_type"],
  },
  execute: async (args) => {
    const infoType = args.info_type as string;
    const results: Record<string, string> = {};

    const run = async (cmd: string, cmdArgs: string[]) => {
      const command = new Deno.Command(cmd, {
        args: cmdArgs,
        stdout: "piped",
        stderr: "piped",
      });
      const { stdout } = await command.output();
      return new TextDecoder().decode(stdout).trim();
    };

    if (infoType === "host" || infoType === "all") {
      const hostname = await run("hostname", []);
      const whoami = await run("whoami", []);
      const uname = await run("uname", ["-a"]);
      results.host = `Hostname: ${hostname}\nUser: ${whoami}\nOS: ${uname}`;
    }

    if (infoType === "memory" || infoType === "all") {
      try {
        results.memory = await run("vm_stat", []);
      } catch {
        results.memory = await run("free", ["-h"]);
      }
    }

    if (infoType === "disk" || infoType === "all") {
      results.disk = await run("df", ["-h"]);
    }

    if (infoType === "cpu" || infoType === "all") {
      try {
        // macOS
        const cpuInfo = await run("sysctl", ["-n", "machdep.cpu.brand_string"]);
        const cpuCores = await run("sysctl", ["-n", "hw.ncpu"]);
        results.cpu = `CPU: ${cpuInfo}\nCores: ${cpuCores}`;
      } catch {
        // Linux
        results.cpu = await run("lscpu", []);
      }
    }

    if (infoType === "network" || infoType === "all") {
      try {
        const ifconfig = await run("ifconfig", []);
        // Extract IP addresses
        const ips = ifconfig.match(/inet [\d.]+/g)?.join(", ") || "unknown";
        results.network = `IPs: ${ips}`;
      } catch {
        results.network = await run("ip", ["addr"]);
      }
    }

    if (infoType === "processes" || infoType === "all") {
      results.processes = await run("ps", ["aux"]).then(
        (out) => out.split("\n").slice(0, 15).join("\n"),
      );
    }

    return results;
  },
};

export const shellTool: Tool = {
  name: "run_shell_command",
  description:
    "Execute a shell command and return the output. Use for any terminal commands like ls, cat, grep, etc.",
  dangerous: true,
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
    },
    required: ["command"],
  },
  execute: async (args) => {
    const cmd = args.command as string;

    const command = new Deno.Command("sh", {
      args: ["-c", cmd],
      stdout: "piped",
      stderr: "piped",
    });

    const { stdout, stderr } = await command.output();
    const out = new TextDecoder().decode(stdout).trim();
    const err = new TextDecoder().decode(stderr).trim();

    return {
      stdout: out || "(no output)",
      stderr: err || undefined,
    };
  },
};
