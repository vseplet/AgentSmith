import { pot, task } from "@vseplet/shibui";
import { core } from "$/core/common.ts";
import { editMessage, requestApproval, sendReply, setReaction } from "$/core/telegram/mod.ts";
import { complete, resolveProvider, summarize } from "$/core/llms/mod.ts";
import { buildContext } from "./context.ts";
import { addToMemory, summarizeMemory } from "$/core/memory.ts";
import { dump } from "$/core/dump.ts";
import { cfg } from "$/core/config.ts";
import { log } from "$/core/logger.ts";
import type { ChatResult, ProgressCallback, TokenStats } from "$/core/types.ts";

// ============================================
// Agent Loop
// ============================================

const MAX_STEPS = 10;

function shortResult(result: unknown): string {
  const str = JSON.stringify(result);
  return str.length > 80 ? str.slice(0, 80) + "..." : str;
}

async function chat(
  prompt: string,
  maxSteps: number,
  chatId?: number,
  onProgress?: ProgressCallback,
  progressMessageId?: number,
): Promise<ChatResult> {
  const provider = await resolveProvider();
  log.agent.inf(`Provider: ${provider.name}, Model: ${provider.model}`);

  const { messages, tools, toolsPayload } = await buildContext(prompt, chatId);

  const tokens: TokenStats = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    steps: 0,
  };

  const progressLog: string[] = [];

  // Step loop
  for (let step = 0; step < maxSteps; step++) {
    log.agent.inf(`Step ${step + 1}/${maxSteps}`);

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
        log.tool.inf(`${toolName}`);

        if (chatId) {
          await dump(chatId, "TOOL_CALL", toolArgs, {
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

          // Check approval for dangerous tools
          if (chatId && tool.dangerous) {
            const approved = await requestApproval(
              chatId,
              toolName,
              toolCall.function.arguments,
              progressMessageId,
            );
            if (!approved) {
              const denyResult = JSON.stringify({
                denied: "Tool execution denied by user",
              });
              messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: denyResult,
              });
              if (onProgress) {
                progressLog[progressLog.length - 1] =
                  `🚫 ${toolName}: denied by user`;
                await onProgress(
                  `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
                );
              }
              continue;
            }
          }

          const execResult = await tool.execute(args);
          const resultStr = JSON.stringify(execResult);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultStr,
          });
          if (chatId) {
            await dump(chatId, "TOOL_RESULT", resultStr, {
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
            await dump(chatId, "TOOL_RESULT", errorStr, {
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
        await dump(chatId, "ASSISTANT", responseText, {
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
      log.agent.inf(`Processing: "${text.slice(0, 50)}..."`);

      const replyId = await sendReply(chatId, "⏳ Thinking...", messageId);

      const onProgress = async (status: string) => {
        await editMessage(chatId, replyId, status);
      };

      const userPrompt = username ? `[User: ${username}]\n${text}` : text;
      const startTime = Date.now();
      const result = await chat(userPrompt, MAX_STEPS, chatId, onProgress, replyId);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      const { text: response, tokens } = result;
      const provider = cfg("llm.provider") ?? "unknown";
      const profile = cfg("agent.profile") ?? "default";
      const tokenStats =
        `\n\n📊 ${tokens.totalTokens} tok | ${tokens.steps} steps | ${elapsed}s | ${provider} | ${profile}`;

      log.agent.inf(`Done, len: ${response.length}, tokens: ${tokens.totalTokens}`);
      await editMessage(chatId, replyId, response + tokenStats);
      await setReaction(chatId, replyId, "👍");
      return finish();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error";
      log.agent.err(`Error: ${errorMessage}`);
      const errorReplyId = await sendReply(
        chatId,
        `❌ Error: ${errorMessage}`,
        messageId,
      );
      await setReaction(chatId, errorReplyId, "👎");
      return fail();
    }
  });

export async function startAgent(): Promise<void> {
  core.register(handleMessage);
  await core.start();
  log.agent.inf("Started");
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
