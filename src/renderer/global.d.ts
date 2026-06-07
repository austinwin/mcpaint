interface McPaintAPI {
  open: () => Promise<string | null>;
  save: (name: string) => Promise<string | null>;
  readFile: (path: string) => Promise<{ data: ArrayBuffer | null; error: string | null }>;
  writeFile: (path: string, data: ArrayBuffer) => Promise<{ error: string | null }>;
  onMenu: (cb: (action: string, ...args: any[]) => void) => void;
  darkMode: () => Promise<boolean>;
}
declare var mcp: McPaintAPI;
