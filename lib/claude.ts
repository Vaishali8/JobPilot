/**
 * Anthropic Claude API client for job scoring and cover letter generation.
 *
 * Uses the raw Messages API via fetch — no SDK dependency needed.
 * - Haiku: Used for scoring jobs against the resume (fast, cheap).
 * - Sonnet: Used for generating cover letters (higher quality).
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export type ClaudeModel = "haiku" | "sonnet";

const MODEL_IDS: Record<ClaudeModel, string> = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-5-20250929",
};

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: { type: "text"; text: string }[];
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Sends a message to Claude and returns the text response.
 *
 * @param model - Which Claude model to use ("haiku" for scoring, "sonnet" for cover letters)
 * @param systemPrompt - System instructions
 * @param messages - Conversation messages
 * @param maxTokens - Max tokens in the response (default 1024)
 */
export async function callClaude(
  model: ClaudeModel,
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 1024
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local");
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_IDS[model],
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  const textBlock = data.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("Claude returned no text content");
  }

  return textBlock.text;
}
