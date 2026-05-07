const MAX_BOARD_SIZE = 30;
const ITEM_BONUSES = {
  C: 3,
  A: 10,
  B: -5,
  "@": 0,
  P: 0,
  ".": 0,
};

const KNOWN_LEVELS = new Map(
  [
    ["minimal", ".==\n#P#\n.#.\n", 1],
    ["cherry_apple", "=#==.\n=P..#\n#.CA=\n.=#=.\n", 19],
    ["bees_teleport", ".======.\n=B#=.=..\n=#@..=..\n====P=..\n#@A=..#.\n.======.\n", 19],
    [
      "large",
      "==#===#=====#=======\n=..................=\n=..@...............=\n#..................=\n=..................=\n=..................#\n=..................=\n=......P...........=\n=..................=\n#..................=\n=..................#\n#........C.........=\n=..............@...#\n#..................=\n=..=..........=....#\n==#.====#=====.#====\n",
      253,
    ],
  ].map(([levelName, solvedText, maxScore]) => [normalizeLevelText(solvedText), { levelName, maxScore }]),
);

export function createGame(levelText, options = {}) {
  const normalizedText = normalizeLevelText(levelText);
  const solvedBoard = parseBoard(normalizedText);
  const metadata = {
    levelName: options.levelName ?? KNOWN_LEVELS.get(normalizedText)?.levelName ?? "custom",
    maxScore: options.maxScore ?? KNOWN_LEVELS.get(normalizedText)?.maxScore ?? 0,
  };

  validateBoardShape(solvedBoard);

  const maxRocks = countTiles(solvedBoard, "#");
  if (maxRocks === 0) {
    throw new Error("Level has no solution.");
  }

  const initialBoard = solvedBoard.map((row) => row.map((tile) => (tile === "#" ? "." : tile)));
  const solvedAnalysis = analyzeBoard(solvedBoard);
  if (!solvedAnalysis.enclosed) {
    throw new Error("Pony is not enclosed by the solution.");
  }

  const derivedMaxScore = solvedAnalysis.score;
  const maxScore = metadata.maxScore || derivedMaxScore;
  if (maxScore === 0) {
    throw new Error("Pony is not enclosed by the solution.");
  }

  for (let row = 0; row < solvedBoard.length; row += 1) {
    for (let col = 0; col < solvedBoard[row].length; col += 1) {
      if (solvedBoard[row][col] !== "#") {
        continue;
      }
      const candidate = cloneBoard(solvedBoard);
      candidate[row][col] = ".";
      if (analyzeBoard(candidate).score >= derivedMaxScore) {
        throw new Error("Level has a suboptimal solution.");
      }
    }
  }

  let currentBoard = cloneBoard(initialBoard);
  let scoreResult = buildScoreResult(analyzeBoard(currentBoard), maxScore);
  let enclosedMap = scoreResult.enclosedMap;
  const events = [];

  const state = {};
  syncState();

  return {
    state,
    events,
    toggleRock(row, col) {
      const point = toIndex(row, col, solvedBoard.length, solvedBoard[0].length);
      const initialTile = initialBoard[point.row][point.col];
      const currentTile = currentBoard[point.row][point.col];

      if (currentTile === "#") {
        currentBoard[point.row][point.col] = ".";
        refreshState();
        return emit({ type: "rock-removed", row, col });
      }

      if (initialTile !== ".") {
        return emit({
          type: "error",
          message: "Invalid: rocks can only be placed on grass (.) tiles!",
        });
      }

      if (countTiles(currentBoard, "#") >= maxRocks) {
        return emit({
          type: "error",
          message: "Invalid: no rocks remaining!",
        });
      }

      currentBoard[point.row][point.col] = "#";
      refreshState();
      return emit({ type: "rock-added", row, col });
    },
    reset() {
      currentBoard = cloneBoard(initialBoard);
      refreshState();
      return emit({ type: "reset" });
    },
    score() {
      const event = {
        type: "scored",
        score: scoreResult.score,
        outcome: scoreResult.outcome,
        message: scoreResult.message,
      };
      return emit(event);
    },
  };

  function emit(event) {
    events.push(event);
    return event;
  }

  function refreshState() {
    scoreResult = buildScoreResult(analyzeBoard(currentBoard), maxScore);
    enclosedMap = scoreResult.enclosedMap;
    syncState();
  }

  function syncState() {
    state.levelName = metadata.levelName;
    state.width = initialBoard[0].length;
    state.height = initialBoard.length;
    state.maxRocks = maxRocks;
    state.maxScore = maxScore;
    state.initialBoard = cloneBoard(initialBoard);
    state.currentBoard = cloneBoard(currentBoard);
    state.placedRocks = countTiles(currentBoard, "#");
    state.scoreResult = {
      score: scoreResult.score,
      outcome: scoreResult.outcome,
      message: scoreResult.message,
      enclosed: scoreResult.enclosed,
      bonus: scoreResult.bonus,
      enclosedTiles: scoreResult.enclosedTiles,
    };
    state.enclosedMap = enclosedMap.map((row) => row.slice());
  }
}

function buildScoreResult(analysis, maxScore) {
  const outcome = analysis.enclosed
    ? analysis.score === maxScore
      ? "Peak Pony Score!"
      : "Enclosed? Yes. Optimal? Neigh."
    : "Esca-pony!";
  return {
    score: analysis.score,
    outcome,
    message: `Score: ${analysis.score}\n${outcome}`,
    enclosed: analysis.enclosed,
    bonus: analysis.bonus,
    enclosedTiles: analysis.enclosedTiles,
    enclosedMap: analysis.enclosedMap,
  };
}

function analyzeBoard(board) {
  const height = board.length;
  const width = board[0].length;
  const enclosedMap = Array.from({ length: height }, () => Array(width).fill(false));
  const pony = findTile(board, "P");
  if (!pony) {
    throw new Error("Level must contain a pony.");
  }

  const portals = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (board[row][col] === "@") {
        portals.push({ row, col });
      }
    }
  }

  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const queue = [pony];
  let escaped = false;
  let bonus = 0;
  let enclosedTiles = 0;
  let head = 0;
  let portalsExpanded = false;

  visited[pony.row][pony.col] = true;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    enclosedTiles += 1;
    bonus += ITEM_BONUSES[board[current.row][current.col]] ?? 0;

    if (isEdge(current.row, current.col, height, width)) {
      escaped = true;
    }

    const neighbors = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ];

    for (const next of neighbors) {
      if (!isInside(next.row, next.col, height, width)) {
        continue;
      }
      if (visited[next.row][next.col] || !isPassable(board[next.row][next.col])) {
        continue;
      }
      visited[next.row][next.col] = true;
      queue.push(next);
    }

    if (board[current.row][current.col] === "@" && !portalsExpanded) {
      portalsExpanded = true;
      for (const portal of portals) {
        if (visited[portal.row][portal.col]) {
          continue;
        }
        visited[portal.row][portal.col] = true;
        queue.push(portal);
      }
    }
  }

  if (escaped) {
    return {
      enclosed: false,
      score: 0,
      bonus: 0,
      enclosedTiles: 0,
      enclosedMap,
    };
  }

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      enclosedMap[row][col] = visited[row][col];
    }
  }

  return {
    enclosed: true,
    score: enclosedTiles + bonus,
    bonus,
    enclosedTiles,
    enclosedMap,
  };
}

function parseBoard(levelText) {
  const rows = normalizeLevelText(levelText).trimEnd().split("\n");
  return rows.map((row) => row.split(""));
}

function validateBoardShape(board) {
  if (board.length === 0 || board[0].length === 0) {
    throw new Error("Level is empty.");
  }
  if (board.length > MAX_BOARD_SIZE || board[0].length > MAX_BOARD_SIZE) {
    throw new Error("Level exceeds max board size.");
  }
  const width = board[0].length;
  for (const row of board) {
    if (row.length !== width) {
      throw new Error("Level rows must have equal width.");
    }
    for (const tile of row) {
      if (!".=#PCBA@".includes(tile)) {
        throw new Error(`Unsupported tile: ${tile}`);
      }
    }
  }
}

function normalizeLevelText(levelText) {
  return levelText.replace(/\r\n/g, "\n");
}

function countTiles(board, tile) {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell === tile) {
        count += 1;
      }
    }
  }
  return count;
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function findTile(board, tile) {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col] === tile) {
        return { row, col };
      }
    }
  }
  return null;
}

function isPassable(tile) {
  return tile !== "=" && tile !== "#";
}

function isInside(row, col, height, width) {
  return row >= 0 && row < height && col >= 0 && col < width;
}

function isEdge(row, col, height, width) {
  return row === 0 || col === 0 || row === height - 1 || col === width - 1;
}

function toIndex(row, col, height, width) {
  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 1 || col < 1 || row > height || col > width) {
    throw new Error("Coordinates out of range.");
  }
  return { row: row - 1, col: col - 1 };
}
