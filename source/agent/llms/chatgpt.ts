import {
  getOpenAIApiKey,
  getOpenAIModelName,
  getChatGPTRefreshToken,
  ConfigKey,
} from "#config";
import type { CompletionResult, Message, ProviderConfig, ProviderSetupField, ToolPayload } from "#types";
import { performOAuthFlow, refreshAccessToken } from "./oauth.ts";

const CHATGPT_BASE_URL = "https://chatgpt.com/backend-api/codex";

const CHATGPT_MODELS = [
  "gpt-5.2-codex",
  "gpt-5.1-codex-max",
  "gpt-5.2",
  "gpt-5.1-codex-mini",
];

// ============================================
// Setup
// ============================================

export const setupFields: ProviderSetupField[] = [
  {
    key: ConfigKey.OPENAI_API_KEY,
    label: "ChatGPT authentication",
    secret: true,
    resolve: async () => {
      const tokens = await performOAuthFlow();
      return tokens.access_token;
    },
  },
  {
    key: ConfigKey.OPENAI_MODEL_NAME,
    label: "ChatGPT model",
    secret: false,
    default: "gpt-5.2-codex",
    options: () => Promise.resolve(CHATGPT_MODELS),
  },
];

// ============================================
// Provider Config
// ============================================

export async function getProviderConfig(): Promise<ProviderConfig> {
  let apiKey = await getOpenAIApiKey();
  if (!apiKey) throw new Error("ChatGPT not configured, run: smith setup llm");

  const refreshToken = await getChatGPTRefreshToken();
  if (refreshToken) {
    try {
      apiKey = await refreshAccessToken(refreshToken);
    } catch {
      // refresh failed, use existing token
    }
  }

  const model = (await getOpenAIModelName()) ?? "gpt-5.2-codex";

  return {
    name: "openai-oauth",
    baseURL: CHATGPT_BASE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    model,
    rps: 5,
  };
}

// ============================================
// Responses API
// ============================================

function convertMessages(messages: Message[]): { instructions: string; input: unknown[] } {
  const instructions: string[] = [];
  const input: unknown[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      instructions.push(msg.content);
    } else if (msg.role === "user") {
      input.push({ role: "user", content: msg.content });
    } else if (msg.role === "assistant") {
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          input.push({
            type: "function_call",
            id: tc.id,
            call_id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          });
        }
      } else {
        input.push({ role: "assistant", content: msg.content ?? "" });
      }
    } else if (msg.role === "tool") {
      input.push({
        type: "function_call_output",
        call_id: msg.tool_call_id,
        output: msg.content,
      });
    }
  }

  return { instructions: instructions.join("\n\n") || "You are a helpful assistant.", input };
}

function convertToolsToResponsesFormat(tools: ToolPayload[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));
}

function parseResponsesApiResult(data: Record<string, unknown>): CompletionResult {
  const output = data.output as Record<string, unknown>[];

  let textContent: string | null = null;
  const toolCalls: { id: string; type: "function"; function: { name: string; arguments: string } }[] = [];

  for (const item of output) {
    if (item.type === "message") {
      const content = item.content as { type: string; text: string }[];
      if (content && content.length > 0) {
        textContent = content.map((c) => c.text).join("");
      }
    } else if (item.type === "function_call") {
      const callId = item.id as string;
      toolCalls.push({
        id: callId,
        type: "function",
        function: {
          name: item.name as string,
          arguments: item.arguments as string,
        },
      });
    }
  }

  const usage = data.usage as Record<string, number> | undefined;

  return {
    message: {
      role: "assistant",
      content: textContent,
      ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
    },
    finishReason: toolCalls.length > 0 ? "tool_calls" : "stop",
    usage: usage
      ? {
        promptTokens: usage.input_tokens ?? 0,
        completionTokens: usage.output_tokens ?? 0,
        totalTokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      }
      : undefined,
  };
}

async function readSSEResponse(res: Response): Promise<Record<string, unknown>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  // deno-lint-ignore no-explicit-any
  let completed: any = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const event = JSON.parse(data);
        if (event.type === "response.completed") {
          completed = event.response;
        }
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  if (!completed) {
    throw new Error("ChatGPT Responses API: no response.completed event received");
  }
  return completed;
}

export async function complete(
  messages: Message[],
  tools?: ToolPayload[],
): Promise<CompletionResult | null> {
  const config = await getProviderConfig();
  const { instructions, input } = convertMessages(messages);

  const body: Record<string, unknown> = {
    model: config.model,
    instructions,
    input,
    store: false,
    stream: true,
  };

  if (tools && tools.length > 0) {
    body.tools = convertToolsToResponsesFormat(tools);
  }

  const res = await fetch(`${config.baseURL}/responses`, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ChatGPT Responses API error: ${res.status} ${error}`);
  }

  const data = await readSSEResponse(res);
  return parseResponsesApiResult(data);
}
