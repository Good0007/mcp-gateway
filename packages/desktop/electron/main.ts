import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import net from 'node:net';
import { fork, execSync, type ChildProcess } from 'node:child_process';

// Paths resolved relative to compiled main.js in dist-electron/main/
const DIST_PATH = path.join(__dirname, '../../dist');
const PUBLIC_PATH = app.isPackaged ? DIST_PATH : path.join(__dirname, '../../../public');

let win: BrowserWindow | null;
let serverProcess: ChildProcess | null = null;
let serverPort = 0;

const VITE_DEV_SERVER_URL = 'http://localhost:5174';

/**
 * On macOS / Linux, Electron apps launched from Finder / desktop
 * only see a minimal PATH (/usr/bin:/bin). Resolve the user's
 * full login-shell PATH so child processes (server, env checks)
 * can find node, python, uv, cargo, etc.
 */
function resolveShellPath(): string {
  if (process.platform === 'win32') return process.env.PATH || '';
  try {
    const shell = process.env.SHELL || '/bin/zsh';
    const out = execSync(`${shell} -ilc 'echo -n "$PATH"'`, {
      encoding: 'utf-8',
      timeout: 5000,
      env: { ...process.env },
    });
    return out.trim() || process.env.PATH || '';
  } catch {
    return process.env.PATH || '';
  }
}

// Fix PATH early — before any child process is spawned
if (app.isPackaged) {
  process.env.PATH = resolveShellPath();
}

/** Find a free TCP port by binding to port 0 and immediately releasing */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      server.close(() => resolve(addr.port));
    });
    server.on('error', reject);
  });
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(PUBLIC_PATH, 'favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  if (!app.isPackaged) {
    win.loadURL(VITE_DEV_SERVER_URL).catch(e => {
      console.error('Load failed, retrying in 1s...', e);
      setTimeout(() => win?.loadURL(VITE_DEV_SERVER_URL), 1000);
    });
    win.webContents.openDevTools();
  } else {
    const indexHtml = path.join(DIST_PATH, 'index.html');
    console.log('Loading production file:', indexHtml);
    win.loadFile(indexHtml, {
      query: { apiPort: serverPort.toString() },
    }).catch(e => {
      console.error('Failed to load production file:', e);
    });
  }
}

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  ipcMain.handle('ping', () => 'pong');
  await startServer();
  createWindow();
});

async function startServer() {
  if (!app.isPackaged) {
    console.log('Dev mode: server runs separately');
    return;
  }

  const serverPath = path.join(process.resourcesPath, 'server', 'index.js');
  console.log('Starting server from:', serverPath);

  // Find a free port first so we know it immediately
  serverPort = await findFreePort();
  console.log('Allocated port:', serverPort);

  return new Promise<void>((resolve) => {
    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        PORT: serverPort.toString(),
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1',
        MCP_CONFIG_DIR: path.join(app.getPath('userData'), 'config'),
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    serverProcess.on('message', (msg: any) => {
      if (msg?.type === 'server-started') {
        // Use the actual port reported by the server (should match)
        serverPort = msg.port;
        console.log('Server confirmed on port:', serverPort);
        done();
      }
    });

    serverProcess.stdout?.on('data', (data: Buffer) => {
      console.log('[Server]', data.toString().trimEnd());
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error('[Server Error]', data.toString().trimEnd());
    });

    serverProcess.on('error', (err) => {
      console.error('Server process error:', err);
      done();
    });

    serverProcess.on('exit', (code) => {
      console.error('Server exited with code:', code);
      done();
    });

    // Generous timeout — server should start well within this
    setTimeout(() => {
      if (!resolved) {
        console.warn('Server startup timed out, proceeding with port:', serverPort);
        done();
      }
    }, 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}
