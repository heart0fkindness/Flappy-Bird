# Flappy Bird (Canvas + JavaScript)

A lightweight Flappy Bird clone built with plain JavaScript and HTML5 Canvas.

## Run locally

- Open `index.html` directly in your browser, or
- Serve the folder and visit `http://localhost:8080`:

```bash
python -m http.server 8080
```

PowerShell alternative (if Node.js installed):

```powershell
npx serve -s . -l 8080
```

## Controls

- Space / Arrow Up / Click / Tap: Flap
- Enter: Restart on Game Over

## Files

- `index.html` — page shell and wiring
- `style.css` — responsive layout and HUD styling
- `game.js` — game loop, physics, pipes, collisions, scoring

## Notes

Best score persists in `localStorage` under `flappy_best`.

