"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Microscope } from "lucide-react"
import { toast } from "sonner"

import { getReviewerId } from "@/lib/reviewer"
import type { Case, Prediction, ReviewStatus } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { cn } from "@/lib/utils"
import { CaseCard } from "@/components/CaseCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type StatusFilter = "all" | ReviewStatus
type PredictionFilter = "all" | Prediction
type SortMode = "newest" | "oldest" | "confidence"

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Validated", value: "validated" },
  { label: "Rejected", value: "rejected" },
]

const predictionFilters: Array<{ label: string; value: PredictionFilter }> = [
  { label: "All Predictions", value: "all" },
  { label: "Healthy", value: "healthy" },
  { label: "Infected", value: "infected" },
]

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [visibleCases, setVisibleCases] = useState<Case[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [predictionFilter, setPredictionFilter] = useState<PredictionFilter>("all")
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadCases() {
      if (!hasSupabaseEnv()) {
        setIsLoading(false)
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("reviewer_id", getReviewerId())
        .order("created_at", { ascending: false })

      if (!mounted) {
        return
      }

      if (error) {
        toast.error("Failed to load cases.")
        setIsLoading(false)
        return
      }

      setCases(normalizeCases(data))
      setIsLoading(false)
    }

    loadCases()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const nextCases = cases
      .filter((cellCase) =>
        statusFilter === "all" ? true : cellCase.review_status === statusFilter,
      )
      .filter((cellCase) =>
        predictionFilter === "all" ? true : cellCase.prediction === predictionFilter,
      )
      .sort((a, b) => {
        if (sortMode === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }
        if (sortMode === "confidence") {
          return Number(b.confidence) - Number(a.confidence)
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

    setVisibleCases(nextCases)
  }, [cases, predictionFilter, sortMode, statusFilter])

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
          My Cases
        </h1>
        <p className="text-muted-foreground">Filter, sort, and review submitted diagnostics.</p>
      </header>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground",
                statusFilter === filter.value && "border-primary bg-accent text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {predictionFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={predictionFilter === filter.value}
                onClick={() => setPredictionFilter(filter.value)}
                className={cn(
                  "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground",
                  predictionFilter === filter.value && "border-primary bg-accent text-foreground",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="w-full lg:w-56">
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort cases" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="confidence">Highest Confidence</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[0.82] rounded-xl" />
          ))}
        </div>
      ) : visibleCases.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleCases.map((cellCase) => (
            <CaseCard key={cellCase.id} case={cellCase} />
          ))}
        </div>
      ) : (
        <Card className="flex min-h-[360px] flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-3xl border border-border bg-secondary text-primary">
            <Microscope />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-foreground">No cases found</h2>
            <p className="text-sm text-muted-foreground">
              Adjust filters or submit a new diagnostic case.
            </p>
          </div>
          <Button asChild>
            <Link href="/upload">Upload Image</Link>
          </Button>
        </Card>
      )}
    </div>
  )
}

function normalizeCases(data: unknown): Case[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.map((row) => ({
    ...(row as Case),
    confidence: Number((row as Case).confidence),
  }))
}
