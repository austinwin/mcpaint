import { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let win: BrowserWindow | null = null;

function menu(): void {
  const send = (ch: string, ...args: any[]) => win?.webContents.send(ch, ...args);
  const t: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => send('m:new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => openFile() },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('m:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => saveAs() },
        { type: 'separator' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', click: () => send('m:close') },
        { type: 'separator' },
        { label: 'Exit', role: 'quit' },
      ]
    },
    {
      label: 'Edit',
      submenu: [
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
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => send('m:zoomIn') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => send('m:zoomOut') },
        { label: 'Zoom to Window', accelerator: 'CmdOrCtrl+B', click: () => send('m:zoomFit') },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => send('m:actualSize') },
        { type: 'separator' },
        { label: 'Dark Theme', type: 'checkbox', checked: true, click: (mi) => send('m:theme', mi.checked ? 'dark' : 'light') },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', click: () => win?.setFullScreen(!win?.isFullScreen()) },
      ]
    },
    {
      label: 'Image',
      submenu: [
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
      label: 'Layers',
      submenu: [
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
      label: 'Adjustments',
      submenu: [
        { label: 'Black and White', click: () => send('m:bw') },
        { label: 'Sepia', click: () => send('m:sepia') },
        { label: 'Invert Colors', accelerator: 'CmdOrCtrl+Shift+I', click: () => send('m:invert') },
        { type: 'separator' },
        { label: 'Brightness / Contrast... (Coming Soon)', enabled: false },
        { label: 'Hue / Saturation... (Coming Soon)', enabled: false },
        { label: 'Levels... (Coming Soon)', enabled: false },
        { label: 'Curves... (Coming Soon)', enabled: false },
        { label: 'Posterize... (Coming Soon)', enabled: false },
      ]
    },
    {
      label: 'Effects',
      submenu: [
        { label: 'Gaussian Blur', click: () => send('m:blur') },
        { label: 'Sharpen', click: () => send('m:sharpen') },
        { label: 'Edge Detect', click: () => send('m:edge') },
        { label: 'Emboss', click: () => send('m:emboss') },
        { label: 'Pixelate', click: () => send('m:pixelate') },
        { type: 'separator' },
        { label: 'Motion Blur (Coming Soon)', enabled: false },
        { label: 'Noise (Coming Soon)', enabled: false },
        { label: 'Glow (Coming Soon)', enabled: false },
        { label: 'Vignette (Coming Soon)', enabled: false },
      ]
    },
    {
      label: 'Window',
      submenu: [
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
      label: 'Help',
      submenu: [
        { label: 'About McPaint', click: () => dialog.showMessageBox(win!, { type: 'info', title: 'McPaint', message: 'McPaint v1.0.0', detail: 'Paint.NET-inspired image editor.\nBuilt with Electron + TypeScript.' }) },
        { label: 'Keyboard Shortcuts', click: () => dialog.showMessageBox(win!, { type: 'info', title: 'Shortcuts', message: 'S=Select M=Move L=Lasso W=Wand B=Brush E=Eraser P=Pencil F=Bucket K=Picker C=Clone R=Recolor T=Text O=Line G=Gradient H=Pan Z=Zoom X=Swap Colors\n⌘Z=Undo ⌘Y=Redo ⌘A=All ⌘D=Deselect ⌘+/− =Zoom' }) },
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

async function openFile(): Promise<void> {
  const r = await dialog.showOpenDialog(win!, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff', 'webp', 'tga', 'dds'] }, { name: 'All', extensions: ['*'] }] });
  if (!r.canceled && r.filePaths[0]) win?.webContents.send('m:openFile', r.filePaths[0]);
}

async function saveAs(): Promise<void> {
  const r = await dialog.showSaveDialog(win!, { filters: [{ name: 'PNG', extensions: ['png'] }, { name: 'JPEG', extensions: ['jpg'] }, { name: 'WebP', extensions: ['webp'] }, { name: 'McPaint Project', extensions: ['mcp'] }] });
  if (!r.canceled && r.filePath) win?.webContents.send('m:saveAs', r.filePath);
}

function create(): void {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 1000, minHeight: 650,
    title: 'McPaint',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#2d2d2d',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });
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

app.whenReady().then(() => { menu(); create(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
