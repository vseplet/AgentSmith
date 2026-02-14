import type { Tool } from "$/core/types.ts";
import { uptimeTool } from "./uptime.ts";
import { systemInfoTool, shellTool } from "./system.ts";
import { psTool } from "./ps.ts";
import { claudeTool } from "./claude.ts";
import { webSearchTool } from "./websearch.ts";
import { logSearchTool } from "./logsearch.ts";
import { evalTool } from "./eval.ts";
import { cheatShTool, rateSxTool, wttrTool, ifconfigTool } from "./http-services.ts";
import { telegramContactsTool, telegramGroupsTool, telegramSendTool } from "./telegram.ts";
import { screenshotTool } from "./screenshot.ts";
import { profileSwitchTool } from "./profile.ts";
import { providerSwitchTool } from "./provider.ts";
import { askLlmTool } from "./ask-llm.ts";

export const TOOLS: Tool[] = [
  uptimeTool,
  systemInfoTool,
  shellTool,
  psTool,
  claudeTool,
  webSearchTool,
  logSearchTool,
  evalTool,
  cheatShTool,
  rateSxTool,
  wttrTool,
  ifconfigTool,
  telegramContactsTool,
  telegramGroupsTool,
  telegramSendTool,
  screenshotTool,
  profileSwitchTool,
  providerSwitchTool,
  askLlmTool,
];
