export interface VerificationResult {
  consistent: boolean;
  confidence: number;
  note: string;
}

/**
 * Demo resolution-evidence check. Presented in the UI as AI
 * *assistance*, not a guarantee — a human officer/supervisor still
 * makes the final call, and the citizen can dispute via feedback.
 */
export function verifyResolutionEvidence(hasBeforeImage: boolean, hasAfterImage: boolean, note: string): VerificationResult {
  if (!hasAfterImage) {
    return {
      consistent: false,
      confidence: 0,
      note: "No after-resolution evidence was provided; verification skipped.",
    };
  }
  const lengthScore = Math.min(note.trim().split(/\s+/).length / 12, 1);
  const base = hasBeforeImage ? 0.78 : 0.65;
  const confidence = Math.round(Math.min(0.96, base + lengthScore * 0.18) * 100) / 100;
  return {
    consistent: confidence > 0.6,
    confidence,
    note: "Resolution evidence appears consistent with the reported issue.",
  };
}
