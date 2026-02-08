import { Logger } from "@vseplet/luminous";

export const log = {
  agent: new Logger("Agent"),
  bot: new Logger("Bot"),
  tool: new Logger("Tool"),
  llm: new Logger("LLM"),
  dump: new Logger("Dump"),
};
