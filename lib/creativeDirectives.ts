// generation configuration for balanced composition
// focus on musical coherence

import { retrieveSongs } from "./dataset/retrieve";
import { readSnippet } from "./dataset/readSnippet";
import { getStylePriors } from "./dataset/stylePriors";

// config values for balanced generation
export function getConfigValues(): {
  maxVoices: number;
  maxLines: number;
  maxRandomUsage: number;
  maxEffectsPerVoice: number;
} {
  return {
    maxVoices: 6,
    maxLines: 150,
    maxRandomUsage: 4,
    maxEffectsPerVoice: 3,
  };
}

// build a user prompt that reinforces the feeling-first approach
// ALWAYS includes dataset references if available (always-on retrieval)
export function buildUserPrompt(userRequest: string): string {
  let referenceSection = "";
  
  try {
    // Always-on retrieval: get top-k + diverse exemplar
    const retrieved = retrieveSongs(userRequest, 3, 1, 4);
    
    // Load style priors
    const stylePriors = getStylePriors();
    
    
    if (retrieved.length > 0 || stylePriors) {
      referenceSection = "\n\n═══════════════════════════════════════════════════════════════════\nREFERENCE DATASET (audial strudel songs)\n═══════════════════════════════════════════════════════════════════\n\n";
      referenceSection += "Use these as inspiration only. Do not copy verbatim. Borrow structure, groove, and arrangement ideas. Change melody, rhythm, and harmony — references are structural inspiration only.\n\n";
      
      // Add style priors if available
      if (stylePriors && stylePriors.summary_bullets.length > 0) {
        referenceSection += "Style priors (from dataset):\n";
        for (const bullet of stylePriors.summary_bullets.slice(0, 6)) {
          referenceSection += `- ${bullet}\n`;
        }
        referenceSection += "\n";
      }
      
      if (retrieved.length > 0) {
        // Separate top references from diverse exemplar
        const topRefs = retrieved.slice(0, -1);
        const diverseRef = retrieved.length > topRefs.length ? retrieved[retrieved.length - 1] : null;
        
        if (topRefs.length > 0) {
          referenceSection += "Top references:\n\n";
          for (const { song } of topRefs) {
            const snippet = readSnippet(song);
            
            referenceSection += `[${song.title}${song.author ? ` by ${song.author}` : ""}]\n`;
            referenceSection += `Genres: ${song.genres.join(", ") || "none"}\n`;
            referenceSection += `Moods: ${song.moods.join(", ") || "none"}\n`;
            referenceSection += `Techniques: ${song.techniques.slice(0, 3).join(", ") || "none"}\n`;
            if (song.bpm) {
              referenceSection += `BPM: ${song.bpm}\n`;
            }
            referenceSection += `\nSnippet:\n${snippet}\n\n`;
          }
        }
        
        if (diverseRef) {
          referenceSection += "Diverse exemplar (different style):\n\n";
          const { song } = diverseRef;
          const snippet = readSnippet(song);
          
          referenceSection += `[${song.title}${song.author ? ` by ${song.author}` : ""}]\n`;
          referenceSection += `Genres: ${song.genres.join(", ") || "none"}\n`;
          referenceSection += `Moods: ${song.moods.join(", ") || "none"}\n`;
          referenceSection += `Techniques: ${song.techniques.slice(0, 3).join(", ") || "none"}\n`;
          if (song.bpm) {
            referenceSection += `BPM: ${song.bpm}\n`;
          }
          referenceSection += `\nSnippet:\n${snippet}\n\n`;
        }
      }
      
      referenceSection += "Rules:\n";
      referenceSection += "- Do not copy more than 1-2 consecutive lines from any reference snippet\n";
      referenceSection += "- Change melody, rhythm, and harmony — references are structural inspiration only\n";
      referenceSection += "- Borrow arrangement patterns and effects usage, but create original musical content\n";
      referenceSection += "\n═══════════════════════════════════════════════════════════════════\n\n";
    }
  } catch (_error) {
    // silently fail if dataset is not available
    // this allows the app to work without the dataset
  }

  return `create a strudel composition based on this request:

${userRequest}
${referenceSection}before writing code, decide:
1. what should the listener feel in their body?
2. what mood are you placing them in?
3. what should stay constant vs. evolve?

then write:
- single javascript code block only
- setcpm(...) at the start
- 3-6 voices with $:
- comments that describe intent, not mechanics
- taste = restraint + intention
- no external samples`;
}

// build a retry prompt that redirects to taste principles
export function buildRetryPrompt(
  userRequest: string,
  issues: string[]
): string {
  const issueList = issues.map((i) => `- ${i}`).join("\n");

  return `${userRequest}

your previous attempt had issues:
${issueList}

return to first principles:
1. what should the listener feel? (be specific)
2. what is the musical intention? (not the technique)

then simplify:
- reduce to 3-6 voices
- remove randomness that doesn't serve the mood
- remove effects that don't serve the feeling
- subtraction is a sign of taste`;
}
