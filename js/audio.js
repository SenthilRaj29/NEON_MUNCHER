// ============================================================
// AUDIO — provided arcade tracks with WebAudio fallback effects.
// ============================================================
let actx = null;
let audioEnabled = true;
let musicEnabled = true;
const BGM_VIDEO_ID = 'BxYzjjs6d1s';
let bgmPlayer = null;
let musicShouldPlay = false;
let bossSoundTimer = 0;
let effectQueue = [];
let effectPlaying = false;
let effectPlayingKey = '';
let effectGeneration = 0;
const trackFiles = {
  chomp: 'assets/03. PAC-MAN - Eating The Pac-dots.mp3',
  ghostMove: 'assets/06. Ghost - Normal Move.mp3',
  power: 'assets/11. PAC-MAN - Eating The Fruit.mp3',
  death: 'assets/15. Fail.mp3'
};
const tracks = Object.fromEntries(Object.entries(trackFiles).map(([name, source]) => {
  const track = new Audio(source);
  track.preload = 'auto';
  return [name, track];
}));
const ghostMoveTrack = tracks.ghostMove;
ghostMoveTrack.loop = true;
ghostMoveTrack.volume = .22;

function drainEffectQueue(){
  if (effectPlaying || !audioEnabled || !effectQueue.length) return;
  const effect = effectQueue.shift();
  effectPlaying = true;
  effectPlayingKey = effect.key;
  const generation = effectGeneration;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (generation !== effectGeneration) return;
    effectPlaying = false;
    effectPlayingKey = '';
    drainEffectQueue();
  };
  try{
    const result = effect.run(finish);
    if (result?.catch) result.catch(finish);
  }catch(e){ finish(); }
}

function queueEffect(run, key = ''){
  if (!audioEnabled) return;
  // Pellet sounds can be triggered many times per second; avoid an audible backlog.
  if (key === 'chomp' && (effectPlayingKey === key || effectQueue.some(effect => effect.key === key))) return;
  effectQueue.push({run, key});
  if (effectQueue.length > 12) effectQueue.splice(0, effectQueue.length - 12);
  drainEffectQueue();
}

function playTrack(name, fallback){
  const track = tracks[name];
  if (track){
    queueEffect(done => {
      track.currentTime = 0;
      track.onended = done;
      track.onerror = done;
      const playback = track.play();
      if (name === 'chomp') window.setTimeout(() => {
        track.pause();
        track.currentTime = 0;
        done();
      }, 180);
      if (playback) playback.catch(done);
      return playback;
    }, name);
    return true;
  }
  if (fallback) queueEffect(done => fallback(done));
  return false;
}

function startGhostMove(){
  if (!audioEnabled) return;
  try{
    const playback = ghostMoveTrack.play();
    if (playback) playback.catch(() => {});
  }catch(e){ /* browser blocked audio until interaction */ }
}

function stopGhostMove(){
  ghostMoveTrack.pause();
  ghostMoveTrack.currentTime = 0;
}

function stopEffects(){
  effectGeneration++;
  effectQueue = [];
  effectPlaying = false;
  effectPlayingKey = '';
  Object.values(tracks).forEach(track => { track.pause(); track.currentTime = 0; track.onended = null; track.onerror = null; });
}

function stopChomp(){
  effectQueue = effectQueue.filter(effect => effect.key !== 'chomp');
  if (effectPlayingKey !== 'chomp') return;
  const track = tracks.chomp;
  track.pause();
  track.currentTime = 0;
  effectPlaying = false;
  effectPlayingKey = '';
  drainEffectQueue();
}

function audio(){
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}

function playMelody(notes){
  queueEffect(done => {
    try{
      const ac = audio();
      const start = ac.currentTime;
      let end = start;
      notes.forEach(note => {
        const t0 = start + note.delay;
        end = Math.max(end, t0 + note.duration);
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = note.type || 'square';
        osc.frequency.setValueAtTime(note.frequency, t0);
        gain.gain.setValueAtTime(note.volume ?? .06, t0);
        gain.gain.exponentialRampToValueAtTime(.0001, t0 + note.duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + note.duration + .02);
      });
      window.setTimeout(done, Math.max(0, (end - start) * 1000 + 30));
    }catch(e){ done(); }
  });
}

const sfx = {
  chomp:    () => { if (!playTrack('chomp')) playMelody([{frequency:220 + Math.random()*40, duration:.05, volume:.04, delay:0}]); },
  power:    () => { if (!playTrack('power')) playMelody([{frequency:140,duration:.15,type:'sawtooth',volume:.05,delay:0},{frequency:220,duration:.15,type:'sawtooth',volume:.05,delay:.12}]); },
  eatGhost: () => playMelody([440,660,880,1100].map((frequency, i) => ({frequency,duration:.08,volume:.06,delay:i*.06}))),
  death:    () => { if (!playTrack('death')) playMelody([400,320,240,160,90].map((frequency, i) => ({frequency,duration:.14,type:'sawtooth',volume:.07,delay:i*.1}))); },
  levelFail: () => {
    stopMusic(); stopGhostMove(); stopEffects();
    if (!playTrack('death')) playMelody([440,360,280,210,130,75].map((frequency, i) => ({frequency,duration:.2,type:'sawtooth',volume:.08,delay:i*.12})));
  },
  congratulations: () => {
    stopMusic(); stopGhostMove(); stopEffects();
    playMelody([523,659,784,1047,1319,1568].map((frequency, i) => ({frequency,duration:.18,volume:.07,delay:i*.11})).concat([784,1047,1319].map((frequency, i) => ({frequency,duration:.28,type:'triangle',volume:.045,delay:.72 + i*.12}))));
  },
  start:    () => { playMelody([220,330,440,660].map((frequency, i) => ({frequency,duration:.09,volume:.05,delay:i*.08}))); startMusic(); },
  levelUp:  () => playMelody([440,554,660,880,1108].map((frequency, i) => ({frequency,duration:.1,volume:.06,delay:i*.07})))
};

function startMusic(){
  musicShouldPlay = true;
  if (bgmPlayer && typeof bgmPlayer.playVideo === 'function' && musicEnabled) bgmPlayer.playVideo();
}
function stopMusic(){
  musicShouldPlay = false;
  if (bgmPlayer && typeof bgmPlayer.pauseVideo === 'function') bgmPlayer.pauseVideo();
}

function createBgmPlayer(){
  if (!window.YT || !YT.Player || bgmPlayer) return;
  bgmPlayer = new YT.Player('bgm-player', {
    videoId:BGM_VIDEO_ID,
    playerVars:{autoplay:0, controls:0, disablekb:1, loop:1, playlist:BGM_VIDEO_ID, playsinline:1, origin:window.location.origin},
    events:{onReady:() => {
      const iframe = document.querySelector('#bgm-player iframe');
      if (iframe) iframe.setAttribute('allow', 'autoplay; encrypted-media');
      if (musicShouldPlay && musicEnabled) bgmPlayer.playVideo();
    }}
  });
}

window.onYouTubeIframeAPIReady = createBgmPlayer;
if (window.YT && YT.Player) createBgmPlayer();

function toggleAudio(){
  audioEnabled = !audioEnabled;
  if (!audioEnabled) stopEffects();
  return audioEnabled;
}
function toggleMusic(){
  musicEnabled = !musicEnabled;
  if (musicEnabled && musicShouldPlay) startMusic();
  else stopMusic();
  return musicEnabled;
}

function updateBossChaseAudio(active){
  if (!active){ bossSoundTimer = 0; return; }
  bossSoundTimer -= 1 / 60;
  if (bossSoundTimer > 0) return;
  bossSoundTimer = .72;
  playMelody([{frequency:92,duration:.18,type:'sawtooth',volume:.08,delay:0},{frequency:58,duration:.24,volume:.05,delay:.12}]);
}
