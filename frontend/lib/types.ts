export type Prediction = "healthy" | "infected"
export type ReviewStatus = "pending" | "validated" | "rejected"

export interface Case {
  id: string
  reviewer_id: string
  patient_ref: string | null
  slide_id?: string | null
  image_source?: string | null
  image_url: string
  gradcam_url: string | null
  prediction: Prediction
  confidence: number
  review_status: ReviewStatus
  reviewer_note: string | null
  reviewed_at: string | null
  created_at: string
  diagnostic_version?: string | null
}

export interface PredictionResult {
  prediction: Prediction
  confidence: number
  gradcam_base64: string
}
