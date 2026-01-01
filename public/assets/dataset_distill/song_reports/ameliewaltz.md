# ameliewaltz

## brief structural analysis

- **groove**: waltz feel (3/4 time implied by chord rhythm), gentle and flowing
- **bass role**: absent (harmony-only texture)
- **motif**: two-layer chord voicing pattern with subtle melodic fragments in upper voice
- **form/arc**: single section, no clear arc (atmospheric)

## what makes this work

- **voicing choice**: using `.anchor()` to set register creates a clear harmonic texture without muddiness
- **sparse texture**: no drums or bass allows the harmonica timbre to breathe
- **subtle variation**: the upper voice pattern `[3@5.5 2@0.5 1@3 0@3]` creates gentle motion without being melodic
- **reverb**: `.room(1.5)` creates space that fits the waltz aesthetic

## what would break it

- adding drums would destroy the delicate atmosphere
- making the upper voice too active would sound busy
- removing reverb would make it sound dry and clinical

## extracted reusable idea(s)

- **chord-only texture**: can create contemplative or atmospheric moods without rhythm section
- **anchor-based voicing**: using `.anchor()` with chord progressions creates clear harmonic register

## recommended strategies

- **primary**: chord_progression_voicing (clear harmonic foundation with careful voicing)
- **secondary**: none (this is a pure harmony piece)

## justification

this song is a textbook example of chord_progression_voicing. it uses chords with careful voicing choices (via `.anchor()`) to create texture without melody or rhythm. the waltz feel comes from the chord rhythm, not from drums.

