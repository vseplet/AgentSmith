import type { Tool } from "#types";
import { uptimeTool } from "./uptime.ts";
import { systemInfoTool, shellTool } from "./system.ts";
import { psTool } from "./ps.ts";
import { claudeTool } from "./claude.ts";
import { webSearchTool } from "./websearch.ts";
import { moltbookTool } from "./moltbook.ts";
import { logSearchTool } from "./logsearch.ts";
import { evalTool } from "./eval.ts";
import { glock17Tool } from "./glock17.ts";
import { cheatShTool, rateSxTool, wttrTool, ifconfigTool } from "./http-services.ts";
import { telegramContactsTool, telegramGroupsTool, telegramSendTool } from "./telegram.ts";

export const TOOLS: Tool[] = [
  uptimeTool,
  systemInfoTool,
  shellTool,
  psTool,
  claudeTool,
  webSearchTool,
  moltbookTool,
  logSearchTool,
  evalTool,
  glock17Tool,
  cheatShTool,
  rateSxTool,
  wttrTool,
  ifconfigTool,
  telegramContactsTool,
  telegramGroupsTool,
  telegramSendTool,
];
