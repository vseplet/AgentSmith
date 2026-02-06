const SMITH_DIR = ".smith";
const DUMPS_DIR = `${SMITH_DIR}/context_dumps`;

let initialized = false;

async function ensureDirectories(): Promise<void> {
  if (initialized) return;

  try {
    await Deno.mkdir(DUMPS_DIR, { recursive: true });
    initialized = true;
  } catch (err) {
    if (!(err instanceof Deno.errors.AlreadyExists)) {
      console.error("[Logger] Failed to create directories:", err);
    }
    initialized = true;
  }
}

function getLogFileName(chatId: number): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `${DUMPS_DIR}/chat_${chatId}_${date}.log`;
}

export async function logEntry(
  chatId: number,
  type: "USER" | "ASSISTANT" | "TOOL_CALL" | "TOOL_RESULT" | "SYSTEM",
  content: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await ensureDirectories();

  const timestamp = new Date().toISOString();
  const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";
  const line = `[${timestamp}] [${type}]${metaStr}\n${content}\n${
    "─".repeat(50)
  }\n`;

  const fileName = getLogFileName(chatId);

  try {
    await Deno.writeTextFile(fileName, line, { append: true });
  } catch (err) {
    console.error("[Logger] Failed to write log:", err);
  }
}

export async function searchLogs(
  pattern: string,
  chatId?: number,
): Promise<{ file: string; matches: string[] }[]> {
  await ensureDirectories();

  const results: { file: string; matches: string[] }[] = [];

  try {
    for await (const entry of Deno.readDir(DUMPS_DIR)) {
      if (!entry.isFile || !entry.name.endsWith(".log")) continue;

      // Filter by chatId if specified
      if (chatId && !entry.name.includes(`chat_${chatId}_`)) continue;

      const filePath = `${DUMPS_DIR}/${entry.name}`;
      const content = await Deno.readTextFile(filePath);
      const lines = content.split("\n");

      const matches: string[] = [];
      const regex = new RegExp(pattern, "gi");

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          // Include context: 2 lines before and after
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          const context = lines.slice(start, end).join("\n");
          matches.push(context);
        }
      }

      if (matches.length > 0) {
        results.push({ file: entry.name, matches });
      }
    }
  } catch (err) {
    console.error("[Logger] Failed to search logs:", err);
  }

  return results;
}

export function getLogDir(): string {
  return DUMPS_DIR;
}
