// McPaint — Colors Panel
import { FloatingPanel } from './FloatingPanel';
import { ColorMgr } from '../services/ColorManager';

export class ColorsPanel extends FloatingPanel {
  cm: ColorMgr;

  constructor(cm: ColorMgr, redrawWheel: () => void) {
    super('colors-panel', 'Colors', 9, 999, 210); // y set later
    this.cm = cm;
    this.build(redrawWheel);
  }

  private build(redrawWheel: () => void): void {
    const cm = this.cm;
    this.body.innerHTML = `
      <div id="cwheel-wrap"><canvas id="cwheel" width="120" height="120"></canvas><div id="cwheel-ptr"></div></div>
      <div class="pal-row" id="pal-grid"></div>
      <div class="swatch-row">
        <div class="color-box active" id="cb-pri"><div class="color-box-inner"></div></div>
        <div class="color-box" id="cb-sec"><div class="color-box-inner"></div></div>
        <button class="swap-btn" id="btn-swap" title="Swap (X)">⇄</button>
        <button class="reset-btn" id="btn-reset" title="Reset B/W">◐</button>
      </div>
      <div class="more-link"><button id="btn-more">More &gt;&gt;</button></div>
      <div id="color-extras" style="display:none">
        <div class="color-row"><lbl>R</lbl><input type="range" id="cs-r" min="0" max="255"><input type="number" id="cn-r" min="0" max="255" class="color-num"></div>
        <div class="color-row"><lbl>G</lbl><input type="range" id="cs-g" min="0" max="255"><input type="number" id="cn-g" min="0" max="255" class="color-num"></div>
        <div class="color-row"><lbl>B</lbl><input type="range" id="cs-b" min="0" max="255"><input type="number" id="cn-b" min="0" max="255" class="color-num"></div>
        <div class="color-row"><lbl>A</lbl><input type="range" id="cs-a" min="0" max="255" value="255"><input type="number" id="cn-a" min="0" max="255" value="255" class="color-num"></div>
        <div class="color-row"><lbl>#</lbl><input type="text" id="chex" value="#000000" class="color-hex"></div>
      </div>`;

    // Wire events
    const w = this.body.querySelector('#cwheel') as HTMLCanvasElement;
    const pt = this.body.querySelector('#cwheel-ptr') as HTMLElement;
    redrawWheel();

    const onWheel = (e: MouseEvent) => {
      const r = w.getBoundingClientRect();
      const cx2 = e.clientX - r.left, cy2 = e.clientY - r.top;
      const R = r.width / 2, dx = cx2 - R, dy = cy2 - R, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= R) {
        const c = ColorMgr.hsva2rgba({ h: Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360), s: Math.round(Math.min(100, (d / R) * 100)), v: 100, a: cm.active.a });
        cm.active = c;
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

    this.body.querySelector('#cb-pri')!.addEventListener('click', () => { cm.priActive = true; this.refreshUI(); });
    this.body.querySelector('#cb-sec')!.addEventListener('click', () => { cm.priActive = false; this.refreshUI(); });
    this.body.querySelector('#btn-swap')!.addEventListener('click', () => { cm.swap(); this.refreshUI(); });
    this.body.querySelector('#btn-reset')!.addEventListener('click', () => { cm.pri = { r: 0, g: 0, b: 0, a: 255 }; cm.sec = { r: 255, g: 255, b: 255, a: 255 }; this.refreshUI(); });
    this.body.querySelector('#btn-more')!.addEventListener('click', () => {
      const ex = this.body.querySelector('#color-extras') as HTMLElement;
      const btn = this.body.querySelector('#btn-more') as HTMLElement;
      ex.style.display = ex.style.display === 'none' ? 'block' : 'none';
      btn.textContent = ex.style.display === 'none' ? 'More >>' : '<< Less';
    });

    const bind = (id: string, ch: 'r'|'g'|'b'|'a') => {
      const s = this.body.querySelector(`#cs-${id}`) as HTMLInputElement;
      const n = this.body.querySelector(`#cn-${id}`) as HTMLInputElement;
      s.addEventListener('input', () => { const v = parseInt(s.value); n.value = String(v); cm.active = { ...cm.active, [ch]: v }; this.refreshUI(); });
      n.addEventListener('change', () => { let v = parseInt(n.value); v = Math.max(0, Math.min(255, v || 0)); n.value = String(v); s.value = String(v); cm.active = { ...cm.active, [ch]: v }; this.refreshUI(); });
    };
    bind('r', 'r'); bind('g', 'g'); bind('b', 'b'); bind('a', 'a');

    const hex = this.body.querySelector('#chex') as HTMLInputElement;
    hex.addEventListener('change', () => {
      const v = hex.value;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { const c = cm.fromHex(v); c.a = cm.active.a; cm.active = c; this.refreshUI(); }
    });

    // Palette
    const pg = this.body.querySelector('#pal-grid')!;
    for (const sw of ColorMgr.palette()) {
      const d = document.createElement('div'); d.className = 'pal-swatch';
      d.style.backgroundColor = cm.rgbaStr(sw);
      d.addEventListener('click', () => { cm.active = sw; this.refreshUI(); });
      pg.appendChild(d);
    }

    cm.onChange(() => this.refreshUI());
    this.refreshUI();
  }

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
    const w = this.body.querySelector('#cwheel')!;
    const pt = this.body.querySelector('#cwheel-ptr') as HTMLElement;
    if (w && pt) {
      const R = w.clientWidth / 2;
      const ang = (hsva.h * Math.PI) / 180;
      const dist = (hsva.s / 100) * R;
      pt.style.left = `${R + Math.cos(ang) * dist}px`;
      pt.style.top = `${R + Math.sin(ang) * dist}px`;
    }
  }
}
