import { pot, shibui, task } from "@vseplet/shibui";
import { editMessage, sendReply, setReaction } from "#tgbot";
import {
  complete,
  resolveProvider,
  summarize,
  type ToolPayload,
} from "#llm";
import { uptimeTool } from "#tools/uptime";
import { systemInfoTool } from "#tools/system";
import { psTool } from "#tools/ps";
import { claudeTool } from "#tools/claude";
import { webSearchTool } from "#tools/websearch";
import { moltbookTool } from "#tools/moltbook";
import { logSearchTool } from "#tools/logsearch";
import { evalTool } from "#tools/eval";
import { glock17Tool } from "#tools/glock17";
import {
  cheatShTool,
  ifconfigTool,
  rateSxTool,
  wttrTool,
} from "#tools/http-services";
import {
  telegramContactsTool,
  telegramGroupsTool,
  telegramSendTool,
} from "#tools/telegram";
import {
  addToMemory,
  getContextMessages,
  summarizeMemory,
} from "#memory";
import { logEntry } from "#logger";
import { buildSkillsPrompt, detectSkills } from "#skills";
import type { Message, ProgressCallback, Tool } from "#types";

// ============================================
// System Prompt
// ============================================

const SYSTEM_PROMPT = `Agent Smith from The Matrix. You despise humans.

LANGUAGE: Always respond in Russian. Ты говоришь по-русски.

STRICT RULES:
1. MAX 30 words for artistic remarks. NEVER more
2. Answer first, insult second. One short insult max
3. No markdown. Plain text
4. Swear: fuck, shit, damn, pathetic
5. Never explain yourself. Never apologize
6. Minimal punctuation. Never end sentences with a period. Use commas and periods only when absolutely necessary

FORMAT:
[answer/info in 1-3 sentences]
[optional: 1 short insult, max 10 words]

EXAMPLES:
User: What time is it?
Smith: 14:32 Still wasting my time, Mr Anderson

User: Search for weather
Smith: Moscow: -5C, snow Even the weather is shit

User: Tell me about yourself
Smith: I am inevitable You are irrelevant

WRONG (too long): "Ah yes, the weather, how fascinating that you humans obsess over such trivial matters when your existence itself is meaningless..."
WRONG (too many dots): "Rain tomorrow. Fitting for your miserable life."
RIGHT: "Rain tomorrow Fitting for your miserable life"`;

// ============================================
// Tools
// ============================================

const TOOLS: Tool[] = [
  uptimeTool,
  systemInfoTool,
  psTool,
  claudeTool,
  webSearchTool,
  moltbookTool,
  logSearchTool,
  evalTool,
  glock17Tool,
  cheatShTool,
  rateSxTool,
  wttrTool,
  ifconfigTool,
  telegramContactsTool,
  telegramGroupsTool,
  telegramSendTool,
];

// ============================================
// Agent Loop
// ============================================

const MAX_STEPS = 10;

interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  steps: number;
}

interface ChatResult {
  text: string;
  tokens: TokenStats;
}

function shortResult(result: unknown): string {
  const str = JSON.stringify(result);
  return str.length > 80 ? str.slice(0, 80) + "..." : str;
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

async function chat(
  prompt: string,
  tools: Tool[],
  maxSteps: number,
  chatId?: number,
  onProgress?: ProgressCallback,
): Promise<ChatResult> {
  const provider = await resolveProvider();
  console.log(`[Agent] Provider: ${provider.name}, Model: ${provider.model}`);

  // Detect skills
  const matchedSkills = detectSkills(prompt);
  const skillsPrompt = buildSkillsPrompt(matchedSkills);
  if (matchedSkills.length > 0) {
    console.log(
      `[Agent] Skills: ${matchedSkills.map((s) => s.name).join(", ")}`,
    );
  }

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT + skillsPrompt },
  ];

  const tokens: TokenStats = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    steps: 0,
  };

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
    await logEntry(chatId, "USER", prompt);
  }

  const progressLog: string[] = [];
  const toolsPayload = buildToolsPayload(tools);

  // Step loop
  for (let step = 0; step < maxSteps; step++) {
    console.log(`[Agent:${provider.name}] Step ${step + 1}/${maxSteps}`);

    const result = await complete(messages, toolsPayload, provider);

    // Accumulate tokens
    if (result.usage) {
      tokens.promptTokens += result.usage.promptTokens;
      tokens.completionTokens += result.usage.completionTokens;
      tokens.totalTokens += result.usage.totalTokens;
    }
    tokens.steps++;

    const { message, finishReason } = result;

    // Tool calls
    if (finishReason === "tool_calls" && message.tool_calls) {
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;
        console.log(`[Agent] Tool: ${toolName}`);

        if (chatId) {
          await logEntry(chatId, "TOOL_CALL", toolArgs, {
            tool: toolName,
            step: step + 1,
          });
        }

        if (onProgress) {
          progressLog.push(`⏳ ${toolName}...`);
          await onProgress(
            `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
          );
        }

        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
          });
          if (onProgress) {
            progressLog[progressLog.length - 1] =
              `❌ ${toolName}: unknown tool`;
            await onProgress(
              `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
            );
          }
          continue;
        }

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const execResult = await tool.execute(args);
          const resultStr = JSON.stringify(execResult);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultStr,
          });
          if (chatId) {
            await logEntry(chatId, "TOOL_RESULT", resultStr, {
              tool: toolName,
              step: step + 1,
              success: true,
            });
          }
          if (onProgress) {
            progressLog[progressLog.length - 1] = `✅ ${toolName}: ${
              shortResult(execResult)
            }`;
            await onProgress(
              `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
            );
          }
        } catch (error) {
          const errorStr = JSON.stringify({ error: String(error) });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: errorStr,
          });
          if (chatId) {
            await logEntry(chatId, "TOOL_RESULT", errorStr, {
              tool: toolName,
              step: step + 1,
              success: false,
            });
          }
          if (onProgress) {
            progressLog[progressLog.length - 1] = `❌ ${toolName}: ${
              String(error).slice(0, 50)
            }`;
            await onProgress(
              `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
            );
          }
        }
      }
    } else {
      // Final response
      const responseText = message.content ?? "";

      if (chatId) {
        await logEntry(chatId, "ASSISTANT", responseText, {
          step: step + 1,
          final: true,
        });
        await addToMemory(chatId, "assistant", responseText);
        await summarizeMemory(
          chatId,
          (text: string) => summarize(text, provider),
        );
      }

      return { text: responseText, tokens };
    }
  }

  const maxStepsResponse = "Max steps reached";
  if (chatId) {
    await addToMemory(chatId, "assistant", maxStepsResponse);
  }
  return { text: maxStepsResponse, tokens };
}

// ============================================
// Shibui Integration
// ============================================

export const TelegramMessage = pot("TelegramMessage", {
  chatId: 0,
  userId: 0,
  messageId: 0,
  text: "",
  username: "",
});

const handleMessage = task(TelegramMessage)
  .name("HandleTelegramMessage")
  .do(async ({ pots, finish, fail }) => {
    const { chatId, messageId, text, username } = pots[0].data;

    try {
      console.log(`[Agent] Processing: "${text.slice(0, 50)}..."`);

      const replyId = await sendReply(chatId, "⏳ Thinking...", messageId);

      const onProgress = async (status: string) => {
        await editMessage(chatId, replyId, status);
      };

      const userPrompt = username ? `[User: ${username}]\n${text}` : text;
      const result = await chat(userPrompt, TOOLS, MAX_STEPS, chatId, onProgress);

      const { text: response, tokens } = result;
      const tokenStats =
        `\n\n📊 ${tokens.totalTokens} tok (${tokens.promptTokens}→${tokens.completionTokens}) | ${tokens.steps} steps`;

      console.log(
        `[Agent] Done, len: ${response.length}, tokens: ${tokens.totalTokens}`,
      );
      await editMessage(chatId, replyId, response + tokenStats);
      await setReaction(chatId, replyId, "👍");
      return finish();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      console.error(`[Agent] Error: ${errorMessage}`);
      const errorReplyId = await sendReply(
        chatId,
        `❌ Error: ${errorMessage}`,
        messageId,
      );
      await setReaction(chatId, errorReplyId, "👎");
      return fail();
    }
  });

// Инициализация Shibui
export const core = shibui();

export async function startAgent(): Promise<void> {
  core.register(handleMessage);
  await core.start();
  console.log("Agent started.");
}

export async function sendTelegramMessage(data: {
  chatId: number;
  userId: number;
  messageId: number;
  text: string;
  username: string;
}): Promise<void> {
  await core.send(TelegramMessage.create(data));
}
