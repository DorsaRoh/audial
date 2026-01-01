import { describe, it, expect } from "vitest";
import { expandPrompt, SYNONYMS } from "../dataset/synonyms";

describe("expandPrompt", () => {
  it("returns original prompt in results", () => {
    const result = expandPrompt("some random text");
    expect(result).toContain("some random text");
  });

  it("expands 'stranger things' with related terms", () => {
    const result = expandPrompt("stranger things vibe");
    expect(result).toContain("stranger things vibe");
    expect(result).toContain("retro");
    expect(result).toContain("synthwave");
    expect(result).toContain("80s");
  });

  it("expands single word matches", () => {
    const result = expandPrompt("give me some trance");
    expect(result).toContain("supersaw");
    expect(result).toContain("euphoric");
  });

  it("expands ambient keyword", () => {
    const result = expandPrompt("ambient soundscape");
    expect(result).toContain("pad");
    expect(result).toContain("atmospheric");
  });

  it("returns unique values only", () => {
    const result = expandPrompt("dark moody");
    const uniqueCount = new Set(result).size;
    expect(result.length).toBe(uniqueCount);
  });

  it("handles empty prompt", () => {
    const result = expandPrompt("");
    expect(result).toContain("");
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("is case insensitive", () => {
    const result = expandPrompt("TECHNO BEAT");
    expect(result).toContain("minimal");
    expect(result).toContain("driving");
  });
});

describe("SYNONYMS", () => {
  it("has entries for common genres", () => {
    expect(SYNONYMS["techno"]).toBeDefined();
    expect(SYNONYMS["ambient"]).toBeDefined();
    expect(SYNONYMS["house"]).toBeDefined();
    expect(SYNONYMS["trance"]).toBeDefined();
  });

  it("has entries for cultural references", () => {
    expect(SYNONYMS["stranger things"]).toBeDefined();
    expect(SYNONYMS["blade runner"]).toBeDefined();
  });
});

