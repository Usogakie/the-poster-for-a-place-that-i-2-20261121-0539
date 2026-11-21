# AURELIA — The City Above the Clouds

[![make.fun · the-poster-for-a-place-that-i-2-20261121-0539](https://make.fun/badge/the-poster-for-a-place-that-i-2-20261121-0539.svg)](https://make.fun/bounty/the-poster-for-a-place-that-i-2-20261121-0539?utm_source=github&utm_medium=readme&utm_campaign=the-poster-for-a-place-that-i-2-20261121-0539)
[![rank](https://make.fun/badge/the-poster-for-a-place-that-i-2-20261121-0539/Usogakie/the-poster-for-a-place-that-i-2-20261121-0539/rank.svg)](https://make.fun/bounty/the-poster-for-a-place-that-i-2-20261121-0539/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=the-poster-for-a-place-that-i-2-20261121-0539)
[![reward](https://make.fun/badge/the-poster-for-a-place-that-i-2-20261121-0539/Usogakie/the-poster-for-a-place-that-i-2-20261121-0539/reward.svg)](https://make.fun/bounty/the-poster-for-a-place-that-i-2-20261121-0539?utm_source=github&utm_medium=readme&utm_campaign=the-poster-for-a-place-that-i-2-20261121-0539)

A vintage travel poster for a place that isn't there: **Aurelia**, a city of
terracotta towers and golden domes floating on islands above a sea of clouds,
reached only by balloon. Est. 1897.

The poster is drawn entirely in code — sunset sky, golden sun, drifting
balloon, three floating islands with waterfalls spilling into the clouds
below, and a deep-teal title panel reading AURELIA / THE CITY ABOVE THE
CLOUDS. No network, no external assets, no packages: a small rasterizer and
a hand-written 5×7 bitmap font in `main.ts`, with a hand-written PNG
encoder on top of Node's built-in `zlib`.

## Run it

```sh
node main.ts
```

This writes the 1024×1024 poster to `/output/entry.png` (and a copy to
`entry.png` next to `main.ts`). Running it twice produces byte-identical
output — the render is fully deterministic.
