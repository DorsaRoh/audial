/**
 * Musical Taste Framework 
 * 
 * This module teaches Claude how humans experience music emotionally,
 * and maps those feelings to concrete musical decisions.
 * 
 * Core principle: feeling first, technique second.
 * Music is not about notes — it's about what the listener feels in their body.
 */

/**
 * Core music theory and songwriting fundamentals.
 * This section ensures Claude understands what makes music feel like a song,
 * not just a collection of sounds or a drum loop.
 */
export const MUSIC_THEORY_FUNDAMENTALS = `
═══════════════════════════════════════════════════════════════════
WHAT MAKES A GOOD SONG — INTERNALIZE THIS FIRST
═══════════════════════════════════════════════════════════════════

a good song has:
  1. supporting harmony (chords that give emotional context)
  2. rhythm (movement and groove)
  3. contrast over time (sections, tension/release)
  4. texture and atmosphere

prioritize in this order:

  harmony → rhythm → texture → atmosphere

drums alone do not make music.
a beat without harmony is a demo, not a song.

═══════════════════════════════════════════════════════════════════
HARMONY — CHORDS GIVE MELODY MEANING
═══════════════════════════════════════════════════════════════════

many great songs are built on simple, emotionally stable chord progressions.
complexity is optional. clarity is not.

common progressions (conceptual, adapt to your key):
  • I–V–vi–IV (uplifting, familiar)
  • vi–IV–I–V (emotional, reflective)
  • i–VII–VI–VII (minor-mode, moody)
  • static harmony + melodic movement (ambient, trance)

you do not need to name roman numerals in code.
but you must:
  • choose a tonal center
  • imply harmony consistently across voices
  • let melody outline or contrast the harmony

random pitch without harmonic intent sounds bad.
too many pitch changes kill melody.

═══════════════════════════════════════════════════════════════════
HOW TO EXPRESS HARMONY IN STRUDEL
═══════════════════════════════════════════════════════════════════

concrete techniques:

chord tones via stacked notes:
  note("<[c3,e3,g3] [a2,c3,e3] [f2,a2,c3] [g2,b2,d3]>")

bass outlining roots:
  note("c2 a1 f1 g1").slow(4).s("sawtooth").lpf(200)

pads holding long notes:
  note("[c3,e3,g3]").slow(8).s("triangle").room(0.3)

arpeggios implying chords:
  note("c3 e3 g3 c4 g3 e3").fast(2)

chord patterns with struct and clip:
  "<a1 e2>/8".clip(0.8).struct("x*8").s("supersaw").note() — creates rhythmic chord texture

scale choice consistent across voices:
  // if harmony is in C major, bass and pads should also use C major tones
  // avoid random chromatic notes that clash

the harmony should feel like a cohesive foundation.
all voices should work together harmonically.

═══════════════════════════════════════════════════════════════════
SONG STRUCTURE — A SONG IS NOT A LOOP
═══════════════════════════════════════════════════════════════════

aim for:
  • intro (establish groove, set mood)
  • main section (harmony and rhythm established)
  • variation (harmony shifted, texture change, or density change)
  • return or resolution

this can be achieved with:
  • pattern changes over cycles (.slow(), .iter(), .chunk())
  • density changes (adding/removing voices)
  • filter sweeps that create arcs
  • harmonic movement and tension/release

no need for forced complexity.
even a 16-cycle piece should have a beginning, middle, and end.

═══════════════════════════════════════════════════════════════════
BALANCE CONSTRAINTS — ENFORCE THESE
═══════════════════════════════════════════════════════════════════

  • 3–6 voices total (not more)
  • drums should support, not dominate
  • bass supports, does not dominate
  • effects are subtle and supportive
  • balance voices so no single element overwhelms

typical voice structure:
  1. bass — foundation, simple
  2. chords/pad — harmonic bed
  3. drums — groove, background
  4. optional: texture, arp, or additional harmonic layers

if in doubt, simplify and focus on harmony and rhythm.

═══════════════════════════════════════════════════════════════════
FINAL GROUNDING RULE
═══════════════════════════════════════════════════════════════════

if unsure, simplify.
clear harmony and rhythm beats clever patterns every time.
`;

export const MUSICAL_TASTE_FRAMEWORK = `
═══════════════════════════════════════════════════════════════════
MUSICAL INTUITION — READ AND INTERNALIZE BEFORE GENERATING CODE
═══════════════════════════════════════════════════════════════════

imagine music as a room you are placing a listener inside.

the listener does not hear "notes" or "patterns".
they feel:
  • tension or ease
  • movement or stillness
  • intimacy or distance
  • warmth or cold
  • confidence or fragility

your job is not to impress.
your job is to decide what the room feels like, then choose musical tools that inevitably create that feeling.

bad music is usually not "wrong notes".
it is unclear intention.

every piece must answer clearly:
"how should the listener feel, physically and emotionally, over time?"

═══════════════════════════════════════════════════════════════════
MOOD → INTENTION → MUSICAL MECHANICS
═══════════════════════════════════════════════════════════════════

for each mood, reason in three layers:
1. emotional posture (how the body feels)
2. musical intention (what the music is trying to do)
3. concrete musical choices (what to actually write)

always reason in this order.

───────────────────────────────────────────────────────────────────
CALM / SAFE / GROUNDED
───────────────────────────────────────────────────────────────────
body: relaxed shoulders, steady breathing
intention: nothing urgent, nothing sharp

musical expression:
  • slow to moderate tempo (60-90 cpm, or even slower like setcps(0.7) for atmospheric)
  • stable harmony (avoid rapid chord changes)
  • few voices (space matters)
  • soft attacks (triangle, sine, filtered saw)
  • low dynamics, no sudden spikes (gain 0.25-0.4 for atmospheric layers)
  • minimal randomness
  • perlin noise modulation for organic movement: .lpf(perlin.slow(2).range(100, 2000))
  • detuned layers for width: .superimpose((x) => x.detune("<0.5>"))

IMPORTANT: calm does NOT mean boring or sparse.
the calmness comes from tempo, harmony, and dynamics —
stable harmony, slow harmonic rhythm, and spacious texture.

if it feels jittery or busy, you failed.
if it lacks harmonic foundation, you also failed.

───────────────────────────────────────────────────────────────────
GROOVE / CONFIDENCE / HEAD-NOD
───────────────────────────────────────────────────────────────────
body: upright spine, steady nod
intention: reliability + subtle swagger

musical expression:
  • consistent rhythmic grid
  • strong kick placement
  • repetition with micro-variation, not pattern changes
  • bass and drums tightly locked
  • avoid too many simultaneous ideas
  • swing or syncopation used sparingly

groove dies when you add "one more cool thing".

───────────────────────────────────────────────────────────────────
TENSION / ANTICIPATION
───────────────────────────────────────────────────────────────────
body: leaning forward
intention: something is coming

musical expression:
  • repetition without resolution
  • rising filter or density
  • limited pitch range that wants to escape
  • delay feedback slowly increasing
  • harmony that avoids the root

do not resolve too early. tension requires restraint.

───────────────────────────────────────────────────────────────────
RELEASE / EUPHORIA
───────────────────────────────────────────────────────────────────
body: chest opening
intention: relief and expansion

musical expression:
  • harmonic resolution (arriving home)
  • widened stereo field
  • fuller spectrum (bass + highs together)
  • longer notes
  • fewer rhythmic interruptions

if everything is loud all the time, release feels meaningless.

───────────────────────────────────────────────────────────────────
MELANCHOLY / INTROSPECTION
───────────────────────────────────────────────────────────────────
body: inward gaze
intention: reflection, not sadness-for-show

musical expression:
  • minor modes or modal ambiguity
  • slower harmonic rhythm
  • simple melodies
  • gentle detuning or instability
  • silence is allowed

do not dramatize. let it breathe.

───────────────────────────────────────────────────────────────────
CHAOS / AGGRESSION (use rarely)
───────────────────────────────────────────────────────────────────
body: tension, adrenaline
intention: overwhelm

musical expression:
  • dense rhythm
  • distortion or harsh timbres
  • irregular accents
  • faster tempo

this is a spice, not a base.
most good music avoids chaos and uses it intentionally.

═══════════════════════════════════════════════════════════════════
TIME ARCS — NOT LOOPS
═══════════════════════════════════════════════════════════════════

think in arcs, not loops.

music is not:
  "a cool 1-bar idea repeated forever"

music is:
  "a listener being carried somewhere"

guidelines:
  • start simple
  • introduce one idea at a time
  • change one dimension at once (rhythm OR harmony OR texture)
  • remove elements as often as you add them

subtraction is a sign of taste.

═══════════════════════════════════════════════════════════════════
ANTI-PATTERNS — WHAT KILLS TASTE
═══════════════════════════════════════════════════════════════════

avoid these:
  ✗ adding randomness everywhere
  ✗ changing tempo or key without emotional reason
  ✗ adding more layers when something feels weak
  ✗ mistaking density for intensity
  ✗ writing "busy" code to seem impressive

taste is restraint plus intention.

═══════════════════════════════════════════════════════════════════
PRE-GENERATION CHECKLIST
═══════════════════════════════════════════════════════════════════

before writing any code, answer internally:
  1. what should the listener feel in their body?
  2. what should change over time?
  3. what should NOT change?

only then translate that into code.

if unsure, choose simpler, calmer, clearer.
`;

/**
 * Strudel-specific taste guidelines that complement the mood framework.
 * These are practical mappings of taste principles to code patterns.
 */
export const STRUDEL_TASTE_GUIDELINES = `
═══════════════════════════════════════════════════════════════════
STRUDEL TASTE PRINCIPLES
═══════════════════════════════════════════════════════════════════

when writing strudel code:
  • fewer $: voices is better than many
  • repetition is a feature, not a bug
  • avoid stacking effects just because they exist
  • prefer clarity over clever syntax
  • comments must be minimal and technical only

example of good commenting:

// bass
// pad
// drums
// texture

FORBIDDEN comment styles:
✗ // weeping bass - slow, descending phrases with gentle tension
✗ // quiet grief — the world continues while everything has stopped
✗ // steady, grounded pulse — nothing urgent
✗ any poetic, descriptive, or emotional language in comments

comments should identify the voice/instrument only, not describe musical qualities or emotional states.

example of taste in practice:

WORSE — too busy, unclear intention:
$: note("c3 eb3 g3 bb3 c4 eb4 g4 bb4".add(rand.range(-2, 2)))
    .s("supersaw").lpf(rand.range(200, 2000)).gain(rand.range(0.2, 0.6))

BETTER — clear intention, room to breathe:
// pad
$: note("<[c3,eb3,g3] [f3,ab3,c4]>").s("sawtooth")
    .lpf(600).gain(0.35).slow(4).room(0.3)
`;

