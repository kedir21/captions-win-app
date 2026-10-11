const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = Number(process.env.CAPTION_STUDIO_PORT || 4179);
const BASE_URL = `http://127.0.0.1:${PORT}`;
let serverProcess;
let mainWindow;

function serverPath() {
  return path.join(app.getAppPath(), '.output', 'server', 'index.mjs');
}

function startServer() {
  const entry = serverPath();
  serverProcess = spawn(process.execPath, [entry], {
    cwd: app.getAppPath(),
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOST: '127.0.0.1',
      NITRO_HOST: '127.0.0.1',
      PORT: String(PORT),
      NITRO_PORT: String(PORT),
    },
    stdio: 'ignore',
  });
  serverProcess.on('error', (error) => console.error('Caption Studio server failed to start:', error));
}

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (serverProcess && serverProcess.exitCode !== null) {
      throw new Error(`The app server exited with code ${serverProcess.exitCode}.`);
    }
    try {
      const response = await fetch(`${BASE_URL}/api/transcribe`, { signal: AbortSignal.timeout(1200) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error('The local app server did not start in time.');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 650,
    autoHideMenuBar: true,
    title: 'Amharic Caption Studio',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await waitForServer();
    await mainWindow.loadURL(BASE_URL);
  } catch (error) {
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Amharic Caption Studio could not start',
      message: error.message,
      detail: 'Try reinstalling the app. If this continues, run the app from a terminal to inspect its startup logs.',
    });
    app.quit();
  }
}

app.whenReady().then(() => {
  startServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
