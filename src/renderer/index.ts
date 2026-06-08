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
    // Detect platform and set attribute for CSS
    const platform = (typeof mcp !== 'undefined' && mcp.platform) ? mcp.platform : 'darwin';
    document.documentElement.setAttribute('data-platform', platform);

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
    this.setupRulers();

    // Expose unsaved changes check for main process
    (window as any).__mcUnsaved = () => this.eng.docs.some(d => d.modified);

    this.eng.onChange(() => { this.render(); this.drawRulers(); });
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
  private isPanning = false;
  private isSpacePan = false;
  private panSX = 0; private panSY = 0;

  private setupCanvas(): void {
    const o = this.oc;
    o.addEventListener('pointerdown', e => {
      // Middle-click pan or Space+drag
      if (e.button === 1 || this.isSpacePan) {
        this.isPanning = true;
        this.panSX = e.clientX; this.panSY = e.clientY;
        o.setPointerCapture(e.pointerId);
        return;
      }
      const ox = e.offsetX, oy = e.offsetY;
      // Check for locked layer
      const d = this.eng.doc;
      if (d?.active?.locked && this.eng.state.tool !== ToolType.Pan && this.eng.state.tool !== ToolType.Zoom && this.eng.state.tool !== ToolType.Picker) {
        document.getElementById('sts-msg')!.textContent = 'Layer is locked';
        return;
      }
      this.eng.down(ox, oy, e.button); this.render();
    });
    o.addEventListener('pointermove', e => {
      if (this.isPanning) {
        const dx = e.clientX - this.panSX, dy = e.clientY - this.panSY;
        this.panSX = e.clientX; this.panSY = e.clientY;
        this.eng.panX += dx; this.eng.panY += dy;
        this.render();
        return;
      }
      this.updateCursor(e.offsetX, e.offsetY);
      this.eng.move(e.offsetX, e.offsetY);
      this.render();
    });
    o.addEventListener('pointerup', e => {
      if (this.isPanning) { this.isPanning = false; o.releasePointerCapture(e.pointerId); return; }
      this.eng.up(e.offsetX, e.offsetY); this.render();
    });
    o.addEventListener('pointerleave', () => {
      if (this.isPanning) { this.isPanning = false; }
      if (this.eng.drawing) { this.eng.drawing = false; this.render(); }
    });

    // Right-click context menu
    o.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.showContextMenu(e.clientX, e.clientY);
    });

    // Scroll wheel zoom
    this.cw.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey) {
        const r = o.getBoundingClientRect();
        e.deltaY < 0 ? this.eng.zoomIn(e.clientX - r.left, e.clientY - r.top) : this.eng.zoomOut(e.clientX - r.left, e.clientY - r.top);
        this.render();
      }
    }, { passive: false });

    // Space key for Space+drag
    document.addEventListener('keydown', e => {
      if (e.key === ' ' && !e.repeat && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        this.isSpacePan = true;
        this.oc.style.cursor = 'grab';
        e.preventDefault();
      }
    });
    document.addEventListener('keyup', e => {
      if (e.key === ' ') {
        this.isSpacePan = false;
        this.oc.style.cursor = 'crosshair';
      }
    });
  }

  private showContextMenu(x: number, y: number): void {
    const items = [
      { label: 'Cut', clickId: 'cut' },
      { label: 'Copy', clickId: 'copy' },
      { label: 'Paste', clickId: 'paste' },
      { type: 'separator' },
      { label: 'Select All', clickId: 'selectAll' },
      { label: 'Deselect', clickId: 'deselect' },
      { type: 'separator' },
      { label: 'Fill Selection', clickId: 'fillSel', enabled: !!this.eng.sel },
      { label: 'Clear Selection', clickId: 'clearSel', enabled: !!this.eng.sel },
      { type: 'separator' },
      { label: 'Add New Layer', clickId: 'addLayer' },
      { label: 'Flatten Image', clickId: 'flatten' },
      { type: 'separator' },
      { label: 'Image Properties', clickId: 'imgProps' },
    ];
    if (typeof mcp !== 'undefined' && mcp.showContextMenu) {
      mcp.showContextMenu(items);
    }
    // Store for ctxAction handling
    (this as any)._ctxItems = items;
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
    this._cursorX = cx; this._cursorY = cy;
    this.drawRulers();
  }
  private _cursorX = 0; private _cursorY = 0;

  // ==================== RULERS ====================
  private rulersVisible = false;
  private rh!: HTMLCanvasElement; private rv!: HTMLCanvasElement;

  private setupRulers(): void {
    const wi = document.getElementById('workspace-inner')!;
    // Corner
    const corner = document.createElement('div'); corner.id = 'ruler-corner'; wi.appendChild(corner);
    // Horizontal ruler
    this.rh = document.createElement('canvas'); this.rh.id = 'ruler-h'; wi.appendChild(this.rh);
    // Vertical ruler
    this.rv = document.createElement('canvas'); this.rv.id = 'ruler-v'; wi.appendChild(this.rv);
  }

  drawRulers(): void {
    if (!this.rulersVisible) return;
    const z = this.eng.zoom, px = this.eng.panX, py = this.eng.panY;
    const d = this.eng.doc; if (!d) return;

    // Horizontal ruler
    const rhw = this.rh.offsetWidth || this.cw.clientWidth;
    this.rh.width = rhw; this.rh.height = 20;
    const hctx = this.rh.getContext('2d')!;
    hctx.clearRect(0, 0, rhw, 20);
    hctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#555';
    hctx.font = '8px -apple-system,sans-serif';
    hctx.textBaseline = 'bottom';

    // Tick interval based on zoom
    let tickInterval = 50, labelInterval = 100;
    if (z > 2) { tickInterval = 20; labelInterval = 50; }
    else if (z < 0.5) { tickInterval = 100; labelInterval = 200; }

    const startX = Math.floor(-px / (z * tickInterval)) * tickInterval;
    for (let v = startX; v * z + px < rhw; v += tickInterval) {
      const sx = v * z + px;
      if (v % labelInterval === 0) {
        hctx.fillText(String(v), sx + 2, 13);
        hctx.beginPath(); hctx.moveTo(sx, 10); hctx.lineTo(sx, 20); hctx.strokeStyle = '#888'; hctx.stroke();
      } else {
        hctx.beginPath(); hctx.moveTo(sx, 14); hctx.lineTo(sx, 20); hctx.strokeStyle = '#aaa'; hctx.stroke();
      }
    }
    // Cursor hairline
    const cxX = this._cursorX * z + px;
    hctx.beginPath(); hctx.moveTo(cxX, 0); hctx.lineTo(cxX, 20);
    hctx.strokeStyle = '#e00'; hctx.lineWidth = 1; hctx.stroke();

    // Vertical ruler
    const rvh = this.rv.offsetHeight || this.cw.clientHeight;
    this.rv.width = 20; this.rv.height = rvh;
    const vctx = this.rv.getContext('2d')!;
    vctx.clearRect(0, 0, 20, rvh);
    vctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#555';
    vctx.font = '8px -apple-system,sans-serif';
    vctx.textBaseline = 'middle';

    const startY = Math.floor(-py / (z * tickInterval)) * tickInterval;
    for (let v = startY; v * z + py < rvh; v += tickInterval) {
      const sy = v * z + py;
      if (v % labelInterval === 0) {
        // Rotate text
        vctx.save(); vctx.translate(16, sy + 1); vctx.rotate(-Math.PI / 2);
        vctx.fillText(String(v), 0, 0); vctx.restore();
        vctx.beginPath(); vctx.moveTo(10, sy); vctx.lineTo(20, sy); vctx.strokeStyle = '#888'; vctx.stroke();
      } else {
        vctx.beginPath(); vctx.moveTo(14, sy); vctx.lineTo(20, sy); vctx.strokeStyle = '#aaa'; vctx.stroke();
      }
    }
    // Cursor hairline
    const cxY = this._cursorY * z + py;
    vctx.beginPath(); vctx.moveTo(0, cxY); vctx.lineTo(20, cxY);
    vctx.strokeStyle = '#e00'; vctx.lineWidth = 1; vctx.stroke();

    // Update visibility
    this.rh.style.display = this.rv.style.display = 'block';
    const corner = document.getElementById('ruler-corner'); if (corner) corner.style.display = 'block';
    const cw = document.getElementById('canvas-wrap'); if (cw) { cw.style.left = '20px'; cw.style.top = '20px'; }
  }

  private showRulersToggle(show: boolean): void {
    this.rulersVisible = show;
    const rh = document.getElementById('ruler-h'), rv = document.getElementById('ruler-v');
    const corner = document.getElementById('ruler-corner');
    const cw = document.getElementById('canvas-wrap');
    if (show) {
      if (rh) rh.style.display = 'block'; if (rv) rv.style.display = 'block';
      if (corner) corner.style.display = 'block';
      if (cw) { cw.style.left = '20px'; cw.style.top = '20px'; }
      this.drawRulers();
    } else {
      if (rh) rh.style.display = 'none'; if (rv) rv.style.display = 'none';
      if (corner) corner.style.display = 'none';
      if (cw) { cw.style.left = '0px'; cw.style.top = '0px'; }
    }
  }

  // ==================== CANVAS CENTER ANIMATION ====================
  private centerCanvas(): void {
    const d = this.eng.doc; if (!d) return;
    const targetPX = (this.cw.clientWidth - d.width * this.eng.zoom) / 2;
    const targetPY = (this.cw.clientHeight - d.height * this.eng.zoom) / 2;
    const startPX = this.eng.panX, startPY = this.eng.panY;
    const startTime = performance.now();
    const duration = 200;
    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOutQuad
      this.eng.panX = startPX + (targetPX - startPX) * eased;
      this.eng.panY = startPY + (targetPY - startPY) * eased;
      this.render();
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
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

    // Clone source indicator
    if (this.eng.cloneSet && this.eng.cloneSrc) {
      const cx = this.eng.cloneSrc.x * z + px;
      const cy = this.eng.cloneSrc.y * z + py;
      octx.save();
      octx.strokeStyle = '#fff'; octx.lineWidth = 1.5;
      octx.beginPath(); octx.arc(cx, cy, 8, 0, Math.PI * 2); octx.stroke();
      octx.strokeStyle = '#000'; octx.lineWidth = 1;
      octx.beginPath(); octx.arc(cx, cy, 7, 0, Math.PI * 2); octx.stroke();
      octx.beginPath(); octx.moveTo(cx - 12, cy); octx.lineTo(cx + 12, cy); octx.stroke();
      octx.beginPath(); octx.moveTo(cx, cy - 12); octx.lineTo(cx, cy + 12); octx.stroke();
      octx.restore();
    }

    // Float canvas (Move tool)
    if (this.eng.floatCanvas && this.eng.sel) {
      const { x: sx2, y: sy2, w: sw, h: sh } = this.eng.sel;
      octx.globalAlpha = 0.7;
      octx.drawImage(this.eng.floatCanvas, sx2 * z + px, sy2 * z + py, sw * z, sh * z);
      octx.globalAlpha = 1;
    }

    if (this.eng.sel) {
      const { x, y, w, h } = this.eng.sel;
      octx.save(); octx.strokeStyle = '#39f'; octx.lineWidth = 1;
      octx.setLineDash([4, 4]); octx.lineDashOffset = -this.dashOffset;
      if (this.eng.sel.type === 'polygon' && this.eng.sel.path) {
        // Draw Path2D scaled
        octx.save();
        octx.translate(px, py); octx.scale(z, z);
        octx.stroke(this.eng.sel.path);
        octx.restore();
      } else if (this.eng.sel.type === 'ellipse') {
        const cx2 = (x + w / 2) * z + px, cy2 = (y + h / 2) * z + py;
        const rx = (w / 2) * z, ry = (h / 2) * z;
        octx.beginPath(); octx.ellipse(cx2, cy2, rx, ry, 0, 0, Math.PI * 2); octx.stroke();
      } else {
        octx.strokeRect(x * z + px, y * z + py, w * z, h * z);
      }
      octx.fillStyle = 'rgba(51,153,255,.12)';
      octx.fillRect(x * z + px, y * z + py, w * z, h * z);
      octx.setLineDash([]); octx.restore();
    }
    if (this.eng.lassoPts.length > 0) {
      const pts = this.eng.lassoPts;
      octx.save(); octx.strokeStyle = '#39f'; octx.lineWidth = 1; octx.setLineDash([4, 4]);
      octx.lineDashOffset = -this.dashOffset;
      octx.beginPath();
      octx.moveTo(pts[0].x * z + px, pts[0].y * z + py);
      for (let i = 1; i < pts.length; i++) octx.lineTo(pts[i].x * z + px, pts[i].y * z + py);
      octx.stroke(); octx.setLineDash([]); octx.restore();
    }

    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    const d = this.eng.doc;
    document.getElementById('sts-zoom')!.textContent = `${Math.round(this.eng.zoom * 100)}%`;
    if (d) {
      document.getElementById('sts-size')!.textContent = `${d.width} × ${d.height} px`;
      const layerEl = document.getElementById('sts-layer')!;
      if (d.active) {
        layerEl.innerHTML = `<span style="display:inline-block;width:8px;height:8px;background:var(--text-dim);border-radius:1px;margin-right:3px;vertical-align:middle;"></span>${d.active?.locked ? '🔒 ' : ''}${d.active.name}`;
      } else {
        layerEl.textContent = '—';
      }
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
    document.getElementById('opt-selmode')?.addEventListener('change', e => {
      this.eng.state.selMode = (e.target as HTMLSelectElement).value as any;
    });
    document.getElementById('opt-aa')?.addEventListener('change', e => {
      this.eng.state.antiAlias = (e.target as HTMLInputElement).checked;
    });
    document.getElementById('opt-font')?.addEventListener('change', e => {
      this.eng.state.fontFamily = (e.target as HTMLSelectElement).value;
    });
    document.getElementById('opt-align')?.addEventListener('change', e => {
      this.eng.state.textAlign = (e.target as HTMLSelectElement).value as any;
    });
    // Font style buttons
    document.getElementById('opt-bold')?.addEventListener('click', function(this: HTMLElement) {
      this.classList.toggle('active');
    });
    document.getElementById('opt-italic')?.addEventListener('click', function(this: HTMLElement) {
      this.classList.toggle('active');
    });
    document.getElementById('opt-underline')?.addEventListener('click', function(this: HTMLElement) {
      this.classList.toggle('active');
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
      selMode: 'opt-group-selmode',
      antiAlias: 'opt-group-aa',
      font: 'opt-group-font',
      fontStyle: 'opt-group-fontstyle',
      alignment: 'opt-group-align',
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
      const img = document.createElement('img'); img.className = 'tab-img';
      img.src = d.layers[0]?.thumb(32) || ''; tab.appendChild(img);
      const nm = document.createElement('span'); nm.className = 'tab-name';
      nm.textContent = d.name + (d.modified ? ' *' : ''); tab.appendChild(nm);
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
      if (this.rulersVisible) {
        this.rh.width = this.cw.clientWidth;
        this.rv.height = this.cw.clientHeight;
      }
      this._clampPanels();
      this.render();
      this.drawRulers();
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
      const name = (document.getElementById('dlgn') as HTMLInputElement).value || 'Untitled';
      if (w > 8000 || h > 8000) {
        if (!confirm(`${w}×${h} is a very large canvas and may be slow. Continue?`)) return;
      }
      this.eng.createDoc(name, w, h);
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
      case 'motionBlur': this.showMotionBlurDialog(); break;
      case 'noise': this.showNoiseDialog(); break;
      case 'glow': this.showGlowDialog(); break;
      case 'vignette': this.showVignetteDialog(); break;
      case 'togglePanel': case 'togglePanel:t': this.togglePanel('tools', args[0]??!this.toolsPanel.visible); break;
      case 'togglePanel:c': this.togglePanel('colors', !this.colorsPanel.visible); break;
      case 'togglePanel:l': this.togglePanel('layers', !this.layersPanel.visible); break;
      case 'togglePanel:h': this.togglePanel('history', !this.historyPanel.visible); break;
      case 'toggleRulers': this.showRulersToggle(args[0] ?? !this.rulersVisible); break;
      case 'resetLayout': this.positionPanels(true);
        [this.toolsPanel, this.colorsPanel, this.layersPanel, this.historyPanel].forEach(p => p.visible = true); break;
      case 'brightness': this.showBrightnessDialog(); break;
      case 'hueSat': this.showHueSatDialog(); break;
      case 'levels': this.showLevelsDialog(); break;
      case 'curves': this.showCurvesDialog(); break;
      case 'ctxAction': this.handleCtxAction(args[0]); break;
      case 'imgProps': this.showImgProps(); break;
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
        if (result.error) { this.toast(`Open failed: ${result.error}`); return; }
        if (result.data) {
          this.eng.loadFromFile(fp, result.data);
          // Track in recent files via main
          this.refreshTabs(); this.centerCanvas(); return;
        }
      }
      // Fallback to fetch for file:// URLs
      const r = await fetch(`file://${fp}`);
      this.eng.loadFromFile(fp, await r.arrayBuffer());
      this.refreshTabs(); this.centerCanvas();
    } catch (e: any) {
      this.toast(`Open failed: ${e?.message || 'Unknown error'}`);
    }
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
    if (!base64) { this.toast('Save failed: Could not encode image'); return; }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (typeof mcp !== 'undefined') {
      const result = await mcp.writeFile(fp, bytes.buffer);
      if (result.error) { this.toast(`Save failed: ${result.error}`); return; }
    }
    d.filePath = fp; d.modified = false; this.refreshTabs();
    this.toast('Saved: ' + fp.split('/').pop());
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

  // ==================== CONTEXT MENU HANDLER ====================
  private handleCtxAction(id: string): void {
    switch (id) {
      case 'cut': this.clipCut(); break;
      case 'copy': this.clipCopy(); break;
      case 'paste': this.clipPaste(); break;
      case 'selectAll': this.eng.selectAll(); this.render(); break;
      case 'deselect': this.eng.deselect(); this.render(); break;
      case 'fillSel': this.eng.fillSel(); this.render(); break;
      case 'clearSel': this.eng.clearSel(); this.render(); break;
      case 'addLayer': this.eng.addLayer(); this.render(); break;
      case 'flatten': this.eng.flatten(); this.render(); break;
      case 'imgProps': this.showImgProps(); break;
    }
  }

  // ==================== IMAGE PROPERTIES DIALOG ====================
  private showImgProps(): void {
    const d = this.eng.doc; if (!d) return;
    alert(`Image Properties\n\nName: ${d.name}\nSize: ${d.width} × ${d.height} px\nLayers: ${d.layers.length}\nColor Depth: 32-bit RGBA`);
  }

  // ==================== ADJUSTMENT DIALOGS ====================
  private showBrightnessDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);

    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;

    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Brightness / Contrast</div>
      <div class="adj-row"><label>Brightness</label><input type="range" id="adj-bri" min="-100" max="100" value="0"><input type="number" id="adj-bri-n" value="0"></div>
      <div class="adj-row"><label>Contrast</label><input type="range" id="adj-con" min="-100" max="100" value="0"><input type="number" id="adj-con-n" value="0"></div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(preview, box.querySelector('.adj-btns'));

    const updatePreview = () => {
      const brightness = parseInt((ov.querySelector('#adj-bri') as HTMLInputElement).value);
      const contrast = parseInt((ov.querySelector('#adj-con') as HTMLInputElement).value);
      const data = new Uint8ClampedArray(origSnap);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + brightness * 2.55));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness * 2.55));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness * 2.55));
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
      }
      const id = new ImageData(data, l.width, l.height);
      const pctx = preview.getContext('2d')!;
      const pw = preview.width, ph = preview.height;
      const t = document.createElement('canvas'); t.width = l.width; t.height = l.height;
      const tx = t.getContext('2d')!; tx.putImageData(id, 0, 0);
      pctx.clearRect(0, 0, pw, ph);
      pctx.drawImage(t, 0, 0, pw, ph);
    };
    updatePreview();

    // Wire sliders
    ['bri', 'con'].forEach(k => {
      const s = ov.querySelector(`#adj-${k}`) as HTMLInputElement;
      const n = ov.querySelector(`#adj-${k}-n`) as HTMLInputElement;
      s.addEventListener('input', () => { n.value = s.value; updatePreview(); });
      n.addEventListener('change', () => { const v = parseInt(n.value); s.value = String(v); updatePreview(); });
    });

    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => {
      this.eng.snap('Brightness/Contrast'); ov.remove(); this.render();
    });
    document.body.appendChild(ov);
  }

  private showHueSatDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);

    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;

    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Hue / Saturation</div>
      <div class="adj-row"><label>Hue</label><input type="range" id="adj-hue" min="-180" max="180" value="0"><input type="number" id="adj-hue-n" value="0"></div>
      <div class="adj-row"><label>Saturation</label><input type="range" id="adj-sat" min="-100" max="100" value="0"><input type="number" id="adj-sat-n" value="0"></div>
      <div class="adj-row"><label>Lightness</label><input type="range" id="adj-lit" min="-100" max="100" value="0"><input type="number" id="adj-lit-n" value="0"></div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(preview, box.querySelector('.adj-btns'));

    const updatePreview = () => {
      const hue = parseInt((ov.querySelector('#adj-hue') as HTMLInputElement).value);
      const sat = parseInt((ov.querySelector('#adj-sat') as HTMLInputElement).value);
      const lit = parseInt((ov.querySelector('#adj-lit') as HTMLInputElement).value);
      const data = new Uint8ClampedArray(origSnap);
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d2 = mx - mn;
        let h = 0;
        if (d2 !== 0) { if (mx === r) h = ((g - b) / d2) % 6; else if (mx === g) h = (b - r) / d2 + 2; else h = (r - g) / d2 + 4; h = h * 60; if (h < 0) h += 360; }
        const s = mx === 0 ? 0 : d2 / mx;
        const l = mx;
        const newH = ((h + hue) % 360 + 360) % 360 / 360;
        const newS = Math.max(0, Math.min(1, s + sat / 100));
        const newL = Math.max(0, Math.min(1, l + lit / 100));
        const i2 = Math.floor(newH * 6), f = newH * 6 - i2;
        const p = newL * (1 - newS), q = newL * (1 - f * newS), t = newL * (1 - (1 - f) * newS);
        let nr = 0, ng = 0, nb = 0;
        switch (i2 % 6) { case 0: nr = newL; ng = t; nb = p; break; case 1: nr = q; ng = newL; nb = p; break; case 2: nr = p; ng = newL; nb = t; break; case 3: nr = p; ng = q; nb = newL; break; case 4: nr = t; ng = p; nb = newL; break; case 5: nr = newL; ng = p; nb = q; break; }
        data[i] = Math.round(nr * 255); data[i + 1] = Math.round(ng * 255); data[i + 2] = Math.round(nb * 255);
      }
      const id = new ImageData(data, l.width, l.height);
      const pctx = preview.getContext('2d')!;
      const pw = preview.width, ph = preview.height;
      const t = document.createElement('canvas'); t.width = l.width; t.height = l.height;
      const tx = t.getContext('2d')!; tx.putImageData(id, 0, 0);
      pctx.clearRect(0, 0, pw, ph);
      pctx.drawImage(t, 0, 0, pw, ph);
    };
    updatePreview();

    ['hue', 'sat', 'lit'].forEach(k => {
      const s = ov.querySelector(`#adj-${k}`) as HTMLInputElement;
      const n = ov.querySelector(`#adj-${k}-n`) as HTMLInputElement;
      s.addEventListener('input', () => { n.value = s.value; updatePreview(); });
      n.addEventListener('change', () => { const v = parseInt(n.value); s.value = String(v); updatePreview(); });
    });

    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => {
      this.eng.snap('Hue/Saturation'); ov.remove(); this.render();
    });
    document.body.appendChild(ov);
  }

  private showLevelsDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);
    // Build histogram
    const hist = new Uint32Array(256);
    for (let i = 0; i < origSnap.length; i += 4) {
      const gray = Math.round(origSnap[i] * 0.3 + origSnap[i + 1] * 0.59 + origSnap[i + 2] * 0.11);
      hist[gray]++;
    }

    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;

    const histCanvas = document.createElement('canvas');
    histCanvas.width = 256; histCanvas.height = 60;
    histCanvas.style.cssText = 'width:256px;height:60px;border:1px solid var(--border);display:block;margin:4px auto;background:var(--panel-bg);';
    const hctx = histCanvas.getContext('2d')!;
    const hMax = Math.max(...hist) || 1;
    hctx.clearRect(0, 0, 256, 60);
    hctx.fillStyle = '#888';
    for (let i = 0; i < 256; i++) {
      const barH = (hist[i] / hMax) * 60;
      hctx.fillRect(i, 60 - barH, 1, barH);
    }

    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Levels</div>
      <div class="adj-row"><label>Black Pt</label><input type="range" id="adj-blk" min="0" max="254" value="0"><input type="number" id="adj-blk-n" value="0"></div>
      <div class="adj-row"><label>Gamma</label><input type="range" id="adj-gam" min="1" max="99" value="10"><input type="number" id="adj-gam-n" value="1.0" step="0.01"></div>
      <div class="adj-row"><label>White Pt</label><input type="range" id="adj-wht" min="1" max="255" value="255"><input type="number" id="adj-wht-n" value="255"></div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(histCanvas, box.querySelector('.adj-row')!.parentElement?.querySelector('.adj-row') || box.firstChild);
    box.insertBefore(preview, box.querySelector('.adj-btns'));

    const buildLut = (black: number, white: number, gamma: number): Uint8Array => {
      const lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        let v = (i - black) / (white - black);
        v = Math.max(0, Math.min(1, v));
        v = Math.pow(v, 1 / gamma);
        lut[i] = Math.round(v * 255);
      }
      return lut;
    };

    const updatePreview = () => {
      const black = parseInt((ov.querySelector('#adj-blk') as HTMLInputElement).value);
      const gamma = parseFloat((ov.querySelector('#adj-gam-n') as HTMLInputElement).value) || 1;
      const white = parseInt((ov.querySelector('#adj-wht') as HTMLInputElement).value);
      const lut = buildLut(black, white, gamma);
      const data = new Uint8ClampedArray(origSnap);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = lut[data[i]]; data[i + 1] = lut[data[i + 1]]; data[i + 2] = lut[data[i + 2]];
      }
      const id = new ImageData(data, l.width, l.height);
      const pctx = preview.getContext('2d')!;
      const pw = preview.width, ph = preview.height;
      const t = document.createElement('canvas'); t.width = l.width; t.height = l.height;
      const tx = t.getContext('2d')!; tx.putImageData(id, 0, 0);
      pctx.clearRect(0, 0, pw, ph);
      pctx.drawImage(t, 0, 0, pw, ph);
    };
    updatePreview();

    ['blk', 'wht'].forEach(k => {
      const s = ov.querySelector(`#adj-${k}`) as HTMLInputElement;
      const n = ov.querySelector(`#adj-${k}-n`) as HTMLInputElement;
      s.addEventListener('input', () => { n.value = s.value; updatePreview(); });
      n.addEventListener('change', () => { const v = parseInt(n.value); s.value = String(v); updatePreview(); });
    });
    const gs = ov.querySelector('#adj-gam') as HTMLInputElement;
    const gn = ov.querySelector('#adj-gam-n') as HTMLInputElement;
    gs.addEventListener('input', () => { const v = parseInt(gs.value) / 10; gn.value = v.toFixed(1); updatePreview(); });
    gn.addEventListener('change', () => { const v = parseFloat(gn.value); gs.value = String(Math.round(v * 10)); updatePreview(); });

    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => {
      this.eng.snap('Levels'); ov.remove(); this.render();
    });
    document.body.appendChild(ov);
  }

  private showCurvesDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);

    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;

    const curveCanvas = document.createElement('canvas');
    curveCanvas.className = 'adj-curve-canvas';
    curveCanvas.width = 256; curveCanvas.height = 256;

    // Control points: scaled to 256x256
    let points: Array<{ x: number; y: number }> = [
      { x: 0, y: 255 }, { x: 128, y: 128 }, { x: 255, y: 0 }
    ];
    let dragIdx = -1;

    const buildLut = (): Uint8Array => {
      const sorted = [...points].sort((a, b) => a.x - b.x);
      const lut = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        // Find segment
        let j = 0;
        while (j < sorted.length - 2 && sorted[j + 1].x < i) j++;
        const p0 = sorted[Math.max(0, j)];
        const p1 = sorted[Math.min(sorted.length - 1, j + 1)];
        const dx = p1.x - p0.x;
        const t = dx === 0 ? 0 : (i - p0.x) / dx;
        const y = p0.y + t * (p1.y - p0.y);
        lut[i] = Math.max(0, Math.min(255, Math.round(255 - y)));
      }
      return lut;
    };

    const drawCurve = () => {
      const cctx = curveCanvas.getContext('2d')!;
      cctx.clearRect(0, 0, 256, 256);
      // Background grid
      cctx.strokeStyle = '#444'; cctx.lineWidth = 0.5;
      for (let i = 0; i <= 256; i += 32) {
        cctx.beginPath(); cctx.moveTo(i, 0); cctx.lineTo(i, 256); cctx.stroke();
        cctx.beginPath(); cctx.moveTo(0, i); cctx.lineTo(256, i); cctx.stroke();
      }
      // Diagonal reference
      cctx.strokeStyle = '#666'; cctx.lineWidth = 1;
      cctx.beginPath(); cctx.moveTo(0, 255); cctx.lineTo(255, 0); cctx.stroke();
      // Curve
      const lut = buildLut();
      cctx.strokeStyle = '#2d76c2'; cctx.lineWidth = 2;
      cctx.beginPath();
      for (let i = 0; i < 256; i++) {
        const y = 255 - lut[i];
        if (i === 0) cctx.moveTo(i, y); else cctx.lineTo(i, y);
      }
      cctx.stroke();
      // Control points
      points.forEach(p => {
        cctx.fillStyle = 'white'; cctx.strokeStyle = '#2d76c2'; cctx.lineWidth = 2;
        cctx.beginPath(); cctx.arc(p.x, p.y, 5, 0, Math.PI * 2); cctx.fill(); cctx.stroke();
      });
    };
    drawCurve();

    curveCanvas.addEventListener('pointerdown', e => {
      const r = curveCanvas.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      dragIdx = points.findIndex(p => Math.hypot(p.x - mx, p.y - my) < 10);
      if (dragIdx === -1) {
        // Add new point
        points.push({ x: mx, y: my });
        dragIdx = points.length - 1;
      }
      drawCurve();
    });
    curveCanvas.addEventListener('pointermove', e => {
      if (dragIdx < 0) return;
      const r = curveCanvas.getBoundingClientRect();
      const mx = Math.max(0, Math.min(255, e.clientX - r.left));
      const my = Math.max(0, Math.min(255, e.clientY - r.top));
      points[dragIdx] = { x: mx, y: my };
      drawCurve();
      updatePreview();
    });
    curveCanvas.addEventListener('pointerup', () => { dragIdx = -1; });

    const updatePreview = () => {
      const lut = buildLut();
      const data = new Uint8ClampedArray(origSnap);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = lut[data[i]]; data[i + 1] = lut[data[i + 1]]; data[i + 2] = lut[data[i + 2]];
      }
      const id = new ImageData(data, l.width, l.height);
      const pctx = preview.getContext('2d')!;
      const pw = preview.width, ph = preview.height;
      const t = document.createElement('canvas'); t.width = l.width; t.height = l.height;
      const tx = t.getContext('2d')!; tx.putImageData(id, 0, 0);
      pctx.clearRect(0, 0, pw, ph);
      pctx.drawImage(t, 0, 0, pw, ph);
    };

    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Curves</div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(curveCanvas, box.querySelector('.adj-btns'));
    box.insertBefore(preview, box.querySelector('.adj-btns'));

    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => {
      this.eng.snap('Curves'); ov.remove(); this.render();
    });
    document.body.appendChild(ov);
  }

  private showMotionBlurDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);
    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;
    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Motion Blur</div>
      <div class="adj-row"><label>Angle</label><input type="range" id="adj-ma" min="0" max="360" value="0"><input type="number" id="adj-ma-n" value="0">°</div>
      <div class="adj-row"><label>Distance</label><input type="range" id="adj-md" min="3" max="100" value="10"><input type="number" id="adj-md-n" value="10">px</div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(preview, box.querySelector('.adj-btns'));

    const updatePreview = () => {
      const angle = parseInt((ov.querySelector('#adj-ma') as HTMLInputElement).value);
      const dist = parseInt((ov.querySelector('#adj-md') as HTMLInputElement).value);
      const data = new Uint8ClampedArray(origSnap);
      const rad = (angle * Math.PI) / 180;
      const mx = Math.cos(rad), my = Math.sin(rad);
      const w = l.width, h = l.height;
      const src = new Uint8ClampedArray(origSnap);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let rr = 0, gg = 0, bb = 0, aa = 0, n = 0;
        for (let i = 0; i < dist; i++) {
          const t = i / (dist - 1 || 1) - 0.5;
          const sx = Math.round(x + mx * t * dist), sy = Math.round(y + my * t * dist);
          if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
            const j = (sy * w + sx) * 4;
            rr += src[j]; gg += src[j + 1]; bb += src[j + 2]; aa += src[j + 3]; n++;
          }
        }
        const j = (y * w + x) * 4;
        data[j] = n > 0 ? rr / n : src[j];
        data[j + 1] = n > 0 ? gg / n : src[j + 1];
        data[j + 2] = n > 0 ? bb / n : src[j + 2];
        data[j + 3] = n > 0 ? aa / n : src[j + 3];
      }
      const id = new ImageData(data, w, h);
      const pctx = preview.getContext('2d')!;
      const t = document.createElement('canvas'); t.width = w; t.height = h;
      t.getContext('2d')!.putImageData(id, 0, 0);
      pctx.clearRect(0, 0, 200, 150); pctx.drawImage(t, 0, 0, 200, 150);
    };
    updatePreview();
    ['ma', 'md'].forEach(k => {
      const s = ov.querySelector(`#adj-${k}`) as HTMLInputElement;
      const n = ov.querySelector(`#adj-${k}-n`) as HTMLInputElement;
      s.addEventListener('input', () => { n.value = s.value; updatePreview(); });
      n.addEventListener('change', () => { const v = parseInt(n.value); s.value = String(v); updatePreview(); });
    });
    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => { this.eng.snap('Motion Blur'); ov.remove(); this.render(); });
    document.body.appendChild(ov);
  }

  private showNoiseDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);
    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;
    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Noise</div>
      <div class="adj-row"><label>Amount</label><input type="range" id="adj-na" min="1" max="200" value="40"><input type="number" id="adj-na-n" value="40"></div>
      <div class="adj-row"><label>Density</label><input type="range" id="adj-nd" min="1" max="100" value="100"><input type="number" id="adj-nd-n" value="100">%</div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(preview, box.querySelector('.adj-btns'));
    const updatePreview = () => {
      const amount = parseInt((ov.querySelector('#adj-na') as HTMLInputElement).value);
      const density = parseInt((ov.querySelector('#adj-nd') as HTMLInputElement).value) / 100;
      const data = new Uint8ClampedArray(origSnap);
      for (let i = 0; i < data.length; i += 4) {
        if (Math.random() < density) {
          const n = (Math.random() - 0.5) * amount * 2;
          data[i] = Math.max(0, Math.min(255, data[i] + n));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
        }
      }
      const id = new ImageData(data, l.width, l.height);
      const pctx = preview.getContext('2d')!;
      const t = document.createElement('canvas'); t.width = l.width; t.height = l.height;
      t.getContext('2d')!.putImageData(id, 0, 0);
      pctx.clearRect(0, 0, 200, 150); pctx.drawImage(t, 0, 0, 200, 150);
    };
    updatePreview();
    ['na', 'nd'].forEach(k => {
      const s = ov.querySelector(`#adj-${k}`) as HTMLInputElement;
      const n = ov.querySelector(`#adj-${k}-n`) as HTMLInputElement;
      s.addEventListener('input', () => { n.value = s.value; updatePreview(); });
      n.addEventListener('change', () => { const v = parseInt(n.value); s.value = String(v); updatePreview(); });
    });
    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => { this.eng.snap('Noise'); ov.remove(); this.render(); });
    document.body.appendChild(ov);
  }

  private showGlowDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);
    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;
    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Glow</div>
      <div class="adj-row"><label>Radius</label><input type="range" id="adj-gr" min="1" max="30" value="5"><input type="number" id="adj-gr-n" value="5">px</div>
      <div class="adj-row"><label>Brightness</label><input type="range" id="adj-gb" min="1" max="200" value="80"><input type="number" id="adj-gb-n" value="80">%</div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(preview, box.querySelector('.adj-btns'));
    const updatePreview = () => {
      const radius = parseInt((ov.querySelector('#adj-gr') as HTMLInputElement).value);
      const brightness = parseInt((ov.querySelector('#adj-gb') as HTMLInputElement).value);
      const data = new Uint8ClampedArray(origSnap);
      this.eng.glow(radius, brightness);
      // Restore original first
      l.putImageData(origData, 0, 0);
      this.eng.glow(radius, brightness);
      const newData = l.getImageData(0, 0, l.width, l.height);
      const pctx = preview.getContext('2d')!;
      const t = document.createElement('canvas'); t.width = l.width; t.height = l.height;
      t.getContext('2d')!.putImageData(newData, 0, 0);
      pctx.clearRect(0, 0, 200, 150); pctx.drawImage(t, 0, 0, 200, 150);
      // Restore original for preview
      l.putImageData(origData, 0, 0);
      // Re-apply with new params
      this.eng.glow(radius, brightness);
      const freshData = l.getImageData(0, 0, l.width, l.height);
      l.putImageData(origData, 0, 0);
      pctx.clearRect(0, 0, 200, 150);
      t.getContext('2d')!.putImageData(freshData, 0, 0);
      pctx.drawImage(t, 0, 0, 200, 150);
    };
    updatePreview();
    ['gr', 'gb'].forEach(k => {
      const s = ov.querySelector(`#adj-${k}`) as HTMLInputElement;
      const n = ov.querySelector(`#adj-${k}-n`) as HTMLInputElement;
      s.addEventListener('input', () => { n.value = s.value; updatePreview(); });
      n.addEventListener('change', () => { const v = parseInt(n.value); s.value = String(v); updatePreview(); });
    });
    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => { this.eng.snap('Glow'); ov.remove(); this.render(); });
    document.body.appendChild(ov);
  }

  private showVignetteDialog(): void {
    const d = this.eng.doc; if (!d) return;
    const l = d.active; if (!l) return;
    const origData = l.getImageData(0, 0, l.width, l.height);
    const origSnap = new Uint8ClampedArray(origData.data);
    const preview = document.createElement('canvas');
    preview.className = 'adj-preview'; preview.width = 200; preview.height = 150;
    const ov = document.createElement('div'); ov.className = 'adj-dlg';
    ov.innerHTML = `<div class="adj-box">
      <div class="adj-title">Vignette</div>
      <div class="adj-row"><label>Amount</label><input type="range" id="adj-va" min="0" max="100" value="50"><input type="number" id="adj-va-n" value="50">%</div>
      <div class="adj-btns"><button class="adj-cancel">Cancel</button><button class="adj-ok">OK</button></div></div>`;
    const box = ov.querySelector('.adj-box')!;
    box.insertBefore(preview, box.querySelector('.adj-btns'));
    const updatePreview = () => {
      const amount = parseInt((ov.querySelector('#adj-va') as HTMLInputElement).value);
      const data = new Uint8ClampedArray(origSnap);
      const w = l.width, h = l.height;
      const cx = w / 2, cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxR;
        const factor = 1 - dist * (amount / 100);
        const i = (y * w + x) * 4;
        data[i] = Math.max(0, Math.min(255, data[i] * factor));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor));
      }
      const id = new ImageData(data, l.width, l.height);
      const pctx = preview.getContext('2d')!;
      const t = document.createElement('canvas'); t.width = l.width; t.height = l.height;
      t.getContext('2d')!.putImageData(id, 0, 0);
      pctx.clearRect(0, 0, 200, 150); pctx.drawImage(t, 0, 0, 200, 150);
    };
    updatePreview();
    const s = ov.querySelector('#adj-va') as HTMLInputElement;
    const n = ov.querySelector('#adj-va-n') as HTMLInputElement;
    s.addEventListener('input', () => { n.value = s.value; updatePreview(); });
    n.addEventListener('change', () => { const v = parseInt(n.value); s.value = String(v); updatePreview(); });
    ov.addEventListener('click', e => { if (e.target === ov) { l.putImageData(origData, 0, 0); ov.remove(); } });
    ov.querySelector('.adj-cancel')!.addEventListener('click', () => { l.putImageData(origData, 0, 0); ov.remove(); });
    ov.querySelector('.adj-ok')!.addEventListener('click', () => { this.eng.snap('Vignette'); ov.remove(); this.render(); });
    document.body.appendChild(ov);
  }
}

document.addEventListener('DOMContentLoaded', () => { new McPaintApp(); });
