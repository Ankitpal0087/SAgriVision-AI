import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceDir = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.resolve(serviceDir, '../../models/seed_type/model/seed_type4.2_mobilenetv2.h5');
const pythonBin = process.env.PYTHON_BIN || 'python';
const predictorScript = path.resolve(serviceDir, '../inference/seed_type_predict.py');
let workerPromise;
let worker;
let requestNumber = 0;
const pendingRequests = new Map();

function startWorker() {
  worker = spawn(pythonBin, [predictorScript, modelPath, '--worker'], { stdio: ['pipe', 'pipe', 'pipe'] });
  const ready = new Promise((resolve, reject) => {
    const lines = createInterface({ input: worker.stdout });
    let initialized = false;
    lines.on('line', line => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message.ready) {
        initialized = true;
        resolve();
        return;
      }
      const pending = pendingRequests.get(message.requestId);
      if (!pending) return;
      pendingRequests.delete(message.requestId);
      if (message.error) pending.reject(new Error(message.error));
      else pending.resolve(message);
    });
    worker.once('error', error => {
      const failure = new Error(`Seed model runtime unavailable: ${error.message}`);
      if (!initialized) reject(failure);
      for (const pending of pendingRequests.values()) pending.reject(failure);
      pendingRequests.clear();
      workerPromise = undefined;
    });
    worker.once('close', code => {
      const failure = new Error(code ? `Seed Type Model inference failed (exit code ${code}).` : 'Seed Type Model worker stopped.');
      if (!initialized) reject(failure);
      for (const pending of pendingRequests.values()) pending.reject(failure);
      pendingRequests.clear();
      workerPromise = undefined;
      worker = undefined;
    });
  });
  worker.stderr.on('data', chunk => process.stderr.write(`[seed-model] ${chunk}`));
  return ready;
}

function ensureWorker() {
  if (!workerPromise) workerPromise = startWorker().catch(error => { workerPromise = undefined; throw error; });
  return workerPromise;
}

export function warmSeedModel() {
  return ensureWorker();
}

export async function predictSeedType({ image, mimeType = 'image/jpeg' }) {
  if (typeof image !== 'string' || !image.startsWith('data:image/')) throw new Error('Please upload a valid seed image.');
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Only JPEG, PNG, and WebP seed images are supported.');
  const file = path.join(os.tmpdir(), `sagrivision-seed-${randomUUID()}.${match[1].split('/')[1].replace('jpeg', 'jpg')}`);
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) throw new Error('Seed image must be smaller than 10 MB.');
  await writeFile(file, buffer);
  try {
    const result = await runPython(file);
    return { available: true, seedType: result.seedType, confidence: result.confidence, model: 'seed_type4.2_mobilenetv2', inputSize: [224, 224], classes: ['Amla Seed', 'Apple Seed', 'Avocado Seed', 'Betel Nut Seed', 'Black Plum Seed', 'Corn Seed', 'Date Seed', 'Flax Seed', 'Hog Plum Seed', 'Jackfruit Seed', 'Litchi Seed', 'Mango Seed', 'Mustard Seed', 'Olive Seed', 'Orange Seed', 'Paddy Seed', 'Pumpkin Seed', 'Safflower Seed', 'Sapodilla Seed', 'Sesame Seed', 'Soybean Seed', 'Sunflower Seed', 'Tamarind Seed', 'Wheat Seed'] };
  } finally { await unlink(file).catch(() => {}); }
}

function runPython(imagePath) {
  return ensureWorker().then(() => new Promise((resolve, reject) => {
    const requestId = String(++requestNumber);
    pendingRequests.set(requestId, { resolve, reject });
    worker.stdin.write(`${JSON.stringify({ requestId, imagePath })}\n`, error => {
      if (!error) return;
      pendingRequests.delete(requestId);
      reject(new Error(`Seed model runtime unavailable: ${error.message}`));
    });
  }));
}
