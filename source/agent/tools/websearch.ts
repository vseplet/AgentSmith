import { Tool } from "#deepseek";

export const webSearchTool: Tool = {
  name: "web_search",
  description:
    "Search the web using DuckDuckGo. Use this to find current information, news, or answers to questions that require up-to-date data.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return. Default: 5",
      },
    },
    required: ["query"],
  },
  execute: async (args) => {
    const query = args.query as string;
    const limit = (args.limit as number) || 5;

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

    // Parse results from DuckDuckGo HTML
    const results: { title: string; url: string; snippet: string }[] = [];

    // Match result blocks
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

    // Fallback: simpler parsing if regex didn't match
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
};

function extractUrl(ddgUrl: string): string {
  // DuckDuckGo wraps URLs, extract the actual URL
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
