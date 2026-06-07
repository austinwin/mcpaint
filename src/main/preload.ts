import { contextBridge, ipcRenderer } from 'electron';

const actions = [
  'new','save','close','undo','redo','cut','copy','paste','pasteNewLayer','selectAll','deselect',
  'invertSel','fillSel','clearSel','zoomIn','zoomOut','zoomFit','actualSize',
  'resize','canvasSize','flipH','flipV','rotCW','rotCCW','crop','flatten',
  'addLayer','delLayer','dupLayer','mergeDown','moveUp','moveDown',
  'bw','sepia','invert','blur','sharpen','edge','emboss','pixelate',
  'resetLayout',
];

contextBridge.exposeInMainWorld('mcp', {
  open: () => ipcRenderer.invoke('dlg:open'),
  save: (n: string) => ipcRenderer.invoke('dlg:save', n),
  onMenu: (cb: (a: string, ...args: any[]) => void) => {
    const h = (_: any, a: string, ...args: any[]) => cb(a, ...args);
    ipcRenderer.on('m:openFile', (_e, p) => h(null, 'openFile', p));
    ipcRenderer.on('m:saveAs', (_e, p) => h(null, 'saveAs', p));
    ipcRenderer.on('m:theme', (_e, t) => h(null, 'theme', t));
    ipcRenderer.on('m:togglePanel', (_e, panel, checked) => h(null, 'togglePanel', panel, checked));
    for (const a of actions) ipcRenderer.on(`m:${a}`, () => h(null, a));
  },
  darkMode: () => ipcRenderer.invoke('theme:dark'),
});
