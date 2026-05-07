"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Database,
  FolderOpen,
  UploadCloud,
} from "lucide-react"

import { StatsGrid, type DashboardStats } from "@/components/StatsGrid"
import { getCases } from "@/lib/cases"
import type { Case } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PredictionBadge } from "@/components/PredictionBadge"

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([])

  useEffect(() => {
    setCases(getCases())
  }, [])

  const stats: DashboardStats = {
    total: cases.length,
    infected: cases.filter((cellCase) => cellCase.prediction === "infected").length,
    healthy: cases.filter((cellCase) => cellCase.prediction === "healthy").length,
    pending: cases.filter((cellCase) => cellCase.review_status === "pending").length,
    validated: cases.filter((cellCase) => cellCase.review_status === "validated").length,
    rejected: cases.filter((cellCase) => cellCase.review_status === "rejected").length,
  }
  const recentCases = cases.slice(0, 4)
  const reviewProgress = stats.total === 0 ? 0 : Math.round(((stats.validated + stats.rejected) / stats.total) * 100)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Review activity and diagnostic outcomes.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-blue-400/30 bg-blue-500/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 p-5 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diagnostic Engine
            </CardTitle>
            <BrainCircuit className="text-primary" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-5 pt-0">
            <p className="font-mono text-3xl font-semibold text-foreground">Ready</p>
            <div className="flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                CNN loaded in browser
              </span>
              <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-blue-200">
                Grad-CAM enabled
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 p-5 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Case Store
            </CardTitle>
            <Database className="text-primary" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-5 pt-0">
            <p className="font-mono text-3xl font-semibold text-foreground">Local</p>
            <p className="text-sm text-muted-foreground">
              Cases stay in this browser session and appear instantly across the dashboard.
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-400/30 bg-emerald-500/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 p-5 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Next Case
            </CardTitle>
            <UploadCloud className="text-emerald-200" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4 p-5 pt-0">
            <p className="font-mono text-3xl font-semibold text-foreground">Upload</p>
            <Button asChild>
              <Link href="/upload">
                New diagnostic <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

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
                      {cellCase.patient_ref || cellCase.id}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(cellCase.created_at)}</p>
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
            <CardTitle>Review Coverage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-4xl font-semibold text-foreground">
                  {reviewProgress}%
                </p>
                <p className="text-sm text-muted-foreground">validated or rejected</p>
              </div>
              <Activity className="text-primary" />
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${reviewProgress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-2 text-amber-200">
                {stats.pending} pending
              </span>
              <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2 py-2 text-emerald-200">
                {stats.validated} valid
              </span>
              <span className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-2 text-red-200">
                {stats.rejected} rejected
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}
