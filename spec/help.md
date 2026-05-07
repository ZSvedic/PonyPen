# PonyPen Game Rules
The goal is to enclose our pony (`P`) in a pen with the largest number of grass tiles (`.`) possible.
If not enclosed properly, the pony will escape from our land (grid), which would be a ponypocalypse!

The pony can:
- move up/down/left/right, but not diagonally;
- move over grass, but not over water (`=`) or rocks (`#`);
- escape if it reaches the edge of the grid;
- pick cherries (`C`, +3 bonus) or apples (`A`, +10 bonus);
- be stung by bees (`B`, -5 penalty); and
- teleport (yes, it is a telepony!) via portals (`@`).

Build a pen around the pony by placing rocks on the grass.
Each tile enclosed by water and rocks is +1 point.
Score counts each reachable enclosed passable tile, including the pony and item tiles, plus item bonuses and penalties.
Unfortunately, rocks became quite expensive after Chinese import tariffs.
Therefore, each level has a limited number of rocks that can be used.
