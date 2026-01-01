#!/usr/bin/env tsx
/**
 * analyze_songs.ts
 * 
 * extracts features from strudel song files to support manual tagging
 * and strategy classification.
 * 
 * usage: tsx tools/analyze_songs.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface SongFeatures {
  id: string;
  path: string;
  title?: string;
  // tempo detection
  tempo?: number;
  cpm?: number;
  // layer detection
  has_drums: boolean;
  has_bass: boolean;
  has_lead: boolean;
  has_chords: boolean;
  has_samples: boolean;
  // complexity proxies
  binding_count: number;
  stack_count: number;
  arrange_count: number;
  pickRestart_count: number;
  // pattern characteristics
  has_slow: boolean;
  has_fast: boolean;
  has_mask: boolean;
  has_gain: boolean;
  has_lpf: boolean;
  has_hpf: boolean;
  has_delay: boolean;
  has_reverb: boolean;
  // sample usage
  sample_tokens: string[];
  unique_samples: number;
  // pattern length hints (heuristic)
  pattern_length_hint: 'short' | 'medium' | 'long' | 'unknown';
  // chord/melody hints
  has_chord_function: boolean;
  has_note_function: boolean;
  has_scale_function: boolean;
  // structure hints
  has_comment_sections: boolean;
  // raw counts
  line_count: number;
  character_count: number;
}

function extractTempo(content: string): { tempo?: number; cpm?: number } {
  // look for setcpm( or setCpm( or setcps( or setCps(
  const cpmMatch = content.match(/setcpm?\s*\(\s*([^)]+)\s*\)/i);
  if (cpmMatch) {
    const expr = cpmMatch[1].trim();
    try {
      // try to evaluate simple expressions like "120/4", "170/60", etc.
      // replace common patterns
      const normalized = expr
        .replace(/\s+/g, '')
        .replace(/\/\s*(\d+)/g, '/$1');
      
      // simple fraction evaluation
      if (/^\d+\/\d+$/.test(normalized)) {
        const [num, den] = normalized.split('/').map(Number);
        const cpm = num / den;
        return { cpm };
      }
      
      // try direct eval for simple cases (be careful)
      if (/^[\d\s+\-*\/.()]+$/.test(normalized)) {
        const result = eval(normalized);
        if (typeof result === 'number' && result > 0 && result < 1000) {
          return { cpm: result };
        }
      }
    } catch (e) {
      // ignore eval errors
    }
  }
  
  // look for .cpm( method calls
  const dotCpmMatch = content.match(/\.cpm\s*\(\s*([^)]+)\s*\)/);
  if (dotCpmMatch) {
    const expr = dotCpmMatch[1].trim();
    try {
      if (/^\d+\/\d+$/.test(expr.replace(/\s+/g, ''))) {
        const [num, den] = expr.replace(/\s+/g, '').split('/').map(Number);
        return { cpm: num / den };
      }
    } catch (e) {
      // ignore
    }
  }
  
  return {};
}

function analyzeSong(filePath: string, id: string): SongFeatures {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // extract title from comments if present
  const titleMatch = content.match(/@title\s+(.+)/i) || 
                     content.match(/\/\/\s*"([^"]+)"/) ||
                     content.match(/\/\/\s*([^\n]+)/);
  const title = titleMatch ? titleMatch[1].trim() : undefined;
  
  const tempo = extractTempo(content);
  
  // layer detection
  const has_drums = /s\s*\(\s*["'](bd|sd|hh|cp|cr|oh|mt|lt|rd)/i.test(content) ||
                    /\.bank\s*\(/i.test(content) ||
                    /\.sound\s*\(/i.test(content);
  const has_bass = /bass/i.test(content) || 
                   /\.s\s*\(\s*["'](.*bass|triangle)/i.test(content) ||
                   /gm_electric_bass/i.test(content);
  const has_lead = /lead/i.test(content) ||
                   /melod/i.test(content) ||
                   /\.s\s*\(\s*["'](.*lead|sawtooth|square|supersaw)/i.test(content);
  const has_chords = /\.chord\s*\(/i.test(content) ||
                     /chord\s*\(/i.test(content) ||
                     /voicing/i.test(content);
  const has_samples = /samples\s*\(/i.test(content) ||
                      /await\s+samples/i.test(content);
  
  // complexity proxies
  const binding_count = (content.match(/\$\w+:/g) || []).length;
  const stack_count = (content.match(/stack\s*\(/gi) || []).length;
  const arrange_count = (content.match(/arrange\s*\(/gi) || []).length;
  const pickRestart_count = (content.match(/pickRestart\s*\(/gi) || []).length;
  
  // pattern characteristics
  const has_slow = /\.slow\s*\(/i.test(content);
  const has_fast = /\.fast\s*\(/i.test(content);
  const has_mask = /\.mask\s*\(/i.test(content);
  const has_gain = /\.gain\s*\(/i.test(content);
  const has_lpf = /\.lpf\s*\(/i.test(content);
  const has_hpf = /\.hpf\s*\(/i.test(content);
  const has_delay = /\.delay\s*\(/i.test(content);
  const has_reverb = /\.room\s*\(/i.test(content) || /\.reverb\s*\(/i.test(content);
  
  // sample tokens
  const sampleMatches = content.matchAll(/s\s*\(\s*["']([^"']+)["']/gi);
  const sample_tokens = Array.from(sampleMatches).map(m => m[1]);
  const unique_samples = new Set(sample_tokens).size;
  
  // pattern length hint (heuristic based on longest pattern string)
  const patternMatches = content.matchAll(/["'`]([^"'`]{20,})["'`]/g);
  const maxPatternLength = Math.max(
    ...Array.from(patternMatches).map(m => m[1].length),
    0
  );
  let pattern_length_hint: 'short' | 'medium' | 'long' | 'unknown' = 'unknown';
  if (maxPatternLength > 200) {
    pattern_length_hint = 'long';
  } else if (maxPatternLength > 50) {
    pattern_length_hint = 'medium';
  } else if (maxPatternLength > 0) {
    pattern_length_hint = 'short';
  }
  
  // chord/melody hints
  const has_chord_function = /chord\s*\(/i.test(content);
  const has_note_function = /note\s*\(/i.test(content) || /\.note\s*\(/i.test(content);
  const has_scale_function = /\.scale\s*\(/i.test(content);
  
  // structure hints
  const has_comment_sections = /\/\/\s*(section|verse|chorus|bridge|intro|outro)/i.test(content);
  
  return {
    id,
    path: filePath,
    title,
    ...tempo,
    has_drums,
    has_bass,
    has_lead,
    has_chords,
    has_samples,
    binding_count,
    stack_count,
    arrange_count,
    pickRestart_count,
    has_slow,
    has_fast,
    has_mask,
    has_gain,
    has_lpf,
    has_hpf,
    has_delay,
    has_reverb,
    sample_tokens: Array.from(new Set(sample_tokens)).slice(0, 20), // limit to 20 unique
    unique_samples,
    pattern_length_hint,
    has_chord_function,
    has_note_function,
    has_scale_function,
    has_comment_sections,
    line_count: lines.length,
    character_count: content.length,
  };
}

function findSongFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip functions and jamsessions directories
      if (entry.name !== 'functions' && entry.name !== 'jamsessions') {
        files.push(...findSongFiles(fullPath));
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function main() {
  const configPath = path.join(__dirname, '../config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  const songsDir = path.resolve(__dirname, '../dataset/strudel-songs-collection');
  const songFiles = findSongFiles(songsDir);
  
  // filter to only .js files
  const validFiles = songFiles.filter(f => f.endsWith('.js'));
  
  console.log(`found ${validFiles.length} song files`);
  
  // select 20 songs (prioritize the ones mentioned in config overrides)
  const overrideIds = new Set(Object.keys(config.song_overrides || {}));
  const prioritized = validFiles
    .map(f => ({
      file: f,
      id: path.basename(f, '.js'),
      priority: overrideIds.has(path.basename(f, '.js')) ? 1 : 0
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 20)
    .map(x => ({ file: x.file, id: x.id }));
  
  console.log(`analyzing ${prioritized.length} songs...`);
  
  const features = prioritized.map(({ file, id }) => {
    try {
      return analyzeSong(file, id);
    } catch (error) {
      console.error(`error analyzing ${id}:`, error);
      return {
        id,
        path: file,
        has_drums: false,
        has_bass: false,
        has_lead: false,
        has_chords: false,
        has_samples: false,
        binding_count: 0,
        stack_count: 0,
        arrange_count: 0,
        pickRestart_count: 0,
        has_slow: false,
        has_fast: false,
        has_mask: false,
        has_gain: false,
        has_lpf: false,
        has_hpf: false,
        has_delay: false,
        has_reverb: false,
        sample_tokens: [],
        unique_samples: 0,
        pattern_length_hint: 'unknown' as const,
        has_chord_function: false,
        has_note_function: false,
        has_scale_function: false,
        has_comment_sections: false,
        line_count: 0,
        character_count: 0,
      };
    }
  });
  
  const outputPath = path.join(__dirname, '../features.json');
  fs.writeFileSync(outputPath, JSON.stringify(features, null, 2));
  console.log(`wrote features to ${outputPath}`);
  
  // print summary
  console.log('\nsummary:');
  console.log(`  songs analyzed: ${features.length}`);
  console.log(`  with tempo: ${features.filter(f => f.cpm || f.tempo).length}`);
  console.log(`  with drums: ${features.filter(f => f.has_drums).length}`);
  console.log(`  with bass: ${features.filter(f => f.has_bass).length}`);
  console.log(`  with lead: ${features.filter(f => f.has_lead).length}`);
  console.log(`  with chords: ${features.filter(f => f.has_chords).length}`);
}

main().catch(console.error);

