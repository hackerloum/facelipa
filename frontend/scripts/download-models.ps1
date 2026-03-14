# Download face-api.js models to public/models/
# Run from frontend directory: ./scripts/download-models.ps1

$modelsDir = Join-Path $PSScriptRoot ".." "public" "models"
New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null

$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/master"
$files = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

foreach ($file in $files) {
    $dest = Join-Path $modelsDir $file
    $url = "$baseUrl/$file"
    Write-Host "Downloading $file..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
    } catch {
        Write-Host "Failed: $_"
    }
}

Write-Host "Done. Models in $modelsDir"
