import { describe, it, expect } from "vitest";
import { validateStrudelCode, ValidationConfig } from "../validateOutput";

describe("validateStrudelCode", () => {
  // helper to create valid base code (needs 5+ non-empty, non-comment lines)
  const validCode = (extra = "") => `setcpm(120)
$: note("c4 e4 g4").s("piano").gain(0.5)
$: s("bd sd bd sd").gain(0.4)
$: note("e4 g4 b4").s("sine").gain(0.3)
$: s("hh*8").gain(0.2)
${extra}`;

  describe("valid code", () => {
    it("accepts well-formed strudel code", () => {
      const result = validateStrudelCode(validCode());
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("accepts code with multiple voices", () => {
      const code = `setcpm(90)
$: note("c4").s("sine")
$: note("e4").s("triangle")
$: s("bd")
$: s("hh*4")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(true);
    });
  });

  describe("voice limits", () => {
    it("rejects too many voices", () => {
      const code = `setcpm(120)
$: note("c4").s("piano")
$: note("d4").s("piano")
$: note("e4").s("piano")
$: note("f4").s("piano")
$: note("g4").s("piano")
$: note("a4").s("piano")
$: note("b4").s("piano")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("too many voices"))).toBe(true);
    });

    it("respects custom voice limit", () => {
      const code = `setcpm(120)
$: note("c4").s("piano")
$: note("d4").s("piano")
$: note("e4").s("piano")`;

      const config: Partial<ValidationConfig> = { maxVoices: 2 };
      const result = validateStrudelCode(code, config);
      expect(result.valid).toBe(false);
    });
  });

  describe("setcpm requirement", () => {
    it("rejects code without setcpm", () => {
      const code = `$: note("c4").s("piano")
$: s("bd sd")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("missing setcpm"))).toBe(true);
    });

    it("allows code without setcpm when disabled", () => {
      const code = `$: note("c4").s("piano")
$: s("bd sd bd sd bd sd")`;

      const config: Partial<ValidationConfig> = { requireSetcpm: false };
      const result = validateStrudelCode(code, config);
      // should only fail on "too short" not setcpm
      expect(result.issues.some((i) => i.includes("missing setcpm"))).toBe(false);
    });
  });

  describe("code length", () => {
    it("rejects code that is too short", () => {
      const code = `setcpm(120)
$: s("bd")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("too short"))).toBe(true);
    });
  });

  describe("forbidden samples", () => {
    it("rejects localhost samples", () => {
      const code = `setcpm(120)
samples("http://localhost:8080/samples")
$: s("mysample").gain(0.5)
$: note("c4").s("piano")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("localhost") || i.includes("external"))).toBe(true);
    });

    it("rejects external URL samples", () => {
      const code = `setcpm(120)
samples("https://example.com/samples")
$: s("mysample").gain(0.5)
$: note("c4").s("piano")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
    });
  });

  describe("randomness limits", () => {
    it("rejects excessive random usage", () => {
      const code = `setcpm(120)
$: note("c4").s("piano").gain(rand()).lpf(rand())
$: s("bd").gain(rand()).delay(rand()).room(rand())`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("randomness"))).toBe(true);
    });
  });

  describe("extreme effects", () => {
    it("warns about high delay feedback", () => {
      const code = `setcpm(120)
$: note("c4").s("piano").delayfeedback(0.9)
$: s("bd sd bd sd bd sd")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("extreme effect"))).toBe(true);
    });

    it("warns about high room values", () => {
      const code = `setcpm(120)
$: note("c4").s("piano").room(0.95)
$: s("bd sd bd sd bd sd")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("extreme effect"))).toBe(true);
    });
  });

  describe("syntax issues", () => {
    it("catches unbalanced parentheses", () => {
      const code = `setcpm(120)
$: note("c4".s("piano")
$: s("bd sd bd sd bd sd")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("unbalanced parentheses"))).toBe(true);
    });

    it("catches unbalanced brackets", () => {
      const code = `setcpm(120)
$: note("[c4 e4 g4").s("piano")
$: s("bd sd bd sd bd sd")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("unbalanced brackets"))).toBe(true);
    });

    it("catches unbalanced angle brackets in patterns", () => {
      const code = `setcpm(120)
$: note("<c4 e4 g4").s("piano")
$: s("bd sd bd sd bd sd")`;

      const result = validateStrudelCode(code);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("unbalanced mini-notation"))).toBe(true);
    });
  });

});

