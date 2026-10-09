# Smart TN Electricity - Start MongoDB Server
$dataPath = Join-Path $env:USERPROFILE "mongodb_data"
if (!(Test-Path $dataPath)) {
    New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
}

$mongoExe = "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
if (Test-Path $mongoExe) {
    Write-Host "Starting MongoDB Server on 127.0.0.1:27017..." -ForegroundColor Cyan
    Write-Host "Data Directory: $dataPath" -ForegroundColor Yellow
    & $mongoExe --dbpath $dataPath --bind_ip 127.0.0.1 --port 27017 --setParameter diagnosticDataCollectionEnabled=false
} else {
    Write-Host "MongoDB executable not found at $mongoExe" -ForegroundColor Red
}
