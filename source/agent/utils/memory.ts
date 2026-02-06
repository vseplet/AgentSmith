import type { Memory, MemoryMessage } from "#types";

const MAX_MESSAGES = 20;
const SUMMARY_THRESHOLD = 15;

let kv: Deno.Kv | null = null;

async function getKv(): Promise<Deno.Kv> {
  if (!kv) {
    kv = await Deno.openKv();
  }
  return kv;
}

export async function getMemory(chatId: number): Promise<Memory> {
  const store = await getKv();
  const result = await store.get<Memory>(["memory", chatId]);
  return result.value ?? { messages: [], summary: null };
}

export async function addToMemory(
  chatId: number,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const store = await getKv();
  const memory = await getMemory(chatId);

  memory.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });

  // Keep only last N messages
  if (memory.messages.length > MAX_MESSAGES) {
    memory.messages = memory.messages.slice(-MAX_MESSAGES);
  }

  await store.set(["memory", chatId], memory);
}

export async function getContextMessages(
  chatId: number,
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const memory = await getMemory(chatId);
  const result: { role: "user" | "assistant"; content: string }[] = [];

  // Add summary if exists
  if (memory.summary) {
    result.push({
      role: "assistant",
      content: `Previous conversation summary: ${memory.summary}`,
    });
  }

  // Add recent messages
  for (const msg of memory.messages) {
    result.push({ role: msg.role, content: msg.content });
  }

  return result;
}

export async function summarizeMemory(
  chatId: number,
  summarizer: (text: string) => Promise<string>,
): Promise<void> {
  const memory = await getMemory(chatId);

  if (memory.messages.length < SUMMARY_THRESHOLD) {
    return;
  }

  // Take older messages to summarize
  const toSummarize = memory.messages.slice(0, -5);
  const toKeep = memory.messages.slice(-5);

  const conversationText = toSummarize
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const summary = await summarizer(conversationText);

  const store = await getKv();
  await store.set(["memory", chatId], {
    messages: toKeep,
    summary: memory.summary
      ? `${memory.summary}\n\nMore recent: ${summary}`
      : summary,
  });
}

export async function clearMemory(chatId: number): Promise<void> {
  const store = await getKv();
  await store.delete(["memory", chatId]);
}
