export async function run(): Promise<void> {
  const { startAgent } = await import("$/core/loop.ts");
  const { startBot } = await import("$/core/telegram/mod.ts");
  await startAgent();
  await startBot();
}
