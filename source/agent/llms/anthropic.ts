import { getAnthropicApiKey, getAnthropicModelName, ConfigKey } from "#config";
import type { ProviderConfig, ProviderSetupField } from "#types";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: ConfigKey.ANTHROPIC_API_KEY, label: "Anthropic API Key", secret: true },
  {
    key: ConfigKey.ANTHROPIC_MODEL_NAME,
    label: "Anthropic model",
    secret: false,
    default: "claude-sonnet-4-20250514",
    options: (values) =>
      fetchModels("https://api.anthropic.com/v1", {
        "x-api-key": values[ConfigKey.ANTHROPIC_API_KEY],
        "anthropic-version": "2023-06-01",
      }),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const model = (await getAnthropicModelName()) ?? "claude-sonnet-4-20250514";

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
