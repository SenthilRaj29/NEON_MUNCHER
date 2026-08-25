// ============================================================
// CONFIG — shared constants used by every other file.
// Loaded FIRST so everything below can rely on these existing.
// ============================================================
const CELL = 24;
const COLS = 19;
const ROWS = 21;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const mazeLayer = document.createElement('canvas');
mazeLayer.width = canvas.width;
mazeLayer.height = canvas.height;
const mazeCtx = mazeLayer.getContext('2d');
const levelBoards = new Image();
levelBoards.src = 'assets/level-boards.png';

const DIR = {
  UP:    {dx:0, dy:-1},
  DOWN:  {dx:0, dy:1},
  LEFT:  {dx:-1,dy:0},
  RIGHT: {dx:1, dy:0},
  NONE:  {dx:0, dy:0}
};

// Ghost house center tile & Pac-Man's spawn tile (grid coordinates).
const HOUSE_CENTER = {x:9, y:10};
const START_TILE   = {x:9, y:17};

// Converts a grid tile (tx, ty) to the pixel coordinate of its center.
function tileCenterPx(tx, ty){
  return { x: tx*CELL + CELL/2, y: ty*CELL + CELL/2 };
}
