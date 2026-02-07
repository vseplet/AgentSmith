import fetchify from "@vseplet/fetchify";
import * as v from "@valibot/valibot";
import { getLLMProvider } from "#config";
import type { CompletionResult, Message, ProviderConfig, ToolCall, ToolPayload } from "#types";

import { getProviderConfig as getDeepSeekConfig } from "./deepseek.ts";
import { getProviderConfig as getLMStudioConfig } from "./lmstudio.ts";

const PROVIDERS: Record<string, () => Promise<ProviderConfig>> = {
  deepseek: getDeepSeekConfig,
  lmstudio: getLMStudioConfig,
};

export async function resolveProvider(): Promise<ProviderConfig> {
  const providerName = (await getLLMProvider()) ?? "deepseek";
  const factory = PROVIDERS[providerName];
  if (!factory) {
    const available = Object.keys(PROVIDERS).join(", ");
    throw new Error(
      `Unknown LLM provider: "${providerName}". Available: ${available}`,
    );
  }
  return await factory();
}

// deno-lint-ignore no-explicit-any
const _fetchify = fetchify as any;

function createClient(config: ProviderConfig) {
  return _fetchify.create({
    baseURL: config.baseURL,
    headers: config.headers,
    limiter: { rps: config.rps },
  });
}

// ============================================
// API Response Validation
// ============================================

const ToolCallSchema = v.object({
  id: v.string(),
  type: v.literal("function"),
  function: v.object({
    name: v.string(),
    arguments: v.string(),
  }),
});

const UsageSchema = v.object({
  prompt_tokens: v.number(),
  completion_tokens: v.number(),
  total_tokens: v.number(),
});

const ChatResponseSchema = v.object({
  choices: v.array(
    v.object({
      message: v.object({
        role: v.string(),
        content: v.nullable(v.string()),
        tool_calls: v.optional(v.array(ToolCallSchema)),
      }),
      finish_reason: v.string(),
    }),
  ),
  usage: v.optional(UsageSchema),
});

async function parseResponse(
  response: Response,
  providerName: string,
): Promise<v.InferOutput<typeof ChatResponseSchema>> {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${providerName} API error: ${response.status} ${error}`);
  }
  const json = await response.json();
  return v.parse(ChatResponseSchema, json);
}

export async function complete(
  messages: Message[],
  tools?: ToolPayload[],
  provider?: ProviderConfig,
): Promise<CompletionResult> {
  const p = provider ?? await resolveProvider();
  const client = createClient(p);

  const body = {
    model: p.model,
    messages,
    ...(tools && tools.length > 0 && {
      tools,
      tool_choice: "auto",
    }),
  };

  const response = await client.post("/chat/completions", {
    body: JSON.stringify(body),
  });
  const data = await parseResponse(response, p.name);

  const choice = data.choices[0];
  return {
    message: {
      role: choice.message.role,
      content: choice.message.content ?? null,
      tool_calls: choice.message.tool_calls,
    },
    finishReason: choice.finish_reason,
    usage: data.usage
      ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      }
      : undefined,
  };
}

export async function summarize(
  text: string,
  provider?: ProviderConfig,
): Promise<string> {
  const result = await complete(
    [
      {
        role: "system",
        content:
          "Summarize the following conversation in 2-3 sentences. Focus on key topics and decisions made.",
      },
      { role: "user", content: text },
    ],
    undefined,
    provider,
  );
  return result.message.content ?? "";
}
