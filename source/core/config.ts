import { getKv } from "$/core/common.ts";

const CONFIG_SCHEMA = {
  "agent.profile":              { env: "AGENT_PROFILE",           default: "default" },
  "llm.provider":               { env: "LLM_PROVIDER" },
  "llm.deepseek.apiKey":        { env: "DEEPSEEK_API_KEY" },
  "llm.deepseek.model":         { env: "DEEPSEEK_MODEL_NAME",     default: "deepseek-chat" },
  "llm.lmstudio.baseUrl":       { env: "LMSTUDIO_BASE_URL",       default: "http://localhost:1234/v1" },
  "llm.lmstudio.model":         { env: "LMSTUDIO_MODEL_NAME" },
  "llm.ollama.baseUrl":         { env: "OLLAMA_BASE_URL",         default: "http://localhost:11434/v1" },
  "llm.ollama.model":           { env: "OLLAMA_MODEL_NAME" },
  "llm.openai.apiKey":          { env: "OPENAI_API_KEY" },
  "llm.openai.model":           { env: "OPENAI_MODEL_NAME",       default: "gpt-4o" },
  "llm.chatgpt.refreshToken":   { env: "CHATGPT_REFRESH_TOKEN" },
  "llm.anthropic.apiKey":       { env: "ANTHROPIC_API_KEY" },
  "llm.anthropic.model":        { env: "ANTHROPIC_MODEL_NAME",    default: "claude-sonnet-4-20250514" },
  "telegram.botApiKey":         { env: "TELEGRAM_BOT_API_KEY" },
  "telegram.userId":            { env: "TELEGRAM_USER_ID" },
  "telegram.code":              { env: "TELEGRAM_CODE" },
  "moltbook.apiKey":            { env: "MOLTBOOK_API_KEY" },
} as const;

export type ConfigPath = keyof typeof CONFIG_SCHEMA;

const KV_PREFIX = ["config"] as const;

const cache: Record<string, string | null> = {};

export async function loadConfig(): Promise<void> {
  const store = await getKv();
  const paths = Object.keys(CONFIG_SCHEMA) as ConfigPath[];

  for (const path of paths) {
    const entry = CONFIG_SCHEMA[path];

    // Priority: ENV -> KV -> default
    const envValue = Deno.env.get(entry.env);
    if (envValue && envValue.trim() !== "") {
      cache[path] = envValue;
      continue;
    }

    const kvResult = await store.get<string>([...KV_PREFIX, path]);
    if (kvResult.value !== null) {
      cache[path] = kvResult.value;
      continue;
    }

    cache[path] = "default" in entry ? entry.default : null;
  }
}

export function cfg(path: ConfigPath): string | null {
  return cache[path] ?? null;
}

export async function setCfg(path: ConfigPath, value: string): Promise<void> {
  const store = await getKv();
  await store.set([...KV_PREFIX, path], value);
  cache[path] = value;
}

export function allConfig(): Record<ConfigPath, string | null> {
  const result: Record<string, string | null> = {};
  for (const path of Object.keys(CONFIG_SCHEMA) as ConfigPath[]) {
    result[path] = cache[path] ?? null;
  }
  return result as Record<ConfigPath, string | null>;
}
