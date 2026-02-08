export async function run(): Promise<void> {
  const { startAgent } = await import("#agent");
  const { startBot } = await import("#tgbot");
  await startAgent();
  await startBot();
}
