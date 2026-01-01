# Composition Strategies (Dataset-Derived)

This system is trained on 20 analyzed songs. Use these strategies to create coherent, musical compositions.

## Primary Strategies (in order of frequency)

### 1. section_based_arrangement
Use `pickRestart()` or multiple pattern definitions to create distinct sections.
- songs: epicbiopic, formachines, pumpupthejam, rhythmofthenight, shedontusejelly, vine, woodeneye
- technique: define patterns with variations, use pickRestart to sequence them
- when to use: longer pieces, songs that need development, dance tracks

### 2. chord_progression_voicing
Build songs around clear chord progressions with careful voicing.
- songs: ameliewaltz, bigship, pyramidsong
- technique: use stacked notes `[c3,e3,g3]` or chord names, voice lead between chords
- when to use: emotional pieces, songs needing harmonic foundation

### 3. bass_driven_groove
Let a syncopated bass line drive the rhythm and energy.
- songs: bluemonday, enjoythesilence, hydraswap
- technique: create rhythmic bass patterns with rests and syncopation
- when to use: dance music, groovy pieces, minimal arrangements

### 4. melodic_motif_variation
Create a memorable melodic phrase and develop it through repetition and variation.
- songs: determination, waltzno2
- technique: define a melodic pattern, vary it with transposition, rhythm changes
- when to use: emotional, memorable pieces

### 5. minimalist_pattern
Use sparse, repeating patterns with subtle modulation.
- songs: bluemonday, shanghai, strangerthings
- technique: few elements, filter modulation, slow evolution
- when to use: ambient, atmospheric, meditative pieces

### 6. filter_sweep_effects
Create movement through filter modulation rather than note changes.
- songs: strangerthings, hydraswap
- technique: `.lpf(perlin.slow(2).range(100, 2000))` or `.lpf(sine.range(...).slow(...))`
- when to use: atmospheric, evolving textures

### 7. textural_layering
Build density through multiple complementary layers.
- songs: mammalschilling, epicbiopic
- technique: add layers gradually, balance frequencies, use different timbres
- when to use: orchestral, world music, rich textures

### 8. arpeggiated_chord
Use arpeggios to create harmonic movement and rhythm simultaneously.
- songs: edenontheair, whydoesmybrain
- technique: break chords into patterns, use `.arp()` or manual patterns
- when to use: shimmering textures, ambient, electronic

### 9. dynamic_build_release
Create energy arcs through volume, filter, or layer changes.
- songs: edenontheair, formachines, pumpupthejam, rhythmofthenight
- technique: use gain automation, filter opening, layer entry/exit
- when to use: pieces needing emotional arc, builds, drops

### 10. drum_pattern_variation
Keep drums interesting through pattern changes and fills.
- songs: formachines, pumpupthejam, rhythmofthenight, shedontusejelly, vine, woodeneye
- technique: vary kick/snare patterns, add fills, use different samples
- when to use: dance music, rock, anything with drums

## Strategy Combinations

Common effective pairings:
- section_based_arrangement + bass_driven_groove (dance tracks)
- chord_progression_voicing + melodic_motif_variation (emotional pieces)
- minimalist_pattern + filter_sweep_effects (ambient/atmospheric)
- section_based_arrangement + drum_pattern_variation (energetic pieces)

## Energy Curves

Match your strategy to the desired energy:
- **flat**: minimalist_pattern, bass_driven_groove (steady groove)
- **rising**: section_based_arrangement, textural_layering (builds energy)
- **peaks**: dynamic_build_release, arpeggiated_chord (tension/release)

## Texture Guidelines

- **sparse** (1-3 voices): minimalist_pattern, filter_sweep_effects
- **medium** (3-5 voices): chord_progression_voicing, bass_driven_groove
- **dense** (5+ voices): section_based_arrangement, textural_layering

## Quick Reference

When asked for:
- "ambient/atmospheric" → minimalist_pattern + filter_sweep_effects
- "dance/groovy" → bass_driven_groove + drum_pattern_variation
- "emotional/cinematic" → chord_progression_voicing + dynamic_build_release
- "energetic/building" → section_based_arrangement + textural_layering
- "minimal/focused" → minimalist_pattern + melodic_motif_variation

## Key Techniques from Dataset

1. **Filter modulation**: `.lpf(perlin.slow(2).range(100, 2000))` creates organic movement
2. **Syncopation**: use rests strategically in bass/drums for groove
3. **Voice leading**: connect chords smoothly for harmonic flow
4. **Layer balance**: keep gains low (0.25-0.45), balance frequencies
5. **Section contrast**: vary texture/energy between sections
6. **Motif development**: repeat and vary melodic ideas

Apply these strategies based on the user's request. Choose 1-2 primary strategies and support with techniques from the dataset.
