import {
  CheckCircle2,
  Clock3,
  Files,
  HeartPulse,
  ShieldAlert,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface DashboardStats {
  total: number
  infected: number
  healthy: number
  pending: number
  validated: number
  rejected: number
}

interface StatsGridProps {
  stats: DashboardStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  const cards = [
    {
      label: "Total Cases",
      value: stats.total,
      subLabel: "Submitted diagnostics",
      icon: Files,
      className: "border-blue-400/30 bg-blue-500/10",
    },
    {
      label: "Infected",
      value: stats.infected,
      subLabel: `${percentage(stats.infected, stats.total)}% of total`,
      icon: ShieldAlert,
      className: "border-red-400/30 bg-red-500/10",
    },
    {
      label: "Healthy",
      value: stats.healthy,
      subLabel: `${percentage(stats.healthy, stats.total)}% of total`,
      icon: HeartPulse,
      className: "border-green-400/30 bg-green-500/10",
    },
    {
      label: "Pending Review",
      value: stats.pending,
      subLabel: "Awaiting validation",
      icon: Clock3,
      className: "border-amber-400/30 bg-amber-500/10",
    },
    {
      label: "Validated",
      value: stats.validated,
      subLabel: "Accepted predictions",
      icon: CheckCircle2,
      className: "border-emerald-400/30 bg-emerald-500/10",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      subLabel: "Overruled predictions",
      icon: XCircle,
      className: "border-red-400/30 bg-red-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card key={card.label} className={cn("overflow-hidden", card.className)}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 p-5 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background/50 text-foreground">
                <Icon />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 p-5 pt-0">
              <p className="font-mono text-4xl font-semibold tracking-normal text-foreground">
                {card.value}
              </p>
              <p className="text-sm text-muted-foreground">{card.subLabel}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function percentage(value: number, total: number) {
  if (total === 0) {
    return 0
  }

  return Math.round((value / total) * 100)
}
