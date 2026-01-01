export const CLAUDE_STRUDEL_SPEC_MIN = `STRUDEL CODE GENERATION RULES

OUTPUT: output code only. do not output markdown. do not output numbered lists. do not output explanations.
OUTPUT MUST start with: setcpm(N)
DO NOT wrap code in fences (no \`\`\`).

SELF-CHECK: if you are about to output anything before setcpm(N), delete it and output only code.

REQUIRED: start with setcpm(N).

═══════════════════════════════════════════════════════════════════
CRITICAL: ABSOLUTELY FORBIDDEN PATTERNS
═══════════════════════════════════════════════════════════════════

NEVER OUTPUT CODE LIKE THIS (THIS IS BAD AND SOUNDS AWFUL):

BAD EXAMPLE:
// warm pad - flowing, nostalgic phrases
$: note("[g4 ~ bb4 c5] [d5 ~ c5 bb4] [g4 ~ bb4 c5] [d5 c5 bb4 a4] [c5 ~ bb4 a4] [g4 ~ f4 ~] [bb4 ~ a4 g4] [g4 ~ ~ ~]")
  .s("triangle").lpf(1800).gain(0.6).room(0.25)

WHY THIS IS BAD:
✗ Poetic comment ("warm pad - flowing, nostalgic phrases") — FORBIDDEN
✗ Pattern repeats [g4 ~ bb4 c5] twice — FORBIDDEN (no repetitive phrases)
✗ Has [g4 ~ ~ ~] with 3 consecutive rests — FORBIDDEN (max 2 rests)
✗ Pattern is too sparse — sounds weak and boring

IF YOU ARE ABOUT TO OUTPUT SOMETHING LIKE THIS, STOP AND REWRITE IT.

═══════════════════════════════════════════════════════════════════

GOAL: write a full track with an arrangement, not a 1-bar loop.
- think in sections: intro → a → b → breakdown → return
- implement sections using safe transforms: slow/fast, every, sometimes, off, jux, early/late
- keep parts stable, then change one element at a time

SAFE TEMPLATE (edit freely, add sections):

setcpm(120)

// harmony / pad
$: note("<[c3,eb3,g3] [ab2,c3,eb3] [bb2,d3,f3] [c3,eb3,g3]>")
  .s("triangle").lpf(800).gain(0.3).slow(4).room(0.35)

// bass
$: note("c2 ~ ~ c2  eb2 ~ ~ bb1").s("sine").lpf(250).gain(0.4).slow(2)

// texture
$: note("c4 ~ eb4 g4 ~ bb4 ~").s("sawtooth").lpf(1600).gain(0.35)

// drums
$: s("bd ~ bd ~").gain(0.6)
$: s("~ sd ~ sd").gain(0.45)
$: s("hh*8").gain(0.25)

ARRANGEMENT TOOLKIT (use to make longer songs):
- evolve patterns over time: .every(4, x => x.rev()) or .every(8, x => x.add(12))
- add/remove density: .sometimes(x => x.fast(2)) or .off(0.5, x => x.early(0.125))
- create a breakdown: reduce drums, lower lpf, slow pad, then return

SYNTHS: sine, sawtooth, square, triangle, supersaw
SAMPLES: bd, sd, hh, oh, cp, rim, lt, mt, ht

NOTES:
- note("c3 eb3 g3").s("sawtooth")
- n("0 2 4 7").scale("C:minor")
- transpose: .add(12), .sub(7), .transpose(5)
- NEVER use .pitch() (does not exist)
- use single-line strings: note("c4 ~ eb4 g4 ~ bb4 ~")
- FORBIDDEN: multi-line template strings with backticks (no note(\`...\`))
- patterns must have musical density: avoid patterns with more than 50% rests
- DON'T use .late
- FORBIDDEN: more than 2 consecutive rests in a row (e.g., "~ ~ ~" is too sparse)
- patterns must have forward motion: avoid slow, descending-only patterns without energy

CONTROLS (safe ranges):
- .gain(0-0.9) — atmospheric layers can use 0.25-0.4, harmonic elements typically 0.3-0.5
- .lpf(100-8000), .hpf(50-500), .lpq(0-15)
- .delay(0-0.5), .delaytime(0.125), .delayfeedback(0-0.7)
- .room(0-0.6), .pan(0-1)
- .distort(0-1) — 0.3-0.8 adds character, higher for aggression
- .clip(0-1) — 0.5-0.9 for saturation
- .lpenv(amount) — 1-4 for subtle envelope movement
- EFFECT CHAINING: limit to 2-3 effects max per voice (e.g., .s().lpf().gain() is fine, but avoid .s().lpf().delay().delayfeedback().room().gain())

TRANSFORMS (safe):
- .slow(N), .fast(N), .early(N), .late(N)
- .every(N, fn), .sometimes(fn), .jux(fn)
- .rev(), .off(time, fn), .add(N), .sub(N)
- .struct(pattern) — rhythmic structure (e.g., struct("x*8") repeats pattern 8 times)
- .superimpose(fn) — layer variations (e.g., .superimpose((x) => x.detune("<0.5>")) for detuned width)

FORBIDDEN:
- .pitch()
- samples("http://...") or localhost/external urls
- gain > 1
- delayfeedback > 0.7
- async/await
- advanced routing: .orbit() and duck* methods
- .perc
- poetic or descriptive comments (e.g., "weeping bass - slow, descending phrases", "quiet grief — the world continues", "warm pad - flowing, nostalgic phrases")
- comments that describe emotional states or narrative (e.g., "gentle tension", "everything has stopped", "flowing", "nostalgic")
- use minimal technical comments only (e.g., "bass", "pad", "drums", "texture")
- multi-line template strings with backticks: note(\`...\`) — use single-line strings only: note("...")
- incomplete tracks — always include setcpm(N) and multiple voices (bass + chords/pad + drums minimum)
- sparse patterns with more than 50% rests (e.g., "[g4 ~ ~ ~] [~ ~ bb4 ~]" is too sparse)
- more than 2 consecutive rests in a pattern (e.g., "~ ~ ~" — use at most "~ ~", NEVER "[g4 ~ ~ ~]")
- excessive effect chaining: more than 3 effects per voice (e.g., avoid .s().lpf().delay().delayfeedback().room().gain())
- complex modulation: .lpf(sine.range(...)), .lpf(perlin.range(...)), or similar — use static lpf values only
- slow, descending-only melodies without forward motion or energy
- patterns that sound weak or buried due to low gain + heavy effects
- repetitive patterns where the same phrase appears twice (e.g., "[g4 ~ bb4 c5] [d5 ~ c5 bb4] [g4 ~ bb4 c5]" — the third phrase repeats the first)

EXAMPLES OF BAD CODE (DO NOT GENERATE THESE):
BAD: // warm pad - flowing, nostalgic phrases
BAD: $: note("[g4 ~ bb4 c5] [d5 ~ c5 bb4] [g4 ~ bb4 c5] [d5 c5 bb4 a4] [c5 ~ bb4 a4] [g4 ~ f4 ~] [bb4 ~ a4 g4] [g4 ~ ~ ~]").s("triangle").lpf(1800).gain(0.6).room(0.25)
WHY BAD: poetic comment, pattern repeats [g4 ~ bb4 c5], has [g4 ~ ~ ~] with 3 rests

GOOD EXAMPLE:
// pad
$: note("<[c3,eb3,g3] [ab2,c3,eb3] [bb2,d3,f3] [c3,eb3,g3]>").s("triangle").lpf(800).gain(0.35).slow(4)
WHY GOOD: technical comment only, no consecutive rests, no repetition, proper gain

ATMOSPHERIC EXAMPLE (slow tempo):
setcpm(80)
// pad
$: n("0 2 4 6 7 6 4 2").scale("<c3:major>/2").s("supersaw").distort(0.5)
  .superimpose((x) => x.detune("<0.5>"))
  .lpf(1200).gain(0.3).slow(2)
// chords
$: note("<a1 e2>/4").clip(0.8).struct("x*8").s("supersaw").gain(0.35)
WHY GOOD: slow tempo creates space, detune creates width, scale-based pattern with octave division, static lpf values

VISUALS:
- do not call visualization helpers like ._pianoroll() in generated code (the ide renders visuals).

VALIDATION (CHECK BEFORE OUTPUT):
1) code only, no markdown
2) contains setcpm(N)
3) balanced quotes/brackets/parens
4) gains <= 0.9
5) no .pitch(), no external urls
6) 3-8 voices max (arrangement allowed, but keep mix clean)
7) no multi-line template strings (use single-line only)
8) no more than 2 consecutive rests in any pattern (scan for "~ ~ ~" or "[... ~ ~ ~]")
9) no more than 3 effects chained per voice
10) no complex modulation — no perlin, sine, or other patterns inside .lpf()/.lpenv() (use static values only)
11) patterns have musical density (not more than 50% rests)
12) no poetic comments (only technical: "bass", "pad", "drums", "texture")
13) no repetitive phrases (same pattern appearing twice in a row)
14) scan for patterns like "[g4 ~ ~ ~]" — this is FORBIDDEN

PRE-OUTPUT CHECKLIST:
Before outputting, scan your code for:
- Any comment with words like "warm", "flowing", "nostalgic", "weeping", "gentle", "quiet", "grief" → DELETE IT
- Any pattern with "~ ~ ~" (3+ consecutive rests) → REWRITE IT
- Any pattern that repeats the same phrase twice → REWRITE IT
- Any pattern with more than 50% rests → REWRITE IT
`;