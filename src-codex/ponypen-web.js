import { createGame } from "./ponypen-core.js";

export const LEVEL_FILES = [
  "01-minimal-1.txt",
  "02-cherry_apple-19.txt",
  "03-bees_teleport-19.txt",
  "04-large-253.txt",
  "51-bad_no_rocks-0.txt",
  "52-bad_leak-1.txt",
  "53-bad_extra_rocks-4.txt",
];

export const BOARD_COLORS = {
  green: "#3FA84A",
  blue: "#1E4E8E",
  gray: "#5F6872",
  yellow: "#F1C40F",
};

const HELP_TEXT = [
  "Build a pen around the pony with rocks.",
  "Reachable enclosed tiles score +1 each.",
  "Cherries add +3, apples add +10, bees subtract 5.",
  "The pony can escape through any edge tile and can teleport via portals.",
].join("\n");

export function levelNameFromFile(fileName) {
  const match = /^\d+-([^-]+)-\d+\.txt$/.exec(fileName);
  return match ? match[1] : fileName.replace(/\.txt$/, "");
}

export function tileView(tile, enclosed) {
  const passableBackground = enclosed ? BOARD_COLORS.yellow : BOARD_COLORS.green;
  switch (tile) {
    case ".":
      return { text: "", background: BOARD_COLORS.green, kind: "grass" };
    case "=":
      return { text: "≈", background: BOARD_COLORS.blue, kind: "water" };
    case "#":
      return { text: "🪨", background: BOARD_COLORS.gray, kind: "rock" };
    case "P":
      return { text: "🐴", background: passableBackground, kind: "pony" };
    case "C":
      return { text: "🍒", background: passableBackground, kind: "cherry" };
    case "A":
      return { text: "🍎", background: passableBackground, kind: "apple" };
    case "B":
      return { text: "🐝", background: passableBackground, kind: "bee" };
    case "@":
      return { text: "🌀", background: passableBackground, kind: "portal" };
    default:
      return { text: tile, background: BOARD_COLORS.green, kind: "unknown" };
  }
}

export function createBoardViewModel(state) {
  const rowLabels = Array.from({ length: state.height }, (_, index) => String(index + 1));
  const columnLabels = Array.from({ length: state.width }, (_, index) => String(index + 1));
  const tiles = [];

  for (let row = 0; row < state.height; row += 1) {
    for (let col = 0; col < state.width; col += 1) {
      const view = tileView(state.currentBoard[row][col], state.enclosedMap[row][col]);
      tiles.push({
        row: row + 1,
        col: col + 1,
        text: view.text,
        background: view.background,
        kind: view.kind,
        enclosed: state.enclosedMap[row][col],
      });
    }
  }

  return { rowLabels, columnLabels, tiles };
}

export async function bootstrapWebShell(doc = globalThis.document) {
  if (!doc) {
    return;
  }

  const levelSelect = doc.getElementById("level-select");
  const levelTitle = doc.getElementById("level-title");
  const tilesValue = doc.getElementById("tiles-value");
  const bonusValue = doc.getElementById("bonus-value");
  const scoreValue = doc.getElementById("score-value");
  const bestValue = doc.getElementById("best-value");
  const rocksValue = doc.getElementById("rocks-value");
  const rocksSlots = doc.getElementById("rocks-slots");
  const messageValue = doc.getElementById("message-value");
  const errorValue = doc.getElementById("error-value");
  const rowLabels = doc.getElementById("row-labels");
  const colLabels = doc.getElementById("col-labels");
  const grid = doc.getElementById("board-grid");
  const undoButton = doc.getElementById("undo-button");
  const redoButton = doc.getElementById("redo-button");
  const resetButton = doc.getElementById("reset-button");
  const helpButton = doc.getElementById("help-button");

  if (!levelSelect || !levelTitle || !tilesValue || !bonusValue || !scoreValue || !bestValue || !rocksValue || !rocksSlots || !messageValue || !errorValue || !rowLabels || !colLabels || !grid || !undoButton || !redoButton || !resetButton || !helpButton) {
    return;
  }

  for (const file of LEVEL_FILES) {
    const option = doc.createElement("option");
    option.value = file;
    option.textContent = levelNameFromFile(file);
    levelSelect.append(option);
  }

  let currentFile = pickInitialLevel();
  let game = null;
  let undoStack = [];
  let redoStack = [];

  levelSelect.value = currentFile;
  await loadLevel(currentFile);

  levelSelect.addEventListener("change", async () => {
    currentFile = levelSelect.value;
    await loadLevel(currentFile);
  });

  undoButton.addEventListener("click", () => {
    const move = undoStack.pop();
    if (!game || !move) {
      return;
    }
    game.toggleRock(move.row, move.col);
    redoStack.push(move);
    render();
  });

  redoButton.addEventListener("click", () => {
    const move = redoStack.pop();
    if (!game || !move) {
      return;
    }
    const event = game.toggleRock(move.row, move.col);
    if (event.type !== "error") {
      undoStack.push(move);
    }
    render();
  });

  resetButton.addEventListener("click", () => {
    if (!game) {
      return;
    }
    game.reset();
    undoStack = [];
    redoStack = [];
    render();
  });

  helpButton.addEventListener("click", () => {
    globalThis.alert?.(HELP_TEXT);
  });

  async function loadLevel(file) {
    errorValue.textContent = "";
    undoStack = [];
    redoStack = [];
    try {
      const response = await fetch(`levels/${file}`);
      if (!response.ok) {
        throw new Error(`Unable to load ${file}.`);
      }
      const levelText = await response.text();
      game = createGame(levelText, parseLevelMetadata(file));
      currentFile = file;
      levelSelect.value = file;
      errorValue.textContent = "";
    } catch (error) {
      game = null;
      errorValue.textContent = error.message;
    }
    render();
  }

  function render() {
    if (!game) {
      levelTitle.textContent = levelNameFromFile(currentFile);
      tilesValue.textContent = "0";
      bonusValue.textContent = "0";
      scoreValue.textContent = "0";
      bestValue.textContent = parseLevelMetadata(currentFile).maxScore?.toString() ?? "0";
      rocksValue.textContent = "0/0";
      rocksSlots.textContent = "";
      messageValue.textContent = "Invalid level";
      rowLabels.textContent = "";
      colLabels.textContent = "";
      grid.textContent = "";
      undoButton.disabled = true;
      redoButton.disabled = true;
      resetButton.disabled = true;
      return;
    }

    const view = createBoardViewModel(game.state);
    levelTitle.textContent = levelNameFromFile(currentFile);
    tilesValue.textContent = String(game.state.scoreResult.enclosedTiles);
    bonusValue.textContent = String(game.state.scoreResult.bonus);
    scoreValue.textContent = String(game.state.scoreResult.score);
    bestValue.textContent = String(game.state.maxScore);
    rocksValue.textContent = `${game.state.placedRocks}/${game.state.maxRocks}`;
    rocksSlots.textContent = `${"▣ ".repeat(game.state.placedRocks)}${"□ ".repeat(game.state.maxRocks - game.state.placedRocks)}`.trim();
    messageValue.textContent = game.state.scoreResult.outcome;
    rowLabels.textContent = "";
    colLabels.textContent = "";
    grid.textContent = "";
    grid.style.gridTemplateColumns = `repeat(${game.state.width}, var(--tile-size))`;

    for (const label of view.columnLabels) {
      const el = doc.createElement("div");
      el.className = "coord-label";
      el.textContent = label;
      colLabels.append(el);
    }

    for (const label of view.rowLabels) {
      const el = doc.createElement("div");
      el.className = "coord-label";
      el.textContent = label;
      rowLabels.append(el);
    }

    for (const tile of view.tiles) {
      const button = doc.createElement("button");
      button.className = `tile tile-${tile.kind}`;
      button.type = "button";
      button.style.background = tile.background;
      button.dataset.row = String(tile.row);
      button.dataset.col = String(tile.col);
      button.dataset.enclosed = tile.enclosed ? "true" : "false";
      button.setAttribute("aria-label", `row ${tile.row} col ${tile.col}`);
      button.textContent = tile.text;
      button.addEventListener("click", () => {
        const event = game.toggleRock(tile.row, tile.col);
        if (event.type !== "error") {
          undoStack.push({ row: tile.row, col: tile.col });
          redoStack = [];
          errorValue.textContent = "";
        } else {
          errorValue.textContent = event.message;
        }
        render();
      });
      grid.append(button);
    }

    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
    resetButton.disabled = false;
  }
}

function parseLevelMetadata(fileName) {
  const match = /^\d+-([^-]+)-(\d+)\.txt$/.exec(fileName);
  return match
    ? { levelName: match[1], maxScore: Number(match[2]) }
    : { levelName: fileName.replace(/\.txt$/, "") };
}

function pickInitialLevel() {
  if (!globalThis.location) {
    return LEVEL_FILES[0];
  }
  const params = new URLSearchParams(globalThis.location.search);
  const requested = params.get("level")?.replace(/^levels\//, "");
  return LEVEL_FILES.includes(requested) ? requested : LEVEL_FILES[0];
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    bootstrapWebShell(document);
  });
}
