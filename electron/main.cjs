const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { startServer } = require('../server/server');

let mainWindow = null;
let serverInstance = null;
const SERVER_PORT = process.env.PORT || 4000;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'MongoDB Studio & Scratch NoSQL Engine',
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // In dev mode, load Vite dev server
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      // If vite isn't up yet, retry after 1.5 seconds
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:5173');
      }, 1500);
    });
  } else {
    // In production, load from the built dist folder
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for native OS dialogs
ipcMain.handle('dialog:openFile', async (event, options) => {
  if (!mainWindow) return null;
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('dialog:saveFile', async (event, options) => {
  if (!mainWindow) return null;
  return await dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('app:version', () => {
  return app.getVersion();
});

app.whenReady().then(async () => {
  try {
    serverInstance = await startServer(SERVER_PORT);
    console.log(`Backend Express server started on port ${SERVER_PORT}`);
  } catch (err) {
    console.error('Error starting backend server:', err.message);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) {
      serverInstance.close();
    }
    app.quit();
  }
});
