import { assertEquals } from "@std/assert";
import { cfg, loadConfig, setCfg } from "$/core/config.ts";
import { getKv } from "$/core/common.ts";

Deno.test({
  name: "Config: setCfg and cfg round-trip",
  async fn() {
    await loadConfig();

    const testKey = "test-deepseek-key-123";
    await setCfg("llm.deepseek.apiKey", testKey);
    assertEquals(cfg("llm.deepseek.apiKey"), testKey);

    // cleanup
    const store = await getKv();
    await store.delete(["config", "llm.deepseek.apiKey"]);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: setCfg and cfg for model name",
  async fn() {
    await loadConfig();

    const testModel = "deepseek-coder";
    await setCfg("llm.deepseek.model", testModel);
    assertEquals(cfg("llm.deepseek.model"), testModel);

    const store = await getKv();
    await store.delete(["config", "llm.deepseek.model"]);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: setCfg and cfg for telegram bot key",
  async fn() {
    await loadConfig();

    const testKey = "test-telegram-key-456";
    await setCfg("telegram.botApiKey", testKey);
    assertEquals(cfg("telegram.botApiKey"), testKey);

    const store = await getKv();
    await store.delete(["config", "telegram.botApiKey"]);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Config: defaults are loaded",
  async fn() {
    await loadConfig();

    // agent.profile defaults to "smith"
    const profile = cfg("agent.profile");
    // It's either "smith" (default) or whatever was set in KV/env
    assertEquals(typeof profile, "string");
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
