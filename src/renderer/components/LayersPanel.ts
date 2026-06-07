// McPaint — Layers Panel
import { FloatingPanel } from './FloatingPanel';
import { DrawEngine } from '../services/DrawingEngine';
import { Icons } from './editorIcons';

export class LayersPanel extends FloatingPanel {
  eng: DrawEngine;

  constructor(eng: DrawEngine) {
    super('layers-panel', 'Layers', 999, 999, 200); // x, y set later
    this.eng = eng;
    this.build();
  }

  private build(): void {
    this.body.innerHTML = `
      <div id="layer-list"></div>
      <div class="layer-ctrl"><lbl>Mode:</lbl><select id="blend-sel"><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="additive">Additive</option><option value="colorBurn">Color Burn</option><option value="colorDodge">Color Dodge</option><option value="reflect">Reflect</option><option value="glow">Glow</option><option value="overlay">Overlay</option><option value="difference">Difference</option><option value="negation">Negation</option><option value="lighten">Lighten</option><option value="darken">Darken</option><option value="screen">Screen</option><option value="xor">Xor</option></select></div>
      <div class="layer-ctrl"><lbl>Opacity:</lbl><input type="range" id="opac-s" min="0" max="255" value="255"><span class="val" id="opac-v">255</span></div>
      <div class="layer-btns">
        <button id="btn-add-l" title="Add New Layer">${Icons.add}</button>
        <button id="btn-del-l" title="Delete Layer">${Icons.delete}</button>
        <button id="btn-dup-l" title="Duplicate Layer">${Icons.duplicate}</button>
        <button id="btn-merge-l" title="Merge Layer Down">${Icons.mergeDown}</button>
        <button id="btn-up-l" title="Move Layer Up">${Icons.moveUp}</button>
        <button id="btn-dn-l" title="Move Layer Down">${Icons.moveDown}</button>
      </div>`;
    this.wire();
  }

  private wire(): void {
    const eng = this.eng;
    const rf = () => this.refresh();
    this.body.querySelector('#blend-sel')!.addEventListener('change', e => {
      const d = eng.doc; if (d?.active) { d.active.blendMode = (e.target as HTMLSelectElement).value as any; eng.onChange(() => {}); }
    });
    const os = this.body.querySelector('#opac-s') as HTMLInputElement;
    const ov = this.body.querySelector('#opac-v')!;
    os.addEventListener('input', () => { const v = parseInt(os.value); ov.textContent = String(v); const d = eng.doc; if (d?.active) { d.active.opacity = v; } });

    const bind = (id: string, fn: () => void) => this.body.querySelector(id)!.addEventListener('click', () => { fn(); rf(); });
    bind('#btn-add-l', () => eng.addLayer());
    bind('#btn-del-l', () => eng.delLayer());
    bind('#btn-dup-l', () => eng.dupLayer());
    bind('#btn-merge-l', () => eng.mergeD());
    bind('#btn-up-l', () => eng.moveUp());
    bind('#btn-dn-l', () => eng.moveDown());

    eng.onChange(() => rf());
    rf();
  }

  refresh(): void {
    const d = this.eng.doc;
    const list = this.body.querySelector('#layer-list')!;
    list.innerHTML = '';
    if (!d) return;
    for (let i = d.layers.length - 1; i >= 0; i--) {
      const l = d.layers[i];
      const div = document.createElement('div'); div.className = 'layer-item';
      div.classList.toggle('active', i === d.activeIdx);
      const vis = document.createElement('button'); vis.className = 'lvis';
      vis.textContent = l.visible ? '👁' : '—';
      vis.addEventListener('click', e => { e.stopPropagation(); l.visible = !l.visible; this.refresh(); });
      div.appendChild(vis);
      const th = document.createElement('img'); th.className = 'lthumb'; th.src = l.thumb(); div.appendChild(th);
      const nm = document.createElement('span'); nm.className = 'lname'; nm.textContent = l.name; div.appendChild(nm);
      div.addEventListener('click', () => { d.activeIdx = i; this.refresh(); });
      list.appendChild(div);
    }
    const bm = this.body.querySelector('#blend-sel') as HTMLSelectElement;
    const os = this.body.querySelector('#opac-s') as HTMLInputElement;
    const ov = this.body.querySelector('#opac-v')!;
    if (d.active) {
      bm.value = d.active.blendMode;
      os.value = String(d.active.opacity);
      ov.textContent = String(d.active.opacity);
    }
  }
}
