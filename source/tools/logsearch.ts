import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";
import { getDumpDir, searchDumps } from "$/core/dump.ts";

export const logSearchTool = defineTool({
  name: "search_history",
  description:
    "Search through conversation history logs. Use this to find previous conversations, remember past context, or search for specific topics discussed before.",
  parameters: v.object({
    pattern: v.pipe(v.string(), v.description("Search pattern (regex supported)")),
    chat_id: v.optional(v.pipe(v.number(), v.description("Filter by specific chat ID. If not provided, searches all chats."))),
  }),
  execute: async (args) => {
    if (!args.pattern) {
      return { error: "pattern is required" };
    }

    const results = await searchDumps(args.pattern, args.chat_id);

    if (results.length === 0) {
      return {
        message: "No matches found",
        pattern: args.pattern,
        dump_dir: getDumpDir(),
      };
    }

    const limitedResults = results.slice(0, 5).map((r) => ({
      file: r.file,
      matches: r.matches.slice(0, 3),
      total_matches: r.matches.length,
    }));

    return {
      pattern: args.pattern,
      results: limitedResults,
      total_files: results.length,
    };
  },
});
