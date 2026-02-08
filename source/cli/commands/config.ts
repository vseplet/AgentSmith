import { getAllConfig, ConfigKey } from "#config";

const SECRET_KEYS: Set<string> = new Set([
  ConfigKey.TELEGRAM_BOT_API_KEY,
  ConfigKey.DEEPSEEK_API_KEY,
  ConfigKey.OPENAI_API_KEY,
  ConfigKey.ANTHROPIC_API_KEY,
  ConfigKey.CHATGPT_REFRESH_TOKEN,
  ConfigKey.MOLTBOOK_API_KEY,
]);

function maskSecret(value: string | null): string {
  if (!value) return "(not set)";
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "****" + value.slice(-2);
}

export async function showConfig(): Promise<void> {
  const config = await getAllConfig();
  console.log("\n--- Current Configuration ---");
  for (const [key, value] of Object.entries(config)) {
    const display = SECRET_KEYS.has(key as typeof ConfigKey[keyof typeof ConfigKey])
      ? maskSecret(value)
      : (value ?? "(not set)");
    console.log(`  ${key}: ${display}`);
  }
  console.log("-----------------------------\n");
}
