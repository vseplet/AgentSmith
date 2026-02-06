import { createDeepSeek } from "@ai-sdk/deepseek";
import { CoreTool, generateText } from "ai";

const apiKey = Deno.env.get("DEEPSEEK_API_KEY");

if (!apiKey) {
  console.error("DEEPSEEK_API_KEY not set");
  Deno.exit(1);
}

const uptimeTool: CoreTool = {
  type: "function",
  description: "Get the current system uptime",
  parameters: {
    type: "object",
    properties: {
      format: {
        type: "string",
        enum: ["short", "full"],
        description: "Output format",
      },
    },
    required: ["format"],
    additionalProperties: false,
  },
  execute: async (_args: { format: "short" | "full" }) => {
    const command = new Deno.Command("uptime", {
      stdout: "piped",
      stderr: "piped",
    });
    const { stdout } = await command.output();
    return { uptime: new TextDecoder().decode(stdout).trim() };
  },
};

const deepseek = createDeepSeek({ apiKey });

console.log("Testing with @ai-sdk/deepseek + CoreTool...");
console.log(
  "uptimeTool.parameters:",
  JSON.stringify(uptimeTool.parameters, null, 2),
);

try {
  const result = await generateText({
    model: deepseek("deepseek-chat"),
    tools: { uptime: uptimeTool },
    maxSteps: 5,
    prompt: "What is the system uptime?",
  });

  console.log("Success!");
  console.log("Response:", result.text);
  console.log("Tool calls:", result.toolCalls);
  console.log("Tool results:", result.toolResults);
} catch (error: unknown) {
  const e = error as { requestBodyValues?: { tools?: unknown[] } };
  if (e.requestBodyValues?.tools) {
    console.log(
      "Full tools:",
      JSON.stringify(e.requestBodyValues.tools, null, 2),
    );
  }
  console.error("Error message:", (error as Error).message);
}
