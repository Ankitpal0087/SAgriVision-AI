export { predictSeedType } from '../services/seedTypeInference.js';
export async function predictSeedQuality(_input) { return { available: false, quality: null, provider: 'not-configured' }; }
export async function detectDisease(_input) { return { available: false, disease: null, guidance: null, provider: 'not-configured' }; }
