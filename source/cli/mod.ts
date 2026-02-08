import { Command } from "@cliffy/command";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path/join";
import { getAllConfig, ConfigKey } from "#config";
import { runSetup, setupLLM, setupProfile, setupTelegram } from "./setup.ts";

async function ensureSmithDirs(): Promise<void> {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  const base = join(home, ".smith");
  for (const dir of ["skills", "tools", "profiles", "dumps"]) {
    await ensureDir(join(base, dir));
  }
}

function maskSecret(value: string | null): string {
  if (!value) return "(not set)";
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "****" + value.slice(-2);
}

const SECRET_KEYS: Set<string> = new Set([
  ConfigKey.TELEGRAM_BOT_API_KEY,
  ConfigKey.DEEPSEEK_API_KEY,
  ConfigKey.OPENAI_API_KEY,
  ConfigKey.ANTHROPIC_API_KEY,
  ConfigKey.MOLTBOOK_API_KEY,
]);

async function showConfig(): Promise<void> {
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

await ensureSmithDirs();

await new Command()
  .name("smith")
  .version("0.1.0")
  .description("AgentSmith CLI")
  .action(async () => {
    const { startAgent } = await import("#agent");
    const { startBot } = await import("#tgbot");
    await startAgent();
    await startBot();
  })
  .command(
    "setup",
    new Command()
      .description("Interactive setup wizard")
      .action(async () => {
        await runSetup();
      })
      .command("profile", "Setup agent profile")
      .action(async () => {
        await setupProfile();
      })
      .reset()
      .command("telegram", "Setup Telegram bot")
      .action(async () => {
        await setupTelegram();
      })
      .reset()
      .command("llm", "Setup LLM provider")
      .action(async () => {
        await setupLLM();
      }),
  )
  .command("config", "Show current configuration")
  .action(async () => {
    await showConfig();
  })
  .parse(Deno.args);
