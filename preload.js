'use strict';

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('pathConvertApi', {
  getUserName: () => ipcRenderer.invoke('get-user-name'),
  getMountSource: (value) => ipcRenderer.invoke('get-mount-source', value),
  openPath: (value) => ipcRenderer.invoke('open-volume-path', value),
  getPathForFile: (file) => webUtils.getPathForFile(file),
});
