import {
  getOpenAIApiKey,
  getOpenAIModelName,
  ConfigKey,
} from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  {
    key: ConfigKey.OPENAI_API_KEY,
    label: "OpenAI API Key",
    secret: true,
  },
  {
    key: ConfigKey.OPENAI_MODEL_NAME,
    label: "OpenAI model",
    secret: false,
    default: "gpt-4o",
    options: (values) =>
      fetchModels("https://api.openai.com/v1", {
        Authorization: `Bearer ${values[ConfigKey.OPENAI_API_KEY]}`,
      }),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const apiKey = await getOpenAIApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY not set, run: smith setup llm");

  const model = (await getOpenAIModelName()) ?? "gpt-4o";

  return {
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    model,
    rps: 5,
  };
}
