const HOME = Deno.env.get("HOME") ?? ".";
const SMITH_DIR = `${HOME}/.smith`;
const DUMPS_DIR = `${SMITH_DIR}/dumps`;

const SMITH_DIRS = [
  DUMPS_DIR,
  `${SMITH_DIR}/skills`,
  `${SMITH_DIR}/tools`,
  `${SMITH_DIR}/profiles`,
];

let initialized = false;

async function ensureSmithDirs(): Promise<void> {
  if (initialized) return;

  for (const dir of SMITH_DIRS) {
    try {
      await Deno.mkdir(dir, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        console.error(`[Smith] Failed to create ${dir}:`, err);
      }
    }
  }
  initialized = true;
}

function getDumpFileName(chatId: number): string {
  const date = new Date().toISOString().split("T")[0];
  return `${DUMPS_DIR}/chat_${chatId}_${date}.log`;
}

export async function dump(
  chatId: number,
  type: "USER" | "ASSISTANT" | "TOOL_CALL" | "TOOL_RESULT" | "SYSTEM",
  content: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await ensureSmithDirs();

  const timestamp = new Date().toISOString();
  const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : "";
  const line = `[${timestamp}] [${type}]${metaStr}\n${content}\n${"─".repeat(50)}\n`;

  try {
    await Deno.writeTextFile(getDumpFileName(chatId), line, { append: true });
  } catch (err) {
    console.error("[Dump] Failed to write:", err);
  }
}

export async function searchDumps(
  pattern: string,
  chatId?: number,
): Promise<{ file: string; matches: string[] }[]> {
  await ensureSmithDirs();

  const results: { file: string; matches: string[] }[] = [];

  try {
    for await (const entry of Deno.readDir(DUMPS_DIR)) {
      if (!entry.isFile || !entry.name.endsWith(".log")) continue;
      if (chatId && !entry.name.includes(`chat_${chatId}_`)) continue;

      const content = await Deno.readTextFile(`${DUMPS_DIR}/${entry.name}`);
      const lines = content.split("\n");
      const matches: string[] = [];
      const regex = new RegExp(pattern, "gi");

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          const start = Math.max(0, i - 2);
          const end = Math.min(lines.length, i + 3);
          matches.push(lines.slice(start, end).join("\n"));
        }
      }

      if (matches.length > 0) {
        results.push({ file: entry.name, matches });
      }
    }
  } catch (err) {
    console.error("[Dump] Failed to search:", err);
  }

  return results;
}

export function getDumpDir(): string {
  return DUMPS_DIR;
}
