#!/usr/bin/env tsx
/**
 * Validates the song index to ensure data integrity.
 * 
 * Usage: tsx validate_index.ts
 */

import * as fs from "fs";
import * as path from "path";
import { SongIndex, SongIndexEntry } from "../schema";

const INDEX_FILE = path.join(__dirname, "../index.json");
const DATASET_DIR = path.join(__dirname, "../strudel-songs-collection");

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateIndex(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check if index exists
  if (!fs.existsSync(INDEX_FILE)) {
    result.valid = false;
    result.errors.push(`Index file not found: ${INDEX_FILE}`);
    return result;
  }

  // Load index
  let index: SongIndex;
  try {
    const indexData = fs.readFileSync(INDEX_FILE, "utf-8");
    index = JSON.parse(indexData) as SongIndex;
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to parse index: ${error}`);
    return result;
  }

  // Validate structure
  if (!index.songs || !Array.isArray(index.songs)) {
    result.valid = false;
    result.errors.push("Index must have a 'songs' array");
    return result;
  }

  if (index.songs.length === 0) {
    result.warnings.push("Index contains no songs");
  }

  // Check for duplicate IDs
  const ids = new Set<string>();
  for (const song of index.songs) {
    if (ids.has(song.id)) {
      result.valid = false;
      result.errors.push(`Duplicate ID: ${song.id}`);
    }
    ids.add(song.id);
  }

  // Validate each song entry
  for (let i = 0; i < index.songs.length; i++) {
    const song = index.songs[i];
    const prefix = `Song ${i + 1} (${song.id}):`;

    // Required fields
    if (!song.id || typeof song.id !== "string") {
      result.valid = false;
      result.errors.push(`${prefix} Missing or invalid 'id'`);
    }

    if (!song.title || typeof song.title !== "string") {
      result.valid = false;
      result.errors.push(`${prefix} Missing or invalid 'title'`);
    }

    if (!song.source_path || typeof song.source_path !== "string") {
      result.valid = false;
      result.errors.push(`${prefix} Missing or invalid 'source_path'`);
    }

    if (!song.source_url || typeof song.source_url !== "string") {
      result.valid = false;
      result.errors.push(`${prefix} Missing or invalid 'source_url'`);
    }

    // Check if source file exists
    if (song.source_path) {
      const sourceFile = path.join(DATASET_DIR, song.source_path);
      if (!fs.existsSync(sourceFile)) {
        result.warnings.push(`${prefix} Source file not found: ${song.source_path}`);
      }
    }

    // Validate arrays
    if (!Array.isArray(song.instruments)) {
      result.valid = false;
      result.errors.push(`${prefix} 'instruments' must be an array`);
    }

    if (!Array.isArray(song.techniques)) {
      result.valid = false;
      result.errors.push(`${prefix} 'techniques' must be an array`);
    }

    if (!Array.isArray(song.moods)) {
      result.valid = false;
      result.errors.push(`${prefix} 'moods' must be an array`);
    }

    if (!Array.isArray(song.genres)) {
      result.valid = false;
      result.errors.push(`${prefix} 'genres' must be an array`);
    }

    if (!Array.isArray(song.prompt_seeds)) {
      result.valid = false;
      result.errors.push(`${prefix} 'prompt_seeds' must be an array`);
    }

    // Check prompt_seeds non-empty
    if (song.prompt_seeds.length === 0) {
      result.valid = false;
      result.errors.push(`${prefix} 'prompt_seeds' must not be empty`);
    }

    // Validate snippet
    if (!song.snippet || typeof song.snippet !== "string") {
      result.valid = false;
      result.errors.push(`${prefix} Missing or invalid 'snippet'`);
    } else if (song.snippet.length === 0) {
      result.warnings.push(`${prefix} 'snippet' is empty`);
    }

    // Validate BPM if present
    if (song.bpm !== undefined && (typeof song.bpm !== "number" || song.bpm < 0 || song.bpm > 300)) {
      result.warnings.push(`${prefix} Invalid BPM value: ${song.bpm}`);
    }

    // Validate CPM if present
    if (song.cpm !== undefined && (typeof song.cpm !== "number" || song.cpm < 0 || song.cpm > 300)) {
      result.warnings.push(`${prefix} Invalid CPM value: ${song.cpm}`);
    }
  }

  return result;
}

// Main execution
if (require.main === module) {
  const result = validateIndex();

  console.log("Index Validation Results");
  console.log("=".repeat(50));

  if (result.errors.length > 0) {
    console.error("\n❌ ERRORS:");
    for (const error of result.errors) {
      console.error(`  - ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  WARNINGS:");
    for (const warning of result.warnings) {
      console.warn(`  - ${warning}`);
    }
  }

  if (result.valid && result.errors.length === 0) {
    console.log("\n✅ Index is valid!");
    if (result.warnings.length > 0) {
      console.log(`   (${result.warnings.length} warning(s) found)`);
    }
  } else {
    console.error("\n❌ Index validation failed!");
    process.exit(1);
  }
}

