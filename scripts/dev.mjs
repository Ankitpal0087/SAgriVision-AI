import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendEntry = process.argv.includes('--backend-entry');
const services = [];
let shuttingDown = false;

const paths = {
  frontend: `${root}/frontend`,
  backend: `${root}/backend`,
  mlWorkingDir: `${root}/crop-recommendation-module/ml-api/ml`,
  mlPython: `${root}/crop-recommendation-module/ml-api/.venv/Scripts/python.exe`,
};
// This orchestrator owns only the Crop Recommendation API on port 8001.
// Keep the other project's ML API on port 8000 completely out of this flow.
const mlApiUrl = 'http://127.0.0.1:8001';
const mlApiPort = 8001;

function log(name, message) {
  process.stdout.write(`[${name}] ${message}`);
}

function attachOutput(name, child) {
  child.stdout?.on('data', chunk => log(name, chunk.toString()));
  child.stderr?.on('data', chunk => log(`${name}:err`, chunk.toString()));
}

function spawnService(name, command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  attachOutput(name, child);
  child.once('error', error => log(name, `failed to start: ${error.message}\n`));
  services.push({ name, child });
  return child;
}

function portIsOpen(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
  });
}

async function healthCheck() {
  try {
    const response = await fetch(`${mlApiUrl}/health`, {
      signal: AbortSignal.timeout(1000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.message === 'Crop Recommendation ML API is running';
  } catch {
    return false;
  }
}

async function httpHealthCheck(url, isHealthy) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return await isHealthy(response);
  } catch {
    return false;
  }
}

const backendHealthCheck = () => httpHealthCheck(
  'http://127.0.0.1:3000/',
  async response => response.status === 404 && (await response.text()) === 'SagriVision backend API',
);
const frontendHealthCheck = () => httpHealthCheck(
  'http://127.0.0.1:4173/',
  async response => response.ok && (await response.text()).includes('SAgriVision'),
);

async function ensureCropMlApi() {
  if (await healthCheck()) {
    log('ml-api', `reusing healthy service at ${mlApiUrl}\n`);
    return;
  }

  if (await portIsOpen(mlApiPort)) {
    throw new Error(`Port ${mlApiPort} is occupied, but the process is not the Crop Recommendation ML API. Refusing to start a duplicate.`);
  }

  log('ml-api', 'starting verified Uvicorn entry point ml_api:app\n');
  const child = spawnService(
    'ml-api',
    paths.mlPython,
    ['-m', 'uvicorn', 'ml_api:app', '--host', '127.0.0.1', '--port', String(mlApiPort)],
    paths.mlWorkingDir,
  );

  const recentLogs = [];
  const capture = chunk => {
    recentLogs.push(chunk.toString());
    if (recentLogs.length > 20) recentLogs.shift();
  };
  child.stdout?.on('data', capture);
  child.stderr?.on('data', capture);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await healthCheck()) {
      log('ml-api', `health check passed at ${mlApiUrl}/health\n`);
      return;
    }
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const details = recentLogs.join('').trim();
  throw new Error(`Crop Recommendation ML API did not become healthy within 30 seconds.${details ? `\nRecent ML logs:\n${details}` : ''}`);
}

async function startOrReuse(name, port, command, args, cwd, isHealthy) {
  if (await isHealthy()) {
    log(name, `reusing healthy service on port ${port}\n`);
    return null;
  }
  if (await portIsOpen(port)) {
    throw new Error(`Port ${port} is occupied, but the ${name} health check failed. Refusing to start a duplicate.`);
  }
  const child = spawnService(name, command, args, cwd);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isHealthy()) return child;
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`${name} did not become ready on port ${port} within 30 seconds.`);
}

function terminate(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGTERM');
  }
}

async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const { child } of services.reverse()) terminate(child);
  await new Promise(resolve => setTimeout(resolve, 300));
  process.exit(code);
}

async function main() {
  try {
    await ensureCropMlApi();
    const backend = await startOrReuse(
      'backend',
      3000,
      process.execPath,
      ['--env-file=.env.development', '--watch', 'src/index.js'],
      paths.backend,
      backendHealthCheck,
    );
    const frontend = backendEntry
      ? null
      : await startOrReuse('frontend', 4173, process.execPath, ['server.mjs'], paths.frontend, frontendHealthCheck);
    backend?.once('exit', (code, signal) => {
      if (!shuttingDown) log('dev', `backend exited (code=${code}, signal=${signal ?? 'none'})\n`), shutdown(code || 1);
    });
    frontend?.once('exit', (code, signal) => {
      if (!shuttingDown) log('dev', `frontend exited (code=${code}, signal=${signal ?? 'none'})\n`), shutdown(code || 1);
    });
    log('dev', `startup complete: ${backendEntry ? 'backend 3000' : 'frontend 4173, backend 3000'}, crop ML API ${mlApiPort}\n`);
  } catch (error) {
    log('dev', `${error.message}\n`);
    await shutdown(1);
  }
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
main();
