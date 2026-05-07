import { test, expect, describe } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cliPath = resolve(here, '..', 'ponypen-cli.js');
const root = resolve(here, '..');

function solvedRocks(name) {
  const text = readFileSync(resolve(root, 'levels', name), 'utf8');
  const rocks = [];
  text.split('\n').forEach((line, r) => {
    [...line].forEach((ch, c) => { if (ch === '#') rocks.push(`r${r+1}c${c+1}`); });
  });
  return rocks.join(' ');
}

function run(args, opts = {}) {
  const r = spawnSync('bun', [cliPath, ...args], {
    cwd: root, encoding: 'utf8', input: opts.input,
  });
  return { stdout: r.stdout, stderr: r.stderr, exit: r.status };
}

describe('CLI usage', () => {
  test('no args prints USAGE and exits 2', () => {
    const r = run([]);
    expect(r.stdout + r.stderr).toContain('USAGE: ./ponypen-cli.js levelFile');
    expect(r.stdout + r.stderr).toContain('Rock placements are set in R1C1 format.');
    expect(r.stdout + r.stderr).toContain('If no rocks, game starts in the interactive mode.');
    expect(r.exit).toBe(2);
  });

  test('--help prints USAGE and exits 0', () => {
    const r = run(['--help']);
    expect(r.stdout + r.stderr).toContain('USAGE: ./ponypen-cli.js levelFile');
    expect(r.exit).toBe(0);
  });

  test('-h prints USAGE and exits 0', () => {
    const r = run(['-h']);
    expect(r.stdout + r.stderr).toContain('USAGE: ./ponypen-cli.js levelFile');
    expect(r.exit).toBe(0);
  });
});

describe('CLI level validation', () => {
  test('peak score for level 01 with solved rocks', () => {
    const r = run(['levels/01-minimal-1.txt', 'r2c1 r2c3 r3c2']);
    expect(r.stdout).toContain(' \\ 1 2 3');
    expect(r.stdout).toContain(' 1 . = =');
    expect(r.stdout).toContain(' 2 # P #');
    expect(r.stdout).toContain(' 3 . # .');
    expect(r.stdout).toContain('Score: 1');
    expect(r.stdout).toContain('Peak Pony Score!');
    expect(r.exit).toBe(0);
  });

  test('peak score for level 02', () => {
    const r = run(['levels/02-cherry_apple-19.txt', 'r1c2 r2c5 r3c1 r4c3']);
    expect(r.stdout).toContain('Score: 19');
    expect(r.stdout).toContain('Peak Pony Score!');
    expect(r.exit).toBe(0);
  });

  test('peak score for level 03', () => {
    const r = run(['levels/03-bees_teleport-19.txt', 'r2c3 r3c2 r5c1 r5c7']);
    expect(r.stdout).toContain('Score: 19');
    expect(r.stdout).toContain('Peak Pony Score!');
    expect(r.exit).toBe(0);
  });

  test('peak score for level 04 (large 16x20)', () => {
    const rocks = solvedRocks('04-large-253.txt');
    const r = run(['levels/04-large-253.txt', rocks]);
    expect(r.stdout).toContain('Score: 253');
    expect(r.stdout).toContain('Peak Pony Score!');
    expect(r.exit).toBe(0);
  });

  test('rejects no-rocks level', () => {
    const r = run(['levels/51-bad_no_rocks-0.txt']);
    expect(r.stdout + r.stderr).toContain('ERROR: Level has no solution.');
    expect(r.exit).toBe(1);
  });

  test('rejects leaky level', () => {
    const r = run(['levels/52-bad_leak-1.txt']);
    expect(r.stdout + r.stderr).toContain('ERROR: Pony is not enclosed by the solution.');
    expect(r.exit).toBe(1);
  });

  test('rejects suboptimal level', () => {
    const r = run(['levels/53-bad_extra_rocks-4.txt']);
    expect(r.stdout + r.stderr).toContain('ERROR: Level has a suboptimal solution.');
    expect(r.exit).toBe(1);
  });
});

describe('CLI scoring scenarios', () => {
  test('non-peak enclosed pen with item bonuses', () => {
    const r = run(['levels/02-cherry_apple-19.txt', 'r1c2 r3c2 r4c3 r2c4']);
    expect(r.stdout).toContain('= # = = .');
    expect(r.stdout).toContain('= P . # .');
    expect(r.stdout).toContain('. # C A =');
    expect(r.stdout).toContain('. = # = .');
    expect(r.stdout).toContain('Score: 17');
    expect(r.stdout).toContain('Enclosed? Yes. Optimal? Neigh.');
    expect(r.exit).toBe(0);
  });

  test('non-peak enclosed pen with teleport', () => {
    const r = run(['levels/03-bees_teleport-19.txt', 'r2c3 r3c2 r5c1 r5c6']);
    expect(r.stdout).toContain('Score: 18');
    expect(r.stdout).toContain('Enclosed? Yes. Optimal? Neigh.');
    expect(r.exit).toBe(0);
  });
});

describe('CLI large grid', () => {
  test('header with 2-row column numbers and aligned row labels', () => {
    const r = run(['levels/04-large-253.txt']);
    expect(r.stdout).toContain('                     1 1 1 1 1 1 1 1 1 1 2');
    expect(r.stdout).toContain(' \\ 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0');
    for (let n = 1; n <= 9; n++) {
      expect(r.stdout).toContain(` ${n} `);
    }
    for (let n = 10; n <= 16; n++) {
      expect(r.stdout).toContain(`${n} `);
    }
    expect(r.exit).toBe(0);
  });
});

describe('CLI interactive mode', () => {
  test('quit ends the session cleanly', () => {
    const r = run(['levels/01-minimal-1.txt'], { input: 'quit\n' });
    expect(r.stdout).toContain('PonyPen CLI Interactive');
    expect(r.stdout).toContain("Type 'help' for commands.");
    expect(r.stdout).toContain('Level name: minimal (3x3)');
    expect(r.stdout).toContain('Placed 0 out of 3 rocks.');
    expect(r.exit).toBe(0);
  });

  test('placing rock and quit', () => {
    const r = run(['levels/02-cherry_apple-19.txt'], { input: 'r1c1\nr1c2\nquit\n' });
    expect(r.stdout).toContain('Level name: cherry_apple (4x5)');
    expect(r.stdout).toContain('Invalid: rocks can only be placed on grass (.) tiles!');
    expect(r.stdout).toContain('Placed 1 out of 4 rocks.');
    expect(r.stdout).toContain('Esca-pony!');
    expect(r.exit).toBe(0);
  });

  test('help shows available commands', () => {
    const r = run(['levels/01-minimal-1.txt'], { input: 'help\nquit\n' });
    expect(r.stdout).toContain('rXcY');
    expect(r.stdout).toContain('reset');
    expect(r.stdout).toContain('load');
    expect(r.stdout).toContain('help');
    expect(r.stdout).toContain('quit');
  });
});
