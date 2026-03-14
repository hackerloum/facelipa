import * as faceapi from 'face-api.js'

let modelsLoaded = false

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
  modelsLoaded = true
}

/**
 * Extract 128-d face embedding from an image element.
 * Returns null if no face detected.
 */
export async function getFaceEmbedding(img: HTMLImageElement): Promise<number[] | null> {
  await loadFaceModels()
  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor()

  if (!detection) return null
  return Array.from(detection.descriptor)
}

/**
 * Extract embedding from a File (e.g. from file input).
 */
export async function getFaceEmbeddingFromFile(file: File): Promise<number[] | null> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        const emb = await getFaceEmbedding(img)
        resolve(emb)
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}
