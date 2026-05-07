# PonyPen CLI Shell

The CLI uses only ASCII output and delegates rules, actions, validation, and scoring to the headless core.

## Board layout

- Each printed row is `{label}{space}{cells}` where `label` is the row number right-aligned in 2 chars (` 1`, ` 9`, `10`, `30`) and `cells` is the row's tiles joined by single spaces (no trailing whitespace).
- The units column-header row begins with the 2-char prefix ` \` followed by ` X` per column where `X` is the column number's units digit. So column `c` sits at character position `2c+1` (0-based).
- For boards with width >= 10, a tens-row precedes the units row. Its prefix is `  ` (2 spaces) and each column contributes ` X` where `X` is the tens digit (or a space when the column number is below 10). The tens digit aligns vertically with the same column's units digit. No trailing whitespace.
- Boards with width <= 9 use only the units header row.

## Outcome strings

Final outcome lines after a scored solution are exactly:

- `Peak Pony Score!` — score equals the level's `maxScore`.
- `Enclosed? Yes. Optimal? Neigh.` — pony is enclosed but score is below `maxScore`.
- `Esca-pony!` — pony can escape (score 0).

The interactive shell collapses the result into a single status line `Placed N out of M rocks.` optionally followed by ` Score: X — {outcome}` where `{outcome}` is one of `Peak Pony Score!`, `Esca-pony!`, or `Optimal? Neigh.`.

## Example CLI

```console
> ./ponypen-cli.js
USAGE: ./ponypen-cli.js levelFile ["rock1 rock2 ..."]
Rock placements are set in R1C1 format. After all rocks are set the solution is scored.
If no rocks, game starts in the interactive mode.
> ./ponypen-cli.js levels/01-minimal-1.txt "r2c1 r2c3 r3c2"
 \ 1 2 3
 1 . = =
 2 # P #
 3 . # .
Score: 1
Peak Pony Score!
> ./ponypen-cli.js levels/51-bad_no_rocks-0.txt
 \ 1 2 3
 1 P . .
 2 . . .
ERROR: Level has no solution.
> ./ponypen-cli.js levels/02-cherry_apple-19.txt
PonyPen CLI Interactive
Type 'help' for commands.
Level name: cherry_apple (4x5)

 \ 1 2 3 4 5 
 1 = . = = .
 2 = P . . .
 3 . . C A =
 4 . = . = .
 
Placed 0 out of 4 rocks.
Your move: help

 rXcY         Toggle rock at row X, col Y.
 reset        Reset board to initial state.
 load {LEVEL} Loads LEVEL file.
 help         Show this help.
 quit         Quit game.

Your move: r1c1
Invalid: rocks can only be placed on grass (.) tiles!

 \ 1 2 3 4 5 
 1 = . = = .
 2 = P . . .
 3 . . C A =
 4 . = . = .
 
Placed 0 out of 4 rocks.
Your move: r1c2

 \ 1 2 3 4 5 
 1 = # = = .
 2 = P . . .
 3 . . C A =
 4 . = . = .
 
Placed 1 out of 4 rocks. Score: 0 — Esca-pony!

Your move: load level/04-large-250.txt
Level name: large (16x20)
         ...   1 1 ...
 \ 1 2 3 ... 9 0 1 ...
 1 = = . ... = = = ...
 2 = . . ... . . . ...
...
15 = . . ... . . . ...
16 = = . ... . = = ...

Your move: quit
>
```
