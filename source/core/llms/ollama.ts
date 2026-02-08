import { getOllamaBaseURL, getOllamaModelName, ConfigKey } from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: ConfigKey.OLLAMA_BASE_URL, label: "Ollama base URL", secret: false, default: "http://localhost:11434/v1" },
  {
    key: ConfigKey.OLLAMA_MODEL_NAME,
    label: "Ollama model",
    secret: false,
    options: (values) =>
      fetchModels(values[ConfigKey.OLLAMA_BASE_URL] || "http://localhost:11434/v1", {}),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const baseURL = (await getOllamaBaseURL()) ?? "http://localhost:11434/v1";
  const model = (await getOllamaModelName()) ?? "llama3";

  return {
    name: "ollama",
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    model,
    rps: 10,
  };
}
