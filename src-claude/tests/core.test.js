import { test, expect, describe } from 'bun:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createGame, parseLevelFilename } from '../ponypen-core.js';

const here = dirname(fileURLToPath(import.meta.url));
const levelsDir = resolve(here, '..', 'levels');
const readLevel = (name) => readFileSync(resolve(levelsDir, name), 'utf8');

describe('createGame parsing & validation', () => {
  test('parses level dimensions, maxRocks, maxScore from solved board', () => {
    const game = createGame(readLevel('01-minimal-1.txt'), { name: 'minimal' });
    expect(game.state.width).toBe(3);
    expect(game.state.height).toBe(3);
    expect(game.state.maxRocks).toBe(3);
    expect(game.state.maxScore).toBe(1);
    expect(game.state.name).toBe('minimal');
  });

  test('initial board replaces # with .', () => {
    const game = createGame(readLevel('01-minimal-1.txt'));
    expect(game.state.currentBoard.map(r => r.join('')).join('\n'))
      .toBe('.==\n.P.\n...');
    expect(game.state.placedRocks).toBe(0);
  });

  test('rejects level with no rocks', () => {
    expect(() => createGame(readLevel('51-bad_no_rocks-0.txt')))
      .toThrow('Level has no solution.');
  });

  test('rejects level where solution leaks', () => {
    expect(() => createGame(readLevel('52-bad_leak-1.txt')))
      .toThrow('Pony is not enclosed by the solution.');
  });

  test('rejects suboptimal solution', () => {
    expect(() => createGame(readLevel('53-bad_extra_rocks-4.txt')))
      .toThrow('Level has a suboptimal solution.');
  });

  test('parseLevelFilename extracts metadata', () => {
    expect(parseLevelFilename('02-cherry_apple-19.txt'))
      .toEqual({ id: '02', name: 'cherry_apple', maxScore: 19 });
    expect(parseLevelFilename('levels/04-large-250.txt'))
      .toEqual({ id: '04', name: 'large', maxScore: 250 });
  });
});

describe('toggleRock and scoring', () => {
  test('placing solved rocks scores Peak Pony Score', () => {
    const game = createGame(readLevel('01-minimal-1.txt'));
    const events = [];
    events.push(...game.toggleRock(2, 1));
    events.push(...game.toggleRock(2, 3));
    events.push(...game.toggleRock(3, 2));
    events.push(...game.score());
    expect(game.state.scoreResult.score).toBe(1);
    expect(game.state.scoreResult.peak).toBe(true);
    expect(game.state.scoreResult.escaped).toBe(false);
    expect(events.map(e => e.type)).toEqual(['rock-added','rock-added','rock-added','scored']);
    expect(events[0]).toEqual({type:'rock-added', r:2, c:1});
  });

  test('toggle existing rock removes it', () => {
    const game = createGame(readLevel('01-minimal-1.txt'));
    game.toggleRock(2, 1);
    const events = game.toggleRock(2, 1);
    expect(events[0].type).toBe('rock-removed');
    expect(game.state.placedRocks).toBe(0);
  });

  test('cannot place rock on non-grass tile', () => {
    const game = createGame(readLevel('01-minimal-1.txt'));
    const events = game.toggleRock(2, 2); // P
    expect(events[0].type).toBe('error');
    expect(game.state.placedRocks).toBe(0);
  });

  test('cannot place more rocks than maxRocks', () => {
    const game = createGame(readLevel('01-minimal-1.txt'));
    game.toggleRock(2, 1);
    game.toggleRock(2, 3);
    game.toggleRock(3, 2);
    const events = game.toggleRock(1, 1);
    expect(events[0].type).toBe('error');
    expect(game.state.placedRocks).toBe(3);
  });

  test('reset clears placed rocks and scoreResult', () => {
    const game = createGame(readLevel('01-minimal-1.txt'));
    game.toggleRock(2, 1);
    const events = game.reset();
    expect(events[0].type).toBe('reset');
    expect(game.state.placedRocks).toBe(0);
    expect(game.state.scoreResult).toBeNull();
  });

  test('cherry_apple level scores 19 with solved rocks', () => {
    const game = createGame(readLevel('02-cherry_apple-19.txt'));
    game.toggleRock(1, 2);
    game.toggleRock(2, 5);
    game.toggleRock(3, 1);
    game.toggleRock(4, 3);
    game.score();
    expect(game.state.scoreResult.score).toBe(19);
    expect(game.state.scoreResult.peak).toBe(true);
  });

  test('bees_teleport scores 19 with solved rocks (teleport bonus)', () => {
    const game = createGame(readLevel('03-bees_teleport-19.txt'));
    game.toggleRock(2, 3);
    game.toggleRock(3, 2);
    game.toggleRock(5, 1);
    game.toggleRock(5, 7);
    game.score();
    expect(game.state.scoreResult.score).toBe(19);
  });

  test('non-peak suboptimal solution for bees_teleport scores 18', () => {
    const game = createGame(readLevel('03-bees_teleport-19.txt'));
    game.toggleRock(2, 3);
    game.toggleRock(3, 2);
    game.toggleRock(5, 1);
    game.toggleRock(5, 6);
    game.score();
    expect(game.state.scoreResult.score).toBe(18);
    expect(game.state.scoreResult.peak).toBe(false);
    expect(game.state.scoreResult.escaped).toBe(false);
  });
});

describe('enclosedMap', () => {
  test('all false until pony is enclosed', () => {
    const game = createGame(readLevel('02-cherry_apple-19.txt'));
    const allFalse = game.state.enclosedMap.flat().every(v => v === false);
    expect(allFalse).toBe(true);
  });

  test('reflects enclosed region after rock toggles', () => {
    const game = createGame(readLevel('02-cherry_apple-19.txt'));
    game.toggleRock(1, 2);
    game.toggleRock(3, 2);
    game.toggleRock(4, 3);
    game.toggleRock(2, 4);
    const m = game.state.enclosedMap;
    const fmt = m.map(r => r.map(v => v ? 'T' : '.').join(' ')).join('\n');
    expect(fmt).toBe([
      '. . . . .',
      '. T T . .',
      '. . T T .',
      '. . . . .'
    ].join('\n'));
  });

  test('reset clears enclosedMap', () => {
    const game = createGame(readLevel('02-cherry_apple-19.txt'));
    game.toggleRock(1, 2);
    game.toggleRock(3, 2);
    game.toggleRock(4, 3);
    game.toggleRock(2, 4);
    game.reset();
    const allFalse = game.state.enclosedMap.flat().every(v => v === false);
    expect(allFalse).toBe(true);
  });
});
