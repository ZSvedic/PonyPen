import { createGame, parseLevelFilename } from './ponypen-core.js';

const TILE_SIZE = 56;
const TILE_TEXT = { '#': '🪨', 'P': '🐴', 'C': '🍒', 'A': '🍎', 'B': '🐝', '@': '🌀', '=': '≈' };

const LEVELS = [
  '01-minimal-1.txt',
  '02-cherry_apple-19.txt',
  '03-bees_teleport-19.txt',
  '04-large-253.txt',
];

const HELP_HTML = `<h3>PonyPen</h3>
<p>Place rocks (🪨) on grass tiles (·) to enclose the pony (🐴) using rocks and water (≈). Each enclosed passable tile is +1, items add bonus or penalty.</p>
<ul>
  <li>🍒 cherry: +3</li>
  <li>🍎 apple: +10</li>
  <li>🐝 bee: −5</li>
  <li>🌀 portal: teleports the pony between portals</li>
</ul>
<p>Click a grass tile to drop a rock; click again to remove it.</p>`;

const $ = (id) => document.getElementById(id);

function tileClassFor(t, enclosed) {
  if (t === '=') return 'tile water';
  if (t === '#') return 'tile rock';
  return 'tile passable' + (enclosed ? ' enclosed' : '');
}

class PonyPenApp {
  constructor() {
    this.game = null;
    this.meta = null;
    this.cells = [];
    this.history = [];
    this.future = [];
    this.bestByLevel = new Map();
    this.bindUI();
  }

  bindUI() {
    const sel = $('level-select');
    for (const name of LEVELS) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = parseLevelFilename(name).name.replace(/_/g, ' ');
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => this.loadLevel(sel.value));
    $('btn-undo').addEventListener('click', () => this.undo());
    $('btn-redo').addEventListener('click', () => this.redo());
    $('btn-reset').addEventListener('click', () => this.reset());
    $('btn-help').addEventListener('click', () => {
      $('help-content').innerHTML = HELP_HTML;
      $('help-dialog').showModal();
    });
    this.loadLevel(LEVELS[0]);
  }

  async loadLevel(name) {
    const text = await fetch(`./levels/${name}`).then(r => r.text());
    const fileMeta = parseLevelFilename(name);
    $('level-select').value = name;
    try {
      this.game = createGame(text, { name: fileMeta.name });
    } catch (err) {
      this.setStatus(`ERROR: ${err.message}`);
      return;
    }
    this.meta = fileMeta;
    this.history = [];
    this.future = [];
    this.buildGrid();
    this.refreshAll();
  }

  buildGrid() {
    const { width, height } = this.game.state;
    const grid = $('board-grid');
    grid.style.gridTemplateColumns = `repeat(${width}, ${TILE_SIZE}px)`;
    grid.style.gridTemplateRows = `repeat(${height}, ${TILE_SIZE}px)`;
    grid.innerHTML = '';
    this.cells = [];
    for (let r = 0; r < height; r++) {
      this.cells[r] = [];
      for (let c = 0; c < width; c++) {
        const cell = document.createElement('div');
        cell.className = 'tile';
        cell.dataset.r = String(r + 1);
        cell.dataset.c = String(c + 1);
        cell.addEventListener('click', () => this.handleClick(r + 1, c + 1));
        grid.appendChild(cell);
        this.cells[r][c] = cell;
      }
    }
  }

  handleClick(r, c) {
    const before = this.snapshot();
    const events = this.game.toggleRock(r, c);
    const ev = events[0];
    if (ev.type === 'error') { this.setStatus(ev.message); return; }
    this.history.push(before);
    this.future = [];
    this.game.score();
    this.refreshAll();
  }

  snapshot() {
    return {
      board: this.game.state.currentBoard,
      placed: this.game.state.placedRocks,
    };
  }

  applySnapshot(snap) {
    this.game.reset();
    for (let r = 0; r < snap.board.length; r++) {
      for (let c = 0; c < snap.board[r].length; c++) {
        if (snap.board[r][c] === '#') this.game.toggleRock(r + 1, c + 1);
      }
    }
    if (this.game.state.placedRocks > 0) this.game.score();
  }

  undo() {
    if (this.history.length === 0) return;
    this.future.push(this.snapshot());
    this.applySnapshot(this.history.pop());
    this.refreshAll();
  }

  redo() {
    if (this.future.length === 0) return;
    this.history.push(this.snapshot());
    this.applySnapshot(this.future.pop());
    this.refreshAll();
  }

  reset() {
    this.history.push(this.snapshot());
    this.future = [];
    this.game.reset();
    this.refreshAll();
  }

  paintBoard() {
    const { currentBoard, enclosedMap } = this.game.state;
    for (let r = 0; r < currentBoard.length; r++) {
      for (let c = 0; c < currentBoard[r].length; c++) {
        const t = currentBoard[r][c];
        const cell = this.cells[r][c];
        cell.className = tileClassFor(t, enclosedMap[r][c]);
        cell.textContent = TILE_TEXT[t] || '';
      }
    }
  }

  refreshAll() {
    this.paintBoard();
    this.refreshLabels();
    this.refreshLabelGrid();
  }

  refreshLabels() {
    const st = this.game.state;
    const sr = st.scoreResult;
    const tiles = sr ? sr.tiles : 0;
    const bonus = sr ? sr.bonus : 0;
    const score = sr ? sr.score : 0;
    const prevBest = this.bestByLevel.get(this.meta.name) || st.maxScore;
    const best = Math.max(prevBest, score);
    if (sr && score > prevBest) this.bestByLevel.set(this.meta.name, score);
    $('stat-tiles').textContent = String(tiles);
    $('stat-bonus').textContent = String(bonus);
    $('stat-score').textContent = String(score);
    $('stat-best').textContent = String(best);

    $('rocks-label').textContent = `ROCKS ${st.placedRocks}/${st.maxRocks}`;
    const slots = $('rocks-slots');
    slots.innerHTML = '';
    for (let i = 0; i < st.maxRocks; i++) {
      const d = document.createElement('div');
      d.className = 'rock-slot' + (i < st.placedRocks ? ' filled' : '');
      slots.appendChild(d);
    }

    if (!sr || st.placedRocks === 0) this.setStatus('Place rocks to pen the pony');
    else if (sr.escaped) this.setStatus('Esca-pony! 🐴💨');
    else if (sr.peak) this.setStatus('Peak Pony Score!');
    else this.setStatus('Enclosed? Yes. Optimal? Neigh.');

    $('btn-undo').disabled = this.history.length === 0;
    $('btn-redo').disabled = this.future.length === 0;
  }

  refreshLabelGrid() {
    const { width, height } = this.game.state;
    const col = $('col-labels');
    col.style.gridTemplateColumns = `repeat(${width}, ${TILE_SIZE}px)`;
    col.innerHTML = '';
    for (let c = 1; c <= width; c++) {
      const d = document.createElement('div');
      d.textContent = String(c);
      col.appendChild(d);
    }
    const row = $('row-labels');
    row.style.gridTemplateRows = `repeat(${height}, ${TILE_SIZE}px)`;
    row.innerHTML = '';
    for (let r = 1; r <= height; r++) {
      const d = document.createElement('div');
      d.textContent = String(r);
      row.appendChild(d);
    }
  }

  setStatus(msg) { $('status').textContent = msg; }
}

window.addEventListener('DOMContentLoaded', () => {
  window.ponypen = new PonyPenApp();
});
