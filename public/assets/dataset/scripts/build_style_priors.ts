#!/usr/bin/env tsx
/**
 * Builds style priors from the dataset - "what good looks like" summary.
 * 
 * Usage: tsx build_style_priors.ts
 */

import * as fs from "fs";
import * as path from "path";
import { SongIndex, StylePriors } from "../schema";

const INDEX_FILE = path.join(__dirname, "../index.json");
const OUTPUT_FILE = path.join(__dirname, "../style_priors.json");

function buildStylePriors(): StylePriors {
  // Load index
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`Index file not found: ${INDEX_FILE}`);
    console.error("Run 'npm run build-index' first");
    process.exit(1);
  }
  
  const indexData = fs.readFileSync(INDEX_FILE, "utf-8");
  const index: SongIndex = JSON.parse(indexData);
  
  const songs = index.songs;
  if (songs.length === 0) {
    console.error("No songs in index");
    process.exit(1);
  }
  
  // Analyze tempo distribution
  const tempoBuckets: Record<string, number> = {
    "60-80": 0,
    "80-100": 0,
    "100-120": 0,
    "120-140": 0,
    "140-160": 0,
    "160+": 0,
  };
  
  const bpms: number[] = [];
  const voiceCounts: number[] = [];
  const instrumentCounts: Record<string, number> = {};
  const techniqueCounts: Record<string, number> = {};
  const hasEvery: number[] = [];
  const hasOff: number[] = [];
  const hasSlow: number[] = [];
  const hasSometimes: number[] = [];
  
  for (const song of songs) {
    // Tempo
    if (song.bpm) {
      bpms.push(song.bpm);
      if (song.bpm < 80) tempoBuckets["60-80"]++;
      else if (song.bpm < 100) tempoBuckets["80-100"]++;
      else if (song.bpm < 120) tempoBuckets["100-120"]++;
      else if (song.bpm < 140) tempoBuckets["120-140"]++;
      else if (song.bpm < 160) tempoBuckets["140-160"]++;
      else tempoBuckets["160+"]++;
    }
    
    // Voice count (estimate from snippet)
    const voiceMatches = song.snippet.match(/\$:/g) || song.snippet.match(/^[a-z0-9]+:/gm);
    const voiceCount = voiceMatches ? voiceMatches.length : 0;
    if (voiceCount > 0) voiceCounts.push(voiceCount);
    
    // Instruments
    for (const inst of song.instruments) {
      instrumentCounts[inst] = (instrumentCounts[inst] || 0) + 1;
    }
    
    // Techniques
    for (const tech of song.techniques) {
      techniqueCounts[tech] = (techniqueCounts[tech] || 0) + 1;
    }
    
    // Arrangement patterns (from snippet)
    const snippetLower = song.snippet.toLowerCase();
    if (snippetLower.includes(".every(")) hasEvery.push(1);
    if (snippetLower.includes(".off(")) hasOff.push(1);
    if (snippetLower.includes(".slow(")) hasSlow.push(1);
    if (snippetLower.includes(".sometimes")) hasSometimes.push(1);
  }
  
  // Compute stats
  const avgBpm = bpms.length > 0 ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : 120;
  const avgVoices = voiceCounts.length > 0
    ? Math.round(voiceCounts.reduce((a, b) => a + b, 0) / voiceCounts.length)
    : 4;
  const minVoices = voiceCounts.length > 0 ? Math.min(...voiceCounts) : 2;
  const maxVoices = voiceCounts.length > 0 ? Math.max(...voiceCounts) : 8;
  
  // Top instruments
  const topInstruments = Object.entries(instrumentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  // Top techniques
  const topTechniques = Object.entries(techniqueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  
  // Tempo distribution
  const tempoDistribution = Object.entries(tempoBuckets)
    .map(([range, count]) => ({ range, count }))
    .filter((item) => item.count > 0);
  
  // Generate summary bullets
  const summaryBullets: string[] = [
    `Most songs use ${minVoices}-${maxVoices} voices (typically ${avgVoices})`,
    `Common tempo range: ${avgBpm} BPM (most songs between 120-140)`,
    `Most common instruments: ${topInstruments.slice(0, 3).map((i) => i.name).join(", ")}`,
    `Arrangement patterns: ${Math.round((hasEvery.length / songs.length) * 100)}% use .every(), ${Math.round((hasSlow.length / songs.length) * 100)}% use .slow()`,
    `Effects: ${Math.round((techniqueCounts["delay"] || 0) / songs.length * 100)}% use delay, ${Math.round((techniqueCounts["reverb"] || 0) / songs.length * 100)}% use reverb`,
  ];
  
  // Common moves
  const commonMoves: string[] = [];
  if (hasEvery.length > songs.length * 0.3) {
    commonMoves.push("introduce variation with .every() to evolve patterns over time");
  }
  if (hasOff.length > songs.length * 0.2) {
    commonMoves.push("use .off() to create rhythmic gaps and breathing room");
  }
  if (hasSlow.length > songs.length * 0.3) {
    commonMoves.push("apply .slow() to pads/chords for longer harmonic cycles");
  }
  if (techniqueCounts["filter-sweep"] && techniqueCounts["filter-sweep"] > songs.length * 0.2) {
    commonMoves.push("breakdown: drop kick, open filter with .lpf(sine.range(...))");
  }
  if (techniqueCounts["delay"] && techniqueCounts["delay"] > songs.length * 0.3) {
    commonMoves.push("add .delay() to leads for space and movement");
  }
  
  // Do more of
  const doMoreOf: string[] = [
    "develop melodies with 4+ phrases and clear contour",
    "use rests between phrases for breathing room",
    "layer 3-6 voices with distinct roles (lead, pad, bass, drums)",
    "apply effects intentionally to serve the mood",
    "evolve patterns gradually with .every() or .sometimes()",
  ];
  
  // Avoid
  const avoid: string[] = [
    "copying reference code verbatim",
    "too many voices (keep under 8)",
    "randomness without purpose",
    "effects that don't serve the feeling",
    "sparse melodies with only 2-3 notes",
  ];
  
  return {
    summary_bullets: summaryBullets,
    common_moves: commonMoves,
    do_more_of: doMoreOf,
    avoid: avoid,
    tempo_distribution: tempoDistribution,
    typical_voice_count: {
      min: minVoices,
      max: maxVoices,
      common: avgVoices,
    },
    most_common_instruments: topInstruments,
    most_common_techniques: topTechniques,
  };
}

// Main execution
if (require.main === module) {
  const priors = buildStylePriors();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(priors, null, 2));
  console.log(`Style priors written to ${OUTPUT_FILE}`);
  console.log(`\nSummary bullets:`);
  priors.summary_bullets.forEach((bullet) => console.log(`  - ${bullet}`));
}

