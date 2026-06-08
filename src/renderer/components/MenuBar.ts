// McPaint — Visual Menu Bar with Wired Dropdowns
// Every menu item dispatches to the central app action handler.

interface MenuItemDef {
  label?: string; action?: string; enabled?: boolean;
  shortcut?: string; separator?: boolean;
}

const menuDef: Record<string, MenuItemDef[]> = {
  File: [
    { label: 'New', shortcut: '⌘N', action: 'new' },
    { label: 'Open...', shortcut: '⌘O', action: 'openDialog' },
    { separator: true },
    { label: 'Save', shortcut: '⌘S', action: 'save' },
    { label: 'Save As...', shortcut: '⌘⇧S', action: 'saveAs' },
    { separator: true },
    { label: 'Close', shortcut: '⌘W', action: 'close' },
  ],
  Edit: [
    { label: 'Undo', shortcut: '⌘Z', action: 'undo' },
    { label: 'Redo', shortcut: '⌘Y', action: 'redo' },
    { separator: true },
    { label: 'Cut', shortcut: '⌘X', action: 'cut' },
    { label: 'Copy', shortcut: '⌘C', action: 'copy' },
    { label: 'Paste', shortcut: '⌘V', action: 'paste' },
    { separator: true },
    { label: 'Select All', shortcut: '⌘A', action: 'selectAll' },
    { label: 'Deselect', shortcut: '⌘D', action: 'deselect' },
    { separator: true },
    { label: 'Fill Selection', shortcut: '⌫', action: 'fillSel' },
    { label: 'Clear Selection', shortcut: '⌦', action: 'clearSel' },
    { label: 'Invert Selection', action: 'invertSel' },
  ],
  View: [
    { label: 'Zoom In', shortcut: '⌘+', action: 'zoomIn' },
    { label: 'Zoom Out', shortcut: '⌘−', action: 'zoomOut' },
    { label: 'Zoom to Window', shortcut: '⌘B', action: 'zoomFit' },
    { label: 'Actual Size', shortcut: '⌘0', action: 'actualSize' },
    { separator: true },
    { label: 'Toggle Dark Theme', action: 'theme' },
    { label: 'Full Screen', shortcut: 'F11', action: 'fullscreen' },
  ],
  Image: [
    { label: 'Resize...', shortcut: '⌘R', action: 'resize' },
    { label: 'Canvas Size...', shortcut: '⌘⇧R', action: 'canvasSize' },
    { separator: true },
    { label: 'Flip Horizontal', action: 'flipH' },
    { label: 'Flip Vertical', action: 'flipV' },
    { label: 'Rotate 90° CW', action: 'rotCW' },
    { label: 'Rotate 90° CCW', action: 'rotCCW' },
    { separator: true },
    { label: 'Crop to Selection', shortcut: '⌘⇧X', action: 'crop' },
    { label: 'Flatten', shortcut: '⌘⇧F', action: 'flatten' },
  ],
  Layers: [
    { label: 'Add New Layer', shortcut: '⌘⇧N', action: 'addLayer' },
    { label: 'Delete Layer', action: 'delLayer' },
    { label: 'Duplicate Layer', action: 'dupLayer' },
    { label: 'Merge Layer Down', shortcut: '⌘M', action: 'mergeDown' },
    { separator: true },
    { label: 'Move Layer Up', action: 'moveUp' },
    { label: 'Move Layer Down', action: 'moveDown' },
  ],
  Adjustments: [
    { label: 'Invert Colors', shortcut: '⌘⇧I', action: 'invert' },
    { label: 'Black and White', action: 'bw' },
    { label: 'Sepia', action: 'sepia' },
    { separator: true },
    { label: 'Brightness/Contrast...', action: 'brightness' },
    { label: 'Hue/Saturation...', action: 'hueSat' },
    { label: 'Levels...', action: 'levels' },
    { label: 'Curves...', action: 'curves' },
  ],
  Effects: [
    { label: 'Gaussian Blur', action: 'blur' },
    { label: 'Sharpen', action: 'sharpen' },
    { label: 'Edge Detect', action: 'edge' },
    { label: 'Emboss', action: 'emboss' },
    { label: 'Pixelate', action: 'pixelate' },
    { separator: true },
    { label: 'Motion Blur...', action: 'motionBlur' },
    { label: 'Noise...', action: 'noise' },
    { label: 'Glow...', action: 'glow' },
    { label: 'Vignette...', action: 'vignette' },
  ],
  Window: [
    { label: 'Tools', action: 'togglePanel:t' },
    { label: 'Colors', action: 'togglePanel:c' },
    { label: 'Layers', action: 'togglePanel:l' },
    { label: 'History', action: 'togglePanel:h' },
    { separator: true },
    { label: 'Reset Window Layout', action: 'resetLayout' },
  ],
  Help: [
    { label: 'About McPaint', action: 'about' },
    { label: 'Keyboard Shortcuts', action: 'shortcuts' },
  ],
};

export class MenuBar {
  private dd: HTMLElement | null = null;
  private dispatch: (action: string, ...args: any[]) => void;

  constructor(private container: HTMLElement, dispatch: (action: string, ...args: any[]) => void) {
    this.dispatch = dispatch;
    this.build();
  }

  private build(): void {
    this.container.innerHTML = '';
    for (const name of Object.keys(menuDef)) {
      const el = document.createElement('span');
      el.className = 'menu-item';
      el.textContent = name;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._close(); this._open(name, el);
      });
      el.addEventListener('pointerenter', () => { if (this.dd) { this._close(); this._open(name, el); } });
      this.container.appendChild(el);
    }
    document.addEventListener('click', () => this._close());
  }

  private _open(name: string, anchor: HTMLElement): void {
    const items = menuDef[name]; if (!items) return;
    const dd = document.createElement('div');
    dd.className = 'menu-dropdown';
    const r = anchor.getBoundingClientRect();
    dd.style.cssText = `position:fixed;left:${r.left}px;top:${r.bottom}px;min-width:210px;background:var(--panel-bg);border:1px solid var(--border-dark);box-shadow:2px 4px 12px rgba(0,0,0,.2);z-index:5000;padding:2px 0;font-size:11px;-webkit-app-region:no-drag;`;
    for (const mi of items) {
      if (mi.separator) { const s = document.createElement('div'); s.style.cssText = 'height:1px;background:var(--border);margin:3px 8px;'; dd.appendChild(s); continue; }
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 16px 3px 24px;cursor:default;white-space:nowrap;';
      if (mi.enabled === false) { row.style.opacity = '0.4'; row.style.cursor = 'default'; }
      else {
        row.addEventListener('pointerenter', () => row.style.background = 'var(--selected-bg)');
        row.addEventListener('pointerleave', () => row.style.background = '');
        row.addEventListener('click', (e) => { e.stopPropagation(); this._close(); if (mi.action) this.dispatch(mi.action); });
      }
      const lbl = document.createElement('span');
      lbl.textContent = mi.label || '';
      if (mi.enabled === false) lbl.textContent += ' (Coming Soon)';
      row.appendChild(lbl);
      if (mi.shortcut) { const sc = document.createElement('span'); sc.textContent = mi.shortcut; sc.style.cssText = 'color:var(--text-dim);margin-left:32px;font-size:10px;'; row.appendChild(sc); }
      dd.appendChild(row);
    }
    document.body.appendChild(dd); this.dd = dd;
  }

  private _close(): void { if (this.dd) { this.dd.remove(); this.dd = null; } }
}
