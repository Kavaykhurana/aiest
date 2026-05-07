"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FolderOpen,
  LayoutDashboard,
  Microscope,
  ShieldAlert,
  UploadCloud,
} from "lucide-react"

import { CURRENT_DIAGNOSTIC_VERSION, formatCaseCode, getCases } from "@/lib/cases"
import type { Case } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/ThemeToggle"

interface DashboardShellProps {
  children: ReactNode
  fullName: string
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: UploadCloud },
  { href: "/cases", label: "My Cases", icon: FolderOpen },
]

export function DashboardShell({ children, fullName }: DashboardShellProps) {
  const pathname = usePathname()
  const [cases, setCases] = useState<Case[]>([])

  useEffect(() => {
    const syncCases = () => setCases(getCases())
    syncCases()
    window.addEventListener("storage", syncCases)
    window.addEventListener("cellscan:cases-changed", syncCases)

    return () => {
      window.removeEventListener("storage", syncCases)
      window.removeEventListener("cellscan:cases-changed", syncCases)
    }
  }, [])

  const sidebarStats = useMemo(() => {
    const pending = cases.filter((cellCase) => cellCase.review_status === "pending").length
    const infected = cases.filter((cellCase) => cellCase.prediction === "infected").length
    const validated = cases.filter((cellCase) => cellCase.review_status === "validated").length
    const rejected = cases.filter((cellCase) => cellCase.review_status === "rejected").length

    return {
      total: cases.length,
      pending,
      infected,
      completed: validated + rejected,
      latest: cases[0] || null,
    }
  }, [cases])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-20 items-center gap-3 px-6">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Microscope />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-lg font-semibold tracking-normal">CellScan</span>
            <span className="text-xs text-muted-foreground">Diagnostic Review</span>
          </div>
        </div>

        <nav className="flex flex-col gap-2 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg border-l-[3px] border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground",
                  active && "border-primary bg-accent text-foreground",
                )}
              >
                <Icon />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-clinical">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    Worklist
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">
                    {sidebarStats.total}
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/10 text-blue-700 dark:text-blue-200">
                  <Activity className="size-5" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricTile label="Pending" value={sidebarStats.pending} tone="amber" />
                <MetricTile label="Infected" value={sidebarStats.infected} tone="red" />
              </div>
            </div>

            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 shadow-clinical">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                  <BrainCircuit className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    Engine
                  </p>
                  <p className="truncate text-sm font-medium text-foreground">
                    Calibrated CNN
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-xs">
                <StatusLine label="Model active" />
                <StatusLine label={CURRENT_DIAGNOSTIC_VERSION.replaceAll("-", " ")} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/80 p-4 shadow-clinical">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-mono text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  Latest Case
                </p>
                <Clock3 className="size-4 text-muted-foreground" />
              </div>
              {sidebarStats.latest ? (
                <Link
                  href={`/cases/${sidebarStats.latest.id}`}
                  className="block rounded-lg border border-border bg-secondary/50 p-3 transition-all duration-200 hover:border-primary hover:bg-accent"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-normal",
                        sidebarStats.latest.confidence < 70
                          ? "border-amber-300/40 bg-amber-500/15 text-amber-700 dark:text-amber-200"
                          : sidebarStats.latest.prediction === "infected"
                          ? "border-red-300/40 bg-red-500/15 text-red-700 dark:text-red-200"
                          : "border-emerald-300/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
                      )}
                    >
                      {sidebarStats.latest.confidence < 70
                        ? "needs review"
                        : sidebarStats.latest.prediction}
                    </span>
                    <span className="font-mono text-xs text-foreground">
                      {sidebarStats.latest.confidence.toFixed(1)}%
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {sidebarStats.latest.patient_ref || formatCaseCode(sidebarStats.latest.id)}
                  </p>
                </Link>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                  Awaiting first diagnostic case.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MiniStatus
                icon={CheckCircle2}
                label="Completed"
                value={sidebarStats.completed}
                className="border-emerald-400/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
              />
              <MiniStatus
                icon={ShieldAlert}
                label="Risk"
                value={sidebarStats.infected}
                className="border-red-400/20 bg-red-500/10 text-red-700 dark:text-red-200"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <Separator />
          <div className="flex flex-col gap-1">
            <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">Review workstation</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="fixed right-5 top-5 z-50 hidden md:block">
          <ThemeToggle />
        </div>
        <header className="sticky top-0 z-20 border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Microscope />
              </div>
              <span className="font-mono font-semibold tracking-normal">CellScan</span>
            </Link>
            <ThemeToggle />
          </div>
          <nav className="mt-3 grid grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border border-border px-2 py-2 text-xs text-muted-foreground transition-all duration-200",
                    active && "border-primary bg-accent text-foreground",
                  )}
                >
                  <Icon />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8 md:pr-20">{children}</main>
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: "amber" | "red"
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-400/20 bg-amber-500/10 text-amber-700 dark:text-amber-200"
      : "border-red-400/20 bg-red-500/10 text-red-700 dark:text-red-200"

  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <p className="font-mono text-xl font-semibold tracking-normal">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function StatusLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
      <span className="truncate">{label}</span>
    </div>
  )
}

function MiniStatus({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof CheckCircle2
  label: string
  value: number
  className: string
}) {
  return (
    <div className={cn("rounded-xl border p-3 shadow-clinical", className)}>
      <Icon className="mb-3 size-4" />
      <p className="font-mono text-xl font-semibold tracking-normal text-foreground">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
