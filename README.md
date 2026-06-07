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

### Working
- 22 drawing tools — Brush, Pencil, Eraser, Paint Bucket, Gradient, Color Picker, Clone Stamp, Recolor, Text, Line, Rectangle, Rounded Rectangle, Ellipse, Freeform Shape
- Selection tools — Rectangle Select, Lasso Select, Ellipse Select, Magic Wand (bounding-box), Select All, Deselect, Fill Selection, Clear Selection, Crop to Selection
- Layer system — Add, Delete, Duplicate, Merge Down, Move Up/Down, Flatten, 14 blend modes, opacity, visibility toggle, layer renaming, thumbnails
- Unlimited undo/redo history with named entries, jump-to-entry, clear
- Color system — Color wheel, 32-color palette, Primary/Secondary swatches with swap, RGBA sliders, Hex input, expandable More/Less
- Image effects — Gaussian Blur, Sharpen, Edge Detect, Emboss, Pixelate, Invert Colors, Black & White, Sepia
- Image transforms — Flip Horizontal/Vertical, Rotate 90° CW/CCW, Resize, Canvas Size
- File I/O — Real PNG/JPEG/WebP save via Electron IPC, Open PNG/JPEG/WebP/BMP/GIF
- Clipboard — Copy, Cut, Paste (system clipboard)
- Zoom/Pan — Zoom In/Out, Zoom dropdown (1%–3200%), Zoom to Fit, Actual Size, scroll-wheel zoom
- Tabbed multi-document — Thumbnail tabs, close, switch
- Dark and Light themes — Toggle via toolbar button or menu
- Floating draggable panels — Tools, Colors, Layers, History; closable and reopenable via Window menu
- Window dragging — macOS native titlebar with `-webkit-app-region` drag regions
- Status bar — Cursor position, selection size, canvas size, zoom, active layer name
- Keyboard shortcuts — One-key tool switching (B=Brush, E=Eraser, etc.), X=swap colors
- Visual menu bar — 10 dropdown menus wired to real actions
- Native Electron menu — File, Edit, View, Image, Layers, Adjustments, Effects, Window, Help
- Checkerboard transparency background

### Partial / Needs Improvement
- Lasso selection uses bounding box (not polygon mask)
- Magic Wand uses bounding box (not pixel-accurate mask)
- Move tool does not float selected pixels
- Curve tool not implemented (disabled)
- Freeform shape tool is basic
- No pressure sensitivity for drawing tablets
- No rulers or grid overlay
- No pixel grid at high zoom

### Not Yet Implemented
- Adjustment dialogs with previews (Brightness/Contrast, Hue/Saturation, Levels, Curves, Posterize)
- Motion Blur, Noise, Glow, Vignette effects
- Custom `.mcp` project format (layers not preserved across sessions)
- Drag-and-drop file import
- Recent files list
- Unsaved changes warning on close
- Layer locking
- Guides and snap-to-grid
- Full pixel-accurate selection masks (marching ants)
- Printing

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
