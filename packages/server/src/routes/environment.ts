/**
 * Environment API Routes
 * Detect and manage system environments (node, python, uv, etc.)
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);
const app = new Hono();

/**
 * Detect current operating system
 */
function detectOS(): 'mac' | 'linux' | 'windows' {
  const platform = os.platform();
  if (platform === 'darwin') return 'mac';
  if (platform === 'win32') return 'windows';
  return 'linux';
}

/**
 * Detect Linux distribution and package manager
 */
async function detectLinuxDistro(): Promise<{
  distro: string;
  version: string;
  packageManager: 'apk' | 'apt' | 'yum' | 'dnf' | 'pacman' | 'zypper' | 'unknown';
}> {
  try {
    // Read /etc/os-release file
    const osReleaseContent = await fs.promises.readFile('/etc/os-release', 'utf-8');
    const lines = osReleaseContent.split('\n');
    
    let distro = 'unknown';
    let version = '';
    let id = '';
    let idLike = '';
    
    for (const line of lines) {
      if (line.startsWith('NAME=')) {
        distro = line.substring(5).replace(/"/g, '');
      } else if (line.startsWith('VERSION=')) {
        version = line.substring(8).replace(/"/g, '');
      } else if (line.startsWith('ID=')) {
        id = line.substring(3).replace(/"/g, '');
      } else if (line.startsWith('ID_LIKE=')) {
        idLike = line.substring(8).replace(/"/g, '');
      }
    }
    
    // Detect package manager based on distro ID
    let packageManager: 'apk' | 'apt' | 'yum' | 'dnf' | 'pacman' | 'zypper' | 'unknown' = 'unknown';
    
    const idLower = id.toLowerCase();
    const idLikeLower = idLike.toLowerCase();
    
    if (idLower.includes('alpine')) {
      packageManager = 'apk';
    } else if (idLower.includes('debian') || idLower.includes('ubuntu') || idLikeLower.includes('debian')) {
      packageManager = 'apt';
    } else if (idLower.includes('fedora') || idLower.includes('rhel') || idLower.includes('centos')) {
      // Check if dnf is available (newer versions)
      try {
        await execAsync('which dnf', { timeout: 1000 });
        packageManager = 'dnf';
      } catch {
        packageManager = 'yum';
      }
    } else if (idLower.includes('arch') || idLikeLower.includes('arch')) {
      packageManager = 'pacman';
    } else if (idLower.includes('opensuse') || idLower.includes('suse') || idLikeLower.includes('suse')) {
      packageManager = 'zypper';
    } else if (idLikeLower.includes('fedora') || idLikeLower.includes('rhel')) {
      packageManager = 'dnf';
    }
    
    return { distro, version, packageManager };
  } catch (error) {
    console.error('Failed to detect Linux distro:', error);
    return { distro: 'Linux', version: '', packageManager: 'unknown' };
  }
}

/**
 * Execute command and return version info
 */
async function checkCommand(command: string): Promise<{ installed: boolean; version?: string }> {
  try {
    const { stdout } = await execAsync(command, { timeout: 5000 });
    const version = stdout.trim();
    return { installed: true, version };
  } catch {
    return { installed: false };
  }
}

// GET /api/environment/check - Check all environments
app.get('/check', async (c) => {
  try {
    const currentOS = detectOS();
    
    // Detect Linux distro if on Linux
    let linuxInfo = null;
    if (currentOS === 'linux') {
      linuxInfo = await detectLinuxDistro();
    }
    
    // Adjust commands based on OS
    const checks = currentOS === 'windows' 
      ? [
          { id: 'node', command: 'node --version' },
          { id: 'npm', command: 'npm --version' },
          { id: 'npx', command: 'npx --version' },
          { id: 'python3', command: 'python --version' }, // Windows often uses 'python' not 'python3'
          { id: 'pip', command: 'pip --version' },
          { id: 'uv', command: 'uv --version' },
          { id: 'uvx', command: 'uvx --version' },
          { id: 'git', command: 'git --version' },
          { id: 'rust', command: 'rustc --version' },
          { id: 'cargo', command: 'cargo --version' },
          { id: 'java', command: 'java -version' },
          { id: 'javac', command: 'javac -version' },
          { id: 'go', command: 'go version' },
        ]
      : [
          { id: 'node', command: 'node --version' },
          { id: 'npm', command: 'npm --version' },
          { id: 'npx', command: 'npx --version' },
          { id: 'python3', command: 'python3 --version' },
          { id: 'pip', command: 'pip --version || pip3 --version' },
          { id: 'uv', command: 'uv --version' },
          { id: 'uvx', command: 'uvx --version' },
          { id: 'git', command: 'git --version' },
          { id: 'rust', command: 'rustc --version' },
          { id: 'cargo', command: 'cargo --version' },
          { id: 'java', command: 'java -version' },
          { id: 'javac', command: 'javac -version' },
          { id: 'go', command: 'go version' },
        ];

    const results = await Promise.all(
      checks.map(async ({ id, command }) => {
        const result = await checkCommand(command);
        return [id, result];
      })
    );

    const environments = Object.fromEntries(results);

    return c.json({ 
      success: true,
      environments,
      os: currentOS,
      linux: linuxInfo,
    });
  } catch (error: any) {
    console.error('Environment check error:', error);
    return c.json({ error: error.message || 'Failed to check environments' }, 500);
  }
});

// GET /api/environment/sse-install - Install an environment with real-time logs via SSE
app.get('/sse-install', async (c) => {
  const id = c.req.query('id');
  const command = c.req.query('command');

  if (!id || !command) {
    return c.text('Missing id or command', 400);
  }

  console.log(`Installing ${id} via SSE: ${command}`);

  return streamSSE(c, async (stream) => {
    // Send initial status
    await stream.writeSSE({
      event: 'status',
      data: 'starting',
    });

    const currentOS = detectOS();
    const shell = currentOS === 'windows' ? 'powershell.exe' : '/bin/bash';
    const shellArgs = currentOS === 'windows' ? ['-Command', command] : ['-c', command];
    
    const child = spawn(shell, shellArgs, {
      env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' },
    });

    // Handle stdout
    child.stdout?.on('data', async (data) => {
      const output = data.toString();
      await stream.writeSSE({
        event: 'log',
        data: output,
      });
    });

    // Handle stderr
    child.stderr?.on('data', async (data) => {
      const output = data.toString();
      await stream.writeSSE({
        event: 'log',
        data: output,
      });
    });

    // Wait for process to exit
    const exitCode = await new Promise<number>((resolve) => {
      child.on('close', resolve);
      child.on('error', (err) => {
        console.error(`[${id}] spawn error:`, err);
        resolve(-1);
      });
    });

    if (exitCode === 0) {
      await stream.writeSSE({
        event: 'status',
        data: 'success',
      });
      await stream.writeSSE({
        event: 'log',
        data: `${id} installed successfully`,
      });
    } else {
      await stream.writeSSE({
        event: 'service-error',
        data: `Installation failed with code ${exitCode}`,
      });
    }
    
    await stream.close();
  });
});

// POST /api/environment/install - Install an environment with real-time logs
app.post('/install', async (c) => {
  try {
    const { id, command } = await c.req.json();

    if (!command) {
      return c.json({ error: 'Install command is required' }, 400);
    }

    console.log(`Installing ${id}: ${command}`);

    // Use spawn for real-time output
    return new Promise<Response>((resolve) => {
      const currentOS = detectOS();
      const shell = currentOS === 'windows' ? 'powershell.exe' : '/bin/bash';
      const shellArgs = currentOS === 'windows' ? ['-Command', command] : ['-c', command];
      
      const child = spawn(shell, shellArgs, {
        env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive' },
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[${id}] stdout:`, output);
      });

      child.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.log(`[${id}] stderr:`, output);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(c.json({ 
            success: true,
            message: `${id} installed successfully`,
            output: stdout,
            logs: stderr || stdout,
          }) as Response);
        } else {
          resolve(c.json({ 
            error: `Installation failed with code ${code}`,
            details: stderr || stdout,
            logs: stderr || stdout,
          }, 500) as Response);
        }
      });

      child.on('error', (error) => {
        console.error(`[${id}] spawn error:`, error);
        resolve(c.json({ 
          error: error.message || 'Failed to install environment',
          details: error.message,
        }, 500) as Response);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!child.killed) {
          child.kill();
          resolve(c.json({ 
            error: 'Installation timeout (5 minutes)',
            details: stdout || stderr,
            logs: stderr || stdout,
          }, 500) as Response);
        }
      }, 300000);
    });
  } catch (error: any) {
    console.error('Environment install error:', error);
    return c.json({ 
      error: error.message || 'Failed to install environment',
      details: error.stderr || error.stdout,
    }, 500);
  }
});

// POST /api/environment/uninstall - Uninstall an environment
app.post('/uninstall', async (c) => {
  try {
    const { id, command } = await c.req.json();

    if (!command) {
      return c.json({ error: 'Uninstall command is required' }, 400);
    }

    console.log(`Uninstalling ${id}: ${command}`);

    const { stdout, stderr } = await execAsync(command, { 
      timeout: 60000, // 1 minute timeout
    });

    console.log(`Uninstall ${id} stdout:`, stdout);
    if (stderr) {
      console.log(`Uninstall ${id} stderr:`, stderr);
    }

    return c.json({ 
      success: true,
      message: `${id} uninstalled successfully`,
      output: stdout,
    });
  } catch (error: any) {
    console.error('Environment uninstall error:', error);
    return c.json({ 
      error: error.message || 'Failed to uninstall environment',
      details: error.stderr || error.stdout,
    }, 500);
  }
});

export default app;
