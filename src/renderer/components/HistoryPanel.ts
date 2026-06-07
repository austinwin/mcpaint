// McPaint — History Panel
import { FloatingPanel } from './FloatingPanel';
import { DrawEngine } from '../services/DrawingEngine';
import { Icons } from './editorIcons';

export class HistoryPanel extends FloatingPanel {
  eng: DrawEngine;

  constructor(eng: DrawEngine) {
    super('history-panel', 'History', 999, 999, 180); // x, y set later
    this.eng = eng;
    this.build();
  }

  private build(): void {
    this.body.innerHTML = `
      <div id="history-list"></div>
      <div class="hist-btns">
        <button id="btn-hu" title="Undo">${Icons.undo}</button>
        <button id="btn-hr" title="Redo">${Icons.redo}</button>
        <button id="btn-hc" title="Clear History">${Icons.delete}</button>
      </div>`;
    this.wire();
  }

  private wire(): void {
    const eng = this.eng;
    const rf = () => this.refresh();
    this.body.querySelector('#btn-hu')!.addEventListener('click', async () => { await eng.undo(); rf(); });
    this.body.querySelector('#btn-hr')!.addEventListener('click', async () => { await eng.redo(); rf(); });
    this.body.querySelector('#btn-hc')!.addEventListener('click', () => { eng.hist.clear(); rf(); });
    eng.onChange(() => rf());
    rf();
  }

  refresh(): void {
    const list = this.body.querySelector('#history-list')!;
    list.innerHTML = '';
    const h = this.eng.hist;
    for (let i = 0; i < h.all.length; i++) {
      const e = h.all[i];
      const d = document.createElement('div'); d.className = 'hist-item';
      if (i <= h.idx) d.classList.add('done'); else d.classList.add('undone');
      if (i === h.idx) d.classList.add('current');
      d.textContent = e.name;
      d.addEventListener('click', () => { h.jump(i); this.refresh(); });
      list.appendChild(d);
    }
  }
}
