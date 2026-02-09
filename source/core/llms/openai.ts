import { cfg } from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  {
    key: "llm.openai.apiKey",
    label: "OpenAI API Key",
    secret: true,
  },
  {
    key: "llm.openai.model",
    label: "OpenAI model",
    secret: false,
    default: "gpt-4o",
    options: (values) =>
      fetchModels("https://api.openai.com/v1", {
        Authorization: `Bearer ${values["llm.openai.apiKey"]}`,
      }),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const apiKey = cfg("llm.openai.apiKey");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set, run: smith setup llm");

  const model = cfg("llm.openai.model") ?? "gpt-4o";

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
