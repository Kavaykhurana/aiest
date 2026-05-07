import { DashboardShell } from "@/components/DashboardShell"
import { getReviewerName } from "@/lib/reviewer"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell fullName={getReviewerName()}>{children}</DashboardShell>
}
