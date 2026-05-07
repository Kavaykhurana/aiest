"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderOpen, LayoutDashboard, Microscope, UploadCloud } from "lucide-react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface DashboardShellProps {
  children: React.ReactNode
  fullName: string
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: UploadCloud },
  { href: "/cases", label: "My Cases", icon: FolderOpen },
]

export function DashboardShell({ children, fullName }: DashboardShellProps) {
  const pathname = usePathname()

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

        <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
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

        <div className="flex flex-col gap-4 p-4">
          <Separator />
          <div className="flex flex-col gap-1">
            <p className="truncate text-sm font-medium text-foreground">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">Review workstation</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Microscope />
              </div>
              <span className="font-mono font-semibold tracking-normal">CellScan</span>
            </Link>
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
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
