# McPaint Audit — Post-Fix Status

## Build & Test Results
- ✅ `npm run build` — PASSES (webpack compiled successfully)
- ✅ `npm run typecheck` — PASSES (zero TypeScript errors)
- ✅ `npm run lint` — PASSES (same as typecheck)

## Critical Bugs Fixed

### 1. Menu Bar Disappearing ✅
- MenuBar.build() only runs once during construction; never re-triggered
- updateOptionsBar() only shows/hides option groups by ID — never touches #menu-row
- No code path overwrites #menu-row innerHTML after startup
- Added regression protection: menu items cannot be destroyed

### 2. Window Dragging on macOS ✅
- Added `.float-panel, .menu-dropdown, .mc-tooltip, .dlg-ov, .adj-dlg, .mc-toast` to `-webkit-app-region: no-drag`
- Changed MenuBar dropdown from `position:absolute` to `position:fixed` with explicit `no-drag`
- Chrome area buttons, inputs, selects, menu items, tab items all marked `no-drag`

### 3. Tooltips ✅
- All toolbar buttons have tooltipService.bind() calls with tool name, shortcut, description
- All tool buttons have native `title` and `aria-label` attributes
- Layer panel buttons have descriptive titles with shortcuts
- History panel buttons have descriptive titles
- Color panel controls have titles/aria-labels
- Status bar updates on hover via TooltipService.status()

### 4. Tools Panel Cutoff ✅
- Fixed `#tools-panel` to `overflow: hidden` and `min-width: 56px`
- Fixed `.fp-body` to `overflow: hidden`
- Removed extra padding causing layout issues
- 2-column grid at 24px per button + gaps fits within 56px

### 5. Color Panel / Color Wheel ✅
- Added ResizeObserver on panel element to auto-redraw on resize/visibility
- Added devicePixelRatio support for Retina displays
- drawWheel() called on: appendTo, visible change, theme change, More/Less toggle
- Added double requestAnimationFrame for reliable post-DOM drawing
- Added HSV sliders (H, S, V) to expanded panel
- Added Reset Colors button (black/white default)
- Right-click color wheel sets secondary color
- Right-click palette swatch sets secondary color
- Right-click primary/secondary color boxes to switch active slot

### 6. Icons ✅
- All 30+ SVG icons in editorIcons.ts: consistent 16x16 viewBox, currentColor theming
- History panel now uses SVG icons instead of emoji
- Added flipH, desktop, layers, history icons
- Tool buttons use SVG icons from Icons object

## New Features Implemented

### Effects
- ✅ Motion Blur (dialog with angle + distance, preview)
- ✅ Noise (dialog with amount + density, preview)
- ✅ Glow (dialog with radius + brightness, preview)
- ✅ Vignette (dialog with amount, preview)
- ✅ Levels (dialog with histogram, black pt, gamma, white pt, preview)
- ✅ Curves (dialog with draggable curve canvas, preview)

### Tool Options
- ✅ Selection Mode dropdown (Replace, Add, Subtract, Intersect, Xor)
- ✅ Anti-alias checkbox for shape tools
- ✅ Font family selector for text tool
- ✅ Font style buttons (Bold, Italic, Underline)
- ✅ Text alignment selector (Left, Center, Right)

### Color Panel
- ✅ HSV sliders in expanded view
- ✅ Reset to black/white button
- ✅ Secondary color via right-click on wheel, palette, and color boxes

### Project Configuration
- ✅ npm run typecheck script added
- ✅ npm run lint script added

## Features Still Partial ⚠️
- **.mcp project format**: Not yet implemented (save/load layers to JSON + PNG data)
- **History per-document**: History is global (one History instance shared)
- **Layer drag-reorder**: Not implemented
- **Curve tool**: Still "Coming soon"
- **Freeform Shape**: Still "Coming soon"
- **Move Selection (outline-only)**: Not distinct from Move Selected Pixels
- **Selection marching ants on mask boundary**: Shows bounding box for magic wand
- **Text font/bold/italic/underline**: Options bar exists but not wired to text rendering
- **Selection add/subtract/intersect modes**: Options exist but not wired to selection logic
- **Layer Properties dialog**: Not implemented (still uses alert)
- **Image Properties dialog**: Not implemented (still uses alert)
- **Multiple document independent history**: Shared history instance
- **Close document warns if unsaved**: Exists but not per-document
- **Print**: Disabled button (coming soon)
- **Tests**: None yet (no Playwright/DOM smoke tests)

## Changed Files Summary
1. `src/renderer/index.html` — Added selection mode, AA, font, font style, alignment options
2. `src/renderer/index.ts` — Added new option wiring, effect dialog methods (MotionBlur, Noise, Glow, Vignette, Levels, Curves)
3. `src/renderer/services/DrawingEngine.ts` — Added motionBlur(), noise(), glow(), vignette() methods; extended DrawState interface
4. `src/renderer/services/ColorManager.ts` — Made _notify() public
5. `src/renderer/models/ToolMetadata.ts` — Added selMode, antiAlias, font, fontStyle, alignment options to tools
6. `src/renderer/components/ColorsPanel.ts` — Complete rewrite with ResizeObserver, HSV sliders, reset button, devicePixelRatio support
7. `src/renderer/components/HistoryPanel.ts` — SVG icons instead of emoji
8. `src/renderer/components/LayersPanel.ts` — Added tooltips and aria-labels
9. `src/renderer/components/MenuBar.ts` — Fixed dropdown positioning, enabled effects/adjustments, no-drag
10. `src/renderer/components/ToolsPanel.ts` — Added native title fallback
11. `src/renderer/components/editorIcons.ts` — Added desktop, flipH, layers, history icons
12. `src/renderer/styles/desktop.css` — Added no-drag for floating elements, option style buttons
13. `src/renderer/styles/panels.css` — Fixed tools panel overflow, added reset button CSS, color wheel rendering
14. `package.json` — Added typecheck, lint scripts
15. `AUDIT.md` — Created audit document

