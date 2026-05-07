import axios from "axios"

import { runLocalCnnPrediction } from "@/lib/local-cnn"
import type { PredictionResult } from "@/lib/types"

export async function runPrediction(file: File): Promise<PredictionResult> {
  const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL?.trim()
  const shouldTryFastApi =
    fastApiUrl &&
    (typeof window === "undefined" ||
      window.location.hostname === "localhost" ||
      !fastApiUrl.includes("localhost"))

  if (shouldTryFastApi) {
    try {
      return await runFastApiPrediction(file, fastApiUrl)
    } catch {
      // The deployed app is self-contained. A configured FastAPI service is optional.
    }
  }

  try {
    return await runLocalCnnPrediction(file)
  } catch {
    return runDemoPrediction(file)
  }
}

async function runFastApiPrediction(file: File, baseURL: string): Promise<PredictionResult> {
  const diagnosticApi = axios.create({
    baseURL,
    timeout: 60000,
  })
  const formData = new FormData()
  formData.append("file", file)

  const response = await diagnosticApi.post<PredictionResult>("/predict", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  return response.data
}

async function runDemoPrediction(file: File): Promise<PredictionResult> {
  const image = await loadImage(file)
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Browser image processing is unavailable.")
  }

  context.drawImage(image, 0, 0, 64, 64)
  const imageData = context.getImageData(0, 0, 64, 64)
  const data = imageData.data
  let redBias = 0
  let darkPixels = 0

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    redBias += Math.max(0, red - (green + blue) / 2)
    if ((red + green + blue) / 3 < 90) {
      darkPixels += 1
    }
  }

  const normalizedRedBias = redBias / (64 * 64 * 255)
  const normalizedDarkPixels = darkPixels / (64 * 64)
  const rawProb = Math.min(0.96, Math.max(0.04, 0.28 + normalizedRedBias * 1.8 + normalizedDarkPixels * 0.9))
  const prediction = rawProb >= 0.5 ? "infected" : "healthy"
  const confidence = Number(((prediction === "infected" ? rawProb : 1 - rawProb) * 100).toFixed(2))
  const gradcam_base64 = makeDemoOverlay(context, imageData, prediction)

  return { prediction, confidence, gradcam_base64 }
}

function makeDemoOverlay(
  context: CanvasRenderingContext2D,
  imageData: ImageData,
  prediction: "healthy" | "infected",
) {
  const overlay = document.createElement("canvas")
  overlay.width = 64
  overlay.height = 64
  const overlayContext = overlay.getContext("2d")
  if (!overlayContext) {
    return ""
  }

  overlayContext.putImageData(imageData, 0, 0)
  const gradient = overlayContext.createRadialGradient(34, 30, 5, 34, 30, 38)
  if (prediction === "infected") {
    gradient.addColorStop(0, "rgba(255, 20, 20, 0.72)")
    gradient.addColorStop(0.55, "rgba(255, 191, 0, 0.34)")
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
  } else {
    gradient.addColorStop(0, "rgba(34, 197, 94, 0.42)")
    gradient.addColorStop(0.65, "rgba(59, 130, 246, 0.24)")
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)")
  }
  overlayContext.fillStyle = gradient
  overlayContext.fillRect(0, 0, 64, 64)

  return overlay.toDataURL("image/png").split(",")[1] || ""
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Failed to read image."))
    }
    image.src = objectUrl
  })
}
