import { getLMStudioBaseURL, getLMStudioModelName } from "#config";
import type { ProviderConfig } from "#types";

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
