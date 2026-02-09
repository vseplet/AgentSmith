import { allConfig } from "$/core/config.ts";

const SECRET_KEYS: Set<string> = new Set([
  "telegram.botApiKey",
  "llm.deepseek.apiKey",
  "llm.openai.apiKey",
  "llm.anthropic.apiKey",
  "llm.chatgpt.refreshToken",
  "moltbook.apiKey",
]);

function maskSecret(value: string | null): string {
  if (!value) return "(not set)";
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "****" + value.slice(-2);
}

export async function showConfig(): Promise<void> {
  const config = allConfig();
  console.log("\n--- Current Configuration ---");
  for (const [key, value] of Object.entries(config)) {
    const display = SECRET_KEYS.has(key)
      ? maskSecret(value)
      : (value ?? "(not set)");
    console.log(`  ${key}: ${display}`);
  }
  console.log("-----------------------------\n");
}
