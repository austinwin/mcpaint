// McPaint - Drawing Engine (tools, strokes, shapes, selections, effects)
import { CanvasDoc } from '../models/CanvasDocument';
import { Layer } from '../models/Layer';
import { History } from '../models/HistoryEntry';
import { ToolType, ShapeFill } from '../models/ToolType';
import { ColorMgr, RGBA } from './ColorManager';

export interface DrawState {
  tool: ToolType; brushSize: number; hardness: number;
  fillMode: ShapeFill; tolerance: number; cornerRadius: number;
  gradientType: 'linear' | 'radial';
}

export class DrawEngine {
  docs: CanvasDoc[] = [];
  docIdx = -1;
  hist = new History();
  color = new ColorMgr();

  state: DrawState = {
    tool: ToolType.Brush, brushSize: 8, hardness: 75,
    fillMode: ShapeFill.Outline, tolerance: 32, cornerRadius: 10,
    gradientType: 'linear',
  };

  // View state
  panX = 0; panY = 0; zoom = 1;
  sel: { x: number; y: number; w: number; h: number } | null = null;
  selMask: ImageData | null = null;

  // Drawing state
  drawing = false; sx = 0; sy = 0; lx = 0; ly = 0;
  lassoPts: Array<{ x: number; y: number }> = [];
  cloneSrc: { x: number; y: number } | null = null;
  cloneSet = false;
  textPos: { x: number; y: number } | null = null;
  textEl: HTMLTextAreaElement | null = null;

  private _ls: Array<() => void> = [];

  get doc(): CanvasDoc | null { return this.docs[this.docIdx] ?? null; }

  createDoc(name: string, w: number, h: number): CanvasDoc {
    const d = new CanvasDoc(name, w, h);
    this.docs.push(d); this.docIdx = this.docs.length - 1;
    this.hist.clear(); this.snap('New Image'); this._emit(); return d;
  }

  closeDoc(i: number): void {
    this.docs.splice(i, 1);
    if (this.docs.length === 0) { this.createDoc('Untitled', 800, 600); return; }
    if (this.docIdx >= this.docs.length) this.docIdx = this.docs.length - 1;
    this._emit();
  }

  switchDoc(i: number): void { if (i >= 0 && i < this.docs.length) { this.docIdx = i; this._emit(); } }

  setTool(t: ToolType): void { this.state.tool = t; this._resetDraw(); this._emit(); }
  private _resetDraw(): void { this.drawing = false; this.lassoPts = []; this.cloneSet = false; this._removeText(); }

  // --- History ---
  snap(name: string): void { const d = this.doc; if (d) this.hist.push(d.snap(name)); }
  async undo(): Promise<void> { const e = this.hist.undo(); if (e && this.doc) { await this.doc.restore(e); this._emit(); } }
  async redo(): Promise<void> { const e = this.hist.redo(); if (e && this.doc) { await this.doc.restore(e); this._emit(); } }

  // --- Pointer Events ---
  down(x: number, y: number, btn: number): void {
    const d = this.doc; if (!d) return;
    const cx = (x - this.panX) / this.zoom, cy = (y - this.panY) / this.zoom;
    const t = this.state.tool;
    if (t === ToolType.Brush || t === ToolType.Pencil || t === ToolType.Eraser) {
      this.drawing = true; this.sx = cx; this.sy = cy; this.lx = cx; this.ly = cy;
      this.snap(this.state.tool); this._stroke(cx, cy, cx, cy);
    } else if (t === ToolType.RectSelect || t === ToolType.EllipseSelect) {
      this.drawing = true; this.sx = cx; this.sy = cy;
      this.sel = { x: cx, y: cy, w: 0, h: 0 };
    } else if (t === ToolType.Lasso) {
      this.drawing = true; this.lassoPts = [{ x: cx, y: cy }];
    } else if (t === ToolType.MagicWand) {
      this._floodSelect(cx, cy);
    } else if (t === ToolType.Bucket) {
      this.snap('Fill'); this._floodFill(cx, cy);
    } else if (t === ToolType.Picker) {
      this._pickColor(cx, cy);
    } else if (t === ToolType.Clone) {
      if (!this.cloneSet) { this.cloneSrc = { x: cx, y: cy }; this.cloneSet = true; }
      else { this.drawing = true; this.snap('Clone'); this.lx = cx; this.ly = cy; this._cloneStroke(cx, cy); }
    } else if (t === ToolType.Recolor) {
      this.drawing = true; this.lx = cx; this.ly = cy; this.snap('Recolor'); this._recolor(cx, cy);
    } else if (t === ToolType.Text) {
      this.textPos = { x: cx, y: cy }; this._showText(cx, cy);
    } else if (t === ToolType.Line || t === ToolType.Curve || t === ToolType.Rect || t === ToolType.RoundRect || t === ToolType.Ellipse || t === ToolType.Freeform || t === ToolType.Gradient) {
      this.drawing = true; this.sx = cx; this.sy = cy;
    } else if (t === ToolType.Move) {
      this.drawing = true; this.sx = cx; this.sy = cy;
    } else if (t === ToolType.Pan) {
      this.drawing = true; this.sx = x; this.sy = y;
    } else if (t === ToolType.Zoom) {
      btn === 0 ? this.zoomIn(x, y) : this.zoomOut(x, y);
    }
    this._emit();
  }

  move(x: number, y: number): void {
    const cx = (x - this.panX) / this.zoom, cy = (y - this.panY) / this.zoom;
    if (this.drawing) {
      const t = this.state.tool;
      if (t === ToolType.Brush || t === ToolType.Pencil || t === ToolType.Eraser) {
        this._stroke(this.lx, this.ly, cx, cy); this.lx = cx; this.ly = cy;
      } else if (t === ToolType.RectSelect || t === ToolType.EllipseSelect) {
        if (this.sel) { this.sel.w = cx - this.sx; this.sel.h = cy - this.sy; }
      } else if (t === ToolType.Lasso) {
        this.lassoPts.push({ x: cx, y: cy });
      } else if (t === ToolType.Clone && this.cloneSet) {
        this._cloneStroke(cx, cy); this.lx = cx; this.ly = cy;
      } else if (t === ToolType.Recolor) {
        this._recolor(cx, cy);
      } else if (t === ToolType.Move) {
        if (this.sel) { this.sel.x += cx - this.sx; this.sel.y += cy - this.sy; this.sx = cx; this.sy = cy; }
      } else if (t === ToolType.Pan) {
        this.panX += x - this.sx; this.panY += y - this.sy; this.sx = x; this.sy = y;
      }
      this._emit();
    }
  }

  up(x: number, y: number): void {
    if (!this.drawing) return;
    const cx = (x - this.panX) / this.zoom, cy = (y - this.panY) / this.zoom;
    const t = this.state.tool;
    if (t === ToolType.Rect || t === ToolType.RoundRect || t === ToolType.Ellipse || t === ToolType.Line || t === ToolType.Gradient) {
      this.snap(this.state.tool); this._drawShape(cx, cy);
    } else if (t === ToolType.Lasso) {
      this._closeLasso();
    }
    this.drawing = false; this._emit();
  }

  // --- Brush stroke ---
  private _stroke(fx: number, fy: number, tx: number, ty: number): void {
    const l = this.doc?.active; if (!l) return;
    const ctx = l.ctx; const c = this.color.active; const eraser = this.state.tool === ToolType.Eraser;
    const sz = this.state.brushSize;
    ctx.save(); ctx.lineWidth = sz; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (eraser) ctx.globalCompositeOperation = 'destination-out';
    const hard = this.state.tool === ToolType.Pencil || this.state.hardness >= 95;
    if (hard) {
      ctx.strokeStyle = eraser ? 'rgba(0,0,0,1)' : this.color.rgbaStr(c);
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
    } else {
      const steps = Math.max(1, Math.ceil(Math.hypot(tx - fx, ty - fy) / (sz * 0.25)));
      const alpha = eraser ? 1 : (c.a / 255) * (this.state.hardness / 100);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = fx + (tx - fx) * t, py = fy + (ty - fy) * t;
        ctx.fillStyle = eraser ? `rgba(0,0,0,${alpha})` : `rgba(${c.r},${c.g},${c.b},${alpha})`;
        ctx.beginPath(); ctx.arc(px, py, sz / 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  // --- Shape ---
  private _drawShape(ex: number, ey: number): void {
    const l = this.doc?.active; if (!l) return;
    const ctx = l.ctx; const c = this.color.active;
    const x = Math.min(this.sx, ex), y = Math.min(this.sy, ey);
    const w = Math.abs(ex - this.sx), h = Math.abs(ey - this.sy);
    ctx.save();
    ctx.strokeStyle = this.color.rgbaStr(c); ctx.fillStyle = this.color.rgbaStr(c);
    ctx.lineWidth = this.state.brushSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const fm = this.state.fillMode;

    const doFill = fm === ShapeFill.Filled || fm === ShapeFill.FilledOutline;
    const doStroke = fm === ShapeFill.Outline || fm === ShapeFill.FilledOutline;

    if (this.state.tool === ToolType.Rect) {
      if (doFill) ctx.fillRect(x, y, w, h);
      if (doStroke) ctx.strokeRect(x, y, w, h);
    } else if (this.state.tool === ToolType.RoundRect) {
      const r = this.state.cornerRadius;
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
      if (doFill) ctx.fill(); if (doStroke) ctx.stroke();
    } else if (this.state.tool === ToolType.Ellipse) {
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      if (doFill) ctx.fill(); if (doStroke) ctx.stroke();
    } else if (this.state.tool === ToolType.Line) {
      ctx.beginPath(); ctx.moveTo(this.sx, this.sy); ctx.lineTo(ex, ey); ctx.stroke();
    } else if (this.state.tool === ToolType.Gradient) {
      const grad = this.state.gradientType === 'radial'
        ? ctx.createRadialGradient(this.sx, this.sy, 0, this.sx, this.sy, Math.hypot(ex - this.sx, ey - this.sy))
        : ctx.createLinearGradient(this.sx, this.sy, ex, ey);
      grad.addColorStop(0, this.color.rgbaStr(this.color.pri));
      grad.addColorStop(1, this.color.rgbaStr(this.color.sec));
      ctx.fillStyle = grad;
      if (this.sel) ctx.fillRect(this.sel.x, this.sel.y, this.sel.w, this.sel.h);
      else ctx.fillRect(0, 0, l.width, l.height);
    }
    ctx.restore();
  }

  // --- Flood fill ---
  private _floodFill(sx: number, sy: number): void {
    const l = this.doc?.active; if (!l) return;
    const w = l.width, h = l.height;
    const id = l.getImageData(0, 0, w, h), d = id.data;
    const px = Math.floor(sx), py = Math.floor(sy);
    if (px < 0 || px >= w || py < 0 || py >= h) return;
    const i0 = (py * w + px) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
    const fc = this.color.active;
    if (tr === fc.r && tg === fc.g && tb === fc.b && ta === fc.a) return;
    const tol = this.state.tolerance;
    const stack: [number, number][] = [[px, py]];
    const vis = new Uint8Array(w * h);
    while (stack.length) {
      const [px2, py2] = stack.pop()!; const pi = py2 * w + px2;
      if (vis[pi]) continue; vis[pi] = 1;
      const i = pi * 4;
      if (Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol && Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol) {
        d[i] = fc.r; d[i + 1] = fc.g; d[i + 2] = fc.b; d[i + 3] = fc.a;
        if (px2 > 0) stack.push([px2 - 1, py2]); if (px2 < w - 1) stack.push([px2 + 1, py2]);
        if (py2 > 0) stack.push([px2, py2 - 1]); if (py2 < h - 1) stack.push([px2, py2 + 1]);
      }
    }
    l.putImageData(id, 0, 0);
  }

  // --- Magic wand ---
  private _floodSelect(sx: number, sy: number): void {
    const l = this.doc?.active; if (!l) return;
    const w = l.width, h = l.height;
    const id = l.getImageData(0, 0, w, h), d = id.data;
    const px = Math.floor(sx), py = Math.floor(sy);
    if (px < 0 || px >= w || py < 0 || py >= h) return;
    const i0 = (py * w + px) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
    const tol = this.state.tolerance;
    const stack: [number, number][] = [[px, py]];
    const vis = new Uint8Array(w * h);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    while (stack.length) {
      const [px2, py2] = stack.pop()!; const pi = py2 * w + px2;
      if (vis[pi]) continue; vis[pi] = 1;
      const i = pi * 4;
      if (Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol && Math.abs(d[i + 2] - tb) <= tol && Math.abs(d[i + 3] - ta) <= tol) {
        minX = Math.min(minX, px2); minY = Math.min(minY, py2);
        maxX = Math.max(maxX, px2); maxY = Math.max(maxY, py2);
        if (px2 > 0) stack.push([px2 - 1, py2]); if (px2 < w - 1) stack.push([px2 + 1, py2]);
        if (py2 > 0) stack.push([px2, py2 - 1]); if (py2 < h - 1) stack.push([px2, py2 + 1]);
      }
    }
    if (minX <= maxX) this.sel = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  // --- Lasso ---
  private _closeLasso(): void {
    if (this.lassoPts.length < 3) { this.lassoPts = []; return; }
    let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
    for (const p of this.lassoPts) { mx = Math.min(mx, p.x); my = Math.min(my, p.y); Mx = Math.max(Mx, p.x); My = Math.max(My, p.y); }
    this.sel = { x: mx, y: my, w: Mx - mx, h: My - my };
    this.lassoPts = [];
  }

  // --- Clone stamp ---
  private _cloneStroke(tx: number, ty: number): void {
    if (!this.cloneSrc) return;
    const l = this.doc?.active; if (!l) return;
    const sz = this.state.brushSize, ctx = l.ctx;
    ctx.save(); ctx.beginPath(); ctx.arc(tx, ty, sz / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(l.canvas, this.cloneSrc.x - sz / 2, this.cloneSrc.y - sz / 2, sz, sz, tx - sz / 2, ty - sz / 2, sz, sz);
    ctx.restore();
  }

  // --- Recolor ---
  private _recolor(x: number, y: number): void {
    const l = this.doc?.active; if (!l) return;
    const ctx = l.ctx; const c = this.color.active;
    ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = this.color.rgbaStr(c);
    ctx.beginPath(); ctx.arc(x, y, this.state.brushSize / 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // --- Color picker ---
  private _pickColor(x: number, y: number): void {
    const l = this.doc?.active; if (!l) return;
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || ix >= l.width || iy < 0 || iy >= l.height) return;
    const p = l.getImageData(ix, iy, 1, 1).data;
    this.color.pri = { r: p[0], g: p[1], b: p[2], a: p[3] };
    this.color.priActive = true;
  }

  // --- Text ---
  private _showText(x: number, y: number): void {
    this._removeText();
    const ta = document.createElement('textarea');
    ta.style.cssText = `position:absolute;left:${x*this.zoom+this.panX}px;top:${y*this.zoom+this.panY}px;font-size:${this.state.brushSize*3}px;color:${this.color.rgbaStr(this.color.active)};background:transparent;border:1px dashed #999;outline:none;min-width:40px;min-height:20px;resize:both;overflow:hidden;z-index:100;font-family:-apple-system,sans-serif;`;
    ta.addEventListener('blur', () => this._commitText(ta));
    ta.addEventListener('keydown', e => { if (e.key === 'Escape') this._removeText(); else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._commitText(ta); } });
    document.getElementById('canvas-wrap')?.appendChild(ta);
    this.textEl = ta; setTimeout(() => ta.focus(), 50);
  }
  private _commitText(ta: HTMLTextAreaElement): void {
    if (!this.textEl) return; const txt = ta.value; this._removeText();
    if (!txt.trim()) return;
    const l = this.doc?.active; if (!l) return;
    this.snap('Text');
    l.ctx.save(); l.ctx.font = `${this.state.brushSize*3}px -apple-system,sans-serif`;
    l.ctx.fillStyle = this.color.rgbaStr(this.color.active); l.ctx.textBaseline = 'top';
    if (this.textPos) l.ctx.fillText(txt, this.textPos.x, this.textPos.y);
    l.ctx.restore(); this.textPos = null;
  }
  private _removeText(): void { if (this.textEl) { this.textEl.remove(); this.textEl = null; } }

  // --- Zoom / Pan ---
  zoomIn(cx: number, cy: number): void {
    const nz = Math.min(this.zoom * 1.25, 32);
    this.panX = cx - (cx - this.panX) * (nz / this.zoom);
    this.panY = cy - (cy - this.panY) * (nz / this.zoom);
    this.zoom = nz; this._emit();
  }
  zoomOut(cx: number, cy: number): void {
    const nz = Math.max(this.zoom / 1.25, 0.01);
    this.panX = cx - (cx - this.panX) * (nz / this.zoom);
    this.panY = cy - (cy - this.panY) * (nz / this.zoom);
    this.zoom = nz; this._emit();
  }
  zoomFit(vw: number, vh: number): void {
    const d = this.doc; if (!d) return;
    this.zoom = Math.min((vw - 40) / d.width, (vh - 40) / d.height, 1);
    this.panX = (vw - d.width * this.zoom) / 2;
    this.panY = (vh - d.height * this.zoom) / 2;
    this._emit();
  }

  // --- Selection ops ---
  selectAll(): void { const d = this.doc; if (d) { this.sel = { x: 0, y: 0, w: d.width, h: d.height }; this._emit(); } }
  deselect(): void { this.sel = null; this.selMask = null; this._emit(); }
  clearSel(): void {
    if (!this.sel) return; const l = this.doc?.active; if (!l) return;
    this.snap('Clear'); l.ctx.clearRect(this.sel.x, this.sel.y, this.sel.w, this.sel.h);
    this.sel = null; this._emit();
  }
  fillSel(): void {
    if (!this.sel) return; const l = this.doc?.active; if (!l) return;
    this.snap('Fill Selection'); const c = this.color.active;
    l.ctx.fillStyle = this.color.rgbaStr(c);
    l.ctx.fillRect(this.sel.x, this.sel.y, this.sel.w, this.sel.h);
    this._emit();
  }
  cropToSel(): void {
    if (!this.sel) return; const d = this.doc; if (!d) return;
    this.snap('Crop');
    const { x, y, w, h } = this.sel;
    for (const l of d.layers) {
      const t = document.createElement('canvas'); t.width = w; t.height = h;
      t.getContext('2d')!.drawImage(l.canvas, x, y, w, h, 0, 0, w, h);
      l.resize(w, h); l.ctx.drawImage(t, 0, 0);
    }
    d.width = w; d.height = h; this.sel = null; this.panX = 0; this.panY = 0; this.zoom = 1; this._emit();
  }

  // --- Layer ops ---
  addLayer(): void { const d = this.doc; if (!d) return; this.snap('Add Layer'); d.addLayer(`Layer ${d.layers.length}`); this._emit(); }
  delLayer(): void { const d = this.doc; if (!d || d.layers.length <= 1) return; this.snap('Delete Layer'); d.delLayer(d.activeIdx); this._emit(); }
  dupLayer(): void { const d = this.doc; if (!d) return; this.snap('Duplicate Layer'); d.dupLayer(d.activeIdx); this._emit(); }
  mergeD(): void { const d = this.doc; if (!d) return; this.snap('Merge Down'); d.mergeDown(d.activeIdx); this._emit(); }
  moveUp(): void { const d = this.doc; if (!d) return; d.moveUp(d.activeIdx); this._emit(); }
  moveDown(): void { const d = this.doc; if (!d) return; d.moveDown(d.activeIdx); this._emit(); }
  flatten(): void { const d = this.doc; if (!d) return; this.snap('Flatten'); d.flatten(); this._emit(); }

  // --- Transforms ---
  flipH(): void { const l = this.doc?.active; if (!l) return; this.snap('Flip Horizontal'); l.ctx.save(); l.ctx.translate(l.width, 0); l.ctx.scale(-1, 1); l.ctx.drawImage(l.canvas, 0, 0); l.ctx.restore(); this._emit(); }
  flipV(): void { const l = this.doc?.active; if (!l) return; this.snap('Flip Vertical'); l.ctx.save(); l.ctx.translate(0, l.height); l.ctx.scale(1, -1); l.ctx.drawImage(l.canvas, 0, 0); l.ctx.restore(); this._emit(); }
  rotateCW(): void {
    const l = this.doc?.active; if (!l) return; this.snap('Rotate CW');
    const w = l.width, h = l.height;
    const t = document.createElement('canvas'); t.width = h; t.height = w;
    const tx = t.getContext('2d')!; tx.translate(h, 0); tx.rotate(Math.PI / 2); tx.drawImage(l.canvas, 0, 0);
    l.resize(h, w); l.ctx.drawImage(t, 0, 0);
    if (this.doc) { this.doc.width = h; this.doc.height = w; } this._emit();
  }
  rotateCCW(): void {
    const l = this.doc?.active; if (!l) return; this.snap('Rotate CCW');
    const w = l.width, h = l.height;
    const t = document.createElement('canvas'); t.width = h; t.height = w;
    const tx = t.getContext('2d')!; tx.translate(0, w); tx.rotate(-Math.PI / 2); tx.drawImage(l.canvas, 0, 0);
    l.resize(h, w); l.ctx.drawImage(t, 0, 0);
    if (this.doc) { this.doc.width = h; this.doc.height = w; } this._emit();
  }

  // --- Effects ---
  applyEffect(fn: (data: Uint8ClampedArray, w: number, h: number) => void, name: string): void {
    const l = this.doc?.active; if (!l) return;
    this.snap(name);
    const id = l.getImageData(0, 0, l.width, l.height);
    fn(id.data, l.width, l.height);
    l.putImageData(id, 0, 0);
    this._emit();
  }

  invert(): void { this.applyEffect((d) => { for (let i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } }, 'Invert'); }
  bw(): void { this.applyEffect((d) => { for (let i = 0; i < d.length; i += 4) { const g = Math.round(d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11); d[i] = g; d[i + 1] = g; d[i + 2] = g; } }, 'B&W'); }
  sepia(): void { this.applyEffect((d) => { for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; d[i] = Math.min(255, r * .393 + g * .769 + b * .189); d[i + 1] = Math.min(255, r * .349 + g * .686 + b * .168); d[i + 2] = Math.min(255, r * .272 + g * .534 + b * .131); } }, 'Sepia'); }
  blur(r: number): void {
    const l = this.doc?.active; if (!l) return;
    this.snap('Gaussian Blur');
    const w = l.width, h = l.height;
    const id = l.getImageData(0, 0, w, h), o = new Uint8ClampedArray(id.data), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, aa = 0, n = 0;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) { const j = (ny * w + nx) * 4; rr += d[j]; gg += d[j + 1]; bb += d[j + 2]; aa += d[j + 3]; n++; }
      }
      const j = (y * w + x) * 4; o[j] = rr / n; o[j + 1] = gg / n; o[j + 2] = bb / n; o[j + 3] = aa / n;
    }
    id.data.set(o); l.putImageData(id, 0, 0); this._emit();
  }
  sharpen(): void {
    const l = this.doc?.active; if (!l) return; this.snap('Sharpen');
    const w = l.width, h = l.height;
    const id = l.getImageData(0, 0, w, h), o = new Uint8ClampedArray(id.data), d = id.data;
    const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let rr = 0, gg = 0, bb = 0;
      for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) { const j = ((y + ky) * w + (x + kx)) * 4; const ki = (ky + 1) * 3 + (kx + 1); rr += d[j] * k[ki]; gg += d[j + 1] * k[ki]; bb += d[j + 2] * k[ki]; }
      const j = (y * w + x) * 4; o[j] = Math.min(255, Math.max(0, rr)); o[j + 1] = Math.min(255, Math.max(0, gg)); o[j + 2] = Math.min(255, Math.max(0, bb));
    }
    id.data.set(o); l.putImageData(id, 0, 0); this._emit();
  }
  edgeDetect(): void {
    const l = this.doc?.active; if (!l) return; this.snap('Edge Detect');
    const w = l.width, h = l.height;
    const id = l.getImageData(0, 0, w, h), o = new Uint8ClampedArray(id.data), d = id.data;
    const kx = [-1, 0, 1, -2, 0, 2, -1, 0, 1], ky = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let gr = 0, gg = 0, gb = 0, hr = 0, hg = 0, hb = 0;
      for (let ky2 = -1; ky2 <= 1; ky2++) for (let kx2 = -1; kx2 <= 1; kx2++) { const j = ((y + ky2) * w + (x + kx2)) * 4; const ki = (ky2 + 1) * 3 + (kx2 + 1); gr += d[j] * kx[ki]; gg += d[j + 1] * kx[ki]; gb += d[j + 2] * kx[ki]; hr += d[j] * ky[ki]; hg += d[j + 1] * ky[ki]; hb += d[j + 2] * ky[ki]; }
      const j = (y * w + x) * 4; o[j] = Math.min(255, Math.sqrt(gr * gr + hr * hr)); o[j + 1] = Math.min(255, Math.sqrt(gg * gg + hg * hg)); o[j + 2] = Math.min(255, Math.sqrt(gb * gb + hb * hb));
    }
    id.data.set(o); l.putImageData(id, 0, 0); this._emit();
  }
  emboss(): void {
    const l = this.doc?.active; if (!l) return; this.snap('Emboss');
    const w = l.width, h = l.height;
    const id = l.getImageData(0, 0, w, h), o = new Uint8ClampedArray(id.data), d = id.data;
    const k = [-1, -1, 0, -1, 0, 1, 0, 1, 1];
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      let rr = 0, gg = 0, bb = 0;
      for (let ky = -1; ky <= 1; ky++) for (let kx = -1; kx <= 1; kx++) { const j = ((y + ky) * w + (x + kx)) * 4; const ki = (ky + 1) * 3 + (kx + 1); rr += d[j] * k[ki]; gg += d[j + 1] * k[ki]; bb += d[j + 2] * k[ki]; }
      const j = (y * w + x) * 4; o[j] = Math.min(255, Math.max(0, rr + 128)); o[j + 1] = Math.min(255, Math.max(0, gg + 128)); o[j + 2] = Math.min(255, Math.max(0, bb + 128));
    }
    id.data.set(o); l.putImageData(id, 0, 0); this._emit();
  }
  pixelate(ps: number): void {
    const l = this.doc?.active; if (!l) return; this.snap('Pixelate');
    const w = l.width, h = l.height;
    const id = l.getImageData(0, 0, w, h), d = id.data;
    for (let y = 0; y < h; y += ps) for (let x = 0; x < w; x += ps) {
      let rr = 0, gg = 0, bb = 0, aa = 0, n = 0;
      for (let dy = 0; dy < ps && y + dy < h; dy++) for (let dx = 0; dx < ps && x + dx < w; dx++) { const j = ((y + dy) * w + (x + dx)) * 4; rr += d[j]; gg += d[j + 1]; bb += d[j + 2]; aa += d[j + 3]; n++; }
      for (let dy = 0; dy < ps && y + dy < h; dy++) for (let dx = 0; dx < ps && x + dx < w; dx++) { const j = ((y + dy) * w + (x + dx)) * 4; d[j] = rr / n; d[j + 1] = gg / n; d[j + 2] = bb / n; d[j + 3] = aa / n; }
    }
    l.putImageData(id, 0, 0); this._emit();
  }

  // --- Image loading ---
  loadImage(dataUrl: string, name = 'Imported'): void {
    const img = new Image();
    img.onload = () => {
      const d = this.createDoc(name, img.width, img.height);
      d.layers[0].drawImage(img);
      d.modified = false; this.hist.clear(); this.snap('Open'); this._emit();
    };
    img.src = dataUrl;
  }

  loadFromFile(path: string, buf: ArrayBuffer): void {
    const blob = new Blob([buf]);
    const url = URL.createObjectURL(blob);
    this.loadImage(url, path.split('/').pop() || 'Imported');
    URL.revokeObjectURL(url);
  }

  // --- Composite export ---
  compositeDataURL(fmt = 'image/png', q?: number): string {
    return this.doc?.toDataURL(fmt, q) || '';
  }

  onChange(fn: () => void): void { this._ls.push(fn); }
  private _emit(): void { for (const fn of this._ls) fn(); }
}
