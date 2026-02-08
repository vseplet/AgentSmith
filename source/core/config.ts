import { ConfigKey } from "$/core/types.ts";
import type { Config, ConfigKeyType } from "$/core/types.ts";
import { getKv } from "$/core/common.ts";

export { ConfigKey };
export type { Config, ConfigKeyType };

// Mapping from KV keys to ENV variable names
const ENV_KEY_MAP: Record<ConfigKeyType, string> = {
  [ConfigKey.AGENT_PROFILE]: "AGENT_PROFILE",
  [ConfigKey.LLM_PROVIDER]: "LLM_PROVIDER",
  [ConfigKey.DEEPSEEK_API_KEY]: "DEEPSEEK_API_KEY",
  [ConfigKey.DEEPSEEK_MODEL_NAME]: "DEEPSEEK_MODEL_NAME",
  [ConfigKey.LMSTUDIO_BASE_URL]: "LMSTUDIO_BASE_URL",
  [ConfigKey.LMSTUDIO_MODEL_NAME]: "LMSTUDIO_MODEL_NAME",
  [ConfigKey.OLLAMA_BASE_URL]: "OLLAMA_BASE_URL",
  [ConfigKey.OLLAMA_MODEL_NAME]: "OLLAMA_MODEL_NAME",
  [ConfigKey.OPENAI_API_KEY]: "OPENAI_API_KEY",
  [ConfigKey.OPENAI_MODEL_NAME]: "OPENAI_MODEL_NAME",
  [ConfigKey.CHATGPT_REFRESH_TOKEN]: "CHATGPT_REFRESH_TOKEN",
  [ConfigKey.ANTHROPIC_API_KEY]: "ANTHROPIC_API_KEY",
  [ConfigKey.ANTHROPIC_MODEL_NAME]: "ANTHROPIC_MODEL_NAME",
  [ConfigKey.TELEGRAM_BOT_API_KEY]: "TELEGRAM_BOT_API_KEY",
  [ConfigKey.TELEGRAM_USER_ID]: "TELEGRAM_USER_ID",
  [ConfigKey.TELEGRAM_CODE]: "TELEGRAM_CODE",
  [ConfigKey.MOLTBOOK_API_KEY]: "MOLTBOOK_API_KEY",
};

// Default values
const DEFAULTS: Partial<Record<ConfigKeyType, string>> = {
  [ConfigKey.AGENT_PROFILE]: "smith",
  [ConfigKey.LLM_PROVIDER]: "deepseek",
  [ConfigKey.DEEPSEEK_MODEL_NAME]: "deepseek-chat",
  [ConfigKey.LMSTUDIO_BASE_URL]: "http://localhost:1234/v1",
  [ConfigKey.OLLAMA_BASE_URL]: "http://localhost:11434/v1",
  [ConfigKey.OPENAI_MODEL_NAME]: "gpt-4o",
  [ConfigKey.ANTHROPIC_MODEL_NAME]: "claude-sonnet-4-20250514",
};

// Get value from environment variable
function getEnvValue(key: ConfigKeyType): string | null {
  const envKey = ENV_KEY_MAP[key];
  const value = Deno.env.get(envKey);
  return value && value.trim() !== "" ? value : null;
}

// KV prefix for config storage
const KV_PREFIX = ["config"] as const;

// Get value directly from KV (for testing)
export async function getKvValue(key: ConfigKeyType): Promise<string | null> {
  const store = await getKv();
  const result = await store.get<string>([...KV_PREFIX, key]);
  return result.value;
}

// Generic config functions
// Priority: ENV -> KV -> DEFAULTS
export async function getConfigValue(
  key: ConfigKeyType,
): Promise<string | null> {
  // First, check environment variable
  const envValue = getEnvValue(key);
  if (envValue !== null) {
    return envValue;
  }

  // Then, check KV storage
  const store = await getKv();
  const result = await store.get<string>([...KV_PREFIX, key]);
  if (result.value !== null) {
    return result.value;
  }

  // Fallback to defaults
  return DEFAULTS[key] ?? null;
}

export async function setConfigValue(
  key: ConfigKeyType,
  value: string,
): Promise<void> {
  const store = await getKv();
  await store.set([...KV_PREFIX, key], value);
}

export async function deleteConfigValue(key: ConfigKeyType): Promise<void> {
  const store = await getKv();
  await store.delete([...KV_PREFIX, key]);
}

export async function getAllConfig(): Promise<Config> {
  const keys = Object.values(ConfigKey) as ConfigKeyType[];
  const values = await Promise.all(keys.map((k) => getConfigValue(k)));
  const config: Record<string, string | null> = {};
  keys.forEach((key, i) => {
    config[key] = values[i];
  });
  return config as unknown as Config;
}

// Agent Profile helpers
export async function getAgentProfile(): Promise<string | null> {
  return await getConfigValue(ConfigKey.AGENT_PROFILE);
}

export async function setAgentProfile(profile: string): Promise<void> {
  await setConfigValue(ConfigKey.AGENT_PROFILE, profile);
}

// LLM Provider helpers
export async function getLLMProvider(): Promise<string | null> {
  return await getConfigValue(ConfigKey.LLM_PROVIDER);
}

export async function setLLMProvider(provider: string): Promise<void> {
  await setConfigValue(ConfigKey.LLM_PROVIDER, provider);
}

// DeepSeek API key helpers
export async function getDeepSeekApiKey(): Promise<string | null> {
  return await getConfigValue(ConfigKey.DEEPSEEK_API_KEY);
}

export async function setDeepSeekApiKey(apiKey: string): Promise<void> {
  await setConfigValue(ConfigKey.DEEPSEEK_API_KEY, apiKey);
}

// DeepSeek model name helpers
export async function getDeepSeekModelName(): Promise<string | null> {
  return await getConfigValue(ConfigKey.DEEPSEEK_MODEL_NAME);
}

export async function setDeepSeekModelName(modelName: string): Promise<void> {
  await setConfigValue(ConfigKey.DEEPSEEK_MODEL_NAME, modelName);
}

// LMStudio helpers
export async function getLMStudioBaseURL(): Promise<string | null> {
  return await getConfigValue(ConfigKey.LMSTUDIO_BASE_URL);
}

export async function setLMStudioBaseURL(url: string): Promise<void> {
  await setConfigValue(ConfigKey.LMSTUDIO_BASE_URL, url);
}

export async function getLMStudioModelName(): Promise<string | null> {
  return await getConfigValue(ConfigKey.LMSTUDIO_MODEL_NAME);
}

export async function setLMStudioModelName(modelName: string): Promise<void> {
  await setConfigValue(ConfigKey.LMSTUDIO_MODEL_NAME, modelName);
}

// Ollama helpers
export async function getOllamaBaseURL(): Promise<string | null> {
  return await getConfigValue(ConfigKey.OLLAMA_BASE_URL);
}

export async function getOllamaModelName(): Promise<string | null> {
  return await getConfigValue(ConfigKey.OLLAMA_MODEL_NAME);
}

// OpenAI helpers
export async function getOpenAIApiKey(): Promise<string | null> {
  return await getConfigValue(ConfigKey.OPENAI_API_KEY);
}

export async function getOpenAIModelName(): Promise<string | null> {
  return await getConfigValue(ConfigKey.OPENAI_MODEL_NAME);
}

// ChatGPT OAuth helpers
export async function getChatGPTRefreshToken(): Promise<string | null> {
  return await getConfigValue(ConfigKey.CHATGPT_REFRESH_TOKEN);
}

// Anthropic helpers
export async function getAnthropicApiKey(): Promise<string | null> {
  return await getConfigValue(ConfigKey.ANTHROPIC_API_KEY);
}

export async function getAnthropicModelName(): Promise<string | null> {
  return await getConfigValue(ConfigKey.ANTHROPIC_MODEL_NAME);
}

// Telegram Bot API key helpers
export async function getTelegramBotApiKey(): Promise<string | null> {
  return await getConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY);
}

export async function setTelegramBotApiKey(apiKey: string): Promise<void> {
  await setConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY, apiKey);
}

// Telegram User ID helpers
export async function getTelegramUserId(): Promise<string | null> {
  return await getConfigValue(ConfigKey.TELEGRAM_USER_ID);
}

export async function setTelegramUserId(userId: string): Promise<void> {
  await setConfigValue(ConfigKey.TELEGRAM_USER_ID, userId);
}

// Telegram Code helpers
export async function getTelegramCode(): Promise<string | null> {
  return await getConfigValue(ConfigKey.TELEGRAM_CODE);
}

export async function setTelegramCode(code: string): Promise<void> {
  await setConfigValue(ConfigKey.TELEGRAM_CODE, code);
}

// Moltbook API key helpers
export async function getMoltbookApiKey(): Promise<string | null> {
  return await getConfigValue(ConfigKey.MOLTBOOK_API_KEY);
}

export async function setMoltbookApiKey(apiKey: string): Promise<void> {
  await setConfigValue(ConfigKey.MOLTBOOK_API_KEY, apiKey);
}

