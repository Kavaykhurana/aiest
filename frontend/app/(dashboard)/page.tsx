import { StatsGrid, type DashboardStats } from "@/components/StatsGrid"
import { Card, CardContent } from "@/components/ui/card"
import { getReviewerId } from "@/lib/reviewer"
import type { Case } from "@/lib/types"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  let cases: Case[] = []
  let setupMessage: string | null = null

  if (hasSupabaseEnv()) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("reviewer_id", getReviewerId())
      .order("created_at", { ascending: false })

    if (error) {
      setupMessage = error.message
    } else {
      cases = normalizeCases(data)
    }
  } else {
    setupMessage = "Supabase environment variables are not configured."
  }

  const stats: DashboardStats = {
    total: cases.length,
    infected: cases.filter((cellCase) => cellCase.prediction === "infected").length,
    healthy: cases.filter((cellCase) => cellCase.prediction === "healthy").length,
    pending: cases.filter((cellCase) => cellCase.review_status === "pending").length,
    validated: cases.filter((cellCase) => cellCase.review_status === "validated").length,
    rejected: cases.filter((cellCase) => cellCase.review_status === "rejected").length,
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Review activity and diagnostic outcomes.</p>
      </header>
      {setupMessage ? (
        <Card>
          <CardContent className="p-4 text-sm text-amber-200">{setupMessage}</CardContent>
        </Card>
      ) : null}
      <StatsGrid stats={stats} />
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
