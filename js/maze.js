// ============================================================
// MAZE GENERATION
// 0 = wall, 1 = pellet, 2 = power pellet, 3 = open (no pellet)
//
// buildMaze(variant) builds distinct connected corridor silhouettes.
// ============================================================
let grid = [];
const MAZE_VARIANTS = 9;

function teethTypeForVariant(c, variant){
  switch(variant){
    case 0: return c % 2 === 0;                    // classic alternating teeth
    case 1: return c % 2 === 1;                     // mirrored alternating teeth
    case 2: return Math.floor(c / 2) % 2 === 0;      // double-width teeth
    case 3: return Math.floor((c + 1) / 2) % 2 === 0; // double-width, shifted
    default: return c % 2 === 0;
  }
}

function buildMaze(variant = 0, profile = 'full'){
  grid = Array.from({length:ROWS}, () => Array(COLS).fill(0));
  const open = (r,c,v=1) => { grid[r][c] = v; };

  const bounds = {
    compact: {left:5, right:13, top:3, bottom:17},
    small: {left:3, right:15, top:2, bottom:18},
    medium: {left:2, right:16, top:1, bottom:19},
    full: {left:1, right:17, top:1, bottom:19}
  }[profile] || {left:1, right:17, top:1, bottom:19};

  if (profile !== 'full'){
    for (let c=bounds.left;c<=bounds.right;c++){ open(bounds.top,c); open(bounds.bottom,c); }
    for (let r=bounds.top;r<=bounds.bottom;r++){ open(r,bounds.left); open(r,bounds.right); }
    for (let r=bounds.top;r<=bounds.bottom;r++) open(r,9);
    for (let c=bounds.left;c<=bounds.right;c++) open(10,c);
    const pattern = variant % 4;
    if (pattern === 0 || pattern === 2){
      for (let c=bounds.left+1;c<bounds.right;c+= pattern === 0 ? 4 : 3){
        for (let r=bounds.top+1;r<bounds.bottom;r++) open(r,c);
      }
    }
    if (pattern === 1 || pattern === 2){
      for (let r=bounds.top+3;r<bounds.bottom;r+= pattern === 1 ? 5 : 4){
        for (let c=bounds.left+1;c<bounds.right;c++) open(r,c);
      }
    }
    if (pattern === 3){
      for (let r=bounds.top+2;r<bounds.bottom;r+=4){
        for (let c=bounds.left+1;c<bounds.right;c++) open(r,c);
      }
      for (let c=bounds.left+2;c<bounds.right;c+=4){
        for (let r=bounds.top+1;r<bounds.bottom;r++) open(r,c);
      }
    }
    for (let r=9;r<=11;r++) for (let c=8;c<=10;c++) grid[r][c] = 3;
    for (let r=9;r<=11;r++){ grid[r][7]=0; grid[r][11]=0; }
    grid[8][8]=0; grid[8][10]=0;
    grid[12][8]=0; grid[12][10]=0;
    grid[bounds.top][bounds.left]=2;
    grid[bounds.top][bounds.right]=2;
    grid[bounds.bottom][bounds.left]=2;
    grid[bounds.bottom][bounds.right]=2;
    return;
  }

  for (let c=1;c<=17;c++){ open(1,c); open(19,c); }
  for (let r=1;r<=19;r++){ open(r,1); open(r,17); }

  const corridors = [
    [[5, 15], [3, 7, 11, 15]],
    [[4, 10, 16], [4, 8, 12, 16]],
    [[6, 14], [3, 6, 9, 12, 15]],
    [[3, 9, 17], [5, 9, 13]],
    [[5, 10, 15], [2, 6, 10, 14, 16]],
    [[4, 8, 12, 16], [3, 9, 15]],
    [[6, 10, 14], [2, 5, 8, 12, 15, 18]],
    [[3, 7, 13, 17], [4, 10, 16]],
    [[5, 9, 15], [2, 7, 11, 16]]
  ][variant % 9];
  for (const r of corridors[0]) for (let c=1;c<=17;c++) open(r,c);
  for (const c of corridors[1]) for (let r=1;r<=19;r++) open(r,c);

  // A central route ties each silhouette together without making every
  // level share the same cross-shaped layout.
  for (let r=1;r<=19;r++) open(r,9);
  for (let c=3;c<=15;c++) open(10,c);

  // Ghost house — small open box in the center, walled except for a
  // door directly above and below it on column 9.
  for (let r=9;r<=11;r++) for (let c=8;c<=10;c++) grid[r][c] = 3;
  grid[8][8]=0; grid[8][10]=0;
  grid[12][8]=0; grid[12][10]=0;
  for (let r=9;r<=11;r++){ grid[r][7]=0; grid[r][11]=0; }

  // Power pellets in the four corners of the open area.
  grid[1][1]=2; grid[1][17]=2; grid[19][1]=2; grid[19][17]=2;
}
buildMaze(0);

function countPellets(){
  let n=0;
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (grid[r][c]===1||grid[r][c]===2) n++;
  return n;
}
let totalPellets = countPellets();

function canWalk(tx,ty){
  if (ty<0||ty>=ROWS||tx<0||tx>=COLS) return false;
  return grid[ty][tx] !== 0;
}
