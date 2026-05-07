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
      accentClassName: "border-l-blue-500",
    },
    {
      label: "Infected",
      value: stats.infected,
      subLabel: `${percentage(stats.infected, stats.total)}% of total`,
      icon: ShieldAlert,
      accentClassName: "border-l-red-500",
    },
    {
      label: "Healthy",
      value: stats.healthy,
      subLabel: `${percentage(stats.healthy, stats.total)}% of total`,
      icon: HeartPulse,
      accentClassName: "border-l-green-500",
    },
    {
      label: "Pending Review",
      value: stats.pending,
      subLabel: "Awaiting validation",
      icon: Clock3,
      accentClassName: "border-l-amber-500",
    },
    {
      label: "Validated",
      value: stats.validated,
      subLabel: "Accepted predictions",
      icon: CheckCircle2,
      accentClassName: "border-l-emerald-500",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      subLabel: "Overruled predictions",
      icon: XCircle,
      accentClassName: "border-l-red-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <Card
            key={card.label}
            className={cn("overflow-hidden border-l-4", card.accentClassName)}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-4 p-5 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className="text-muted-foreground">
                <Icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 p-5 pt-0">
              <p className="font-mono text-3xl font-semibold tracking-normal text-foreground">
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
