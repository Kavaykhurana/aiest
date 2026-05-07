"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { updateCaseReview } from "@/lib/cases"
import type { Prediction, ReviewStatus } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { CLINICAL_DECISION_THRESHOLD, getConfidenceBand } from "@/components/PredictionBadge"

interface ReviewPanelProps {
  caseId: string
  confidence: number
  prediction: Prediction
  onReviewed?: () => void
}

export function ReviewPanel({
  caseId,
  confidence,
  prediction,
  onReviewed,
}: ReviewPanelProps) {
  const [noteText, setNoteText] = useState("")
  const [submitting, setSubmitting] = useState<ReviewStatus | null>(null)
  const requiresManualEvidence = getConfidenceBand(confidence) === "needs_review"

  async function submitReview(status: Exclude<ReviewStatus, "pending">) {
    if (requiresManualEvidence && noteText.trim().length === 0) {
      toast.error("Add a review note before deciding a review-required case.")
      return
    }

    setSubmitting(status)

    try {
      const updatedCase = updateCaseReview({
        caseId,
        reviewStatus: status,
        reviewerNote: noteText.trim() || null,
        reviewedAt: new Date().toISOString(),
      })

      if (!updatedCase) {
        throw new Error("Case not found.")
      }

      toast.success(`Case marked as ${status}`)
      onReviewed?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update case.")
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="clinical-card flex flex-col gap-4 p-5">
      {requiresManualEvidence ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-100">
          This model result is below the {CLINICAL_DECISION_THRESHOLD}% decision threshold.
          Confirm the slide manually and document your note before closing the case.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
          High-confidence model finding: {prediction}. A clinician decision is still required.
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="review-note" className="text-sm font-medium text-foreground">
          {requiresManualEvidence ? "Review note (required)" : "Add a note (optional)"}
        </label>
        <Textarea
          id="review-note"
          value={noteText}
          maxLength={500}
          onChange={(event) => setNoteText(event.target.value)}
          placeholder="Document clinical context or override rationale."
        />
        <p className="self-end font-mono text-xs text-muted-foreground">{noteText.length}/500</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="emerald"
          disabled={submitting !== null}
          onClick={() => submitReview("validated")}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {submitting === "validated" ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <CheckCircle2 data-icon="inline-start" />
          )}
          {requiresManualEvidence ? "Confirm After Review" : "Validate Finding"}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={submitting !== null}
          onClick={() => submitReview("rejected")}
          className="bg-red-600 hover:bg-red-700"
        >
          {submitting === "rejected" ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <XCircle data-icon="inline-start" />
          )}
          Reject Finding
        </Button>
      </div>
    </div>
  )
}
