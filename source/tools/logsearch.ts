import type { Tool } from "$/core/types.ts";
import { getDumpDir, searchDumps } from "$/core/dump.ts";

export const logSearchTool: Tool = {
  name: "search_history",
  description:
    "Search through conversation history logs. Use this to find previous conversations, remember past context, or search for specific topics discussed before.",
  parameters: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "Search pattern (regex supported)",
      },
      chat_id: {
        type: "number",
        description:
          "Filter by specific chat ID. If not provided, searches all chats.",
      },
    },
    required: ["pattern"],
  },
  execute: async (args) => {
    const pattern = args.pattern as string;
    const chatId = args.chat_id as number | undefined;

    if (!pattern) {
      return { error: "pattern is required" };
    }

    const results = await searchDumps(pattern, chatId);

    if (results.length === 0) {
      return {
        message: "No matches found",
        pattern,
        dump_dir: getDumpDir(),
      };
    }

    // Limit results to avoid huge responses
    const limitedResults = results.slice(0, 5).map((r) => ({
      file: r.file,
      matches: r.matches.slice(0, 3),
      total_matches: r.matches.length,
    }));

    return {
      pattern,
      results: limitedResults,
      total_files: results.length,
    };
  },
};
