const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
    openFolder: (path) => ipcRenderer.invoke('open-folder', path)
});
