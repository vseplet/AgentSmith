import { getLMStudioBaseURL, getLMStudioModelName, ConfigKey } from "$/core/config.ts";
import type { ProviderConfig, ProviderSetupField } from "$/core/types.ts";
import { fetchModels } from "./utils.ts";

export const setupFields: ProviderSetupField[] = [
  { key: ConfigKey.LMSTUDIO_BASE_URL, label: "LMStudio base URL", secret: false, default: "http://localhost:1234/v1" },
  {
    key: ConfigKey.LMSTUDIO_MODEL_NAME,
    label: "LMStudio model",
    secret: false,
    options: (values) =>
      fetchModels(values[ConfigKey.LMSTUDIO_BASE_URL] || "http://localhost:1234/v1", {}),
  },
];

export async function getProviderConfig(): Promise<ProviderConfig> {
  const baseURL = (await getLMStudioBaseURL()) ?? "http://localhost:1234/v1";
  const model = (await getLMStudioModelName()) ?? "local-model";

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
