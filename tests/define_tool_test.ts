import { assertEquals, assertRejects } from "@std/assert";
import * as v from "@valibot/valibot";
import { defineTool } from "$/core/define-tool.ts";

Deno.test("defineTool: JSON Schema generation — string, number, boolean", () => {
  const tool = defineTool({
    name: "test_tool",
    description: "A test tool",
    parameters: v.object({
      name: v.string(),
      count: v.number(),
      verbose: v.boolean(),
    }),
    execute: async (args) => args,
  });

  assertEquals(tool.parameters.type, "object");
  assertEquals(tool.parameters.properties.name, { type: "string" });
  assertEquals(tool.parameters.properties.count, { type: "number" });
  assertEquals(tool.parameters.properties.verbose, { type: "boolean" });
  assertEquals(tool.parameters.required?.sort(), ["count", "name", "verbose"]);
});

Deno.test("defineTool: JSON Schema generation — optional fields", () => {
  const tool = defineTool({
    name: "test_optional",
    description: "Test optionals",
    parameters: v.object({
      query: v.string(),
      limit: v.optional(v.number()),
    }),
    execute: async (args) => args,
  });

  assertEquals(tool.parameters.required, ["query"]);
});

Deno.test("defineTool: JSON Schema generation — picklist (enum)", () => {
  const tool = defineTool({
    name: "test_enum",
    description: "Test enum",
    parameters: v.object({
      sort_by: v.picklist(["cpu", "memory", "pid"]),
    }),
    execute: async (args) => args,
  });

  const sortByProp = tool.parameters.properties.sort_by as Record<string, unknown>;
  assertEquals(sortByProp.enum, ["cpu", "memory", "pid"]);
});

Deno.test("defineTool: JSON Schema generation — description via pipe", () => {
  const tool = defineTool({
    name: "test_desc",
    description: "Test descriptions",
    parameters: v.object({
      query: v.pipe(v.string(), v.description("The search query")),
    }),
    execute: async (args) => args,
  });

  const queryProp = tool.parameters.properties.query as Record<string, unknown>;
  assertEquals(queryProp.description, "The search query");
});

Deno.test("defineTool: validation — valid args pass through", async () => {
  const tool = defineTool({
    name: "test_valid",
    description: "Test validation",
    parameters: v.object({
      name: v.string(),
      count: v.optional(v.number()),
    }),
    execute: async (args) => ({ received: args }),
  });

  const result = await tool.execute({ name: "hello", count: 5 });
  assertEquals(result, { received: { name: "hello", count: 5 } });
});

Deno.test("defineTool: validation — optional omitted", async () => {
  const tool = defineTool({
    name: "test_optional_exec",
    description: "Test optional execution",
    parameters: v.object({
      name: v.string(),
      count: v.optional(v.number()),
    }),
    execute: async (args) => ({ received: args }),
  });

  const result = await tool.execute({ name: "hello" });
  assertEquals(result, { received: { name: "hello" } });
});

Deno.test("defineTool: validation — invalid args throw ValiError", async () => {
  const tool = defineTool({
    name: "test_invalid",
    description: "Test invalid args",
    parameters: v.object({
      name: v.string(),
    }),
    execute: async (args) => args,
  });

  await assertRejects(
    () => tool.execute({ name: 123 }),
    v.ValiError,
  );
});

Deno.test("defineTool: Tool interface compatibility", () => {
  const tool = defineTool({
    name: "compat_test",
    description: "Compatibility check",
    dangerous: true,
    parameters: v.object({
      cmd: v.string(),
    }),
    execute: async (args) => args.cmd,
  });

  assertEquals(tool.name, "compat_test");
  assertEquals(tool.description, "Compatibility check");
  assertEquals(tool.dangerous, true);
  assertEquals(typeof tool.execute, "function");
  assertEquals(tool.parameters.type, "object");
  assertEquals(typeof tool.parameters.properties, "object");
});

Deno.test("defineTool: empty parameters object", () => {
  const tool = defineTool({
    name: "no_params",
    description: "No parameters",
    parameters: v.object({}),
    execute: async () => ({ ok: true }),
  });

  assertEquals(tool.parameters.type, "object");
  assertEquals(Object.keys(tool.parameters.properties).length, 0);
});
