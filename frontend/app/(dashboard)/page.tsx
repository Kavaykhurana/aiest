"use client"

import { useEffect, useState } from "react"

import { StatsGrid, type DashboardStats } from "@/components/StatsGrid"
import { getCases } from "@/lib/cases"
import type { Case } from "@/lib/types"

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

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Review activity and diagnostic outcomes.</p>
      </header>
      <StatsGrid stats={stats} />
    </div>
  )
}
