# Tiny Ranch local asset setup

The pixel migration uses **[8x8] Tiny Ranch Asset Pack** by Gustavo Vituri:

https://gvituri.itch.io/tiny-ranch

The author permits personal and commercial use and modification, but explicitly
forbids redistributing the asset pack. For that reason, the source sheets and
generated runtime images are excluded from Git.

Place these files in `public/assets/tiny-ranch/source/`:

- `TinyFarm_Animals.png`
- `TinyFarm_Characters.png`
- `TinyFarm_Crops.png`
- `TinyFarm_Items.png`
- `TinyFarm_MapDecorations.png`
- `TinyFarm_Structures.png`
- `TinyFarm_Tiles.png`

Then run:

```bash
npm run assets:generate
```

Credit is optional, but appreciated: **Gustavo Vituri**.
