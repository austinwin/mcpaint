interface McPaintAPI {
  open: () => Promise<string | null>;
  save: (name: string) => Promise<string | null>;
  onMenu: (cb: (action: string, ...args: any[]) => void) => void;
  darkMode: () => Promise<boolean>;
}
declare var mcp: McPaintAPI;
