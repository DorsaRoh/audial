// ABOUTME: API route for LLM-powered music generation
// ABOUTME: Uses Vercel AI SDK to abstract over Anthropic and OpenAI providers

import { streamText } from "ai";
import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/systemPrompt";
import {
  getConfigValues,
  buildUserPrompt,
  buildRetryPrompt,
} from "@/lib/creativeDirectives";
import { validateStrudelCode } from "@/lib/validateOutput";
import {
  getProviderFromModel,
  validateApiKeyForProvider,
  createModel,
  type Provider,
} from "@/lib/ai/providers";
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

// stream text and return accumulated result, outputting in the expected SSE format
async function streamToClient(
  provider: Provider,
  modelId: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<string> {
  const model = createModel(provider, modelId, apiKey);

  const result = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: maxTokens,
  });

  let fullText = "";

  for await (const chunk of result.textStream) {
    fullText += chunk;
    const data = JSON.stringify({
      type: "content_block_delta",
      delta: { text: chunk },
    });
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  }

  return fullText;
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
    const modelId = requestModel || "claude-sonnet-4-20250514";
    const provider = getProviderFromModel(modelId);

    // Validate API key matches the selected provider
    const keyError = validateApiKeyForProvider(apiKey, provider);
    if (keyError) {
      return new Response(
        JSON.stringify({ error: keyError }),
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

    // get balanced config values
    const config = getConfigValues();

    // build system prompt
    const systemPrompt = buildSystemPrompt();

    // build user prompt based on mode
    let userPrompt: string;

    if (mode === "edit" && currentCode && currentCode.trim()) {
      // edit mode: include current code context and chat history
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
          // first attempt - streaming
          const fullText = await streamToClient(
            provider,
            modelId,
            apiKey,
            systemPrompt,
            userPrompt,
            maxTokens,
            controller,
            encoder
          );

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
              await streamToClient(
                provider,
                modelId,
                apiKey,
                systemPrompt,
                retryUserPrompt,
                maxTokens,
                controller,
                encoder
              );
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
