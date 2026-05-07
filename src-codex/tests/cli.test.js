import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const APP_DIR = join(import.meta.dir, "..");
const LEVELS_DIR = join(APP_DIR, "levels");

function readLevel(name) {
  return readFileSync(join(LEVELS_DIR, name), "utf8");
}

function solvedMoves(name) {
  const moves = [];
  const rows = readLevel(name).trimEnd().split("\n");
  for (let row = 0; row < rows.length; row += 1) {
    for (let col = 0; col < rows[row].length; col += 1) {
      if (rows[row][col] === "#") {
        moves.push(`r${row + 1}c${col + 1}`);
      }
    }
  }
  return moves.join(" ");
}

function runCli(args = [], input = "") {
  return spawnSync("bun", ["ponypen-cli.js", ...args], {
    cwd: APP_DIR,
    input,
    encoding: "utf8",
  });
}

describe("CLI", () => {
  test("prints usage for empty, -h, and --help", () => {
    const usage = [
      'USAGE: ./ponypen-cli.js levelFile ["rock1 rock2 ..."]',
      "Rock placements are set in R1C1 format. After all rocks are set the solution is scored.",
      "If no rocks, game starts in the interactive mode.",
    ].join("\n");

    const empty = runCli();
    expect(empty.status).toBe(2);
    expect(empty.stdout.trim()).toBe(usage);

    const shortHelp = runCli(["-h"]);
    expect(shortHelp.status).toBe(0);
    expect(shortHelp.stdout.trim()).toBe(usage);

    const longHelp = runCli(["--help"]);
    expect(longHelp.status).toBe(0);
    expect(longHelp.stdout.trim()).toBe(usage);
  });

  test("scores solved levels and rejects invalid ones with consistent output", () => {
    const good = [
      ["levels/01-minimal-1.txt", "Score: 1\nPeak Pony Score!"],
      ["levels/02-cherry_apple-19.txt", "Score: 19\nPeak Pony Score!"],
      ["levels/03-bees_teleport-19.txt", "Score: 19\nPeak Pony Score!"],
      ["levels/04-large-253.txt", "Score: 253\nPeak Pony Score!"],
    ];

    for (const [level, ending] of good) {
      const result = runCli([level, solvedMoves(level.replace("levels/", ""))]);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(ending);
    }

    const bad = [
      ["levels/51-bad_no_rocks-0.txt", "ERROR: Level has no solution."],
      ["levels/52-bad_leak-1.txt", "ERROR: Pony is not enclosed by the solution."],
      ["levels/53-bad_extra_rocks-4.txt", "ERROR: Level has a suboptimal solution."],
    ];

    for (const [level, message] of bad) {
      const result = runCli([level]);
      expect(result.status).toBe(1);
      expect(result.stdout).toContain(message);
    }
  });

  test("renders aligned large-grid headers", () => {
    const result = runCli(["levels/04-large-253.txt"], "quit\n");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("                     1 1 1 1 1 1 1 1 1 1 2");
    expect(result.stdout).toContain(" \\ 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0");
    expect(result.stdout).toContain("\n 9 ");
    expect(result.stdout).toContain("\n10 ");
    expect(result.stdout).toContain("\n16 ");
  });

  test("supports a basic interactive transcript", () => {
    const result = runCli(["levels/02-cherry_apple-19.txt"], "help\nr1c1\nr1c2\nquit\n");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PonyPen CLI Interactive");
    expect(result.stdout).toContain("Type 'help' for commands.");
    expect(result.stdout).toContain("Invalid: rocks can only be placed on grass (.) tiles!");
    expect(result.stdout).toContain("Placed 1 out of 4 rocks. Score: 0");
    expect(result.stdout).toContain("quit         Quit game.");
  });
});
