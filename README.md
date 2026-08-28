# majeed.dev — personal site

Static, dependency-free at runtime. No build step, no framework, no tracking.
Three.js is vendored locally so the whole thing is `git clone` → serve.

```bash
python3 -m http.server 4321      # then open http://localhost:4321
```

## What's in it

| | |
|---|---|
| **Boot sequence** | Typed terminal cold-open, skippable on click or `Esc` |
| **Hero** | 2,600-point Three.js constellation, pointer-parallax, scroll-driven camera dolly |
| **Glyph Hunter** | Playable 3D mini-game — match Indus-script signs against the clock. Raycast hit detection, combo multiplier, `localStorage` high score |
| **Command palette** | `⌘K` / `Ctrl+K` — fuzzy nav, copy-email, repo links |
| **Easter egg** | Konami code |

## Structure

```
index.html          markup
css/style.css       all styling, CSS-variable themed
js/main.js          boot, reveals, cursor, palette, marquee, clock
js/scene.js         hero WebGL point cloud
js/game.js          Glyph Hunter
js/glyphs.js        Indus sign polylines + 2D canvas renderer
vendor/             three.js r185 (MIT), vendored
```

## Glyphs

The twelve signs are polyline reductions of common Indus Valley inscriptions.
The script is undeciphered — there is no agreed reading for any of them. That
is the point of the game, and of
[indus-valley-ai](https://github.com/Majeedkhan05/indus-valley-ai).

## Accessibility

Honours `prefers-reduced-motion` (WebGL animation loops stop, boot still
completes). Custom cursor disabled on touch. Nav collapses under 640px.

## Deploy

Any static host. No environment variables, no server.

```bash
npx vercel --prod          # or: drag the folder into Netlify
```

For GitHub Pages: Settings → Pages → deploy from `main` / root.
