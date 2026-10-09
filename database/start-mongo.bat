@echo off
title Smart TN Electricity - MongoDB Server
echo ========================================================
echo   Starting Local MongoDB Server on Port 27017
echo ========================================================
if not exist "%USERPROFILE%\mongodb_data" mkdir "%USERPROFILE%\mongodb_data"
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "%USERPROFILE%\mongodb_data" --bind_ip 127.0.0.1 --port 27017
pause
