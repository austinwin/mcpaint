// McPaint - Color Manager (RGBA/HSVA, palette, color wheel)
export interface RGBA { r: number; g: number; b: number; a: number; }
export interface HSVA { h: number; s: number; v: number; a: number; }

export class ColorMgr {
  pri: RGBA = { r: 0, g: 0, b: 0, a: 255 };
  sec: RGBA = { r: 255, g: 255, b: 255, a: 255 };
  priActive = true;
  private _ls: Array<() => void> = [];

  get active(): RGBA { return this.priActive ? this.pri : this.sec; }
  set active(c: RGBA) { if (this.priActive) this.pri = { ...c }; else this.sec = { ...c }; this._notify(); }

  swap(): void { [this.pri, this.sec] = [this.sec, this.pri]; this._notify(); }
  toHex(c?: RGBA): string { const x = c || this.active; return '#' + [x.r, x.g, x.b].map(v => v.toString(16).padStart(2, '0')).join(''); }
  fromHex(h: string): RGBA { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16), a: 255 }; }
  rgbaStr(c?: RGBA): string { const x = c || this.active; return `rgba(${x.r},${x.g},${x.b},${x.a / 255})`; }

  static rgba2hsva(c: RGBA): HSVA {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d !== 0) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h = Math.round(h * 60); if (h < 0) h += 360; }
    return { h, s: mx === 0 ? 0 : Math.round((d / mx) * 100), v: Math.round(mx * 100), a: c.a };
  }

  static hsva2rgba(c: HSVA): RGBA {
    const h = c.h / 360, s = c.s / 100, v = c.v / 100;
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    let r: number, g: number, b: number;
    switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; case 5: r = v; g = p; b = q; break; default: r = 0; g = 0; b = 0; }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255), a: c.a };
  }

  onChange(fn: () => void): void { this._ls.push(fn); }
  private _notify(): void { for (const fn of this._ls) fn(); }

  static palette(): RGBA[] {
    return [
      { r: 0, g: 0, b: 0, a: 255 }, { r: 64, g: 64, b: 64, a: 255 }, { r: 128, g: 128, b: 128, a: 255 },
      { r: 192, g: 192, b: 192, a: 255 }, { r: 255, g: 255, b: 255, a: 255 },
      { r: 255, g: 0, b: 0, a: 255 }, { r: 255, g: 128, b: 0, a: 255 }, { r: 255, g: 255, b: 0, a: 255 },
      { r: 128, g: 255, b: 0, a: 255 }, { r: 0, g: 255, b: 0, a: 255 }, { r: 0, g: 255, b: 128, a: 255 },
      { r: 0, g: 255, b: 255, a: 255 }, { r: 0, g: 128, b: 255, a: 255 }, { r: 0, g: 0, b: 255, a: 255 },
      { r: 128, g: 0, b: 255, a: 255 }, { r: 255, g: 0, b: 255, a: 255 }, { r: 255, g: 0, b: 128, a: 255 },
      { r: 128, g: 64, b: 0, a: 255 }, { r: 255, g: 128, b: 64, a: 255 }, { r: 255, g: 200, b: 100, a: 255 },
      { r: 128, g: 255, b: 128, a: 255 }, { r: 0, g: 128, b: 64, a: 255 }, { r: 0, g: 64, b: 128, a: 255 },
      { r: 64, g: 0, b: 128, a: 255 }, { r: 128, g: 0, b: 64, a: 255 },
      { r: 64, g: 0, b: 0, a: 255 }, { r: 0, g: 64, b: 0, a: 255 }, { r: 0, g: 0, b: 64, a: 255 },
      { r: 255, g: 200, b: 200, a: 255 }, { r: 200, g: 255, b: 200, a: 255 }, { r: 200, g: 200, b: 255, a: 255 },
      { r: 255, g: 255, b: 200, a: 255 },
    ];
  }
}
