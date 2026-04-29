$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Stop-PortProcess {
    param([int]$Port)

    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force
        Write-Host "已停止端口 $Port 的进程 PID=$($conn.OwningProcess)"
    } else {
        Write-Host "端口 $Port 当前没有监听进程"
    }
}

Write-Host ''
Write-Host '[1/2] 停止 323 前端服务 (3001)'
Stop-PortProcess -Port 3001

Write-Host ''
Write-Host '[2/2] 停止 Flow2API 服务 (38000)'
Stop-PortProcess -Port 38000

Write-Host ''
Write-Host '已执行停止操作。'
Read-Host '按回车关闭此窗口'
