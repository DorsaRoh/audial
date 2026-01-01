/**
 * Loads and provides access to the song index.
 * Gracefully handles missing dataset (e.g., if submodule not initialized).
 */

import * as fs from "fs";
import * as path from "path";
import { SongIndex } from "../../public/assets/dataset/schema";

let cachedIndex: SongIndex | null = null;
let indexLoadAttempted = false;

// Try multiple possible paths (handles different execution contexts)
function findIndexPath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), "public/assets/dataset", "index.json"),
    path.join(process.cwd(), "audial", "public/assets/dataset", "index.json"),
    path.resolve(__dirname, "../../public/assets/dataset/index.json"),
  ];
  
  for (const indexPath of possiblePaths) {
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  return null;
}

export function loadSongIndex(): SongIndex | null {
  if (cachedIndex) {
    return cachedIndex;
  }

  if (indexLoadAttempted) {
    return null;
  }

  indexLoadAttempted = true;

  try {
    const indexPath = findIndexPath();
    if (!indexPath || !fs.existsSync(indexPath)) {
      // Silently return null - graceful fallback
      return null;
    }

    const indexData = fs.readFileSync(indexPath, "utf-8");
    cachedIndex = JSON.parse(indexData) as SongIndex;
    return cachedIndex;
  } catch (_error) {
    // silently fail - graceful fallback
    return null;
  }
}

export function getSongIndex(): SongIndex | null {
  return loadSongIndex();
}

