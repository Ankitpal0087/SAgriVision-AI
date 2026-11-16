import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendEntry = process.argv.includes('--backend-entry');
const services = [];
let shuttingDown = false;

const paths = {
  frontend: `${root}/frontend`,
  cropGptFrontend: `${root}/frontend/cropgpt-app`,
  cropGptBackend: 'D:/CropGpt',
  cropAdvisor: `${root}/crop-advisor-service`,
  cropAdvisorPython: process.env.CROP_ADVISOR_PYTHON_BIN || 'D:/crop_advisor/.venv/Scripts/python.exe',
  backend: `${root}/backend`,
  diseaseDetection: `${root}/disease-detection-service`,
  mlWorkingDir: `${root}/crop-recommendation-module/ml-api/ml`,
  mlPython: `${root}/crop-recommendation-module/ml-api/.venv/Scripts/python.exe`,
};
// This orchestrator owns only the Crop Recommendation API on port 8001.
// Keep the other project's ML API on port 8000 completely out of this flow.
const mlApiUrl = 'http://127.0.0.1:8001';
const mlApiPort = 8001;
const cropGptApiUrl = 'http://127.0.0.1:8002';
const cropGptApiPort = 8002;
const cropAdvisorApiUrl = 'http://127.0.0.1:5000';
const cropAdvisorApiPort = 5000;
const diseaseApiUrl = 'http://127.0.0.1:5055';
const diseaseApiPort = 5055;

function log(name, message) {
  process.stdout.write(`[${name}] ${message}`);
}

function attachOutput(name, child) {
  child.stdout?.on('data', chunk => log(name, chunk.toString()));
  child.stderr?.on('data', chunk => log(`${name}:err`, chunk.toString()));
}

function spawnService(name, command, args, cwd, extraEnv = {}) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...extraEnv, PYTHONDONTWRITEBYTECODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  attachOutput(name, child);
  child.once('error', error => log(name, `failed to start: ${error.message}\n`));
  services.push({ name, child });
  return child;
}

function diseasePythonCandidates() {
  const candidates = [];
  if (process.env.DISEASE_PYTHON_BIN) candidates.push(process.env.DISEASE_PYTHON_BIN);
  if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Python', 'Python310', 'python.exe'));
  try {
    const config = readFileSync('D:/diseasedetection/.venv/pyvenv.cfg', 'utf8');
    const home = config.match(/^home\s*=\s*(.+)$/mi)?.[1]?.trim();
    if (home) candidates.push(path.join(home, 'python.exe'));
  } catch { /* The source environment is optional; continue with other candidates. */ }
  candidates.push('python');
  return [...new Set(candidates)];
}

function resolveDiseasePython() {
  const requiredImports = 'import flask, PIL, numpy, sklearn, tensorflow, requests';
  for (const candidate of diseasePythonCandidates()) {
    const check = spawnSync(candidate, ['-c', requiredImports], {
      stdio: 'ignore',
      windowsHide: true,
    });
    if (!check.error && check.status === 0) return candidate;
  }
  throw new Error('No compatible Python environment was found for Disease Detection. Set DISEASE_PYTHON_BIN to Python 3.10.11 with Flask, Pillow, NumPy, scikit-learn, TensorFlow, and requests installed.');
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

const cropGptHealthCheck = () => httpHealthCheck(
  `${cropGptApiUrl}/api/health`,
  async response => {
    if (!response.ok) return false;
    const body = await response.json();
    return body?.status === 'ok' && body?.knowledge_ready === true;
  },
);

const cropAdvisorHealthCheck = () => httpHealthCheck(
  `${cropAdvisorApiUrl}/health`,
  async response => {
    if (!response.ok) return false;
    const body = await response.json();
    return body?.status === 'ok';
  },
);

const diseaseHealthCheck = () => httpHealthCheck(
  `${diseaseApiUrl}/`,
  async response => response.ok && (await response.text()).includes('Plant health scan'),
);

function ensureCropGptFrontend() {
  const npmCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const npmArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd run build'] : ['run', 'build'];
  log('cropgpt-ui', 'building integrated React frontend\n');
  const result = spawnSync(npmCommand, npmArgs, {
    cwd: paths.cropGptFrontend,
    env: { ...process.env, CI: '1' },
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    const details = `${result.error ? `${result.error.message}\n` : ''}${result.stdout || ''}${result.stderr || ''}`.trim();
    throw new Error(`CropGPT frontend build failed.${details ? `\n${details}` : ''}`);
  }
}

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

async function ensureCropGptApi() {
  if (await cropGptHealthCheck()) {
    log('cropgpt-api', `reusing healthy service at ${cropGptApiUrl}\n`);
    return;
  }

  if (await portIsOpen(cropGptApiPort)) {
    throw new Error(`Port ${cropGptApiPort} is occupied, but the process is not the CropGPT FastAPI service. Refusing to start a duplicate.`);
  }

  log('cropgpt-api', 'starting CropGPT FastAPI service on port 8002\n');
  const child = spawnService(
    'cropgpt-api',
    process.env.CROPGPT_PYTHON_BIN || 'python',
    ['-m', 'uvicorn', 'app.main:app', '--app-dir', 'backend', '--host', '127.0.0.1', '--port', String(cropGptApiPort)],
    paths.cropGptBackend,
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await cropGptHealthCheck()) {
      log('cropgpt-api', `health check passed at ${cropGptApiUrl}/api/health\n`);
      return;
    }
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error('CropGPT FastAPI service did not become healthy within 30 seconds. Check Python dependencies and CropGPT backend configuration.');
}

async function ensureCropAdvisorApi() {
  if (await cropAdvisorHealthCheck()) {
    log('crop-advisor-api', `reusing healthy service at ${cropAdvisorApiUrl}\n`);
    return;
  }

  if (await portIsOpen(cropAdvisorApiPort)) {
    throw new Error(`Port ${cropAdvisorApiPort} is occupied, but the Crop Advisor service health check failed. Refusing to start a duplicate.`);
  }

  log('crop-advisor-api', `starting Flask service on port ${cropAdvisorApiPort}\n`);
  const child = spawnService(
    'crop-advisor-api',
    paths.cropAdvisorPython,
    ['run.py'],
    paths.cropAdvisor,
    { HOST: '127.0.0.1', PORT: String(cropAdvisorApiPort), API_KEY: process.env.CROP_ADVISOR_API_KEY || '' },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await cropAdvisorHealthCheck()) {
      log('crop-advisor-api', `health check passed at ${cropAdvisorApiUrl}/health\n`);
      return;
    }
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error('Crop Advisor service did not become healthy within 30 seconds. Check the copied service and Python environment.');
}

async function ensureDiseaseDetectionApi() {
  if (await diseaseHealthCheck()) {
    log('disease-api', `reusing healthy service at ${diseaseApiUrl}\n`);
    return;
  }
  if (await portIsOpen(diseaseApiPort)) {
    throw new Error(`Port ${diseaseApiPort} is occupied, but the port is not the SAgriVision Disease Detection Flask service. Refusing to start a duplicate.`);
  }
  log('disease-api', `starting Disease Detection Flask service on port ${diseaseApiPort}\n`);
  const diseasePython = resolveDiseasePython();
  log('disease-api', `using Python interpreter ${diseasePython}\n`);
  const child = spawnService(
    'disease-api',
    diseasePython,
    ['app.py'],
    paths.diseaseDetection,
    { HOST: '127.0.0.1', PORT: String(diseaseApiPort) },
  );
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await diseaseHealthCheck()) {
      log('disease-api', `health check passed at ${diseaseApiUrl}\n`);
      return;
    }
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Disease Detection service did not become healthy within 30 seconds. Check Python dependencies and disease-detection-service logs.');
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
    ensureCropGptFrontend();
    await ensureCropMlApi();
    await ensureCropGptApi();
    await ensureCropAdvisorApi();
    await ensureDiseaseDetectionApi();
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
    log('dev', `startup complete: ${backendEntry ? 'backend 3000' : 'frontend 4173, backend 3000'}, crop ML API ${mlApiPort}, CropGPT API ${cropGptApiPort}, Crop Advisor API ${cropAdvisorApiPort}, Disease Detection API ${diseaseApiPort}\n`);
  } catch (error) {
    log('dev', `${error.message}\n`);
    await shutdown(1);
  }
}

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
main();
