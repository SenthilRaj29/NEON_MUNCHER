// ============================================================
// GAME STATE
// ============================================================
let state = 'login'; // login | levels | countdown | playing | paused | dead | gameover | levelclear
let currentLevel = 1;
let currentConfig = null;
let score = 0, lives = 3;
let frightTimer = 0, frightDuration = 7;
let ghostChain = 0;
let modeTimer = 0, modeIndex = 0;
const MODE_SEQUENCE = [ ['scatter',7], ['chase',20], ['scatter',7], ['chase',20], ['scatter',5], ['chase',1e9] ];
let currentKeyMap = {};
let hudScore = null, hudLives = null;
let countdownTimer = null;
let demoTimer = null;
let bossIntroPending = false;

function makePacman(){
  const p = tileCenterPx(START_TILE.x, START_TILE.y);
  return {
    x:p.x, y:p.y, dir:{...DIR.UP}, nextDir:{...DIR.UP},
    speed: 150, mouth:0, mouthDir:1, alive:true
  };
}

function makeGhost(name, color, homeOffset, releaseDelay, scatterTile){
  const p = tileCenterPx(HOUSE_CENTER.x + homeOffset.x, HOUSE_CENTER.y + homeOffset.y);
  return {
    name, color, x:p.x, y:p.y, homeX:p.x, homeY:p.y,
    dir:{...DIR.UP}, speed:96,
    mode:'house', releaseDelay, homeTimer:0,
    scatterTile, frightened:false, eaten:false
  };
}

function makeStartingGhost(name, color, tile, scatterTile){
  const p = tileCenterPx(tile.x, tile.y);
  return {
    name, color, x:p.x, y:p.y, homeX:p.x, homeY:p.y,
    dir:{...DIR.DOWN}, speed:96, mode:'active', releaseDelay:0, homeTimer:0,
    scatterTile, frightened:false, eaten:false, boss:false, burstTimer:0, burstCooldown:0
  };
}

function makeBossGhost(){
  const p = tileCenterPx(currentConfig.bossPath[0].x, currentConfig.bossPath[0].y);
  return {
    name:'boss', color:'#ff2638', x:p.x, y:p.y, homeX:p.x, homeY:p.y,
    dir:{...DIR.DOWN}, speed:96, mode:'active', releaseDelay:0, homeTimer:0,
    scatterTile:currentConfig.bossPath[0], frightened:false, eaten:false, boss:true,
    burstTimer:0, burstCooldown:1.5, trail:[], pathIndex:1, roll:0
  };
}

let pacman, ghosts;

// Builds the active key -> direction map from the saved scheme, and
// reverses it when the level's "twist" flag is on.
function buildKeyMap(scheme, reversed){
  const map = {};
  const bind = (keys, dir) => keys.forEach(k => map[k] = dir);
  const UP    = reversed ? DIR.DOWN  : DIR.UP;
  const DOWN  = reversed ? DIR.UP    : DIR.DOWN;
  const LEFT  = reversed ? DIR.RIGHT : DIR.LEFT;
  const RIGHT = reversed ? DIR.LEFT  : DIR.RIGHT;
  if (scheme === 'arrows' || scheme === 'both'){
    bind(['ArrowUp'], UP); bind(['ArrowDown'], DOWN); bind(['ArrowLeft'], LEFT); bind(['ArrowRight'], RIGHT);
  }
  if (scheme === 'wasd' || scheme === 'both'){
    bind(['w','W'], UP); bind(['s','S'], DOWN); bind(['a','A'], LEFT); bind(['d','D'], RIGHT);
  }
  return map;
}

function startLevel(n){
  currentLevel = n;
  currentConfig = generateLevelConfig(n);
  document.documentElement.style.setProperty('--level-wall', currentConfig.theme.wall);
  document.documentElement.style.setProperty('--level-glow', currentConfig.theme.glow);
  document.documentElement.style.setProperty('--level-bg', currentConfig.theme.bg);
  const isBoss = n % 5 === 0;
  document.getElementById('screen-game').classList.toggle('boss-level', isBoss);

  buildMaze(currentConfig.mazeVariant, currentConfig.mazeProfile);
  rebuildMazeLayer();
  totalPellets = countPellets();
  score = 0; lives = 3;
  hudScore = null; hudLives = null;
  frightDuration = currentConfig.frightDuration;
  currentKeyMap = buildKeyMap('both', currentConfig.dynamicControls);

  respawnEntities(true);
  modeTimer = 0; modeIndex = 0; frightTimer = 0; ghostChain = 0;

  document.getElementById('control-flag').classList.toggle('hidden', !currentConfig.dynamicControls);
  updateHUD();
  showScreen('game');
  startMusic();
  hideOverlay();
  if (isBoss){
    bossIntroPending = true;
    state = 'bossintro';
    showOverlay('BOSS MISSION', `Level ${n}. The hunter is loose.`, [{label:'ENTER BOSS FIGHT', action:'bossstart'}]);
  } else beginCountdown();
}

// Re-places Pac-Man and the ghosts at their starting spots using the
// current level's speeds, WITHOUT touching the maze/pellets/score —
// used after losing a life.
function respawnEntities(initial = false){
  pacman = makePacman();
  pacman.speed = currentConfig.pacmanSpeed;
  ghosts = initial ? [
    makeStartingGhost('blinky', '#ff3b3b', currentConfig.spawnTiles[0], currentConfig.scatterTiles[0]),
    makeStartingGhost('pinky', '#ff9fd6', currentConfig.spawnTiles[1], currentConfig.scatterTiles[1]),
    makeStartingGhost('inky', '#39e9ff', currentConfig.spawnTiles[2], currentConfig.scatterTiles[2]),
    makeStartingGhost('clyde', '#ffb545', currentConfig.spawnTiles[3], currentConfig.scatterTiles[3]),
    ...(currentLevel % 5 === 0 ? [makeBossGhost()] : []),
  ] : [
    makeGhost('blinky', '#ff3b3b', {x:0,y:0}, currentConfig.releaseDelays[0], {x:17,y:1}),
    makeGhost('pinky', '#ff9fd6', {x:-1,y:0}, currentConfig.releaseDelays[1], {x:1,y:1}),
    makeGhost('inky', '#39e9ff', {x:1,y:0}, currentConfig.releaseDelays[2], {x:17,y:19}),
    makeGhost('clyde', '#ffb545', {x:0,y:1}, currentConfig.releaseDelays[3], {x:1,y:19}),
    ...(currentLevel % 5 === 0 ? [makeBossGhost()] : []),
  ];
  ghosts.forEach(g => g.speed = currentConfig.ghostSpeed);
  frightTimer = 0; ghostChain = 0;
}

function beginCountdown(){
  bossIntroPending = false;
  state = 'countdown';
  let remaining = 3;
  showOverlay('READY?', `Game starts in ${remaining}`, [], false, false);
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    remaining--;
    if (remaining <= 0){
      clearInterval(countdownTimer);
      countdownTimer = null;
      state = 'playing';
      hideOverlay();
      sfx.start();
      startGhostMove();
      return;
    }
    showOverlay('READY?', `Game starts in ${remaining}`, [], false, false);
  }, 1000);
}

function resumeGame(){ beginCountdown(); }

function startDemo(){
  save.user = {name:'Demo', picture:null, provider:'demo'};
  let demoLevel = 1;
  const showNextDemoLevel = () => {
    if (demoLevel > TOTAL_LEVELS){
      clearInterval(demoTimer);
      demoTimer = null;
      showOverlay('DEMO COMPLETE', 'All 50 level backgrounds visited.', [], false, false);
      return;
    }
    startLevel(demoLevel);
    countdownTimer = null;
    state = 'playing';
    hideOverlay();
    demoLevel++;
  };
  showNextDemoLevel();
  demoTimer = setInterval(showNextDemoLevel, 300);
}

function startBossDemo(){
  save.user = {name:'Boss Demo', picture:null, provider:'demo'};
  startLevel(5);
}

// ============================================================
// INPUT
// ============================================================
window.addEventListener('keydown', (e) => {
  const direction = currentKeyMap[e.key] || currentKeyMap[e.code];
  if ((state === 'playing' || state === 'countdown') && direction){
    pacman.nextDir = direction;
    e.preventDefault();
  }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape'){
    if (state === 'playing'){
      state = 'paused';
      stopEffects();
      stopGhostMove();
      showOverlay('PAUSED', 'Take a breath.', [
        {label:'RESUME', action:'resume'},
        {label:'MAIN MENU', action:'mainmenu'}
      ], false, true);
    } else if (state === 'paused'){
      resumeGame();
    }
  }
});

// ============================================================
// COLLISIONS
// ============================================================
function checkCollisions(){
  for (const g of ghosts){
    if (g.mode === 'house') continue;
    const d = Math.hypot(g.x-pacman.x, g.y-pacman.y);
    if (d < CELL*0.55){
      if (g.frightened && !g.eaten){
        g.eaten = true; g.frightened = false;
        ghostChain++;
        score += 200 * ghostChain;
        sfx.eatGhost();
      } else if (!g.eaten){
        loseLife();
        return;
      }
    }
  }
}

function loseLife(){
  lives--;
  sfx.levelFail();
  updateHUD();
  if (lives <= 0){
    state = 'gameover';
    recordScore(currentLevel, score);
    showOverlay('GAME OVER', `You reached level ${currentLevel} with a score of ${score}.`, [
      {label:'RETRY LEVEL', action:'restart'},
      {label:'MAIN MENU', action:'mainmenu'}
    ], true);
  } else {
    state = 'dead';
    setTimeout(() => { respawnEntities(); state = 'playing'; }, 900);
  }
}

// ============================================================
// HUD
// ============================================================
const scoreEl = document.getElementById('score');
const highEl = document.getElementById('highscore');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
function livesIconSVG(){
  return `<svg viewBox="0 0 20 20"><path d="M10 2a8 8 0 108 8h-8z" fill="#ffd23f"/></svg>`;
}
function updateHUD(){
  if (hudScore === score && hudLives === lives) return;
  hudScore = score;
  hudLives = lives;
  scoreEl.textContent = score;
  const best = save.highScores[currentLevel] || 0;
  highEl.textContent = Math.max(best, score);
  levelEl.textContent = currentLevel;
  livesEl.innerHTML = Array.from({length:Math.max(lives,0)}).map(livesIconSVG).join('');
}

// ============================================================
// MAIN LOOP
// ============================================================
let lastTime = performance.now();
function loop(now){
  const dt = Math.min((now-lastTime)/1000, 0.033);
  lastTime = now;

  if (state === 'playing'){
    updateBossChaseAudio(currentLevel % 5 === 0 && ghosts?.some(g => g.boss && !g.frightened && !g.eaten));
    updateModeTimer(dt);
    if (frightTimer > 0){
      frightTimer -= dt;
      if (frightTimer <= 0){
        frightTimer = 0;
        ghosts.forEach(g => g.frightened = false);
      }
    }
    updatePacman(dt);
    ghosts.forEach(g => updateGhost(g, dt));
    checkCollisions();
    updateHUD();
  }
  else updateBossChaseAudio(false);

  if (pacman && state !== 'paused'){
    drawMaze();
    drawPacman();
    ghosts.forEach(drawGhost);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

if (new URLSearchParams(window.location.search).has('demo')) startDemo();
if (new URLSearchParams(window.location.search).has('boss')) startBossDemo();
