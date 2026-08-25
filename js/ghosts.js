// ============================================================
// GHOST AI
// ============================================================
function dist2(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }

// Each ghost has its own "personality" for picking a target tile —
// this is the classic Blinky/Pinky/Inky/Clyde behavior split.
function ghostTarget(g){
  const pt = tileOf(pacman);
  if (g.frightened) return null; // handled as random movement instead
  if (g.eaten) return HOUSE_CENTER;

  const currentMode = MODE_SEQUENCE[modeIndex][0];
  if (currentMode === 'scatter') return g.scatterTile;

  if (g.name === 'blinky') return {x:pt.tx, y:pt.ty}; // direct chase
  if (g.name === 'pinky'){
    return {x:pt.tx + pacman.dir.dx*4, y:pt.ty + pacman.dir.dy*4}; // ambush ahead
  }
  if (g.name === 'inky'){
    const blinky = ghosts.find(x=>x.name==='blinky');
    const bt = tileOf(blinky);
    const ax = pt.tx + pacman.dir.dx*2, ay = pt.ty + pacman.dir.dy*2;
    return {x: ax*2 - bt.tx, y: ay*2 - bt.ty}; // unpredictable, uses Blinky's position
  }
  if (g.name === 'clyde'){
    const d = dist2(g.x,g.y,pacman.x,pacman.y);
    if (d > (8*CELL)*(8*CELL)) return {x:pt.tx, y:pt.ty}; // chase when far
    return g.scatterTile; // shy away when close
  }
  return {x:pt.tx, y:pt.ty};
}

function chooseGhostDir(g, tx, ty){
  const options = [DIR.UP,DIR.DOWN,DIR.LEFT,DIR.RIGHT].filter(d => {
    if (d.dx === -g.dir.dx && d.dy === -g.dir.dy) return false; // no reversing
    return canWalk(tx+d.dx, ty+d.dy);
  });
  if (options.length === 0){
    return {dx:-g.dir.dx, dy:-g.dir.dy}; // dead end — allow reverse
  }
  if (g.frightened){
    return options[Math.floor(Math.random()*options.length)];
  }
  const target = ghostTarget(g) || {x:tx,y:ty};
  let best = options[0], bestD = Infinity;
  for (const d of options){
    const nx = tx+d.dx, ny = ty+d.dy;
    const dd = (nx-target.x)*(nx-target.x) + (ny-target.y)*(ny-target.y);
    if (dd < bestD){ bestD = dd; best = d; }
  }
  return best;
}

function updateGhost(g, dt){
  if (g.mode === 'house'){
    g.homeTimer += dt;
    g.x = g.homeX;
    g.y = g.homeY + Math.sin(g.homeTimer*4)*3; // gentle bob while waiting to be released
    if (g.homeTimer >= g.releaseDelay){
      g.mode = 'active';
      g.x = tileCenterPx(9,10).x; // funnel to the door column
      g.dir = {...DIR.UP};
    }
    return;
  }

  if (frightTimer > 0 && !g.eaten) g.frightened = true;
  else if (!g.eaten) g.frightened = false;

  const speedBoost = g.frightened ? 0.55 : (g.eaten ? 2.0 : 1.0);
  if (g.boss){
    g.burstCooldown -= dt;
    if (g.burstTimer > 0) g.burstTimer -= dt;
    if (g.burstCooldown <= 0){
      g.burstTimer = 0.7 + Math.random() * 0.8;
      g.burstCooldown = 2.2 + Math.random() * 3.5;
    }
  }
  const bossBoost = g.boss ? 1.18 : 1;
  const burstBoost = g.boss && g.burstTimer > 0 ? 2.15 : 1;
  g.speed = currentConfig.ghostSpeed * speedBoost * bossBoost * burstBoost;

  const hit = atCenter(g);
  if (hit){
    g.x = hit.tx*CELL + CELL/2;
    g.y = hit.ty*CELL + CELL/2;

    if (g.eaten && hit.tx === HOUSE_CENTER.x && hit.ty === HOUSE_CENTER.y){
      g.eaten = false; g.frightened = false; g.mode = 'house'; g.homeTimer = 0; g.releaseDelay = 0.6;
      return;
    }
    if (g.boss){
      const bossPath = currentConfig.bossPath;
      const target = bossPath[g.pathIndex];
      if (hit.tx === target.x && hit.ty === target.y){
        g.pathIndex = (g.pathIndex + 1) % bossPath.length;
      }
      const nextTarget = bossPath[g.pathIndex];
      if (hit.tx !== nextTarget.x) g.dir = {dx:Math.sign(nextTarget.x - hit.tx), dy:0};
      else if (hit.ty !== nextTarget.y) g.dir = {dx:0, dy:Math.sign(nextTarget.y - hit.ty)};
      if (!canWalk(hit.tx + g.dir.dx, hit.ty + g.dir.dy)) g.dir = DIR.NONE;
    } else {
      g.dir = chooseGhostDir(g, hit.tx, hit.ty);
    }
  }
  if (g.boss){
    g.roll += dt * g.speed / CELL * 2.4;
    g.trail.push({x:g.x, y:g.y, life:0.24});
    g.trail = g.trail.filter(point => (point.life -= dt) > 0);
  }
  const nextX = g.x + g.dir.dx * g.speed * dt;
  const nextY = g.y + g.dir.dy * g.speed * dt;
  if (canWalk(Math.floor(nextX / CELL), Math.floor(g.y / CELL))) g.x = nextX;
  if (canWalk(Math.floor(g.x / CELL), Math.floor(nextY / CELL))) g.y = nextY;
}

function updateModeTimer(dt){
  modeTimer += dt;
  if (modeTimer >= MODE_SEQUENCE[modeIndex][1] && modeIndex < MODE_SEQUENCE.length-1){
    modeTimer = 0; modeIndex++;
  }
}
