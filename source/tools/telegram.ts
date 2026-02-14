import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";
import { getAllContacts, getAllGroups } from "$/core/telegram/contacts.ts";
import { addToMemory } from "$/core/memory.ts";
import { cfg } from "$/core/config.ts";

export const telegramContactsTool = defineTool({
  name: "telegram_contacts",
  description:
    "Get list of all Telegram contacts who have messaged the bot. Returns user IDs, usernames, names, and message counts.",
  parameters: v.object({}),
  execute: async () => {
    const contacts = await getAllContacts();

    if (contacts.length === 0) {
      return { message: "No contacts found", contacts: [] };
    }

    return {
      total: contacts.length,
      contacts: contacts.map((c) => ({
        id: c.id,
        username: c.username ?? null,
        name: [c.firstName, c.lastName].filter(Boolean).join(" ") || null,
        language: c.languageCode ?? null,
        isPremium: c.isPremium ?? false,
        messageCount: c.messageCount,
        lastSeen: new Date(c.lastSeen).toISOString(),
      })),
    };
  },
});

export const telegramGroupsTool = defineTool({
  name: "telegram_groups",
  description:
    "Get list of all Telegram groups/channels where the bot has received messages. Returns group IDs, titles, types, and message counts.",
  parameters: v.object({}),
  execute: async () => {
    const groups = await getAllGroups();

    if (groups.length === 0) {
      return { message: "No groups found", groups: [] };
    }

    return {
      total: groups.length,
      groups: groups.map((g) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        username: g.username ?? null,
        messageCount: g.messageCount,
        lastSeen: new Date(g.lastSeen).toISOString(),
      })),
    };
  },
});

export const telegramSendTool = defineTool({
  name: "telegram_send",
  description:
    "Send a message to a Telegram contact or group. Use telegram_contacts or telegram_groups first to get the chat ID.",
  parameters: v.object({
    chat_id: v.pipe(v.number(), v.description("The chat ID of the contact or group to send the message to")),
    text: v.pipe(v.string(), v.description("The message text to send")),
  }),
  execute: async (args) => {
    if (!args.chat_id) {
      return { error: "chat_id is required" };
    }

    if (!args.text) {
      return { error: "text is required" };
    }

    try {
      const { sendMessage } = await import("$/core/telegram/mod.ts");
      const messageId = await sendMessage(args.chat_id, args.text);

      const authorizedIds = (cfg("telegram.userId") ?? "").split(",").filter(Boolean);
      if (authorizedIds.includes(args.chat_id.toString())) {
        await addToMemory(args.chat_id, "assistant", args.text);
      }

      return {
        success: true,
        chatId: args.chat_id,
        messageId,
        textLength: args.text.length,
        addedToContext: authorizedIds.includes(args.chat_id.toString()),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to send message",
        chatId: args.chat_id,
      };
    }
  },
});
