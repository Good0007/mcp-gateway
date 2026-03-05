import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Add any needed IPC calls here
  // For now, just a placeholder
  ping: () => ipcRenderer.invoke('ping'),
});
