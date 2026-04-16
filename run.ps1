param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
$backendPath = Join-Path $repoRoot "backend"
$frontendPath = Join-Path $repoRoot "frontend"
$frontendPort = 5173
$backendPort = 8000
$runtimeCacheDir = Join-Path $repoRoot ".cache"
$backendDepsStampPath = Join-Path $runtimeCacheDir "backend-deps-test.txt"
$frontendUrl = "http://127.0.0.1:$frontendPort"
$backendHealthUrl = "http://127.0.0.1:$backendPort/api/health"

if (-not (Get-Command conda -ErrorAction SilentlyContinue)) {
  throw "未找到 conda，请先安装并确保 conda 在 PATH 中。"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "未找到 npm，请先安装 Node.js 并确保 npm 在 PATH 中。"
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "未找到 npx，请先检查 Node.js/npm 安装是否完整。"
}

function Get-BackendDependencyState {
  param(
    [string]$BackendProjectPath
  )

  $pyprojectPath = Join-Path $BackendProjectPath "pyproject.toml"
  $pythonExecutable = (conda run -n test python -c "import sys; print(sys.executable)").Trim()

  if (-not $pythonExecutable) {
    throw "无法识别 test 环境的 Python 路径。"
  }

  $pyprojectHash = (Get-FileHash -LiteralPath $pyprojectPath -Algorithm SHA256).Hash

  # 这里用“环境 Python 路径 + 依赖声明哈希”作为初始化指纹。
  # 这样只有环境变化或 pyproject.toml 改动时才重新安装，避免每次启动都重复探测和安装。
  return @(
    "python=$pythonExecutable"
    "pyproject_sha256=$pyprojectHash"
  ) -join "`n"
}

function Test-BackendDependenciesNeedBootstrap {
  param(
    [string]$StampPath,
    [string]$DesiredState
  )

  if (-not (Test-Path -LiteralPath $StampPath)) {
    return $true
  }

  $currentState = Get-Content -LiteralPath $StampPath -Raw -Encoding utf8
  return $currentState.Trim() -ne $DesiredState.Trim()
}

function Ensure-BackendDependencies {
  param(
    [string]$BackendProjectPath,
    [string]$StampPath,
    [string]$DesiredState
  )

  if (-not (Test-BackendDependenciesNeedBootstrap -StampPath $StampPath -DesiredState $DesiredState)) {
    return
  }

  if (-not (Test-Path -LiteralPath $runtimeCacheDir)) {
    New-Item -ItemType Directory -Path $runtimeCacheDir | Out-Null
  }

  Write-Host "检测到后端环境首次初始化或依赖已变更，正在同步 backend/pyproject.toml 依赖..." -ForegroundColor Yellow

  Push-Location $BackendProjectPath
  try {
    conda run -n test python -m pip install -e .
  }
  finally {
    Pop-Location
  }

  Set-Content -LiteralPath $StampPath -Value $DesiredState -Encoding utf8
}

function Wait-HttpReady {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
      return $true
    }
    catch {
      Start-Sleep -Milliseconds 500
    }
  }

  return $false
}

$backendCommand = @"
Set-Location -LiteralPath '$backendPath'
conda run -n test python -m uvicorn app.main:app --reload --host 127.0.0.1 --port $backendPort
"@

$frontendCommand = "cd /d `"$frontendPath`" && (if not exist node_modules npm install) && npx vite --host 127.0.0.1 --port $frontendPort"

if ($MyInvocation.InvocationName -eq ".") {
  return
}

if ($DryRun) {
  Write-Host "Backend command:" -ForegroundColor Cyan
  Write-Host $backendCommand
  Write-Host ""
  Write-Host "Frontend command:" -ForegroundColor Cyan
  Write-Host $frontendCommand
  return
}

$backendDependencyState = Get-BackendDependencyState -BackendProjectPath $backendPath
Ensure-BackendDependencies `
  -BackendProjectPath $backendPath `
  -StampPath $backendDepsStampPath `
  -DesiredState $backendDependencyState

# 分开开窗的目的是让前后端日志都保留在独立终端里，便于定位导入和页面问题。
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  $backendCommand
)

Start-Process cmd.exe -ArgumentList @(
  "/k",
  $frontendCommand
)

# 前端首次装依赖或 Vite 冷启动时通常不止 2 秒，直接开浏览器容易看到 ERR_CONNECTION_REFUSED。
# 这里改成轮询可访问后再打开，失败则保留终端窗口让用户直接看日志。
$backendReady = Wait-HttpReady -Url $backendHealthUrl -TimeoutSeconds 20
$frontendReady = Wait-HttpReady -Url $frontendUrl -TimeoutSeconds 30

if ($frontendReady) {
  Start-Process $frontendUrl
}
else {
  Write-Warning "前端在 30 秒内未就绪，请查看前端窗口日志。"
}

Write-Host "已启动后端和前端窗口。" -ForegroundColor Green
Write-Host "后端: http://127.0.0.1:$backendPort" -ForegroundColor Green
Write-Host "前端: http://127.0.0.1:$frontendPort" -ForegroundColor Green
if (-not $backendReady) {
  Write-Warning "后端健康检查未在 20 秒内通过，请查看后端窗口日志。"
}
