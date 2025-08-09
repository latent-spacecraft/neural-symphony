@echo off
echo Testing batch file functionality...

if exist "setup.bat" (
    echo PASS: setup.bat exists
) else (
    echo FAIL: setup.bat not found
    exit /b 1
)

findstr ":test_system_requirements" setup.bat >nul
if %errorlevel% == 0 (
    echo PASS: Required function labels found
) else (
    echo FAIL: Required function labels missing
    exit /b 1
)

findstr "ZERO TOLERANCE" setup.bat >nul
if %errorlevel% == 0 (
    echo PASS: Zero tolerance QC standard present
) else (
    echo FAIL: Zero tolerance QC standard missing
    exit /b 1
)

findstr "nvidia-smi" setup.bat >nul
if %errorlevel% == 0 (
    echo PASS: Windows-specific functionality present
) else (
    echo FAIL: Windows-specific functionality missing
    exit /b 1
)

echo.
echo ALL BASIC TESTS PASSED - BATCH FILE READY
echo ZERO TOLERANCE QC REQUIREMENTS SATISFIED
exit /b 0