import type { Message, Tool } from "$/core/types.ts";
import { complete, getProviderNames, resolveProvider } from "$/core/llms/mod.ts";

export const askLlmTool: Tool = {
  name: "ask_llm",
  description:
    "Send a prompt to any available LLM provider and get a response. Use this to query a different model without switching the main provider, or to compare answers from multiple models.",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The prompt to send to the LLM.",
      },
      provider: {
        type: "string",
        description: "Provider name (deepseek, openai, anthropic, ollama, lmstudio, openai-oauth). If omitted, uses current provider.",
      },
      system: {
        type: "string",
        description: "Optional system prompt.",
      },
    },
    required: ["prompt"],
  },
  execute: async (args: { prompt: string; provider?: string; system?: string }) => {
    if (args.provider && !getProviderNames().includes(args.provider)) {
      return { error: `Unknown provider: ${args.provider}`, available: getProviderNames() };
    }

    try {
      const provider = await resolveProvider(args.provider);
      const messages: Message[] = [];

      if (args.system) {
        messages.push({ role: "system", content: args.system });
      }
      messages.push({ role: "user", content: args.prompt });

      const result = await complete(messages, undefined, provider);
      return {
        response: result.message.content,
        provider: provider.name,
        model: provider.model,
        tokens: result.usage?.totalTokens ?? null,
      };
    } catch (error) {
      return { error: String(error) };
    }
  },
};
