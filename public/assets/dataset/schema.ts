export type SongIndexEntry = {
  id: string;                 // stable slug from filename/path
  slug: string;               // normalized filename/title slug (e.g. "strangerthings")
  title: string;              // best-effort (from filename or comment header)
  source_path: string;        // relative path inside dataset
  source_url: string;         // github blob url if possible, else repo root + path
  author?: string;            // if detectable
  bpm?: number;               // parse from setcpm(...) if present
  cpm?: number;               // same as bpm if used
  key?: string;               // parse from scale("g:minor") etc if present
  instruments: string[];      // detect synth/sample names used: sawtooth, bd, etc
  techniques: string[];       // e.g. trancy, acid, polyrhythm, arpeggio, breakbeat, ambient-pad
  moods: string[];            // e.g. dark, warm, nostalgic, euphoric, gritty, airy
  genres: string[];           // e.g. techno, trance, ambient, hiphop, dnb, house
  prompt_seeds: string[];     // 5–12 short natural-language prompts that would map to this song
  snippet: string;            // first ~40 lines (or first 1200 chars) for quick preview
  aliases?: string[];         // derived from filename tokens (e.g. ["stranger", "things", "stranger things"])
  title_tokens?: string[];     // tokenized title for matching
  path_tokens?: string[];      // tokenized path for matching
};

export type SongIndex = {
  songs: SongIndexEntry[];
  generated_at: string;
  version: string;
};

export type StylePriors = {
  summary_bullets: string[];
  common_moves: string[];
  do_more_of: string[];
  avoid: string[];
  tempo_distribution: { range: string; count: number }[];
  typical_voice_count: { min: number; max: number; common: number };
  most_common_instruments: { name: string; count: number }[];
  most_common_techniques: { name: string; count: number }[];
};
