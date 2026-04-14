param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$backendPath = Join-Path $repoRoot "backend"
$frontendPath = Join-Path $repoRoot "frontend"
$frontendPort = 5173
$backendPort = 8000

if (-not (Get-Command conda -ErrorAction SilentlyContinue)) {
  throw "未找到 conda，请先安装并确保 conda 在 PATH 中。"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "未找到 npm，请先安装 Node.js 并确保 npm 在 PATH 中。"
}

$backendCommand = @"
Set-Location -LiteralPath '$backendPath'
conda run -n test python -m uvicorn app.main:app --reload --host 127.0.0.1 --port $backendPort
"@

$frontendCommand = @"
Set-Location -LiteralPath '$frontendPath'
if (-not (Test-Path -LiteralPath 'node_modules')) {
  npm install
}
npm run dev -- --host 127.0.0.1 --port $frontendPort
"@

if ($DryRun) {
  Write-Host "Backend command:" -ForegroundColor Cyan
  Write-Host $backendCommand
  Write-Host ""
  Write-Host "Frontend command:" -ForegroundColor Cyan
  Write-Host $frontendCommand
  exit 0
}

# 分开开窗的目的是让前后端日志都保留在独立终端里，便于定位导入和页面问题。
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  $backendCommand
)

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  $frontendCommand
)

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:$frontendPort"

Write-Host "已启动后端和前端窗口。" -ForegroundColor Green
Write-Host "后端: http://127.0.0.1:$backendPort" -ForegroundColor Green
Write-Host "前端: http://127.0.0.1:$frontendPort" -ForegroundColor Green
