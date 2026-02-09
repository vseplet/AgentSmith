import { cfg } from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: "llm.deepseek.apiKey", label: "DeepSeek API Key", secret: true },
  {
    key: "llm.deepseek.model",
    label: "DeepSeek model",
    secret: false,
    default: "deepseek-chat",
    options: (values) =>
      fetchModels("https://api.deepseek.com", {
        Authorization: `Bearer ${values["llm.deepseek.apiKey"]}`,
      }),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const apiKey = cfg("llm.deepseek.apiKey");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
  const model = cfg("llm.deepseek.model") ?? "deepseek-chat";

  return {
    name: "deepseek",
    baseURL: "https://api.deepseek.com",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    model,
    rps: 5,
  };
}
