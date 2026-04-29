$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $appDir
$flowDir = Join-Path $rootDir "flow api"
$flowPython = Join-Path $flowDir ".venv\Scripts\python.exe"
$appUrl = "http://127.0.0.1:3001/app"
$flowManageUrl = "http://127.0.0.1:38000/manage"
$flowStdout = Join-Path $flowDir "run.stdout.log"
$flowStderr = Join-Path $flowDir "run.stderr.log"
$appStdout = Join-Path $appDir "next-app.log"
$appStderr = Join-Path $appDir "next-app.err.log"

function Test-PortListening {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}

function Wait-Port {
    param(
        [int]$Port,
        [int]$TimeoutSeconds
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

Write-Host ""
Write-Host "[1/3] Check Flow2API service (38000)"
if (-not (Test-PortListening -Port 38000)) {
    if (-not (Test-Path $flowPython)) {
        Write-Host "Flow2API Python not found: $flowPython" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "Starting Flow2API in background..."
    Start-Process -FilePath $flowPython `
        -ArgumentList "main.py" `
        -WorkingDirectory $flowDir `
        -RedirectStandardOutput $flowStdout `
        -RedirectStandardError $flowStderr | Out-Null
} else {
    Write-Host "Flow2API is already running."
}

Write-Host ""
Write-Host "[2/3] Check 323 frontend service (3001)"
if (-not (Test-PortListening -Port 3001)) {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        Write-Host "npm.cmd not found. Please install Node.js first." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }

    Write-Host "Starting 323 frontend in background..."
    Start-Process -FilePath $npm.Source `
        -ArgumentList "run", "start", "--", "--port", "3001" `
        -WorkingDirectory $appDir `
        -RedirectStandardOutput $appStdout `
        -RedirectStandardError $appStderr | Out-Null
} else {
    Write-Host "323 frontend is already running."
}

Write-Host ""
Write-Host "[3/3] Wait for services and open pages..."
if (-not (Wait-Port -Port 38000 -TimeoutSeconds 40)) {
    Write-Host "Flow2API did not start within 40 seconds. Check: $flowStderr" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Wait-Port -Port 3001 -TimeoutSeconds 60)) {
    Write-Host "323 frontend did not start within 60 seconds. Check: $appStderr" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Start-Process $appUrl | Out-Null
Start-Process $flowManageUrl | Out-Null

Write-Host ""
Write-Host "App page: $appUrl"
Write-Host "Token page: $flowManageUrl"
Write-Host "Flow2API log: $flowStdout"
Write-Host "323 log: $appStdout"
Write-Host ""
Read-Host "Press Enter to close this window"