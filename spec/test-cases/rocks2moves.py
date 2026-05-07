#!/usr/bin/env python3
import sys

def rock_positions(level_file):
    return [
        f"r{r}c{c+1}"
        for r, line in enumerate(open(level_file), 1)
        for c, ch in enumerate(line)
        if ch == "#"
    ]

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: rocks.py LEVEL")
        
    print(" ".join(rock_positions(sys.argv[1])))
