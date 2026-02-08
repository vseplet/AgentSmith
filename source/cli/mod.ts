import { Command } from "@cliffy/command";
import { ensureDir } from "@std/fs/ensure-dir";
import { join } from "@std/path/join";
import { run } from "./commands/run.ts";
import { showConfig } from "./commands/config.ts";
import { runSetup, setupLLM, setupProfile, setupTelegram } from "./commands/setup.ts";

async function ensureSmithDirs(): Promise<void> {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  const base = join(home, ".smith");
  for (const dir of ["skills", "tools", "profiles", "dumps"]) {
    await ensureDir(join(base, dir));
  }
}

await ensureSmithDirs();

await new Command()
  .name("smith")
  .version("0.1.0")
  .description("AgentSmith CLI")
  .action(async () => {
    await run();
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
