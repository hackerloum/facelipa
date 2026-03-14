#!/bin/bash
# Download face-api.js models to public/models/
# Run from frontend directory: ./scripts/download-models.sh

MODELS_DIR="$(dirname "$0")/../public/models"
mkdir -p "$MODELS_DIR"
BASE_URL="https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master"

files=(
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model-shard1"
  "ssd_mobilenetv1_model-shard2"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model-shard1"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model-shard1"
  "face_recognition_model-shard2"
)

for f in "${files[@]}"; do
  echo "Downloading $f..."
  curl -sL "$BASE_URL/$f" -o "$MODELS_DIR/$f"
done

echo "Done. Models in $MODELS_DIR"
