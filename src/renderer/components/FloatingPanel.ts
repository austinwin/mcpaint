// McPaint — FloatingPanel base class
export class FloatingPanel {
  el: HTMLElement;
  protected body: HTMLElement;
  private dragging = false;
  private dx = 0; private dy = 0;
  private closeBtn!: HTMLButtonElement;
  private _visible = true;

  constructor(id: string, title: string, x: number, y: number, w: number) {
    this.el = document.createElement('div');
    this.el.className = 'float-panel';
    this.el.id = id;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    this.el.style.width = `${w}px`;

    const tb = document.createElement('div');
    tb.className = 'fp-titlebar';
    const sp = document.createElement('span');
    sp.textContent = title;
    tb.appendChild(sp);

    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'fp-close';
    this.closeBtn.textContent = '✕';
    this.closeBtn.addEventListener('click', () => {
      this.visible = false;
      // Notify if callback is set
      if (this._onCloseCb) this._onCloseCb();
    });
    tb.appendChild(this.closeBtn);

    // Drag
    tb.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.dx = e.clientX - this.el.offsetLeft;
      this.dy = e.clientY - this.el.offsetTop;
      tb.setPointerCapture(e.pointerId);
    });
    const onMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.el.style.left = `${e.clientX - this.dx}px`;
      this.el.style.top = `${e.clientY - this.dy}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
    };
    const onUp = () => { this.dragging = false; };
    tb.addEventListener('pointermove', onMove);
    tb.addEventListener('pointerup', onUp);
    tb.addEventListener('pointerleave', onUp);

    this.el.appendChild(tb);

    this.body = document.createElement('div');
    this.body.className = 'fp-body';
    this.el.appendChild(this.body);
  }

  private _onCloseCb: (() => void) | null = null;
  onClose(cb: () => void): void { this._onCloseCb = cb; }

  get visible(): boolean { return this._visible && this.el.style.display !== 'none'; }
  set visible(v: boolean) {
    this._visible = v;
    this.el.style.display = v ? '' : 'none';
  }

  toggle(): void { this.visible = !this.visible; }

  appendTo(parent: HTMLElement): void { parent.appendChild(this.el); }
}
