/**
 * Small synonym/expansion map for fuzzy prompt matching.
 * Maps common prompts to related terms that should boost matching.
 */

export const SYNONYMS: Record<string, string[]> = {
  "stranger things": ["retro", "synthwave", "80s", "brooding", "arpeggio", "minor", "cinematic", "nostalgic"],
  "blade runner": ["noir", "ambient", "cinematic", "pad", "atmospheric", "dark"],
  "interstellar": ["cinematic", "ambient", "epic", "pad", "atmospheric"],
  "trance": ["supersaw", "trancegate", "rave", "euphoric", "uplifting"],
  "techno": ["minimal", "driving", "repetitive", "four-on-the-floor"],
  "ambient": ["pad", "atmospheric", "spacious", "textural", "evolving"],
  "house": ["four-on-the-floor", "groove", "disco", "uplifting"],
  "dnb": ["jungle", "breakbeat", "fast", "intense", "complex"],
  "acid": ["resonant", "filter", "squelchy", "303"],
  "synthwave": ["retro", "80s", "nostalgic", "arpeggio", "minor"],
  "lofi": ["chill", "relaxed", "warm", "nostalgic", "hiphop"],
  "dark": ["minor", "brooding", "gritty", "intense"],
  "euphoric": ["uplifting", "bright", "energetic", "trance"],
  "cinematic": ["atmospheric", "epic", "pad", "orchestral"],
  "moody": ["brooding", "dark", "minor", "atmospheric"],
  "electronic": ["synth", "synthesizer", "digital"],
};

/**
 * Expands a prompt with synonyms.
 */
export function expandPrompt(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const expanded: string[] = [prompt];
  
  // Check for exact phrase matches
  for (const [key, synonyms] of Object.entries(SYNONYMS)) {
    if (lower.includes(key)) {
      expanded.push(...synonyms);
    }
  }
  
  // Check for individual word matches
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (SYNONYMS[word]) {
      expanded.push(...SYNONYMS[word]);
    }
  }
  
  return Array.from(new Set(expanded));
}

