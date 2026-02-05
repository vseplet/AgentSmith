// Config keys enum
export const ConfigKey = {
  DEEPSEEK_API_KEY: "deepseek_api_key",
  DEEPSEEK_MODEL_NAME: "deepseek_model_name",
  TELEGRAM_BOT_API_KEY: "telegram_bot_api_key",
} as const;

export type ConfigKeyType = typeof ConfigKey[keyof typeof ConfigKey];

// Config types
export interface Config {
  [ConfigKey.DEEPSEEK_API_KEY]: string | null;
  [ConfigKey.DEEPSEEK_MODEL_NAME]: string | null;
  [ConfigKey.TELEGRAM_BOT_API_KEY]: string | null;
}

// KV prefix for config storage
const KV_PREFIX = ["config"] as const;

// KV instance (lazy initialization)
let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

// Generic config functions
export async function getConfigValue(
  key: ConfigKeyType,
): Promise<string | null> {
  const store = await getKv();
  const result = await store.get<string>([...KV_PREFIX, key]);
  return result.value;
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
  const [deepseekKey, deepseekModel, telegramKey] = await Promise.all([
    getConfigValue(ConfigKey.DEEPSEEK_API_KEY),
    getConfigValue(ConfigKey.DEEPSEEK_MODEL_NAME),
    getConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY),
  ]);

  return {
    [ConfigKey.DEEPSEEK_API_KEY]: deepseekKey,
    [ConfigKey.DEEPSEEK_MODEL_NAME]: deepseekModel,
    [ConfigKey.TELEGRAM_BOT_API_KEY]: telegramKey,
  };
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

// Telegram Bot API key helpers
export async function getTelegramBotApiKey(): Promise<string | null> {
  return await getConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY);
}

export async function setTelegramBotApiKey(apiKey: string): Promise<void> {
  await setConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY, apiKey);
}

// Close KV connection (for cleanup)
export function closeKv(): void {
  if (kv) {
    kv.close();
    kv = null;
  }
}
