// McPaint — Main App Controller
import { DrawEngine } from './services/DrawingEngine';
import { ToolType } from './models/ToolType';
import { TOOL_META } from './models/ToolMetadata';
import { ColorMgr } from './services/ColorManager';
import { TooltipService } from './services/TooltipService';
import { FloatingPanel } from './components/FloatingPanel';
import { ToolsPanel } from './components/ToolsPanel';
import { ColorsPanel } from './components/ColorsPanel';
import { LayersPanel } from './components/LayersPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { MenuBar } from './components/MenuBar';
import { Icons, toolIcon } from './components/editorIcons';
import './styles/desktop.css';
import './styles/panels.css';
import './styles/workspace.css';

// ============================================================
class McPaintApp {
  eng = new DrawEngine();
  tooltip = new TooltipService();

  // DOM
  private mc!: HTMLCanvasElement;
  private oc!: HTMLCanvasElement;
  private cw!: HTMLElement;
  private ws!: HTMLElement;

  // Panels
  private toolsPanel!: ToolsPanel;
  private colorsPanel!: ColorsPanel;
  private layersPanel!: LayersPanel;
  private historyPanel!: HistoryPanel;

  theme: 'light' | 'dark' = 'light';
  private dashOffset = 0;
  private animFrame = 0;

  constructor() {
    this.mc = document.getElementById('main-canvas') as HTMLCanvasElement;
    this.oc = document.getElementById('overlay-canvas') as HTMLCanvasElement;
    this.cw = document.getElementById('canvas-wrap')!;
    this.ws = document.getElementById('workspace')!;
    this.init();
  }

  private init(): void {
    // Detect theme: localStorage > system preference > default light
    const saved = localStorage.getItem('mcpaint_theme');
    if (saved === 'dark' || saved === 'light') this.theme = saved;
    else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) this.theme = 'dark';
    this.setTheme(this.theme);
    this.eng.createDoc('Untitled', 800, 600);

    // Wire tooltip to status bar
    this.tooltip.setStatusCallback((text: string) => { document.getElementById('sts-msg')!.textContent = text; });

    // Create floating panels
    this.toolsPanel = new ToolsPanel((t: ToolType) => this.selectTool(t), this.tooltip);
    this.colorsPanel = new ColorsPanel(this.eng.color);
    this.layersPanel = new LayersPanel(this.eng);
    this.historyPanel = new HistoryPanel(this.eng);

    this.toolsPanel.appendTo(this.ws);
    this.colorsPanel.appendTo(this.ws);
    this.layersPanel.appendTo(this.ws);
    this.historyPanel.appendTo(this.ws);

    this.positionPanels();
    this.setupCanvas();
    this.setupToolbar();
    this.setupOptionsBar();
    this.setupTabs();
    this.setupZoom();
    this.setupMenuBridge();
    this.setupKeyboard();
    this.setupResize();
    this.setupDragDrop();
    this.setupClickableZoom();

    this.eng.onChange(() => this.render());
    this.render();
    this.centerCanvas();
    this.updateStatusBar();
    this.startMarchingAnts();
  }

  // ==================== DRAG-DROP FILE IMPORT ====================
  private setupDragDrop(): void {
    this.ws.addEventListener('dragover', e => { e.preventDefault(); this.ws.classList.add('drop-zone'); });
    this.ws.addEventListener('dragleave', () => this.ws.classList.remove('drop-zone'));
    this.ws.addEventListener('drop', e => {
      e.preventDefault(); this.ws.classList.remove('drop-zone');
      for (const file of e.dataTransfer?.files || []) {
        if (file.type.startsWith('image/')) {
          const url = URL.createObjectURL(file);
          this.eng.loadImage(url, file.name);
          URL.revokeObjectURL(url);
          this.refreshTabs(); this.centerCanvas();
        }
      }
    });
  }

  // ==================== CLICKABLE ZOOM IN STATUS BAR ====================
  private setupClickableZoom(): void {
    document.getElementById('sts-zoom')!.addEventListener('click', () => {
      const current = Math.round(this.eng.zoom * 100);
      const input = prompt('Enter zoom percentage:', String(current));
      if (input) {
        const v = parseInt(input);
        if (!isNaN(v) && v >= 1 && v <= 3200) {
          this.eng.zoom = v / 100;
          this.centerCanvas();
          this.render();
        }
      }
    });
  }

  // ==================== MARCHING ANTS ====================
  private startMarchingAnts(): void {
    const loop = () => {
      this.dashOffset = (this.dashOffset + 0.5) % 8;
      if (this.eng.sel || this.eng.lassoPts.length > 0) this.render();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  // ==================== TOAST ====================
  private toast(msg: string): void {
    const el = document.createElement('div');
    el.className = 'mc-toast'; el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3000);
  }

  // ==================== PANEL TOGGLE ====================
  private togglePanel(name: string, show: boolean): void {
    const map: Record<string, any> = {
      tools: this.toolsPanel, colors: this.colorsPanel,
      layers: this.layersPanel, history: this.historyPanel,
    };
    const panel = map[name];
    if (panel) panel.visible = show;
  }

  // ==================== TOOLBAR ICONS ====================
  private replaceToolbarIcons(): void {
    const map: Record<string, keyof typeof Icons> = {
      'btn-new': 'newDoc', 'btn-open': 'open', 'btn-save': 'save',
      'btn-cut': 'cut', 'btn-copy': 'copy', 'btn-paste': 'paste',
      'btn-undo': 'undo', 'btn-redo': 'redo', 'btn-crop': 'crop',
      'btn-deselect': 'deselect', 'btn-print': 'print',
    };
    for (const [id, key] of Object.entries(map)) {
      const btn = document.getElementById(id);
      if (btn) btn.innerHTML = Icons[key];
    }
  }

  // ==================== THEME ====================
  private setTheme(t: 'light' | 'dark'): void {
    this.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('mcpaint_theme', t);
    this.colorsPanel?.drawWheel();
  }

  // ==================== PANEL POSITIONING ====================
  private positionPanels(reset = false): void {
    const defaults: Record<string, any> = {
      tools:  { left: '8px',  top: '4px',    width: '56px' },
      colors: { left: '8px',  bottom: '30px', width: '210px' },
      history:{ right:'12px', top: '4px',    width: '180px' },
      layers: { right:'12px', top: '170px',   width: '200px' },
    };
    const panels: Record<string, FloatingPanel> = {
      tools: this.toolsPanel, colors: this.colorsPanel,
      history: this.historyPanel, layers: this.layersPanel,
    };
    for (const [key, panel] of Object.entries(panels)) {
      const def = defaults[key];
      if (reset) localStorage.removeItem(`mcpaint_panel_${key}`);
      let pos = reset ? def : (this._loadPanelPos(key) || def);
      panel.el.style.left = pos.left || 'auto';
      panel.el.style.right = pos.right || 'auto';
      panel.el.style.top = pos.top || 'auto';
      panel.el.style.bottom = pos.bottom || 'auto';
      panel.el.style.width = pos.width;
      // Save on titlebar drag end
      const tb = panel.el.querySelector('.fp-titlebar');
      if (tb) tb.addEventListener('pointerup', () => {
        const p: any = { width: panel.el.style.width };
        if (panel.el.style.left !== 'auto') p.left = panel.el.style.left;
        if (panel.el.style.right !== 'auto') p.right = panel.el.style.right;
        if (panel.el.style.top !== 'auto') p.top = panel.el.style.top;
        if (panel.el.style.bottom !== 'auto') p.bottom = panel.el.style.bottom;
        localStorage.setItem(`mcpaint_panel_${key}`, JSON.stringify(p));
        localStorage.setItem(`mcpaint_panel_${key}_visible`, String(panel.visible));
      });
    }
    this._clampPanels();
  }
  private _loadPanelPos(key: string): any {
    try { const d = localStorage.getItem(`mcpaint_panel_${key}`); return d ? JSON.parse(d) : null; }
    catch { return null; }
  }
  private _clampPanels(): void {
    const vw = this.ws.clientWidth, vh = this.ws.clientHeight;
    const wr = this.ws.getBoundingClientRect();
    [this.toolsPanel, this.colorsPanel, this.layersPanel, this.historyPanel].forEach(p => {
      const r = p.el.getBoundingClientRect();
      const relL = r.left - wr.left, relT = r.top - wr.top;
      if (relL + r.width > vw) p.el.style.left = `${Math.max(0, vw - r.width)}px`;
      if (relT + r.height > vh) p.el.style.top = `${Math.max(0, vh - r.height)}px`;
      if (relL < 0) p.el.style.left = '0px';
      if (relT < 0) p.el.style.top = '0px';
    });
  }

  // ==================== TOOL SELECTION ====================
  private selectTool(t: ToolType): void {
    this.eng.setTool(t);
    this.toolsPanel.setActive(t);
    this.updateOptionsBar();
  }

  // ==================== CANVAS ====================
  private setupCanvas(): void {
    const o = this.oc;
    o.addEventListener('pointerdown', e => { this.eng.down(e.offsetX, e.offsetY, e.button); this.render(); });
    o.addEventListener('pointermove', e => { this.updateCursor(e.offsetX, e.offsetY); this.eng.move(e.offsetX, e.offsetY); this.render(); });
    o.addEventListener('pointerup', e => { this.eng.up(e.offsetX, e.offsetY); this.render(); });
    o.addEventListener('pointerleave', () => { if (this.eng.drawing) { this.eng.drawing = false; this.render(); } });
    o.addEventListener('contextmenu', e => e.preventDefault());
    this.cw.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        const r = o.getBoundingClientRect();
        e.deltaY < 0 ? this.eng.zoomIn(e.clientX - r.left, e.clientY - r.top) : this.eng.zoomOut(e.clientX - r.left, e.clientY - r.top);
        this.render();
      }
    }, { passive: false });
  }

  private updateCursor(ox: number, oy: number): void {
    const d = this.eng.doc; if (!d) return;
    const cx = Math.floor((ox - this.eng.panX) / this.eng.zoom);
    const cy = Math.floor((oy - this.eng.panY) / this.eng.zoom);
    const el = (id: string, v: string) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('sts-pos', `${cx}, ${cy} px`);
    el('sts-sel', this.eng.sel ? `${Math.abs(Math.round(this.eng.sel.w))} × ${Math.abs(Math.round(this.eng.sel.h))} px` : '0 × 0 px');
    const d2 = this.eng.doc;
    if (d2) el('sts-size', `${d2.width} × ${d2.height} px`);
  }

  // ==================== RENDER ====================
  private render(): void {
    const d = this.eng.doc; if (!d) return;
    const z = this.eng.zoom, px = this.eng.panX, py = this.eng.panY;
    const cw = d.width * z, ch = d.height * z;

    this.mc.width = cw; this.mc.height = ch;
    this.mc.style.width = `${cw}px`; this.mc.style.height = `${ch}px`;
    this.mc.style.left = `${px}px`; this.mc.style.top = `${py}px`;

    this.oc.width = this.cw.clientWidth; this.oc.height = this.cw.clientHeight;

    const ctx = this.mc.getContext('2d')!;
    const comp = d.composite();
    ctx.clearRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(comp, 0, 0, cw, ch);

    // Overlay (selection, lasso, etc.) with marching ants
    const octx = this.oc.getContext('2d')!;
    octx.clearRect(0, 0, this.oc.width, this.oc.height);

    // Pixel grid at zoom >= 400%
    if (z >= 4) {
      octx.save();
      octx.strokeStyle = document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'rgba(200,200,200,0.2)' : 'rgba(128,128,128,0.35)';
      octx.lineWidth = 1;
      const startX = Math.floor(-px / z) * z + px;
      const startY = Math.floor(-py / z) * z + py;
      for (let x = startX; x < this.oc.width; x += z) {
        octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, this.oc.height); octx.stroke();
      }
      for (let y = startY; y < this.oc.height; y += z) {
        octx.beginPath(); octx.moveTo(0, y); octx.lineTo(this.oc.width, y); octx.stroke();
      }
      octx.restore();
    }

    if (this.eng.sel) {
      const { x, y, w, h } = this.eng.sel;
      octx.save(); octx.strokeStyle = '#39f'; octx.lineWidth = 1;
      octx.setLineDash([4, 4]); octx.lineDashOffset = -this.dashOffset;
      octx.strokeRect(x * z + px, y * z + py, w * z, h * z);
      octx.fillStyle = 'rgba(51,153,255,.12)'; octx.fillRect(x * z + px, y * z + py, w * z, h * z);
      octx.setLineDash([]); octx.restore();
    }
    if (this.eng.lassoPts.length > 0) {
      const pts = this.eng.lassoPts;
      octx.save(); octx.strokeStyle = '#39f'; octx.lineWidth = 1; octx.setLineDash([4, 4]); octx.beginPath();
      octx.moveTo(pts[0].x * z + px, pts[0].y * z + py);
      for (let i = 1; i < pts.length; i++) octx.lineTo(pts[i].x * z + px, pts[i].y * z + py);
      octx.stroke(); octx.setLineDash([]); octx.restore();
    }

    this.updateStatusBar();
  }

  private centerCanvas(): void {
    const d = this.eng.doc; if (!d) return;
    this.eng.panX = (this.cw.clientWidth - d.width * this.eng.zoom) / 2;
    this.eng.panY = (this.cw.clientHeight - d.height * this.eng.zoom) / 2;
    this.render();
  }

  private updateStatusBar(): void {
    const d = this.eng.doc;
    document.getElementById('sts-zoom')!.textContent = `${Math.round(this.eng.zoom * 100)}%`;
    if (d) {
      document.getElementById('sts-size')!.textContent = `${d.width} × ${d.height} px`;
      document.getElementById('sts-layer')!.textContent = d.active?.name || '—';
    }
  }

  // ==================== OPTIONS BAR ====================
  private setupOptionsBar(): void {
    const bindSlider = (sliderId: string, numId: string, setter: (v: number) => void) => {
      const s = document.getElementById(sliderId) as HTMLInputElement | null;
      const n = document.getElementById(numId) as HTMLInputElement | null;
      if (!s || !n) return;
      s.addEventListener('input', () => { const v = parseInt(s.value); n.value = String(v); setter(v); });
      n.addEventListener('change', () => { const v = parseInt(n.value); if (!isNaN(v)) { s.value = String(v); setter(v); } });
    };
    bindSlider('opt-size', 'opt-size-n', v => { this.eng.state.brushSize = v; });
    bindSlider('opt-hard', 'opt-hard-n', v => { this.eng.state.hardness = v; });
    bindSlider('opt-tol', 'opt-tol-n', v => { this.eng.state.tolerance = v; });
    bindSlider('opt-rad', 'opt-rad-n', v => { this.eng.state.cornerRadius = v; });
    document.getElementById('opt-fill')?.addEventListener('change', e => {
      this.eng.state.fillMode = (e.target as HTMLSelectElement).value as any;
    });
    document.getElementById('opt-grad')?.addEventListener('change', e => {
      this.eng.state.gradientType = (e.target as HTMLSelectElement).value as any;
    });
    this.eng.onChange(() => this.updateOptionsBar());
    this.updateOptionsBar();
  }

  private updateOptionsBar(): void {
    const meta = TOOL_META.find(x => x.type === this.eng.state.tool);
    document.getElementById('opt-tool-name')!.textContent = meta?.name || '—';

    // Map option names to group element IDs — safe, never touches parentElement
    const groups: Record<string, string> = {
      size: 'opt-group-size',
      hardness: 'opt-group-hardness',
      tolerance: 'opt-group-tolerance',
      fillMode: 'opt-group-fill',
      gradientType: 'opt-group-gradient',
      radius: 'opt-group-radius',
    };

    const opts = meta?.options || [];
    for (const [key, groupId] of Object.entries(groups)) {
      const el = document.getElementById(groupId);
      if (el) el.style.display = opts.includes(key) ? '' : 'none';
      else console.warn(`updateOptionsBar: missing group #${groupId}`);
    }

    // Sync slider values
    if (opts.includes('size')) {
      (document.getElementById('opt-size') as HTMLInputElement).value = String(this.eng.state.brushSize);
      (document.getElementById('opt-size-n') as HTMLInputElement).value = String(this.eng.state.brushSize);
    }
    if (opts.includes('hardness')) {
      (document.getElementById('opt-hard') as HTMLInputElement).value = String(this.eng.state.hardness);
      (document.getElementById('opt-hard-n') as HTMLInputElement).value = String(this.eng.state.hardness);
    }
    if (opts.includes('tolerance')) {
      (document.getElementById('opt-tol') as HTMLInputElement).value = String(this.eng.state.tolerance);
      (document.getElementById('opt-tol-n') as HTMLInputElement).value = String(this.eng.state.tolerance);
    }
    if (opts.includes('radius')) {
      (document.getElementById('opt-rad') as HTMLInputElement).value = String(this.eng.state.cornerRadius);
      (document.getElementById('opt-rad-n') as HTMLInputElement).value = String(this.eng.state.cornerRadius);
    }
    const fillSel = document.getElementById('opt-fill') as HTMLSelectElement | null;
    if (fillSel) fillSel.value = this.eng.state.fillMode;
    const gradSel = document.getElementById('opt-grad') as HTMLSelectElement | null;
    if (gradSel) gradSel.value = this.eng.state.gradientType;
  }

  // ==================== TOOLBAR ====================
  private setupToolbar(): void {
    const b = (id: string, fn: () => void) => document.getElementById(id)!.addEventListener('click', fn);
    b('btn-new', () => this.dlgNew());
    b('btn-open', () => this.fileOpen());
    b('btn-save', () => this.fileSave());
    b('btn-undo', async () => { await this.eng.undo(); this.render(); });
    b('btn-redo', async () => { await this.eng.redo(); this.render(); });
    b('btn-cut', () => this.clipCut());
    b('btn-copy', () => this.clipCopy());
    b('btn-paste', () => this.clipPaste());
    b('btn-crop', () => { this.eng.cropToSel(); this.render(); });
    b('btn-deselect', () => { this.eng.deselect(); this.render(); });
    b('btn-zoom-in', () => { this.eng.zoomIn(this.cw.clientWidth / 2, this.cw.clientHeight / 2); this.render(); });
    b('btn-zoom-out', () => { this.eng.zoomOut(this.cw.clientWidth / 2, this.cw.clientHeight / 2); this.render(); });
    b('btn-theme', () => this.setTheme(this.theme === 'light' ? 'dark' : 'light'));

    // Tooltips for toolbar buttons
    const tt = this.tooltip;
    const tbind = (id: string, label: string, status: string) => {
      const el = document.getElementById(id); if (el) tt.bind(el, label, status);
    };
    tbind('btn-new', 'New (⌘N)\nCreate a new image', 'New: Create a new blank image document.');
    tbind('btn-open', 'Open (⌘O)\nOpen an image file', 'Open: Open an existing image file.');
    tbind('btn-save', 'Save (⌘S)\nSave the current document', 'Save: Save the current document to disk.');
    tbind('btn-undo', 'Undo (⌘Z)\nUndo the last action', 'Undo: Reverse the most recent change.');
    tbind('btn-redo', 'Redo (⌘Y)\nRedo the previously undone action', 'Redo: Re-apply the undone change.');
    tbind('btn-cut', 'Cut (⌘X)\nCopy selection to clipboard and delete', 'Cut: Copy selection to clipboard and remove it.');
    tbind('btn-copy', 'Copy (⌘C)\nCopy selection to clipboard', 'Copy: Copy the selection or merged image to clipboard.');
    tbind('btn-paste', 'Paste (⌘V)\nPaste from clipboard', 'Paste: Paste an image from the clipboard as a new document.');
    tbind('btn-crop', 'Crop to Selection (⌘⇧X)\nCrop canvas to selection', 'Crop to Selection: Resize canvas to the selected area.');
    tbind('btn-deselect', 'Deselect (⌘D)\nClear the current selection', 'Deselect: Remove the active selection.');
    tbind('btn-zoom-in', 'Zoom In (⌘+)\nIncrease zoom level', 'Zoom In: Magnify the canvas view.');
    tbind('btn-zoom-out', 'Zoom Out (⌘−)\nDecrease zoom level', 'Zoom Out: Reduce the canvas view magnification.');
    tbind('btn-theme', 'Toggle Theme\nSwitch between light and dark mode', 'Toggle Theme: Switch between light and dark interface themes.');

    // Print button — disabled since not implemented
    const printBtn = document.getElementById('btn-print');
    if (printBtn) { printBtn.style.opacity = '0.4'; printBtn.title = 'Print — Coming soon'; }

    // Create visual menu bar — wired to central dispatcher
    new MenuBar(document.getElementById('menu-row')!, (a, ...args) => this.dispatchAction(a, ...args));

    // Replace toolbar button icons with SVG icons
    this.replaceToolbarIcons();
  }

  // ==================== TABS ====================
  private setupTabs(): void {
    this.refreshTabs();
    this.eng.onChange(() => this.refreshTabs());
    document.getElementById('tab-strip')!.addEventListener('click', e => {
      const t = e.target as HTMLElement;
      if (t.classList.contains('tab-x')) {
        const i = parseInt(t.closest('.tab-item')?.getAttribute('data-idx') || '');
        if (!isNaN(i)) { this.eng.closeDoc(i); this.refreshTabs(); this.render(); }
      } else if (t.closest('.tab-item')) {
        const i = parseInt(t.closest('.tab-item')!.getAttribute('data-idx') || '');
        if (!isNaN(i)) { this.eng.switchDoc(i); this.refreshTabs(); this.render(); }
      }
    });
    // Middle-click to close tab
    document.getElementById('tab-strip')!.addEventListener('auxclick', e => {
      if (e.button === 1) {
        const tab = (e.target as HTMLElement).closest('.tab-item');
        if (tab) {
          const i = parseInt(tab.getAttribute('data-idx') || '');
          if (!isNaN(i)) { this.eng.closeDoc(i); this.refreshTabs(); this.render(); }
        }
      }
    });
  }

  private refreshTabs(): void {
    const c = document.getElementById('tab-strip')!; c.innerHTML = '';
    this.eng.docs.forEach((d, i) => {
      const tab = document.createElement('div'); tab.className = 'tab-item';
      tab.classList.toggle('active', i === this.eng.docIdx); tab.setAttribute('data-idx', String(i));
      const img = document.createElement('img'); img.className = 'tab-img'; img.src = d.layers[0]?.thumb(24) || ''; tab.appendChild(img);
      const nm = document.createElement('span'); nm.className = 'tab-name'; nm.textContent = d.name + (d.modified ? ' *' : ''); tab.appendChild(nm);
      const x = document.createElement('button'); x.className = 'tab-x'; x.textContent = '×'; tab.appendChild(x);
      c.appendChild(tab);
    });
  }

  // ==================== ZOOM SELECT ====================
  private setupZoom(): void {
    document.getElementById('zoom-select')!.addEventListener('change', e => {
      const v = parseFloat((e.target as HTMLSelectElement).value);
      if (!isNaN(v) && v > 0) {
        const ow = this.eng.zoom;
        this.eng.zoom = v;
        this.eng.panX = this.cw.clientWidth / 2 - (this.cw.clientWidth / 2 - this.eng.panX) * (v / ow);
        this.eng.panY = this.cw.clientHeight / 2 - (this.cw.clientHeight / 2 - this.eng.panY) * (v / ow);
        this.render();
      }
    });
  }

  // ==================== RESIZE ====================
  private setupResize(): void {
    new ResizeObserver(() => {
      this.oc.width = this.cw.clientWidth;
      this.oc.height = this.cw.clientHeight;
      this._clampPanels();
      this.render();
    }).observe(this.ws);
  }

  // ==================== KEYBOARD ====================
  private setupKeyboard(): void {
    document.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      for (const t of TOOL_META) {
        if (t.shortcut && e.key.toUpperCase() === t.shortcut.toUpperCase() && !e.metaKey && !e.ctrlKey) {
          e.preventDefault(); this.selectTool(t.type); return;
        }
      }
      if (e.key.toUpperCase() === 'X' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); this.eng.color.swap(); this.colorsPanel.refreshUI();
      }
    });
  }

  // ==================== MENU BRIDGE ====================
  private setupMenuBridge(): void {
    if (typeof mcp === 'undefined') return;
    mcp.onMenu((action: string, ...args: any[]) => this.dispatchAction(action, ...args));
  }


  // ==================== DIALOGS ====================
  private dlgNew(): void {
    this._dlg('New Image', `
      <div class="dlg-row"><label>Width:</label><input type="number" id="dlgw" value="800" min="1" max="9999"><label>px</label></div>
      <div class="dlg-row"><label>Height:</label><input type="number" id="dlgh" value="600" min="1" max="9999"><label>px</label></div>
      <div class="dlg-row"><label>Name:</label><input type="text" id="dlgn" value="Untitled"></div>
    `, () => {
      const w = parseInt((document.getElementById('dlgw') as HTMLInputElement).value);
      const h = parseInt((document.getElementById('dlgh') as HTMLInputElement).value);
      this.eng.createDoc((document.getElementById('dlgn') as HTMLInputElement).value || 'Untitled', w, h);
      this.refreshTabs(); this.centerCanvas(); this.render();
    });
  }
  private dlgResize(): void {
    const d = this.eng.doc; if (!d) return;
    this._dlg('Resize Image', `
      <div class="dlg-row"><label>Width:</label><input type="number" id="dlgw" value="${d.width}"><label>px</label></div>
      <div class="dlg-row"><label>Height:</label><input type="number" id="dlgh" value="${d.height}"><label>px</label></div>
    `, () => {
      const w = parseInt((document.getElementById('dlgw') as HTMLInputElement).value);
      const h = parseInt((document.getElementById('dlgh') as HTMLInputElement).value);
      if (w > 0 && h > 0) { this.eng.snap('Resize'); d.resizeCanvas(w, h); this.render(); }
    });
  }
  private dlgCanvasSize(): void {
    const d = this.eng.doc; if (!d) return;
    this._dlg('Canvas Size', `
      <div class="dlg-row"><label>Width:</label><input type="number" id="dlgw" value="${d.width}"><label>px</label></div>
      <div class="dlg-row"><label>Height:</label><input type="number" id="dlgh" value="${d.height}"><label>px</label></div>
    `, () => {
      const w = parseInt((document.getElementById('dlgw') as HTMLInputElement).value);
      const h = parseInt((document.getElementById('dlgh') as HTMLInputElement).value);
      if (w > 0 && h > 0) { this.eng.snap('Canvas Size'); d.resizeCanvas(w, h); this.render(); }
    });
  }
  private _dlg(title: string, body: string, ok: () => void): void {
    document.querySelector('.dlg-ov')?.remove();
    const ov = document.createElement('div'); ov.className = 'dlg-ov';
    ov.innerHTML = `<div class="dlg-box"><div class="dlg-title">${title}</div><div class="dlg-body">${body}</div><div class="dlg-btns"><button class="dlg-btn" id="dc">Cancel</button><button class="dlg-btn prim" id="do">OK</button></div></div>`;
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    ov.querySelector('#dc')!.addEventListener('click', () => ov.remove());
    ov.querySelector('#do')!.addEventListener('click', () => { ok(); ov.remove(); });
    ov.addEventListener('keydown', e => { if (e.key === 'Enter') { ok(); ov.remove(); } else if (e.key === 'Escape') ov.remove(); });
    document.body.appendChild(ov);
    const f = ov.querySelector('input'); if (f) setTimeout(() => f.focus(), 50);
  }

  // ==================== FILE OPS ====================
  private dispatchAction(action: string, ...args: any[]): void {
    switch (action) {
      case 'new': this.dlgNew(); break;
      case 'save': this.fileSave(); break;
      case 'saveAs': this.fileSaveAs(args[0]); break;
      case 'openDialog': this.fileOpen(); break;
      case 'openFile': this.fileOpenPath(args[0]); break;
      case 'close': this.eng.closeDoc(this.eng.docIdx); this.refreshTabs(); this.render(); break;
      case 'undo': this.eng.undo(); this.render(); break;
      case 'redo': this.eng.redo(); this.render(); break;
      case 'cut': this.clipCut(); break;
      case 'copy': this.clipCopy(); break;
      case 'paste': this.clipPaste(); break;
      case 'selectAll': this.eng.selectAll(); this.render(); break;
      case 'deselect': this.eng.deselect(); this.render(); break;
      case 'fillSel': this.eng.fillSel(); this.render(); break;
      case 'clearSel': this.eng.clearSel(); this.render(); break;
      case 'invertSel': case 'invert': this.eng.invert(); this.render(); break;
      case 'zoomIn': this.eng.zoomIn(this.cw.clientWidth / 2, this.cw.clientHeight / 2); this.render(); break;
      case 'zoomOut': this.eng.zoomOut(this.cw.clientWidth / 2, this.cw.clientHeight / 2); this.render(); break;
      case 'zoomFit': this.centerCanvas(); break;
      case 'actualSize': this.eng.zoom = 1; this.eng.panX = 0; this.eng.panY = 0; this.render(); break;
      case 'theme': this.setTheme(this.theme === 'light' ? 'dark' : 'light'); break;
      case 'fullscreen': document.documentElement.requestFullscreen?.(); break;
      case 'resize': this.dlgResize(); break;
      case 'canvasSize': this.dlgCanvasSize(); break;
      case 'flipH': this.eng.flipH(); this.render(); break;
      case 'flipV': this.eng.flipV(); this.render(); break;
      case 'rotCW': this.eng.rotateCW(); this.render(); break;
      case 'rotCCW': this.eng.rotateCCW(); this.render(); break;
      case 'crop': this.eng.cropToSel(); this.render(); break;
      case 'flatten': this.eng.flatten(); this.render(); break;
      case 'addLayer': this.eng.addLayer(); this.render(); break;
      case 'delLayer': this.eng.delLayer(); this.render(); break;
      case 'dupLayer': this.eng.dupLayer(); this.render(); break;
      case 'mergeDown': this.eng.mergeD(); this.render(); break;
      case 'moveUp': this.eng.moveUp(); this.render(); break;
      case 'moveDown': this.eng.moveDown(); this.render(); break;
      case 'bw': this.eng.bw(); this.render(); break;
      case 'sepia': this.eng.sepia(); this.render(); break;
      case 'blur': this.eng.blur(3); this.render(); break;
      case 'sharpen': this.eng.sharpen(); this.render(); break;
      case 'edge': this.eng.edgeDetect(); this.render(); break;
      case 'emboss': this.eng.emboss(); this.render(); break;
      case 'pixelate': this.eng.pixelate(4); this.render(); break;
      case 'togglePanel': case 'togglePanel:t': this.togglePanel('tools', args[0]??!this.toolsPanel.visible); break;
      case 'togglePanel:c': this.togglePanel('colors', !this.colorsPanel.visible); break;
      case 'togglePanel:l': this.togglePanel('layers', !this.layersPanel.visible); break;
      case 'togglePanel:h': this.togglePanel('history', !this.historyPanel.visible); break;
      case 'resetLayout': this.positionPanels(true);
        [this.toolsPanel, this.colorsPanel, this.layersPanel, this.historyPanel].forEach(p => p.visible = true); break;
      case 'about': alert('McPaint v1.0 — Paint.NET-inspired image editor for macOS\nBuilt with Electron + TypeScript'); break;
      case 'shortcuts': alert('S=Select M=Move L=Lasso W=Wand B=Brush E=Eraser P=Pencil\nF=Bucket K=Picker C=Clone R=Recolor T=Text O=Line\nG=Gradient H=Pan Z=Zoom X=Swap Colors\n⌘Z=Undo ⌘Y=Redo ⌘A=All ⌘D=Deselect'); break;
      default: document.getElementById('sts-msg')!.textContent = `Coming soon: ${action}`; break;
    }
  }

  private async fileOpen(): Promise<void> {
    if (typeof mcp !== 'undefined') { const p = await mcp.open(); if (p) this.fileOpenPath(p); }
  }
  private async fileOpenPath(fp: string): Promise<void> {
    try {
      if (typeof mcp !== 'undefined') {
        const result = await mcp.readFile(fp);
        if (result.data && !result.error) {
          this.eng.loadFromFile(fp, result.data);
          this.refreshTabs(); this.centerCanvas(); return;
        }
      }
      // Fallback to fetch for file:// URLs
      const r = await fetch(`file://${fp}`);
      this.eng.loadFromFile(fp, await r.arrayBuffer());
      this.refreshTabs(); this.centerCanvas();
    } catch (e) { console.error('Open failed:', e); }
  }
  private async fileSave(): Promise<void> {
    const d = this.eng.doc; if (!d) return;
    if (d.filePath) this.fileSaveAs(d.filePath); else this.fileSaveAs();
  }
  private async fileSaveAs(fp?: string): Promise<void> {
    if (!fp && typeof mcp !== 'undefined') {
      fp = (await mcp.save(this.eng.doc?.name || 'untitled.png')) || undefined;
    }
    if (!fp) return;
    const d = this.eng.doc; if (!d) return;
    const dataUrl = d.toDataURL(this._fmtFromExt(fp));
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (typeof mcp !== 'undefined') {
      const result = await mcp.writeFile(fp, bytes.buffer);
      if (result.error) { console.error('Save failed:', result.error); return; }
    }
    d.filePath = fp; d.modified = false; this.refreshTabs();
  }
  private _fmtFromExt(fp: string): string {
    const ext = fp.split('.').pop()?.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'webp') return 'image/webp';
    return 'image/png';
  }

  // ==================== CLIPBOARD ====================
  private async clipCopy(): Promise<void> {
    try { const du = this.eng.compositeDataURL(); const r = await fetch(du); const b = await r.blob(); await navigator.clipboard.write([new ClipboardItem({ [b.type]: b })]); }
    catch (e) { console.error('Copy failed:', e); }
  }
  private async clipCut(): Promise<void> { await this.clipCopy(); this.eng.clearSel(); this.render(); }
  private async clipPaste(): Promise<void> {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type); const url = URL.createObjectURL(blob);
          this.eng.loadImage(url, 'Pasted'); URL.revokeObjectURL(url); this.refreshTabs(); return;
        }
      }
    } catch (e) { console.error('Paste failed:', e); }
  }
}

document.addEventListener('DOMContentLoaded', () => { new McPaintApp(); });
