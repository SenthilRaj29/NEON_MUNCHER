// ============================================================
// SCREENS — switches between login / high scores / game, renders
// the level grid, and wires up every button that isn't part of the
// live game loop itself.
// ============================================================
const screenEls = {
  login:  document.getElementById('screen-login'),
  register: document.getElementById('screen-register'),
  forgot: document.getElementById('screen-forgot'),
  welcome: document.getElementById('screen-welcome'),
  home: document.getElementById('screen-home'),
  highscores: document.getElementById('screen-highscores'),
  game:   document.getElementById('screen-game'),
};

function showScreen(name){
  Object.entries(screenEls).forEach(([key, el]) => el.classList.toggle('hidden', key !== name));
  document.body.classList.toggle('game-active', name === 'game');
  if (name !== 'game') { stopMusic(); stopGhostMove(); stopEffects(); }
}

function renderPlayerBadge(){
  const el = document.getElementById('player-badge');
  if (!save.user){ el.innerHTML = ''; return; }
  const avatar = save.user.picture ? `<img src="${save.user.picture}" alt="">` : '';
  el.innerHTML = `${avatar}<span>${save.user.name}</span>`;
}

function renderHighScores(){
  const grid = document.getElementById('highscore-grid');
  const progress = document.getElementById('score-progress');
  const playedLevels = Object.keys(save.highScores).length;
  progress.textContent = `${playedLevels} / ${TOTAL_LEVELS} PLAYED`;
  let html = '';
  for (let n=1; n<=TOTAL_LEVELS; n++){
    const twist = n % 5 === 0;
    const best = save.highScores[n] || 0;
    html += `
      <div class="score-row ${twist ? 'twist' : ''}">
        <strong>LEVEL ${n}</strong>
        <span>${best ? 'BEST RUN' : 'NOT PLAYED'}</span>
        <b>${best || 'NO SCORE'}</b>
      </div>`;
  }
  grid.innerHTML = html;
}

function enterHighScores(){
  renderPlayerBadge();
  renderHighScores();
  showScreen('highscores');
}

function enterHome(){
  document.getElementById('home-name').textContent = save.user?.name || 'PLAYER';
  document.getElementById('home-play-level').textContent = save.unlockedLevel;
  document.getElementById('home-progress-label').textContent = `LEVEL ${save.unlockedLevel} / ${TOTAL_LEVELS}`;
  const map = document.getElementById('progress-map');
  const status = document.getElementById('career-status');
  status.textContent = '';
  window.renderAdventureMap3D(map, save.unlockedLevel, TOTAL_LEVELS, (level, levelState) => {
    if (levelState === 'locked'){
      status.textContent = `Complete previous level first.`;
      return;
    }
    status.textContent = '';
    startLevel(level);
  });
  showScreen('home');
}

function enterWelcome(){
  document.getElementById('welcome-name').textContent = save.user?.name || 'PLAYER';
  showScreen('welcome');
}

// ----- Login screen wiring -----
document.getElementById('guest-btn').addEventListener('click', continueAsGuest);
document.getElementById('welcome-continue').addEventListener('click', enterHome);
document.getElementById('home-play').addEventListener('click', () => startLevel(save.unlockedLevel));
document.getElementById('home-highscores').addEventListener('click', enterHighScores);
document.getElementById('home-settings-toggle').addEventListener('click', () => {
  document.getElementById('home-settings').classList.toggle('hidden');
  document.querySelectorAll('[data-home-action]').forEach(button => {
    button.textContent = `${button.dataset.homeAction.toUpperCase()}: ${button.dataset.homeAction === 'sound' ? (audioEnabled ? 'ON' : 'OFF') : (musicEnabled ? 'ON' : 'OFF')}`;
  });
});
document.querySelectorAll('[data-home-action]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.homeAction === 'sound') toggleAudio();
  else toggleMusic();
  button.textContent = `${button.dataset.homeAction.toUpperCase()}: ${button.dataset.homeAction === 'sound' ? (audioEnabled ? 'ON' : 'OFF') : (musicEnabled ? 'ON' : 'OFF')}`;
}));
document.getElementById('home-signout').addEventListener('click', () => { signOutPlayer(); showScreen('login'); });
document.getElementById('register-btn').addEventListener('click', () => showScreen('register'));
document.getElementById('forgot-btn').addEventListener('click', () => showScreen('forgot'));
document.querySelectorAll('[data-auth-screen]').forEach(button => {
  button.addEventListener('click', () => showScreen(button.dataset.authScreen));
});

// ----- High score screen wiring -----
document.getElementById('highscores-career-btn').addEventListener('click', enterHome);

// ----- In-game overlay button delegation (Resume / Retry / Next / etc.) -----
const overlayEl = document.getElementById('overlay');
overlayEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'resume') resumeGame();
  if (action === 'bossstart') beginCountdown();
  if (action === 'restart') startLevel(currentLevel);
  if (action === 'mainmenu') { hideOverlay(); enterHome(); }
  if (action === 'next') startLevel(Math.min(currentLevel + 1, TOTAL_LEVELS));
  if (action === 'sound' || action === 'music') {
    if (action === 'sound') toggleAudio();
    else toggleMusic();
    showOverlay('PAUSED', 'Take a breath.', [
      {label:'RESUME', action:'resume'},
      {label:'MAIN MENU', action:'mainmenu'}
    ], false, true);
  }
});

function showOverlay(title, msg, buttons = [], showScore = false, showControls = false, progressLevel = 0){
  const buttonsHtml = buttons.map(b => `<button class="pill-btn" data-action="${b.action}">${b.label}</button>`).join('');
  const progressHtml = progressLevel ? `<div class="level-progress-bar" aria-label="Level ${progressLevel} complete"><span style="width:${Math.round(progressLevel / TOTAL_LEVELS * 100)}%"></span></div><small>LEVEL ${progressLevel} / ${TOTAL_LEVELS} COMPLETE</small>` : '';
  overlayEl.innerHTML = `
    <h2>${title}</h2>
    <p>${msg}</p>
    ${showControls ? `<div class="pause-controls"><strong>HELP & CONTROLS</strong><span><b>ARROWS / WASD</b> MOVE</span><span><b>P / ESC</b> RESUME</span><span><b>ENTER</b> CONFIRM</span><button class="audio-toggle" data-action="sound">SOUND: ${audioEnabled ? 'ON' : 'OFF'}</button><button class="audio-toggle" data-action="music">MUSIC: ${musicEnabled ? 'ON' : 'OFF'}</button></div>` : ''}
    ${showScore ? `<div class="score-final">SCORE ${score}</div>` : ''}
    ${progressHtml}
    <div class="overlay-buttons">${buttonsHtml}</div>
  `;
  overlayEl.classList.remove('hidden');
}
function hideOverlay(){ overlayEl.classList.add('hidden'); }

// Boot straight into the login screen and kick off the Google check.
showScreen('login');
waitForGoogle();
