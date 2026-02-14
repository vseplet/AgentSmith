import type { InferOutput, ObjectEntries, ObjectSchema } from "@valibot/valibot";
import { parse } from "@valibot/valibot";
import { toJsonSchema } from "@valibot/to-json-schema";
import type { Tool, ToolContext } from "$/core/types.ts";

interface DefineToolOptions<
  TEntries extends ObjectEntries,
  TSchema extends ObjectSchema<TEntries, undefined>,
> {
  name: string;
  description: string;
  dangerous?: boolean;
  parameters: TSchema;
  execute: (args: InferOutput<TSchema>, ctx: ToolContext) => Promise<unknown>;
}

export function defineTool<
  TEntries extends ObjectEntries,
  TSchema extends ObjectSchema<TEntries, undefined>,
>(options: DefineToolOptions<TEntries, TSchema>): Tool {
  const jsonSchema = toJsonSchema(options.parameters);

  return {
    name: options.name,
    description: options.description,
    dangerous: options.dangerous,
    parameters: jsonSchema as unknown as Tool["parameters"],
    execute: async (rawArgs: Record<string, unknown>, ctx: ToolContext) => {
      const parsed = parse(options.parameters, rawArgs);
      return options.execute(parsed, ctx);
    },
  };
}
