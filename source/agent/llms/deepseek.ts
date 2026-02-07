import { getDeepSeekApiKey, getDeepSeekModelName } from "#config";
import type { ProviderConfig } from "#types";

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
