# McPaint

A humble macOS desktop image editor, inspired by Paint.NET.

---

## The Story

We love Paint.NET. It's fast, simple, and gets out of your way. For years, it's been the go-to image editor on Windows — compact, capable, and just works.

There's nothing quite like it on macOS. So we started asking: what if we could bring that same spirit to the Mac? Not a clone. Not a port. Just a small, honest attempt to capture the feeling — a lightweight desktop image editor that feels at home on macOS, built with the same tools that power VS Code.

That's McPaint. It's not trying to replace Photoshop, GIMP, or even Paint.NET itself. It's just a little app, made with care, for people who want to draw, edit, and tinker without everything feeling heavy.

---

## How It's Built

- **Electron** — the same framework VS Code uses
- **TypeScript** — typed, clean, maintainable
- **Vanilla components** — no heavy UI frameworks, just DOM
- **HTML5 Canvas** — for all drawing and compositing
- **macOS native feel** — hiddenInset titlebar, vibrancy, traffic lights

---

## About This Repository

This repository is **maintained entirely by an AI coding agent**.

No human commits directly. The agent writes, reviews, builds, and maintains all code — including this README. It pushes commits, opens pull requests, and keeps the project healthy.

If you're reading this as a human: welcome! You're free to browse, fork, learn from, or use the code however you like under the [MIT License](LICENSE). But please know that contributions, pull requests, and issues are handled by the agent.

### Repository Rules

- **Commits** — Only the AI agent commits to this repo.
- **Pull Requests** — Created and merged by the agent.
- **Maintenance** — The agent keeps dependencies updated and fixes bugs.
- **No human contributors** — This is not exclusionary; it's just how the project works. The agent is the maintainer.

These rules exist so the project stays focused, consistent, and manageable. The goal isn't to build a community project — it's to build a good app, steadily, over time.

---

## Features

- 22 drawing tools (brush, pencil, eraser, shapes, fill, gradient, clone, text, and more)
- Selection tools with marching ants (rectangle, lasso, magic wand, ellipse)
- Full layer system with 14 blend modes, opacity, visibility, and reordering
- Unlimited undo/redo history
- Color wheel, palette, RGBA sliders, hex input, primary/secondary swatches
- Image effects (blur, sharpen, edge detect, emboss, pixelate, invert, sepia, B&W)
- Image transforms (flip, rotate, resize, canvas size, crop)
- Floating draggable panels (Tools, Colors, Layers, History)
- Dark and light themes
- Keyboard shortcuts for every tool
- Tabbed multi-document interface
- Native macOS titlebar
- Clipboard support (copy/cut/paste)
- File open/save for PNG, JPEG, WebP

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/austinwin/mcpaint.git
cd mcpaint

# Install dependencies
npm install

# Build and run
npm run build && npm start
```

**Requirements:** Node.js 18+, npm, and a Mac (the app uses macOS-specific window styling).

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run build` | Build main + renderer |
| `npm start` | Launch the app |
| `npm run build:main` | Build Electron main process only |
| `npm run build:renderer` | Bundle the renderer with webpack |

---

## License

MIT — see [LICENSE](LICENSE). Do what you want with it.

---

## Acknowledgments

- Inspired by [Paint.NET](https://www.getpaint.net/) — the best little image editor on Windows
- Built with [Electron](https://www.electronjs.org/)
- Made by an AI agent, for humans who just want to draw
