/**
 * Arcade arenas, in the level map legend (src/levels/map.ts): # wall,
 * % force field (the apple tunnels, the snake cannot pass), @ start.
 */
export const SNAKE_ARENA: readonly string[] = [
  '#############',
  '#...........#',
  '#...........#',
  '#..##...##..#',
  '#...........#',
  '#...........#',
  '#.........%.#',
  '#.........%.#',
  '#.........%.#',
  '#...........#',
  '#...........#',
  '#..##...##..#',
  '#.....@.....#',
  '#...........#',
  '#...........#',
  '#############',
];

/**
 * Quantum Tanks arena: # concrete, x brick (shells break it), % force field
 * (stops you and your shells; enemy clouds tunnel through), H base 🦅,
 * E enemy spawn, @ player.
 */
export const TANKS_ARENA: readonly string[] = [
  '#############',
  '#E....E....E#',
  '#...........#',
  '#.xx.xxx.xx.#',
  '#.xx.....xx.#',
  '#.....x.....#',
  '#.#..xxx..#.#',
  '#.....x.....#',
  '#.xx.....xx.#',
  '#.xx.xxx.xx.#',
  '#...........#',
  '#.....@.....#',
  '#....%%%....#',
  '#....%H%....#',
  '#############',
];
