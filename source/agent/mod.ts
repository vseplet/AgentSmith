import { pot, shibui, task } from "@vseplet/shibui";
import { editMessage, sendReply, setReaction } from "#tgbot";
import { chat } from "#deepseek";
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

// Pot для входящих сообщений из Telegram (только от владельца)
export const TelegramMessage = pot("TelegramMessage", {
  chatId: 0,
  userId: 0,
  messageId: 0,
  text: "",
  username: "",
});

// Task для обработки сообщений
const handleMessage = task(TelegramMessage)
  .name("HandleTelegramMessage")
  .do(async ({ pots, finish, fail }) => {
    const { chatId, messageId, text, username } = pots[0].data;

    try {
      console.log(`[Agent] Processing message: "${text.slice(0, 50)}..."`);

      // Send initial "thinking" message
      const replyId = await sendReply(chatId, "⏳ Thinking...", messageId);

      // Progress callback to update the message
      const onProgress = async (status: string) => {
        await editMessage(chatId, replyId, status);
      };

      const userPrompt = username ? `[User: ${username}]\n${text}` : text;
      const response = await chat(
        userPrompt,
        [
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
        ],
        10,
        chatId,
        onProgress,
      );

      console.log(`[Agent] Response received, length: ${response.length}`);
      await editMessage(chatId, replyId, response);
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
