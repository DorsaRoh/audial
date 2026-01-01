# strangerthings

## brief structural analysis

- **groove**: slow, atmospheric, filter-driven
- **bass role**: absent (lead-driven)
- **motif**: melodic pattern in supersaw, filter modulation creates variation
- **form/arc**: single section, filter modulation creates arc

## what makes this work

- **filter modulation**: `.lpf(perlin.slow(2).range(100, 2000))` creates timbral variation
- **lpenv modulation**: `.lpenv(perlin.slow(3).range(1, 4))` creates expression
- **melodic pattern**: pattern repeats, filter creates interest
- **minimal texture**: single layer creates focus

## what would break it

- removing filter modulation would sound static
- making pattern too complex would lose focus
- adding more layers would lose minimalism

## extracted reusable idea(s)

- **filter modulation**: using perlin/sine to modulate filters creates movement
- **minimal texture**: single layer with modulation creates interest

## recommended strategies

- **primary**: filter_sweep_effects (filter modulation creates movement)
- **secondary**: minimalist_pattern (sparse, repeating pattern)

## justification

this song is a clear example of filter_sweep_effects: filter modulation creates all the movement and interest. minimalist_pattern provides the foundation (sparse, repeating pattern). the combination creates an atmospheric, evolving texture.

