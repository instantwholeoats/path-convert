'use strict';

const { execFile } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { promisify } = require('node:util');
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const { decodeMountPath, volumeMountPoint } = require('./js/path-converter');

const execFileAsync = promisify(execFile);
const appPage = pathToFileURL(path.join(__dirname, 'index.html')).toString();
let mainWindow = null;

function assertTrustedSender(event) {
  if (event.senderFrame.url !== appPage) {
    throw new Error('Rejected IPC request from an untrusted page');
  }
}

function assertVolumePath(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Path must be a string');
  }
  const resolved = path.resolve(value);
  if (!volumeMountPoint(resolved)) {
    throw new Error('Only paths below /Volumes can be opened');
  }
  return resolved;
}

async function findMountSource(value) {
  let resolved;
  try {
    resolved = assertVolumePath(value);
  } catch {
    return null;
  }
  const mountPoint = volumeMountPoint(resolved);

  const { stdout } = await execFileAsync('/sbin/mount', [], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  for (const line of stdout.split('\n')) {
    const onIndex = line.indexOf(' on ');
    const optionsIndex = line.lastIndexOf(' (');
    if (onIndex < 1 || optionsIndex <= onIndex) {
      continue;
    }
    const source = line.slice(0, onIndex);
    const mountedAt = decodeMountPath(line.slice(onIndex + 4, optionsIndex));
    if (path.resolve(mountedAt) === mountPoint) {
      return source;
    }
  }
  return null;
}

function registerIpcHandlers() {
  ipcMain.handle('get-user-name', (event) => {
    assertTrustedSender(event);
    return os.userInfo().username;
  });
  ipcMain.handle('get-mount-source', async (event, value) => {
    assertTrustedSender(event);
    return findMountSource(value);
  });
  ipcMain.handle('open-volume-path', async (event, value) => {
    assertTrustedSender(event);
    const error = await shell.openPath(assertVolumePath(value));
    if (error) {
      throw new Error(error);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 320,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const template = [
  {
    label: 'Application',
    submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  },
];

app.whenReady().then(() => {
  registerIpcHandlers();
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
