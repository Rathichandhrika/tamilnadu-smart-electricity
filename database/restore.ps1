# MongoDB Restore Script for Windows
param(
    [Parameter(Mandatory=$true, HelpMessage="Enter the path to the backup folder (e.g., .\backups\db_backup_2026-09-16_10-00-00\smart_tn_electricity)")]
    [string]$BackupPath
)

$uri = "mongodb://127.0.0.1:27017/smart_tn_electricity"

Write-Host "Starting MongoDB restore from $BackupPath..." -ForegroundColor Cyan
Write-Host "WARNING: This will drop existing collections!" -ForegroundColor Yellow

try {
    mongorestore --uri="$uri" --drop "$BackupPath"
    Write-Host "✅ Database successfully restored!" -ForegroundColor Green
} catch {
    Write-Host "❌ Restore failed." -ForegroundColor Red
}