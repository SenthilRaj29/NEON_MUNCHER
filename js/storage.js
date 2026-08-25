// ============================================================
// STORAGE — persists login, chosen controls, unlocked levels,
// and high scores in the browser via localStorage.
// This only works when the game is actually run from your own
// files (localhost / a real domain) — not inside an in-chat preview.
// ============================================================
const STORAGE_KEY = 'neonMuncherSave';

function defaultSave(){
  return {
    user: null,              // { name, email, picture, provider } or null
    authToken: null,
    controlScheme: 'both',   // 'arrows' | 'wasd' | 'both'
    unlockedLevel: 1,        // highest level the player may play
    highScores: {}           // { [levelNumber]: bestScore }
  };
}

function loadSave(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    return { ...defaultSave(), ...JSON.parse(raw) };
  } catch(e){
    return defaultSave();
  }
}

let save = loadSave();

function persistSave(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); } catch(e){ /* storage unavailable */ }
  syncProgress();
}

function signOutPlayer(){
  if (save.user?.provider === 'guest'){
    save = defaultSave();
    try { localStorage.removeItem(STORAGE_KEY); } catch(e){ /* storage unavailable */ }
    return;
  }
  save.user = null;
  save.authToken = null;
  persistSave();
}

function syncProgress(){
  if (!save.authToken || save.user?.provider !== 'password') return;
  fetch(`${window.NEON_API_BASE || 'http://localhost:3000/api'}/progress`, {
    method:'PUT',
    headers:{'Content-Type':'application/json', Authorization:`Bearer ${save.authToken}`},
    body:JSON.stringify({progress:{unlockedLevel:save.unlockedLevel, highScores:save.highScores, controlScheme:save.controlScheme}})
  }).catch(() => {});
}

function unlockLevel(n){
  if (n > save.unlockedLevel){
    save.unlockedLevel = n;
    persistSave();
  }
}

function recordScore(levelNum, scoreValue){
  if (!save.highScores[levelNum] || scoreValue > save.highScores[levelNum]){
    save.highScores[levelNum] = scoreValue;
    persistSave();
  }
}
