/**
 * Loads style priors from the dataset.
 */

import * as fs from "fs";
import * as path from "path";
import { StylePriors } from "../../public/assets/dataset/schema";

let cachedPriors: StylePriors | null = null;
let priorsLoadAttempted = false;

// Try multiple possible paths (handles different execution contexts)
function findPriorsPath(): string | null {
  const possiblePaths = [
    path.join(process.cwd(), "public/assets/dataset", "style_priors.json"),
    path.join(process.cwd(), "audial", "public/assets/dataset", "style_priors.json"),
    path.resolve(__dirname, "../../public/assets/dataset/style_priors.json"),
  ];
  
  for (const priorsPath of possiblePaths) {
    if (fs.existsSync(priorsPath)) {
      return priorsPath;
    }
  }
  
  return null;
}

export function loadStylePriors(): StylePriors | null {
  if (cachedPriors) {
    return cachedPriors;
  }

  if (priorsLoadAttempted) {
    return null;
  }

  priorsLoadAttempted = true;

  try {
    const priorsPath = findPriorsPath();
    if (!priorsPath || !fs.existsSync(priorsPath)) {
      return null;
    }

    const priorsData = fs.readFileSync(priorsPath, "utf-8");
    cachedPriors = JSON.parse(priorsData) as StylePriors;
    return cachedPriors;
  } catch (_error) {
    // silently fail - graceful fallback
    return null;
  }
}

export function getStylePriors(): StylePriors | null {
  return loadStylePriors();
}

