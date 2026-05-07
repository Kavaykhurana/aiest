import type { Case, PredictionResult, ReviewStatus } from "@/lib/types"

const CASES_KEY = "cellscan_cases_v1"
export const CURRENT_DIAGNOSTIC_VERSION = "browser-cnn-calibrated-v2"

export function getCases(): Case[] {
  if (typeof window === "undefined") {
    return []
  }

  try {
    const raw = window.localStorage.getItem(CASES_KEY)
    if (!raw) {
      return []
    }

    const cases = JSON.parse(raw)
    if (!Array.isArray(cases)) {
      return []
    }

    return cases.map((cellCase) => ({
      ...cellCase,
      confidence: Number(cellCase.confidence),
      diagnostic_version: cellCase.diagnostic_version || null,
    }))
  } catch {
    return []
  }
}

export function getCase(caseId: string) {
  return getCases().find((cellCase) => cellCase.id === caseId) || null
}

export function createCase(input: {
  reviewerId: string
  patientRef: string | null
  imageUrl: string
  gradcamUrl: string | null
  predictionResult: PredictionResult
}) {
  const now = new Date().toISOString()
  const cellCase: Case = {
    id: crypto.randomUUID(),
    reviewer_id: input.reviewerId,
    patient_ref: input.patientRef,
    image_url: input.imageUrl,
    gradcam_url: input.gradcamUrl,
    prediction: input.predictionResult.prediction,
    confidence: input.predictionResult.confidence,
    review_status: "pending",
    reviewer_note: null,
    reviewed_at: null,
    created_at: now,
    diagnostic_version: CURRENT_DIAGNOSTIC_VERSION,
  }

  saveCases([cellCase, ...getCases()])
  return cellCase
}

export function updateCasePrediction(input: {
  caseId: string
  predictionResult: PredictionResult
  gradcamUrl: string | null
  diagnosticVersion: string
}): Case | null {
  let updatedCase: Case | null = null
  const nextCases = getCases().map((cellCase) => {
    if (cellCase.id !== input.caseId) {
      return cellCase
    }

    updatedCase = {
      ...cellCase,
      prediction: input.predictionResult.prediction,
      confidence: input.predictionResult.confidence,
      gradcam_url: input.gradcamUrl,
      diagnostic_version: input.diagnosticVersion,
    }
    return updatedCase
  })

  saveCases(nextCases)
  return updatedCase
}

export function updateCaseReview(input: {
  caseId: string
  reviewStatus: Exclude<ReviewStatus, "pending">
  reviewerNote: string | null
  reviewedAt: string
}) {
  let updatedCase: Case | null = null
  const nextCases = getCases().map((cellCase) => {
    if (cellCase.id !== input.caseId) {
      return cellCase
    }

    updatedCase = {
      ...cellCase,
      review_status: input.reviewStatus,
      reviewer_note: input.reviewerNote,
      reviewed_at: input.reviewedAt,
    }
    return updatedCase
  })

  saveCases(nextCases)
  return updatedCase
}

function saveCases(cases: Case[]) {
  window.localStorage.setItem(CASES_KEY, JSON.stringify(cases))
}
