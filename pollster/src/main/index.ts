import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { startServer } from './server';
import { getLeaderboard, getSessionHistory } from './database';

let serverUrl = '';
// ... standard electron setup ...

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Start the server first
  const { ip, port, roomCode, setPdfPath, getCurrentSessionId } = await startServer(app.getPath('userData'));
  serverUrl = `http://${ip}:${port}`;
  console.log(`Server running at ${serverUrl}`);

  // IPC handler so the renderer can request the server URL
  ipcMain.handle('get-server-url', () => serverUrl);
  ipcMain.handle('get-room-code', () => roomCode);

  // IPC: Open file dialog to select a PDF
  ipcMain.handle('select-pdf', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select a PDF to present',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // IPC: Upload PDF path to the server
  ipcMain.handle('upload-pdf', (_event, filePath: string) => {
    setPdfPath(filePath);
    return true;
  });

  // IPC: Get leaderboard for the current session
  ipcMain.handle('get-leaderboard', () => {
    const sessionId = getCurrentSessionId();
    if (!sessionId) return [];
    return getLeaderboard(sessionId);
  });

  // IPC: Get session history
  ipcMain.handle('get-session-history', () => {
    return getSessionHistory();
  });

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
