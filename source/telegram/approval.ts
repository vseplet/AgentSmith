import { Bot, InlineKeyboard } from "grammy";

// Pending approval storage
const pendingApprovals = new Map<string, {
  resolve: (approved: boolean) => void;
  timer: number;
}>();

// Bot reference for sending messages
let _bot: Bot | null = null;

export function registerBot(bot: Bot): void {
  _bot = bot;
}

// Handle inline button callback
export function handleApprovalCallback(
  callbackId: string,
  approved: boolean,
): boolean {
  const pending = pendingApprovals.get(callbackId);
  if (!pending) return false;

  clearTimeout(pending.timer);
  pending.resolve(approved);
  pendingApprovals.delete(callbackId);
  return true;
}

// Request approval via inline buttons, returns true if approved.
// If messageId is provided, edits the existing progress message instead of creating a new one.
export async function requestApproval(
  chatId: number,
  toolName: string,
  args: string,
  messageId?: number,
): Promise<boolean> {
  if (!_bot) return false;

  const callbackId = crypto.randomUUID();
  const argsPreview = args.length > 200 ? args.slice(0, 200) + "..." : args;
  const text = `⚠️ Tool requires approval:\n\n🔧 ${toolName}\n📋 ${argsPreview}`;

  const keyboard = new InlineKeyboard()
    .text("✅ Yes", `approve:${callbackId}`)
    .text("❌ No", `deny:${callbackId}`);

  if (messageId) {
    try {
      await _bot.api.editMessageText(chatId, messageId, text, {
        reply_markup: keyboard,
      });
    } catch {
      // Fallback to new message if edit fails
      await _bot.api.sendMessage(chatId, text, { reply_markup: keyboard });
    }
  } else {
    await _bot.api.sendMessage(chatId, text, { reply_markup: keyboard });
  }

  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      pendingApprovals.delete(callbackId);
      resolve(false);
    }, 2 * 60 * 1000); // 2 minutes timeout — auto deny

    pendingApprovals.set(callbackId, { resolve, timer: timer as unknown as number });
  });
}
