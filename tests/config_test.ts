import { assertEquals } from "@std/assert";
import {
  closeKv,
  ConfigKey,
  deleteConfigValue,
  getKvValue,
  setConfigValue,
  setDeepSeekApiKey,
  setDeepSeekModelName,
  setTelegramBotApiKey,
} from "../source/config/mod.ts";

Deno.test({
  name: "Config: set and get DeepSeek API key in KV",
  async fn() {
    const testKey = "test-deepseek-key-123";
    await setDeepSeekApiKey(testKey);
    const result = await getKvValue(ConfigKey.DEEPSEEK_API_KEY);
    assertEquals(result, testKey);
    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: set and get DeepSeek model name in KV",
  async fn() {
    const testModel = "deepseek-chat";
    await setDeepSeekModelName(testModel);
    const result = await getKvValue(ConfigKey.DEEPSEEK_MODEL_NAME);
    assertEquals(result, testModel);
    await deleteConfigValue(ConfigKey.DEEPSEEK_MODEL_NAME);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: set and get Telegram Bot API key in KV",
  async fn() {
    const testKey = "test-telegram-key-456";
    await setTelegramBotApiKey(testKey);
    const result = await getKvValue(ConfigKey.TELEGRAM_BOT_API_KEY);
    assertEquals(result, testKey);
    await deleteConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: generic set and get config value in KV",
  async fn() {
    const testKey = "generic-test-key";
    await setConfigValue(ConfigKey.DEEPSEEK_API_KEY, testKey);
    const result = await getKvValue(ConfigKey.DEEPSEEK_API_KEY);
    assertEquals(result, testKey);
    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: set all config values in KV",
  async fn() {
    const deepseekKey = "all-test-deepseek";
    const deepseekModel = "deepseek-coder";
    const telegramKey = "all-test-telegram";

    await setDeepSeekApiKey(deepseekKey);
    await setDeepSeekModelName(deepseekModel);
    await setTelegramBotApiKey(telegramKey);

    assertEquals(await getKvValue(ConfigKey.DEEPSEEK_API_KEY), deepseekKey);
    assertEquals(
      await getKvValue(ConfigKey.DEEPSEEK_MODEL_NAME),
      deepseekModel,
    );
    assertEquals(await getKvValue(ConfigKey.TELEGRAM_BOT_API_KEY), telegramKey);

    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
    await deleteConfigValue(ConfigKey.DEEPSEEK_MODEL_NAME);
    await deleteConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: return null for non-existent key in KV",
  async fn() {
    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
    const result = await getKvValue(ConfigKey.DEEPSEEK_API_KEY);
    assertEquals(result, null);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: cleanup - close KV connection",
  fn() {
    closeKv();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
