import { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let win: BrowserWindow | null = null;
const recentFile = path.join(app.getPath('userData'), 'recent.json');
let recentFiles: string[] = [];
function loadRecent(): void {
  try { if (fs.existsSync(recentFile)) recentFiles = JSON.parse(fs.readFileSync(recentFile, 'utf-8')); }
  catch { recentFiles = []; }
}
function saveRecent(): void {
  try { fs.writeFileSync(recentFile, JSON.stringify(recentFiles.slice(0, 10), null, 2)); }
  catch { /* ignore */ }
}
function addRecent(fp: string): void {
  recentFiles = [fp, ...recentFiles.filter(f => f !== fp)].slice(0, 10);
  saveRecent(); rebuildMenu();
}

function buildMenu(menuTemplate: MenuItemConstructorOptions[]): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}
function rebuildMenu(): void { buildMenu(menuTemplate()); }
function menuTemplate(): MenuItemConstructorOptions[] {
  const send = (ch: string, ...args: any[]) => win?.webContents.send(ch, ...args);
  const recentItems: MenuItemConstructorOptions[] = recentFiles.length > 0
    ? recentFiles.map(fp => ({
        label: path.basename(fp),
        click: () => win?.webContents.send('m:openFile', fp)
      } as MenuItemConstructorOptions)).concat([
        { type: 'separator' as const },
        { label: 'Clear Recent', click: () => { recentFiles = []; saveRecent(); rebuildMenu(); } }
      ])
    : [{ label: '(No Recent Files)', enabled: false }];

  return [
    {
      label: 'File', submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => send('m:new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => openFile() },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('m:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => saveAs() },
        { type: 'separator' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', click: () => send('m:close') },
        { type: 'separator' },
        { label: 'Recent Files', submenu: recentItems },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' },
      ]
    },
    {
      label: 'Edit', submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('m:undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', click: () => send('m:redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => send('m:cut') },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => send('m:copy') },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => send('m:paste') },
        { type: 'separator' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => send('m:selectAll') },
        { label: 'Deselect', accelerator: 'CmdOrCtrl+D', click: () => send('m:deselect') },
        { type: 'separator' },
        { label: 'Fill Selection', accelerator: 'Backspace', click: () => send('m:fillSel') },
        { label: 'Clear Selection', accelerator: 'Delete', click: () => send('m:clearSel') },
      ]
    },
    {
      label: 'View', submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => send('m:zoomIn') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => send('m:zoomOut') },
        { label: 'Zoom to Window', accelerator: 'CmdOrCtrl+B', click: () => send('m:zoomFit') },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => send('m:actualSize') },
        { type: 'separator' },
        { label: 'Show Rulers', type: 'checkbox', checked: false, click: (mi) => send('m:toggleRulers', mi.checked) },
        { type: 'separator' },
        { label: 'Dark Theme', type: 'checkbox', checked: false, click: (mi) => send('m:theme', mi.checked ? 'dark' : 'light') },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => win?.setFullScreen(!win?.isFullScreen()) },
      ]
    },
    {
      label: 'Image', submenu: [
        { label: 'Resize...', accelerator: 'CmdOrCtrl+R', click: () => send('m:resize') },
        { label: 'Canvas Size...', accelerator: 'CmdOrCtrl+Shift+R', click: () => send('m:canvasSize') },
        { type: 'separator' },
        { label: 'Flip Horizontal', click: () => send('m:flipH') },
        { label: 'Flip Vertical', click: () => send('m:flipV') },
        { label: 'Rotate 90° CW', click: () => send('m:rotCW') },
        { label: 'Rotate 90° CCW', click: () => send('m:rotCCW') },
        { type: 'separator' },
        { label: 'Crop to Selection', accelerator: 'CmdOrCtrl+Shift+X', click: () => send('m:crop') },
        { type: 'separator' },
        { label: 'Flatten', accelerator: 'CmdOrCtrl+Shift+F', click: () => send('m:flatten') },
      ]
    },
    {
      label: 'Layers', submenu: [
        { label: 'Add New Layer', accelerator: 'CmdOrCtrl+Shift+N', click: () => send('m:addLayer') },
        { label: 'Delete Layer', click: () => send('m:delLayer') },
        { label: 'Duplicate Layer', click: () => send('m:dupLayer') },
        { label: 'Merge Layer Down', accelerator: 'CmdOrCtrl+M', click: () => send('m:mergeDown') },
        { type: 'separator' },
        { label: 'Move Layer Up', click: () => send('m:moveUp') },
        { label: 'Move Layer Down', click: () => send('m:moveDown') },
      ]
    },
    {
      label: 'Adjustments', submenu: [
        { label: 'Invert Colors', accelerator: 'CmdOrCtrl+Shift+I', click: () => send('m:invert') },
        { label: 'Black and White', click: () => send('m:bw') },
        { label: 'Sepia', click: () => send('m:sepia') },
        { type: 'separator' },
        { label: 'Brightness / Contrast...', click: () => send('m:brightness') },
        { label: 'Hue / Saturation...', click: () => send('m:hueSat') },
        { label: 'Levels...', click: () => send('m:levels') },
        { label: 'Curves...', click: () => send('m:curves') },
      ]
    },
    {
      label: 'Effects', submenu: [
        { label: 'Gaussian Blur', click: () => send('m:blur') },
        { label: 'Sharpen', click: () => send('m:sharpen') },
        { label: 'Edge Detect', click: () => send('m:edge') },
        { label: 'Emboss', click: () => send('m:emboss') },
        { label: 'Pixelate', click: () => send('m:pixelate') },
      ]
    },
    {
      label: 'Window', submenu: [
        { label: 'Tools', type: 'checkbox', checked: true, click: (mi) => send('m:togglePanel', 'tools', mi.checked) },
        { label: 'Colors', type: 'checkbox', checked: true, click: (mi) => send('m:togglePanel', 'colors', mi.checked) },
        { label: 'Layers', type: 'checkbox', checked: true, click: (mi) => send('m:togglePanel', 'layers', mi.checked) },
        { label: 'History', type: 'checkbox', checked: true, click: (mi) => send('m:togglePanel', 'history', mi.checked) },
        { type: 'separator' },
        { label: 'Reset Window Layout', click: () => send('m:resetLayout') },
        { type: 'separator' },
        { label: 'Always on Top', type: 'checkbox', click: (mi) => win?.setAlwaysOnTop(mi.checked) },
      ]
    },
    {
      label: 'Help', submenu: [
        { label: 'About McPaint', click: () => dialog.showMessageBox(win!, { type: 'info', title: 'McPaint', message: 'McPaint v1.0.0', detail: 'Paint.NET-inspired image editor.\nBuilt with Electron + TypeScript.' }) },
        { label: 'Keyboard Shortcuts', click: () => dialog.showMessageBox(win!, { type: 'info', title: 'Shortcuts', message: 'S=Select M=Move L=Lasso W=Wand B=Brush E=Eraser P=Pencil F=Bucket K=Picker C=Clone R=Recolor T=Text O=Line G=Gradient H=Pan Z=Zoom X=Swap Colors\n⌘Z=Undo ⌘Y=Redo ⌘A=All ⌘D=Deselect ⌘+/− =Zoom' }) },
      ]
    }
  ];
}

async function openFile(): Promise<void> {
  const r = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff', 'webp', 'tga', 'dds'] }, { name: 'All', extensions: ['*'] }] });
  if (!r.canceled && r.filePaths[0]) win?.webContents.send('m:openFile', r.filePaths[0]);
}

async function saveAs(): Promise<void> {
  const r = await dialog.showSaveDialog(win!, { filters: [{ name: 'PNG', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }, { name: 'WebP', extensions: ['webp'] }, { name: 'McPaint Project', extensions: ['mcp'] }] });
  if (!r.canceled && r.filePath) win?.webContents.send('m:saveAs', r.filePath);
}

const isMac = process.platform === 'darwin';

function create(): void {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 650,
    title: 'McPaint',
    ...(isMac ? {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 16 },
      vibrancy: 'sidebar',
      visualEffectState: 'active',
    } : {
      titleBarStyle: 'default',
      autoHideMenuBar: false,
    }),
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  // On Windows, set the menu bar to be visible by default
  if (!isMac) {
    win.setMenuBarVisibility(true);
  }
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });

  // Unsaved changes warning
  win.on('close', async (e) => {
    if (!win) return;
    try {
      const hasUnsaved = await win.webContents.executeJavaScript('!!(window.__mcUnsaved && window.__mcUnsaved())');
      if (hasUnsaved) {
        e.preventDefault();
        const { response } = await dialog.showMessageBox(win, {
          type: 'question',
          buttons: ['Save', "Don't Save", 'Cancel'],
          defaultId: 0,
          message: 'Save changes before closing?',
          detail: 'You have unsaved changes. Do you want to save them?'
        });
        if (response === 0) { win.webContents.send('m:save'); }
        else if (response === 1) { win.destroy(); }
      }
    } catch { /* ignore */ }
  });
}

ipcMain.handle('dlg:open', async () => { const r = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'] }] }); return r.canceled ? null : r.filePaths[0]; });
ipcMain.handle('dlg:save', async (_, n: string) => { const r = await dialog.showSaveDialog(win!, { defaultPath: n, filters: [{ name: 'PNG', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }, { name: 'WebP', extensions: ['webp'] }] }); return r.canceled ? null : r.filePath; });
ipcMain.handle('theme:dark', () => nativeTheme.shouldUseDarkColors);

// Real file I/O
ipcMain.handle('file:read', async (_, filePath: string) => {
  try { return { data: fs.readFileSync(filePath).buffer, error: null }; }
  catch (e: any) { return { data: null, error: e.message }; }
});

ipcMain.handle('file:write', async (_, filePath: string, data: ArrayBuffer) => {
  try { fs.writeFileSync(filePath, Buffer.from(data)); return { error: null }; }
  catch (e: any) { return { error: e.message }; }
});

// Context menu
ipcMain.handle('ctx:show', async (_, items: Array<{ label?: string; type?: string; clickId?: string; enabled?: boolean }>) => {
  if (!win) return;
  const template: MenuItemConstructorOptions[] = items.map(item => {
    if (item.type === 'separator') return { type: 'separator' };
    return {
      label: item.label || '',
      enabled: item.enabled !== false,
      click: () => { if (item.clickId) win?.webContents.send('m:ctxAction', item.clickId); }
    };
  });
  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: win });
});

// Track file opens/saves for recent files
ipcMain.on('m:openFile', (_e, fp: string) => addRecent(fp));

app.whenReady().then(() => {
  loadRecent();
  rebuildMenu();
  create();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
