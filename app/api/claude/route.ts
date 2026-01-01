import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import {
  getConfigValues,
  buildUserPrompt,
  buildRetryPrompt,
} from "@/lib/creativeDirectives";
import { validateStrudelCode } from "@/lib/validateOutput";
import type { GenerationMode, ChatMessage } from "@/lib/sessionStore";

// extracts code from response for validation
function extractCodeForValidation(text: string): string | null {
  const codeBlockRegex = /```(?:javascript|js|strudel)?\n?([\s\S]*?)```/g;
  const matches = Array.from(text.matchAll(codeBlockRegex));

  if (matches.length === 0) return null;

  for (const match of matches) {
    const code = match[1]?.trim();
    if (code && code.length > 30) return code;
  }

  return null;
}

// build edit mode context with current code
function buildEditContext(currentCode: string, userRequest: string): string {
  return `you are editing an existing strudel composition. here is the current code:

\`\`\`javascript
${currentCode}
\`\`\`

modify this code according to the user's request. return the FULL updated script, not a diff or patch. preserve the overall structure unless the user explicitly asks to change it.

user request: ${userRequest}

requirements:
- output the complete modified code
- keep setcpm(...) at the start
- maintain 3-6 voices with $:
- preserve what works, change what's requested
- single javascript code block only`;
}

// build new song prompt (no current code context)
function buildNewSongContext(userRequest: string): string {
  return buildUserPrompt(userRequest);
}

// truncate chat history intelligently (keep recent + first message for context)
function truncateChatHistory(
  chat: ChatMessage[],
  maxMessages: number = 10
): ChatMessage[] {
  if (chat.length <= maxMessages) return chat;

  // keep first message and last (maxMessages - 1) messages
  return [chat[0], ...chat.slice(-(maxMessages - 1))];
}

// format chat history for context
function formatChatHistory(chat: ChatMessage[]): string {
  if (chat.length === 0) return "";

  const formatted = chat
    .map((msg) => {
      const role = msg.role === "user" ? "user" : "assistant";
      // for assistant messages, only include short summary, not full code
      const content =
        msg.role === "assistant" && msg.code
          ? "[generated strudel code]"
          : msg.content;
      return `${role}: ${content}`;
    })
    .join("\n");

  return `\nprevious conversation:\n${formatted}\n`;
}

// streams claude response
async function streamClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  model: string
): Promise<string> {
  const stream = await client.messages.stream({
    model: model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  let fullText = "";

  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      const delta = event.delta as { type: string; text?: string };
      if (delta.type === "text_delta" && delta.text) {
        fullText += delta.text;
        const data = JSON.stringify({
          type: "content_block_delta",
          delta: { text: delta.text },
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
    }
  }

  return fullText;
}

// streams OpenCode Zen Claude response (uses Anthropic SDK with custom baseURL)
async function streamOpenCodeClaude(
  client: Anthropic,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  model: string
): Promise<string> {
  const stream = await client.messages.stream({
    model: model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  let fullText = "";

  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      const delta = event.delta as { type: string; text?: string };
      if (delta.type === "text_delta" && delta.text) {
        fullText += delta.text;
        const data = JSON.stringify({
          type: "content_block_delta",
          delta: { text: delta.text },
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }
    }
  }

  return fullText;
}

// streams OpenAI response
async function streamOpenAI(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  model: string
): Promise<string> {
  const stream = await client.chat.completions.create({
    model: model,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    stream: true,
  });

  let fullText = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      const data = JSON.stringify({
        type: "content_block_delta",
        delta: { text: delta },
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));
    }
  }

  return fullText;
}

// Helper to determine provider from model ID
function getProviderFromModel(model: string): "anthropic" | "openai" | "opencode" {
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) {
    return "openai";
  }
  if (model.startsWith("claude-")) {
    return "anthropic";
  }
  return "opencode";
}

// Helper to detect API key type
function detectApiKeyProvider(apiKey: string): "anthropic" | "openai" | "opencode" | "unknown" {
  if (apiKey.startsWith("sk-ant-")) {
    return "anthropic";
  }
  if (apiKey.startsWith("sk-") || apiKey.startsWith("sk-proj-")) {
    return "openai";
  }
  return "opencode";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      mode = "new" as GenerationMode,
      currentCode,
      chatHistory = [] as ChatMessage[],
      sessionId: _sessionId,
      model: requestModel,
      apiKey: requestApiKey,
    } = body;

    // API key must be provided by the client via Settings
    if (!requestApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "No API key configured. Please add your API key and choose a model in Settings.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = requestApiKey;

    // Use client-provided model if available, otherwise default
    const model = requestModel || "claude-sonnet-4-20250514";
    const provider = getProviderFromModel(model);
    
    // Detect API key type and validate it matches the selected provider
    const keyProvider = detectApiKeyProvider(apiKey);
    const providers = { anthropic: "Anthropic", openai: "OpenAI", opencode: "OpenCode Zen" };
    const isOpencodeProvider = provider === "opencode";
    if (!isOpencodeProvider && keyProvider !== "unknown" && keyProvider !== provider) {
      return new Response(
        JSON.stringify({
          error: `You selected an ${providers[provider]} model but provided an ${providers[keyProvider]} API key. Please update your API key in Settings to match the selected model.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create appropriate client based on provider
    // Create appropriate client based on provider
    const anthropicClient = provider === "anthropic" ? new Anthropic({ apiKey }) : null;
    const openaiClient = provider === "openai" ? new OpenAI({ apiKey }) : null;
    const opencodeAnthropicClient = provider === "opencode"
      ? new Anthropic({ apiKey, baseURL: "https://opencode.ai/zen/v1" })
      : null;
    const opencodeOpenAIClient = provider === "opencode"
      ? new OpenAI({ apiKey, baseURL: "https://opencode.ai/zen/v1" })
      : null;

    // OpenCode Claude models use Anthropic API, others use OpenAI API
    const isOpencodeClaude = provider === "opencode" && model.startsWith("claude-");
    const opencodeClient = isOpencodeClaude ? opencodeAnthropicClient : opencodeOpenAIClient;

    // get balanced config values
    const config = getConfigValues();

    // build system prompt
    const systemPrompt = buildSystemPrompt();

    // build user prompt based on mode
    let userPrompt: string;

    if (mode === "edit" && currentCode && currentCode.trim()) {
      // edit mode: include current code context
      const chatContext = formatChatHistory(truncateChatHistory(chatHistory, 6));
      userPrompt = buildEditContext(currentCode, prompt) + chatContext;
    } else {
      // new mode: no previous code context
      userPrompt = buildNewSongContext(prompt);
    }

    // reasonable max tokens
    const maxTokens = 4096;

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullText: string;
          if (isOpencodeClaude && opencodeAnthropicClient) {
            fullText = await streamOpenCodeClaude(
              opencodeAnthropicClient,
              systemPrompt,
              userPrompt,
              maxTokens,
              controller,
              encoder,
              model
            );
          } else if ((provider === "openai" || (provider === "opencode" && !isOpencodeClaude)) && (openaiClient || opencodeOpenAIClient)) {
            const client = provider === "opencode" ? opencodeOpenAIClient! : openaiClient!;
            fullText = await streamOpenAI(
              client,
              systemPrompt,
              userPrompt,
              maxTokens,
              controller,
              encoder,
              model
            );
          } else if (anthropicClient) {
            fullText = await streamClaude(
              anthropicClient,
              systemPrompt,
              userPrompt,
              maxTokens,
              controller,
              encoder,
              model
            );
          } else {
            throw new Error("No valid API client configured");
          }

          // validate the output
          const extractedCode = extractCodeForValidation(fullText);

          if (extractedCode) {
            const validation = validateStrudelCode(extractedCode, {
              maxVoices: config.maxVoices,
              maxLines: config.maxLines,
              maxRandomUsage: config.maxRandomUsage,
            });

            // if invalid, do one gentle retry
            if (!validation.valid) {
              // send status update
              const statusMsg = JSON.stringify({
                type: "status",
                status: "simplifying...",
              });
              controller.enqueue(encoder.encode(`data: ${statusMsg}\n\n`));

              // build retry prompt with issues
              const retryPrompt = buildRetryPrompt(prompt, validation.issues);
              
              // for edit mode, include the current code in retry
              let retryUserPrompt: string;
              if (mode === "edit" && currentCode && currentCode.trim()) {
                retryUserPrompt = buildEditContext(currentCode, retryPrompt);
              } else {
                retryUserPrompt = buildUserPrompt(retryPrompt);
              }

              // clear signal to client
              const clearMsg = JSON.stringify({ type: "clear" });
              controller.enqueue(encoder.encode(`data: ${clearMsg}\n\n`));

              // second attempt - also streaming
              if (isOpencodeClaude && opencodeAnthropicClient) {
                await streamOpenCodeClaude(
                  opencodeAnthropicClient,
                  systemPrompt,
                  retryUserPrompt,
                  maxTokens,
                  controller,
                  encoder,
                  model
                );
              } else if ((provider === "openai" || (provider === "opencode" && !isOpencodeClaude)) && (openaiClient || opencodeOpenAIClient)) {
                const client = provider === "opencode" ? opencodeOpenAIClient! : openaiClient!;
                await streamOpenAI(
                  client,
                  systemPrompt,
                  retryUserPrompt,
                  maxTokens,
                  controller,
                  encoder,
                  model
                );
              } else if (anthropicClient) {
                await streamClaude(
                  anthropicClient,
                  systemPrompt,
                  retryUserPrompt,
                  maxTokens,
                  controller,
                  encoder,
                  model
                );
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          let errorMessage = "stream error";
          
          if (error instanceof Error) {
            console.error("API Error:", error.message, error);
            // Check for authentication/invalid API key errors
            const msg = error.message.toLowerCase();
            if (
              msg.includes("authentication") ||
              msg.includes("invalid api key") ||
              msg.includes("invalid x-api-key") ||
              msg.includes("401") ||
              msg.includes("unauthorized")
            ) {
              errorMessage = "This API key does not exist. Please check your API key in Settings.";
            } else if (msg.includes("model") || msg.includes("not found") || msg.includes("does not exist")) {
              errorMessage = `Model error: ${error.message}. Please select a valid model in Settings.`;
            } else {
              errorMessage = error.message;
            }
          } else {
            console.error("Unknown API Error:", error);
          }
          
          const data = JSON.stringify({
            type: "error",
            error: { message: errorMessage },
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
