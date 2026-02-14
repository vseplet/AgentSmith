import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";
import { cfg, setCfg } from "$/core/config.ts";
import { getProviderNames } from "$/core/llms/mod.ts";

export const providerSwitchTool = defineTool({
  name: "switch_llm_provider",
  description:
    "Switch the LLM provider. Call this when user wants to change the AI model or provider (e.g. switch to openai, deepseek, anthropic, ollama, lmstudio).",
  parameters: v.object({
    provider: v.optional(v.pipe(v.string(), v.description("Provider name to switch to."))),
    list: v.optional(v.pipe(v.boolean(), v.description("If true, just list available providers without switching."))),
  }),
  execute: async (args) => {
    const available = getProviderNames();

    if (args.list) {
      const current = cfg("llm.provider");
      return { current, available };
    }

    if (!args.provider) {
      return { error: "Provider name is required" };
    }

    if (!available.includes(args.provider)) {
      return { error: `Unknown provider: ${args.provider}`, available };
    }

    await setCfg("llm.provider", args.provider);
    return { switched: args.provider, note: "Provider will take effect on next message" };
  },
});
