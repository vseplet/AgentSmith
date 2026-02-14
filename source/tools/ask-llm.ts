import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";
import type { Message } from "$/core/types.ts";
import { complete, getProviderNames, resolveProvider } from "$/core/llms/mod.ts";

export const askLlmTool = defineTool({
  name: "ask_llm",
  description:
    "Send a prompt to any available LLM provider and get a response. Use this to query a different model without switching the main provider, or to compare answers from multiple models.",
  parameters: v.object({
    prompt: v.pipe(v.string(), v.description("The prompt to send to the LLM.")),
    provider: v.optional(v.pipe(v.string(), v.description("Provider name (deepseek, openai, anthropic, ollama, lmstudio, openai-oauth). If omitted, uses current provider."))),
    system: v.optional(v.pipe(v.string(), v.description("Optional system prompt."))),
  }),
  execute: async (args) => {
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
});
