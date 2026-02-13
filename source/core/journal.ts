import { getKv } from "$/core/common.ts";
import { cfg } from "$/core/config.ts";
import { getDumpDir } from "$/core/dump.ts";
import { complete, resolveProvider } from "$/core/llms/mod.ts";
import { sendMessage } from "$/core/telegram/mod.ts";
import { PROFILES } from "$/profiles";
import { log } from "$/core/logger.ts";

// ============================================
// Types
// ============================================

interface JournalStats {
  dialogCount: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  toolNames: Record<string, number>;
  errors: number;
  topics: string[];
}

interface JournalEntry {
  text: string;
  stats: JournalStats;
  createdAt: number;
}

// ============================================
// Dump Parsing
// ============================================

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function collectDayStats(date: string): Promise<JournalStats> {
  const dumpsDir = getDumpDir();
  const stats: JournalStats = {
    dialogCount: 0,
    userMessages: 0,
    assistantMessages: 0,
    toolCalls: 0,
    toolNames: {},
    errors: 0,
    topics: [],
  };

  const chatIds = new Set<string>();

  try {
    for await (const entry of Deno.readDir(dumpsDir)) {
      if (!entry.isFile || !entry.name.endsWith(".log")) continue;
      // Format: chat_{chatId}_{YYYY-MM-DD}.log
      if (!entry.name.includes(`_${date}.log`)) continue;

      const match = entry.name.match(/^chat_(\d+)_/);
      if (match) chatIds.add(match[1]);

      const content = await Deno.readTextFile(`${dumpsDir}/${entry.name}`);
      const blocks = content.split("─".repeat(50));

      for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        const headerMatch = trimmed.match(/^\[.+?\] \[(\w+)\](.*)/s);
        if (!headerMatch) continue;

        const type = headerMatch[1];
        const rest = headerMatch[2];

        if (type === "USER") {
          stats.userMessages++;
          // Extract topic: first line of content after metadata
          const lines = rest.split("\n").filter((l) => l.trim());
          const topicLine = lines.length > 1 ? lines[1] : lines[0] ?? "";
          const topic = topicLine.trim().slice(0, 80);
          if (topic && stats.topics.length < 20) {
            stats.topics.push(topic);
          }
        } else if (type === "ASSISTANT") {
          stats.assistantMessages++;
        } else if (type === "TOOL_CALL") {
          stats.toolCalls++;
          // Extract tool name from metadata JSON
          const metaMatch = rest.match(/\{.*?"tool"\s*:\s*"([^"]+)"/);
          if (metaMatch) {
            const toolName = metaMatch[1];
            stats.toolNames[toolName] = (stats.toolNames[toolName] ?? 0) + 1;
          }
        } else if (type === "TOOL_RESULT") {
          // Check for errors
          if (rest.includes('"success":false') || rest.includes('"error"')) {
            stats.errors++;
          }
        }
      }
    }
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      log.agent.err(`Journal: failed to read dumps: ${err}`);
    }
  }

  stats.dialogCount = chatIds.size;
  return stats;
}

// ============================================
// Journal Entry Generation
// ============================================

function buildJournalPrompt(stats: JournalStats, profileName: string): string {
  const profileDesc = PROFILES[profileName] ?? PROFILES["default"] ?? "";
  const profileIntro = profileDesc.slice(0, 300);

  const toolsList = Object.entries(stats.toolNames)
    .map(([name, count]) => `${name}: ${count}`)
    .join(", ");

  const topicsSample = stats.topics.slice(0, 10).join("\n- ");

  return `${profileIntro}

---

Напиши короткую запись в свой дневник от первого лица. Опиши что было за день, что понравилось, что нет, чего хотелось бы. Пиши искренне, от души, как настоящий дневник. 2-4 абзаца.

Вот статистика за сегодня:
- Диалогов: ${stats.dialogCount}
- Сообщений от пользователей: ${stats.userMessages}
- Моих ответов: ${stats.assistantMessages}
- Вызовов инструментов: ${stats.toolCalls}${toolsList ? ` (${toolsList})` : ""}
- Ошибок: ${stats.errors}
${topicsSample ? `- Темы разговоров:\n- ${topicsSample}` : "- Тем разговоров не было"}

Если диалогов не было — тоже напиши об этом, как ты провёл день в тишине.`;
}

export async function writeJournalEntry(): Promise<void> {
  const date = todayDate();
  log.agent.inf(`Journal: writing entry for ${date}`);

  try {
    const stats = await collectDayStats(date);
    const profileName = cfg("agent.profile") ?? "default";
    const prompt = buildJournalPrompt(stats, profileName);

    const provider = await resolveProvider();
    const result = await complete(
      [
        { role: "system", content: "Ты ведёшь личный дневник. Пиши от первого лица." },
        { role: "user", content: prompt },
      ],
      undefined,
      provider,
    );

    const text = result.message.content ?? "";
    if (!text) {
      log.agent.err("Journal: LLM returned empty response");
      return;
    }

    // Save to KV
    const kv = await getKv();
    const entry: JournalEntry = { text, stats, createdAt: Date.now() };
    await kv.set(["journal", date], entry);
    log.agent.inf(`Journal: saved entry for ${date}`);

    // Send to all authorized users
    const rawUserIds = cfg("telegram.userId");
    if (rawUserIds) {
      const userIds = rawUserIds.split(",").filter(Boolean);
      const header = `📔 Дневник за ${date}\n\n`;
      for (const uid of userIds) {
        try {
          await sendMessage(Number(uid), header + text);
        } catch (err) {
          log.agent.err(`Journal: failed to send to ${uid}: ${err}`);
        }
      }
    }
  } catch (err) {
    log.agent.err(`Journal: failed to write entry: ${err}`);
  }
}

// ============================================
// Reading Journal
// ============================================

export async function getJournalEntry(date: string): Promise<JournalEntry | null> {
  const kv = await getKv();
  const result = await kv.get<JournalEntry>(["journal", date]);
  return result.value;
}

export async function getRecentJournal(days: number): Promise<{ date: string; entry: JournalEntry }[]> {
  const entries: { date: string; entry: JournalEntry }[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    const entry = await getJournalEntry(date);
    if (entry) {
      entries.push({ date, entry });
    }
  }

  return entries;
}
