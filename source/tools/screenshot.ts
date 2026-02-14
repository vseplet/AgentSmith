import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";
import { cfg } from "$/core/config.ts";

export const screenshotTool = defineTool({
  name: "take_screenshot",
  description:
    "Take a screenshot of the host machine's screen and send it to the current Telegram chat.",
  dangerous: true,
  parameters: v.object({}),
  execute: async (_args, ctx) => {
    const tmpPath = `/tmp/smith_screenshot_${Date.now()}.png`;

    try {
      const isMac = Deno.build.os === "darwin";
      const cmd = isMac
        ? new Deno.Command("screencapture", { args: ["-x", tmpPath], stdout: "piped", stderr: "piped" })
        : new Deno.Command("scrot", { args: [tmpPath], stdout: "piped", stderr: "piped" });

      const { success, stderr } = await cmd.output();
      if (!success) {
        const err = new TextDecoder().decode(stderr).trim();
        return { error: `Screenshot failed: ${err}` };
      }

      let chatId = ctx.chatId;
      if (!chatId) {
        const ownerId = cfg("telegram.userId");
        if (ownerId) chatId = Number(ownerId);
      }
      if (!chatId) {
        return { error: "No chat_id available: not in a chat context and no owner configured" };
      }

      const { sendPhoto } = await import("$/core/telegram/mod.ts");
      const messageId = await sendPhoto(chatId, tmpPath);

      return { success: true, chatId, messageId };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Screenshot failed",
      };
    } finally {
      try {
        await Deno.remove(tmpPath);
      } catch {
        // ignore
      }
    }
  },
});
