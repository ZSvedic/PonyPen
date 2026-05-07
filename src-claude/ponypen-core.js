// PonyPen headless core. Pure JS, no I/O, no DOM.

export const TILE = {
  GRASS: '.', WATER: '=', ROCK: '#',
  PONY: 'P', CHERRY: 'C', APPLE: 'A', BEE: 'B', PORTAL: '@',
};

const PASSABLE = new Set(['.', 'P', 'C', 'A', 'B', '@']);
const ITEM_BONUS = { C: 3, A: 10, B: -5 };
const MAX_SIZE = 30;

const ERR_NO_SOLUTION = 'Level has no solution.';
const ERR_NOT_ENCLOSED = 'Pony is not enclosed by the solution.';
const ERR_SUBOPTIMAL = 'Level has a suboptimal solution.';

export function parseLevelFilename(path) {
  const file = path.split('/').pop();
  const m = file.match(/^(\d+)-(.+)-(\d+)\.txt$/);
  if (!m) return { id: '', name: file.replace(/\.txt$/, ''), maxScore: 0 };
  return { id: m[1], name: m[2], maxScore: Number(m[3]) };
}

function parseBoard(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) throw new Error('Empty level');
  const width = Math.max(...lines.map(l => l.length));
  if (width > MAX_SIZE || lines.length > MAX_SIZE)
    throw new Error(`Level exceeds ${MAX_SIZE}x${MAX_SIZE} max size.`);
  return lines.map(line => {
    const row = line.padEnd(width, ' ').split('');
    // Treat trailing spaces as grass to keep rectangular shape.
    return row.map(ch => ch === ' ' ? '.' : ch);
  });
}

function findPony(board) {
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board[r].length; c++)
      if (board[r][c] === 'P') return [r + 1, c + 1];
  return null;
}

function findPortals(board) {
  const out = [];
  for (let r = 0; r < board.length; r++)
    for (let c = 0; c < board[r].length; c++)
      if (board[r][c] === '@') out.push([r + 1, c + 1]);
  return out;
}

function computeReach(board) {
  const h = board.length, w = board[0].length;
  const pony = findPony(board);
  if (!pony) return { escaped: true, reachable: new Set() };
  const portals = findPortals(board);
  const reachable = new Set();
  const visited = new Set();
  const queue = [pony];
  let escaped = false;
  while (queue.length) {
    const [r, c] = queue.shift();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    reachable.add(key);
    if (r === 1 || r === h || c === 1 || c === w) escaped = true;
    const here = board[r - 1][c - 1];
    const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of neighbors) {
      if (nr < 1 || nr > h || nc < 1 || nc > w) continue;
      const t = board[nr - 1][nc - 1];
      if (!PASSABLE.has(t)) continue;
      queue.push([nr, nc]);
    }
    if (here === '@') {
      for (const [pr, pc] of portals)
        if (pr !== r || pc !== c) queue.push([pr, pc]);
    }
  }
  return { escaped, reachable };
}

function scoreBoard(board) {
  const { escaped, reachable } = computeReach(board);
  if (escaped) return { score: 0, escaped: true, bonus: 0, tiles: 0, reachable };
  let bonus = 0;
  for (const k of reachable) {
    const [r, c] = k.split(',').map(Number);
    bonus += ITEM_BONUS[board[r - 1][c - 1]] || 0;
  }
  return { score: reachable.size + bonus, escaped: false, bonus, tiles: reachable.size, reachable };
}

function buildEnclosedMap(board) {
  const h = board.length, w = board[0].length;
  const map = Array.from({ length: h }, () => Array(w).fill(false));
  const { escaped, reachable } = computeReach(board);
  if (escaped) return map;
  for (const k of reachable) {
    const [r, c] = k.split(',').map(Number);
    map[r - 1][c - 1] = true;
  }
  return map;
}

function emptyMap(h, w) {
  return Array.from({ length: h }, () => Array(w).fill(false));
}

function validateSolved(solvedBoard) {
  let rockCount = 0;
  for (const row of solvedBoard) for (const t of row) if (t === '#') rockCount++;
  if (rockCount === 0) throw new Error(ERR_NO_SOLUTION);
  const solvedScore = scoreBoard(solvedBoard);
  if (solvedScore.escaped || solvedScore.score === 0)
    throw new Error(ERR_NOT_ENCLOSED);
  // A rock is necessary iff removing it strictly lowers the score
  // (escape, smaller pen, or newly-enclosed penalty tiles).
  // Otherwise the rock is dead weight and the solution is suboptimal.
  for (let r = 0; r < solvedBoard.length; r++) {
    for (let c = 0; c < solvedBoard[r].length; c++) {
      if (solvedBoard[r][c] !== '#') continue;
      const probe = solvedBoard.map(row => row.slice());
      probe[r][c] = '.';
      const probeScore = scoreBoard(probe);
      if (probeScore.score >= solvedScore.score) throw new Error(ERR_SUBOPTIMAL);
    }
  }
  return { rockCount, score: solvedScore.score };
}

export function createGame(levelText, options = {}) {
  const solved = parseBoard(levelText);
  const { rockCount, score: maxScore } = validateSolved(solved);

  const initialBoard = solved.map(row => row.map(t => t === '#' ? '.' : t));
  const h = initialBoard.length, w = initialBoard[0].length;

  let currentBoard = initialBoard.map(r => r.slice());
  let placedRocks = 0;
  let scoreResult = null;
  let enclosedMap = emptyMap(h, w);

  const recompute = () => {
    enclosedMap = buildEnclosedMap(currentBoard);
  };

  const game = {
    get state() {
      return {
        name: options.name || '',
        width: w,
        height: h,
        maxRocks: rockCount,
        maxScore,
        initialBoard: initialBoard.map(r => r.slice()),
        currentBoard: currentBoard.map(r => r.slice()),
        placedRocks,
        scoreResult,
        enclosedMap: enclosedMap.map(r => r.slice()),
      };
    },

    toggleRock(r, c) {
      if (r < 1 || r > h || c < 1 || c > w)
        return [{ type: 'error', message: 'Coordinates out of bounds.' }];
      const tile = currentBoard[r - 1][c - 1];
      if (tile === '#') {
        currentBoard[r - 1][c - 1] = initialBoard[r - 1][c - 1];
        placedRocks--;
        scoreResult = null;
        recompute();
        return [{ type: 'rock-removed', r, c }];
      }
      if (tile !== '.')
        return [{ type: 'error', message: 'Invalid: rocks can only be placed on grass (.) tiles!' }];
      if (placedRocks >= rockCount)
        return [{ type: 'error', message: `Out of rocks: ${rockCount} max.` }];
      currentBoard[r - 1][c - 1] = '#';
      placedRocks++;
      scoreResult = null;
      recompute();
      return [{ type: 'rock-added', r, c }];
    },

    reset() {
      currentBoard = initialBoard.map(r => r.slice());
      placedRocks = 0;
      scoreResult = null;
      enclosedMap = emptyMap(h, w);
      return [{ type: 'reset' }];
    },

    score() {
      const s = scoreBoard(currentBoard);
      scoreResult = {
        score: s.score,
        bonus: s.bonus,
        tiles: s.tiles,
        escaped: s.escaped,
        peak: !s.escaped && s.score === maxScore,
      };
      return [{ type: 'scored', ...scoreResult }];
    },
  };

  return game;
}
