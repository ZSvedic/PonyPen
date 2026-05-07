import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createGame } from "../ponypen-core.js";
import { BOARD_COLORS, LEVEL_FILES, createBoardViewModel, levelNameFromFile, tileView } from "../ponypen-web.js";

const APP_DIR = join(import.meta.dir, "..");

function readLocal(name) {
  return readFileSync(join(APP_DIR, name), "utf8");
}

function readLevel(name) {
  return readFileSync(join(APP_DIR, "levels", name), "utf8");
}

describe("web shell files", () => {
  test("html declares DOM controls and no canvas", () => {
    const html = readLocal("ponypen.html");

    expect(html).toContain('<select id="level-select"');
    expect(html).toContain('<button id="undo-button"');
    expect(html).toContain('<button id="redo-button"');
    expect(html).toContain('<button id="reset-button"');
    expect(html).toContain('<button id="help-button"');
    expect(html).not.toContain("<canvas");
  });

  test("css uses the mockup palette and grid layout", () => {
    const css = readLocal("ponypen.css");

    expect(css).toContain("--page-bg: #0F0F1E;");
    expect(css).toContain("--panel-bg: #1A1A2E;");
    expect(css).toContain("--tile-grass: #3FA84A;");
    expect(css).toContain("--tile-water: #1E4E8E;");
    expect(css).toContain("--tile-enclosed: #F1C40F;");
    expect(css).toContain("display: grid;");
  });
});

describe("web helpers", () => {
  test("level dropdown labels show only level names", () => {
    expect(LEVEL_FILES.map(levelNameFromFile)).toEqual([
      "minimal",
      "cherry_apple",
      "bees_teleport",
      "large",
      "bad_no_rocks",
      "bad_leak",
      "bad_extra_rocks",
    ]);
  });

  test("creates external row and column labels with no in-tile coordinates", () => {
    const game = createGame(readLevel("03-bees_teleport-19.txt"), {
      levelName: "bees_teleport",
      maxScore: 19,
    });
    const view = createBoardViewModel(game.state);

    expect(view.columnLabels).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(view.rowLabels).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(view.tiles.every((tile) => !/^\d+$/.test(tile.text))).toBe(true);
  });

  test("maps tiles to the required glyphs and colors", () => {
    expect(tileView(".", false)).toEqual({ text: "", background: BOARD_COLORS.green, kind: "grass" });
    expect(tileView("=", false)).toEqual({ text: "≈", background: BOARD_COLORS.blue, kind: "water" });
    expect(tileView("#", false)).toEqual({ text: "🪨", background: BOARD_COLORS.gray, kind: "rock" });
    expect(tileView("P", true)).toEqual({ text: "🐴", background: BOARD_COLORS.yellow, kind: "pony" });
    expect(tileView("@", true)).toEqual({ text: "🌀", background: BOARD_COLORS.yellow, kind: "portal" });
  });

  test("turns only enclosed passable tiles yellow after closure", () => {
    const game = createGame(readLevel("01-minimal-1.txt"), {
      levelName: "minimal",
      maxScore: 1,
    });
    game.toggleRock(2, 1);
    game.toggleRock(2, 3);
    game.toggleRock(3, 2);

    const view = createBoardViewModel(game.state);
    const byCoord = new Map(view.tiles.map((tile) => [`r${tile.row}c${tile.col}`, tile.background]));

    expect(byCoord.get("r1c1")).toBe(BOARD_COLORS.green);
    expect(byCoord.get("r1c2")).toBe(BOARD_COLORS.blue);
    expect(byCoord.get("r1c3")).toBe(BOARD_COLORS.blue);
    expect(byCoord.get("r2c1")).toBe(BOARD_COLORS.gray);
    expect(byCoord.get("r2c2")).toBe(BOARD_COLORS.yellow);
    expect(byCoord.get("r2c3")).toBe(BOARD_COLORS.gray);
    expect(byCoord.get("r3c1")).toBe(BOARD_COLORS.green);
    expect(byCoord.get("r3c2")).toBe(BOARD_COLORS.gray);
    expect(byCoord.get("r3c3")).toBe(BOARD_COLORS.green);
  });
});
