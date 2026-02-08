import type { Skill } from "$/core/types.ts";

export const telegramMessengerSkill: Skill = {
  name: "telegram_messenger",
  description: "Send messages to Telegram contacts or groups",
  triggers: [
    "отправь",
    "напиши",
    "send",
    "message",
    "сообщение",
    "написать",
    "передай",
    "скажи",
    "telegram",
    "телеграм",
    "контакт",
    "группа",
    "group",
    "contact",
  ],
  instructions: `
TELEGRAM MESSENGER SKILL:

When user asks to send a message to someone in Telegram, follow these steps:

1. FIRST: Use telegram_contacts tool to get the list of all contacts
   - Check if the target contact exists by username or name
   - Get their chat_id

2. If target is a GROUP: Use telegram_groups tool instead
   - Check if the target group exists by title or username
   - Get the group chat_id

3. THEN: Use telegram_send tool with:
   - chat_id: the ID from step 1 or 2
   - text: the message to send

4. Report success or failure to the user

IMPORTANT:
- Always fetch contacts/groups first to get the correct chat_id
- Never guess chat_id - always look it up
- If contact/group not found, tell the user
- Confirm what was sent and to whom
`,
};
