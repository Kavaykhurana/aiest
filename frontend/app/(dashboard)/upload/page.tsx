"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BrainCircuit, FlaskConical, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { runPrediction } from "@/lib/api"
import { createCase } from "@/lib/cases"
import { getReviewerId } from "@/lib/reviewer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getConfidenceBand } from "@/components/PredictionBadge"
import { UploadZone } from "@/components/UploadZone"

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [patientRef, setPatientRef] = useState("")
  const [slideId, setSlideId] = useState("")
  const [imageSource, setImageSource] = useState("")
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  async function loadSample(sample: { path: string; filename: string }) {
    try {
      const response = await fetch(sample.path)
      if (!response.ok) {
        throw new Error("Sample image is unavailable.")
      }
      const blob = await response.blob()
      const sampleFile = new File([blob], sample.filename, { type: blob.type || "image/png" })
      setInlineError(null)
      setFile(sampleFile)
      toast.success("Sample RBC image loaded.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sample image.")
    }
  }

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  async function handleSubmit() {
    if (!file || isAnalyzing) {
      return
    }

    setIsAnalyzing(true)

    try {
      const predictionResult = await runPrediction(file)
      const imageUrl = await fileToDataUrl(file)
      const gradcamUrl = predictionResult.gradcam_base64
        ? `data:image/png;base64,${predictionResult.gradcam_base64}`
        : null
      const newCase = createCase({
        reviewerId: getReviewerId(),
        patientRef: patientRef.trim() || null,
        slideId: slideId.trim() || null,
        imageSource: imageSource.trim() || null,
        imageUrl,
        gradcamUrl,
        predictionResult,
      })
      toast.success(
        getConfidenceBand(predictionResult.confidence) === "needs_review"
          ? "Case saved for manual review."
          : "High-confidence case saved for review.",
      )
      router.push(`/cases/${newCase.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Diagnostic service unavailable. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-semibold tracking-normal text-foreground">
          Upload
        </h1>
        <p className="text-muted-foreground">Submit an RBC image for malaria prediction.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-blue-700 dark:text-blue-200">
              <BrainCircuit />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-foreground">Local CNN ready</p>
              <p className="text-sm text-muted-foreground">No Supabase or server required.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-emerald-700 dark:text-emerald-200">
              <ShieldCheck />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-foreground">Case review active</p>
              <p className="text-sm text-muted-foreground">Validate or reject after diagnosis.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-amber-700 dark:text-amber-200">
              <FlaskConical />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-sm font-semibold text-foreground">Sample cells included</p>
              <p className="text-sm text-muted-foreground">Load one below and run diagnosis.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>New Diagnostic Case</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  loadSample({
                    path: "/samples/infected-cell.png",
                    filename: "sample-infected-rbc.png",
                  })
                }
              >
                Use infected sample
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  loadSample({
                    path: "/samples/healthy-cell.png",
                    filename: "sample-healthy-rbc.png",
                  })
                }
              >
                Use healthy sample
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <UploadZone
            file={file}
            previewUrl={previewUrl}
            error={inlineError}
            isAnalyzing={isAnalyzing}
            onError={setInlineError}
            onFileAccepted={setFile}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="patient-ref">Patient Reference / ID</Label>
              <Input
                id="patient-ref"
                value={patientRef}
                onChange={(event) => setPatientRef(event.target.value)}
                placeholder="MRN-2026-001"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slide-id">Slide ID</Label>
              <Input
                id="slide-id"
                value={slideId}
                onChange={(event) => setSlideId(event.target.value)}
                placeholder="SLIDE-A14"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="image-source">Image source</Label>
              <Input
                id="image-source"
                value={imageSource}
                onChange={(event) => setImageSource(event.target.value)}
                placeholder="Lab microscope"
              />
            </div>
          </div>

          <Button type="button" size="lg" disabled={!file || isAnalyzing} onClick={handleSubmit}>
            {isAnalyzing ? "Analyzing..." : "Run Diagnosis"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to read image."))
    reader.readAsDataURL(file)
  })
}
