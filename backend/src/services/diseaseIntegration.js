// Stable handoff contract for the future agriculture chatbot.
// This module does not predict disease and does not generate treatment advice.
export function buildDiseaseAssistantContext({ crop, diseaseResult, language = 'en' }) {
  return {
    source: 'disease-detection',
    language,
    crop: crop || null,
    disease: diseaseResult?.disease || null,
    confidence: diseaseResult?.confidence ?? null,
    modelVersion: diseaseResult?.modelVersion || null,
    imageAnalysisId: diseaseResult?.analysisId || null,
    requestedCapabilities: ['explanation', 'treatment-management', 'prevention', 'follow-up-questions']
  };
}

// Future implementation point. Keep disabled until the chatbot is explicitly enabled.
export async function handoffToChatbot(_context) {
  return { enabled: false, status: 'chatbot-disabled', context: _context };
}
