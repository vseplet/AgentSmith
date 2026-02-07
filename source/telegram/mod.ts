import { Bot } from "grammy";
import {
  getAllConfig,
  getTelegramBotApiKey,
  getTelegramCode,
  getTelegramUserId,
  setTelegramUserId,
} from "#config";
import { sendTelegramMessage } from "#agent";
import { clearMemory, getMemory } from "#memory";
import { replyOptions } from "./helpers.ts";
import { getAllContacts, getAllGroups, upsertContact, upsertGroup } from "./contacts.ts";
import type { ReactionEmoji } from "#types";

let bot: Bot | null = null;

const MAX_MESSAGE_LENGTH = 4000; // Telegram limit is 4096, leaving some margin

function truncateMessage(text: string): string {
  if (text.length > MAX_MESSAGE_LENGTH) {
    return text.slice(0, MAX_MESSAGE_LENGTH - 20) + "\n\n... (truncated)";
  }
  return text;
}

export async function sendReply(
  chatId: number,
  text: string,
  replyToMessageId: number,
): Promise<number> {
  if (!bot) return 0;

  const result = await bot.api.sendMessage(chatId, truncateMessage(text), {
    reply_parameters: { message_id: replyToMessageId },
  });

  return result.message_id;
}

export async function sendMessage(
  chatId: number,
  text: string,
): Promise<number> {
  if (!bot) return 0;

  const result = await bot.api.sendMessage(chatId, truncateMessage(text));
  return result.message_id;
}

export async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
): Promise<void> {
  if (!bot) return;

  try {
    await bot.api.editMessageText(chatId, messageId, truncateMessage(text));
  } catch {
    // Ignore edit errors (message not modified, etc.)
  }
}

export async function setReaction(
  chatId: number,
  messageId: number,
  emoji: ReactionEmoji = "👍",
): Promise<void> {
  if (!bot) return;

  try {
    await bot.api.setMessageReaction(chatId, messageId, [{
      type: "emoji",
      emoji,
    }]);
  } catch {
    // Ignore reaction errors
  }
}

export async function startBot(): Promise<void> {
  const token = await getTelegramBotApiKey();

  if (!token) {
    throw new Error("TELEGRAM_BOT_API_KEY is not set");
  }

  bot = new Bot(token);

  bot.command("start", (ctx) => {
    ctx.reply("Hello! I'm AgentSmith bot.", replyOptions(ctx));
  });

  bot.command("ping", (ctx) => {
    ctx.reply("pong", replyOptions(ctx));
  });

  bot.command("code", async (ctx) => {
    const inputCode = ctx.match?.trim();

    if (!inputCode) {
      ctx.reply("Usage: /code <your_code>", replyOptions(ctx));
      return;
    }

    const storedCode = await getTelegramCode();

    if (!storedCode) {
      ctx.reply("No code configured.", replyOptions(ctx));
      return;
    }

    if (inputCode === storedCode) {
      const userId = ctx.from?.id.toString();
      if (userId) {
        await setTelegramUserId(userId);
        ctx.reply("You are now registered as the owner.", replyOptions(ctx));
      }
    } else {
      ctx.reply("Invalid code.", replyOptions(ctx));
    }
  });

  bot.command("config", async (ctx) => {
    const ownerId = await getTelegramUserId();
    const userId = ctx.from?.id.toString();

    if (!ownerId || userId !== ownerId) {
      ctx.reply(
        "Access denied. Only owner can view config.",
        replyOptions(ctx),
      );
      return;
    }

    const config = await getAllConfig();

    const mask = (value: string | null) =>
      value ? value.slice(0, 4) + "****" : "not set";

    const lines = [
      "Config:",
      `DEEPSEEK_API_KEY: ${mask(config.deepseek_api_key)}`,
      `DEEPSEEK_MODEL_NAME: ${config.deepseek_model_name ?? "not set"}`,
      `TELEGRAM_BOT_API_KEY: ${mask(config.telegram_bot_api_key)}`,
      `TELEGRAM_CODE: ${mask(config.telegram_code)}`,
      `TELEGRAM_USER_ID: ${config.telegram_user_id ?? "not set"}`,
      `MOLTBOOK_API_KEY: ${mask(config.moltbook_api_key)}`,
    ];

    ctx.reply(lines.join("\n"), replyOptions(ctx));
  });

  bot.command("clear", async (ctx) => {
    const ownerId = await getTelegramUserId();
    const userId = ctx.from?.id.toString();

    if (!ownerId || userId !== ownerId) {
      ctx.reply("Access denied.", replyOptions(ctx));
      return;
    }

    await clearMemory(ctx.chat.id);
    ctx.reply("Memory cleared.", replyOptions(ctx));
  });

  bot.command("context", async (ctx) => {
    const ownerId = await getTelegramUserId();
    const userId = ctx.from?.id.toString();

    if (!ownerId || userId !== ownerId) {
      ctx.reply("Access denied.", replyOptions(ctx));
      return;
    }

    const memory = await getMemory(ctx.chat.id);
    const lines: string[] = [];

    if (memory.summary) {
      lines.push("=== Summary ===");
      lines.push(memory.summary);
      lines.push("");
    }

    lines.push(`=== Messages (${memory.messages.length}) ===`);
    for (const msg of memory.messages) {
      const role = msg.role === "user" ? "U" : "A";
      const text = msg.content.length > 100
        ? msg.content.slice(0, 100) + "..."
        : msg.content;
      lines.push(`[${role}] ${text}`);
    }

    const output = lines.join("\n") || "Context is empty.";
    ctx.reply(output, replyOptions(ctx));
  });

  bot.command("contacts", async (ctx) => {
    const ownerId = await getTelegramUserId();
    const userId = ctx.from?.id.toString();

    if (!ownerId || userId !== ownerId) {
      ctx.reply("Access denied.", replyOptions(ctx));
      return;
    }

    const contacts = await getAllContacts();
    if (contacts.length === 0) {
      ctx.reply("No contacts yet.", replyOptions(ctx));
      return;
    }

    const lines = contacts.map((c) => {
      const name = c.username ? `@${c.username}` : `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
      return `• ${name} (${c.id}) — ${c.messageCount} msgs`;
    });

    ctx.reply(`=== Contacts (${contacts.length}) ===\n${lines.join("\n")}`, replyOptions(ctx));
  });

  bot.command("groups", async (ctx) => {
    const ownerId = await getTelegramUserId();
    const userId = ctx.from?.id.toString();

    if (!ownerId || userId !== ownerId) {
      ctx.reply("Access denied.", replyOptions(ctx));
      return;
    }

    const groups = await getAllGroups();
    if (groups.length === 0) {
      ctx.reply("No groups yet.", replyOptions(ctx));
      return;
    }

    const lines = groups.map((g) => {
      const name = g.username ? `@${g.username}` : g.title;
      return `• ${name} (${g.type}) — ${g.messageCount} msgs`;
    });

    ctx.reply(`=== Groups (${groups.length}) ===\n${lines.join("\n")}`, replyOptions(ctx));
  });

  bot.on("message:text", async (ctx) => {
    // Save contact info
    if (ctx.from) {
      await upsertContact({
        id: ctx.from.id,
        username: ctx.from.username,
        first_name: ctx.from.first_name,
        last_name: ctx.from.last_name,
        language_code: ctx.from.language_code,
        is_premium: ctx.from.is_premium,
      });
    }

    // Save group info if message is from a group
    const chatType = ctx.chat.type;
    if (chatType === "group" || chatType === "supergroup" || chatType === "channel") {
      await upsertGroup({
        id: ctx.chat.id,
        title: "title" in ctx.chat ? ctx.chat.title : undefined,
        type: chatType,
        username: "username" in ctx.chat ? ctx.chat.username : undefined,
      });
    }

    // Check owner access
    const ownerId = await getTelegramUserId();
    const userId = ctx.from?.id.toString();

    if (!ownerId || userId !== ownerId) {
      ctx.reply("Access denied.", replyOptions(ctx));
      return;
    }

    const username = ctx.from?.username || ctx.from?.first_name || "Unknown";
    await sendTelegramMessage({
      chatId: ctx.chat.id,
      userId: ctx.from?.id ?? 0,
      messageId: ctx.message.message_id,
      text: ctx.message.text,
      username,
    });
  });

  console.log("Starting Telegram bot...");
  bot.start();
}

export function stopBot(): void {
  if (bot) {
    bot.stop();
    bot = null;
  }
}
