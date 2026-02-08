import type { TelegramContact, TelegramGroup } from "$/core/types.ts";
import { getKv } from "$/core/common.ts";

// ============================================
// Contacts
// ============================================

export async function upsertContact(user: {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
}): Promise<TelegramContact> {
  const store = await getKv();
  const key = ["telegram", "contacts", user.id];
  const existing = await store.get<TelegramContact>(key);

  const contact: TelegramContact = {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    languageCode: user.language_code,
    isPremium: user.is_premium,
    firstSeen: existing.value?.firstSeen ?? Date.now(),
    lastSeen: Date.now(),
    messageCount: (existing.value?.messageCount ?? 0) + 1,
  };

  await store.set(key, contact);
  return contact;
}

export async function getContact(userId: number): Promise<TelegramContact | null> {
  const store = await getKv();
  const result = await store.get<TelegramContact>(["telegram", "contacts", userId]);
  return result.value;
}

export async function getAllContacts(): Promise<TelegramContact[]> {
  const store = await getKv();
  const contacts: TelegramContact[] = [];
  const iter = store.list<TelegramContact>({ prefix: ["telegram", "contacts"] });
  for await (const entry of iter) {
    contacts.push(entry.value);
  }
  return contacts;
}

// ============================================
// Groups
// ============================================

export async function upsertGroup(chat: {
  id: number;
  title?: string;
  type: string;
  username?: string;
}): Promise<TelegramGroup> {
  const store = await getKv();
  const key = ["telegram", "groups", chat.id];
  const existing = await store.get<TelegramGroup>(key);

  const group: TelegramGroup = {
    id: chat.id,
    title: chat.title ?? "Unknown",
    type: chat.type as "group" | "supergroup" | "channel",
    username: chat.username,
    firstSeen: existing.value?.firstSeen ?? Date.now(),
    lastSeen: Date.now(),
    messageCount: (existing.value?.messageCount ?? 0) + 1,
  };

  await store.set(key, group);
  return group;
}

export async function getGroup(chatId: number): Promise<TelegramGroup | null> {
  const store = await getKv();
  const result = await store.get<TelegramGroup>(["telegram", "groups", chatId]);
  return result.value;
}

export async function getAllGroups(): Promise<TelegramGroup[]> {
  const store = await getKv();
  const groups: TelegramGroup[] = [];
  const iter = store.list<TelegramGroup>({ prefix: ["telegram", "groups"] });
  for await (const entry of iter) {
    groups.push(entry.value);
  }
  return groups;
}
