// ABOUTME: Tests for AI provider utilities
// ABOUTME: Validates provider detection, API key validation, and model creation

import { describe, it, expect } from "vitest";
import {
  getProviderFromModel,
  detectApiKeyProvider,
  validateApiKeyForProvider,
} from "../ai/providers";

describe("getProviderFromModel", () => {
  describe("OpenAI models", () => {
    it("detects gpt-4 as OpenAI", () => {
      expect(getProviderFromModel("gpt-4")).toBe("openai");
    });

    it("detects gpt-4o as OpenAI", () => {
      expect(getProviderFromModel("gpt-4o")).toBe("openai");
    });

    it("detects gpt-3.5-turbo as OpenAI", () => {
      expect(getProviderFromModel("gpt-3.5-turbo")).toBe("openai");
    });

    it("detects o1 models as OpenAI", () => {
      expect(getProviderFromModel("o1-preview")).toBe("openai");
      expect(getProviderFromModel("o1-mini")).toBe("openai");
    });

    it("detects o3 models as OpenAI", () => {
      expect(getProviderFromModel("o3-mini")).toBe("openai");
    });
  });

  describe("Anthropic models", () => {
    it("detects claude-sonnet as Anthropic", () => {
      expect(getProviderFromModel("claude-sonnet-4-20250514")).toBe("anthropic");
    });

    it("detects claude-3-opus as Anthropic", () => {
      expect(getProviderFromModel("claude-3-opus-20240229")).toBe("anthropic");
    });

    it("detects claude-3-haiku as Anthropic", () => {
      expect(getProviderFromModel("claude-3-haiku-20240307")).toBe("anthropic");
    });

    it("defaults unknown models to Anthropic", () => {
      expect(getProviderFromModel("some-unknown-model")).toBe("anthropic");
    });
  });
});

describe("detectApiKeyProvider", () => {
  describe("Anthropic keys", () => {
    it("detects sk-ant- prefix as Anthropic", () => {
      expect(detectApiKeyProvider("sk-ant-api03-xxxx")).toBe("anthropic");
    });
  });

  describe("OpenAI keys", () => {
    it("detects sk- prefix as OpenAI", () => {
      expect(detectApiKeyProvider("sk-xxxx")).toBe("openai");
    });

    it("detects sk-proj- prefix as OpenAI", () => {
      expect(detectApiKeyProvider("sk-proj-xxxx")).toBe("openai");
    });
  });

  describe("Unknown keys", () => {
    it("returns unknown for unrecognized prefixes", () => {
      expect(detectApiKeyProvider("abc-123")).toBe("unknown");
    });

    it("returns unknown for empty string", () => {
      expect(detectApiKeyProvider("")).toBe("unknown");
    });
  });
});

describe("validateApiKeyForProvider", () => {
  describe("valid combinations", () => {
    it("accepts Anthropic key for Anthropic provider", () => {
      expect(validateApiKeyForProvider("sk-ant-api03-xxxx", "anthropic")).toBeNull();
    });

    it("accepts OpenAI key for OpenAI provider", () => {
      expect(validateApiKeyForProvider("sk-xxxx", "openai")).toBeNull();
    });

    it("accepts OpenAI project key for OpenAI provider", () => {
      expect(validateApiKeyForProvider("sk-proj-xxxx", "openai")).toBeNull();
    });

    it("accepts unknown key format for any provider", () => {
      expect(validateApiKeyForProvider("abc-123", "anthropic")).toBeNull();
      expect(validateApiKeyForProvider("abc-123", "openai")).toBeNull();
    });
  });

  describe("invalid combinations", () => {
    it("rejects Anthropic key for OpenAI provider", () => {
      const error = validateApiKeyForProvider("sk-ant-api03-xxxx", "openai");
      expect(error).not.toBeNull();
      expect(error).toContain("OpenAI model");
      expect(error).toContain("Anthropic API key");
    });

    it("rejects OpenAI key for Anthropic provider", () => {
      const error = validateApiKeyForProvider("sk-xxxx", "anthropic");
      expect(error).not.toBeNull();
      expect(error).toContain("Anthropic model");
      expect(error).toContain("OpenAI API key");
    });

    it("rejects OpenAI project key for Anthropic provider", () => {
      const error = validateApiKeyForProvider("sk-proj-xxxx", "anthropic");
      expect(error).not.toBeNull();
      expect(error).toContain("Anthropic model");
      expect(error).toContain("OpenAI API key");
    });
  });
});
