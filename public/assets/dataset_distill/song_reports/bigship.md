# bigship

## brief structural analysis

- **groove**: fast chord progression (`.fast(2)`) creates energetic feel, drums provide accent
- **bass role**: root notes extracted from chord progression, doubled (`.struct("x*2")`)
- **motif**: chord progression with two voicing layers (violin + organ)
- **form/arc**: single section, builds energy through fast progression

## what makes this work

- **fast progression**: `.fast(2)` on the chord progression creates urgency without changing notes
- **layered voicing**: violin (high) + organ (mid) creates rich harmonic texture
- **bass extraction**: `.rootNotes(1)` pulls bass from harmony, keeping it aligned
- **minimal drums**: kick and snare provide accent without dominating

## what would break it

- slowing the progression would lose energy
- making drums more complex would compete with harmony
- removing one voicing layer would sound thin

## extracted reusable idea(s)

- **fast chord progression**: applying `.fast()` to chord patterns creates energy without changing harmony
- **bass extraction**: using `.rootNotes()` to derive bass from chords keeps harmony aligned

## recommended strategies

- **primary**: chord_progression_voicing (harmony-driven with careful voicing)
- **secondary**: harmonic_motion_bass (bass follows harmony, drives motion)

## justification

this song uses chord_progression_voicing as the foundation (two voicing layers), with harmonic_motion_bass as secondary (bass extracted from chords). the fast progression creates energy through rhythm, not density.

