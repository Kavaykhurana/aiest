import Link from "next/link"

import type { Case, ReviewStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { PredictionBadge } from "@/components/PredictionBadge"

interface CaseCardProps {
  case: Case
}

const statusStyles: Record<ReviewStatus, string> = {
  pending: "border-amber-300/40 bg-amber-500/15 text-amber-200",
  validated: "border-emerald-300/40 bg-emerald-500/15 text-emerald-200",
  rejected: "border-red-300/40 bg-red-500/15 text-red-200",
}

export function CaseCard({ case: cellCase }: CaseCardProps) {
  return (
    <Link href={`/cases/${cellCase.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-primary/70">
        <div className="aspect-square overflow-hidden bg-secondary">
          <img
            src={cellCase.image_url}
            alt={`Red blood cell case ${cellCase.id}`}
            className="size-full object-cover transition-all duration-200 group-hover:scale-105"
          />
        </div>
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <PredictionBadge
              prediction={cellCase.prediction}
              confidence={Number(cellCase.confidence)}
            />
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-normal",
                statusStyles[cellCase.review_status],
              )}
            >
              {cellCase.review_status.toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs text-muted-foreground">
              {formatCaseDate(cellCase.created_at)}
            </p>
            {cellCase.patient_ref ? (
              <p className="truncate text-sm text-muted-foreground">
                Patient Ref: {cellCase.patient_ref}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function formatCaseDate(value: string) {
  const date = new Date(value)
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)

  return `${datePart} · ${timePart}`
}
