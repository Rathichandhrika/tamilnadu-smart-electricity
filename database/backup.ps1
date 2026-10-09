# MongoDB Backup Script for Windows
$ErrorActionPreference = "Stop"

$uri = "mongodb://127.0.0.1:27017/smart_tn_electricity"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = ".\backups\db_backup_$timestamp"

Write-Host "Starting MongoDB backup for Smart TN Electricity..." -ForegroundColor Cyan

try {
    mongodump --uri="$uri" --out="$backupDir"
    Write-Host "✅ Backup successfully created at: $backupDir" -ForegroundColor Green
} catch {
    Write-Host "❌ Backup failed. Ensure MongoDB Database Tools are installed." -ForegroundColor Red
}