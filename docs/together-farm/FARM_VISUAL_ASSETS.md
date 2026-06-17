# Farm visual asset contract

Phase 1 intentionally contains no temporary artwork. Do not replace these files
with CSS drawings, SVG sketches, emoji, pixel tiles, or unrelated placeholders.

All asset paths below are relative to `public/assets/game/`.

Required background:

- `backgrounds/farm-mobile.webp` — 860x1520 complete farm illustration

Required land:

- `plots/plot-empty.webp`
- `plots/plot-growing.webp`
- `plots/plot-mature.webp`
- `plots/plot-withered.webp`
- `plots/plot-selected.webp`

Required crop folders:

- `crops/carrot/`
- `crops/wheat/`
- `crops/tomato/`
- `crops/strawberry/`
- `crops/starflower/`

Each crop folder needs:

- `seedling.webp`
- `growing.webp`
- `mature.webp`
- `withered.webp`
- `seed-bag.webp`

Required pets:

- `pets/dog-idle.webp`
- `pets/dog-idle-sprite.png` — 1536x1024, 2 rows x 4 columns, 8-frame idle loop
- `pets/dog-idle-video-sprite.png` — 2304x2048, 6 columns x 4 rows, extracted from video with a fixed crop and bottom baseline
- `pets/cat-idle.webp`
- `pets/rabbit-idle.webp`
- `pets/fairy-idle.webp`

Required HUD:

- `ui/hud/coin-bar.webp`
- `ui/hud/love-bar.webp`
- `ui/hud/love-bond-sign.webp`
- `ui/hud/farm-sign.webp`
- `ui/buttons/invite.webp`
- `ui/buttons/shop.webp`
- `ui/buttons/messages.webp`
- `ui/buttons/logout.webp`

Required plot dialog:

- `ui/panels/plot-actions.webp`
- `ui/panels/seed-card.webp`
- `ui/buttons/water.webp`
- `ui/buttons/harvest.webp`
- `ui/buttons/clear.webp`
- `ui/buttons/close.webp`

After adding reviewed production artwork, set the corresponding `available`
flags to `true` in `lib/visual-layout.ts`.
