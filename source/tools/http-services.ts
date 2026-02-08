import type { Tool } from "$/core/types.ts";

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

export const cheatShTool: Tool = {
  name: "cheat_sh",
  description:
    "Get cheat sheets for commands, programming languages, tools. Examples: 'curl', 'python/lambda', 'git/commit', 'js/array/sort'",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Topic to look up: command name, language/topic, or language/topic/subtopic",
      },
    },
    required: ["query"],
  },
  execute: async (args) => {
    const query = args.query as string;
    try {
      const text = await fetchText(
        `http://cheat.sh/${encodeURIComponent(query)}?T`,
      );
      // Trim to avoid huge responses
      return text.slice(0, 2000);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to fetch" };
    }
  },
};

export const rateSxTool: Tool = {
  name: "currency_rates",
  description:
    "Get currency exchange rates. Query examples: '' (all rates), 'usd', 'eur', 'btc', '1usd/eur' (convert)",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Currency code or conversion (e.g., 'usd', 'btc', '100usd/rub'). Empty for all rates.",
      },
    },
  },
  execute: async (args) => {
    const query = (args.query as string) || "";
    try {
      const text = await fetchText(
        `http://rate.sx/${encodeURIComponent(query)}?T`,
      );
      return text.slice(0, 2000);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to fetch" };
    }
  },
};

export const wttrTool: Tool = {
  name: "weather",
  description:
    "Get weather forecast. Query: city name, airport code, or coordinates.",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description:
          "City name (e.g., 'Moscow', 'London'), airport code (e.g., 'JFK'), or leave empty for auto-detect",
      },
      format: {
        type: "string",
        enum: ["full", "short", "oneline"],
        description:
          "Output format: full (3-day forecast), short (current), oneline (minimal)",
      },
    },
  },
  execute: async (args) => {
    const location = (args.location as string) || "";
    const format = (args.format as string) || "short";

    let url = `https://wttr.in/${encodeURIComponent(location)}`;
    if (format === "oneline") {
      url += "?format=3";
    } else if (format === "short") {
      url += "?format=4";
    } else {
      url += "?T&n"; // no colors, narrow
    }

    try {
      const text = await fetchText(url);
      return text.slice(0, 2000);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to fetch" };
    }
  },
};

export const ifconfigTool: Tool = {
  name: "my_ip",
  description: "Get current public IP address and network info.",
  parameters: {
    type: "object",
    properties: {
      info: {
        type: "string",
        enum: ["ip", "country", "city", "all"],
        description: "What info to get: ip, country, city, or all",
      },
    },
  },
  execute: async (args) => {
    const info = (args.info as string) || "all";

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
};
