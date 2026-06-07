// McPaint — Visual Menu Bar with Dropdowns
// The native Electron menu handles the real functionality.
// This visual menu row provides desktop look and mirrors the native menu.

interface MenuItemDef {
  label?: string;
  action?: () => void;
  enabled?: boolean;
  shortcut?: string;
  separator?: boolean;
}

const menus: Record<string, MenuItemDef[]> = {
  File: [
    { label: 'New', shortcut: '⌘N' },
    { label: 'Open...', shortcut: '⌘O' },
    { separator: true },
    { label: 'Save', shortcut: '⌘S' },
    { label: 'Save As...', shortcut: '⌘⇧S' },
    { separator: true },
    { label: 'Close', shortcut: '⌘W' },
    { label: 'Exit' },
  ],
  Edit: [
    { label: 'Undo', shortcut: '⌘Z' },
    { label: 'Redo', shortcut: '⌘Y' },
    { separator: true },
    { label: 'Cut', shortcut: '⌘X' },
    { label: 'Copy', shortcut: '⌘C' },
    { label: 'Paste', shortcut: '⌘V' },
    { separator: true },
    { label: 'Select All', shortcut: '⌘A' },
    { label: 'Deselect', shortcut: '⌘D' },
    { separator: true },
    { label: 'Fill Selection', shortcut: '⌫' },
    { label: 'Clear Selection', shortcut: '⌦' },
  ],
  View: [
    { label: 'Zoom In', shortcut: '⌘+' },
    { label: 'Zoom Out', shortcut: '⌘−' },
    { label: 'Zoom to Window', shortcut: '⌘B' },
    { label: 'Actual Size', shortcut: '⌘0' },
    { separator: true },
    { label: 'Toggle Full Screen', shortcut: 'F11' },
  ],
  Image: [
    { label: 'Resize...', shortcut: '⌘R' },
    { label: 'Canvas Size...', shortcut: '⌘⇧R' },
    { separator: true },
    { label: 'Flip Horizontal' },
    { label: 'Flip Vertical' },
    { label: 'Rotate 90° CW' },
    { label: 'Rotate 90° CCW' },
    { separator: true },
    { label: 'Crop to Selection', shortcut: '⌘⇧X' },
    { label: 'Flatten', shortcut: '⌘⇧F' },
  ],
  Layers: [
    { label: 'Add New Layer', shortcut: '⌘⇧N' },
    { label: 'Delete Layer' },
    { label: 'Duplicate Layer' },
    { label: 'Merge Layer Down', shortcut: '⌘M' },
    { separator: true },
    { label: 'Move Layer Up' },
    { label: 'Move Layer Down' },
  ],
  Adjustments: [
    { label: 'Invert Colors', shortcut: '⌘⇧I' },
    { label: 'Black and White' },
    { label: 'Sepia' },
    { separator: true },
    { label: 'Brightness/Contrast', enabled: false },
    { label: 'Hue/Saturation', enabled: false },
    { label: 'Levels', enabled: false },
    { label: 'Curves', enabled: false },
    { label: 'Posterize', enabled: false },
  ],
  Effects: [
    { label: 'Gaussian Blur' },
    { label: 'Sharpen' },
    { label: 'Edge Detect' },
    { label: 'Emboss' },
    { label: 'Pixelate' },
    { separator: true },
    { label: 'Motion Blur', enabled: false },
    { label: 'Noise', enabled: false },
    { label: 'Glow', enabled: false },
    { label: 'Vignette', enabled: false },
  ],
  Window: [
    { label: 'Tools', shortcut: '✓' },
    { label: 'Colors', shortcut: '✓' },
    { label: 'Layers', shortcut: '✓' },
    { label: 'History', shortcut: '✓' },
    { separator: true },
    { label: 'Reset Window Layout' },
  ],
  Help: [
    { label: 'About McPaint' },
    { label: 'Keyboard Shortcuts' },
    { label: 'McPaint on GitHub', enabled: false },
  ],
};

export class MenuBar {
  private dropdownEl: HTMLElement | null = null;

  constructor(private container: HTMLElement) {
    this.build();
  }

  private build(): void {
    this.container.innerHTML = '';
    for (const menuName of Object.keys(menus)) {
      const item = document.createElement('span');
      item.className = 'menu-item';
      item.textContent = menuName;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.dropdownEl) {
          this.dropdownEl.remove();
          this.dropdownEl = null;
        }
        this.showDropdown(menuName, item);
      });
      item.addEventListener('pointerenter', () => {
        if (this.dropdownEl) {
          // Switch to this menu if a dropdown is already open
          const old = this.dropdownEl;
          old.remove();
          this.dropdownEl = null;
          this.showDropdown(menuName, item);
        }
      });
      this.container.appendChild(item);
    }
    // Close dropdown on outside click
    document.addEventListener('click', () => {
      if (this.dropdownEl) { this.dropdownEl.remove(); this.dropdownEl = null; }
    });
  }

  private showDropdown(menuName: string, anchor: HTMLElement): void {
    const items = menus[menuName];
    if (!items) return;

    const dd = document.createElement('div');
    dd.className = 'menu-dropdown';
    dd.style.position = 'absolute';
    const rect = anchor.getBoundingClientRect();
    dd.style.left = `${rect.left}px`;
    dd.style.top = `${rect.bottom}px`;
    dd.style.minWidth = '200px';
    dd.style.background = 'var(--panel-bg)';
    dd.style.border = '1px solid var(--border-dark)';
    dd.style.boxShadow = '2px 4px 12px rgba(0,0,0,0.2)';
    dd.style.zIndex = '5000';
    dd.style.padding = '2px 0';
    dd.style.fontSize = '11px';

    for (const mi of items) {
      if (mi.separator) {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:var(--border);margin:3px 8px;';
        dd.appendChild(sep);
        continue;
      }
      const row = document.createElement('div');
      row.className = 'menu-dd-item';
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:3px 16px 3px 24px;cursor:default;white-space:nowrap;';
      if (mi.enabled === false) {
        row.style.opacity = '0.4';
        row.style.cursor = 'default';
      } else {
        row.addEventListener('pointerenter', () => row.style.background = 'var(--selected-bg)');
        row.addEventListener('pointerleave', () => row.style.background = '');
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dropdownEl?.remove();
          this.dropdownEl = null;
          mi.action?.();
        });
      }
      const lbl = document.createElement('span');
      lbl.textContent = mi.label || '';
      if (mi.enabled === false) lbl.textContent += ' (Coming Soon)';
      row.appendChild(lbl);
      if (mi.shortcut) {
        const sc = document.createElement('span');
        sc.textContent = mi.shortcut;
        sc.style.cssText = 'color:var(--text-dim);margin-left:32px;font-size:10px;';
        row.appendChild(sc);
      }
      dd.appendChild(row);
    }

    document.body.appendChild(dd);
    this.dropdownEl = dd;
  }
}
