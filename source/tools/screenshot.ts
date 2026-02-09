import type { Tool } from "$/core/types.ts";
import { cfg } from "$/core/config.ts";

export const screenshotTool: Tool = {
  name: "take_screenshot",
  description:
    "Take a screenshot of the host machine's screen and send it to a Telegram chat. If chat_id is not provided, sends to the bot owner.",
  dangerous: true,
  parameters: {
    type: "object",
    properties: {
      chat_id: {
        type: "number",
        description:
          "Telegram chat ID to send the screenshot to. Defaults to bot owner.",
      },
    },
  },
  execute: async (args) => {
    const tmpPath = `/tmp/smith_screenshot_${Date.now()}.png`;

    try {
      // Take screenshot
      const isMac = Deno.build.os === "darwin";
      const cmd = isMac
        ? new Deno.Command("screencapture", { args: ["-x", tmpPath], stdout: "piped", stderr: "piped" })
        : new Deno.Command("scrot", { args: [tmpPath], stdout: "piped", stderr: "piped" });

      const { success, stderr } = await cmd.output();
      if (!success) {
        const err = new TextDecoder().decode(stderr).trim();
        return { error: `Screenshot failed: ${err}` };
      }

      // Resolve chat ID
      let chatId = args.chat_id as number | undefined;
      if (!chatId) {
        const ownerId = cfg("telegram.userId");
        if (ownerId) chatId = Number(ownerId);
      }
      if (!chatId) {
        return { error: "No chat_id provided and no owner configured" };
      }

      // Send photo
      const { sendPhoto } = await import("$/core/telegram/mod.ts");
      const messageId = await sendPhoto(chatId, tmpPath);

      return { success: true, chatId, messageId };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Screenshot failed",
      };
    } finally {
      // Cleanup temp file
      try {
        await Deno.remove(tmpPath);
      } catch {
        // ignore
      }
    }
  },
};
