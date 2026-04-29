$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Stop-PortProcess {
    param([int]$Port)

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force
        Write-Host "Stopped port $Port process PID=$($conn.OwningProcess)"
    } else {
        Write-Host "No listening process found on port $Port"
    }
}

Write-Host ""
Write-Host "[1/2] Stop 323 frontend service (3001)"
Stop-PortProcess -Port 3001

Write-Host ""
Write-Host "[2/2] Stop Flow2API service (38000)"
Stop-PortProcess -Port 38000

Write-Host ""
Write-Host "Stop operation finished."
Read-Host "Press Enter to close this window"