import { cfg } from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: "llm.ollama.baseUrl", label: "Ollama base URL", secret: false, default: "http://localhost:11434/v1" },
  {
    key: "llm.ollama.model",
    label: "Ollama model",
    secret: false,
    options: (values) =>
      fetchModels(values["llm.ollama.baseUrl"] || "http://localhost:11434/v1", {}),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const baseURL = cfg("llm.ollama.baseUrl") ?? "http://localhost:11434/v1";
  const model = cfg("llm.ollama.model") ?? "llama3";

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
