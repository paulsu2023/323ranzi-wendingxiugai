$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $appDir
$flowDir = Join-Path $rootDir 'flow api'
$flowPython = Join-Path $flowDir '.venv\Scripts\python.exe'
$appUrl = 'http://127.0.0.1:3001/app'
$flowManageUrl = 'http://127.0.0.1:38000/manage'
$flowStdout = Join-Path $flowDir 'run.stdout.log'
$flowStderr = Join-Path $flowDir 'run.stderr.log'
$appStdout = Join-Path $appDir 'next-app.log'
$appStderr = Join-Path $appDir 'next-app.err.log'

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

Write-Host ''
Write-Host '[1/3] 检查 Flow2API 服务 (38000)'
if (-not (Test-PortListening -Port 38000)) {
    if (-not (Test-Path $flowPython)) {
        Write-Host "未找到 Flow2API Python 环境: $flowPython" -ForegroundColor Red
        Read-Host '按回车退出'
        exit 1
    }

    Write-Host '正在后台启动 Flow2API...'
    Start-Process -FilePath $flowPython `
        -ArgumentList 'main.py' `
        -WorkingDirectory $flowDir `
        -RedirectStandardOutput $flowStdout `
        -RedirectStandardError $flowStderr | Out-Null
} else {
    Write-Host 'Flow2API 已在运行，跳过。'
}

Write-Host ''
Write-Host '[2/3] 检查 323 前端服务 (3001)'
if (-not (Test-PortListening -Port 3001)) {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npm) {
        Write-Host '未找到 npm.cmd，请先确认 Node.js 已安装。' -ForegroundColor Red
        Read-Host '按回车退出'
        exit 1
    }

    Write-Host '正在后台启动 323 前端...'
    Start-Process -FilePath $npm.Source `
        -ArgumentList 'run', 'start', '--', '--port', '3001' `
        -WorkingDirectory $appDir `
        -RedirectStandardOutput $appStdout `
        -RedirectStandardError $appStderr | Out-Null
} else {
    Write-Host '323 前端已在运行，跳过。'
}

Write-Host ''
Write-Host '[3/3] 等待服务就绪并打开页面...'
if (-not (Wait-Port -Port 38000 -TimeoutSeconds 40)) {
    Write-Host "Flow2API 未在 40 秒内启动成功，请检查日志: $flowStderr" -ForegroundColor Red
    Read-Host '按回车退出'
    exit 1
}

if (-not (Wait-Port -Port 3001 -TimeoutSeconds 60)) {
    Write-Host "323 前端未在 60 秒内启动成功，请检查日志: $appStderr" -ForegroundColor Red
    Read-Host '按回车退出'
    exit 1
}

Start-Process $appUrl | Out-Null
Start-Process $flowManageUrl | Out-Null

Write-Host ''
Write-Host "创作页面: $appUrl"
Write-Host "Token 管理: $flowManageUrl"
Write-Host '服务已后台启动。'
Write-Host "Flow2API 日志: $flowStdout"
Write-Host "323 前端日志: $appStdout"
Write-Host ''
Read-Host '按回车关闭此窗口'
