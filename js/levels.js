// ============================================================
// LEVELS — procedurally generates the config for all 50 levels
// instead of hand-writing 50 objects. Difficulty scales smoothly:
// Pac-Man and the ghosts get faster, the frightened window shrinks,
// the maze layout cycles through 4 variants, and every 5th level
// is a "twist" level with reversed controls.
// ============================================================
const TOTAL_LEVELS = 50;
const LEVEL_THEMES = [
  { wall:'#1769ff', glow:'#00bfff', pellet:'#8fe8ff', bg:'#010610' },
  { wall:'#ff2638', glow:'#ff2638', pellet:'#ffb36b', bg:'#100103' },
  { wall:'#686c78', glow:'#aab0bc', pellet:'#fff1b0', bg:'#010101' },
  { wall:'#ae42ff', glow:'#00eaff', pellet:'#ff8df2', bg:'#080014' },
  { wall:'#ff2638', glow:'#ff5b24', pellet:'#ffbe55', bg:'#0d0101' },
  { wall:'#ff9fd6', glow:'#ff9fd6', pellet:'#fff08a', bg:'#090006' },
  { wall:'#16d9ff', glow:'#16d9ff', pellet:'#fff08a', bg:'#00070a' },
  { wall:'#ff8c22', glow:'#ff8c22', pellet:'#fff08a', bg:'#090400' },
  { wall:'#2c63ff', glow:'#2c63ff', pellet:'#ffd23f', bg:'#02040c' }
];

function generateLevelConfig(n){
  const difficultyLevel = n % 5 === 0 ? Math.max(1, n - 1) : n;
  const mazeProfile     = difficultyLevel <= 5 ? 'compact' : difficultyLevel <= 10 ? 'small' : difficultyLevel <= 20 ? 'medium' : 'full';
  const mazeDimensions  = mazeProfile === 'compact' ? {width:9,height:15} : mazeProfile === 'small' ? {width:13,height:17} : mazeProfile === 'medium' ? {width:15,height:19} : {width:17,height:19};
  const pacmanSpeed     = Math.min(124 + (n-1) * 2.2, 208);
  const ghostSpeed      = Math.min(118 + (n-1) * 2.5, 208);
  const frightDuration  = Math.max(3.5, 8 - (n-1) * 0.1);
  const mazeVariant     = (n - 1) % MAZE_VARIANTS;
  const dynamicControls = n % 5 === 0; // every boss stage reverses controls
  const releaseDelays   = [0, 3.5, 7, 10.5].map(d => Math.max(0.8, d - (n-1) * 0.04));
  const theme = LEVEL_THEMES[(n - 1) % LEVEL_THEMES.length];
  const spawnTiles = mazeProfile === 'compact'
    ? [{x:13,y:3}, {x:11,y:3}, {x:7,y:3}, {x:5,y:3}]
    : mazeProfile === 'small'
      ? [{x:15,y:2}, {x:13,y:2}, {x:7,y:2}, {x:3,y:2}]
      : mazeProfile === 'medium'
        ? [{x:16,y:1}, {x:13,y:1}, {x:5,y:1}, {x:2,y:1}]
        : [{x:17,y:1}, {x:13,y:1}, {x:5,y:1}, {x:1,y:1}];
  const scatterTiles = mazeProfile === 'compact'
    ? [{x:13,y:3}, {x:5,y:3}, {x:13,y:17}, {x:5,y:17}]
    : mazeProfile === 'small'
      ? [{x:15,y:2}, {x:3,y:2}, {x:15,y:18}, {x:3,y:18}]
      : mazeProfile === 'medium'
        ? [{x:16,y:1}, {x:2,y:1}, {x:16,y:19}, {x:2,y:19}]
        : [{x:17,y:1}, {x:1,y:1}, {x:17,y:19}, {x:1,y:19}];
  const bossPath = [
    {x:9, y:mazeProfile === 'compact' ? 4 : mazeProfile === 'small' ? 3 : 2},
    {x:9, y:10},
    {x:mazeProfile === 'compact' ? 11 : mazeProfile === 'small' ? 13 : mazeProfile === 'medium' ? 14 : 15, y:10},
    {x:9, y:10},
    {x:mazeProfile === 'compact' ? 7 : mazeProfile === 'small' ? 5 : mazeProfile === 'medium' ? 4 : 3, y:10}
  ];

  return { level:n, pacmanSpeed, ghostSpeed, frightDuration, mazeVariant, mazeProfile, mazeDimensions, dynamicControls, releaseDelays, theme, spawnTiles, scatterTiles, bossPath };
}
