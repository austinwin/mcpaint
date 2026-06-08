// McPaint — History Panel
import { FloatingPanel } from './FloatingPanel';
import { DrawEngine } from '../services/DrawingEngine';
import { Icons } from './editorIcons';

export class HistoryPanel extends FloatingPanel {
  eng: DrawEngine;

  constructor(eng: DrawEngine) {
    super('history-panel', 'History', 999, 999, 180);
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

    const hcBtn = this.body.querySelector('#btn-hc')!;
    let clearConfirmTimer: ReturnType<typeof setTimeout> | null = null;
    let confirming = false;
    hcBtn.addEventListener('click', () => {
      if (!confirming) {
        confirming = true;
        hcBtn.textContent = 'Confirm clear?';
        clearConfirmTimer = setTimeout(() => {
          confirming = false;
          hcBtn.textContent = '';
          hcBtn.innerHTML = Icons.delete;
        }, 1500);
      } else {
        if (clearConfirmTimer) clearTimeout(clearConfirmTimer);
        confirming = false;
        hcBtn.textContent = '';
        hcBtn.innerHTML = Icons.delete;
        eng.hist.clear();
        rf();
      }
    });

    eng.onChange(() => rf());
    rf();
  }

  refresh(): void {
    const list = this.body.querySelector('#history-list')!;
    list.innerHTML = '';
    const h = this.eng.hist;
    for (let i = 0; i < h.all.length; i++) {
      const e = h.all[i];
      const d = document.createElement('div');
      d.className = 'hist-item';
      if (i <= h.idx) d.classList.add('done');
      else d.classList.add('undone');
      if (i === h.idx) d.classList.add('current');

      // Add subtle icon
      const icon = document.createElement('span');
      icon.className = 'hist-icon';
      const iconMap: Record<string, string> = {
        'Brush': '🖌', 'Pencil': '✎', 'Eraser': '◻', 'Fill': '▣',
        'Clone': '◈', 'Text': 'T', 'Gradient': '◧', 'Move': '✥',
        'Rect': '□', 'Ellipse': '○', 'Line': '╱', 'RoundRect': '▢',
        'Crop': '✂', 'Flatten': '▦', 'Flip': '↔', 'Rotate': '↻',
        'Invert': '◐', 'B&W': '◑', 'Sepia': '◒', 'Blur': '○',
        'Sharpen': '△', 'Edge': '◇', 'Emboss': '▣', 'Pixelate': '⊞',
        'Clear': '⌫', 'Fill Selection': '▨', 'New Image': '⬜',
      };
      // Find matching icon
      for (const [key, val] of Object.entries(iconMap)) {
        if (e.name.startsWith(key)) { icon.textContent = val; break; }
      }
      d.appendChild(icon);

      const nameEl = document.createElement('span');
      nameEl.textContent = e.name;
      d.appendChild(nameEl);

      d.addEventListener('click', () => { h.jump(i); this.refresh(); });
      list.appendChild(d);
    }
  }
}
