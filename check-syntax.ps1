$errors = @()
$null = [System.Management.Automation.Language.Parser]::ParseFile(
    (Resolve-Path ".\setup.ps1"), 
    [ref]$null, 
    [ref]$errors
)

if ($errors) {
    Write-Host "PowerShell Syntax Errors Found:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "Line $($error.Extent.StartLineNumber): $($error.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "No syntax errors found" -ForegroundColor Green
}