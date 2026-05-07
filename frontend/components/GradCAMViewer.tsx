"use client"

import { useEffect, useState } from "react"

import type { Prediction } from "@/lib/types"
import { cn } from "@/lib/utils"

interface GradCAMViewerProps {
  imageUrl: string
  gradcamUrl: string | null
  prediction: Prediction
}

export function GradCAMViewer({ imageUrl, gradcamUrl, prediction }: GradCAMViewerProps) {
  const [mode, setMode] = useState<"original" | "gradcam" | "compare">("original")
  const [opacity, setOpacity] = useState(70)

  useEffect(() => {
    if (!gradcamUrl && mode !== "original") {
      setMode("original")
    }
  }, [gradcamUrl, mode])

  return (
    <section
      className={cn(
        "clinical-card overflow-hidden p-4 transition-all duration-200",
        prediction === "infected"
          ? "shadow-[0_0_32px_rgba(239,68,68,0.25)]"
          : "shadow-[0_0_32px_rgba(34,197,94,0.25)]",
      )}
    >
      <div className="flex flex-col gap-3 pb-4">
        <div className="inline-flex w-fit rounded-full border border-border bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode("original")}
            className={cn(
              "rounded-full px-4 py-2 font-mono text-xs font-medium transition-all duration-200",
              mode === "original"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Original
          </button>
          <button
            type="button"
            onClick={() => gradcamUrl && setMode("gradcam")}
            disabled={!gradcamUrl}
            className={cn(
              "rounded-full px-4 py-2 font-mono text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
              mode === "gradcam"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Overlay
          </button>
          <button
            type="button"
            onClick={() => gradcamUrl && setMode("compare")}
            disabled={!gradcamUrl}
            className={cn(
              "rounded-full px-4 py-2 font-mono text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
              mode === "compare"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Side by side
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Grad-CAM highlights the cell regions that most influenced the model&apos;s decision.
          </p>
          {!gradcamUrl ? (
            <p className="font-mono text-xs text-amber-700 dark:text-amber-200">
              Heatmap unavailable
            </p>
          ) : null}
        </div>
      </div>

      {mode === "gradcam" && gradcamUrl ? (
        <label className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
          Overlay opacity
          <input
            type="range"
            min={20}
            max={100}
            value={opacity}
            onChange={(event) => setOpacity(Number(event.target.value))}
            className="w-40 accent-primary"
          />
          <span className="font-mono text-foreground">{opacity}%</span>
        </label>
      ) : null}

      {mode === "compare" && gradcamUrl ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ImageFrame src={imageUrl} alt="Original red blood cell" label="Original" />
          <ImageFrame src={gradcamUrl} alt="Grad-CAM overlay" label="Grad-CAM" />
        </div>
      ) : (
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-background">
          <img
            src={imageUrl}
            alt="Original red blood cell"
            className={cn(
              "absolute inset-0 size-full object-contain transition-opacity duration-500",
              mode === "original" || mode === "gradcam" ? "opacity-100" : "opacity-0",
            )}
          />
          {gradcamUrl ? (
            <img
              src={gradcamUrl}
              alt="Grad-CAM overlay"
              className={cn(
                "absolute inset-0 size-full object-contain transition-opacity duration-500",
                mode === "gradcam" ? "opacity-100" : "opacity-0",
              )}
              style={{ opacity: mode === "gradcam" ? opacity / 100 : 0 }}
            />
          ) : null}
        </div>
      )}
    </section>
  )
}

function ImageFrame({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="border-b border-border bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
        {label}
      </div>
      <div className="aspect-square">
        <img
          src={src}
          alt={alt}
          className="size-full object-contain"
        />
      </div>
    </div>
  )
}
