#!/usr/bin/env bun
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, basename } from 'node:path';
import { createGame, parseLevelFilename } from './ponypen-core.js';

const USAGE = `USAGE: ./ponypen-cli.js levelFile ["rock1 rock2 ..."]
Rock placements are set in R1C1 format. After all rocks are set the solution is scored.
If no rocks, game starts in the interactive mode.`;

const HELP_BLOCK = `
 rXcY         Toggle rock at row X, col Y.
 reset        Reset board to initial state.
 load {LEVEL} Loads LEVEL file.
 help         Show this help.
 quit         Quit game.
`;

function buildHeader(width) {
  const lines = [];
  if (width >= 10) {
    let tens = '  ';
    for (let c = 1; c <= width; c++)
      tens += ' ' + (c < 10 ? ' ' : String(Math.floor(c / 10)));
    lines.push(tens.replace(/ +$/, ''));
  }
  let units = ' \\';
  for (let c = 1; c <= width; c++) units += ' ' + (c % 10);
  lines.push(units);
  return lines;
}

function renderBoard(board) {
  const w = board[0].length;
  const lines = buildHeader(w);
  for (let r = 0; r < board.length; r++) {
    const label = String(r + 1).padStart(2, ' ');
    lines.push(label + ' ' + board[r].join(' '));
  }
  return lines.join('\n');
}

function parseRockToken(tok) {
  const m = tok.toLowerCase().match(/^r(\d+)c(\d+)$/);
  return m ? { r: Number(m[1]), c: Number(m[2]) } : null;
}

function loadLevel(path) {
  const text = readFileSync(path, 'utf8');
  const meta = parseLevelFilename(basename(path));
  return { text, meta };
}

function fmtFinalScore(scoreResult) {
  const { score, escaped, peak } = scoreResult;
  if (escaped) return `Score: ${score}\nEsca-pony!`;
  if (peak) return `Score: ${score}\nPeak Pony Score!`;
  return `Score: ${score}\nEnclosed? Yes. Optimal? Neigh.`;
}

function fmtInteractiveStatus(game) {
  const { placedRocks, maxRocks, scoreResult } = game.state;
  const head = `Placed ${placedRocks} out of ${maxRocks} rocks.`;
  if (!scoreResult || placedRocks === 0) return head;
  const { score, escaped, peak } = scoreResult;
  if (escaped) return `${head} Score: ${score} — Esca-pony!`;
  if (peak) return `${head} Score: ${score} — Peak Pony Score!`;
  return `${head} Score: ${score} — Optimal? Neigh.`;
}

function runBatch(text, meta, rockTokens) {
  let game;
  try {
    game = createGame(text, { name: meta.name });
  } catch (err) {
    return { output: renderBoardSafe(text) + `\nERROR: ${err.message}`, exit: 1 };
  }
  for (const tok of rockTokens) {
    const rc = parseRockToken(tok);
    if (!rc) return { output: `ERROR: invalid rock token ${tok}`, exit: 1 };
    const events = game.toggleRock(rc.r, rc.c);
    if (events[0].type === 'error')
      return { output: `ERROR: ${events[0].message}`, exit: 1 };
  }
  game.score();
  const board = renderBoard(game.state.currentBoard);
  return { output: `${board}\n${fmtFinalScore(game.state.scoreResult)}`, exit: 0 };
}

function renderBoardSafe(text) {
  // For invalid levels, render the raw board so users see what they tried to load.
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter(l => l.length > 0);
  const width = Math.max(...lines.map(l => l.length));
  const board = lines.map(l => l.padEnd(width, ' ').split(''));
  return renderBoard(board);
}

async function interactive(initial) {
  let { text, meta } = initial;
  let game;
  try {
    game = createGame(text, { name: meta.name });
  } catch (err) {
    process.stdout.write(renderBoardSafe(text) + `\nERROR: ${err.message}\n`);
    process.exit(1);
  }

  console.log('PonyPen CLI Interactive');
  console.log("Type 'help' for commands.");
  console.log(`Level name: ${meta.name} (${game.state.height}x${game.state.width})`);
  console.log();
  console.log(renderBoard(game.state.currentBoard));
  console.log();
  console.log(fmtInteractiveStatus(game));

  const printState = () => {
    console.log();
    console.log(renderBoard(game.state.currentBoard));
    console.log();
    console.log(fmtInteractiveStatus(game));
  };

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lineIter = rl[Symbol.asyncIterator]();
  const ask = async () => {
    process.stdout.write('Your move: ');
    const { value, done } = await lineIter.next();
    return done ? null : value;
  };

  while (true) {
    const raw = await ask();
    if (raw == null) break;
    const line = raw.trim();
    if (line === '') continue;
    if (line === 'quit' || line === 'exit') break;
    if (line === 'help') { console.log(HELP_BLOCK); continue; }
    if (line === 'reset') { game.reset(); printState(); continue; }
    if (line.startsWith('load ')) {
      const path = line.slice(5).trim();
      try {
        const next = loadLevel(resolve(path));
        game = createGame(next.text, { name: next.meta.name });
        meta = next.meta;
        console.log(`Level name: ${meta.name} (${game.state.height}x${game.state.width})`);
        printState();
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
      }
      continue;
    }
    const rc = parseRockToken(line);
    if (!rc) { console.log(`Unknown command: ${line}`); continue; }
    const events = game.toggleRock(rc.r, rc.c);
    if (events[0].type === 'error') console.log(events[0].message);
    else game.score();
    printState();
  }
  rl.close();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(USAGE);
    process.exit(2);
  }
  if (args[0] === '--help' || args[0] === '-h') {
    console.log(USAGE);
    process.exit(0);
  }
  const levelArg = args[0];
  const rockArg = args[1];
  const { text, meta } = loadLevel(levelArg);

  if (rockArg !== undefined && rockArg.length > 0) {
    const tokens = rockArg.split(/\s+/).filter(Boolean);
    const r = runBatch(text, meta, tokens);
    console.log(r.output);
    process.exit(r.exit);
  }

  await interactive({ text, meta });
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
