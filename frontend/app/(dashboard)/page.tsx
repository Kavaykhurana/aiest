"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BarChart3,
  FolderOpen,
  FlaskConical,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"

import { StatsGrid, type DashboardStats } from "@/components/StatsGrid"
import { runPrediction } from "@/lib/api"
import { clearCases, createCase, formatCaseCode, getCases } from "@/lib/cases"
import { notebookResults } from "@/lib/model-results"
import { getReviewerId } from "@/lib/reviewer"
import type { Case } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CLINICAL_DECISION_THRESHOLD, getConfidenceBand, PredictionBadge } from "@/components/PredictionBadge"

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)

  useEffect(() => {
    const syncCases = () => setCases(getCases())
    syncCases()
    window.addEventListener("cellscan:cases-changed", syncCases)
    window.addEventListener("storage", syncCases)
    return () => {
      window.removeEventListener("cellscan:cases-changed", syncCases)
      window.removeEventListener("storage", syncCases)
    }
  }, [])

  async function loadDemoCases() {
    setIsLoadingDemo(true)

    try {
      clearCases()
      for (const sample of demoSamples) {
        const response = await fetch(sample.path)
        if (!response.ok) {
          throw new Error("Sample image is unavailable.")
        }
        const blob = await response.blob()
        const file = new File([blob], sample.filename, { type: blob.type || "image/png" })
        const predictionResult = await runPrediction(file)
        createCase({
          reviewerId: getReviewerId(),
          patientRef: sample.patientRef,
          slideId: sample.slideId,
          imageSource: sample.imageSource,
          imageUrl: await fileToDataUrl(file),
          gradcamUrl: predictionResult.gradcam_base64
            ? `data:image/png;base64,${predictionResult.gradcam_base64}`
            : null,
          predictionResult,
        })
      }
      toast.success("Demo cases loaded for manual review.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load demo cases.")
    } finally {
      setIsLoadingDemo(false)
    }
  }

  function clearCaseStore() {
    clearCases()
    toast.success("Local cases cleared.")
  }

  const stats: DashboardStats = {
    total: cases.length,
    infected: cases.filter(
      (cellCase) =>
        cellCase.prediction === "infected" &&
        getConfidenceBand(cellCase.confidence) === "confident",
    ).length,
    healthy: cases.filter(
      (cellCase) =>
        cellCase.prediction === "healthy" &&
        getConfidenceBand(cellCase.confidence) === "confident",
    ).length,
    reviewRequired: cases.filter(
      (cellCase) => getConfidenceBand(cellCase.confidence) === "needs_review",
    ).length,
    validated: cases.filter((cellCase) => cellCase.review_status === "validated").length,
    rejected: cases.filter((cellCase) => cellCase.review_status === "rejected").length,
  }
  const recentCases = cases.slice(0, 4)
  const reviewProgress = stats.total === 0 ? 0 : Math.round(((stats.validated + stats.rejected) / stats.total) * 100)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Case review, model validation, and worklist status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={loadDemoCases} disabled={isLoadingDemo}>
            {isLoadingDemo ? "Loading demo..." : "Load demo cases"}
          </Button>
          <Button type="button" variant="outline" onClick={clearCaseStore} disabled={cases.length === 0}>
            Clear local cases
          </Button>
          <Button asChild>
            <Link href="/upload">
              New case <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
              <FlaskConical />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Notebook validation set</p>
              <p className="text-sm text-muted-foreground">
                {notebookResults.workingImages.toLocaleString()} images used, {notebookResults.testImages} held out for testing · {CLINICAL_DECISION_THRESHOLD}% review threshold
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <InlineMetric label="Accuracy" value={formatPercent(notebookResults.test.accuracy)} />
            <InlineMetric label="ROC AUC" value={notebookResults.test.rocAuc.toFixed(3)} />
            <InlineMetric label="Recall" value={formatPercent(notebookResults.test.recall)} />
          </div>
          <Button asChild variant="outline" className="justify-self-start lg:justify-self-end">
            <Link href="/upload">
              Run diagnosis <UploadCloud className="size-4" />
            </Link>
          </Button>
        </div>
      </Card>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>Recent Queue</CardTitle>
              <p className="text-sm text-muted-foreground">Latest submitted diagnostics.</p>
            </div>
            <FolderOpen className="text-primary" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recentCases.length > 0 ? (
              recentCases.map((cellCase) => (
                <Link
                  key={cellCase.id}
                  href={`/cases/${cellCase.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-secondary/40 p-3 transition-all duration-200 hover:border-primary hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {cellCase.patient_ref || formatCaseCode(cellCase.id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCaseCode(cellCase.id)} · {formatDate(cellCase.created_at)}
                    </p>
                  </div>
                  <PredictionBadge prediction={cellCase.prediction} confidence={cellCase.confidence} />
                </Link>
              ))
            ) : (
              <div className="flex min-h-40 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
                <Activity className="text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-foreground">No submitted cases yet</p>
                  <p className="text-sm text-muted-foreground">
                    Use a sample cell or upload your own RBC image.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/upload">Open upload</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Notebook Results</CardTitle>
              <BarChart3 className="text-primary" />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <ResultMetric label="Precision" value={formatPercent(notebookResults.test.precision)} />
              <ResultMetric label="F1-score" value={notebookResults.test.f1Score.toFixed(3)} />
              <ResultMetric label="Avg precision" value={notebookResults.test.averagePrecision.toFixed(3)} />
              <ResultMetric label="Best val AUC" value={notebookResults.bestValidationAuc.toFixed(3)} />
            </div>
            <div className="rounded-lg border border-border bg-secondary/40 p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Review coverage</span>
                <span className="font-mono text-foreground">{reviewProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${reviewProgress}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-2 text-amber-700 dark:text-amber-200">
                {stats.reviewRequired} review required
              </span>
              <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-2 text-emerald-700 dark:text-emerald-200">
                {stats.validated} valid
              </span>
              <span className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-2 text-red-700 dark:text-red-200">
                {stats.rejected} rejected
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2">
      <p className="font-mono text-base font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <p className="font-mono text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

const demoSamples = [
  {
    path: "/samples/infected-cell.png",
    filename: "sample-infected-rbc.png",
    patientRef: "DEMO-INF-001",
    slideId: "PARASITIZED-A",
    imageSource: "NIH malaria sample set",
  },
  {
    path: "/samples/healthy-cell.png",
    filename: "sample-healthy-rbc.png",
    patientRef: "DEMO-HEALTHY-001",
    slideId: "UNINFECTED-B",
    imageSource: "NIH malaria sample set",
  },
]

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read image."))
    reader.readAsDataURL(file)
  })
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
