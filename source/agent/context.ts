import { buildSystemPrompt } from "./system-prompt.ts";
import { TOOLS } from "./tools/mod.ts";
import { getContextMessages, addToMemory } from "#memory";
import { dump } from "#logger";
import type { ToolPayload } from "#llm";
import type { Message, Tool } from "#types";

export interface AgentContext {
  messages: Message[];
  tools: Tool[];
  toolsPayload: ToolPayload[];
}

function buildToolsPayload(tools: Tool[]): ToolPayload[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export async function buildContext(
  prompt: string,
  chatId?: number,
): Promise<AgentContext> {
  const messages: Message[] = [
    { role: "system", content: await buildSystemPrompt(prompt) },
  ];

  // Load memory
  if (chatId) {
    const contextMessages = await getContextMessages(chatId);
    for (const msg of contextMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
    await addToMemory(chatId, "user", prompt);
  }

  messages.push({ role: "user", content: prompt });

  if (chatId) {
    await dump(chatId, "USER", prompt);
  }

  const toolsPayload = buildToolsPayload(TOOLS);

  return { messages, tools: TOOLS, toolsPayload };
}
