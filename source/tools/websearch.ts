import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";

export const webSearchTool = defineTool({
  name: "web_search",
  description:
    "Search the web using DuckDuckGo. Use this to find current information, news, or answers to questions that require up-to-date data.",
  parameters: v.object({
    query: v.pipe(v.string(), v.description("The search query")),
    limit: v.optional(v.pipe(v.number(), v.description("Maximum number of results to return. Default: 5"))),
  }),
  execute: async (args) => {
    const query = args.query;
    const limit = args.limit ?? 5;

    const url = `https://html.duckduckgo.com/html/?q=${
      encodeURIComponent(query)
    }`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      return { error: `Search failed: ${response.status}` };
    }

    const html = await response.text();

    const results: { title: string; url: string; snippet: string }[] = [];

    const resultRegex =
      /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;

    let match;
    while (
      (match = resultRegex.exec(html)) !== null && results.length < limit
    ) {
      const [, url, title, snippet] = match;
      if (url && title) {
        results.push({
          title: decodeHTMLEntities(title.trim()),
          url: extractUrl(url),
          snippet: decodeHTMLEntities(snippet?.trim() || ""),
        });
      }
    }

    if (results.length === 0) {
      const linkRegex =
        /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
      while (
        (match = linkRegex.exec(html)) !== null && results.length < limit
      ) {
        const [, url, title] = match;
        if (url && title && !url.includes("duckduckgo.com")) {
          results.push({
            title: decodeHTMLEntities(title.trim()),
            url: extractUrl(url),
            snippet: "",
          });
        }
      }
    }

    if (results.length === 0) {
      return { message: "No results found", query };
    }

    return {
      query,
      results,
      count: results.length,
    };
  },
});

function extractUrl(ddgUrl: string): string {
  const match = ddgUrl.match(/uddg=([^&]*)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return ddgUrl;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
