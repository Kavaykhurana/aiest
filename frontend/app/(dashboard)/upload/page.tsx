"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "sonner"

import { runPrediction } from "@/lib/api"
import { getReviewerId } from "@/lib/reviewer"
import { createClient } from "@/lib/supabase/client"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadZone } from "@/components/UploadZone"

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [patientRef, setPatientRef] = useState("")
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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
      if (!hasSupabaseEnv()) {
        toast.error("Supabase is not configured.")
        return
      }

      const supabase = createClient()
      const predictionResult = await runPrediction(file)
      const timestamp = Date.now()
      const originalPath = `originals/${timestamp}_${sanitizeFilename(file.name)}`

      const { error: originalUploadError } = await supabase.storage
        .from("cell-images")
        .upload(originalPath, file, {
          contentType: file.type,
          upsert: false,
        })

      if (originalUploadError) {
        toast.error("Failed to save image.")
        return
      }

      const {
        data: { publicUrl: imageUrl },
      } = supabase.storage.from("cell-images").getPublicUrl(originalPath)

      let gradcamUrl: string | null = null
      const gradcamBlob = decodeGradcam(predictionResult.gradcam_base64)

      if (gradcamBlob) {
        const gradcamPath = `gradcam/${timestamp}_gradcam.png`
        const { error: gradcamUploadError } = await supabase.storage
          .from("cell-images")
          .upload(gradcamPath, gradcamBlob, {
            contentType: "image/png",
            upsert: false,
          })

        if (gradcamUploadError) {
          toast.error("Failed to save image.")
          return
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("cell-images").getPublicUrl(gradcamPath)
        gradcamUrl = publicUrl
      }

      const { data: newCase, error: insertError } = await supabase
        .from("cases")
        .insert({
          reviewer_id: getReviewerId(),
          patient_ref: patientRef.trim() || null,
          image_url: imageUrl,
          gradcam_url: gradcamUrl,
          prediction: predictionResult.prediction,
          confidence: predictionResult.confidence,
        })
        .select("id")
        .single()

      if (insertError || !newCase) {
        console.error(insertError)
        toast.error("Failed to save case. Please try again.")
        return
      }

      router.push(`/cases/${newCase.id}`)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail
        if (detail) {
          toast.error(String(detail))
          return
        }
        toast.error("Diagnostic service unavailable. Please try again.")
        return
      }

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

      <Card>
        <CardHeader>
          <CardTitle>New Diagnostic Case</CardTitle>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="patient-ref">Patient Reference / ID (optional)</Label>
            <Input
              id="patient-ref"
              value={patientRef}
              onChange={(event) => setPatientRef(event.target.value)}
              placeholder="MRN-2026-001"
            />
          </div>

          <Button type="button" size="lg" disabled={!file || isAnalyzing} onClick={handleSubmit}>
            {isAnalyzing ? "Analyzing..." : "Run Diagnosis"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function decodeGradcam(gradcamBase64: string) {
  if (!gradcamBase64) {
    return null
  }

  try {
    const bytes = atob(gradcamBase64)
    const arr = new Uint8Array(bytes.length).map((_, i) => bytes.charCodeAt(i))
    return new Blob([arr], { type: "image/png" })
  } catch (error) {
    console.warn("Malformed Grad-CAM response. Creating case without heatmap.", error)
    return null
  }
}
