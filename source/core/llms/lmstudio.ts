import { cfg } from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: "llm.lmstudio.baseUrl", label: "LMStudio base URL", secret: false, default: "http://localhost:1234/v1" },
  {
    key: "llm.lmstudio.model",
    label: "LMStudio model",
    secret: false,
    options: (values) =>
      fetchModels(values["llm.lmstudio.baseUrl"] || "http://localhost:1234/v1", {}),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const baseURL = cfg("llm.lmstudio.baseUrl") ?? "http://localhost:1234/v1";
  const model = cfg("llm.lmstudio.model") ?? "local-model";

  return {
    name: "lmstudio",
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    model,
    rps: 10,
  };
}
