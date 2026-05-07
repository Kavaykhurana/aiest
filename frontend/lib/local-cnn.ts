import type { PredictionResult } from "@/lib/types"

type ConvLayerPayload = {
  name: string
  outChannels: number
  inChannels: number
  kernelSize: number
  weight: number[]
  bias: number[]
}

type LinearPayload = {
  outFeatures: number
  inFeatures: number
  weight: number[]
  bias: number[]
}

type ModelPayload = {
  format: string
  imgSize: [number, number]
  layers: ConvLayerPayload[]
  classifier: {
    fc1: LinearPayload
    fc2: LinearPayload
  }
}

type ConvLayer = Omit<ConvLayerPayload, "weight" | "bias"> & {
  weight: Float32Array
  bias: Float32Array
}

type LinearLayer = Omit<LinearPayload, "weight" | "bias"> & {
  weight: Float32Array
  bias: Float32Array
}

type RuntimeModel = {
  imgSize: [number, number]
  layers: ConvLayer[]
  classifier: {
    fc1: LinearLayer
    fc2: LinearLayer
  }
}

type ForwardResult = {
  logit: number
  lastActivation: Float32Array
  hiddenPreActivation: Float32Array
  lastHeight: number
  lastWidth: number
}

let modelPromise: Promise<RuntimeModel> | null = null

export async function runLocalCnnPrediction(file: File): Promise<PredictionResult> {
  const model = await loadModel()
  const image = await loadImage(file)
  const canvas = document.createElement("canvas")
  canvas.width = model.imgSize[0]
  canvas.height = model.imgSize[1]

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Browser image processing is unavailable.")
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const input = imageDataToTensor(imageData)
  const result = forward(model, input, canvas.width, canvas.height)
  const prob = sigmoid(result.logit)
  const prediction = prob >= 0.5 ? "infected" : "healthy"
  const confidence = Number(((prediction === "infected" ? prob : 1 - prob) * 100).toFixed(2))
  const gradcam_base64 = makeGradcamOverlay(model, result, imageData)

  return { prediction, confidence, gradcam_base64 }
}

async function loadModel(): Promise<RuntimeModel> {
  if (!modelPromise) {
    modelPromise = fetch("/models/malaria_cnn_fused.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Local diagnostic model could not be loaded.")
        }
        return response.json() as Promise<ModelPayload>
      })
      .then((payload) => {
        if (payload.format !== "cellscan-fused-cnn-v1") {
          throw new Error("Local diagnostic model has an unsupported format.")
        }

        return {
          imgSize: payload.imgSize,
          layers: payload.layers.map((layer) => ({
            ...layer,
            weight: new Float32Array(layer.weight),
            bias: new Float32Array(layer.bias),
          })),
          classifier: {
            fc1: {
              ...payload.classifier.fc1,
              weight: new Float32Array(payload.classifier.fc1.weight),
              bias: new Float32Array(payload.classifier.fc1.bias),
            },
            fc2: {
              ...payload.classifier.fc2,
              weight: new Float32Array(payload.classifier.fc2.weight),
              bias: new Float32Array(payload.classifier.fc2.bias),
            },
          },
        }
      })
  }

  return modelPromise
}

function forward(model: RuntimeModel, input: Float32Array, startWidth: number, startHeight: number): ForwardResult {
  let feature = input
  let width = startWidth
  let height = startHeight

  model.layers.forEach((layer, index) => {
    feature = conv2dSame(feature, width, height, layer)
    reluInPlace(feature)

    if (index === 1 || index === 3 || index === 5) {
      feature = maxPool2d(feature, layer.outChannels, width, height)
      width = Math.floor(width / 2)
      height = Math.floor(height / 2)
    }
  })

  const lastActivation = feature
  const pooled = globalAveragePool(feature, 96, width, height)
  const hiddenPreActivation = linear(pooled, model.classifier.fc1)
  const hidden = new Float32Array(hiddenPreActivation)
  reluInPlace(hidden)
  const output = linear(hidden, model.classifier.fc2)

  return {
    logit: output[0],
    lastActivation,
    hiddenPreActivation,
    lastHeight: height,
    lastWidth: width,
  }
}

function conv2dSame(input: Float32Array, width: number, height: number, layer: ConvLayer) {
  const output = new Float32Array(layer.outChannels * width * height)
  const radius = Math.floor(layer.kernelSize / 2)

  for (let outChannel = 0; outChannel < layer.outChannels; outChannel += 1) {
    const outputChannelOffset = outChannel * width * height
    const weightOutOffset = outChannel * layer.inChannels * layer.kernelSize * layer.kernelSize

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = layer.bias[outChannel]

        for (let inChannel = 0; inChannel < layer.inChannels; inChannel += 1) {
          const inputChannelOffset = inChannel * width * height
          const weightChannelOffset = weightOutOffset + inChannel * layer.kernelSize * layer.kernelSize

          for (let kernelY = 0; kernelY < layer.kernelSize; kernelY += 1) {
            const inputY = y + kernelY - radius
            if (inputY < 0 || inputY >= height) {
              continue
            }

            for (let kernelX = 0; kernelX < layer.kernelSize; kernelX += 1) {
              const inputX = x + kernelX - radius
              if (inputX < 0 || inputX >= width) {
                continue
              }

              const inputValue = input[inputChannelOffset + inputY * width + inputX]
              const weightValue = layer.weight[weightChannelOffset + kernelY * layer.kernelSize + kernelX]
              sum += inputValue * weightValue
            }
          }
        }

        output[outputChannelOffset + y * width + x] = sum
      }
    }
  }

  return output
}

function maxPool2d(input: Float32Array, channels: number, width: number, height: number) {
  const nextWidth = Math.floor(width / 2)
  const nextHeight = Math.floor(height / 2)
  const output = new Float32Array(channels * nextWidth * nextHeight)

  for (let channel = 0; channel < channels; channel += 1) {
    const inputOffset = channel * width * height
    const outputOffset = channel * nextWidth * nextHeight

    for (let y = 0; y < nextHeight; y += 1) {
      for (let x = 0; x < nextWidth; x += 1) {
        const sourceY = y * 2
        const sourceX = x * 2
        let maxValue = -Infinity

        for (let poolY = 0; poolY < 2; poolY += 1) {
          for (let poolX = 0; poolX < 2; poolX += 1) {
            const value = input[inputOffset + (sourceY + poolY) * width + sourceX + poolX]
            if (value > maxValue) {
              maxValue = value
            }
          }
        }

        output[outputOffset + y * nextWidth + x] = maxValue
      }
    }
  }

  return output
}

function globalAveragePool(input: Float32Array, channels: number, width: number, height: number) {
  const output = new Float32Array(channels)
  const area = width * height

  for (let channel = 0; channel < channels; channel += 1) {
    let sum = 0
    const offset = channel * area
    for (let index = 0; index < area; index += 1) {
      sum += input[offset + index]
    }
    output[channel] = sum / area
  }

  return output
}

function linear(input: Float32Array, layer: LinearLayer) {
  const output = new Float32Array(layer.outFeatures)

  for (let outFeature = 0; outFeature < layer.outFeatures; outFeature += 1) {
    let sum = layer.bias[outFeature]
    const weightOffset = outFeature * layer.inFeatures
    for (let inFeature = 0; inFeature < layer.inFeatures; inFeature += 1) {
      sum += input[inFeature] * layer.weight[weightOffset + inFeature]
    }
    output[outFeature] = sum
  }

  return output
}

function makeGradcamOverlay(model: RuntimeModel, result: ForwardResult, imageData: ImageData) {
  const heatmap = makeGradcamHeatmap(model, result)
  const overlay = document.createElement("canvas")
  overlay.width = imageData.width
  overlay.height = imageData.height
  const context = overlay.getContext("2d")
  if (!context) {
    return ""
  }

  const blended = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)
  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const heat = sampleHeatmap(heatmap, result.lastWidth, result.lastHeight, x, y, imageData.width, imageData.height)
      const [red, green, blue] = jetColor(heat)
      const index = (y * imageData.width + x) * 4
      blended.data[index] = Math.round(blended.data[index] * 0.6 + red * 0.4)
      blended.data[index + 1] = Math.round(blended.data[index + 1] * 0.6 + green * 0.4)
      blended.data[index + 2] = Math.round(blended.data[index + 2] * 0.6 + blue * 0.4)
      blended.data[index + 3] = 255
    }
  }

  context.putImageData(blended, 0, 0)
  return overlay.toDataURL("image/png").split(",")[1] || ""
}

function makeGradcamHeatmap(model: RuntimeModel, result: ForwardResult) {
  const channels = 96
  const area = result.lastWidth * result.lastHeight
  const classWeights = new Float32Array(channels)
  const fc1 = model.classifier.fc1
  const fc2 = model.classifier.fc2

  for (let hiddenIndex = 0; hiddenIndex < fc1.outFeatures; hiddenIndex += 1) {
    if (result.hiddenPreActivation[hiddenIndex] <= 0) {
      continue
    }

    const outputWeight = fc2.weight[hiddenIndex]
    const fc1Offset = hiddenIndex * fc1.inFeatures
    for (let channel = 0; channel < channels; channel += 1) {
      classWeights[channel] += outputWeight * fc1.weight[fc1Offset + channel]
    }
  }

  const heatmap = new Float32Array(area)
  let maxValue = 0

  for (let y = 0; y < result.lastHeight; y += 1) {
    for (let x = 0; x < result.lastWidth; x += 1) {
      let value = 0
      const spatialIndex = y * result.lastWidth + x

      for (let channel = 0; channel < channels; channel += 1) {
        value += classWeights[channel] * result.lastActivation[channel * area + spatialIndex]
      }

      value = Math.max(0, value)
      heatmap[spatialIndex] = value
      if (value > maxValue) {
        maxValue = value
      }
    }
  }

  if (maxValue > 1e-8) {
    for (let index = 0; index < heatmap.length; index += 1) {
      heatmap[index] /= maxValue
    }
  }

  return heatmap
}

function imageDataToTensor(imageData: ImageData) {
  const { width, height, data } = imageData
  const output = new Float32Array(3 * width * height)
  const area = width * height

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = (y * width + x) * 4
      const tensorIndex = y * width + x
      output[tensorIndex] = data[pixelIndex] / 255
      output[area + tensorIndex] = data[pixelIndex + 1] / 255
      output[area * 2 + tensorIndex] = data[pixelIndex + 2] / 255
    }
  }

  return output
}

function sampleHeatmap(
  heatmap: Float32Array,
  heatmapWidth: number,
  heatmapHeight: number,
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number,
) {
  const gridX = (x / Math.max(1, imageWidth - 1)) * (heatmapWidth - 1)
  const gridY = (y / Math.max(1, imageHeight - 1)) * (heatmapHeight - 1)
  const x0 = Math.floor(gridX)
  const y0 = Math.floor(gridY)
  const x1 = Math.min(heatmapWidth - 1, x0 + 1)
  const y1 = Math.min(heatmapHeight - 1, y0 + 1)
  const tx = gridX - x0
  const ty = gridY - y0

  const top = lerp(heatmap[y0 * heatmapWidth + x0], heatmap[y0 * heatmapWidth + x1], tx)
  const bottom = lerp(heatmap[y1 * heatmapWidth + x0], heatmap[y1 * heatmapWidth + x1], tx)
  return lerp(top, bottom, ty)
}

function jetColor(value: number): [number, number, number] {
  const v = Math.max(0, Math.min(1, value))
  const red = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 3)))
  const green = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 2)))
  const blue = Math.max(0, Math.min(1, 1.5 - Math.abs(4 * v - 1)))
  return [red * 255, green * 255, blue * 255]
}

function reluInPlace(values: Float32Array) {
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] < 0) {
      values[index] = 0
    }
  }
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
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
