/**
 * Download face-api.js models to public/models/
 * Run: npm run download-models
 */
const https = require('https')
const fs = require('fs')
const path = require('path')

const MODELS_DIR = path.join(__dirname, '..', 'public', 'models')
const BASE = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master'

const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
]

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

;(async () => {
  for (const f of files) {
    process.stdout.write(`Downloading ${f}... `)
    try {
      const buf = await download(`${BASE}/${f}`)
      fs.writeFileSync(path.join(MODELS_DIR, f), buf)
      console.log('ok')
    } catch (e) {
      console.log('failed:', e.message)
    }
  }
  console.log(`Done. Models in ${MODELS_DIR}`)
})()
