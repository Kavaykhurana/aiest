import axios from "axios"

import type { PredictionResult } from "@/lib/types"

export const diagnosticApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000",
  timeout: 60000,
})

export async function runPrediction(file: File): Promise<PredictionResult> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await diagnosticApi.post<PredictionResult>("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}
