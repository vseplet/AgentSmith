// ============================================
// Tool Types
// ============================================

export interface ToolContext {
  chatId?: number;
  userId?: number;
  messageId?: number;
}

export interface Tool {
  name: string;
  description: string;
  dangerous?: boolean;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
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

export interface ProviderConfig {
  name: string;
  baseURL: string;
  headers: Record<string, string>;
  model: string;
  rps: number;
}

export interface ProviderSetupField {
  key: string;
  label: string;
  secret: boolean;
  default?: string;
  options?: (values: Record<string, string>) => Promise<string[]>;
  resolve?: (values: Record<string, string>) => Promise<string>;
}

export interface ProviderEntry {
  getConfig: () => Promise<ProviderConfig>;
  setupFields: ProviderSetupField[];
  complete?: (messages: Message[], tools?: ToolPayload[]) => Promise<CompletionResult | null>;
}

export interface CompletionResult {
  message: {
    role: string;
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ToolPayload {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ============================================
// Agent Types
// ============================================

export interface AgentContext {
  messages: Message[];
  tools: Tool[];
  toolsPayload: ToolPayload[];
}

export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  steps: number;
}

export interface ChatResult {
  text: string;
  tokens: TokenStats;
}

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
