const diseaseApiUrl = (process.env.DISEASE_API_URL || 'http://127.0.0.1:5055').replace(/\/$/, '');
const diseaseTimeoutMs = Math.max(1000, Number(process.env.DISEASE_TIMEOUT_MS || 30000));
const maxImageBytes = 8 * 1024 * 1024;

function decodeImageDataUrl(value) {
  if (typeof value !== 'string') throw new Error('Please upload a valid plant image.');
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Only JPEG, PNG, and WebP images are supported.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > maxImageBytes) throw new Error('Plant image must be smaller than 8 MB.');
  return { mimeType: match[1], buffer };
}

export async function analyzeDisease({ image, filename = 'plant-image.jpg' }) {
  const { mimeType, buffer } = decodeImageDataUrl(image);
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: mimeType }), String(filename).replace(/[\r\n]/g, '_'));
  let response;
  try {
    response = await fetch(`${diseaseApiUrl}/api/analyze`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(diseaseTimeoutMs),
    });
  } catch (error) {
    const timeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw Object.assign(new Error(timeout ? 'Disease Detection timed out.' : 'Disease Detection service is unavailable.'), { status: 503 });
  }
  let body;
  try { body = await response.json(); } catch { body = { error: 'Disease Detection returned an invalid response.' }; }
  return { status: response.status, body };
}

export async function diseaseWiki(path) {
  let response;
  try {
    response = await fetch(`${diseaseApiUrl}${path}`, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw Object.assign(new Error('Disease information service is unavailable.'), { status: 503 });
  }
  let body;
  try { body = await response.json(); } catch { body = { available: false, message: 'Disease information is unavailable.' }; }
  return { status: response.status, body };
}

export { diseaseApiUrl };
