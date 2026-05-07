import Link from "next/link"

import { formatCaseDate } from "@/components/CaseCard"
import { GradCAMViewer } from "@/components/GradCAMViewer"
import { PredictionBadge } from "@/components/PredictionBadge"
import { ReviewPanel } from "@/components/ReviewPanel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getReviewerId, getReviewerName } from "@/lib/reviewer"
import type { Case, ReviewStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const statusStyles: Record<ReviewStatus, string> = {
  pending: "border-amber-300/40 bg-amber-500/15 text-amber-200",
  validated: "border-emerald-300/40 bg-emerald-500/15 text-emerald-200",
  rejected: "border-red-300/40 bg-red-500/15 text-red-200",
}

interface CaseDetailPageProps {
  params: {
    id: string
  }
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  if (!hasSupabaseEnv()) {
    return <CaseNotFound />
  }

  const supabase = createClient()
  const { data: caseRow } = await supabase
    .from("cases")
    .select("*")
    .eq("id", params.id)
    .eq("reviewer_id", getReviewerId())
    .maybeSingle()

  if (!caseRow) {
    return <CaseNotFound />
  }

  const cellCase: Case = {
    ...(caseRow as Case),
    confidence: Number((caseRow as Case).confidence),
  }
  const isInfected = cellCase.prediction === "infected"

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Button asChild variant="link" className="w-fit px-0">
          <Link href="/cases">Back to cases</Link>
        </Button>
        <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
          Case Detail
        </h1>
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
                  indicatorClassName={isInfected ? "bg-red-500" : "bg-green-500"}
                />
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
            <ReviewPanel caseId={cellCase.id} />
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
        </div>
      </div>
    </div>
  )
}

function CaseNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-md p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-mono text-2xl font-semibold tracking-normal">Case not found</h1>
          <p className="text-sm text-muted-foreground">
            The case may have been removed or is not available for this reviewer.
          </p>
          <Button asChild>
            <Link href="/cases">Back to cases</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
