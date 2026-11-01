# ==============================================================================
# ORCHESTRA AI — Enterprise Development Startup Script (Windows PowerShell)
# "Intelligence in Sync. Execution in Motion."
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   ORCHESTRA AI — Autonomous Multi-Agent Intelligence Platform" -ForegroundColor Cyan
Write-Host "   Intelligence in Sync. Execution in Motion." -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $WorkspaceRoot

# ------------------------------------------------------------------------------
# 1. Check Python Environment
# ------------------------------------------------------------------------------
Write-Host "[1/5] Checking Python Virtual Environment..." -ForegroundColor Yellow
$VenvPython = Join-Path $WorkspaceRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "[-] Virtual environment not found at .venv. Please run 'uv venv' or setup Python 3.11." -ForegroundColor Red
    exit 1
}
Write-Host "[+] Virtual environment found: $VenvPython" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 2. Check & Initialize Ollama Service
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Inspecting Local Ollama Runtime..." -ForegroundColor Yellow

$OllamaCmd = Get-Command ollama -ErrorAction SilentlyContinue
$OllamaExe = $null

if ($OllamaCmd) {
    $OllamaExe = $OllamaCmd.Source
} elseif (Test-Path "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe") {
    $OllamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
} elseif (Test-Path "C:\Program Files\Ollama\ollama.exe") {
    $OllamaExe = "C:\Program Files\Ollama\ollama.exe"
}

if (-not $OllamaExe) {
    Write-Host "[-] Ollama executable not found in PATH or standard installation directories." -ForegroundColor Red
    Write-Host "    To install Ollama on Windows, run:" -ForegroundColor Yellow
    Write-Host "    winget install Ollama.Ollama --accept-source-agreements --accept-package-agreements" -ForegroundColor Cyan
    Write-Host "    Or download from https://ollama.com/download/OllamaSetup.exe" -ForegroundColor Cyan
} else {
    Write-Host "[+] Ollama installed at: $OllamaExe" -ForegroundColor Green

    # Check if port 11434 is listening
    $PortCheck = Test-NetConnection -ComputerName localhost -Port 11434 -WarningAction SilentlyContinue
    if (-not $PortCheck.TcpTestSucceeded) {
        Write-Host "[*] Ollama service is not running. Starting 'ollama serve' in background..." -ForegroundColor Yellow
        Start-Process $OllamaExe -ArgumentList "serve" -WindowStyle Hidden
        
        # Wait up to 10 seconds for port 11434 to open
        $Attempts = 0
        while ($Attempts -lt 10) {
            Start-Sleep -Seconds 1
            $PortCheck = Test-NetConnection -ComputerName localhost -Port 11434 -WarningAction SilentlyContinue
            if ($PortCheck.TcpTestSucceeded) {
                break
            }
            $Attempts++
        }
    }

    if ($PortCheck.TcpTestSucceeded) {
        Write-Host "[+] Ollama service is actively listening on http://localhost:11434" -ForegroundColor Green
        
        # Check model availability
        try {
            $Tags = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3
            $InstalledModels = $Tags.models | ForEach-Object { $_.name }
            Write-Host "[+] Installed Models: $($InstalledModels -join ', ')" -ForegroundColor DarkGray
            
            $TargetModel = "qwen3.5:4b"
            $ModelFound = $InstalledModels | Where-Object { $_ -like "*$TargetModel*" }
            
            if (-not $ModelFound) {
                Write-Host "[!] Target model '$TargetModel' is not yet installed." -ForegroundColor Yellow
                Write-Host "    Run: ollama run $TargetModel" -ForegroundColor Cyan
            } else {
                Write-Host "[+] Configured model '$TargetModel' is verified and ready." -ForegroundColor Green
            }
        } catch {
            Write-Host "[!] Could not fetch installed models list: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[-] Ollama service failed to open port 11434." -ForegroundColor Red
    }
}

# ------------------------------------------------------------------------------
# 3. Check GPU Telemetry
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Verifying NVIDIA GPU Acceleration..." -ForegroundColor Yellow
$NvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
if ($NvidiaSmi) {
    $GpuOut = nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits 2>&1
    Write-Host "[+] GPU Detected: $GpuOut" -ForegroundColor Green
} else {
    Write-Host "[!] nvidia-smi not in PATH. Running on host CPU memory." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# 4. Check / Start FastAPI Backend
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Inspecting Backend Server (Port 8000)..." -ForegroundColor Yellow
$BackendPort = Test-NetConnection -ComputerName localhost -Port 8000 -WarningAction SilentlyContinue
if (-not $BackendPort.TcpTestSucceeded) {
    Write-Host "[*] Starting FastAPI Backend Daemon..." -ForegroundColor Yellow
    Start-Process $VenvPython -ArgumentList "-m uvicorn app.main:app --app-dir ./backend --host 127.0.0.1 --port 8000" -WindowStyle Minimized
    Start-Sleep -Seconds 2
} else {
    Write-Host "[+] Backend is already running on http://127.0.0.1:8000" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# 5. Check / Start Vite Frontend
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Inspecting Vite Frontend Server (Port 5173)..." -ForegroundColor Yellow
$FrontendPort = Test-NetConnection -ComputerName localhost -Port 5173 -WarningAction SilentlyContinue
if (-not $FrontendPort.TcpTestSucceeded) {
    Write-Host "[*] Starting Vite Dev Server..." -ForegroundColor Yellow
    Start-Process "cmd.exe" -ArgumentList "/c cd frontend && npm run dev -- --host 0.0.0.0 --port 5173" -WindowStyle Minimized
    Start-Sleep -Seconds 2
} else {
    Write-Host "[+] Frontend is already running on http://localhost:5173" -ForegroundColor Green
}

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   ORCHESTRA AI IS READY FOR AUTONOMOUS EXECUTION" -ForegroundColor Green
Write-Host "   Web Interface:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Interactive API:  http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "   Health Probe:     http://127.0.0.1:8000/api/health" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""
