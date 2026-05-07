# PonyPen Web Shell

The web shell renders the board with a plain HTML/CSS grid (e.g. `display: grid`) and delegates rules, actions, validation, and scoring to the headless core. Tile glyphs and chrome must look crisp on high-DPI screens — use real DOM text nodes, not a `<canvas>`.

## 2D grid

- Render the board as an HTML/CSS grid of square tiles. Each tile is a DOM element styled by tile type and by `enclosedMap[r][c]`.
- Use a fixed logical tile size; the grid must not blur, anti-alias, or upscale tile content.
- Tile background semantics:
  - grass `.`, pony `P`, cherry `C`, apple `A`, bee `B`, portal `@`: green; yellow if `enclosedMap[r][c]` is true.
  - water `=`: blue with a white `≈` glyph centered to imitate waves.
  - rock `#`: gray.
- When the pony is enclosed, every enclosed passable tile turns yellow immediately after the rock toggle that causes enclosure. Only tiles marked true in `enclosedMap` turn yellow. Water and rock tiles never turn yellow.
- Tile text:
  - `.`: empty
  - `=`: `≈` (white, centered)
  - `#`: `🪨`
  - `P`: `🐴`
  - `C`: `🍒`
  - `A`: `🍎`
  - `B`: `🐝`
  - `@`: `🌀`
- Center tile text with CSS; do not render row/column numbers inside tiles.
- Show row numbers to the left of the grid and column numbers above it as DOM text nodes outside the tile grid.

The exact palette (text colors, panel chrome, tile colors) is defined in [web-mockup-claude.txt](web-mockup-claude.txt) and is the single source of truth for color values.

## Controls

- Provide buttons for undo, redo, reset, and help actions.
- Center the page content horizontally.
- Loaded level should be a dropdown with all levels in [levels/](levels/) dir; each option shows only the level name (no size, no best score).
- Show labels for placed rock count, bonus, current score/result (updated after every rock toggle), and best score.
