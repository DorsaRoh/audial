/**
 * Always-on fuzzy retrieval system for Strudel song dataset.
 * Returns top-k relevant references + diverse exemplar.
 */

import { SongIndexEntry } from "./types";
import { getSongIndex } from "./songIndex";
import { expandPrompt } from "./synonyms";

export interface RetrievedSong {
  song: SongIndexEntry;
  score: number;
  reason?: string; // Why this song was selected (for debugging)
}

/**
 * Tokenizes a prompt into words and bigrams.
 */
function tokenizePrompt(prompt: string): { words: string[]; bigrams: string[] } {
  const normalized = prompt.toLowerCase().replace(/[^\w\s]/g, " ");
  const words = normalized
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
  
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }
  
  return { words, bigrams };
}

/**
 * Normalizes a string for exact matching (removes all non-alphanumeric).
 */
function normalizeSlug(text: string): string {
  return text.toLowerCase().replace(/[^\w]/g, "");
}

/**
 * Scores a song against a prompt with enhanced fuzzy matching.
 */
function scoreSong(
  song: SongIndexEntry,
  promptWords: string[],
  promptBigrams: string[],
  expandedTerms: string[]
): number {
  let score = 0;
  const reasons: string[] = [];
  
  const songSlug = song.slug || normalizeSlug(song.id);
  const songTitleTokens = song.title_tokens || [];
  const songPathTokens = song.path_tokens || [];
  const songAliases = song.aliases || [];
  
  // Normalize prompt for exact matching
  const normalizedPrompt = normalizeSlug(promptWords.join(" "));
  
  // A) Exact title/slug match (+10 points) - STRONGEST SIGNAL
  if (normalizedPrompt === songSlug || normalizedPrompt === normalizeSlug(song.title)) {
    score += 10;
    reasons.push("exact title match");
  }
  
  // Check if prompt contains slug or vice versa
  if (normalizedPrompt.includes(songSlug) || songSlug.includes(normalizedPrompt)) {
    if (score < 10) {
      score += 8;
      reasons.push("partial title match");
    }
  }
  
  // B) Bigram overlaps with title/path (+6 points)
  for (const bigram of promptBigrams) {
    const normalizedBigram = normalizeSlug(bigram);
    // Check if slug/title contains the bigram OR if aliases contain the bigram as-is
    if (
      songSlug.includes(normalizedBigram) ||
      normalizeSlug(song.title).includes(normalizedBigram) ||
      songAliases.some((alias) => {
        const normalizedAlias = normalizeSlug(alias);
        return normalizedAlias.includes(normalizedBigram) || normalizedBigram.includes(normalizedAlias);
      }) ||
      songAliases.includes(bigram.toLowerCase()) // Direct alias match
    ) {
      score += 6;
      reasons.push(`bigram match: ${bigram}`);
      break; // Only count once
    }
  }
  
  // Check title tokens and aliases - individual word matches
  for (const word of promptWords) {
    const normalizedWord = normalizeSlug(word);
    // Check exact matches in tokens/aliases
    if (
      songTitleTokens.some((t) => normalizeSlug(t) === normalizedWord) ||
      songPathTokens.some((t) => normalizeSlug(t) === normalizedWord) ||
      songAliases.some((alias) => {
        const normalizedAlias = normalizeSlug(alias);
        return normalizedAlias === normalizedWord || normalizedAlias.includes(normalizedWord);
      })
    ) {
      score += 5;
      reasons.push(`title token match: ${word}`);
      break;
    }
  }
  
  // C) Genre matches (+4 points)
  for (const genre of song.genres) {
    const genreLower = genre.toLowerCase();
    if (
      promptWords.includes(genreLower) ||
      expandedTerms.includes(genreLower)
    ) {
      score += 4;
      reasons.push(`genre: ${genre}`);
      break;
    }
  }
  
  // D) Mood matches (+3 points)
  for (const mood of song.moods) {
    const moodLower = mood.toLowerCase();
    if (
      promptWords.includes(moodLower) ||
      expandedTerms.includes(moodLower)
    ) {
      score += 3;
      reasons.push(`mood: ${mood}`);
      break;
    }
  }
  
  // E) Technique matches (+2 points)
  for (const technique of song.techniques) {
    const techLower = technique.toLowerCase();
    if (
      promptWords.includes(techLower) ||
      expandedTerms.includes(techLower)
    ) {
      score += 2;
      reasons.push(`technique: ${technique}`);
      break;
    }
  }
  
  // F) Instrument mentions (+2 points)
  for (const instrument of song.instruments) {
    const instLower = instrument.toLowerCase();
    if (promptWords.includes(instLower) || expandedTerms.includes(instLower)) {
      score += 2;
      reasons.push(`instrument: ${instrument}`);
      break;
    }
  }
  
  // G) Tempo words (+1 point)
  if (song.bpm) {
    const tempoWords = ["slow", "fast", "bpm", "tempo"];
    const hasTempoWord = promptWords.some((w) => tempoWords.includes(w));
    const hasBpmNumber = promptWords.some((w) => {
      const num = parseInt(w);
      return !isNaN(num) && num >= song.bpm! - 10 && num <= song.bpm! + 10;
    });
    
    if (hasTempoWord || hasBpmNumber) {
      score += 1;
      reasons.push(`tempo match: ${song.bpm} bpm`);
    }
  }
  
  // H) Prompt seed matches (+2 points)
  for (const seed of song.prompt_seeds) {
    const seedTokens = tokenizePrompt(seed);
    const matchingWords = seedTokens.words.filter((w) => promptWords.includes(w));
    if (matchingWords.length >= 2) {
      score += 2;
      reasons.push(`prompt seed match`);
      break;
    }
  }
  
  return score;
}

/**
 * Selects a diverse exemplar from songs not in the top-k set.
 * Chooses a song with different genre/mood than the top results.
 */
function selectDiverseExemplar(
  topSongs: RetrievedSong[],
  allScored: RetrievedSong[]
): RetrievedSong | null {
  if (allScored.length === 0) return null;
  
  // Get genres/moods from top songs
  const topGenres = new Set<string>();
  const topMoods = new Set<string>();
  
  for (const item of topSongs) {
    item.song.genres.forEach((g) => topGenres.add(g));
    item.song.moods.forEach((m) => topMoods.add(m));
  }
  
  // Find songs with different genres/moods
  const diverse = allScored
    .filter((item) => {
      // Not already in top-k
      if (topSongs.some((t) => t.song.id === item.song.id)) {
        return false;
      }
      
      // Has different genre or mood
      const hasDifferentGenre = item.song.genres.some((g) => !topGenres.has(g));
      const hasDifferentMood = item.song.moods.some((m) => !topMoods.has(m));
      
      return hasDifferentGenre || hasDifferentMood;
    })
    .sort((a, b) => b.score - a.score);
  
  return diverse.length > 0 ? diverse[0] : null;
}

/**
 * Always-on retrieval: returns top-k relevant songs + diverse exemplar.
 * Always returns at least 2 songs (best effort + diverse) if dataset available.
 */
export function retrieveSongs(
  prompt: string,
  topK: number = 3,
  _diverseK: number = 1,
  maxTotal: number = 4
): RetrievedSong[] {
  const index = getSongIndex();
  if (!index || index.songs.length === 0) {
    return [];
  }
  
  // Tokenize prompt
  const { words, bigrams } = tokenizePrompt(prompt);
  if (words.length === 0) {
    // Even with empty prompt, return diverse exemplars
    const allScored: RetrievedSong[] = index.songs
      .slice(0, 10)
      .map((song) => ({ song, score: 1 }));
    const diverse = selectDiverseExemplar([], allScored);
    return diverse ? [diverse] : [];
  }
  
  // Expand with synonyms
  const expandedTerms = expandPrompt(prompt);
  
  // Score all songs
  const allScored: RetrievedSong[] = index.songs.map((song) => ({
    song,
    score: scoreSong(song, words, bigrams, expandedTerms),
  }));
  
  // Sort by score
  allScored.sort((a, b) => b.score - a.score);
  
  // Get top-k (even if score is low, we want best effort)
  // Always return at least topK songs if available, even with score 0
  const topSongs = allScored.slice(0, Math.max(topK, 1));
  
  // Select diverse exemplar
  const diverse = selectDiverseExemplar(topSongs, allScored);
  
  // Combine and limit
  const results: RetrievedSong[] = [...topSongs];
  if (diverse && !results.some((r) => r.song.id === diverse.song.id)) {
    results.push(diverse);
  }
  
  // Ensure we always return at least 2 if we have songs (best effort)
  if (results.length < 2 && allScored.length >= 2) {
    // Add the next best if we don't have diverse
    for (const item of allScored) {
      if (!results.some((r) => r.song.id === item.song.id)) {
        results.push(item);
        if (results.length >= 2) break;
      }
    }
  }
  
  // Return results (even if scores are 0, we want references)
  return results.slice(0, maxTotal);
}

