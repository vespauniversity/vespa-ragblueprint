# Run NyRAG UI with Vespa Cloud deployment
# Simplified startup script - PowerShell version

$ErrorActionPreference = "Stop"

Write-Host "=== Starting NyRAG UI with Vespa Cloud ==="

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "❌ Virtual environment not found. Please run: uv sync"
    exit 1
}

# Activate virtual environment
& .venv\Scripts\Activate.ps1

# Ensure default 'doc' project exists based on example
if (-not (Test-Path "output\doc\conf.yml")) {
    Write-Host "Creating default 'doc' project from config\doc_example.yml..."
    New-Item -ItemType Directory -Force -Path "output\doc"
    Copy-Item "config\doc_example.yml" "output\doc\conf.yml"
} else {
    Write-Host "Default 'doc' project already exists."
}

# Set environment variables for Vespa Cloud mode
$env:NYRAG_LOCAL = "0"
$env:NYRAG_CLOUD_MODE = "1"
$env:NYRAG_VESPA_DEPLOY = "0"
$env:VESPA_PORT = "443"
$env:PYTHONUNBUFFERED = "1"

# Note: If VESPA_CLOUD_SECRET_TOKEN is not set, the app will try mTLS auth
# using VESPA_CLIENT_CERT and VESPA_CLIENT_KEY environment variables

Write-Host ""
Write-Host "Starting NyRAG UI..."
Write-Host "Opening browser at http://localhost:8000"
Write-Host ""

# Open browser when server is ready (in background)
$Job = Start-Job -ScriptBlock {
    # Wait for server to be ready (max 30 seconds)
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/" -TimeoutSec 1 -ErrorAction Stop
            Start-Process "http://localhost:8000"
            break
        } catch {
            Start-Sleep -Seconds 1
        }
    }
}

# Run the UI
nyrag ui --host localhost --port 8000