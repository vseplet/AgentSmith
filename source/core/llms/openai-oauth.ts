import { cfg, setCfg } from "$/core/config.ts";
import type {
  CompletionResult,
  Message,
  ProviderConfig,
  ProviderSetupField,
  ToolPayload,
} from "$/core/types.ts";

// ============================================
// OAuth PKCE
// ============================================

const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_AUTH_URL = "https://auth.openai.com/oauth/authorize";
const OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token";
const CALLBACK_PORT = 1455;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/auth/callback`;

function base64url(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(hash));
}

function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function openBrowser(url: string): Promise<void> {
  const cmd = Deno.build.os === "darwin"
    ? ["open", url]
    : Deno.build.os === "windows"
      ? ["cmd", "/c", "start", url]
      : ["xdg-open", url];

  const process = new Deno.Command(cmd[0], { args: cmd.slice(1) });
  const child = process.spawn();
  await child.status;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
}

async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: OPENAI_CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${err}`);
  }

  return await res.json() as OAuthTokens;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: OPENAI_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${err}`);
  }

  const data = await res.json() as OAuthTokens;

  await setCfg("llm.openai.apiKey", data.access_token);
  if (data.refresh_token) {
    await setCfg("llm.chatgpt.refreshToken", data.refresh_token);
  }

  return data.access_token;
}

async function performOAuthFlow(): Promise<OAuthTokens> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  const authUrl = new URL(OPENAI_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", OPENAI_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", "openid profile email offline_access");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("id_token_add_organizations", "true");
  authUrl.searchParams.set("codex_cli_simplified_flow", "true");

  const { promise: codePromise, resolve: resolveCode, reject: rejectCode } =
    Promise.withResolvers<string>();

  const server = Deno.serve(
    { port: CALLBACK_PORT, hostname: "127.0.0.1" },
    (req) => {
      const url = new URL(req.url);
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const returnedState = url.searchParams.get("state");

        if (error) {
          rejectCode(new Error(`OAuth error: ${error}`));
          return new Response(
            "<html><body><h2>Authentication failed</h2><p>You can close this tab.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }

        if (returnedState !== state) {
          rejectCode(new Error("OAuth state mismatch"));
          return new Response(
            "<html><body><h2>Authentication failed</h2><p>State mismatch. You can close this tab.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }

        if (code) {
          resolveCode(code);
          return new Response(
            "<html><body><h2>Authentication successful!</h2><p>You can close this tab.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }
      }

      return new Response("Not found", { status: 404 });
    },
  );

  console.log("  Opening browser for OpenAI authentication...");
  await openBrowser(authUrl.toString());
  console.log("  Waiting for authorization...");

  try {
    const code = await codePromise;
    const tokens = await exchangeCode(code, codeVerifier);

    await setCfg("llm.openai.apiKey", tokens.access_token);
    if (tokens.refresh_token) {
      await setCfg("llm.chatgpt.refreshToken", tokens.refresh_token);
    }

    return tokens;
  } finally {
    await server.shutdown();
  }
}

// ============================================
// Setup
// ============================================

const CHATGPT_BASE_URL = "https://chatgpt.com/backend-api/codex";

const CHATGPT_MODELS = [
  "gpt-5.2-codex",
  "gpt-5.1-codex-max",
  "gpt-5.2",
  "gpt-5.1-codex-mini",
];

export const setupFields: ProviderSetupField[] = [
  {
    key: "llm.openai.apiKey",
    label: "ChatGPT authentication",
    secret: true,
    resolve: async () => {
      const tokens = await performOAuthFlow();
      return tokens.access_token;
    },
  },
  {
    key: "llm.openai.model",
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
  let apiKey = cfg("llm.openai.apiKey");
  if (!apiKey) throw new Error("ChatGPT not configured, run: smith setup llm");

  const refreshToken = cfg("llm.chatgpt.refreshToken");
  if (refreshToken) {
    try {
      apiKey = await refreshAccessToken(refreshToken);
    } catch {
      // refresh failed, use existing token
    }
  }

  const model = cfg("llm.openai.model") ?? "gpt-5.2-codex";

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

function convertMessages(
  messages: Message[],
): { instructions: string; input: unknown[] } {
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

  return {
    instructions: instructions.join("\n\n") || "You are a helpful assistant.",
    input,
  };
}

function convertToolsToResponsesFormat(tools: ToolPayload[]): unknown[] {
  return tools.map((t) => ({
    type: "function",
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }));
}

function parseResponsesApiResult(
  data: Record<string, unknown>,
): CompletionResult {
  const output = data.output as Record<string, unknown>[];

  let textContent: string | null = null;
  const toolCalls: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[] = [];

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

async function readSSEResponse(
  res: Response,
): Promise<Record<string, unknown>> {
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
    throw new Error(
      "ChatGPT Responses API: no response.completed event received",
    );
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
