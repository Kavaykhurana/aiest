"use client"

import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from "react"
import { ImagePlus, UploadCloud } from "lucide-react"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"])
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png"]

interface UploadZoneProps {
  file: File | null
  previewUrl: string | null
  error: string | null
  isAnalyzing: boolean
  onError: (message: string | null) => void
  onFileAccepted: (file: File) => void
}

export function UploadZone({
  file,
  previewUrl,
  error,
  isAnalyzing,
  onError,
  onFileAccepted,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function validateAndAccept(candidate: File | undefined) {
    if (!candidate) {
      return
    }

    const hasValidType = ACCEPTED_TYPES.has(candidate.type)
    const hasValidExtension = ACCEPTED_EXTENSIONS.some((extension) =>
      candidate.name.toLowerCase().endsWith(extension),
    )

    if (!hasValidType || !hasValidExtension) {
      onError("Only JPEG and PNG images are accepted.")
      return
    }

    if (candidate.size > MAX_FILE_SIZE) {
      onError("File too large. Maximum size is 10MB.")
      return
    }

    onError(null)
    onFileAccepted(candidate)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    validateAndAccept(event.target.files?.[0])
    event.target.value = ""
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    validateAndAccept(event.dataTransfer.files?.[0])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[340px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card p-6 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragging && "border-primary bg-primary/10",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleInputChange}
        />

        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file?.name || "Selected red blood cell"}
            className="absolute inset-0 size-full object-contain p-4"
          />
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-secondary text-primary">
              <UploadCloud />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-foreground">Drop an RBC image here</p>
              <p className="text-sm text-muted-foreground">JPEG or PNG, up to 10MB</p>
            </div>
          </div>
        )}

        {isAnalyzing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
            <Skeleton className="absolute inset-4 rounded-xl" />
            <div className="relative flex flex-col items-center gap-3">
              <div className="flex size-14 animate-spin items-center justify-center rounded-full border-2 border-primary border-t-transparent" />
              <p className="font-mono text-sm text-foreground">Analyzing cellular structure...</p>
            </div>
          </div>
        ) : null}
      </div>

      {file ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImagePlus />
          <span className="truncate">{file.name}</span>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
    </div>
  )
}
