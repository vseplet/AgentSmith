import { assertEquals } from "@std/assert";
import {
  closeKv,
  ConfigKey,
  deleteConfigValue,
  getAllConfig,
  getConfigValue,
  getDeepSeekApiKey,
  getDeepSeekModelName,
  getTelegramBotApiKey,
  setConfigValue,
  setDeepSeekApiKey,
  setDeepSeekModelName,
  setTelegramBotApiKey,
} from "../source/config/mod.ts";

Deno.test({
  name: "Config: set and get DeepSeek API key",
  async fn() {
    const testKey = "test-deepseek-key-123";
    await setDeepSeekApiKey(testKey);
    const result = await getDeepSeekApiKey();
    assertEquals(result, testKey);
    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: set and get DeepSeek model name",
  async fn() {
    const testModel = "deepseek-chat";
    await setDeepSeekModelName(testModel);
    const result = await getDeepSeekModelName();
    assertEquals(result, testModel);
    await deleteConfigValue(ConfigKey.DEEPSEEK_MODEL_NAME);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: set and get Telegram Bot API key",
  async fn() {
    const testKey = "test-telegram-key-456";
    await setTelegramBotApiKey(testKey);
    const result = await getTelegramBotApiKey();
    assertEquals(result, testKey);
    await deleteConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: generic set and get config value",
  async fn() {
    const testKey = "generic-test-key";
    await setConfigValue(ConfigKey.DEEPSEEK_API_KEY, testKey);
    const result = await getConfigValue(ConfigKey.DEEPSEEK_API_KEY);
    assertEquals(result, testKey);
    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: get all config values",
  async fn() {
    const deepseekKey = "all-test-deepseek";
    const deepseekModel = "deepseek-coder";
    const telegramKey = "all-test-telegram";

    await setDeepSeekApiKey(deepseekKey);
    await setDeepSeekModelName(deepseekModel);
    await setTelegramBotApiKey(telegramKey);

    const config = await getAllConfig();
    assertEquals(config[ConfigKey.DEEPSEEK_API_KEY], deepseekKey);
    assertEquals(config[ConfigKey.DEEPSEEK_MODEL_NAME], deepseekModel);
    assertEquals(config[ConfigKey.TELEGRAM_BOT_API_KEY], telegramKey);

    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
    await deleteConfigValue(ConfigKey.DEEPSEEK_MODEL_NAME);
    await deleteConfigValue(ConfigKey.TELEGRAM_BOT_API_KEY);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: return null for non-existent key",
  async fn() {
    await deleteConfigValue(ConfigKey.DEEPSEEK_API_KEY);
    const result = await getDeepSeekApiKey();
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
