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
        <button id="btn-hu" title="Undo (⌘Z)&#10;Reverse the most recent action" aria-label="Undo">${Icons.undo}</button>
        <button id="btn-hr" title="Redo (⌘Y)&#10;Re-apply the undone action" aria-label="Redo">${Icons.redo}</button>
        <button id="btn-hc" title="Clear History&#10;Remove all undo history" aria-label="Clear History">${Icons.delete}</button>
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

      // Add SVG icon matching action type
      const icon = document.createElement('span');
      icon.className = 'hist-icon';
      const iconMap: Record<string, string> = {
        'Brush': Icons.brush, 'Pencil': Icons.pencil, 'Eraser': Icons.eraser,
        'Fill': Icons.bucket, 'Clone': Icons.clone, 'Text': Icons.text,
        'Gradient': Icons.gradient, 'Move': Icons.move, 'Rect': Icons.rect,
        'Ellipse': Icons.ellipse, 'Line': Icons.line, 'RoundRect': Icons.roundRect,
        'Crop': Icons.crop, 'Flatten': Icons.mergeDown, 'Flip': Icons.desktop || Icons.undo,
        'Rotate': Icons.redo, 'Invert': Icons.recolor, 'B&W': Icons.pan,
        'Sepia': Icons.zoomIcon, 'Blur': Icons.ellipse, 'Sharpen': Icons.add,
        'Edge': Icons.rectSelect, 'Emboss': Icons.moveUp, 'Pixelate': Icons.grid,
        'Clear': Icons.deselect, 'Fill Selection': Icons.bucket, 'New Image': Icons.newDoc,
        'Brightness': Icons.theme, 'Merge': Icons.mergeDown, 'Add Layer': Icons.add,
        'Delete Layer': Icons.delete, 'Duplicate Layer': Icons.duplicate,
      };
      let found = false;
      for (const [key, val] of Object.entries(iconMap)) {
        if (e.name.startsWith(key)) { icon.innerHTML = val; found = true; break; }
      }
      if (!found) icon.innerHTML = Icons.brush;
      d.appendChild(icon);

      const nameEl = document.createElement('span');
      nameEl.textContent = e.name;
      d.appendChild(nameEl);

      d.addEventListener('click', () => { h.jump(i); this.refresh(); });
      list.appendChild(d);
    }
  }
}
