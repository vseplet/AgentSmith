import { Confirm, Input, Secret, Select } from "@cliffy/prompt";
import { getProfileNames } from "../agent/profiles/mod.ts";
import { getProviderNames, getProviderSetupFields } from "../agent/llms/mod.ts";
import {
  getAgentProfile,
  getConfigValue,
  getLLMProvider,
  getTelegramBotApiKey,
  getTelegramCode,
  setAgentProfile,
  setConfigValue,
  setLLMProvider,
  setTelegramBotApiKey,
  setTelegramCode,
} from "#config";

function maskSecret(value: string | null): string {
  if (!value) return "(not set)";
  if (value.length <= 4) return "****";
  return value.slice(0, 2) + "****" + value.slice(-2);
}

async function keepExisting(
  label: string,
  current: string,
  secret: boolean,
): Promise<boolean> {
  const display = secret ? maskSecret(current) : current;
  return await Confirm.prompt({
    message: `${label}: ${display} — keep current?`,
    default: true,
  });
}

export async function setupProfile(): Promise<void> {
  console.log("\n--- Profile Setup ---\n");

  const current = await getAgentProfile();
  if (current && (await keepExisting("Agent profile", current, false))) {
    console.log("Profile unchanged.");
    return;
  }

  const agentProfile = await Select.prompt({
    message: "Agent profile",
    options: getProfileNames(),
  });

  await setAgentProfile(agentProfile);
  console.log("Profile saved.");
  Deno.exit(0);
}

export async function setupTelegram(): Promise<void> {
  console.log("\n--- Telegram Setup ---\n");

  const currentKey = await getTelegramBotApiKey();
  let telegramBotApiKey: string;
  if (currentKey && (await keepExisting("Bot API Key", currentKey, true))) {
    telegramBotApiKey = currentKey;
  } else {
    telegramBotApiKey = await Secret.prompt({
      message: "Telegram Bot API Key",
    });
  }

  const currentCode = await getTelegramCode();
  let telegramCode: string;
  if (
    currentCode &&
    (await keepExisting("Authorization code", currentCode, false))
  ) {
    telegramCode = currentCode;
  } else {
    telegramCode = await Input.prompt({ message: "Owner authorization code" });
  }

  await setTelegramBotApiKey(telegramBotApiKey);
  await setTelegramCode(telegramCode);
  console.log("Telegram configuration saved.");
  Deno.exit(0);
}

export async function setupLLM(): Promise<void> {
  console.log("\n--- LLM Setup ---\n");

  const currentProvider = await getLLMProvider();
  let providerName: string;
  if (
    currentProvider &&
    (await keepExisting("LLM provider", currentProvider, false))
  ) {
    providerName = currentProvider;
  } else {
    providerName = await Select.prompt({
      message: "LLM provider",
      options: getProviderNames(),
    });
  }

  const fields = getProviderSetupFields(providerName);
  const values: Record<string, string> = {};

  for (const field of fields) {
    const current = await getConfigValue(field.key);

    if (current && (await keepExisting(field.label, current, field.secret))) {
      values[field.key] = current;
      continue;
    }

    if (field.resolve) {
      console.log(`  ${field.label}...`);
      values[field.key] = await field.resolve(values);
    } else if (field.secret) {
      values[field.key] = await Secret.prompt({ message: field.label });
    } else if (field.options) {
      let modelList: string[] = [];
      try {
        console.log("  Fetching available models...");
        modelList = await field.options(values);
      } catch {
        console.log("  Could not fetch models, entering manually");
      }

      if (modelList.length > 0) {
        values[field.key] = await Select.prompt({
          message: field.label,
          options: modelList,
          ...(field.default &&
            modelList.includes(field.default) && { default: field.default }),
        });
      } else {
        values[field.key] = await Input.prompt({
          message: field.label,
          ...(field.default && { default: field.default }),
        });
      }
    } else {
      values[field.key] = await Input.prompt({
        message: field.label,
        ...(field.default && { default: field.default }),
      });
    }
  }

  await setLLMProvider(providerName);
  for (const field of fields) {
    await setConfigValue(field.key, values[field.key]);
  }

  console.log("LLM configuration saved.");
  Deno.exit(0);
}

export async function runSetup(): Promise<void> {
  await setupProfile();
  await setupTelegram();
  await setupLLM();

  console.log("\nSetup complete.");
  Deno.exit(0);
}
