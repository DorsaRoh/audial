// validates generated strudel code for coherence and safety
// guards against chaotic, unmusical, or broken compositions

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export interface ValidationConfig {
  maxVoices: number;
  maxLines: number;
  maxRandomUsage: number;
  maxEffectsPerVoice: number;
  requireSetcpm: boolean;
  rejectLocalhost: boolean;
}

const DEFAULT_CONFIG: ValidationConfig = {
  maxVoices: 6,
  maxLines: 200,
  maxRandomUsage: 4,
  maxEffectsPerVoice: 3,
  requireSetcpm: true,
  rejectLocalhost: true,
};

// count voice assignments ($: patterns)
function countVoices(code: string): number {
  const matches = code.match(/\$:/g);
  return matches ? matches.length : 0;
}

// count non-empty, non-comment lines
function countLines(code: string): number {
  const lines = code.split("\n");
  return lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("//");
  }).length;
}

// check if code uses setcpm
function hasSetcpm(code: string): boolean {
  return /setcpm\s*\(/i.test(code);
}

// check for localhost or any remote samples
function hasForbiddenSamples(code: string): boolean {
  if (/samples?\s*\(\s*['"`]https?:\/\/localhost/i.test(code)) return true;
  if (/samples?\s*\(\s*['"`]https?:\/\//i.test(code)) return true;
  if (/await\s+samples?\s*\(/i.test(code)) return true;
  return false;
}

// count randomness usage (rand, irand, perlin with high frequency, etc.)
function countRandomUsage(code: string): number {
  let count = 0;

  // count rand/irand calls
  const randMatches = code.match(/\b(rand|irand)\s*\(/g);
  if (randMatches) count += randMatches.length;

  // count perlin calls
  const perlinMatches = code.match(/\bperlin\b/g);
  if (perlinMatches) count += perlinMatches.length;

  // count sometimesBy/rarely/etc (probability-based randomness)
  const probMatches = code.match(
    /\.(sometimesBy|sometimes|rarely|almostNever|almostAlways)\s*\(/g
  );
  if (probMatches) count += probMatches.length;

  return count;
}

// check for extreme effect values
function hasExtremeEffects(code: string): boolean {
  // delay feedback > 0.5 can cause runaway echoes
  const feedbackMatch = code.match(/\.delayfeedback\s*\(\s*([\d.]+)/g);
  if (feedbackMatch) {
    for (const match of feedbackMatch) {
      const value = parseFloat(match.replace(/\.delayfeedback\s*\(\s*/, ""));
      if (value > 0.5) return true;
    }
  }

  // room > 0.8 can be washy
  const roomMatch = code.match(/\.room\s*\(\s*([\d.]+)/g);
  if (roomMatch) {
    for (const match of roomMatch) {
      const value = parseFloat(match.replace(/\.room\s*\(\s*/, ""));
      if (value > 0.8) return true;
    }
  }

  return false;
}

// check for obvious syntax issues - returns specific error message or null
function getSyntaxIssue(code: string): string | null {
  // unbalanced parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    return `unbalanced parentheses: ${openParens} opening '(' vs ${closeParens} closing ')'`;
  }

  // unbalanced brackets
  const openBrackets = (code.match(/\[/g) || []).length;
  const closeBrackets = (code.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    return `unbalanced brackets: ${openBrackets} opening '[' vs ${closeBrackets} closing ']'`;
  }

  // unbalanced braces
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return `unbalanced braces: ${openBraces} opening '{' vs ${closeBraces} closing '}'`;
  }

  // unbalanced mini-notation angle brackets < > (inside string literals)
  // extract all string contents and check angle bracket balance
  const stringContents = code.match(/["'`][^"'`]*["'`]/g) || [];
  for (const str of stringContents) {
    const openAngles = (str.match(/</g) || []).length;
    const closeAngles = (str.match(/>/g) || []).length;
    if (openAngles !== closeAngles) {
      return `unbalanced mini-notation: ${openAngles} opening '<' vs ${closeAngles} closing '>' in pattern`;
    }
  }

  return null;
}

// estimate effects per voice (rough check)
function checkEffectsDensity(code: string): boolean {
  const lines = code.split("\n");
  for (const line of lines) {
    if (line.includes("$:")) {
      // count effect methods on this line
      const effectMethods = [
        ".lpf",
        ".hpf",
        ".delay",
        ".delaytime",
        ".delayfeedback",
        ".room",
        ".size",
        ".crush",
        ".coarse",
        ".shape",
        ".vowel",
      ];
      let effectCount = 0;
      for (const effect of effectMethods) {
        const matches = line.match(new RegExp("\\" + effect.replace(".", "\\."), "g"));
        if (matches) effectCount += matches.length;
      }
      // more than 5 effects on a single voice line is too much
      if (effectCount > 5) return true;
    }
  }
  return false;
}

export function validateStrudelCode(
  code: string,
  config: Partial<ValidationConfig> = {}
): ValidationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const issues: string[] = [];

  // check voice count - too many voices creates chaos
  const voiceCount = countVoices(code);
  if (voiceCount > cfg.maxVoices) {
    issues.push(
      `too many voices (${voiceCount}/${cfg.maxVoices} max) - simplify to fewer tracks`
    );
  }

  // check line count - absurdly large code is a red flag
  const lineCount = countLines(code);
  if (lineCount > cfg.maxLines) {
    issues.push(
      `code too long (${lineCount}/${cfg.maxLines} lines max) - simplify`
    );
  }

  // must have at least some code
  if (lineCount < 5) {
    issues.push("code too short - add more content");
  }

  // check setcpm
  if (cfg.requireSetcpm && !hasSetcpm(code)) {
    issues.push("missing setcpm() - set tempo at the start");
  }

  // check forbidden samples
  if (cfg.rejectLocalhost && hasForbiddenSamples(code)) {
    issues.push("uses external/localhost samples - only use built-in samples");
  }

  // check randomness - too much creates unpredictable chaos
  const randomUsage = countRandomUsage(code);
  if (randomUsage > cfg.maxRandomUsage) {
    issues.push(
      `excessive randomness (${randomUsage}/${cfg.maxRandomUsage} max) - reduce rand/perlin usage`
    );
  }

  // check for extreme effects
  if (hasExtremeEffects(code)) {
    issues.push(
      "extreme effect values detected - reduce delay feedback and reverb"
    );
  }

  // check for syntax issues
  const syntaxIssue = getSyntaxIssue(code);
  if (syntaxIssue) {
    issues.push(syntaxIssue);
  }

  // check effects density
  if (checkEffectsDensity(code)) {
    issues.push("too many effects on a single voice - simplify effect chains");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
