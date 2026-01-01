#!/usr/bin/env tsx
/**
 * build_manifest.ts
 * 
 * reads features.json and generates manifest.json with song metadata.
 * expects manual tagging to be done in features.json first.
 * 
 * usage: tsx tools/build_manifest.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface SongManifest {
  id: string;
  title: string;
  path: string;
  bpm?: number;
  cpm?: number;
  timefeel: 'straight' | 'swing' | 'triplet' | 'unknown';
  primary_strategy: string;
  secondary_strategies: string[];
  energy_curve: 'flat' | 'rising' | 'drop' | 'peaks' | 'unknown';
  texture: 'sparse' | 'medium' | 'dense';
  motif_type: 'melodic' | 'rhythmic' | 'timbral' | 'bass' | 'none';
  harmonic_rhythm: 'slow' | 'medium' | 'fast' | 'none';
  notes: string;
}

async function main() {
  const featuresPath = path.join(__dirname, '../features.json');
  const configPath = path.join(__dirname, '../config.json');
  
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  // this will be populated by reading song files and manual analysis
  // for now, create a template structure
  const manifest: SongManifest[] = features.map((f: any) => {
    const override = config.song_overrides?.[f.id] || {};
    const title = override.title || f.title || f.id;
    
    // convert cpm to bpm estimate (cpm is typically cycles per minute, where cycle = 4 beats)
    const bpm = f.cpm ? f.cpm * 4 : undefined;
    
    return {
      id: f.id,
      title,
      path: f.path,
      bpm,
      cpm: f.cpm,
      timefeel: 'unknown' as const,
      primary_strategy: 'unknown',
      secondary_strategies: [],
      energy_curve: 'unknown' as const,
      texture: f.line_count < 30 ? 'sparse' as const : f.line_count > 100 ? 'dense' as const : 'medium' as const,
      motif_type: 'none' as const,
      harmonic_rhythm: 'none' as const,
      notes: '',
    };
  });
  
  const outputPath = path.join(__dirname, '../manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`wrote manifest template to ${outputPath}`);
  console.log('note: this is a template. manual tagging required for strategies, energy curves, etc.');
}

main().catch(console.error);

