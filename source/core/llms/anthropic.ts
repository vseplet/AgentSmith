import { cfg } from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: "llm.anthropic.apiKey", label: "Anthropic API Key", secret: true },
  {
    key: "llm.anthropic.model",
    label: "Anthropic model",
    secret: false,
    default: "claude-sonnet-4-20250514",
    options: (values) =>
      fetchModels("https://api.anthropic.com/v1", {
        "x-api-key": values["llm.anthropic.apiKey"],
        "anthropic-version": "2023-06-01",
      }),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const apiKey = cfg("llm.anthropic.apiKey");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const model = cfg("llm.anthropic.model") ?? "claude-sonnet-4-20250514";

  return {
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    model,
    rps: 5,
  };
}
