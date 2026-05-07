import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createGame } from "../ponypen-core.js";

const SPEC_LEVELS = join(import.meta.dir, "..", "..", "spec", "levels");

function readLevel(name) {
  return readFileSync(join(SPEC_LEVELS, name), "utf8");
}

describe("createGame", () => {
  test("parses solved levels into initial state", () => {
    const game = createGame(readLevel("01-minimal-1.txt"));

    expect(game.state.levelName).toBe("minimal");
    expect(game.state.width).toBe(3);
    expect(game.state.height).toBe(3);
    expect(game.state.maxRocks).toBe(3);
    expect(game.state.maxScore).toBe(1);
    expect(game.state.initialBoard.map((row) => row.join(""))).toEqual([
      ".==",
      ".P.",
      "...",
    ]);
    expect(game.state.currentBoard).toEqual(game.state.initialBoard);
    expect(game.state.enclosedMap).toEqual([
      [false, false, false],
      [false, false, false],
      [false, false, false],
    ]);
  });

  test("rejects levels with no solved rocks", () => {
    expect(() => createGame(readLevel("51-bad_no_rocks-0.txt"))).toThrow(
      "Level has no solution.",
    );
  });

  test("rejects levels whose solved board leaks", () => {
    expect(() => createGame(readLevel("52-bad_leak-1.txt"))).toThrow(
      "Pony is not enclosed by the solution.",
    );
  });

  test("rejects levels with dead-weight rocks", () => {
    expect(() => createGame(readLevel("53-bad_extra_rocks-4.txt"))).toThrow(
      "Level has a suboptimal solution.",
    );
  });

  test("enforces maximum board size", () => {
    const row = ".".repeat(31);
    const levelText = `${row}\n`.repeat(31);

    expect(() => createGame(levelText)).toThrow("Level exceeds max board size.");
  });
});

describe("headless actions", () => {
  test("toggles rocks, scores a peak solution, and emits events", () => {
    const game = createGame(readLevel("01-minimal-1.txt"));

    expect(game.toggleRock(2, 1)).toEqual({ type: "rock-added", row: 2, col: 1 });
    expect(game.toggleRock(2, 3)).toEqual({ type: "rock-added", row: 2, col: 3 });
    expect(game.toggleRock(3, 2)).toEqual({ type: "rock-added", row: 3, col: 2 });
    expect(game.score()).toEqual({
      type: "scored",
      score: 1,
      outcome: "Peak Pony Score!",
      message: "Score: 1\nPeak Pony Score!",
    });

    expect(game.state.currentBoard.map((row) => row.join(""))).toEqual([
      ".==",
      "#P#",
      ".#.",
    ]);
    expect(game.state.scoreResult).toEqual({
      score: 1,
      outcome: "Peak Pony Score!",
      message: "Score: 1\nPeak Pony Score!",
      enclosed: true,
      bonus: 0,
      enclosedTiles: 1,
    });
    expect(game.events.map((event) => event.type === "scored" ? "scored" : `${event.type} r${event.row}c${event.col}`)).toEqual([
      "rock-added r2c1",
      "rock-added r2c3",
      "rock-added r3c2",
      "scored",
    ]);
  });

  test("updates enclosedMap and reset", () => {
    const game = createGame(readLevel("02-cherry_apple-19.txt"));

    game.toggleRock(1, 2);
    game.toggleRock(3, 2);
    game.toggleRock(4, 3);
    game.toggleRock(2, 4);

    expect(game.state.enclosedMap).toEqual([
      [false, false, false, false, false],
      [false, true, true, false, false],
      [false, false, true, true, false],
      [false, false, false, false, false],
    ]);

    expect(game.reset()).toEqual({ type: "reset" });
    expect(game.state.enclosedMap).toEqual([
      [false, false, false, false, false],
      [false, false, false, false, false],
      [false, false, false, false, false],
      [false, false, false, false, false],
    ]);
  });

  test("scores enclosed pens with item bonuses and portal travel", () => {
    const cherryApple = createGame(readLevel("02-cherry_apple-19.txt"));
    cherryApple.toggleRock(1, 2);
    cherryApple.toggleRock(3, 2);
    cherryApple.toggleRock(4, 3);
    cherryApple.toggleRock(2, 4);

    expect(cherryApple.score()).toEqual({
      type: "scored",
      score: 17,
      outcome: "Enclosed? Yes. Optimal? Neigh.",
      message: "Score: 17\nEnclosed? Yes. Optimal? Neigh.",
    });
    expect(cherryApple.state.scoreResult.bonus).toBe(13);
    expect(cherryApple.state.scoreResult.enclosedTiles).toBe(4);

    const teleport = createGame(readLevel("03-bees_teleport-19.txt"));
    teleport.toggleRock(2, 3);
    teleport.toggleRock(3, 2);
    teleport.toggleRock(5, 1);
    teleport.toggleRock(5, 6);

    expect(teleport.score()).toEqual({
      type: "scored",
      score: 18,
      outcome: "Enclosed? Yes. Optimal? Neigh.",
      message: "Score: 18\nEnclosed? Yes. Optimal? Neigh.",
    });
    expect(teleport.state.scoreResult.bonus).toBe(10);
    expect(teleport.state.scoreResult.enclosedTiles).toBe(8);
  });

  test("returns error events for invalid moves and exhausted rocks", () => {
    const game = createGame(readLevel("01-minimal-1.txt"));

    expect(game.toggleRock(1, 2)).toEqual({
      type: "error",
      message: "Invalid: rocks can only be placed on grass (.) tiles!",
    });
    game.toggleRock(1, 1);
    game.toggleRock(2, 1);
    game.toggleRock(2, 3);
    expect(game.toggleRock(3, 1)).toEqual({
      type: "error",
      message: "Invalid: no rocks remaining!",
    });
  });
});
