// McPaint — FloatingPanel base class
export class FloatingPanel {
  el: HTMLElement;
  protected body: HTMLElement;
  private dragging = false;
  private dx = 0; private dy = 0;

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

    const close = document.createElement('button');
    close.className = 'fp-close';
    close.textContent = '✕';
    close.addEventListener('click', () => { this.el.style.display = 'none'; });
    tb.appendChild(close);

    // Drag
    tb.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.dx = e.clientX - this.el.offsetLeft;
      this.dy = e.clientY - this.el.offsetTop;
      tb.setPointerCapture(e.pointerId);
    });
    tb.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.el.style.left = `${e.clientX - this.dx}px`;
      this.el.style.top = `${e.clientY - this.dy}px`;
    });
    tb.addEventListener('pointerup', () => { this.dragging = false; });

    this.el.appendChild(tb);

    this.body = document.createElement('div');
    this.body.className = 'fp-body';
    this.el.appendChild(this.body);
  }

  get visible(): boolean { return this.el.style.display !== 'none'; }
  set visible(v: boolean) { this.el.style.display = v ? '' : 'none'; }

  toggle(): void { this.visible = !this.visible; }

  appendTo(parent: HTMLElement): void { parent.appendChild(this.el); }
}
