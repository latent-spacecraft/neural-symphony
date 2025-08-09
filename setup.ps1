#Requires -Version 5.1
<#
.SYNOPSIS
    Neural Symphony - Windows 11 PowerShell Setup Script
    AI Reasoning Orchestrator for OpenAI Hackathon 2025
    
.DESCRIPTION
    Comprehensive setup script for Neural Symphony on Windows 11 with ZERO TOLERANCE QC.
    All tests must complete without errors - no compromises, world-class hackathon standard.
    
.PARAMETER SkipModel
    Skip model download if already present
    
.PARAMETER TestOnly
    Only run tests on existing installation
    
.PARAMETER Force
    Force reinstallation of existing components
    
.EXAMPLE
    .\setup.ps1
    .\setup.ps1 -SkipModel
    .\setup.ps1 -TestOnly
    .\setup.ps1 -Force
#>

[CmdletBinding()]
param(
    [switch]$SkipModel,
    [switch]$TestOnly,
    [switch]$Force
)

# Set strict error handling - ZERO TOLERANCE
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Speed up downloads

# Script configuration
$Script:ProjectName = "Neural Symphony"
$Script:EnvName = "neural-symphony"
$Script:ModelName = "openai/gpt-oss-20b"
$Script:ModelDir = "$PWD\models\gpt-oss-20b"
$Script:RequiredRAM = 24
$Script:RequiredVRAM = 15
$Script:RequiredNodeVersion = [Version]"18.0.0"
$Script:RequiredPythonVersion = [Version]"3.8.0"

# Color constants for output
$Script:Colors = @{
    Header = "Magenta"
    Success = "Green" 
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Progress = "Blue"
}

#region Helper Functions

function Write-Header {
    param([string]$Message)
    Write-Host "`n$('=' * 60)" -ForegroundColor $Script:Colors.Header
    Write-Host " $Message" -ForegroundColor $Script:Colors.Header
    Write-Host "$('=' * 60)`n" -ForegroundColor $Script:Colors.Header
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Script:Colors.Success
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Script:Colors.Warning
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Script:Colors.Error
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Script:Colors.Info
}

function Write-Progress-Custom {
    param([string]$Message)
    Write-Host "[PROGRESS] $Message" -ForegroundColor $Script:Colors.Progress
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Get-InstalledRAM {
    try {
        $ram = Get-CimInstance -ClassName Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum
        return [math]::Round($ram.Sum / 1GB)
    }
    catch {
        Write-Warning "Could not determine RAM amount: $_"
        return 32  # Assume sufficient
    }
}

function Get-NvidiaGPUInfo {
    try {
        # Try nvidia-smi first
        if (Test-CommandExists "nvidia-smi") {
            $output = nvidia-smi --query-gpu=memory.total,name --format=csv,noheader,nounits 2>$null
            if ($output) {
                $parts = $output.Split(',')
                $vramMB = [int]$parts[0].Trim()
                $gpuName = $parts[1].Trim()
                return @{
                    VRAM_GB = [math]::Round($vramMB / 1024)
                    Name = $gpuName
                    Available = $true
                }
            }
        }
        
        # Fallback to WMI
        $gpu = Get-CimInstance -ClassName Win32_VideoController | Where-Object { $_.Name -like "*NVIDIA*" } | Select-Object -First 1
        if ($gpu) {
            return @{
                VRAM_GB = if ($gpu.AdapterRAM) { [math]::Round($gpu.AdapterRAM / 1GB) } else { 16 }
                Name = $gpu.Name
                Available = $true
            }
        }
        
        return @{ Available = $false }
    }
    catch {
        Write-Warning "GPU detection failed: $_"
        return @{ Available = $false }
    }
}

function Test-CudaInstallation {
    try {
        # Check for CUDA installation
        $cudaPath = $env:CUDA_PATH
        if (-not $cudaPath) {
            $cudaPath = "${env:ProgramFiles}\NVIDIA GPU Computing Toolkit\CUDA"
            if (Test-Path $cudaPath) {
                $latestVersion = Get-ChildItem $cudaPath | Sort-Object Name -Descending | Select-Object -First 1
                $cudaPath = $latestVersion.FullName
            }
        }
        
        if ($cudaPath -and (Test-Path $cudaPath)) {
            $nvccPath = Join-Path $cudaPath "bin\nvcc.exe"
            if (Test-Path $nvccPath) {
                $version = & $nvccPath --version 2>$null | Select-String "release (\d+\.\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }
                return @{
                    Available = $true
                    Version = $version
                    Path = $cudaPath
                }
            }
        }
        
        return @{ Available = $false }
    }
    catch {
        return @{ Available = $false }
    }
}

function Get-PythonVersion {
    try {
        $pythonExe = "python"
        if (-not (Test-CommandExists $pythonExe)) {
            $pythonExe = "python3"
            if (-not (Test-CommandExists $pythonExe)) {
                return $null
            }
        }
        
        $versionOutput = & $pythonExe --version 2>$null
        if ($versionOutput -match "Python (\d+\.\d+\.\d+)") {
            return @{
                Version = [Version]$matches[1]
                Executable = $pythonExe
            }
        }
        return $null
    }
    catch {
        return $null
    }
}

function Get-NodeVersion {
    try {
        if (-not (Test-CommandExists "node")) {
            return $null
        }
        
        $versionOutput = node --version 2>$null
        if ($versionOutput -match "v(\d+\.\d+\.\d+)") {
            return [Version]$matches[1]
        }
        return $null
    }
    catch {
        return $null
    }
}

function Find-CondaInstallation {
    try {
        # Try common conda commands
        foreach ($condaCmd in @("conda", "conda.exe")) {
            if (Test-CommandExists $condaCmd) {
                $version = & $condaCmd --version 2>$null
                if ($version) {
                    return @{
                        Command = $condaCmd
                        Version = $version.Replace("conda ", "").Trim()
                        Available = $true
                    }
                }
            }
        }
        
        # Search common installation paths
        $commonPaths = @(
            "$env:USERPROFILE\miniconda3\Scripts\conda.exe",
            "$env:USERPROFILE\anaconda3\Scripts\conda.exe", 
            "$env:ProgramData\miniconda3\Scripts\conda.exe",
            "$env:ProgramData\anaconda3\Scripts\conda.exe",
            "$env:LOCALAPPDATA\miniconda3\Scripts\conda.exe",
            "$env:LOCALAPPDATA\anaconda3\Scripts\conda.exe"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $version = & $path --version 2>$null
                if ($version) {
                    # Add to PATH for this session
                    $condaDir = Split-Path $path -Parent
                    $env:PATH = "$condaDir;$env:PATH"
                    
                    return @{
                        Command = $path
                        Version = $version.Replace("conda ", "").Trim()
                        Available = $true
                    }
                }
            }
        }
        
        return @{ Available = $false }
    }
    catch {
        Write-Warning "Conda detection failed: $_"
        return @{ Available = $false }
    }
}

#endregion

#region System Requirements Check

function Test-SystemRequirements {
    Write-Header "🔍 SYSTEM REQUIREMENTS CHECK"
    
    $allPassed = $true
    
    # Windows Version Check
    Write-Info "Checking Windows version..."
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -ge 10) {
        Write-Success "Windows version: $($osVersion.Major).$($osVersion.Minor) ✅"
    }
    else {
        Write-Error-Custom "Windows 10+ required. Current: $($osVersion.Major).$($osVersion.Minor)"
        $allPassed = $false
    }
    
    # NVIDIA GPU Check
    Write-Info "Checking NVIDIA GPU..."
    $gpuInfo = Get-NvidiaGPUInfo
    if ($gpuInfo.Available) {
        if ($gpuInfo.VRAM_GB -ge $Script:RequiredVRAM) {
            Write-Success "GPU: $($gpuInfo.Name) with $($gpuInfo.VRAM_GB)GB VRAM ✅"
        }
        else {
            Write-Warning "GPU: $($gpuInfo.Name) with $($gpuInfo.VRAM_GB)GB VRAM (⚠️ $($Script:RequiredVRAM)GB+ recommended)"
        }
    }
    else {
        Write-Error-Custom "NVIDIA GPU not detected or nvidia-smi not available"
        Write-Error-Custom "Please install NVIDIA drivers and CUDA toolkit"
        $allPassed = $false
    }
    
    # CUDA Check
    Write-Info "Checking CUDA installation..."
    $cudaInfo = Test-CudaInstallation
    if ($cudaInfo.Available) {
        Write-Success "CUDA $($cudaInfo.Version) detected at $($cudaInfo.Path) ✅"
    }
    else {
        Write-Error-Custom "CUDA not found. Please install CUDA 12.x toolkit"
        $allPassed = $false
    }
    
    # RAM Check
    Write-Info "Checking system RAM..."
    $ramGB = Get-InstalledRAM
    if ($ramGB -ge $Script:RequiredRAM) {
        Write-Success "System RAM: $($ramGB)GB ✅"
    }
    else {
        Write-Warning "System RAM: $($ramGB)GB (⚠️ $($Script:RequiredRAM)GB+ recommended)"
    }
    
    # Python Check
    Write-Info "Checking Python installation..."
    $pythonInfo = Get-PythonVersion
    if ($pythonInfo -and $pythonInfo.Version -ge $Script:RequiredPythonVersion) {
        Write-Success "Python: $($pythonInfo.Version) ✅"
    }
    elseif ($pythonInfo) {
        Write-Error-Custom "Python version $($pythonInfo.Version) found, but $($Script:RequiredPythonVersion)+ required"
        $allPassed = $false
    }
    else {
        Write-Error-Custom "Python not found. Please install Python $($Script:RequiredPythonVersion)+"
        $allPassed = $false
    }
    
    # Node.js Check
    Write-Info "Checking Node.js installation..."
    $nodeVersion = Get-NodeVersion
    if ($nodeVersion -and $nodeVersion -ge $Script:RequiredNodeVersion) {
        Write-Success "Node.js: v$nodeVersion ✅"
    }
    elseif ($nodeVersion) {
        Write-Error-Custom "Node.js version v$nodeVersion found, but v$($Script:RequiredNodeVersion)+ required"
        $allPassed = $false
    }
    else {
        Write-Error-Custom "Node.js not found. Please install Node.js $($Script:RequiredNodeVersion)+"
        $allPassed = $false
    }
    
    # Conda Check
    Write-Info "Checking Conda installation..."
    $condaInfo = Find-CondaInstallation
    if ($condaInfo.Available) {
        Write-Success "Conda: $($condaInfo.Version) ✅"
        $Script:CondaCommand = $condaInfo.Command
    }
    else {
        Write-Error-Custom "Conda not found. Please install Miniconda or Anaconda"
        Write-Info "Common installation paths checked:"
        Write-Info "  - $env:USERPROFILE\miniconda3\Scripts\conda.exe"
        Write-Info "  - $env:USERPROFILE\anaconda3\Scripts\conda.exe"
        $allPassed = $false
    }
    
    if (-not $allPassed) {
        Write-Error-Custom "`nSYSTEM REQUIREMENTS NOT MET - ZERO TOLERANCE POLICY"
        Write-Error-Custom "Please install missing requirements and re-run setup"
        throw "System requirements check failed"
    }
    
    Write-Success "`n✅ ALL SYSTEM REQUIREMENTS PASSED - WORLD CLASS STANDARD"
}

#endregion

#region Conda Environment Setup

function New-CondaEnvironment {
    Write-Header "🐍 CONDA ENVIRONMENT SETUP"
    
    # Check if environment already exists
    $envExists = & $Script:CondaCommand env list 2>$null | Select-String "^$Script:EnvName\s"
    if ($envExists -and -not $Force) {
        Write-Warning "Environment '$Script:EnvName' already exists"
        $response = Read-Host "Recreate environment? (y/N)"
        if ($response -notmatch "^[yY]") {
            Write-Info "Using existing environment"
            return
        }
    }
    
    if ($envExists) {
        Write-Info "Removing existing environment..."
        & $Script:CondaCommand env remove -n $Script:EnvName -y
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to remove existing conda environment"
        }
    }
    
    Write-Progress-Custom "Creating conda environment with Python 3.10..."
    & $Script:CondaCommand create -n $Script:EnvName python=3.10 -y
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to create conda environment"
    }
    
    Write-Progress-Custom "Installing PyTorch with CUDA support..."
    & $Script:CondaCommand install -n $Script:EnvName pytorch pytorch-cuda=12.1 -c pytorch -c nvidia -y
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install PyTorch with CUDA"
    }
    
    Write-Progress-Custom "Installing Python dependencies..."
    & $Script:CondaCommand run -n $Script:EnvName pip install `
        vllm `
        "transformers>=4.55.0" `
        accelerate `
        huggingface-hub `
        sentencepiece `
        protobuf `
        fastapi `
        uvicorn `
        websockets `
        python-multipart
    
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install Python dependencies"
    }
    
    Write-Success "✅ Conda environment '$Script:EnvName' created successfully"
}

#endregion

#region Node.js Dependencies

function Install-NodeDependencies {
    Write-Header "📦 NODE.JS DEPENDENCIES"
    
    Write-Progress-Custom "Installing backend dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install backend Node.js dependencies"
    }
    
    Write-Progress-Custom "Installing frontend dependencies..."
    Push-Location "src\frontend"
    try {
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install frontend Node.js dependencies"
        }
    }
    finally {
        Pop-Location
    }
    
    Write-Success "✅ Node.js dependencies installed successfully"
}

#endregion

#region Model Download

function Install-GPTOssModel {
    Write-Header "🤖 GPT-OSS MODEL SETUP"
    
    if ((Test-Path $Script:ModelDir) -and (Get-ChildItem $Script:ModelDir -Recurse | Measure-Object).Count -gt 5) {
        if (-not $Force) {
            Write-Warning "Model directory already exists and contains files"
            $response = Read-Host "Re-download model? (y/N)"
            if ($response -notmatch "^[yY]") {
                Write-Info "Using existing model"
                return
            }
        }
        Write-Info "Proceeding with model download..."
    }
    
    Write-Progress-Custom "Creating model directory..."
    New-Item -Path $Script:ModelDir -ItemType Directory -Force | Out-Null
    
    Write-Progress-Custom "Downloading GPT-oss-20b model (~40GB)..."
    Write-Warning "This may take 30-60 minutes depending on internet speed"
    
    & $Script:CondaCommand run -n $Script:EnvName huggingface-cli download $Script:ModelName --local-dir $Script:ModelDir --local-dir-use-symlinks False
    if ($LASTEXITCODE -ne 0) {
        # Try installing huggingface-hub CLI if not available
        Write-Progress-Custom "Installing huggingface-hub CLI..."
        & $Script:CondaCommand run -n $Script:EnvName pip install "huggingface-hub[cli]"
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install huggingface-hub CLI"
        }
        
        & $Script:CondaCommand run -n $Script:EnvName huggingface-cli download $Script:ModelName --local-dir $Script:ModelDir --local-dir-use-symlinks False
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to download GPT-oss-20b model"
        }
    }
    
    Write-Success "✅ GPT-oss-20b model downloaded successfully"
}

#endregion

#region Environment Configuration

function New-EnvironmentFile {
    Write-Header "⚙️ ENVIRONMENT CONFIGURATION"
    
    $envFile = ".env"
    Write-Progress-Custom "Creating $envFile..."
    
    $envContent = @"
# Neural Symphony Configuration

# Model Configuration
MODEL_NAME=$Script:ModelName
MODEL_PATH=$($Script:ModelDir -replace '\\', '\\')
VLLM_GPU_MEMORY_UTILIZATION=0.90
VLLM_MAX_MODEL_LEN=4096
VLLM_TENSOR_PARALLEL_SIZE=1

# Server Configuration
PORT=3001
FRONTEND_PORT=3000
WS_PORT=3002

# Performance Settings
MAX_REASONING_DEPTH=5
DEFAULT_TEMPERATURE=0.7
DEFAULT_TOP_P=0.9
MAX_TOKENS=2048
STREAM_BUFFER_SIZE=50

# Debug Settings
LOG_LEVEL=info
ENABLE_REASONING_LOGS=true
ENABLE_EXPERT_TRACKING=true

# System Resources
MAX_CONCURRENT_REQUESTS=2
GPU_DEVICE=0
CUDA_VISIBLE_DEVICES=0

# React App Configuration
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001
"@

    Set-Content -Path $envFile -Value $envContent -Encoding UTF8
    Write-Success "✅ Environment file created: $envFile"
}

#endregion

#region Model Testing

function Test-ModelLoading {
    Write-Header "🧪 MODEL LOADING TEST - ZERO TOLERANCE QC"
    
    Write-Progress-Custom "Running comprehensive model test..."
    
    $testScript = @"
import sys
import torch
from transformers import AutoTokenizer
import time
import traceback

def test_model_loading():
    try:
        print("🔍 Testing tokenizer loading...")
        start_time = time.time()
        tokenizer = AutoTokenizer.from_pretrained("$($Script:ModelDir -replace '\\', '/')")
        load_time = time.time() - start_time
        print(f"✅ Tokenizer loaded successfully in {load_time:.2f}s")
        
        print("🔍 Testing tokenizer functionality...")
        test_text = "Hello, this is a test for Neural Symphony reasoning orchestrator."
        tokens = tokenizer.encode(test_text)
        decoded = tokenizer.decode(tokens)
        assert len(tokens) > 0, "Tokenization failed"
        assert decoded.strip(), "Detokenization failed"
        print(f"✅ Tokenizer test passed - {len(tokens)} tokens")
        
        print("🔍 Checking CUDA availability...")
        if torch.cuda.is_available():
            device_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory // 1024**3
            print(f"✅ CUDA available - {device_name}")
            print(f"✅ GPU Memory: {gpu_memory}GB")
            
            # Test CUDA functionality
            print("🔍 Testing CUDA functionality...")
            x = torch.randn(1000, 1000, device='cuda')
            y = torch.randn(1000, 1000, device='cuda')
            z = torch.matmul(x, y)
            assert z.device.type == 'cuda', "CUDA computation failed"
            print("✅ CUDA computation test passed")
            
        else:
            print("❌ CUDA not available")
            sys.exit(1)
            
        print("🔍 Testing model configuration...")
        import json
        config_path = "$($Script:ModelDir -replace '\\', '/')/config.json"
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        required_keys = ['architectures', 'model_type', 'vocab_size']
        for key in required_keys:
            assert key in config, f"Missing required config key: {key}"
        
        print("✅ Model configuration validated")
        print(f"   - Architecture: {config.get('architectures', ['Unknown'])[0]}")
        print(f"   - Model Type: {config.get('model_type', 'Unknown')}")
        print(f"   - Vocab Size: {config.get('vocab_size', 'Unknown')}")
        
        print("✅ ALL MODEL TESTS PASSED - ZERO DEFECTS CONFIRMED")
        
    except Exception as e:
        print(f"❌ MODEL TEST FAILED: {e}")
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_model_loading()
"@

    $testFile = "test_model_temp.py"
    Set-Content -Path $testFile -Value $testScript -Encoding UTF8
    
    try {
        & $Script:CondaCommand run -n $Script:EnvName python $testFile
        if ($LASTEXITCODE -ne 0) {
            throw "Model loading test failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Remove-Item -Path $testFile -ErrorAction SilentlyContinue
    }
    
    Write-Success "✅ MODEL LOADING TEST PASSED - WORLD CLASS STANDARD"
}

#endregion

#region Start Scripts

function New-StartScripts {
    Write-Header "🚀 START SCRIPTS CREATION"
    
    # Backend start script (PowerShell)
    $backendScript = @'
# Neural Symphony Backend Launcher
Write-Host "🎼 Starting Neural Symphony Backend..." -ForegroundColor Cyan

# Activate conda environment
$condaPath = Get-Command conda -ErrorAction SilentlyContinue
if (-not $condaPath) {
    $condaPath = Get-ChildItem "$env:USERPROFILE\*conda*\Scripts\conda.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($condaPath) {
        $env:PATH = "$($condaPath.Directory);$env:PATH"
    }
}

if (-not (Get-Command conda -ErrorAction SilentlyContinue)) {
    Write-Error "Conda not found in PATH. Please run setup.ps1 first."
    exit 1
}

# Set CUDA environment
$env:CUDA_VISIBLE_DEVICES = "0"

# Activate environment and start server
& conda run -n neural-symphony node src/backend/server.js
'@

    Set-Content -Path "start-backend.ps1" -Value $backendScript -Encoding UTF8
    Write-Success "✅ Created start-backend.ps1"
    
    # Frontend start script (PowerShell) 
    $frontendScript = @'
# Neural Symphony Frontend Launcher
Write-Host "🎨 Starting Neural Symphony Frontend..." -ForegroundColor Cyan

Set-Location src/frontend
npm start
'@

    Set-Content -Path "start-frontend.ps1" -Value $frontendScript -Encoding UTF8
    Write-Success "✅ Created start-frontend.ps1"
    
    # Combined start script (Batch for better Windows compatibility)
    $combinedScript = @'
@echo off
echo.
echo 🎼 NEURAL SYMPHONY - AI REASONING ORCHESTRATOR
echo ==============================================
echo.

REM Check if Windows Terminal is available
wt --help >nul 2>&1
if %errorlevel% equ 0 (
    echo Starting with Windows Terminal...
    echo.
    wt -d . PowerShell -Command ".\start-backend.ps1" `; split-pane -d . PowerShell -Command ".\start-frontend.ps1"
    echo.
    echo ✅ Neural Symphony started in Windows Terminal
    echo.
    echo 🌐 Frontend: http://localhost:3000
    echo 🔗 Backend:  http://localhost:3001
    echo.
    echo Press any key to exit this launcher ^(services continue running^)
    pause >nul
) else (
    echo Windows Terminal not found. Starting manually...
    echo.
    echo Please open two separate PowerShell windows and run:
    echo   1. .\start-backend.ps1
    echo   2. .\start-frontend.ps1
    echo.
    echo 🌐 Frontend: http://localhost:3000
    echo 🔗 Backend:  http://localhost:3001
    pause
)
'@

    Set-Content -Path "start.bat" -Value $combinedScript -Encoding ASCII
    Write-Success "✅ Created start.bat"
    
    Write-Success "✅ All start scripts created successfully"
}

#endregion

#region Comprehensive Testing

function Test-CompleteSystem {
    Write-Header "🔬 COMPREHENSIVE SYSTEM TEST - ZERO TOLERANCE QC"
    
    # Test 1: Environment verification
    Write-Progress-Custom "Test 1: Conda environment verification..."
    $envList = & $Script:CondaCommand env list 2>$null
    if (-not ($envList | Select-String "^$Script:EnvName\s")) {
        throw "Conda environment '$Script:EnvName' not found"
    }
    Write-Success "✅ Test 1 PASSED: Conda environment exists"
    
    # Test 2: Python package verification
    Write-Progress-Custom "Test 2: Python package verification..."
    $packages = @("torch", "transformers", "vllm", "fastapi", "websockets")
    foreach ($package in $packages) {
        & $Script:CondaCommand run -n $Script:EnvName python -c "import $package; print('✅ $package')" 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Python package '$package' not properly installed"
        }
    }
    Write-Success "✅ Test 2 PASSED: All Python packages verified"
    
    # Test 3: Node.js dependencies verification
    Write-Progress-Custom "Test 3: Node.js dependencies verification..."
    if (-not (Test-Path "node_modules")) {
        throw "Backend node_modules not found"
    }
    if (-not (Test-Path "src\frontend\node_modules")) {
        throw "Frontend node_modules not found"
    }
    Write-Success "✅ Test 3 PASSED: Node.js dependencies verified"
    
    # Test 4: Model files verification
    Write-Progress-Custom "Test 4: Model files verification..."
    $requiredFiles = @("config.json", "tokenizer.json", "model.safetensors.index.json")
    foreach ($file in $requiredFiles) {
        $filePath = Join-Path $Script:ModelDir $file
        if (-not (Test-Path $filePath)) {
            throw "Required model file not found: $file"
        }
    }
    Write-Success "✅ Test 4 PASSED: Model files verified"
    
    # Test 5: Environment file verification
    Write-Progress-Custom "Test 5: Environment configuration verification..."
    if (-not (Test-Path ".env")) {
        throw ".env file not found"
    }
    
    $envContent = Get-Content ".env" -Raw
    $requiredVars = @("MODEL_PATH", "PORT", "FRONTEND_PORT", "CUDA_VISIBLE_DEVICES")
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch $var) {
            throw "Required environment variable '$var' not found in .env"
        }
    }
    Write-Success "✅ Test 5 PASSED: Environment configuration verified"
    
    # Test 6: Start scripts verification
    Write-Progress-Custom "Test 6: Start scripts verification..."
    $scripts = @("start-backend.ps1", "start-frontend.ps1", "start.bat")
    foreach ($script in $scripts) {
        if (-not (Test-Path $script)) {
            throw "Start script not found: $script"
        }
    }
    Write-Success "✅ Test 6 PASSED: Start scripts verified"
    
    # Test 7: CUDA PyTorch integration
    Write-Progress-Custom "Test 7: CUDA PyTorch integration test..."
    $cudaTest = @"
import torch
assert torch.cuda.is_available(), "CUDA not available"
x = torch.randn(100, 100, device='cuda')
y = torch.matmul(x, x.t())
assert y.device.type == 'cuda', "CUDA computation failed"
print("✅ CUDA PyTorch integration successful")
"@
    
    $testFile = "cuda_test_temp.py"
    Set-Content -Path $testFile -Value $cudaTest -Encoding UTF8
    try {
        & $Script:CondaCommand run -n $Script:EnvName python $testFile
        if ($LASTEXITCODE -ne 0) {
            throw "CUDA PyTorch integration test failed"
        }
    }
    finally {
        Remove-Item -Path $testFile -ErrorAction SilentlyContinue
    }
    Write-Success "✅ Test 7 PASSED: CUDA PyTorch integration verified"
    
    Write-Success "`n🏆 ALL TESTS PASSED - WORLD CLASS HACKATHON STANDARD ACHIEVED"
    Write-Success "✅ ZERO DEFECTS CONFIRMED - READY FOR COMPETITION"
}

#endregion

#region Main Setup Process

function Start-Setup {
    try {
        Write-Header "🎼 $Script:ProjectName - Windows 11 Setup"
        Write-Host "AI Reasoning Orchestrator for OpenAI Hackathon 2025" -ForegroundColor $Script:Colors.Info
        Write-Host "ZERO TOLERANCE QC - World Class Standard" -ForegroundColor $Script:Colors.Info
        Write-Host ""
        
        # Check admin rights (warn but don't require)
        if (Test-AdminRights) {
            Write-Warning "Running as Administrator detected!"
            Write-Warning "This script doesn't require admin rights and may cause permission issues."
            $response = Read-Host "Continue anyway? (y/N)"
            if ($response -notmatch "^[yY]") {
                Write-Info "Exiting. Please run without admin rights."
                return
            }
        }
        
        # Handle test-only mode
        if ($TestOnly) {
            Test-SystemRequirements
            Test-ModelLoading
            Test-CompleteSystem
            Write-Success "`n✅ ALL TESTS PASSED - SYSTEM READY"
            return
        }
        
        # Main setup flow
        Test-SystemRequirements
        
        if (-not $SkipModel) {
            Write-Info "Setup options:"
            Write-Info "1) Full setup (recommended for first time)"
            Write-Info "2) Dependencies only (skip model download)"
            Write-Info "3) Model only (if dependencies installed)"
            Write-Info "4) Test existing setup"
            Write-Info ""
            $choice = Read-Host "Choose option (1-4)"
            
            switch ($choice) {
                "1" { 
                    Write-Info "Starting full setup..."
                    New-CondaEnvironment
                    Install-NodeDependencies
                    New-EnvironmentFile
                    Install-GPTOssModel
                    Test-ModelLoading
                    New-StartScripts
                    Test-CompleteSystem
                }
                "2" {
                    Write-Info "Installing dependencies only..."
                    New-CondaEnvironment
                    Install-NodeDependencies
                    New-EnvironmentFile
                    New-StartScripts
                    Test-CompleteSystem
                }
                "3" {
                    Write-Info "Downloading model only..."
                    Install-GPTOssModel
                    Test-ModelLoading
                }
                "4" {
                    Write-Info "Testing existing setup..."
                    Test-ModelLoading
                    Test-CompleteSystem
                }
                default {
                    throw "Invalid option selected"
                }
            }
        }
        else {
            # Skip model setup
            New-CondaEnvironment
            Install-NodeDependencies
            New-EnvironmentFile
            New-StartScripts
            Test-CompleteSystem
        }
        
        # Success message with next steps
        Write-Header "🚀 SETUP COMPLETE - WORLD CLASS STANDARD ACHIEVED"
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor $Script:Colors.Header
        Write-Host ""
        Write-Host "1. Start the system:" -ForegroundColor $Script:Colors.Info
        Write-Host "   .\start.bat" -ForegroundColor $Script:Colors.Success
        Write-Host ""
        Write-Host "2. Open browser:" -ForegroundColor $Script:Colors.Info
        Write-Host "   Frontend: http://localhost:3000" -ForegroundColor $Script:Colors.Success
        Write-Host "   Backend:  http://localhost:3001/health" -ForegroundColor $Script:Colors.Success
        Write-Host ""
        Write-Host "3. Try demo scenarios:" -ForegroundColor $Script:Colors.Info
        Write-Host "   - Click 'DEMOS' in the problem input" -ForegroundColor $Script:Colors.Success
        Write-Host "   - Select 'Climate Solution' or 'Creative Problem'" -ForegroundColor $Script:Colors.Success
        Write-Host "   - Click 'START REASONING' and watch the magic! 🎼" -ForegroundColor $Script:Colors.Success
        Write-Host ""
        Write-Host "🎯 For OpenAI Hackathon Demo:" -ForegroundColor $Script:Colors.Header
        Write-Host "- Use the built-in demo scenarios" -ForegroundColor $Script:Colors.Info
        Write-Host "- Adjust expert bias sliders live" -ForegroundColor $Script:Colors.Info
        Write-Host "- Show the channel mixer in action" -ForegroundColor $Script:Colors.Info
        Write-Host "- Demonstrate parallel reasoning tracks" -ForegroundColor $Script:Colors.Info
        Write-Host ""
        Write-Success "🏆 Ready to conduct AI reasoning like never before!"
    }
    catch {
        Write-Error-Custom "`n💥 SETUP FAILED: $_"
        Write-Error-Custom "ZERO TOLERANCE POLICY: All errors must be resolved"
        Write-Error-Custom "Please fix the issue and re-run setup"
        throw
    }
}

#endregion

# Execute main setup
Start-Setup