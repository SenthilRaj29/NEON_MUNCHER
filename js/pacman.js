// ============================================================
// MOVEMENT HELPERS — shared by Pac-Man and the ghosts.
// ============================================================
function atCenter(entity){
  const tx = Math.round(entity.x/CELL - 0.5);
  const ty = Math.round(entity.y/CELL - 0.5);
  const c = tileCenterPx(tx,ty);
  return Math.abs(entity.x-c.x) < 2 && Math.abs(entity.y-c.y) < 2 ? {tx,ty} : null;
}

function tileOf(entity){
  return { tx: Math.floor(entity.x/CELL), ty: Math.floor(entity.y/CELL) };
}

// ============================================================
// PACMAN LOGIC
// ============================================================
function updatePacman(dt){
  const hit = atCenter(pacman);
  if (hit){
    pacman.x = hit.tx*CELL + CELL/2;
    pacman.y = hit.ty*CELL + CELL/2;

    // Turn onto the queued direction if that path is open, otherwise
    // keep going straight; stop only if the way ahead is a wall.
    if (pacman.nextDir !== DIR.NONE && canWalk(hit.tx+pacman.nextDir.dx, hit.ty+pacman.nextDir.dy)){
      pacman.dir = pacman.nextDir;
    }
    if (!canWalk(hit.tx+pacman.dir.dx, hit.ty+pacman.dir.dy)){
      pacman.dir = DIR.NONE;
    }

    // Eat whatever is on this tile.
    const cell = grid[hit.ty][hit.tx];
    if (cell === 1){
      grid[hit.ty][hit.tx] = 3;
      score += 10; sfx.chomp();
    } else if (cell === 2){
      grid[hit.ty][hit.tx] = 3;
      score += 50; sfx.power();
      frightTimer = frightDuration;
      ghostChain = 0;
      ghosts.forEach(g => {
        if (g.mode !== 'house' && g.mode !== 'eaten'){
          g.frightened = true;
          g.dir = {dx:-g.dir.dx, dy:-g.dir.dy};
        }
      });
    } else stopChomp();

    // Level complete when no pellets remain anywhere on the grid.
    if (!(grid.flat().includes(1) || grid.flat().includes(2))){
      state = 'levelclear';
      sfx.congratulations();
      recordScore(currentLevel, score);
      const isLast = currentLevel >= TOTAL_LEVELS;
      unlockLevel(Math.min(currentLevel + 1, TOTAL_LEVELS));
      showOverlay(
        isLast ? 'ALL 50 LEVELS CLEARED!' : 'LEVEL CLEAR!',
        isLast ? `Incredible run — final score ${score}.` : `Level ${currentLevel} cleared. Ready for level ${currentLevel+1}?`,
        isLast
          ? [{label:'MAIN MENU', action:'mainmenu'}]
          : [{label:'NEXT LEVEL', action:'next'}, {label:'MAIN MENU', action:'mainmenu'}],
          true, false, currentLevel
      );
    }
  }
  pacman.x += pacman.dir.dx * pacman.speed * dt;
  pacman.y += pacman.dir.dy * pacman.speed * dt;

  // Mouth chomp animation, oscillates 0 -> 1 -> 0 while moving.
  if (pacman.dir !== DIR.NONE){
    pacman.mouth += pacman.mouthDir * dt * 10;
    if (pacman.mouth > 1){ pacman.mouth=1; pacman.mouthDir=-1; }
    if (pacman.mouth < 0){ pacman.mouth=0; pacman.mouthDir=1; }
  }
}
