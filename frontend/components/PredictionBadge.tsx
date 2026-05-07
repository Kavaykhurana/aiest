import type { Prediction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface PredictionBadgeProps {
  prediction: Prediction
  confidence: number
  size?: "default" | "large"
}

export function PredictionBadge({
  prediction,
  confidence,
  size = "default",
}: PredictionBadgeProps) {
  const isInfected = prediction === "infected"

  return (
    <Badge
      className={cn(
        "gap-2 border font-mono tracking-normal",
        isInfected
          ? "border-red-200 bg-red-100 text-red-700"
          : "border-green-200 bg-green-100 text-green-700",
        size === "large" ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs",
      )}
      variant="outline"
    >
      <span>{prediction.toUpperCase()}</span>
      <span>{formatConfidence(confidence)}%</span>
    </Badge>
  )
}

function formatConfidence(confidence: number) {
  return confidence.toFixed(1).replace(".0", "")
}
