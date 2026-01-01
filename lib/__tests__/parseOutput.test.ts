import { describe, it, expect } from "vitest";
import { parseClaudeOutput, isCodeUnchanged } from "../parseOutput";

describe("parseClaudeOutput", () => {
  describe("valid code blocks", () => {
    it("extracts code from a properly fenced block", () => {
      const response = `\`\`\`javascript
setcpm(120)
$: note("c4 e4 g4").s("piano")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(true);
      expect(result.code).toContain("setcpm(120)");
      expect(result.code).toContain('note("c4 e4 g4")');
    });

    it("handles strudel language tag", () => {
      const response = `\`\`\`strudel
setcpm(90)
$: s("bd sd").gain(0.5)
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(true);
      expect(result.code).toContain("setcpm(90)");
    });

    it("handles js language tag", () => {
      const response = `\`\`\`js
setcpm(100)
$: note("a3").s("sine")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(true);
    });

    it("accepts raw strudel code without fences", () => {
      const response = `setcpm(80)
$: note("c4 d4 e4").s("sawtooth").lpf(800)`;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(true);
      expect(result.code).toContain("setcpm(80)");
    });

    it("allows comments before setcpm", () => {
      const response = `\`\`\`javascript
// ambient pad
setcpm(60)
$: note("c3").s("sine").gain(0.3)
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid responses", () => {
    it("rejects empty response", () => {
      const result = parseClaudeOutput("");
      expect(result.success).toBe(false);
      expect(result.error).toBe("empty response");
    });

    it("rejects whitespace-only response", () => {
      const result = parseClaudeOutput("   \n\n   ");
      expect(result.success).toBe(false);
      expect(result.error).toBe("empty response");
    });

    it("rejects response with no code block", () => {
      const result = parseClaudeOutput("Here is some music for you!");
      expect(result.success).toBe(false);
      expect(result.error).toBe("no code block found in response");
    });

    it("rejects multiple code blocks", () => {
      const response = `\`\`\`javascript
setcpm(120)
$: note("c4").s("piano")
\`\`\`

\`\`\`javascript
setcpm(100)
$: note("d4").s("piano")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain("found 2 code blocks");
    });

    it("rejects empty code block", () => {
      const response = `\`\`\`javascript
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(false);
      expect(result.error).toBe("code block is empty");
    });

    it("rejects code that doesn't start with setcpm", () => {
      const response = `\`\`\`javascript
$: note("c4").s("piano")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain("code must start with setcpm");
    });

    it("rejects code without voice assignment", () => {
      const response = `\`\`\`javascript
setcpm(120)
note("c4").s("piano")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain("must contain at least one voice assignment");
    });

    it("rejects unbalanced parentheses", () => {
      const response = `\`\`\`javascript
setcpm(120)
$: note("c4".s("piano")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain("unbalanced parentheses");
    });

    it("rejects unbalanced brackets", () => {
      const response = `\`\`\`javascript
setcpm(120)
$: note("[c4 e4").s("piano")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(false);
      expect(result.error).toContain("unbalanced brackets");
    });
  });

  describe("code cleaning", () => {
    it("removes escaped quotes", () => {
      const response = `\`\`\`javascript
setcpm(120)
$: note(\\"c4\\").s("piano")
\`\`\``;

      const result = parseClaudeOutput(response);
      expect(result.success).toBe(true);
      expect(result.code).not.toContain('\\"');
    });
  });
});

describe("isCodeUnchanged", () => {
  it("returns true for identical code", () => {
    const code = 'setcpm(120)\n$: note("c4").s("piano")';
    expect(isCodeUnchanged(code, code)).toBe(true);
  });

  it("returns true for code differing only in whitespace", () => {
    const old = 'setcpm(120)\n$: note("c4").s("piano")';
    const newer = 'setcpm(120)\n  $: note("c4").s("piano")  ';
    expect(isCodeUnchanged(old, newer)).toBe(true);
  });

  it("returns false for different code", () => {
    const old = 'setcpm(120)\n$: note("c4").s("piano")';
    const newer = 'setcpm(100)\n$: note("d4").s("piano")';
    expect(isCodeUnchanged(old, newer)).toBe(false);
  });
});

