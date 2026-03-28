import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import * as fs from 'fs'
import * as crypto from 'crypto'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { startServer, getRadarState, endSessionCSVHandler } from './server';
import { getSessionHistory, saveResource, loadResource } from './database';

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
  const { ip, port, roomCode, setPdfPath } = await startServer(app.getPath('userData'));
  serverUrl = `http://${ip}:${port}`;
  console.log(`Server running at ${serverUrl}`);

  // Setup temporal build directory
  const tempBuildDir = join(app.getPath('userData'), 'temp_build');
  const tempImagesDir = join(tempBuildDir, 'images');
  if (fs.existsSync(tempBuildDir)) {
    fs.rmSync(tempBuildDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempImagesDir, { recursive: true });

  // IPC: import-image
  ipcMain.handle('import-image', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select an Image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'] }],
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    
    const sourcePath = result.filePaths[0];
    const fileName = basename(sourcePath);
    const uniqueFileName = `${crypto.randomUUID()}-${fileName}`;
    const destPath = join(tempImagesDir, uniqueFileName);
    
    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  });

  // IPC: read-file-buffer
  ipcMain.handle('read-file-buffer', async (_event, filePath: string) => {
    try {
      return fs.readFileSync(filePath);
    } catch (e) {
      console.error('Failed to read file buffer:', e);
      return null;
    }
  });

  // IPC: save-base64-image
  ipcMain.handle('save-base64-image', async (_event, dataUrl: string) => {
    try {
      const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
      }
      const buffer = Buffer.from(matches[2], 'base64');
      const uniqueFileName = `${crypto.randomUUID()}.jpg`;
      const destPath = join(tempImagesDir, uniqueFileName);
      
      fs.writeFileSync(destPath, buffer);
      return destPath;
    } catch (e) {
      console.error('Failed to save base64 image:', e);
      return null;
    }
  });

  // IPC: export-lesson
  ipcMain.handle('export-lesson', async (_event, timeline: any[]) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Lesson',
        defaultPath: 'Lesson.sig',
        filters: [{ name: 'Handout Pack', extensions: ['sig'] }]
      });
      
      if (result.canceled || !result.filePath) return false;
      const savePath = result.filePath;

      // Write manifest.json
      const manifestPath = join(tempBuildDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify({ version: 1, timeline }, null, 2));

      // Pack it up
      return new Promise<boolean>((resolve) => {
        const output = fs.createWriteStream(savePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve(true));
        archive.on('error', (err) => {
          console.error(err);
          resolve(false);
        });

        archive.pipe(output);
        archive.directory(tempBuildDir, false);
        archive.finalize();
      });

    } catch (e) {
      console.error('Failed to export lesson:', e);
      return false;
    }
  });

  const activeLessonDir = join(app.getPath('userData'), 'active_lesson');
  const activeImagesDir = join(activeLessonDir, 'images');

  // IPC: get-radar-state
  ipcMain.handle('get-radar-state', () => getRadarState());

  // IPC: clear-active-lesson
  ipcMain.handle('clear-active-lesson', async () => {
    try {
      if (fs.existsSync(activeLessonDir)) {
        fs.rmSync(activeLessonDir, { recursive: true, force: true });
      }
      fs.mkdirSync(activeImagesDir, { recursive: true });
      return true;
    } catch (e) {
      console.error('Failed to clear active lesson dir:', e);
      return false;
    }
  });

  // IPC: end-session-export
  ipcMain.handle('end-session-export', async () => {
    if (!endSessionCSVHandler) return null;
    const csvData = await endSessionCSVHandler();
    if (!csvData) return null;

    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Engagement Radar',
      defaultPath: `Handout_Radar_${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, csvData);
      return filePath;
    }
    return null;
  })

  // IPC: save-active-image
  ipcMain.handle('save-active-image', async (_event, dataUrl: string) => {
    try {
      const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid base64 string');
      }
      const buffer = Buffer.from(matches[2], 'base64');
      const uniqueFileName = `${crypto.randomUUID()}.jpg`;
      const destPath = join(activeImagesDir, uniqueFileName);
      
      fs.writeFileSync(destPath, buffer);
      return destPath;
    } catch (e) {
      console.error('Failed to save active base64 image:', e);
      return null;
    }
  });

  // IPC: import-lesson
  ipcMain.handle('import-lesson', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Load Handout Lesson',
        filters: [{ name: 'Handout Pack', extensions: ['sig'] }],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) return null;
      const sigPath = result.filePaths[0];

      // Aggressively wipe active_lesson to prevent ghost images
      if (fs.existsSync(activeLessonDir)) {
        fs.rmSync(activeLessonDir, { recursive: true, force: true });
      }
      fs.mkdirSync(activeImagesDir, { recursive: true });

      // Unpack using adm-zip
      const zip = new AdmZip(sigPath);
      zip.extractAllTo(activeLessonDir, true);

      // Read manifest.json
      const manifestPath = join(activeLessonDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('manifest.json not found in the .sig package');
      }

      const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestRaw);

      return manifest.timeline;
    } catch (e) {
      console.error('Failed to import lesson:', e);
      return null;
    }
  });

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

  // IPC: Get session history
  ipcMain.handle('get-session-history', () => {
    return getSessionHistory();
  });

  // IPC: Save resource markdown to SQLite
  ipcMain.handle('save-resource', (_event, content: string) => {
    saveResource(content);
    return true;
  });

  // IPC: Load resource markdown from SQLite
  ipcMain.handle('load-resource', () => {
    return loadResource();
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
