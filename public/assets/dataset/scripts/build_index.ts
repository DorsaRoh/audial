#!/usr/bin/env tsx
/**
 * Builds an index of Strudel songs with metadata, labels, and prompt seeds.
 * 
 * Usage: tsx build_index.ts
 */

import * as fs from "fs";
import * as path from "path";
import { SongIndex, SongIndexEntry } from "../schema";

const DATASET_DIR = path.join(__dirname, "../strudel-songs-collection");
const OUTPUT_FILE = path.join(__dirname, "../index.json");
const REPO_URL = "https://github.com/eefano/strudel-songs-collection";

// Controlled vocabularies
const GENRES = [
  "techno", "trance", "house", "ambient", "lofi", "hiphop", 
  "dnb", "jungle", "breakbeat", "dubstep", "downtempo", "experimental"
];

const MOODS = [
  "dark", "bright", "warm", "cold", "nostalgic", "euphoric", 
  "gritty", "airy", "intense", "calm", "energetic", "melancholic",
  "playful", "serious", "mysterious", "uplifting"
];

const TECHNIQUES = [
  "trancegate", "acid", "polyrhythm", "arpeggio", "breakbeat",
  "ambient-pad", "delay", "reverb", "filter-sweep", "sidechain",
  "stutter", "reversal", "panning", "modulation"
];

// Common instruments
const SYNTHS = ["sawtooth", "square", "sine", "triangle", "supersaw"];
const DRUMS = ["bd", "sd", "hh", "oh", "cp", "rim", "lt", "mt", "ht", "perc", "cr"];

function extractBPM(code: string): number | undefined {
  // Match setcpm(N) or .cpm(N) or setcps(N)
  const patterns = [
    /setcpm\s*\(\s*(\d+(?:\.\d+)?)/i,
    /\.cpm\s*\(\s*(\d+(?:\.\d+)?)/i,
    /setcps\s*\(\s*(\d+(?:\.\d+)?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      // Handle division expressions like "98/4*2"
      if (code.includes("/") || code.includes("*")) {
        try {
          // Try to evaluate simple expressions
          const expr = code.substring(match.index || 0, match.index! + 100);
          const exprMatch = expr.match(/\(([^)]+)\)/);
          if (exprMatch) {
            const evalResult = Function(`"use strict"; return (${exprMatch[1]})`)();
            if (typeof evalResult === "number" && !isNaN(evalResult)) {
              return Math.round(evalResult);
            }
          }
        } catch {
          // Fall back to parsed value
        }
      }
      return Math.round(value);
    }
  }
  
  return undefined;
}

function extractKey(code: string): string | undefined {
  // Match .scale("key:mode") patterns
  const scaleMatch = code.match(/\.scale\s*\(\s*["']([^"']+)["']/i);
  if (scaleMatch) {
    return scaleMatch[1];
  }
  return undefined;
}

function extractInstruments(code: string): string[] {
  const instruments: Set<string> = new Set();
  
  // Extract synth names from .s("...")
  const synthPattern = /\.s\s*\(\s*["']([^"']+)["']/gi;
  let match;
  while ((match = synthPattern.exec(code)) !== null) {
    const synth = match[1].toLowerCase();
    if (SYNTHS.includes(synth)) {
      instruments.add(synth);
    }
  }
  
  // Extract sample names from s("...") patterns
  const samplePattern = /s\s*\(\s*["']([^"']+)["']/gi;
  while ((match = samplePattern.exec(code)) !== null) {
    const samples = match[1].toLowerCase().split(/[\s*~!]+/);
    for (const sample of samples) {
      const clean = sample.replace(/[^a-z]/g, "");
      if (DRUMS.includes(clean)) {
        instruments.add(clean);
      }
    }
  }
  
  return Array.from(instruments);
}

function extractTechniques(code: string): string[] {
  const techniques: Set<string> = new Set();
  const lowerCode = code.toLowerCase();
  
  // Check for specific technique patterns
  if (lowerCode.includes("trancegate") || lowerCode.includes(".trancegate")) {
    techniques.add("trancegate");
  }
  if (lowerCode.includes(".delay") || lowerCode.includes("delay(")) {
    techniques.add("delay");
  }
  if (lowerCode.includes(".room") || lowerCode.includes("room(")) {
    techniques.add("reverb");
  }
  if (lowerCode.includes(".lpq") || lowerCode.includes("lpq(")) {
    const lpqMatch = code.match(/\.lpq\s*\(\s*(\d+(?:\.\d+)?)/i);
    if (lpqMatch && parseFloat(lpqMatch[1]) > 5) {
      techniques.add("acid");
    }
  }
  if (lowerCode.includes(".lpf") && lowerCode.includes("sine.range")) {
    techniques.add("filter-sweep");
  }
  if (lowerCode.includes(".every") || lowerCode.includes(".sometimes")) {
    techniques.add("modulation");
  }
  if (lowerCode.includes(".jux") || lowerCode.includes("jux(")) {
    techniques.add("panning");
  }
  if (lowerCode.includes(".rev") || lowerCode.includes(".reverse")) {
    techniques.add("reversal");
  }
  if (lowerCode.includes("bd*4") || lowerCode.includes("bd!4")) {
    techniques.add("breakbeat");
  }
  if (lowerCode.includes("arpeggio") || lowerCode.match(/\.add\([^)]+\)/)) {
    techniques.add("arpeggio");
  }
  
  // Detect polyrhythm (multiple different time signatures or .slow/.fast)
  if ((code.match(/\.slow\(/g) || []).length > 1 || 
      (code.match(/\.fast\(/g) || []).length > 1) {
    techniques.add("polyrhythm");
  }
  
  return Array.from(techniques);
}

function inferGenres(bpm: number | undefined, techniques: string[], instruments: string[]): string[] {
  const genres: Set<string> = new Set();
  
  if (!bpm) return Array.from(genres);
  
  const hasDrums = instruments.some(i => DRUMS.includes(i));
  const hasBreakbeat = techniques.includes("breakbeat");
  const hasTrancegate = techniques.includes("trancegate");
  const hasAcid = techniques.includes("acid");
  
  // Genre inference based on tempo and patterns
  if (bpm >= 120 && bpm <= 140) {
    if (hasBreakbeat) {
      genres.add("house");
    } else if (hasTrancegate || techniques.includes("arpeggio")) {
      genres.add("trance");
    } else if (hasAcid) {
      genres.add("techno");
    } else {
      genres.add("house");
    }
  } else if (bpm >= 135 && bpm <= 150) {
    if (hasBreakbeat) {
      genres.add("dnb");
      genres.add("jungle");
    } else {
      genres.add("techno");
    }
  } else if (bpm >= 150) {
    genres.add("dnb");
  } else if (bpm >= 60 && bpm <= 90) {
    if (hasDrums && !hasBreakbeat) {
      genres.add("hiphop");
      genres.add("lofi");
    } else {
      genres.add("ambient");
      genres.add("downtempo");
    }
  } else if (bpm < 60) {
    genres.add("ambient");
  }
  
  return Array.from(genres);
}

function inferMoods(techniques: string[], instruments: string[], code: string): string[] {
  const moods: Set<string> = new Set();
  const lowerCode = code.toLowerCase();
  
  // Check filter ranges
  const lpfMatches = Array.from(code.matchAll(/\.lpf\s*\(\s*(\d+)/gi));
  let hasLowFilter = false;
  let hasHighFilter = false;
  for (const match of lpfMatches) {
    const freq = parseInt(match[1]);
    if (freq < 1000) hasLowFilter = true;
    if (freq > 3000) hasHighFilter = true;
  }
  
  if (hasLowFilter) moods.add("dark");
  if (hasHighFilter) moods.add("bright");
  
  // Reverb/delay presence
  if (techniques.includes("reverb") || techniques.includes("delay")) {
    moods.add("airy");
  } else {
    moods.add("dry");
  }
  
  // Density
  const voiceCount = (code.match(/\$:/g) || []).length;
  if (voiceCount > 5) {
    moods.add("intense");
  } else if (voiceCount <= 2) {
    moods.add("minimal");
  }
  
  // Tempo-based mood hints
  const bpm = extractBPM(code);
  if (bpm && bpm > 130) {
    moods.add("energetic");
  } else if (bpm && bpm < 80) {
    moods.add("calm");
  }
  
  // Instrument-based moods
  if (instruments.includes("sawtooth") || instruments.includes("supersaw")) {
    moods.add("warm");
  }
  if (instruments.includes("sine")) {
    moods.add("soft");
  }
  
  return Array.from(moods).filter(m => MOODS.includes(m));
}

function generatePromptSeeds(
  genres: string[],
  moods: string[],
  techniques: string[],
  instruments: string[],
  bpm: number | undefined,
  title: string
): string[] {
  const seeds: string[] = [];
  
  // Genre + mood combinations
  for (const genre of genres.slice(0, 2)) {
    for (const mood of moods.slice(0, 2)) {
      if (seeds.length < 12) {
        seeds.push(`${mood} ${genre}`);
      }
    }
  }
  
  // Tempo + technique
  if (bpm) {
    for (const technique of techniques.slice(0, 3)) {
      if (seeds.length < 12) {
        seeds.push(`${technique} at ${bpm} bpm`);
      }
    }
  }
  
  // Instrument signatures
  const leadSynth = instruments.find(i => SYNTHS.includes(i));
  if (leadSynth && seeds.length < 12) {
    seeds.push(`${leadSynth} lead`);
  }
  
  const bassSynth = instruments.find(i => i === "sine" || i === "square");
  if (bassSynth && seeds.length < 12) {
    seeds.push(`${bassSynth} bass`);
  }
  
  // Technique + genre
  for (const technique of techniques.slice(0, 2)) {
    for (const genre of genres.slice(0, 2)) {
      if (seeds.length < 12) {
        seeds.push(`${technique} ${genre}`);
      }
    }
  }
  
  // Title-based (if meaningful)
  if (title && title.length > 3 && seeds.length < 12) {
    const titleWords = title.toLowerCase().split(/[\s_-]+/);
    if (titleWords.length > 0 && titleWords[0].length > 2) {
      seeds.push(`${titleWords[0]} style`);
    }
  }
  
  // Ensure we have at least 5 seeds
  while (seeds.length < 5) {
    if (genres.length > 0) {
      seeds.push(`${genres[0]} track`);
    } else if (moods.length > 0) {
      seeds.push(`${moods[0]} music`);
    } else {
      seeds.push("electronic music");
    }
  }
  
  return seeds.slice(0, 12);
}

function extractTitle(filename: string, code: string): string {
  // Try to extract from comment header
  const commentMatch = code.match(/\/\/\s*["']?([^"'\n]+)["']?/);
  if (commentMatch && commentMatch[1].length > 3) {
    return commentMatch[1].trim();
  }
  
  // Fall back to filename (remove .js, convert camelCase/kebab-case to title)
  const base = filename.replace(/\.js$/, "");
  return base
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

function extractAuthor(code: string): string | undefined {
  const authorMatch = code.match(/@by\s+(\w+)/i) || code.match(/author:\s*(\w+)/i);
  return authorMatch ? authorMatch[1] : undefined;
}

function getSnippet(code: string, maxLines: number = 40, maxChars: number = 1200): string {
  const lines = code.split("\n");
  const snippetLines = lines.slice(0, maxLines);
  let snippet = snippetLines.join("\n");
  
  if (snippet.length > maxChars) {
    snippet = snippet.substring(0, maxChars);
    // Try to end at a line break
    const lastNewline = snippet.lastIndexOf("\n");
    if (lastNewline > maxChars * 0.8) {
      snippet = snippet.substring(0, lastNewline);
    }
  }
  
  return snippet.trim();
}

function generateSlug(filename: string, title: string): string {
  // Use filename as primary source for slug
  const base = filename.replace(/\.js$/, "");
  return base.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function generateAliases(filename: string, title: string): string[] {
  const aliases: Set<string> = new Set();
  
  // From filename - handle camelCase and compound words
  const base = filename.replace(/\.js$/, "");
  
  // Split camelCase: "strangerThings" -> ["stranger", "things"]
  let camelCaseSplit = base
    .replace(/([a-z])([A-Z])/g, "$1 $2") // Insert space before capital letters
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // Handle consecutive capitals
    .toLowerCase();
  
  // If still no spaces and it's a long word, try to split compound words
  // Common patterns: "strangerthings", "bladerunner", "happybirthday", etc.
  if (!camelCaseSplit.includes(" ") && camelCaseSplit.length > 8) {
    // Dictionary of common words that might appear in compound filenames
    const commonWords = [
      "stranger", "things", "blade", "runner", "interstellar", 
      "happy", "birthday", "stranger", "things", "blue", "monday",
      "strudel", "man", "wall", "swimming", "snake", "wooden", "eye"
    ];
    
    for (const word of commonWords) {
      if (camelCaseSplit.includes(word) && camelCaseSplit.length > word.length) {
        const idx = camelCaseSplit.indexOf(word);
        const before = camelCaseSplit.substring(0, idx);
        const after = camelCaseSplit.substring(idx + word.length);
        
        if (before.length > 2) {
          camelCaseSplit = `${before} ${word} ${after}`.trim();
        } else {
          camelCaseSplit = `${word} ${after}`.trim();
        }
        break;
      }
    }
  }
  
  const filenameTokens = camelCaseSplit
    .split(/[\s_-]+/)
    .filter((t) => t.length > 1);
  
  filenameTokens.forEach((token) => aliases.add(token));
  
  // Generate bigrams from filename tokens
  for (let i = 0; i < filenameTokens.length - 1; i++) {
    aliases.add(`${filenameTokens[i]} ${filenameTokens[i + 1]}`);
  }
  
  // Also add the full slug as an alias
  const slug = base.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (slug.length > 0) {
    aliases.add(slug);
  }
  
  // From title - always process title tokens (even if same as filename)
  const titleLower = title.toLowerCase();
  const titleTokens = titleLower.split(/[\s_-]+/).filter((t) => t.length > 1);
  titleTokens.forEach((token) => aliases.add(token));
  
  // Generate bigrams from title too
  for (let i = 0; i < titleTokens.length - 1; i++) {
    aliases.add(`${titleTokens[i]} ${titleTokens[i + 1]}`);
  }
  
  return Array.from(aliases);
}

function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function enhancePromptSeeds(
  seeds: string[],
  filename: string,
  title: string
): string[] {
  const enhanced = [...seeds];
  const base = filename.replace(/\.js$/, "").toLowerCase();
  
  // Add pop-culture references if filename suggests them
  const popCultureMap: Record<string, string[]> = {
    strangerthings: ["stranger things", "retro synthwave", "80s nostalgia"],
    interstellar: ["interstellar", "cinematic ambient", "epic pad"],
    bladerunner: ["blade runner", "noir", "cyberpunk"],
  };
  
  for (const [key, refs] of Object.entries(popCultureMap)) {
    if (base.includes(key)) {
      refs.forEach((ref) => {
        if (!enhanced.includes(ref) && enhanced.length < 15) {
          enhanced.push(ref);
        }
      });
    }
  }
  
  return enhanced.slice(0, 15);
}

function buildIndex(): SongIndex {
  const songs: SongIndexEntry[] = [];
  
  if (!fs.existsSync(DATASET_DIR)) {
    console.error(`Dataset directory not found: ${DATASET_DIR}`);
    console.error("Run: git submodule update --init --recursive");
    process.exit(1);
  }
  
  function scanDirectory(dir: string, basePath: string = ""): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      
      if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
        scanDirectory(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        try {
          const code = fs.readFileSync(fullPath, "utf-8");
          
          // Skip empty or very short files
          if (code.trim().length < 20) continue;
          
          const bpm = extractBPM(code);
          const cpm = bpm; // CPM and BPM are the same for our purposes
          const key = extractKey(code);
          const instruments = extractInstruments(code);
          const techniques = extractTechniques(code);
          const genres = inferGenres(bpm, techniques, instruments);
          const moods = inferMoods(techniques, instruments, code);
          const title = extractTitle(entry.name, code);
          const author = extractAuthor(code);
          const basePromptSeeds = generatePromptSeeds(genres, moods, techniques, instruments, bpm, title);
          const promptSeeds = enhancePromptSeeds(basePromptSeeds, entry.name, title);
          const snippet = getSnippet(code);
          
          // Generate stable ID from path
          const id = relPath.replace(/\.js$/, "").replace(/[^a-z0-9]/gi, "-").toLowerCase();
          
          // Generate slug, aliases, and tokens
          const slug = generateSlug(entry.name, title);
          const aliases = generateAliases(entry.name, title);
          const titleTokens = tokenizeText(title);
          const pathTokens = tokenizeText(relPath);
          
          // Generate GitHub blob URL
          const sourceUrl = `${REPO_URL}/blob/main/${relPath}`;
          
          songs.push({
            id,
            slug,
            title,
            source_path: relPath,
            source_url: sourceUrl,
            author,
            bpm,
            cpm,
            key,
            instruments,
            techniques,
            moods,
            genres,
            prompt_seeds: promptSeeds,
            snippet,
            aliases,
            title_tokens: titleTokens,
            path_tokens: pathTokens,
          });
        } catch (error) {
          console.error(`Error processing ${fullPath}:`, error);
        }
      }
    }
  }
  
  scanDirectory(DATASET_DIR);
  
  console.log(`Indexed ${songs.length} songs`);
  
  return {
    songs,
    generated_at: new Date().toISOString(),
    version: "1.0.0",
  };
}

// Main execution
if (require.main === module) {
  const index = buildIndex();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
  console.log(`Index written to ${OUTPUT_FILE}`);
}

