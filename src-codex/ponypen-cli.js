#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout, stderr, exit } from "node:process";

import { createGame } from "./ponypen-core.js";

const USAGE_LINES = [
  'USAGE: ./ponypen-cli.js levelFile ["rock1 rock2 ..."]',
  "Rock placements are set in R1C1 format. After all rocks are set the solution is scored.",
  "If no rocks, game starts in the interactive mode.",
];

const HELP_TEXT = [
  " rXcY         Toggle rock at row X, col Y.",
  " reset        Reset board to initial state.",
  " load {LEVEL} Loads LEVEL file.",
  " help         Show this help.",
  " quit         Quit game.",
];

if (import.meta.main) {
  const code = await main(Bun.argv.slice(2));
  exit(code);
}

export async function main(args) {
  if (args.length === 0) {
    stdout.write(`${USAGE_LINES.join("\n")}\n`);
    return 2;
  }

  if (args[0] === "-h" || args[0] === "--help") {
    stdout.write(`${USAGE_LINES.join("\n")}\n`);
    return 0;
  }

  const [levelPath, movesArg] = args;
  const levelText = readFileSync(levelPath, "utf8");

  if (movesArg) {
    return runBatch(levelPath, levelText, movesArg);
  }

  return runInteractive(levelPath, levelText);
}

function runBatch(levelPath, levelText, movesArg) {
  let game;
  try {
    game = createGame(levelText, parseLevelMetadata(levelPath));
  } catch (error) {
    stdout.write(`${renderBoard(parseTextBoard(levelText))}\n`);
    stdout.write(`ERROR: ${error.message}\n`);
    return 1;
  }

  for (const move of parseMoves(movesArg)) {
    const event = game.toggleRock(move.row, move.col);
    if (event.type === "error") {
      stdout.write(`${renderBoard(game.state.currentBoard)}\n`);
      stdout.write(`${event.message}\n`);
      return 1;
    }
  }

  const scored = game.score();
  stdout.write(`${renderBoard(game.state.currentBoard)}\n`);
  stdout.write(`${scored.message}\n`);
  return 0;
}

async function runInteractive(levelPath, levelText) {
  let session;
  try {
    session = loadSession(levelPath, levelText);
  } catch (error) {
    stdout.write(`${renderBoard(parseTextBoard(levelText))}\n`);
    stdout.write(`ERROR: ${error.message}\n`);
    return 1;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  stdout.write("PonyPen CLI Interactive\n");
  stdout.write("Type 'help' for commands.\n");
  stdout.write(`Level name: ${session.game.state.levelName} (${session.game.state.height}x${session.game.state.width})\n\n`);

  try {
    renderInteractiveState(session.game);
    stdout.write("Your move: ");

    for await (const rawLine of rl) {
      const line = rawLine.trim();
      stdout.write(`${line}\n\n`);

      if (line === "") {
        renderInteractiveState(session.game);
        stdout.write("Your move: ");
        continue;
      }
      if (line === "quit") {
        break;
      }
      if (line === "help") {
        stdout.write(`${HELP_TEXT.join("\n")}\n\n`);
        renderInteractiveState(session.game);
        stdout.write("Your move: ");
        continue;
      }
      if (line === "reset") {
        session.game.reset();
        renderInteractiveState(session.game);
        stdout.write("Your move: ");
        continue;
      }
      if (line.startsWith("load ")) {
        const nextPath = line.slice(5).trim();
        try {
          const nextText = readFileSync(nextPath, "utf8");
          session = loadSession(nextPath, nextText);
          stdout.write(`Level name: ${session.game.state.levelName} (${session.game.state.height}x${session.game.state.width})\n\n`);
        } catch (error) {
          stdout.write(`ERROR: ${error.message}\n\n`);
        }
        renderInteractiveState(session.game);
        stdout.write("Your move: ");
        continue;
      }

      const move = parseMove(line);
      if (!move) {
        stdout.write("Invalid: expected command or rock position like r2c3.\n\n");
        renderInteractiveState(session.game);
        stdout.write("Your move: ");
        continue;
      }

      const event = session.game.toggleRock(move.row, move.col);
      if (event.type === "error") {
        stdout.write(`${event.message}\n\n`);
      }
      renderInteractiveState(session.game);
      stdout.write("Your move: ");
    }
  } finally {
    rl.close();
  }

  return 0;
}

function loadSession(levelPath, levelText) {
  return {
    levelPath,
    game: createGame(levelText, parseLevelMetadata(levelPath)),
  };
}

function renderInteractiveState(game) {
  stdout.write(`${renderBoard(game.state.currentBoard)}\n\n`);
  stdout.write(`${renderStatusLine(game.state)}\n`);
}

function renderStatusLine(state) {
  let line = `Placed ${state.placedRocks} out of ${state.maxRocks} rocks.`;
  if (state.scoreResult) {
    line += ` Score: ${state.scoreResult.score} - ${toInlineOutcome(state.scoreResult.outcome)}`;
  }
  return line;
}

function toInlineOutcome(outcome) {
  if (outcome === "Enclosed? Yes. Optimal? Neigh.") {
    return "Optimal? Neigh.";
  }
  return outcome;
}

export function renderBoard(board) {
  const height = board.length;
  const width = board[0].length;
  const lines = [];

  if (width >= 10) {
    const tens = [];
    for (let col = 1; col <= width; col += 1) {
      const digit = col >= 10 ? Math.floor(col / 10) % 10 : " ";
      tens.push(` ${digit}`);
    }
    lines.push(`  ${tens.join("")}`.trimEnd());
  }

  const units = [];
  for (let col = 1; col <= width; col += 1) {
    units.push(` ${col % 10}`);
  }
  lines.push(` \\${units.join("")}`);

  for (let row = 0; row < height; row += 1) {
    lines.push(`${String(row + 1).padStart(2, " ")} ${board[row].join(" ")}`);
  }

  return lines.join("\n");
}

function parseMoves(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const move = parseMove(token);
      if (!move) {
        throw new Error(`Invalid move: ${token}`);
      }
      return move;
    });
}

function parseMove(text) {
  const match = /^r(\d+)c(\d+)$/i.exec(text);
  if (!match) {
    return null;
  }
  return {
    row: Number(match[1]),
    col: Number(match[2]),
  };
}

function parseTextBoard(levelText) {
  return levelText.replace(/\r\n/g, "\n").trimEnd().split("\n").map((row) => row.split(""));
}

function parseLevelMetadata(levelPath) {
  const name = basename(levelPath, ".txt");
  const match = /^\d+-([^-]+)-(\d+)$/.exec(name);
  if (!match) {
    return {};
  }
  return {
    levelName: match[1],
    maxScore: Number(match[2]),
  };
}
