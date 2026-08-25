# Neon Muncher

Neon Muncher is a browser-based Pac-Man-style arcade game built with vanilla JavaScript. It combines an HTML/CSS interface, a Canvas game board, procedural levels, a Three.js career map, local audio effects, browser saves, optional Google sign-in, and an Node.js/MongoDB API.

## Features

- 50 levels with increasing speed and difficulty.
- Pac-Man movement, pellets, power pellets, frightened ghosts, lives, scoring, and level completion.
- Blinky, Pinky, Inky, and Clyde ghost behaviors.
- Boss/twist levels on every fifth level with reversed controls.
- Three.js career roadmap with locked-level protection, colored zones, gaps, and wooden bridges.
- Per-level high scores shown in horizontal records.
- Guest mode using localStorage.
- Optional username/password accounts with MongoDB and JWT sessions.
- Optional Google Identity Services login.
- Local MP3 effects with queued playback to avoid overlapping sounds.
- Optional YouTube background music.

## Technology Stack

### Frontend

- HTML5 for screens, forms, overlays, and the game shell.
- CSS3 for the arcade cabinet design, neon visuals, responsive layout, HUD, and controls.
- Vanilla JavaScript with no frontend framework or bundler.
- HTML5 Canvas 2D for the maze, Pac-Man, ghosts, pellets, and gameplay rendering.
- Three.js `0.185.1` for the interactive 3D career roadmap.
- Web Audio API for generated fallback effects and boss cues.
- HTML Audio for local MP3 effects.
- `localStorage` for guest saves, unlocked levels, preferences, and high scores.

### Backend

- Node.js with ES modules.
- Express for the HTTP API.
- MongoDB with Mongoose for account and progress storage.
- bcryptjs for password hashing.
- JSON Web Tokens for authenticated requests.
- CORS and dotenv for API configuration.


## Architecture

`index.html` defines the login, registration, password reset, home, high-score, and game screens. Scripts are loaded in dependency order, with `main.js` loaded last because it starts the animation loop.

The game loop updates Pac-Man, ghost AI, collisions, timers, score, lives, audio, and Canvas drawing. `startLevel()` generates a level configuration and maze. Completing a level records the best score and unlocks the next level. The home screen renders the Three.js career map, while the high-score screen renders all 50 saved records.

## Project Structure

```text
neon-muncher/
├── index.html                 Application screens and script loading order
├── package.json               Dependencies and npm start command
├── package-lock.json          Locked dependency versions
├── README.md                  GitHub documentation
├── README-PRIVATE.md          Personal build and maintenance guide
├── css/style.css              Arcade layout, theme, responsive UI, and map styles
├── js/config.js               Grid constants, Canvas contexts, directions, helpers
├── js/storage.js              localStorage saves and API progress synchronization
├── js/maze.js                 Maze variants, walls, and pellet placement
├── js/audio.js                Local effects, Web Audio fallback, and music controls
├── js/render.js               Canvas rendering
├── js/pacman.js               Player movement, pellets, and level completion
├── js/ghosts.js               Ghost AI and boss behavior
├── js/levels.js               Procedural configuration for all 50 levels
├── js/auth.js                 Guest, Google, and username/password authentication
├── js/screens.js              Screen switching and UI event wiring
├── js/main.js                 Game states, loop, pause, failure, and completion flow
├── js/adventure-map-3d.js     Three.js career roadmap
├── assets/                    Images and local MP3 effects
└── server/server.js           Express, MongoDB, auth, and progress API
```

## Run the Frontend

Use an HTTP server. Opening `index.html` directly with `file://` can break ES modules, assets, local storage behavior, and the Three.js map.

### VS Code Live Server

1. Open the folder in VS Code.
2. Install the Live Server extension.
3. Right-click `index.html` and choose **Open with Live Server**.
4. Open the displayed URL, normally `http://127.0.0.1:5500`.

### Python Server

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

Guest mode works without MongoDB or Google setup. Guest progress is stored only in the current browser.

## Run the Optional API

Install Node.js and MongoDB, then run:

```bash
npm install
copy .env.example .env
npm start
```

Set the environment values before starting:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/neon_muncher
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000
CLIENT_ORIGIN=http://127.0.0.1:5500
```

The API listens on `http://localhost:3000` and provides registration, login, password reset, and authenticated progress endpoints under `/api`.

Never commit `.env`, database credentials, JWT secrets, or production client secrets.

## Authentication and Persistence

- Guest login creates a local profile and does not call the API.
- Password login uses Express, bcryptjs, MongoDB, and JWT.
- Account progress includes unlocked levels, high scores, and control preferences.
- Google login is optional and currently reads display information from the browser token. Production applications should verify Google tokens server-side.
- Replace the placeholder client ID in `js/auth.js` and register the exact frontend origin in Google Cloud Console to enable Google login.

## Gameplay Systems

### Level generation

`js/levels.js` generates each level from its number. It controls maze profile, maze variant, Pac-Man speed, ghost speed, frightened duration, release delays, visual theme, and boss behavior.

### Maze and loop

The board uses a 19 by 21 tile grid with 24-pixel cells. `pacman.js` moves between tile centers, eats pellets, activates frightened mode, and detects completion. `ghosts.js` updates the four personalities and boss ghost. `main.js` coordinates the game states and `requestAnimationFrame` loop.

### Career roadmap

`js/adventure-map-3d.js` creates the interactive Three.js map. Completed/current levels can be selected, locked levels show a small previous-level message, and the path uses these zones:

- Levels 1–10: orange.
- Levels 11–25: cyan.
- Levels 26–35: violet.
- Levels 36–45: yellow.
- Levels 46–50: crimson danger path.

Wooden bridges connect selected transitions. The 25–26 bridge was removed, and the 35–36 transition contains a larger gap with a bridge below the numbered markers.

### Audio

Local MP3 effects are loaded from `assets/`. One-shot effects use a queue so sounds play in order. Chomp playback is shortened and canceled when gameplay stops. Ghost ambience loops independently at reduced volume. The YouTube background theme is controlled separately by the Music setting.

## Controls

- Move: Arrow keys, `WASD`, or both.
- Pause/resume: `P` or `Esc`.
- Confirm: `Enter`.
- Every fifth level reverses controls.

## Validation

```bash
node --check js/audio.js
node --check js/adventure-map-3d.js
node --check js/screens.js
node --check js/main.js
node --check js/pacman.js
```

Also test guest login, career-map rendering, locked-level feedback, gameplay, pause, level completion, audio toggles, high scores, and API login when MongoDB is available.

## Deployment Notes

The frontend can be deployed to static hosting such as GitHub Pages if local asset paths remain valid. Deploy the optional API separately with MongoDB and a matching `CLIENT_ORIGIN`. Set `window.NEON_API_BASE` when the API is not on localhost.

For public deployment, prefer replacing the YouTube theme with a properly licensed local music file.

## Future Improvements

- Add touch controls or an on-screen D-pad.
- Add automated browser tests.
- Verify Google credentials server-side.
- Add multiple score entries or a shared leaderboard.
- Add authored boss layouts and more maze variants.
