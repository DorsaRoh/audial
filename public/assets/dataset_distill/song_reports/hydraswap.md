# hydraswap

## brief structural analysis

- **groove**: euclidean rhythms, syncopated, minimal
- **bass role**: euclidean pattern `euclid(3,8)`, drives rhythm
- **motif**: bass pattern repeats, filter modulation creates variation
- **form/arc**: sequence-based (0-4), builds through addition, includes silence

## what makes this work

- **euclidean rhythm**: `euclid(3,8)` creates syncopated, off-beat feel
- **filter modulation**: `.lpf(sine.range(400, 1000))` creates timbral variation
- **sequence structure**: `sequence.pick([bass, stack(bass, kick), ...])` creates build
- **silence section**: includes silence for contrast

## what would break it

- making euclidean pattern too dense would lose syncopation
- removing filter modulation would sound static
- making sequence too random would lose coherence

## extracted reusable idea(s)

- **euclidean rhythms**: using `.euclid()` creates syncopated, polyrhythmic patterns
- **sequence-based structure**: using `.pick()` with sequence creates build

## recommended strategies

- **primary**: bass_driven_groove (euclidean bass drives rhythm)
- **secondary**: polyrhythmic_layering (euclidean creates polyrhythm), filter_sweep_effects (filter modulation creates variation)

## justification

this song uses bass_driven_groove as primary (euclidean bass drives rhythm). polyrhythmic_layering creates interest (euclidean pattern creates polyrhythm). filter_sweep_effects adds timbral variation. the combination creates a minimal, syncopated groove.

