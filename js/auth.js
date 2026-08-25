// ============================================================
// AUTH — Google Sign-In (client-side) with a Guest fallback.
//
// IMPORTANT: the GOOGLE_CLIENT_ID below is a placeholder. Google
// Sign-In will only actually render once you replace it with a
// real Client ID from your own Google Cloud project — see README.md
// for the exact steps. Until then, this screen automatically shows
// a note and Guest mode still works fully.
// ============================================================
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const API_BASE = window.NEON_API_BASE || 'http://localhost:3000/api';

async function apiAuth(path, body){
  const response = await fetch(`${API_BASE}/auth/${path}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function setAuthStatus(message){ document.getElementById('auth-status').textContent = message; }
function setStatus(id, message){ document.getElementById(id).textContent = message; }

async function submitLogin(event){
  event.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  try {
    const data = await apiAuth('login', {username, password});
    save.user = data.user;
    save.authToken = data.token;
    save.unlockedLevel = data.user.progress.unlockedLevel;
    const highScores = data.user.progress.highScores || {};
    save.highScores = Array.isArray(highScores) ? Object.fromEntries(highScores) : highScores;
    save.controlScheme = data.user.progress.controlScheme;
    persistSave();
    enterWelcome();
  } catch (error) { setAuthStatus(error.message.includes('fetch') ? 'Account server unavailable.' : error.message); }
}

async function registerPlayer(event){
  event.preventDefault();
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  if (password !== confirm) { setStatus('register-status', 'Passwords do not match.'); return; }
  try {
    const data = await apiAuth('register', {username, password});
    save.user = data.user;
    save.authToken = data.token;
    persistSave();
    enterWelcome();
  } catch (error) { setStatus('register-status', error.message.includes('fetch') ? 'Account server unavailable.' : error.message); }
}

async function requestPasswordReset(){
  const username = document.getElementById('forgot-username').value.trim();
  if (!username) { setStatus('forgot-status', 'Enter your username first.'); return; }
  try {
    const data = await apiAuth('forgot-password', {username});
    setStatus('forgot-status', data.resetCode ? `Reset code: ${data.resetCode}` : data.message);
  } catch (error) { setStatus('forgot-status', error.message.includes('fetch') ? 'Account server unavailable.' : error.message); }
}

async function resetPassword(event){
  event.preventDefault();
  try {
    const data = await apiAuth('reset-password', {
      username:document.getElementById('forgot-username').value.trim(),
      code:document.getElementById('reset-code').value.trim(),
      password:document.getElementById('reset-password').value
    });
    setStatus('forgot-status', data.message);
  } catch (error) { setStatus('forgot-status', error.message.includes('fetch') ? 'Account server unavailable.' : error.message); }
}

function togglePassword(event){
  const button = event.currentTarget;
  const input = button.parentElement.querySelector('input');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  button.setAttribute('aria-pressed', String(!showing));
  button.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
}

document.getElementById('auth-form').addEventListener('submit', submitLogin);
document.getElementById('register-form').addEventListener('submit', registerPlayer);
document.getElementById('request-reset-btn').addEventListener('click', requestPasswordReset);
document.getElementById('forgot-form').addEventListener('submit', resetPassword);
document.querySelectorAll('.password-toggle').forEach(button => button.addEventListener('click', togglePassword));

// Decodes the payload of a Google ID token (JWT) purely to read the
// name/email/picture for display. This is fine for a client-only game;
// a production app with a real backend should verify the token server-side
// instead of trusting the decoded payload.
function decodeJwt(token){
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
  );
  return JSON.parse(json);
}

function handleGoogleCredential(response){
  const payload = decodeJwt(response.credential);
  save.user = { name: payload.name, email: payload.email, picture: payload.picture, provider: 'google' };
  persistSave();
  enterWelcome();
}

function continueAsGuest(){
  save = defaultSave();
  try { localStorage.removeItem(STORAGE_KEY); } catch(e){ /* storage unavailable */ }
  save.user = { name: 'Guest', picture: null, provider: 'guest' };
  persistSave();
  enterWelcome();
}

function initGoogleSignIn(){
  const container = document.getElementById('google-btn-container');
  const configured = window.google && window.google.accounts && !GOOGLE_CLIENT_ID.startsWith('YOUR_');
  if (!configured){
    container.innerHTML = '';
    return;
  }
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
  google.accounts.id.renderButton(container, { theme:'filled_black', size:'large', shape:'pill', text:'continue_with', width:240 });
}

// The Google script tag is async, so it may not exist yet when this
// file runs. Poll briefly, then fall back to a friendly message.
function waitForGoogle(retries = 20){
  if (window.google && window.google.accounts){
    initGoogleSignIn();
  } else if (retries > 0){
    setTimeout(() => waitForGoogle(retries - 1), 150);
  } else {
    document.getElementById('google-btn-container').innerHTML = '';
  }
}
