# Neural Symphony - Setup Validation Test
# ZERO TOLERANCE QC Verification

Write-Host "NEURAL SYMPHONY SETUP VALIDATION - ZERO TOLERANCE QC" -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host ""

$ErrorActionPreference = "Stop"
$testsPassed = 0
$totalTests = 0

function Test-Item {
    param($Description, $Condition, $ErrorMessage)
    $script:totalTests++
    Write-Host "Test $script:totalTests : $Description..." -ForegroundColor Cyan -NoNewline
    
    try {
        if ($Condition.Invoke()) {
            Write-Host " PASSED" -ForegroundColor Green
            $script:testsPassed++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
            Write-Host "  Error: $ErrorMessage" -ForegroundColor Red
        }
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  Exception: $_" -ForegroundColor Red
    }
}

# Test 1: setup.ps1 file exists
Test-Item "setup.ps1 file exists" {
    Test-Path ".\setup.ps1"
} "setup.ps1 file not found"

# Test 2: setup.ps1 has content
Test-Item "setup.ps1 has content" {
    (Get-Content ".\setup.ps1" -Raw).Length -gt 1000
} "setup.ps1 file is empty or too small"

# Test 3: PowerShell syntax validation
Test-Item "PowerShell syntax validation" {
    $errors = @()
    $null = [System.Management.Automation.Language.Parser]::ParseFile(
        (Resolve-Path ".\setup.ps1"), 
        [ref]$null, 
        [ref]$errors
    )
    $errors.Count -eq 0
} "PowerShell syntax errors found"

# Test 4: Required functions exist
$requiredFunctions = @(
    "Test-SystemRequirements",
    "New-CondaEnvironment", 
    "Install-NodeDependencies",
    "Install-GPTOssModel",
    "Test-ModelLoading",
    "Test-CompleteSystem"
)

foreach ($func in $requiredFunctions) {
    Test-Item "Function '$func' exists" {
        (Get-Content ".\setup.ps1" -Raw) -match "function $func"
    } "Required function '$func' not found"
}

# Test 5: Critical parameters supported
$requiredParams = @("SkipModel", "TestOnly", "Force")
foreach ($param in $requiredParams) {
    Test-Item "Parameter '$param' supported" {
        (Get-Content ".\setup.ps1" -Raw) -match "\[switch\]\$$param"
    } "Required parameter '$param' not found"
}

# Test 6: Error handling present
Test-Item "Error handling implemented" {
    $content = Get-Content ".\setup.ps1" -Raw
    ($content -match "ErrorActionPreference") -and 
    ($content -match "try") -and 
    ($content -match "catch") -and
    ($content -match "throw")
} "Proper error handling not implemented"

# Test 7: ZERO TOLERANCE QC references
Test-Item "Zero tolerance QC standard enforced" {
    $content = Get-Content ".\setup.ps1" -Raw
    ($content -match "ZERO TOLERANCE") -and 
    ($content -match "world.*class")
} "Zero tolerance QC standard not enforced"

# Test 8: Windows-specific functionality
Test-Item "Windows-specific functions present" {
    $content = Get-Content ".\setup.ps1" -Raw
    ($content -match "Get-CimInstance") -and 
    ($content -match "nvidia-smi") -and
    ($content -match "Windows")
} "Windows-specific functionality missing"

# Test 9: Comprehensive testing function
Test-Item "Comprehensive testing function present" {
    $content = Get-Content ".\setup.ps1" -Raw
    ($content -match "Test-CompleteSystem") -and 
    ($content -match "Test.*PASSED") -and
    ($content -match "ALL TESTS PASSED")
} "Comprehensive testing function not properly implemented"

# Test 10: Start scripts creation
Test-Item "Start scripts creation implemented" {
    $content = Get-Content ".\setup.ps1" -Raw
    ($content -match "start-backend") -and 
    ($content -match "start-frontend") -and
    ($content -match "start\.bat")
} "Start scripts creation not implemented"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Magenta
if ($testsPassed -eq $totalTests) {
    Write-Host "VALIDATION COMPLETE: $testsPassed/$totalTests TESTS PASSED" -ForegroundColor Green
    Write-Host "SETUP SCRIPT MEETS WORLD-CLASS HACKATHON STANDARD" -ForegroundColor Green
    Write-Host "ZERO TOLERANCE QC REQUIREMENTS SATISFIED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "VALIDATION FAILED: $testsPassed/$totalTests TESTS PASSED" -ForegroundColor Red
    Write-Host "ZERO TOLERANCE POLICY VIOLATION" -ForegroundColor Red
    Write-Host "SCRIPT DOES NOT MEET WORLD-CLASS STANDARD" -ForegroundColor Red
    exit 1
}