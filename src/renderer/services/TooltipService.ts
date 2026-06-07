// McPaint — Tooltip Service
// Desktop-style tooltips that appear on hover with delay

export class TooltipService {
  private el: HTMLElement;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private visible = false;
  private onStatusUpdate: ((text: string) => void) | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'mc-tooltip';
    this.el.style.cssText = `
      position:fixed;z-index:10000;pointer-events:none;
      background:#ffffe0;color:#1a1a1a;border:1px solid #b0a060;
      border-radius:3px;padding:4px 8px;font-size:11px;
      font-family:var(--font-mac);max-width:280px;
      box-shadow:1px 2px 6px rgba(0,0,0,.15);
      display:none;white-space:pre-line;line-height:1.4;
    `;
    document.body.appendChild(this.el);
  }

  setStatusCallback(fn: (text: string) => void): void { this.onStatusUpdate = fn; }

  /** Show tooltip near the element */
  show(target: HTMLElement, text: string, delay = 350): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.el.textContent = text;
      this.el.style.display = 'block';
      const r = target.getBoundingClientRect();
      let left = r.left + r.width / 2;
      let top = r.bottom + 6;
      // Keep inside viewport
      const tw = this.el.offsetWidth || 120;
      const th = this.el.offsetHeight || 24;
      if (left + tw / 2 > window.innerWidth) left = window.innerWidth - tw - 8;
      if (left - tw / 2 < 8) left = tw / 2 + 8;
      if (top + th > window.innerHeight) top = r.top - th - 6;
      this.el.style.left = `${left}px`;
      this.el.style.top = `${top}px`;
      this.el.style.transform = 'translateX(-50%)';
      this.visible = true;
    }, delay);
  }

  /** Hide the tooltip */
  hide(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.el.style.display = 'none';
    this.visible = false;
  }

  /** Quick status bar update without showing tooltip */
  status(text: string): void { this.onStatusUpdate?.(text); }

  /** Bind tooltip + status to any element */
  bind(el: HTMLElement, tooltipText: string, statusText: string): void {
    el.addEventListener('pointerenter', () => {
      this.show(el, tooltipText);
      this.status(statusText);
    });
    el.addEventListener('pointerleave', () => {
      this.hide();
      this.status('Ready.');
    });
    el.addEventListener('pointerdown', () => this.hide());
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
  }
}
