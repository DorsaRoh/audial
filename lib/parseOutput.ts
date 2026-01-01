// strict output parser for claude responses
// enforces the output contract: exactly one fenced js block, starts with setcpm

export interface ParseResult {
  success: boolean;
  code: string | null;
  error: string | null;
  rawResponse?: string;
}

// extract code from response with strict validation
export function parseClaudeOutput(response: string): ParseResult {
  if (!response || !response.trim()) {
    return {
      success: false,
      code: null,
      error: "empty response",
      rawResponse: response,
    };
  }

  const trimmed = response.trim();

  // find all fenced code blocks (javascript, js, or no language tag)
  const codeBlockRegex = /```(?:javascript|js|strudel)?\n?([\s\S]*?)```/g;
  const matches = Array.from(trimmed.matchAll(codeBlockRegex));

  // check for exactly one code block
  if (matches.length === 0) {
    // maybe the response is raw code without fences
    if (looksLikeStrudelCode(trimmed)) {
      const validation = validateCodeContent(trimmed);
      if (!validation.valid) {
        return {
          success: false,
          code: null,
          error: validation.error,
          rawResponse: response,
        };
      }
      return {
        success: true,
        code: cleanCode(trimmed),
        error: null,
      };
    }
    return {
      success: false,
      code: null,
      error: "no code block found in response",
      rawResponse: response,
    };
  }

  if (matches.length > 1) {
    return {
      success: false,
      code: null,
      error: `found ${matches.length} code blocks, expected exactly 1`,
      rawResponse: response,
    };
  }

  // extract the single code block
  const codeMatch = matches[0];
  const code = codeMatch[1]?.trim() || "";
  const fullMatch = codeMatch[0];

  if (!code) {
    return {
      success: false,
      code: null,
      error: "code block is empty",
      rawResponse: response,
    };
  }

  // check for prose outside code block
  const beforeBlock = trimmed.substring(0, trimmed.indexOf(fullMatch)).trim();
  const afterBlock = trimmed.substring(trimmed.indexOf(fullMatch) + fullMatch.length).trim();

  if (beforeBlock.length > 0) {
    // allow very minimal whitespace or newlines, reject actual text
    const hasRealContent = /\S/.test(beforeBlock.replace(/[\n\r\s]/g, ""));
    if (hasRealContent) {
      return {
        success: false,
        code: null,
        error: "found prose before code block - response must contain only code",
        rawResponse: response,
      };
    }
  }

  if (afterBlock.length > 0) {
    const hasRealContent = /\S/.test(afterBlock.replace(/[\n\r\s]/g, ""));
    if (hasRealContent) {
      return {
        success: false,
        code: null,
        error: "found prose after code block - response must contain only code",
        rawResponse: response,
      };
    }
  }

  // validate code content
  const validation = validateCodeContent(code);
  if (!validation.valid) {
    return {
      success: false,
      code: null,
      error: validation.error,
      rawResponse: response,
    };
  }

  return {
    success: true,
    code: cleanCode(code),
    error: null,
  };
}

// validate the code content meets requirements
function validateCodeContent(code: string): { valid: boolean; error: string | null } {
  const lines = code.split("\n");
  
  // find first non-empty, non-comment line
  let firstCodeLine = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("//")) {
      firstCodeLine = trimmed;
      break;
    }
  }

  if (!firstCodeLine) {
    return { valid: false, error: "code contains no executable statements" };
  }

  // must start with setcpm (or a comment followed by setcpm on first code line)
  if (!firstCodeLine.startsWith("setcpm(") && !firstCodeLine.startsWith("setcpm (")) {
    return { valid: false, error: `code must start with setcpm(...), found: ${firstCodeLine.substring(0, 30)}...` };
  }

  // must have at least one voice assignment ($:)
  const voicePattern = /\$:/;
  if (!voicePattern.test(code)) {
    return { valid: false, error: "code must contain at least one voice assignment ($:)" };
  }

  // check for balanced parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    return { valid: false, error: `unbalanced parentheses: ${openParens} open, ${closeParens} close` };
  }

  // check for balanced brackets
  const openBrackets = (code.match(/\[/g) || []).length;
  const closeBrackets = (code.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    return { valid: false, error: `unbalanced brackets: ${openBrackets} open, ${closeBrackets} close` };
  }

  // check for balanced braces
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return { valid: false, error: `unbalanced braces: ${openBraces} open, ${closeBraces} close` };
  }

  return { valid: true, error: null };
}

// check if text looks like strudel code
function looksLikeStrudelCode(text: string): boolean {
  const patterns = [
    /setcpm\s*\(/i,
    /\$:/,
    /note\s*\(/,
    /s\s*\(/,
    /\.gain\s*\(/,
  ];

  let matches = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) matches++;
  }

  return matches >= 2;
}

// clean up code (remove escaped quotes, etc.)
function cleanCode(code: string): string {
  let cleaned = code;

  // remove escaped quotes - these break strudel's mini-notation parser
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\'/g, "'");

  // handle escape sequences
  cleaned = cleaned.replace(/\\([nrt])/g, (_, char) => {
    if (char === "n") return "\n";
    if (char === "t") return "\t";
    if (char === "r") return "\r";
    return char;
  });

  return cleaned;
}

// check if two code strings are effectively the same
export function isCodeUnchanged(oldCode: string, newCode: string): boolean {
  const normalize = (code: string) =>
    code
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

  return normalize(oldCode) === normalize(newCode);
}

