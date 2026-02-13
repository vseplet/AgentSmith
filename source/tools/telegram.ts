import type { Tool } from "$/core/types.ts";
import { getAllContacts, getAllGroups } from "$/core/telegram/contacts.ts";
import { sendReply } from "$/core/telegram/mod.ts";
import { addToMemory } from "$/core/memory.ts";
import { cfg } from "$/core/config.ts";

export const telegramContactsTool: Tool = {
  name: "telegram_contacts",
  description:
    "Get list of all Telegram contacts who have messaged the bot. Returns user IDs, usernames, names, and message counts.",
  parameters: {
    type: "object",
    properties: {},
  },
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
};

export const telegramGroupsTool: Tool = {
  name: "telegram_groups",
  description:
    "Get list of all Telegram groups/channels where the bot has received messages. Returns group IDs, titles, types, and message counts.",
  parameters: {
    type: "object",
    properties: {},
  },
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
};

export const telegramSendTool: Tool = {
  name: "telegram_send",
  description:
    "Send a message to a Telegram contact or group. Use telegram_contacts or telegram_groups first to get the chat ID.",
  parameters: {
    type: "object",
    properties: {
      chat_id: {
        type: "number",
        description: "The chat ID of the contact or group to send the message to",
      },
      text: {
        type: "string",
        description: "The message text to send",
      },
    },
    required: ["chat_id", "text"],
  },
  execute: async (args) => {
    const chatId = args.chat_id as number;
    const text = args.text as string;

    if (!chatId) {
      return { error: "chat_id is required" };
    }

    if (!text) {
      return { error: "text is required" };
    }

    try {
      // sendReply requires a messageId to reply to, but we can use 0 for a new message
      // We need to use the bot directly for sending without reply
      const { sendMessage } = await import("$/core/telegram/mod.ts");
      const messageId = await sendMessage(chatId, text);

      // Add to recipient's context if they are an authorized user
      const authorizedIds = (cfg("telegram.userId") ?? "").split(",").filter(Boolean);
      if (authorizedIds.includes(chatId.toString())) {
        await addToMemory(chatId, "assistant", text);
      }

      return {
        success: true,
        chatId,
        messageId,
        textLength: text.length,
        addedToContext: authorizedIds.includes(chatId.toString()),
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to send message",
        chatId,
      };
    }
  },
};
