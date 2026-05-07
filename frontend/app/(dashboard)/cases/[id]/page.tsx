"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clock3, Download, FileText, RefreshCw, RotateCw } from "lucide-react"
import { toast } from "sonner"

import { formatCaseDate } from "@/components/CaseCard"
import { GradCAMViewer } from "@/components/GradCAMViewer"
import { getConfidenceBand, PredictionBadge } from "@/components/PredictionBadge"
import { ReviewPanel } from "@/components/ReviewPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { runPrediction } from "@/lib/api"
import {
  CURRENT_DIAGNOSTIC_VERSION,
  formatCaseCode,
  getCase,
  updateCasePrediction,
} from "@/lib/cases"
import { getReviewerName } from "@/lib/reviewer"
import type { Case, ReviewStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusStyles: Record<ReviewStatus, string> = {
  pending: "border-amber-300/40 bg-amber-500/15 text-amber-700 dark:text-amber-200",
  validated: "border-emerald-300/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
  rejected: "border-red-300/40 bg-red-500/15 text-red-700 dark:text-red-200",
}

interface CaseDetailPageProps {
  params: {
    id: string
  }
}

export default function CaseDetailPage({ params }: CaseDetailPageProps) {
  const [cellCase, setCellCase] = useState<Case | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRechecking, setIsRechecking] = useState(false)

  useEffect(() => {
    const storedCase = getCase(params.id)
    setCellCase(storedCase)
    setIsLoading(false)
    if (
      storedCase &&
      storedCase.review_status === "pending" &&
      storedCase.diagnostic_version !== CURRENT_DIAGNOSTIC_VERSION
    ) {
      recheckPrediction(storedCase)
    }
  }, [params.id])

  async function recheckPrediction(caseToUpdate: Case) {
    setIsRechecking(true)

    try {
      const file = await imageUrlToFile(caseToUpdate.image_url)
      const predictionResult = await runPrediction(file)
      const gradcamUrl = predictionResult.gradcam_base64
        ? `data:image/png;base64,${predictionResult.gradcam_base64}`
        : caseToUpdate.gradcam_url

      const updatedCase = updateCasePrediction({
        caseId: caseToUpdate.id,
        predictionResult,
        gradcamUrl,
        diagnosticVersion: CURRENT_DIAGNOSTIC_VERSION,
      })

      if (updatedCase) {
        setCellCase(updatedCase)
        if (
          updatedCase.prediction !== caseToUpdate.prediction ||
          Math.abs(updatedCase.confidence - caseToUpdate.confidence) >= 0.5
        ) {
          toast.success("Prediction refreshed with the calibrated model.")
        }
      }
    } catch {
      toast.error("Could not refresh this saved prediction.")
    } finally {
      setIsRechecking(false)
    }
  }

  if (isLoading) {
    return null
  }

  if (!cellCase) {
    return <CaseNotFound />
  }

  const isInfected = cellCase.prediction === "infected"
  const needsReview = getConfidenceBand(cellCase.confidence) === "needs_review"

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <Button asChild variant="link" className="w-fit px-0">
            <Link href="/cases">
              <ArrowLeft className="size-4" />
              Back to cases
            </Link>
          </Button>
          <div>
            <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
              {formatCaseCode(cellCase.id)}
            </h1>
            <p className="text-sm text-muted-foreground">
              Diagnostic review packet
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => recheckPrediction(cellCase)}
            disabled={isRechecking}
          >
            {isRechecking ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <RotateCw className="size-4" />
            )}
            Re-run diagnosis
          </Button>
          <Button type="button" variant="outline" onClick={() => exportReport(cellCase)}>
            <Download className="size-4" />
            Export report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <GradCAMViewer
          imageUrl={cellCase.image_url}
          gradcamUrl={cellCase.gradcam_url}
          prediction={cellCase.prediction}
        />

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Diagnostic Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {cellCase.patient_ref ? (
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-xs text-muted-foreground">Patient Reference</p>
                  <p className="text-sm text-foreground">{cellCase.patient_ref}</p>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoLine label="Slide ID" value={cellCase.slide_id || "Not provided"} />
                <InfoLine label="Image source" value={cellCase.image_source || "Not provided"} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PredictionBadge
                  prediction={cellCase.prediction}
                  confidence={cellCase.confidence}
                  size="large"
                />
                <span
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-xs font-semibold tracking-normal",
                    statusStyles[cellCase.review_status],
                  )}
                >
                  {cellCase.review_status.toUpperCase()}
                </span>
                {isRechecking ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/40 bg-blue-500/15 px-3 py-1.5 font-mono text-xs font-semibold tracking-normal text-blue-700 dark:text-blue-200">
                    <RefreshCw className="size-3 animate-spin" />
                    RECALIBRATING
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-foreground">Confidence</p>
                  <p className="font-mono text-sm text-foreground">
                    {cellCase.confidence.toFixed(1).replace(".0", "")}%
                  </p>
                </div>
                <Progress
                  value={cellCase.confidence}
                  indicatorClassName={
                    needsReview ? "bg-amber-500" : isInfected ? "bg-red-500" : "bg-green-500"
                  }
                />
              </div>

              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-sm font-medium text-foreground">Confidence explanation</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getConfidenceExplanation(cellCase)}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-xs text-muted-foreground">Submitted</p>
                  <p className="text-sm text-foreground">{formatCaseDate(cellCase.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-mono text-xs text-muted-foreground">Reviewer</p>
                  <p className="text-sm text-foreground">{getReviewerName()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {cellCase.review_status === "pending" ? (
            <ReviewPanel caseId={cellCase.id} onReviewed={() => setCellCase(getCase(params.id))} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Review Outcome</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {cellCase.reviewer_note ? (
                  <p className="rounded-lg border border-border bg-secondary p-4 text-sm text-foreground">
                    {cellCase.reviewer_note}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No reviewer note was added.</p>
                )}
                {cellCase.reviewed_at ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    Reviewed {formatCaseDate(cellCase.reviewed_at)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Review History</CardTitle>
                <Clock3 className="text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3">
                <HistoryItem
                  title="Case created"
                  detail={formatCaseDate(cellCase.created_at)}
                />
                <HistoryItem
                  title="Model inference completed"
                  detail={`${cellCase.diagnostic_version || "legacy model"} · ${cellCase.prediction} ${cellCase.confidence.toFixed(1)}%`}
                />
                <HistoryItem
                  title={
                    cellCase.review_status === "pending"
                      ? "Awaiting reviewer decision"
                      : `Case ${cellCase.review_status}`
                  }
                  detail={
                    cellCase.reviewed_at
                      ? formatCaseDate(cellCase.reviewed_at)
                      : "Pending clinical validation"
                  }
                />
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground">{value}</p>
    </div>
  )
}

function HistoryItem({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary">
        <FileText className="size-3.5 text-primary" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </li>
  )
}

function getConfidenceExplanation(cellCase: Case) {
  if (cellCase.confidence < 70) {
    return "Low-confidence result. Manual review is recommended before accepting or rejecting this prediction."
  }

  if (cellCase.prediction === "infected") {
    return "The model detected parasite-like stained inclusion patterns and localized attention in the cell image."
  }

  return "The model did not detect a strong parasite-like stain cluster in this red blood cell image."
}

function exportReport(cellCase: Case) {
  const lines = [
    "CellScan diagnostic report",
    `Case: ${formatCaseCode(cellCase.id)}`,
    `Patient reference: ${cellCase.patient_ref || "Not provided"}`,
    `Slide ID: ${cellCase.slide_id || "Not provided"}`,
    `Image source: ${cellCase.image_source || "Not provided"}`,
    `Prediction: ${cellCase.prediction}`,
    `Confidence: ${cellCase.confidence.toFixed(1)}%`,
    `Review status: ${cellCase.review_status}`,
    `Reviewer note: ${cellCase.reviewer_note || "None"}`,
    `Submitted: ${formatCaseDate(cellCase.created_at)}`,
    `Reviewed: ${cellCase.reviewed_at ? formatCaseDate(cellCase.reviewed_at) : "Pending"}`,
    `Diagnostic version: ${cellCase.diagnostic_version || "legacy model"}`,
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${formatCaseCode(cellCase.id)}-report.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function imageUrlToFile(imageUrl: string) {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error("Stored case image could not be read.")
  }

  const blob = await response.blob()
  return new File([blob], "stored-rbc-image.png", { type: blob.type || "image/png" })
}

function CaseNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-mono text-2xl font-semibold tracking-normal">Case not found</h1>
          <p className="text-sm text-muted-foreground">
            This case is not stored in this browser.
          </p>
          <Button asChild>
            <Link href="/cases">Back to cases</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
