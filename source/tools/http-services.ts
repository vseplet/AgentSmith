import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "curl/7.64.1" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return await response.text();
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

export const cheatShTool = defineTool({
  name: "cheat_sh",
  description:
    "Get cheat sheets for commands, programming languages, tools. Examples: 'curl', 'python/lambda', 'git/commit', 'js/array/sort'",
  parameters: v.object({
    query: v.pipe(v.string(), v.description("Topic to look up: command name, language/topic, or language/topic/subtopic")),
  }),
  execute: async (args) => {
    try {
      const text = await fetchText(
        `http://cheat.sh/${encodeURIComponent(args.query)}?T`,
      );
      return text.slice(0, 2000);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to fetch" };
    }
  },
});

export const rateSxTool = defineTool({
  name: "currency_rates",
  description:
    "Get currency exchange rates. Query examples: '' (all rates), 'usd', 'eur', 'btc', '1usd/eur' (convert)",
  parameters: v.object({
    query: v.optional(v.pipe(v.string(), v.description("Currency code or conversion (e.g., 'usd', 'btc', '100usd/rub'). Empty for all rates."))),
  }),
  execute: async (args) => {
    const query = args.query ?? "";
    try {
      const text = await fetchText(
        `http://rate.sx/${encodeURIComponent(query)}?T`,
      );
      return text.slice(0, 2000);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to fetch" };
    }
  },
});

export const wttrTool = defineTool({
  name: "weather",
  description:
    "Get weather forecast. Query: city name, airport code, or coordinates.",
  parameters: v.object({
    location: v.optional(v.pipe(v.string(), v.description("City name (e.g., 'Moscow', 'London'), airport code (e.g., 'JFK'), or leave empty for auto-detect"))),
    format: v.optional(v.pipe(
      v.picklist(["full", "short", "oneline"]),
      v.description("Output format: full (3-day forecast), short (current), oneline (minimal)"),
    )),
  }),
  execute: async (args) => {
    const location = args.location ?? "";
    const format = args.format ?? "short";

    let url = `https://wttr.in/${encodeURIComponent(location)}`;
    if (format === "oneline") {
      url += "?format=3";
    } else if (format === "short") {
      url += "?format=4";
    } else {
      url += "?T&n";
    }

    try {
      const text = await fetchText(url);
      return text.slice(0, 2000);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to fetch" };
    }
  },
});

export const ifconfigTool = defineTool({
  name: "my_ip",
  description: "Get current public IP address and network info.",
  parameters: v.object({
    info: v.optional(v.pipe(
      v.picklist(["ip", "country", "city", "all"]),
      v.description("What info to get: ip, country, city, or all"),
    )),
  }),
  execute: async (args) => {
    const info = args.info ?? "all";

    try {
      if (info === "all") {
        const [ip, country, city] = await Promise.all([
          fetchText("https://ifconfig.io/ip"),
          fetchText("https://ifconfig.io/country_code"),
          fetchText("https://ifconfig.io/city"),
        ]);
        return {
          ip: ip.trim(),
          country: country.trim(),
          city: city.trim(),
        };
      } else {
        const text = await fetchText(`https://ifconfig.io/${info}`);
        return text.trim();
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to fetch" };
    }
  },
});
