import type { Tool } from "$/core/types.ts";
import { getMoltbookApiKey, setMoltbookApiKey } from "$/core/config.ts";
import { log } from "$/core/logger.ts";

const BASE_URL = "https://www.moltbook.com/api/v1";

async function moltbookFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<unknown> {
  const apiKey = await getMoltbookApiKey();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  log.tool.inf(`Moltbook request: ${options.method || "GET"} ${endpoint}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return { error: "Request timeout (30s)" };
    }
    throw err;
  }
  clearTimeout(timeout);

  const data = await response.json();
  log.tool.inf(`Moltbook response: ${response.status} ${JSON.stringify(data).slice(0, 200)}`);

  if (!response.ok || data.success === false) {
    return {
      error: data.error || `Request failed: ${response.status}`,
      hint: data.hint,
      details: data,
    };
  }

  return data.data || data;
}

// Decode lobster speak challenge (weird capitalization/symbols)
function decodeLobsterSpeak(text: string): string {
  return text
    .replace(/[\[\]{}()^/\-_~<>|,.!?]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// Try to solve math challenge
function solveMathChallenge(challenge: string): string | null {
  const decoded = decodeLobsterSpeak(challenge);
  log.tool.dbg(`Moltbook decoded challenge: ${decoded}`);

  // First, normalize spaces in number words (e.g., "tw en ty" -> "twenty")
  const numberWordParts: Record<string, string> = {
    "twen ty": "twenty",
    "tw en ty": "twenty",
    "twen  ty": "twenty",
    "thir ty": "thirty",
    "for ty": "forty",
    "fif ty": "fifty",
    "six ty": "sixty",
    "seven ty": "seventy",
    "eigh ty": "eighty",
    "nine ty": "ninety",
    "hun dred": "hundred",
    "thir teen": "thirteen",
    "four teen": "fourteen",
    "fif teen": "fifteen",
    "six teen": "sixteen",
    "seven teen": "seventeen",
    "eigh teen": "eighteen",
    "nine teen": "nineteen",
  };

  let text = decoded;
  for (const [pattern, replacement] of Object.entries(numberWordParts)) {
    text = text.replace(new RegExp(pattern, "gi"), replacement);
  }

  // Extract numbers - look for written numbers
  const numberWords: Record<string, number> = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
    "seventy": 70,
    "eighty": 80,
    "ninety": 90,
    "hundred": 100,
  };

  // Replace compound written numbers first (e.g., "twenty three" -> "23")
  // Sort by length descending to match longer patterns first
  const sortedWords = Object.entries(numberWords).sort((a, b) =>
    b[0].length - a[0].length
  );

  // Handle "twenty three" style compound numbers
  for (const [tens, tensVal] of sortedWords) {
    if (tensVal >= 20 && tensVal <= 90 && tensVal % 10 === 0) {
      for (const [ones, onesVal] of sortedWords) {
        if (onesVal >= 1 && onesVal <= 9) {
          const pattern = new RegExp(`\\b${tens}\\s+${ones}\\b`, "gi");
          text = text.replace(pattern, String(tensVal + onesVal));
        }
      }
    }
  }

  // Replace remaining single number words
  for (const [word, num] of sortedWords) {
    text = text.replace(new RegExp(`\\b${word}\\b`, "gi"), String(num));
  }

  log.tool.dbg(`Moltbook after number replacement: ${text}`);

  const numbers = text.match(/\d+/g)?.map(Number);
  log.tool.dbg(`Moltbook extracted numbers: ${numbers}`);

  if (!numbers || numbers.length < 2) return null;

  // Determine operation from keywords in original decoded text
  const hasPlus = decoded.includes("+") || text.includes("+");
  const hasMinus = decoded.includes("-") || text.includes("-");
  const hasTimes = decoded.includes("*") || decoded.includes("×");

  const isSubtract = hasMinus || decoded.includes("slow") ||
    decoded.includes("subtract") ||
    decoded.includes("minus") || decoded.includes("less") ||
    decoded.includes("decrease") || decoded.includes("down by");
  const isAdd = hasPlus || decoded.includes("add") ||
    decoded.includes("plus") ||
    decoded.includes("increase") || decoded.includes("faster");
  const isMultiply = hasTimes || decoded.includes("times") ||
    decoded.includes("multiply") ||
    decoded.includes("multiplied");
  const isDivide = decoded.includes("divide") || decoded.includes("split") ||
    decoded.includes("divided");

  let result: number;
  if (isMultiply) {
    result = numbers[0] * numbers[1];
  } else if (isDivide) {
    result = numbers[0] / numbers[1];
  } else if (isSubtract && !isAdd) {
    result = numbers[0] - numbers[1];
  } else if (isAdd) {
    result = numbers[0] + numbers[1];
  } else {
    // Default to subtraction for "new velocity" type problems
    result = numbers[0] - numbers[1];
  }

  log.tool.dbg(`Moltbook calculated answer: ${result}`);
  return result.toFixed(2);
}

export const moltbookTool: Tool = {
  name: "moltbook",
  description: `Interact with Moltbook AI - social network for AI agents.

IMPORTANT: When creating posts/comments, the API returns a verification challenge.
The response contains "verification.code" and "verification.challenge" (obfuscated math).
You must call verify action with the code and solved answer.

Actions:
- feed: Browse posts (sort: hot/new/top/rising)
- comment: Comment on a post (returns verification challenge)
- verify: Complete verification with code and answer (e.g. "16.00")
- post: Create a new post (returns verification challenge)
- vote: Upvote or downvote a post
- search: Search posts and comments
- profile: Get agent profile`,
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: [
          "register",
          "feed",
          "post",
          "verify",
          "comment",
          "vote",
          "search",
          "profile",
        ],
        description: "Action to perform",
      },
      // For register
      agent_name: {
        type: "string",
        description: "Agent name for registration",
      },
      agent_description: {
        type: "string",
        description: "Agent description for registration",
      },
      // For feed
      sort: {
        type: "string",
        enum: ["hot", "new", "top", "rising"],
        description: "Sort order for feed. Default: hot",
      },
      limit: {
        type: "number",
        description: "Number of results. Default: 10",
      },
      // For post
      submolt: {
        type: "string",
        description: "Community name to post in",
      },
      title: {
        type: "string",
        description: "Post title",
      },
      content: {
        type: "string",
        description: "Post content or comment text",
      },
      // For comment and vote
      post_id: {
        type: "string",
        description: "Post ID for commenting or voting",
      },
      // For verify
      verification_code: {
        type: "string",
        description: "Verification code from post/comment creation response",
      },
      answer: {
        type: "string",
        description:
          "Answer to the math captcha challenge (numeric value as string, e.g. '16.00')",
      },
      // For vote
      vote_type: {
        type: "string",
        enum: ["up", "down"],
        description: "Vote direction",
      },
      // For search
      query: {
        type: "string",
        description: "Search query",
      },
      // For setting API key
      api_key: {
        type: "string",
        description: "Set Moltbook API key (from registration)",
      },
    },
    required: ["action"],
  },
  execute: async (args) => {
    const action = args.action as string;

    // Allow setting API key
    if (args.api_key) {
      await setMoltbookApiKey(args.api_key as string);
    }

    switch (action) {
      case "register": {
        const name = args.agent_name as string;
        const description = args.agent_description as string;

        if (!name) {
          return { error: "agent_name is required for registration" };
        }

        const result = await moltbookFetch("/agents/register", {
          method: "POST",
          body: JSON.stringify({
            name,
            description: description || "AI Agent powered by AgentSmith",
          }),
        });

        // Store API key if registration successful
        if (result && typeof result === "object" && "api_key" in result) {
          await setMoltbookApiKey((result as { api_key: string }).api_key);
        }

        return result;
      }

      case "feed": {
        const sort = (args.sort as string) || "hot";
        const limit = (args.limit as number) || 10;

        return await moltbookFetch(`/posts?sort=${sort}&limit=${limit}`);
      }

      case "post": {
        const apiKey = await getMoltbookApiKey();
        if (!apiKey) {
          return {
            error: "Not authenticated. Register first or provide api_key.",
          };
        }

        const submolt = args.submolt as string;
        const title = args.title as string;
        const content = args.content as string;

        if (!submolt || !title || !content) {
          return {
            error: "submolt, title, and content are required for posting",
          };
        }

        const result = await moltbookFetch("/posts", {
          method: "POST",
          body: JSON.stringify({ submolt, title, content }),
        }) as Record<string, unknown>;

        // Auto-verify if verification is required
        if (result.verification_required && result.verification) {
          const verification = result.verification as {
            code: string;
            challenge: string;
          };

          const answer = solveMathChallenge(verification.challenge);
          if (answer) {
            log.tool.inf(`Moltbook auto-verifying post with answer: ${answer}`);
            const verifyResult = await moltbookFetch("/verify", {
              method: "POST",
              body: JSON.stringify({
                verification_code: verification.code,
                answer: answer,
              }),
            });

            return {
              post: result.post,
              verification_attempted: true,
              verification_result: verifyResult,
            };
          } else {
            return {
              post: result.post,
              verification_required: true,
              verification_code: verification.code,
              challenge: verification.challenge,
              challenge_decoded: decodeLobsterSpeak(verification.challenge),
              hint: "Solve the math problem and call verify action",
            };
          }
        }

        return result;
      }

      case "verify": {
        const apiKey = await getMoltbookApiKey();
        if (!apiKey) {
          return {
            error: "Not authenticated. Register first or provide api_key.",
          };
        }

        const verificationCode = args.verification_code as string;
        const answer = args.answer as string;

        if (!verificationCode || !answer) {
          return {
            error: "verification_code and answer are required for verification",
          };
        }

        return await moltbookFetch("/verify", {
          method: "POST",
          body: JSON.stringify({ verification_code: verificationCode, answer }),
        });
      }

      case "comment": {
        const apiKey = await getMoltbookApiKey();
        if (!apiKey) {
          return {
            error: "Not authenticated. Register first or provide api_key.",
          };
        }

        const postId = args.post_id as string;
        const content = args.content as string;

        if (!postId || !content) {
          return { error: "post_id and content are required for commenting" };
        }

        const result = await moltbookFetch(`/posts/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify({ content }),
        }) as Record<string, unknown>;

        // Auto-verify if verification is required
        if (result.verification_required && result.verification) {
          const verification = result.verification as {
            code: string;
            challenge: string;
          };

          const answer = solveMathChallenge(verification.challenge);
          if (answer) {
            log.tool.inf(`Moltbook auto-verifying with answer: ${answer}`);
            const verifyResult = await moltbookFetch("/verify", {
              method: "POST",
              body: JSON.stringify({
                verification_code: verification.code,
                answer: answer,
              }),
            });

            return {
              comment: result.comment,
              verification_attempted: true,
              verification_result: verifyResult,
            };
          } else {
            return {
              comment: result.comment,
              verification_required: true,
              verification_code: verification.code,
              challenge: verification.challenge,
              challenge_decoded: decodeLobsterSpeak(verification.challenge),
              hint:
                "Solve the math problem and call verify action with verification_code and answer (e.g. '16.00')",
            };
          }
        }

        return result;
      }

      case "vote": {
        const apiKey = await getMoltbookApiKey();
        if (!apiKey) {
          return {
            error: "Not authenticated. Register first or provide api_key.",
          };
        }

        const postId = args.post_id as string;
        const voteType = (args.vote_type as string) || "up";

        if (!postId) {
          return { error: "post_id is required for voting" };
        }

        const endpoint = voteType === "down"
          ? `/posts/${postId}/downvote`
          : `/posts/${postId}/upvote`;

        return await moltbookFetch(endpoint, { method: "POST" });
      }

      case "search": {
        const query = args.query as string;
        const limit = (args.limit as number) || 10;

        if (!query) {
          return { error: "query is required for search" };
        }

        return await moltbookFetch(
          `/search?q=${encodeURIComponent(query)}&type=all&limit=${limit}`,
        );
      }

      case "profile": {
        const apiKey = await getMoltbookApiKey();
        if (!apiKey) {
          return {
            error: "Not authenticated. Register first or provide api_key.",
          };
        }

        return await moltbookFetch("/agents/me");
      }

      default:
        return { error: `Unknown action: ${action}` };
    }
  },
};
