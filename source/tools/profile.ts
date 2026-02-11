import type { Tool } from "$/core/types.ts";
import { cfg, setCfg } from "$/core/config.ts";
import { getProfileNames } from "$/profiles";

export const profileSwitchTool: Tool = {
  name: "switch_profile",
  description:
    "Switch the agent personality profile. Call this when user wants to change personality or switch to a different character.",
  parameters: {
    type: "object",
    properties: {
      profile: {
        type: "string",
        description: "Profile name to switch to.",
      },
      list: {
        type: "boolean",
        description: "If true, just list available profiles without switching.",
      },
    },
  },
  execute: async (args: { profile?: string; list?: boolean }) => {
    const available = getProfileNames();

    if (args.list) {
      const current = cfg("agent.profile");
      return { current, available };
    }

    if (!args.profile) {
      return { error: "Profile name is required" };
    }

    if (!available.includes(args.profile)) {
      return { error: `Unknown profile: ${args.profile}`, available };
    }

    await setCfg("agent.profile", args.profile);
    return { switched: args.profile, note: "Profile will take effect on next message" };
  },
};
