/**
 * Safely reads a code snippet from a song file.
 * Falls back to index snippet if file not readable.
 */

import * as fs from "fs";
import * as path from "path";
import { SongIndexEntry } from "./types";

const MAX_SNIPPET_LINES = 80;
const MAX_SNIPPET_CHARS = 1200;

/**
 * Reads a snippet from a file, with fallback to index snippet.
 */
export function readSnippet(entry: SongIndexEntry): string {
  // Try to read from file first
  const possiblePaths = [
    path.join(process.cwd(), "public/assets/dataset", "strudel-songs-collection", entry.source_path),
    path.join(process.cwd(), "audial", "public/assets/dataset", "strudel-songs-collection", entry.source_path),
    path.resolve(__dirname, "../../public/assets/dataset/strudel-songs-collection", entry.source_path),
  ];
  
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return extractSnippet(content);
      }
    } catch (_error) {
      // continue to next path
    }
  }
  
  // Fallback to index snippet
  return entry.snippet;
}

/**
 * Extracts a snippet from code content.
 * Strips markdown fences, limits to ~80 lines or 1200 chars.
 */
function extractSnippet(content: string): string {
  // Remove markdown code fences if present
  let cleaned = content.replace(/^```(?:javascript|js|strudel)?\n?/gm, "");
  cleaned = cleaned.replace(/```$/gm, "");
  
  const lines = cleaned.split("\n");
  const snippetLines = lines.slice(0, MAX_SNIPPET_LINES);
  let snippet = snippetLines.join("\n");
  
  // Trim to max chars if needed
  if (snippet.length > MAX_SNIPPET_CHARS) {
    snippet = snippet.substring(0, MAX_SNIPPET_CHARS);
    // Try to end at a line break
    const lastNewline = snippet.lastIndexOf("\n");
    if (lastNewline > MAX_SNIPPET_CHARS * 0.8) {
      snippet = snippet.substring(0, lastNewline);
    }
  }
  
  return snippet.trim();
}

