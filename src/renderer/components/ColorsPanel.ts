// McPaint — Colors Panel (owns its color wheel drawing)
import { FloatingPanel } from './FloatingPanel';
import { ColorMgr } from '../services/ColorManager';

export class ColorsPanel extends FloatingPanel {
  cm: ColorMgr;
  private _wheelDrawn = false;
  private _wheelObserver: ResizeObserver | null = null;

  constructor(cm: ColorMgr) {
    super('colors-panel', 'Colors', 9, 999, 210);
    this.cm = cm;
    this.build();
  }

  private build(): void {
    const cm = this.cm;
    this.body.innerHTML = `
      <div id="cwheel-wrap"><canvas id="cwheel" width="130" height="130"></canvas><div id="cwheel-ptr"></div></div>
      <div class="pal-row" id="pal-grid"></div>
      <div class="swatch-row">
        <div class="color-box active" id="cb-pri"><div class="color-box-inner"></div></div>
        <div class="color-box" id="cb-sec"><div class="color-box-inner"></div></div>
        <button class="swap-btn" id="btn-swap" title="Swap Primary/Secondary Colors (X)">⇄</button>
        <button class="reset-btn" id="btn-reset-colors" title="Reset to Black & White">↺</button>
      </div>
      <div class="more-link"><button id="btn-more">More ▾</button></div>
      <div id="color-extras" style="display:none">
        <div class="color-row"><lbl>R</lbl><input type="range" id="cs-r" min="0" max="255"><input type="number" id="cn-r" min="0" max="255" class="color-num"></div>
        <div class="color-row"><lbl>G</lbl><input type="range" id="cs-g" min="0" max="255"><input type="number" id="cn-g" min="0" max="255" class="color-num"></div>
        <div class="color-row"><lbl>B</lbl><input type="range" id="cs-b" min="0" max="255"><input type="number" id="cn-b" min="0" max="255" class="color-num"></div>
        <div class="color-row"><lbl>A</lbl><input type="range" id="cs-a" min="0" max="255" value="255"><input type="number" id="cn-a" min="0" max="255" value="255" class="color-num"></div>
        <div class="color-row"><lbl>H</lbl><input type="range" id="cs-h" min="0" max="360"><input type="number" id="cn-h" min="0" max="360" class="color-num"></div>
        <div class="color-row"><lbl>S</lbl><input type="range" id="cs-s" min="0" max="100"><input type="number" id="cn-s" min="0" max="100" class="color-num"></div>
        <div class="color-row"><lbl>V</lbl><input type="range" id="cs-v" min="0" max="100"><input type="number" id="cn-v" min="0" max="100" class="color-num"></div>
        <div class="color-row"><lbl>#</lbl><input type="text" id="chex" value="#000000" class="color-hex"></div>
      </div>`;

    // Wire events
    const w = this.body.querySelector('#cwheel') as HTMLCanvasElement;
    const pt = this.body.querySelector('#cwheel-ptr') as HTMLElement;

    // Set up ResizeObserver to redraw wheel when panel becomes visible or resizes
    this._wheelObserver = new ResizeObserver(() => {
      if (this.visible && this.el.offsetWidth > 0) {
        requestAnimationFrame(() => this.drawWheel());
      }
    });
    this._wheelObserver.observe(this.el);

    const onWheel = (e: MouseEvent, isRight = false) => {
      const r = w.getBoundingClientRect();
      const cx2 = e.clientX - r.left, cy2 = e.clientY - r.top;
      const R = r.width / 2, dx = cx2 - R, dy = cy2 - R, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= R) {
        const c = ColorMgr.hsva2rgba({ h: Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360), s: Math.round(Math.min(100, (d / R) * 100)), v: 100, a: isRight ? cm.sec.a : cm.pri.a });
        if (isRight) {
          cm.priActive = false;
          cm.active = c;
        } else {
          cm.active = c;
        }
        pt.style.left = `${cx2}px`; pt.style.top = `${cy2}px`;
        this.refreshUI();
      }
    };
    w.addEventListener('pointerdown', e => {
      onWheel(e as any);
      const mv = (ev: MouseEvent) => onWheel(ev);
      w.addEventListener('pointermove', mv);
      w.addEventListener('pointerup', () => w.removeEventListener('pointermove', mv), { once: true });
    });

    // Right-click = secondary color
    w.addEventListener('contextmenu', e => {
      e.preventDefault();
      onWheel(e as any, true);
    });

    // Left click primary/secondary toggles
    this.body.querySelector('#cb-pri')!.addEventListener('click', () => { cm.priActive = true; this.refreshUI(); });
    this.body.querySelector('#cb-sec')!.addEventListener('click', () => { cm.priActive = false; this.refreshUI(); });
    // Right-click on color boxes to set secondary
    this.body.querySelector('#cb-pri')!.addEventListener('contextmenu', e => { e.preventDefault(); cm.priActive = false; this.refreshUI(); });
    this.body.querySelector('#cb-sec')!.addEventListener('contextmenu', e => { e.preventDefault(); cm.priActive = true; this.refreshUI(); });

    this.body.querySelector('#btn-swap')!.addEventListener('click', () => { cm.swap(); this.refreshUI(); });
    this.body.querySelector('#btn-reset-colors')!.addEventListener('click', () => {
      cm.pri = { r: 0, g: 0, b: 0, a: 255 };
      cm.sec = { r: 255, g: 255, b: 255, a: 255 };
      cm.priActive = true;
      cm._notify();
      this.refreshUI();
    });
    this.body.querySelector('#btn-more')!.addEventListener('click', () => {
      const ex = this.body.querySelector('#color-extras') as HTMLElement;
      const btn = this.body.querySelector('#btn-more') as HTMLElement;
      const wasHidden = ex.style.display === 'none';
      ex.style.display = wasHidden ? 'block' : 'none';
      btn.textContent = wasHidden ? 'Less ▴' : 'More ▾';
      if (wasHidden) {
        requestAnimationFrame(() => this.drawWheel());
      }
    });

    const bindRgb = (id: string, ch: 'r'|'g'|'b'|'a') => {
      const s = this.body.querySelector(`#cs-${id}`) as HTMLInputElement;
      const n = this.body.querySelector(`#cn-${id}`) as HTMLInputElement;
      const update = () => { const v = parseInt(s.value); n.value = String(v); cm.active = { ...cm.active, [ch]: v }; this.refreshUI(); };
      s.addEventListener('input', update);
      n.addEventListener('change', () => { let v = parseInt(n.value); v = Math.max(0, Math.min(ch === 'a' ? 255 : 255, v || 0)); n.value = String(v); s.value = String(v); cm.active = { ...cm.active, [ch]: v }; this.refreshUI(); });
    };
    bindRgb('r', 'r'); bindRgb('g', 'g'); bindRgb('b', 'b'); bindRgb('a', 'a');

    // HSV sliders
    const bindHsv = () => {
      const hs = this.body.querySelector('#cs-h') as HTMLInputElement;
      const hn = this.body.querySelector('#cn-h') as HTMLInputElement;
      const ss = this.body.querySelector('#cs-s') as HTMLInputElement;
      const sn = this.body.querySelector('#cn-s') as HTMLInputElement;
      const vs = this.body.querySelector('#cs-v') as HTMLInputElement;
      const vn = this.body.querySelector('#cn-v') as HTMLInputElement;
      const updateHsv = () => {
        const h = parseInt(hs.value), sv = parseInt(ss.value), v = parseInt(vs.value);
        hn.value = String(h); sn.value = String(sv); vn.value = String(v);
        const c = ColorMgr.hsva2rgba({ h, s: sv, v, a: cm.active.a });
        cm.active = c; this.refreshUI();
      };
      [hs, ss, vs].forEach(s => s.addEventListener('input', updateHsv));
      [hn, sn, vn].forEach((n, i) => n.addEventListener('change', () => {
        const vals = [parseInt(hn.value), parseInt(sn.value), parseInt(vn.value)];
        const limits = [360, 100, 100];
        const v2 = Math.max(0, Math.min(limits[i]!, vals[i]! || 0));
        n.value = String(v2);
        [hs, ss, vs][i]!.value = String(v2);
        updateHsv();
      }));
    };
    bindHsv();

    const hex = this.body.querySelector('#chex') as HTMLInputElement;
    hex.addEventListener('change', () => {
      const v = hex.value;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { const c = cm.fromHex(v); c.a = cm.active.a; cm.active = c; this.refreshUI(); }
    });

    // Palette grid
    const pg = this.body.querySelector('#pal-grid')!;
    const allPalette = ColorMgr.palette();
    for (const sw of allPalette) {
      const d = document.createElement('div'); d.className = 'pal-swatch';
      d.style.backgroundColor = cm.rgbaStr(sw);
      d.addEventListener('click', () => { cm.active = sw; this.refreshUI(); });
      d.addEventListener('contextmenu', e => { e.preventDefault(); cm.priActive = false; cm.active = sw; this.refreshUI(); });
      pg.appendChild(d);
    }

    cm.onChange(() => this.refreshUI());
    this.refreshUI();
  }

  /** Draw the HSV color wheel with devicePixelRatio support */
  drawWheel(): void {
    const w = this.body.querySelector('#cwheel') as HTMLCanvasElement | null;
    if (!w || w.offsetWidth === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(w.clientWidth, w.clientHeight);
    if (displaySize === 0) return;
    w.width = displaySize * dpr;
    w.height = displaySize * dpr;
    w.style.width = `${displaySize}px`;
    w.style.height = `${displaySize}px`;
    const ctx = w.getContext('2d')!;
    ctx.scale(dpr, dpr);
    const R = displaySize / 2;
    const imgData = ctx.createImageData(displaySize, displaySize);
    for (let y = 0; y < displaySize; y++) {
      for (let x = 0; x < displaySize; x++) {
        const dx = x - R, dy = y - R, d = Math.sqrt(dx * dx + dy * dy);
        const i = (y * displaySize + x) * 4;
        if (d <= R) {
          const c = ColorMgr.hsva2rgba({
            h: Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360),
            s: Math.round(Math.min(100, (d / R) * 100)),
            v: 100, a: 255
          });
          imgData.data[i] = c.r;
          imgData.data[i + 1] = c.g;
          imgData.data[i + 2] = c.b;
          imgData.data[i + 3] = 255;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
    this._wheelDrawn = true;
  }

  /** Override: draw wheel after DOM insertion */
  appendTo(parent: HTMLElement): void {
    super.appendTo(parent);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.drawWheel());
    });
  }

  /** Override visible setter to redraw wheel on show */
  set visible(v: boolean) {
    super.visible = v;
    if (v) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.drawWheel());
      });
    }
  }
  get visible(): boolean { return super.visible; }

  refreshUI(): void {
    const cm = this.cm;
    const p = this.body.querySelector('#cb-pri .color-box-inner') as HTMLElement;
    const s = this.body.querySelector('#cb-sec .color-box-inner') as HTMLElement;
    if (p) p.style.backgroundColor = cm.rgbaStr(cm.pri);
    if (s) s.style.backgroundColor = cm.rgbaStr(cm.sec);
    this.body.querySelector('#cb-pri')!.classList.toggle('active', cm.priActive);
    this.body.querySelector('#cb-sec')!.classList.toggle('active', !cm.priActive);

    const a = cm.active;
    const set = (id: string, v: string) => { const el = this.body.querySelector(`#${id}`) as HTMLInputElement; if (el) el.value = v; };
    set('cs-r', String(a.r)); set('cn-r', String(a.r));
    set('cs-g', String(a.g)); set('cn-g', String(a.g));
    set('cs-b', String(a.b)); set('cn-b', String(a.b));
    set('cs-a', String(a.a)); set('cn-a', String(a.a));
    set('chex', cm.toHex());

    const hsva = ColorMgr.rgba2hsva(a);
    set('cs-h', String(hsva.h)); set('cn-h', String(hsva.h));
    set('cs-s', String(hsva.s)); set('cn-s', String(hsva.s));
    set('cs-v', String(hsva.v)); set('cn-v', String(hsva.v));

    const w = this.body.querySelector('#cwheel') as HTMLCanvasElement | null;
    const pt = this.body.querySelector('#cwheel-ptr') as HTMLElement | null;
    if (w && pt) {
      const displaySize = Math.min(w.clientWidth, w.clientHeight);
      const R = displaySize / 2;
      const ang = (hsva.h * Math.PI) / 180;
      const dist = (hsva.s / 100) * R;
      pt.style.left = `${R + Math.cos(ang) * dist}px`;
      pt.style.top = `${R + Math.sin(ang) * dist}px`;
    }
  }

  destroy(): void {
    if (this._wheelObserver) {
      this._wheelObserver.disconnect();
      this._wheelObserver = null;
    }
  }
}
