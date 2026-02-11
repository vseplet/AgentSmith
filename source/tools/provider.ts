import type { Tool } from "$/core/types.ts";
import { cfg, setCfg } from "$/core/config.ts";
import { getProviderNames } from "$/core/llms/mod.ts";

export const providerSwitchTool: Tool = {
  name: "switch_llm_provider",
  description:
    "Switch the LLM provider. Call this when user wants to change the AI model or provider (e.g. switch to openai, deepseek, anthropic, ollama, lmstudio).",
  parameters: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        description: "Provider name to switch to.",
      },
      list: {
        type: "boolean",
        description: "If true, just list available providers without switching.",
      },
    },
  },
  execute: async (args: { provider?: string; list?: boolean }) => {
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
};
