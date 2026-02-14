import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";
import { cfg, setCfg } from "$/core/config.ts";
import { getProfileNames } from "$/profiles";

export const profileSwitchTool = defineTool({
  name: "switch_profile",
  description:
    "Switch the agent personality profile. Call this when user wants to change personality or switch to a different character.",
  parameters: v.object({
    profile: v.optional(v.pipe(v.string(), v.description("Profile name to switch to."))),
    list: v.optional(v.pipe(v.boolean(), v.description("If true, just list available profiles without switching."))),
  }),
  execute: async (args) => {
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
});
