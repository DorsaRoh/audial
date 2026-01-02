// ABOUTME: AI provider utilities for model detection and creation
// ABOUTME: Abstracts provider-specific logic for Anthropic and OpenAI

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export type Provider = "anthropic" | "openai";
export type ApiKeyProvider = Provider | "unknown";

/**
 * Determine provider from model ID based on naming conventions
 */
export function getProviderFromModel(model: string): Provider {
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) {
    return "openai";
  }
  return "anthropic";
}

/**
 * Detect API key type from its prefix
 */
export function detectApiKeyProvider(apiKey: string): ApiKeyProvider {
  if (apiKey.startsWith("sk-ant-")) {
    return "anthropic";
  }
  if (apiKey.startsWith("sk-") || apiKey.startsWith("sk-proj-")) {
    return "openai";
  }
  return "unknown";
}

/**
 * Validate that the API key matches the selected provider
 * Returns an error message if mismatched, null if valid
 */
export function validateApiKeyForProvider(
  apiKey: string,
  provider: Provider
): string | null {
  const keyProvider = detectApiKeyProvider(apiKey);
  if (keyProvider !== "unknown" && keyProvider !== provider) {
    const providerName = provider === "openai" ? "OpenAI" : "Anthropic";
    const keyProviderName = keyProvider === "openai" ? "OpenAI" : "Anthropic";
    return `You selected an ${providerName} model but provided an ${keyProviderName} API key. Please update your API key in Settings to match the selected model.`;
  }
  return null;
}

/**
 * Create the appropriate model instance based on provider
 */
export function createModel(
  provider: Provider,
  modelId: string,
  apiKey: string
) {
  if (provider === "openai") {
    const openai = createOpenAI({ apiKey });
    return openai(modelId);
  } else {
    const anthropic = createAnthropic({ apiKey });
    return anthropic(modelId);
  }
}
