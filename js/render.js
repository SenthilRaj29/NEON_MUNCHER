// ============================================================
// RENDERING — every canvas draw call lives here. Nothing in this
// file changes game state; it only reads it and paints pixels.
// ============================================================
function drawMaze(){
  ctx.drawImage(mazeLayer, 0, 0);

  for (let r=0;r<ROWS;r++){
    for (let c=0;c<COLS;c++){
      const v = grid[r][c];
      const x = c*CELL, y = r*CELL;
      if (v === 0){
      } else if (v === 1){
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.arc(x+CELL/2, y+CELL/2, 2.4, 0, Math.PI*2);
        ctx.fill();
      } else if (v === 2){
        const pulse = 1 + Math.sin(performance.now()/150)*.16;
        const xCenter = x + CELL/2;
        const yCenter = y + CELL/2;
        ctx.save();
        ctx.translate(xCenter, yCenter);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ed2939';
        ctx.shadowColor = '#ff4b5c';
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.arc(-3.2, 1.5, 4.2, 0, Math.PI*2);
        ctx.arc(3.2, 1.5, 4.2, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#58d68d';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, -1); ctx.quadraticCurveTo(-1, -6, 2, -8);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function rebuildMazeLayer(){
  const theme = currentConfig?.theme || {wall:'#5b2bff', bg:'#000'};
  mazeCtx.fillStyle = theme.bg;
  mazeCtx.fillRect(0, 0, mazeLayer.width, mazeLayer.height);
  if (levelBoards.complete && levelBoards.naturalWidth){
    const panel = (currentLevel - 1) % 9;
    const sourceWidth = levelBoards.naturalWidth / 3;
    const sourceHeight = levelBoards.naturalHeight / 3;
    mazeCtx.globalAlpha = 0.18;
    mazeCtx.drawImage(levelBoards, (panel % 3) * sourceWidth, Math.floor(panel / 3) * sourceHeight, sourceWidth, sourceHeight, 0, 0, mazeLayer.width, mazeLayer.height);
    mazeCtx.globalAlpha = 1;
  }
  mazeCtx.fillStyle = theme.bg;
  mazeCtx.strokeStyle = theme.wall;
  mazeCtx.lineWidth = 2.4;
  mazeCtx.lineJoin = 'round';
  mazeCtx.lineCap = 'round';
  for (let r=0;r<ROWS;r++){
    for (let c=0;c<COLS;c++){
      if (grid[r][c] !== 0) continue;
      const x = c*CELL, y = r*CELL;
      mazeCtx.beginPath();
      if (r === 0 || grid[r-1][c] !== 0) { mazeCtx.moveTo(x+2, y+1); mazeCtx.lineTo(x+CELL-2, y+1); }
      if (c === COLS-1 || grid[r][c+1] !== 0) { mazeCtx.moveTo(x+CELL-1, y+2); mazeCtx.lineTo(x+CELL-1, y+CELL-2); }
      if (r === ROWS-1 || grid[r+1][c] !== 0) { mazeCtx.moveTo(x+CELL-2, y+CELL-1); mazeCtx.lineTo(x+2, y+CELL-1); }
      if (c === 0 || grid[r][c-1] !== 0) { mazeCtx.moveTo(x+1, y+CELL-2); mazeCtx.lineTo(x+1, y+2); }
      mazeCtx.stroke();
    }
  }
}

function drawPacman(){
  let rot = 0;
  if (pacman.dir === DIR.LEFT) rot = Math.PI;
  else if (pacman.dir === DIR.UP) rot = -Math.PI/2;
  else if (pacman.dir === DIR.DOWN) rot = Math.PI/2;
  const mouthAngle = 0.15 + pacman.mouth*0.45;

  ctx.save();
  ctx.translate(pacman.x, pacman.y);
  ctx.rotate(rot);
  ctx.fillStyle = '#ffe14d';
  ctx.shadowColor = '#ffe14d';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0,0, CELL/2 - 1, mouthAngle*Math.PI, (2-mouthAngle)*Math.PI);
  ctx.lineTo(0,0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawGhost(g){
  const r = g.boss ? CELL * 0.72 : CELL/2 - 1;
  let color = g.color;
  if (g.eaten){
    drawEyes(g, r);
    return;
  }
  if (g.frightened){
    const flashing = frightTimer < 2 && Math.floor(frightTimer*8)%2===0;
    color = flashing ? '#ffffff' : '#2a2ad9';
  }
  if (g.boss && g.trail){
    ctx.save();
    ctx.fillStyle = '#ff5a46';
    g.trail.forEach(point => {
      ctx.globalAlpha = point.life * 1.6;
      ctx.beginPath();
      ctx.arc(point.x, point.y, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
  ctx.save();
  ctx.translate(g.x, g.y);
  if (g.boss) ctx.rotate(Math.sin(g.roll) * 0.12);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(0, -2, r, Math.PI, 0);
  ctx.lineTo(r, r-2);
  const waves = 4;
  for (let i=0;i<waves;i++){
    const wx = r - (i+0.5)*(2*r/waves);
    ctx.quadraticCurveTo(wx + (r/waves), r+ (i%2===0?4:-2), wx, r-2);
  }
  ctx.lineTo(-r, r-2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  if (g.boss){
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.strokeStyle = g.burstTimer > 0 ? '#ffb35c' : '#ff5a46';
    ctx.lineWidth = 2;
    ctx.globalAlpha = g.burstTimer > 0 ? 0.9 : 0.55;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, r - 1); ctx.lineTo(-r * 0.25, r + 4);
    ctx.moveTo(-r * 0.05, r - 1); ctx.lineTo(r * 0.25, r + 4);
    ctx.moveTo(r * 0.45, r - 1); ctx.lineTo(r * 0.7, r + 3);
    ctx.stroke();
    if (g.burstTimer > 0){
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, r + 7 + Math.sin(performance.now()/70)*2, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (g.boss && g.burstTimer > 0){
    ctx.save();
    ctx.strokeStyle = '#ff8b45';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(g.x, g.y, r + 4 + Math.sin(performance.now()/60)*2, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
  if (!g.frightened) drawEyes(g, r); else drawScaredEyes(g);
}

function drawEyes(g,r){
  const ex = g.dir.dx*2, ey = g.dir.dy*2;
  ctx.save();
  ctx.translate(g.x, g.y-2);
  for (const side of [-1,1]){
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(side*5, 0, 3.6, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#1a1a4d';
    ctx.beginPath();
    ctx.arc(side*5+ex, ey, 1.7, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawScaredEyes(g){
  ctx.save();
  ctx.translate(g.x, g.y-2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.6;
  for (const side of [-1,1]){
    ctx.beginPath();
    ctx.moveTo(side*5-2, -2); ctx.lineTo(side*5+2, 2);
    ctx.moveTo(side*5+2, -2); ctx.lineTo(side*5-2, 2);
    ctx.stroke();
  }
  ctx.restore();
}
