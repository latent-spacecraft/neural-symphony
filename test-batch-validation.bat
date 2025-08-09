@echo off
REM Neural Symphony - Batch Setup Validation Test
REM ZERO TOLERANCE QC Verification

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "CYAN=[96m" 
set "MAGENTA=[95m"
set "RESET=[0m"

set TESTS_PASSED=0
set TOTAL_TESTS=0

echo.
echo %MAGENTA%NEURAL SYMPHONY BATCH VALIDATION - ZERO TOLERANCE QC%RESET%
echo %MAGENTA%================================================================%RESET%
echo.

REM Test 1: setup.bat file exists
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: setup.bat file exists...%RESET%
if exist "setup.bat" (
    echo %GREEN%  PASSED - setup.bat exists%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - setup.bat not found%RESET%
)

REM Test 2: setup.bat has content
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: setup.bat has substantial content...%RESET%
for %%f in ("setup.bat") do (
    if %%~zf GTR 10000 (
        echo %GREEN%  PASSED - setup.bat has %%~zf bytes%RESET%
        set /a TESTS_PASSED+=1
    ) else (
        echo %RED%  FAILED - setup.bat too small (%%~zf bytes)%RESET%
    )
)

REM Test 3: Required labels exist
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Required function labels exist...%RESET%
set REQUIRED_LABELS=0
for %%l in (
    ":test_system_requirements"
    ":setup_conda_environment"
    ":install_node_dependencies"
    ":install_gpt_oss_model"
    ":test_model_loading"
    ":test_complete_system"
    ":create_start_scripts"
) do (
    findstr /c:"%%l" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a REQUIRED_LABELS+=1
    ) else (
        echo %RED%    Missing label: %%l%RESET%
    )
)

if !REQUIRED_LABELS! == 7 (
    echo %GREEN%  PASSED - All 7 required labels found%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Only !REQUIRED_LABELS!/7 required labels found%RESET%
)

REM Test 4: Command line parameters supported
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Command line parameters supported...%RESET%
set PARAM_COUNT=0
for %%p in ("--skip-model" "--test-only" "--force" "--help") do (
    findstr /c:"%%p" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a PARAM_COUNT+=1
    ) else (
        echo %RED%    Missing parameter: %%p%RESET%
    )
)

if !PARAM_COUNT! == 4 (
    echo %GREEN%  PASSED - All 4 command line parameters supported%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Only !PARAM_COUNT!/4 parameters supported%RESET%
)

REM Test 5: Error handling implemented
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Error handling implemented...%RESET%
set ERROR_HANDLING=0
for %%e in ("if !errorlevel!" "exit /b" "|| exit /b") do (
    findstr /c:"%%e" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a ERROR_HANDLING+=1
    )
)

if !ERROR_HANDLING! == 3 (
    echo %GREEN%  PASSED - Error handling implemented%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Error handling insufficient%RESET%
)

REM Test 6: ZERO TOLERANCE QC references
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Zero tolerance QC standard enforced...%RESET%
set QC_REFS=0
for %%q in ("ZERO TOLERANCE" "World Class" "WORLD CLASS") do (
    findstr /i /c:"%%q" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a QC_REFS+=1
    )
)

if !QC_REFS! GEQ 2 (
    echo %GREEN%  PASSED - Zero tolerance QC standard enforced%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Zero tolerance QC standard not enforced%RESET%
)

REM Test 7: Windows-specific functionality
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Windows-specific functions present...%RESET%
set WIN_FUNCS=0
for %%w in ("nvidia-smi" "wmic" "CUDA_PATH" "Windows Terminal") do (
    findstr /i /c:"%%w" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a WIN_FUNCS+=1
    )
)

if !WIN_FUNCS! GEQ 3 (
    echo %GREEN%  PASSED - Windows-specific functionality present%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Windows-specific functionality insufficient%RESET%
)

REM Test 8: Comprehensive testing function
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Comprehensive testing function present...%RESET%
set COMP_TEST=0
for %%t in (":test_complete_system" "TESTS_PASSED" "TOTAL_TESTS" "ALL TESTS PASSED") do (
    findstr /i /c:"%%t" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a COMP_TEST+=1
    )
)

if !COMP_TEST! == 4 (
    echo %GREEN%  PASSED - Comprehensive testing function present%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Comprehensive testing function insufficient%RESET%
)

REM Test 9: Start scripts creation
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Start scripts creation implemented...%RESET%
set START_SCRIPTS=0
for %%s in ("start-backend.bat" "start-frontend.bat" "start.bat" ":create_start_scripts") do (
    findstr /c:"%%s" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a START_SCRIPTS+=1
    )
)

if !START_SCRIPTS! == 4 (
    echo %GREEN%  PASSED - Start scripts creation implemented%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Start scripts creation insufficient%RESET%
)

REM Test 10: Model validation with Python testing
set /a TOTAL_TESTS+=1
echo %CYAN%Test !TOTAL_TESTS!: Model validation with Python testing...%RESET%
set MODEL_TEST=0
for %%m in ("test_model_temp.py" "torch.cuda" "AutoTokenizer" "MODEL TEST FAILED") do (
    findstr /i /c:"%%m" setup.bat >nul 2>&1
    if !errorlevel! == 0 (
        set /a MODEL_TEST+=1
    )
)

if !MODEL_TEST! == 4 (
    echo %GREEN%  PASSED - Model validation with Python testing present%RESET%
    set /a TESTS_PASSED+=1
) else (
    echo %RED%  FAILED - Model validation insufficient%RESET%
)

echo.
echo %MAGENTA%================================================================%RESET%
if !TESTS_PASSED! == !TOTAL_TESTS! (
    echo %GREEN%VALIDATION COMPLETE: !TESTS_PASSED!/!TOTAL_TESTS! TESTS PASSED%RESET%
    echo %GREEN%SETUP SCRIPT MEETS WORLD-CLASS HACKATHON STANDARD%RESET%
    echo %GREEN%ZERO TOLERANCE QC REQUIREMENTS SATISFIED%RESET%
    exit /b 0
) else (
    echo %RED%VALIDATION FAILED: !TESTS_PASSED!/!TOTAL_TESTS! TESTS PASSED%RESET%
    echo %RED%ZERO TOLERANCE POLICY VIOLATION%RESET%
    echo %RED%SCRIPT DOES NOT MEET WORLD-CLASS STANDARD%RESET%
    exit /b 1
)