// ============================================
// Tool Types
// ============================================

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

// ============================================
// LLM Types
// ============================================

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ChatResponse {
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
}

export type ProgressCallback = (status: string) => Promise<void>;

// ============================================
// Memory Types
// ============================================

export interface MemoryMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Memory {
  messages: MemoryMessage[];
  summary: string | null;
}

// ============================================
// Config Types
// ============================================

export const ConfigKey = {
  LLM_PROVIDER: "llm_provider",
  DEEPSEEK_API_KEY: "deepseek_api_key",
  DEEPSEEK_MODEL_NAME: "deepseek_model_name",
  LMSTUDIO_BASE_URL: "lmstudio_base_url",
  LMSTUDIO_MODEL_NAME: "lmstudio_model_name",
  TELEGRAM_BOT_API_KEY: "telegram_bot_api_key",
  TELEGRAM_USER_ID: "telegram_user_id",
  TELEGRAM_CODE: "telegram_code",
  MOLTBOOK_API_KEY: "moltbook_api_key",
} as const;

export type ConfigKeyType = typeof ConfigKey[keyof typeof ConfigKey];

export interface Config {
  [ConfigKey.LLM_PROVIDER]: string | null;
  [ConfigKey.DEEPSEEK_API_KEY]: string | null;
  [ConfigKey.DEEPSEEK_MODEL_NAME]: string | null;
  [ConfigKey.LMSTUDIO_BASE_URL]: string | null;
  [ConfigKey.LMSTUDIO_MODEL_NAME]: string | null;
  [ConfigKey.TELEGRAM_BOT_API_KEY]: string | null;
  [ConfigKey.TELEGRAM_USER_ID]: string | null;
  [ConfigKey.TELEGRAM_CODE]: string | null;
  [ConfigKey.MOLTBOOK_API_KEY]: string | null;
}

// ============================================
// Telegram Types
// ============================================

export type ReactionEmoji =
  | "👍"
  | "👎"
  | "❤"
  | "🔥"
  | "🎉"
  | "😁"
  | "😢"
  | "🤔"
  | "👏"
  | "🙏";

export interface TelegramContact {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isPremium?: boolean;
  firstSeen: number;
  lastSeen: number;
  messageCount: number;
}

export interface TelegramGroup {
  id: number;
  title: string;
  type: "group" | "supergroup" | "channel";
  username?: string;
  firstSeen: number;
  lastSeen: number;
  messageCount: number;
}

// ============================================
// Skill Types
// ============================================

export interface Skill {
  name: string;
  description: string;
  triggers: string[];
  instructions: string;
}
