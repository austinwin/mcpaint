interface McPaintAPI {
  open: () => Promise<string | null>;
  save: (name: string) => Promise<string | null>;
  readFile: (path: string) => Promise<{ data: ArrayBuffer | null; error: string | null }>;
  writeFile: (path: string, data: ArrayBuffer) => Promise<{ error: string | null }>;
  showContextMenu: (items: Array<{ label?: string; type?: string; clickId?: string; enabled?: boolean }>) => Promise<void>;
  onMenu: (cb: (action: string, ...args: any[]) => void) => void;
  darkMode: () => Promise<boolean>;
  platform: string;
}
declare const mcp: McPaintAPI | undefined;
