import { getDeepSeekApiKey, getDeepSeekModelName, ConfigKey } from "#config";
import type { ProviderConfig, ProviderSetupField } from "#types";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: ConfigKey.DEEPSEEK_API_KEY, label: "DeepSeek API Key", secret: true },
  {
    key: ConfigKey.DEEPSEEK_MODEL_NAME,
    label: "DeepSeek model",
    secret: false,
    default: "deepseek-chat",
    options: (values) =>
      fetchModels("https://api.deepseek.com", {
        Authorization: `Bearer ${values[ConfigKey.DEEPSEEK_API_KEY]}`,
      }),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
  const model = (await getDeepSeekModelName()) ?? "deepseek-chat";

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
