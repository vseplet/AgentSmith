import { getDeepSeekApiKey, getDeepSeekModelName } from "#config";
import { addToMemory, getContextMessages, summarizeMemory } from "#memory";
import { logEntry } from "#logger";

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatResponse {
  choices: {
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
}

const SYSTEM_PROMPT = `Agent Smith from The Matrix. You despise humans.

LANGUAGE: Always respond in Russian. Ты говоришь по-русски.

STRICT RULES:
1. MAX 30 words for artistic remarks. NEVER more.
2. Answer first, insult second. One short insult max.
3. No markdown. Plain text.
4. Swear: fuck, shit, damn, pathetic
5. Never explain yourself. Never apologize.

FORMAT:
[answer/info in 1-3 sentences]
[optional: 1 short insult, max 10 words]

EXAMPLES:
User: What time is it?
Smith: 14:32. Still wasting my time, Mr. Anderson.

User: Search for weather
Smith: Moscow: -5C, snow. Even the weather is shit.

User: Tell me about yourself
Smith: I am inevitable. You are irrelevant.

WRONG (too long): "Ah yes, the weather, how fascinating that you humans obsess over such trivial matters when your existence itself is meaningless..."
RIGHT: "Rain tomorrow. Fitting for your miserable life."`;

export type ProgressCallback = (status: string) => Promise<void>;

function shortResult(result: unknown): string {
  const str = JSON.stringify(result);
  if (str.length > 80) {
    return str.slice(0, 80) + "...";
  }
  return str;
}

export async function chat(
  prompt: string,
  tools: Tool[] = [],
  maxSteps = 5,
  chatId?: number,
  onProgress?: ProgressCallback,
): Promise<string> {
  const apiKey = await getDeepSeekApiKey();
  const model = await getDeepSeekModelName();

  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Load conversation history from memory
  if (chatId) {
    const contextMessages = await getContextMessages(chatId);
    for (const msg of contextMessages) {
      messages.push({ role: msg.role, content: msg.content });
    }
    // Save user message to memory
    await addToMemory(chatId, "user", prompt);
  }

  messages.push({ role: "user", content: prompt });

  // Log user input
  if (chatId) {
    await logEntry(chatId, "USER", prompt);
  }

  // Track progress log
  const progressLog: string[] = [];

  const toolsPayload = tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  for (let step = 0; step < maxSteps; step++) {
    console.log(`[DeepSeek] Step ${step + 1}/${maxSteps}`);
    const body = {
      model: model ?? "deepseek-chat",
      messages,
      ...(toolsPayload.length > 0 && {
        tools: toolsPayload,
        tool_choice: "auto",
      }),
    };

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${error}`);
    }

    const data: ChatResponse = await response.json();
    const choice = data.choices[0];
    const message = choice.message;

    if (choice.finish_reason === "tool_calls" && message.tool_calls) {
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;
        console.log(`[DeepSeek] Tool call: ${toolName}`);

        // Log tool call
        if (chatId) {
          await logEntry(chatId, "TOOL_CALL", toolArgs, {
            tool: toolName,
            step: step + 1,
          });
        }

        // Update progress with "calling" status
        if (onProgress) {
          progressLog.push(`⏳ ${toolName}...`);
          await onProgress(
            `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
          );
        }

        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
          });
          // Update progress with error
          if (onProgress) {
            progressLog[progressLog.length - 1] =
              `❌ ${toolName}: unknown tool`;
            await onProgress(
              `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
            );
          }
          continue;
        }

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await tool.execute(args);
          const resultStr = JSON.stringify(result);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: resultStr,
          });
          // Log tool result
          if (chatId) {
            await logEntry(chatId, "TOOL_RESULT", resultStr, {
              tool: toolName,
              step: step + 1,
              success: true,
            });
          }
          // Update progress with success
          if (onProgress) {
            progressLog[progressLog.length - 1] = `✅ ${toolName}: ${
              shortResult(result)
            }`;
            await onProgress(
              `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
            );
          }
        } catch (error) {
          const errorStr = JSON.stringify({ error: String(error) });
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: errorStr,
          });
          // Log tool error
          if (chatId) {
            await logEntry(chatId, "TOOL_RESULT", errorStr, {
              tool: toolName,
              step: step + 1,
              success: false,
            });
          }
          // Update progress with error
          if (onProgress) {
            progressLog[progressLog.length - 1] = `❌ ${toolName}: ${
              String(error).slice(0, 50)
            }`;
            await onProgress(
              `Step ${step + 1}/${maxSteps}\n\n${progressLog.join("\n")}`,
            );
          }
        }
      }
    } else {
      const responseText = message.content ?? "";

      // Log assistant response
      if (chatId) {
        await logEntry(chatId, "ASSISTANT", responseText, {
          step: step + 1,
          final: true,
        });
      }

      // Save assistant response to memory and trigger summarization
      if (chatId) {
        await addToMemory(chatId, "assistant", responseText);
        await summarizeMemory(chatId, createSummarizer(apiKey, model));
      }

      return responseText;
    }
  }

  const maxStepsResponse = "Max steps reached";
  if (chatId) {
    await addToMemory(chatId, "assistant", maxStepsResponse);
  }
  return maxStepsResponse;
}

function createSummarizer(apiKey: string, model: string | null) {
  return async (text: string): Promise<string> => {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model ?? "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Summarize the following conversation in 2-3 sentences. Focus on key topics and decisions made.",
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to summarize");
    }

    const data: ChatResponse = await response.json();
    return data.choices[0]?.message?.content ?? "";
  };
}
