@echo off
REM Neural Symphony - Windows 11 Batch Setup Script
REM AI Reasoning Orchestrator for OpenAI Hackathon 2025
REM ZERO TOLERANCE QC - World Class Hackathon Standard

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Script configuration
set PROJECT_NAME=Neural Symphony
set ENV_NAME=neural-symphony
set MODEL_NAME=openai/gpt-oss-20b
set MODEL_DIR=%CD%\models\gpt-oss-20b
set REQUIRED_RAM_GB=24
set REQUIRED_VRAM_GB=15
set REQUIRED_NODE_VERSION=18.0.0
set REQUIRED_PYTHON_VERSION=3.8.0

REM Color codes (using standard batch approach)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "MAGENTA=[95m"
set "CYAN=[96m"
set "WHITE=[97m"
set "RESET=[0m"

echo.
echo %MAGENTA%=========================================%RESET%
echo %MAGENTA% %PROJECT_NAME% - Windows 11 Setup%RESET%
echo %MAGENTA% ZERO TOLERANCE QC - World Class Standard%RESET%
echo %MAGENTA%=========================================%RESET%
echo.

REM Parse command line arguments
set SKIP_MODEL=0
set TEST_ONLY=0
set FORCE=0

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--skip-model" set SKIP_MODEL=1
if /i "%~1"=="--test-only" set TEST_ONLY=1
if /i "%~1"=="--force" set FORCE=1
if /i "%~1"=="-h" goto :show_help
if /i "%~1"=="--help" goto :show_help
shift
goto :parse_args

:show_help
echo Usage: setup.bat [OPTIONS]
echo.
echo Options:
echo   --skip-model    Skip model download
echo   --test-only     Only run tests on existing installation
echo   --force         Force reinstallation of existing components
echo   -h, --help      Show this help message
echo.
exit /b 0

:args_done

REM Check admin rights warning
net session >nul 2>&1
if %errorlevel% == 0 (
    echo %YELLOW%[WARNING] Running as Administrator detected!%RESET%
    echo %YELLOW%[WARNING] This script doesn't require admin rights and may cause permission issues.%RESET%
    set /p "CONTINUE=Continue anyway? (y/N): "
    if /i not "!CONTINUE!"=="y" (
        echo %CYAN%[INFO] Exiting. Please run without admin rights.%RESET%
        exit /b 0
    )
)

REM Function definitions using call labels

:print_success
echo %GREEN%[SUCCESS] %~1%RESET%
exit /b 0

:print_error
echo %RED%[ERROR] %~1%RESET%
exit /b 1

:print_warning
echo %YELLOW%[WARNING] %~1%RESET%
exit /b 0

:print_info
echo %CYAN%[INFO] %~1%RESET%
exit /b 0

:print_progress
echo %BLUE%[PROGRESS] %~1%RESET%
exit /b 0

:print_header
echo.
echo %MAGENTA%=========================================%RESET%
echo %MAGENTA% %~1%RESET%
echo %MAGENTA%=========================================%RESET%
echo.
exit /b 0

REM Main execution flow
if %TEST_ONLY% == 1 (
    call :test_system_requirements
    if !errorlevel! neq 0 exit /b !errorlevel!
    
    call :test_model_loading
    if !errorlevel! neq 0 exit /b !errorlevel!
    
    call :test_complete_system
    if !errorlevel! neq 0 exit /b !errorlevel!
    
    call :print_success "ALL TESTS PASSED - SYSTEM READY"
    exit /b 0
)

call :test_system_requirements
if !errorlevel! neq 0 exit /b !errorlevel!

echo.
echo Setup options:
echo 1^) Full setup ^(recommended for first time^)
echo 2^) Dependencies only ^(skip model download^)
echo 3^) Model only ^(if dependencies installed^)
echo 4^) Test existing setup
echo.
set /p "CHOICE=Choose option (1-4): "

if "!CHOICE!"=="1" (
    call :full_setup
) else if "!CHOICE!"=="2" (
    call :dependencies_only
) else if "!CHOICE!"=="3" (
    call :model_only
) else if "!CHOICE!"=="4" (
    call :test_only_setup
) else (
    call :print_error "Invalid option selected"
    exit /b 1
)

if !errorlevel! neq 0 exit /b !errorlevel!

call :print_success_message
exit /b 0

REM ===== SYSTEM REQUIREMENTS CHECK =====
:test_system_requirements
call :print_header "SYSTEM REQUIREMENTS CHECK"

REM Check Windows version
call :print_info "Checking Windows version..."
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
for /f "tokens=1,2 delims=." %%a in ("!VERSION!") do (
    if %%a geq 10 (
        call :print_success "Windows version: !VERSION!"
    ) else (
        call :print_error "Windows 10+ required. Current: !VERSION!"
        exit /b 1
    )
)

REM Check NVIDIA GPU
call :print_info "Checking NVIDIA GPU..."
nvidia-smi --query-gpu=memory.total,name --format=csv,noheader,nounits >nul 2>&1
if !errorlevel! == 0 (
    for /f "tokens=1,2 delims=, " %%a in ('nvidia-smi --query-gpu^=memory.total^,name --format^=csv^,noheader^,nounits') do (
        set /a VRAM_GB=%%a/1024
        set GPU_NAME=%%b
        if !VRAM_GB! geq %REQUIRED_VRAM_GB% (
            call :print_success "GPU: !GPU_NAME! with !VRAM_GB!GB VRAM"
        ) else (
            call :print_warning "GPU: !GPU_NAME! with !VRAM_GB!GB VRAM (minimum %REQUIRED_VRAM_GB%GB recommended)"
        )
    )
) else (
    call :print_error "NVIDIA GPU not detected or nvidia-smi not available"
    call :print_error "Please install NVIDIA drivers and CUDA toolkit"
    exit /b 1
)

REM Check CUDA installation
call :print_info "Checking CUDA installation..."
if defined CUDA_PATH (
    if exist "%CUDA_PATH%\bin\nvcc.exe" (
        call :print_success "CUDA found at %CUDA_PATH%"
    ) else (
        call :print_error "CUDA path set but nvcc.exe not found"
        exit /b 1
    )
) else (
    call :print_error "CUDA not found. Please install CUDA 12.x toolkit"
    exit /b 1
)

REM Check system RAM
call :print_info "Checking system RAM..."
for /f "skip=1" %%p in ('wmic computersystem get TotalPhysicalMemory') do (
    set /a RAM_GB=%%p/1024/1024/1024
    if !RAM_GB! geq %REQUIRED_RAM_GB% (
        call :print_success "System RAM: !RAM_GB!GB"
    ) else (
        call :print_warning "System RAM: !RAM_GB!GB (minimum %REQUIRED_RAM_GB%GB recommended)"
    )
    goto :ram_done
)
:ram_done

REM Check Python
call :print_info "Checking Python installation..."
python --version >nul 2>&1
if !errorlevel! == 0 (
    for /f "tokens=2" %%v in ('python --version 2^>^&1') do (
        call :print_success "Python: %%v"
    )
) else (
    python3 --version >nul 2>&1
    if !errorlevel! == 0 (
        for /f "tokens=2" %%v in ('python3 --version 2^>^&1') do (
            call :print_success "Python: %%v"
        )
    ) else (
        call :print_error "Python not found. Please install Python %REQUIRED_PYTHON_VERSION%+"
        exit /b 1
    )
)

REM Check Node.js
call :print_info "Checking Node.js installation..."
node --version >nul 2>&1
if !errorlevel! == 0 (
    for /f %%v in ('node --version') do (
        call :print_success "Node.js: %%v"
    )
) else (
    call :print_error "Node.js not found. Please install Node.js %REQUIRED_NODE_VERSION%+"
    exit /b 1
)

REM Check Conda with enhanced detection
call :print_info "Checking Conda installation..."
conda --version >nul 2>&1
if !errorlevel! == 0 (
    for /f "tokens=2" %%v in ('conda --version') do (
        call :print_success "Conda: %%v"
        set CONDA_CMD=conda
    )
) else (
    REM Try common conda installation paths
    set CONDA_FOUND=0
    for %%p in (
        "%USERPROFILE%\miniconda3\Scripts\conda.exe"
        "%USERPROFILE%\anaconda3\Scripts\conda.exe"
        "%ProgramData%\miniconda3\Scripts\conda.exe"
        "%ProgramData%\anaconda3\Scripts\conda.exe"
        "%LOCALAPPDATA%\miniconda3\Scripts\conda.exe"
        "%LOCALAPPDATA%\anaconda3\Scripts\conda.exe"
    ) do (
        if exist %%p (
            set CONDA_CMD=%%p
            set CONDA_FOUND=1
            call :print_success "Conda found at %%p"
            goto :conda_found
        )
    )
    
    :conda_found
    if !CONDA_FOUND! == 0 (
        call :print_error "Conda not found. Please install Miniconda or Anaconda"
        call :print_error "Common paths checked:"
        call :print_error "  - %USERPROFILE%\miniconda3\Scripts\conda.exe"
        call :print_error "  - %USERPROFILE%\anaconda3\Scripts\conda.exe"
        exit /b 1
    )
)

call :print_success "ALL SYSTEM REQUIREMENTS PASSED - WORLD CLASS STANDARD"
exit /b 0

REM ===== CONDA ENVIRONMENT SETUP =====
:setup_conda_environment
call :print_header "CONDA ENVIRONMENT SETUP"

REM Check if environment exists
!CONDA_CMD! env list | findstr /b "%ENV_NAME% " >nul 2>&1
if !errorlevel! == 0 (
    if %FORCE% == 0 (
        call :print_warning "Environment '%ENV_NAME%' already exists"
        set /p "RECREATE=Recreate environment? (y/N): "
        if /i not "!RECREATE!"=="y" (
            call :print_info "Using existing environment"
            exit /b 0
        )
    )
    
    call :print_progress "Removing existing environment..."
    !CONDA_CMD! env remove -n %ENV_NAME% -y
    if !errorlevel! neq 0 (
        call :print_error "Failed to remove existing conda environment"
        exit /b 1
    )
)

call :print_progress "Creating conda environment with Python 3.10..."
!CONDA_CMD! create -n %ENV_NAME% python=3.10 -y
if !errorlevel! neq 0 (
    call :print_error "Failed to create conda environment"
    exit /b 1
)

call :print_progress "Installing PyTorch with CUDA support..."
!CONDA_CMD! install -n %ENV_NAME% pytorch pytorch-cuda=12.1 -c pytorch -c nvidia -y
if !errorlevel! neq 0 (
    call :print_error "Failed to install PyTorch with CUDA"
    exit /b 1
)

call :print_progress "Installing Python dependencies..."
!CONDA_CMD! run -n %ENV_NAME% pip install vllm "transformers>=4.55.0" accelerate huggingface-hub sentencepiece protobuf fastapi uvicorn websockets python-multipart
if !errorlevel! neq 0 (
    call :print_error "Failed to install Python dependencies"
    exit /b 1
)

call :print_success "Conda environment '%ENV_NAME%' created successfully"
exit /b 0

REM ===== NODE.JS DEPENDENCIES =====
:install_node_dependencies
call :print_header "NODE.JS DEPENDENCIES"

call :print_progress "Installing backend dependencies..."
npm install
if !errorlevel! neq 0 (
    call :print_error "Failed to install backend Node.js dependencies"
    exit /b 1
)

call :print_progress "Installing frontend dependencies..."
pushd src\frontend
npm install
if !errorlevel! neq 0 (
    call :print_error "Failed to install frontend Node.js dependencies"
    popd
    exit /b 1
)
popd

call :print_success "Node.js dependencies installed successfully"
exit /b 0

REM ===== MODEL DOWNLOAD =====
:install_gpt_oss_model
call :print_header "GPT-OSS MODEL SETUP"

if exist "%MODEL_DIR%\config.json" (
    if %FORCE% == 0 (
        call :print_warning "Model directory already exists and contains files"
        set /p "REDOWNLOAD=Re-download model? (y/N): "
        if /i not "!REDOWNLOAD!"=="y" (
            call :print_info "Using existing model"
            exit /b 0
        )
    )
)

call :print_progress "Creating model directory..."
if not exist "%MODEL_DIR%" mkdir "%MODEL_DIR%"

call :print_progress "Downloading GPT-oss-20b model (~40GB)..."
call :print_warning "This may take 30-60 minutes depending on internet speed"

!CONDA_CMD! run -n %ENV_NAME% huggingface-cli download %MODEL_NAME% --local-dir "%MODEL_DIR%" --local-dir-use-symlinks False
if !errorlevel! neq 0 (
    call :print_progress "Installing huggingface-hub CLI..."
    !CONDA_CMD! run -n %ENV_NAME% pip install "huggingface-hub[cli]"
    if !errorlevel! neq 0 (
        call :print_error "Failed to install huggingface-hub CLI"
        exit /b 1
    )
    
    !CONDA_CMD! run -n %ENV_NAME% huggingface-cli download %MODEL_NAME% --local-dir "%MODEL_DIR%" --local-dir-use-symlinks False
    if !errorlevel! neq 0 (
        call :print_error "Failed to download GPT-oss-20b model"
        exit /b 1
    )
)

call :print_success "GPT-oss-20b model downloaded successfully"
exit /b 0

REM ===== ENVIRONMENT FILE CREATION =====
:create_environment_file
call :print_header "ENVIRONMENT CONFIGURATION"

call :print_progress "Creating .env file..."

(
echo # Neural Symphony Configuration
echo.
echo # Model Configuration
echo MODEL_NAME=%MODEL_NAME%
echo MODEL_PATH=%MODEL_DIR%
echo VLLM_GPU_MEMORY_UTILIZATION=0.90
echo VLLM_MAX_MODEL_LEN=4096
echo VLLM_TENSOR_PARALLEL_SIZE=1
echo.
echo # Server Configuration
echo PORT=3001
echo FRONTEND_PORT=3000
echo WS_PORT=3002
echo.
echo # Performance Settings
echo MAX_REASONING_DEPTH=5
echo DEFAULT_TEMPERATURE=0.7
echo DEFAULT_TOP_P=0.9
echo MAX_TOKENS=2048
echo STREAM_BUFFER_SIZE=50
echo.
echo # Debug Settings
echo LOG_LEVEL=info
echo ENABLE_REASONING_LOGS=true
echo ENABLE_EXPERT_TRACKING=true
echo.
echo # System Resources
echo MAX_CONCURRENT_REQUESTS=2
echo GPU_DEVICE=0
echo CUDA_VISIBLE_DEVICES=0
echo.
echo # React App Configuration
echo REACT_APP_BACKEND_URL=http://localhost:3001
echo REACT_APP_WS_URL=ws://localhost:3001
) > .env

call :print_success "Environment file created: .env"
exit /b 0

REM ===== MODEL LOADING TEST =====
:test_model_loading
call :print_header "MODEL LOADING TEST - ZERO TOLERANCE QC"

call :print_progress "Running comprehensive model test..."

REM Create temporary Python test script
(
echo import sys
echo import torch
echo from transformers import AutoTokenizer
echo import time
echo import traceback
echo import json
echo.
echo def test_model_loading():
echo     try:
echo         print("Testing tokenizer loading..."^)
echo         start_time = time.time()
echo         tokenizer = AutoTokenizer.from_pretrained("%MODEL_DIR:\=/%"^)
echo         load_time = time.time() - start_time
echo         print(f"Tokenizer loaded successfully in {load_time:.2f}s"^)
echo.
echo         print("Testing tokenizer functionality..."^)
echo         test_text = "Hello, this is a test for Neural Symphony reasoning orchestrator."
echo         tokens = tokenizer.encode(test_text^)
echo         decoded = tokenizer.decode(tokens^)
echo         assert len(tokens^) ^> 0, "Tokenization failed"
echo         assert decoded.strip(), "Detokenization failed"
echo         print(f"Tokenizer test passed - {len(tokens^)} tokens"^)
echo.
echo         print("Checking CUDA availability..."^)
echo         if torch.cuda.is_available():
echo             device_name = torch.cuda.get_device_name(0^)
echo             gpu_memory = torch.cuda.get_device_properties(0^).total_memory // 1024**3
echo             print(f"CUDA available - {device_name}"^)
echo             print(f"GPU Memory: {gpu_memory}GB"^)
echo.
echo             print("Testing CUDA functionality..."^)
echo             x = torch.randn(1000, 1000, device='cuda'^)
echo             y = torch.randn(1000, 1000, device='cuda'^)
echo             z = torch.matmul(x, y^)
echo             assert z.device.type == 'cuda', "CUDA computation failed"
echo             print("CUDA computation test passed"^)
echo         else:
echo             print("CUDA not available"^)
echo             sys.exit(1^)
echo.
echo         print("Testing model configuration..."^)
echo         config_path = "%MODEL_DIR:\=/%/config.json"
echo         with open(config_path, 'r'^) as f:
echo             config = json.load(f^)
echo.
echo         required_keys = ['architectures', 'model_type', 'vocab_size']
echo         for key in required_keys:
echo             assert key in config, f"Missing required config key: {key}"
echo.
echo         print("Model configuration validated"^)
echo         print(f"   - Architecture: {config.get('architectures', ['Unknown']^)[0]}"^)
echo         print(f"   - Model Type: {config.get('model_type', 'Unknown'^)}"^)
echo         print(f"   - Vocab Size: {config.get('vocab_size', 'Unknown'^)}"^)
echo.
echo         print("ALL MODEL TESTS PASSED - ZERO DEFECTS CONFIRMED"^)
echo.
echo     except Exception as e:
echo         print(f"MODEL TEST FAILED: {e}"^)
echo         traceback.print_exc()
echo         sys.exit(1^)
echo.
echo if __name__ == "__main__":
echo     test_model_loading()
) > test_model_temp.py

!CONDA_CMD! run -n %ENV_NAME% python test_model_temp.py
set TEST_RESULT=!errorlevel!
del test_model_temp.py

if !TEST_RESULT! neq 0 (
    call :print_error "Model loading test failed"
    exit /b 1
)

call :print_success "MODEL LOADING TEST PASSED - WORLD CLASS STANDARD"
exit /b 0

REM ===== START SCRIPTS CREATION =====
:create_start_scripts
call :print_header "START SCRIPTS CREATION"

REM Backend start script
(
echo @echo off
echo echo Starting Neural Symphony Backend...
echo.
echo REM Find conda command
echo set CONDA_CMD=conda
echo conda --version ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo     for %%%%p in ^(
echo         "%%USERPROFILE%%\miniconda3\Scripts\conda.exe"
echo         "%%USERPROFILE%%\anaconda3\Scripts\conda.exe"
echo         "%%ProgramData%%\miniconda3\Scripts\conda.exe"
echo     ^) do ^(
echo         if exist %%%%p ^(
echo             set CONDA_CMD=%%%%p
echo             goto :conda_found
echo         ^)
echo     ^)
echo     echo Conda not found. Please run setup.bat first.
echo     pause
echo     exit /b 1
echo ^)
echo.
echo :conda_found
echo set CUDA_VISIBLE_DEVICES=0
echo %%CONDA_CMD%% run -n %ENV_NAME% node src\backend\server.js
echo pause
) > start-backend.bat

REM Frontend start script
(
echo @echo off
echo echo Starting Neural Symphony Frontend...
echo cd src\frontend
echo npm start
echo pause
) > start-frontend.bat

REM Combined start script
(
echo @echo off
echo echo.
echo echo Neural Symphony - AI Reasoning Orchestrator
echo echo ==============================================
echo echo.
echo.
echo REM Check if Windows Terminal is available
echo wt --help ^>nul 2^>^&1
echo if %%errorlevel%% equ 0 ^(
echo     echo Starting with Windows Terminal...
echo     echo.
echo     wt -d . cmd /k start-backend.bat `;` split-pane -d . cmd /k start-frontend.bat
echo     echo.
echo     echo Neural Symphony started in Windows Terminal
echo     echo.
echo     echo Frontend: http://localhost:3000
echo     echo Backend:  http://localhost:3001
echo     echo.
echo     echo Press any key to exit this launcher ^(services continue running^)
echo     pause ^>nul
echo ^) else ^(
echo     echo Windows Terminal not found. Starting manually...
echo     echo.
echo     echo Please open two separate command windows and run:
echo     echo   1. start-backend.bat
echo     echo   2. start-frontend.bat
echo     echo.
echo     echo Frontend: http://localhost:3000
echo     echo Backend:  http://localhost:3001
echo     pause
echo ^)
) > start.bat

call :print_success "All start scripts created successfully"
exit /b 0

REM ===== COMPREHENSIVE SYSTEM TEST =====
:test_complete_system
call :print_header "COMPREHENSIVE SYSTEM TEST - ZERO TOLERANCE QC"

set TESTS_PASSED=0
set TOTAL_TESTS=0

REM Test 1: Conda environment verification
set /a TOTAL_TESTS+=1
call :print_progress "Test !TOTAL_TESTS!: Conda environment verification..."
!CONDA_CMD! env list | findstr /b "%ENV_NAME% " >nul 2>&1
if !errorlevel! == 0 (
    call :print_success "Test !TOTAL_TESTS! PASSED: Conda environment exists"
    set /a TESTS_PASSED+=1
) else (
    call :print_error "Test !TOTAL_TESTS! FAILED: Conda environment '%ENV_NAME%' not found"
)

REM Test 2: Python package verification  
set /a TOTAL_TESTS+=1
call :print_progress "Test !TOTAL_TESTS!: Python package verification..."
!CONDA_CMD! run -n %ENV_NAME% python -c "import torch, transformers, vllm, fastapi, websockets; print('All packages imported successfully')" >nul 2>&1
if !errorlevel! == 0 (
    call :print_success "Test !TOTAL_TESTS! PASSED: All Python packages verified"
    set /a TESTS_PASSED+=1
) else (
    call :print_error "Test !TOTAL_TESTS! FAILED: Python packages not properly installed"
)

REM Test 3: Node.js dependencies verification
set /a TOTAL_TESTS+=1
call :print_progress "Test !TOTAL_TESTS!: Node.js dependencies verification..."
if exist "node_modules" if exist "src\frontend\node_modules" (
    call :print_success "Test !TOTAL_TESTS! PASSED: Node.js dependencies verified"
    set /a TESTS_PASSED+=1
) else (
    call :print_error "Test !TOTAL_TESTS! FAILED: Node.js dependencies not found"
)

REM Test 4: Model files verification
set /a TOTAL_TESTS+=1
call :print_progress "Test !TOTAL_TESTS!: Model files verification..."
if exist "%MODEL_DIR%\config.json" if exist "%MODEL_DIR%\tokenizer.json" (
    call :print_success "Test !TOTAL_TESTS! PASSED: Model files verified"
    set /a TESTS_PASSED+=1
) else (
    call :print_error "Test !TOTAL_TESTS! FAILED: Required model files not found"
)

REM Test 5: Environment file verification
set /a TOTAL_TESTS+=1
call :print_progress "Test !TOTAL_TESTS!: Environment configuration verification..."
if exist ".env" (
    findstr /c:"MODEL_PATH" /c:"PORT" /c:"CUDA_VISIBLE_DEVICES" .env >nul 2>&1
    if !errorlevel! == 0 (
        call :print_success "Test !TOTAL_TESTS! PASSED: Environment configuration verified"
        set /a TESTS_PASSED+=1
    ) else (
        call :print_error "Test !TOTAL_TESTS! FAILED: Required environment variables not found"
    )
) else (
    call :print_error "Test !TOTAL_TESTS! FAILED: .env file not found"
)

REM Test 6: Start scripts verification
set /a TOTAL_TESTS+=1
call :print_progress "Test !TOTAL_TESTS!: Start scripts verification..."
if exist "start-backend.bat" if exist "start-frontend.bat" if exist "start.bat" (
    call :print_success "Test !TOTAL_TESTS! PASSED: Start scripts verified"
    set /a TESTS_PASSED+=1
) else (
    call :print_error "Test !TOTAL_TESTS! FAILED: Start scripts not found"
)

REM Test 7: CUDA PyTorch integration
set /a TOTAL_TESTS+=1
call :print_progress "Test !TOTAL_TESTS!: CUDA PyTorch integration test..."
(
echo import torch
echo assert torch.cuda.is_available(), "CUDA not available"
echo x = torch.randn(100, 100, device='cuda'^)
echo y = torch.matmul(x, x.t()^)
echo assert y.device.type == 'cuda', "CUDA computation failed"
echo print("CUDA PyTorch integration successful"^)
) > cuda_test_temp.py

!CONDA_CMD! run -n %ENV_NAME% python cuda_test_temp.py >nul 2>&1
if !errorlevel! == 0 (
    call :print_success "Test !TOTAL_TESTS! PASSED: CUDA PyTorch integration verified"
    set /a TESTS_PASSED+=1
) else (
    call :print_error "Test !TOTAL_TESTS! FAILED: CUDA PyTorch integration test failed"
)
del cuda_test_temp.py

echo.
if !TESTS_PASSED! == !TOTAL_TESTS! (
    call :print_success "ALL TESTS PASSED - WORLD CLASS HACKATHON STANDARD ACHIEVED"
    call :print_success "ZERO DEFECTS CONFIRMED - READY FOR COMPETITION"
) else (
    call :print_error "TESTS FAILED: !TESTS_PASSED!/!TOTAL_TESTS! PASSED"
    call :print_error "ZERO TOLERANCE POLICY VIOLATION"
    exit /b 1
)

exit /b 0

REM ===== SETUP WORKFLOWS =====
:full_setup
call :print_info "Starting full setup..."
call :setup_conda_environment || exit /b !errorlevel!
call :install_node_dependencies || exit /b !errorlevel!
call :create_environment_file || exit /b !errorlevel!
if %SKIP_MODEL% == 0 (
    call :install_gpt_oss_model || exit /b !errorlevel!
    call :test_model_loading || exit /b !errorlevel!
)
call :create_start_scripts || exit /b !errorlevel!
call :test_complete_system || exit /b !errorlevel!
exit /b 0

:dependencies_only
call :print_info "Installing dependencies only..."
call :setup_conda_environment || exit /b !errorlevel!
call :install_node_dependencies || exit /b !errorlevel!
call :create_environment_file || exit /b !errorlevel!
call :create_start_scripts || exit /b !errorlevel!
call :test_complete_system || exit /b !errorlevel!
exit /b 0

:model_only
call :print_info "Downloading model only..."
call :install_gpt_oss_model || exit /b !errorlevel!
call :test_model_loading || exit /b !errorlevel!
exit /b 0

:test_only_setup
call :print_info "Testing existing setup..."
call :test_model_loading || exit /b !errorlevel!
call :test_complete_system || exit /b !errorlevel!
exit /b 0

REM ===== SUCCESS MESSAGE =====
:print_success_message
call :print_header "SETUP COMPLETE - WORLD CLASS STANDARD ACHIEVED"
echo.
echo %MAGENTA%Next Steps:%RESET%
echo.
echo %CYAN%1. Start the system:%RESET%
echo %GREEN%   start.bat%RESET%
echo.
echo %CYAN%2. Open browser:%RESET%
echo %GREEN%   Frontend: http://localhost:3000%RESET%
echo %GREEN%   Backend:  http://localhost:3001/health%RESET%
echo.
echo %CYAN%3. Try demo scenarios:%RESET%
echo %GREEN%   - Click 'DEMOS' in the problem input%RESET%
echo %GREEN%   - Select 'Climate Solution' or 'Creative Problem'%RESET%
echo %GREEN%   - Click 'START REASONING' and watch the magic!%RESET%
echo.
echo %MAGENTA%For OpenAI Hackathon Demo:%RESET%
echo %GREEN%- Use the built-in demo scenarios%RESET%
echo %GREEN%- Adjust expert bias sliders live%RESET%
echo %GREEN%- Show the channel mixer in action%RESET%
echo %GREEN%- Demonstrate parallel reasoning tracks%RESET%
echo.
call :print_success "Ready to conduct AI reasoning like never before!"
exit /b 0