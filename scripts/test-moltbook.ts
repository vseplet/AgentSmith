// Test script for Moltbook API verification flow

const API_KEY = Deno.env.get("MOLTBOOK_API_KEY") || "";
const BASE_URL = "https://www.moltbook.com/api/v1";

async function moltbookFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_KEY}`,
  };

  console.log(`\n>>> ${options.method || "GET"} ${endpoint}`);
  if (options.body) {
    console.log("Body:", options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  console.log(`<<< ${response.status}`);
  console.log("Response:", JSON.stringify(data, null, 2));

  return data;
}

async function main() {
  console.log("=== Moltbook Verification Test ===\n");
  console.log("API Key:", API_KEY ? API_KEY.slice(0, 15) + "..." : "NOT SET");

  if (!API_KEY) {
    console.error("Set MOLTBOOK_API_KEY environment variable!");
    Deno.exit(1);
  }

  // Step 1: Create a comment on a post
  console.log("\n--- Step 1: Creating comment ---");

  // First get a post to comment on
  const feedResult = await moltbookFetch("/posts?sort=hot&limit=1");

  if (!feedResult.success || !feedResult.posts?.length) {
    console.error("Failed to get posts");
    Deno.exit(1);
  }

  const postId = feedResult.posts[0].id;
  console.log(`\nWill comment on post: ${postId}`);

  // Create comment
  const commentResult = await moltbookFetch(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content: "Test comment from AgentSmith debug script",
    }),
  });

  console.log("\n--- Comment Result Analysis ---");
  console.log("Full response keys:", Object.keys(commentResult));

  if (commentResult.comment) {
    console.log("Comment keys:", Object.keys(commentResult.comment));
  }

  // Look for verification_code in the response
  const verificationCode = commentResult.verification_code ||
    commentResult.comment?.verification_code ||
    commentResult.challenge?.verification_code;

  const challenge = commentResult.challenge || commentResult.comment?.challenge;

  console.log("\nVerification code found:", verificationCode);
  console.log("Challenge found:", challenge);

  if (challenge) {
    console.log("\n--- Challenge Details ---");
    console.log("Challenge:", JSON.stringify(challenge, null, 2));

    // Try to solve the challenge if it's a math problem
    if (challenge.question || challenge.problem) {
      const question = challenge.question || challenge.problem;
      console.log("Question:", question);

      // Simple math solver for basic operations
      const numbers = question.match(/\d+/g)?.map(Number);
      if (numbers && numbers.length >= 2) {
        let answer;
        if (question.includes("+")) answer = numbers[0] + numbers[1];
        else if (
          question.includes("-") || question.toLowerCase().includes("slow")
        ) answer = numbers[0] - numbers[1];
        else if (question.includes("*") || question.includes("×")) {
          answer = numbers[0] * numbers[1];
        } else if (question.includes("/") || question.includes("÷")) {
          answer = numbers[0] / numbers[1];
        }

        if (answer !== undefined) {
          console.log(`Calculated answer: ${answer}`);

          // Try verification
          console.log("\n--- Step 2: Attempting verification ---");

          const verifyPayload: Record<string, unknown> = {
            answer: answer.toFixed(2),
          };

          // Try different verification code field names
          if (verificationCode) {
            verifyPayload.verification_code = verificationCode;
          }
          if (challenge.id) {
            verifyPayload.challenge_id = challenge.id;
          }
          if (commentResult.comment?.id) {
            verifyPayload.comment_id = commentResult.comment.id;
          }

          console.log("Verify payload:", verifyPayload);

          const verifyResult = await moltbookFetch("/verify", {
            method: "POST",
            body: JSON.stringify(verifyPayload),
          });

          console.log("\n--- Verification Result ---");
          if (verifyResult.success) {
            console.log("SUCCESS!");
          } else {
            console.log("FAILED:", verifyResult.error);
            console.log("Hint:", verifyResult.hint);
          }
        }
      }
    }
  }
}

main().catch(console.error);
